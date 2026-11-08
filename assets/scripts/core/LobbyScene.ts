/**
 * LobbyScene.ts
 * 大厅场景控制器
 * Day6: 三线升级 UI、持久化、开始战斗
 * Day9: 关卡选择 UI
 */

import { _decorator, Component, Label, director, Node, Graphics, Color, UITransform, SceneAsset, assetManager } from 'cc';
import { drawPixelPanel, PIXEL_UI } from '../pixel/PixelChrome';
import { GameData, GameEvents, EVENT_SCRAP_CHANGED } from '../data/GameData';
import { 
    MetaData, 
    UpgradeLine, 
    getUpgradeCost, 
    MAX_LEVEL,
    getFirepowerEffectText,
    getFortEffectText,
    getSupplyEffectText
} from '../data/MetaData';
import { SCENE_BATTLE } from './SceneManager';
import { LevelId, getLevelConfig, LEVEL_CONFIGS } from '../battle/WaveConfig';
import { BATTLE_SCENE_UUID, launchedCallbackHasError, shouldFallbackToUuid } from './BootGate';
import { applyDebugOverlayPolicy } from './DebugOverlay';
import { LOBBY_LEGAL_ENTRIES } from './LegalContent';
import { LegalOverlay } from '../ui/LegalOverlay';

const { ccclass, property } = _decorator;

interface UpgradeRowUI {
    container: Node;
    titleLabel: Label;
    levelLabel: Label;
    effectLabel: Label;
    costLabel: Label;
    button: Node;
    buttonLabel: Label;
}

@ccclass('LobbyScene')
export class LobbyScene extends Component {
    
    @property(Label)
    scrapLabel: Label | null = null;
    
    @property(Node)
    startBattleBtn: Node | null = null;
    
    @property(Node)
    upgradeContainer: Node | null = null;
    
    /** 序列化引用 Battle.scene，预览从 Boot 进来时也能打进包 */
    @property(SceneAsset)
    battleScene: SceneAsset | null = null;
    
    private _battleJumpStarted = false;
    private _legalOverlay: LegalOverlay | null = null;
    
    // 升级行 UI
    private _firepowerRow: UpgradeRowUI | null = null;
    private _fortRow: UpgradeRowUI | null = null;
    private _supplyRow: UpgradeRowUI | null = null;
    
    // Day9: 关卡选择
    private _selectedLevel: LevelId = LevelId.L1;
    private _levelButtons: Map<LevelId, { button: Node; label: Label; lockIcon: Node }> = new Map();
    
    // 首次提示是否已显示
    private _firstTipShown = false;
    
    start() {
        console.log('[LobbyScene] 大厅场景开始');
        applyDebugOverlayPolicy();
        
        this.styleLobbyChrome();
        
        // 创建升级 UI
        this.createUpgradeUI();
        
        // Day9: 创建关卡选择 UI
        this.createLevelSelectUI();
        
        // 绑定按钮事件
        if (this.startBattleBtn) {
            this.startBattleBtn.on(Node.EventType.TOUCH_END, this.onStartBattle, this);
            const g = this.startBattleBtn.getComponent(Graphics) || this.startBattleBtn.addComponent(Graphics);
            drawPixelPanel(g, -130, -40, 260, 80, PIXEL_UI.ok, PIXEL_UI.accent);
        }
        
        // 监听残骸变化
        GameEvents.on(EVENT_SCRAP_CHANGED, this.onScrapChanged, this);
        
        this.updateUI();
        
        // 首次提示
        this.showFirstTimeTip();
        
        this.createLegalEntries();
    }
    
    onDestroy() {
        GameEvents.off(EVENT_SCRAP_CHANGED, this.onScrapChanged, this);
    }
    
    /** 标题 / 残骸做成与按钮同一套像素框 */
    private styleLobbyChrome() {
        const title = this.node.getChildByName('Title');
        if (title) {
            const g = title.getComponent(Graphics) || title.addComponent(Graphics);
            drawPixelPanel(g, -220, -40, 440, 80, PIXEL_UI.panel, PIXEL_UI.accent);
            const label = title.getComponent(Label);
            if (label) {
                label.color = PIXEL_UI.text;
            }
        }
        const scrap = this.node.getChildByName('ScrapLabel');
        if (scrap) {
            const g = scrap.getComponent(Graphics) || scrap.addComponent(Graphics);
            drawPixelPanel(g, -160, -28, 320, 56, PIXEL_UI.panel, PIXEL_UI.hi);
            const label = scrap.getComponent(Label);
            if (label) {
                label.color = PIXEL_UI.text;
            }
        }
    }
    
    /**
     * 创建升级 UI
     */
    private createUpgradeUI() {
        const container = this.upgradeContainer || this.node;
        
        // 三行升级卡片
        this._firepowerRow = this.createUpgradeRow(container, '🔥 火力', 0, UpgradeLine.Firepower);
        this._fortRow = this.createUpgradeRow(container, '🛡️ 城防', -100, UpgradeLine.Fort);
        this._supplyRow = this.createUpgradeRow(container, '📦 补给', -200, UpgradeLine.Supply);
    }
    
    /**
     * 创建单个升级行
     */
    private createUpgradeRow(parent: Node, title: string, yOffset: number, line: UpgradeLine): UpgradeRowUI {
        const container = new Node(`UpgradeRow_${line}`);
        container.parent = parent;
        container.setPosition(0, yOffset + 150, 0);
        
        // 背景
        const bg = container.addComponent(Graphics);
        drawPixelPanel(bg, -320, -40, 640, 80, PIXEL_UI.panel, PIXEL_UI.hi);
        
        const transform = container.addComponent(UITransform);
        transform.setContentSize(640, 80);
        
        // 标题
        const titleNode = new Node('Title');
        titleNode.parent = container;
        titleNode.setPosition(-250, 15, 0);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = title;
        titleLabel.fontSize = 24;
        titleLabel.lineHeight = 30;
        titleLabel.color = new Color(255, 255, 255, 255);
        
        // 等级
        const levelNode = new Node('Level');
        levelNode.parent = container;
        levelNode.setPosition(-250, -15, 0);
        const levelLabel = levelNode.addComponent(Label);
        levelLabel.string = 'Lv.0';
        levelLabel.fontSize = 18;
        levelLabel.lineHeight = 24;
        levelLabel.color = new Color(180, 180, 180, 255);
        
        // 下一级效果
        const effectNode = new Node('Effect');
        effectNode.parent = container;
        effectNode.setPosition(0, 0, 0);
        const effectLabel = effectNode.addComponent(Label);
        effectLabel.string = '下一级: ...';
        effectLabel.fontSize = 18;
        effectLabel.lineHeight = 24;
        effectLabel.color = new Color(255, 215, 0, 255);
        
        // 费用
        const costNode = new Node('Cost');
        costNode.parent = container;
        costNode.setPosition(180, 15, 0);
        const costLabel = costNode.addComponent(Label);
        costLabel.string = '费用: 20';
        costLabel.fontSize = 16;
        costLabel.lineHeight = 22;
        costLabel.color = new Color(200, 200, 200, 255);
        
        // 升级按钮
        const button = new Node('Button');
        button.parent = container;
        button.setPosition(250, 0, 0);
        const btnTransform = button.addComponent(UITransform);
        btnTransform.setContentSize(100, 50);
        
        const btnGraphics = button.addComponent(Graphics);
        drawPixelPanel(btnGraphics, -50, -25, 100, 50, PIXEL_UI.ok, PIXEL_UI.accent);
        
        const btnLabelNode = new Node('Label');
        btnLabelNode.parent = button;
        const buttonLabel = btnLabelNode.addComponent(Label);
        buttonLabel.string = '升级';
        buttonLabel.fontSize = 20;
        buttonLabel.lineHeight = 26;
        buttonLabel.color = new Color(255, 255, 255, 255);
        
        // 绑定升级事件
        button.on(Node.EventType.TOUCH_END, () => this.onUpgrade(line), this);
        
        return {
            container,
            titleLabel,
            levelLabel,
            effectLabel,
            costLabel,
            button,
            buttonLabel
        };
    }
    
    /**
     * 更新 UI
     */
    private updateUI() {
        // 残骸显示
        if (this.scrapLabel) {
            this.scrapLabel.string = `残骸: ${MetaData.scrap}`;
        }
        
        // 更新三行
        this.updateRow(this._firepowerRow, UpgradeLine.Firepower, getFirepowerEffectText);
        this.updateRow(this._fortRow, UpgradeLine.Fort, getFortEffectText);
        this.updateRow(this._supplyRow, UpgradeLine.Supply, getSupplyEffectText);
    }
    
    /**
     * 更新单行 UI
     */
    private updateRow(
        row: UpgradeRowUI | null, 
        line: UpgradeLine, 
        getEffectText: (level: number) => string
    ) {
        if (!row) return;
        
        const level = this.getLevel(line);
        const cost = getUpgradeCost(level);
        const isMaxLevel = level >= MAX_LEVEL;
        const canAfford = MetaData.scrap >= cost;
        
        // 等级
        row.levelLabel.string = `Lv.${level}`;
        
        // 效果
        if (isMaxLevel) {
            row.effectLabel.string = '已满级';
            row.effectLabel.color = new Color(100, 255, 100, 255);
        } else {
            row.effectLabel.string = `下一级: ${getEffectText(level)}`;
            row.effectLabel.color = new Color(255, 215, 0, 255);
        }
        
        // 费用
        if (isMaxLevel) {
            row.costLabel.string = '';
        } else {
            row.costLabel.string = `费用: ${cost}`;
            row.costLabel.color = canAfford 
                ? new Color(200, 200, 200, 255) 
                : new Color(255, 100, 100, 255);
        }
        
        // 按钮状态
        const btnGraphics = row.button.getComponent(Graphics);
        if (btnGraphics) {
            const fill = isMaxLevel
                ? new Color(70, 70, 74, 255)
                : canAfford ? PIXEL_UI.ok : PIXEL_UI.danger;
            drawPixelPanel(btnGraphics, -50, -25, 100, 50, fill, PIXEL_UI.hi);
        }
        
        row.buttonLabel.string = isMaxLevel ? '满级' : '升级';
    }
    
    /**
     * 获取等级
     */
    private getLevel(line: UpgradeLine): number {
        switch (line) {
            case UpgradeLine.Firepower: return MetaData.firepowerLevel;
            case UpgradeLine.Fort: return MetaData.fortLevel;
            case UpgradeLine.Supply: return MetaData.supplyLevel;
        }
    }
    
    /**
     * 升级回调
     */
    private onUpgrade(line: UpgradeLine) {
        const success = MetaData.tryUpgrade(line);
        if (success) {
            console.log(`[LobbyScene] 升级 ${line} 成功`);
            this.updateUI();
        } else {
            console.log(`[LobbyScene] 升级 ${line} 失败`);
        }
    }
    
    /**
     * 残骸变化回调
     */
    private onScrapChanged(scrap: number) {
        this.updateUI();
    }
    
    /**
     * 首次提示（建议升级补给）
     */
    private showFirstTimeTip() {
        if (this._firstTipShown) return;
        
        // 如果补给还在 0 级且有足够残骸，显示提示
        if (MetaData.supplyLevel === 0 && MetaData.scrap >= 20) {
            this._firstTipShown = true;
            console.log('[LobbyScene] 提示：建议先升级补给线，增加开局 DP');
            // 可以添加一个临时气泡，但不阻塞
        }
    }
    
    /**
     * Day9: 创建关卡选择 UI
     */
    private createLevelSelectUI() {
        const container = this.upgradeContainer || this.node;
        
        // 标题
        const titleNode = new Node('LevelSelectTitle');
        titleNode.parent = container;
        titleNode.setPosition(0, 350, 0);
        const titleLabel = titleNode.addComponent(Label);
        titleLabel.string = '选择关卡';
        titleLabel.fontSize = 28;
        titleLabel.lineHeight = 34;
        titleLabel.color = new Color(255, 255, 255, 255);
        
        // 关卡按钮容器
        const btnContainer = new Node('LevelButtons');
        btnContainer.parent = container;
        btnContainer.setPosition(0, 290, 0);
        
        // L1 按钮
        this.createLevelButton(btnContainer, LevelId.L1, -120, 0);
        
        // L2 按钮
        this.createLevelButton(btnContainer, LevelId.L2, 120, 0);
        
        // 初始选中 L1
        this._selectedLevel = LevelId.L1;
        this.updateLevelButtons();
    }
    
    /**
     * 创建单个关卡按钮
     */
    private createLevelButton(parent: Node, levelId: LevelId, x: number, y: number) {
        const config = getLevelConfig(levelId);
        const isUnlocked = MetaData.isLevelUnlocked(levelId);
        
        const button = new Node(`LevelBtn_${levelId}`);
        button.parent = parent;
        button.setPosition(x, y, 0);
        
        const transform = button.addComponent(UITransform);
        transform.setContentSize(180, 80);
        
        const graphics = button.addComponent(Graphics);
        
        // 关卡名称
        const labelNode = new Node('Label');
        labelNode.parent = button;
        labelNode.setPosition(0, 10, 0);
        const label = labelNode.addComponent(Label);
        label.string = config.name;
        label.fontSize = 22;
        label.lineHeight = 28;
        label.color = new Color(255, 255, 255, 255);
        
        // 描述
        const descNode = new Node('Desc');
        descNode.parent = button;
        descNode.setPosition(0, -15, 0);
        const descLabel = descNode.addComponent(Label);
        descLabel.string = config.description;
        descLabel.fontSize = 14;
        descLabel.lineHeight = 18;
        descLabel.color = new Color(180, 180, 180, 255);
        
        // 锁定图标
        const lockNode = new Node('Lock');
        lockNode.parent = button;
        lockNode.setPosition(0, 0, 0);
        const lockLabel = lockNode.addComponent(Label);
        lockLabel.string = '🔒';
        lockLabel.fontSize = 36;
        lockLabel.color = new Color(100, 100, 100, 255);
        lockNode.active = !isUnlocked;
        
        // 点击事件
        button.on(Node.EventType.TOUCH_END, () => this.onLevelSelect(levelId), this);
        
        this._levelButtons.set(levelId, { button, label, lockIcon: lockNode });
    }
    
    /**
     * 关卡选择回调
     */
    private onLevelSelect(levelId: LevelId) {
        const isUnlocked = MetaData.isLevelUnlocked(levelId);
        
        if (!isUnlocked) {
            console.log(`[LobbyScene] 关卡 ${levelId} 未解锁`);
            return;
        }
        
        this._selectedLevel = levelId;
        console.log(`[LobbyScene] 选中关卡: ${levelId}`);
        this.updateLevelButtons();
    }
    
    /**
     * 更新关卡按钮状态
     */
    private updateLevelButtons() {
        for (const [levelId, ui] of this._levelButtons) {
            const isUnlocked = MetaData.isLevelUnlocked(levelId);
            const isSelected = levelId === this._selectedLevel;
            
            const graphics = ui.button.getComponent(Graphics);
            if (graphics) {
                graphics.clear();
                
                const fill = !isUnlocked
                    ? new Color(48, 44, 52, 230)
                    : isSelected ? new Color(58, 106, 170, 255) : PIXEL_UI.panelAlt;
                const border = isSelected ? PIXEL_UI.accent : PIXEL_UI.hi;
                drawPixelPanel(graphics, -90, -40, 180, 80, fill, border);
            }
            
            // 锁定图标
            ui.lockIcon.active = !isUnlocked;
        }
    }
    
    /**
     * 大厅底部「隐私政策」「用户协议」入口：不挡「开始战斗」（约 y=-420）。
     */
    private createLegalEntries() {
        const parent = this.upgradeContainer || this.node;
        this._legalOverlay = new LegalOverlay(parent);
        
        LOBBY_LEGAL_ENTRIES.forEach((entry, i) => {
            const x = i === 0 ? -170 : 170;
            const button = new Node(`LegalBtn_${entry.id}`);
            button.parent = parent;
            button.setPosition(x, -530, 0);
            
            const tf = button.addComponent(UITransform);
            tf.setContentSize(200, 48);
            
            const g = button.addComponent(Graphics);
            drawPixelPanel(g, -100, -24, 200, 48, PIXEL_UI.panel, PIXEL_UI.hi);
            
            const labelNode = new Node('Label');
            labelNode.parent = button;
            const label = labelNode.addComponent(Label);
            label.string = entry.label;
            label.fontSize = 22;
            label.lineHeight = 28;
            label.color = new Color(200, 210, 230, 255);
            
            button.on(Node.EventType.TOUCH_END, () => {
                this._legalOverlay?.open(entry.id);
            }, this);
        });
    }
    
    /**
     * 开始战斗
     * Creator 3.8.6: loadScene(name, onLaunched?, onUnloaded?)；预览当前场景时按名常失败。
     */
    private onStartBattle() {
        if (this._battleJumpStarted) {
            return;
        }
        this._battleJumpStarted = true;
        
        // Day9: 设置当前关卡
        GameData.currentLevel = this._selectedLevel;
        
        console.log('[LobbyScene] 开始战斗');
        console.log(`[LobbyScene] 选中关卡: ${this._selectedLevel}`);
        console.log(`[LobbyScene] 当前三线: 火力=${MetaData.firepowerLevel}, 城防=${MetaData.fortLevel}, 补给=${MetaData.supplyLevel}`);
        
        if (this.battleScene) {
            this.runBattleAsset(this.battleScene);
            return;
        }
        
        let accepted = true;
        try {
            accepted = director.loadScene(SCENE_BATTLE, (err: Error | null) => {
                if (launchedCallbackHasError(err)) {
                    console.warn('[LobbyScene] onLaunched 报错，UUID 回退:', err);
                    this.loadBattleByUuid();
                    return;
                }
                console.log('[LobbyScene] loadScene(Battle) 成功');
            });
        } catch (e) {
            console.warn('[LobbyScene] loadScene 抛错:', e);
            accepted = false;
        }
        
        if (shouldFallbackToUuid(accepted, false)) {
            console.warn('[LobbyScene] loadScene 返回 false，立即 UUID 回退');
            this.loadBattleByUuid();
        }
    }
    
    private loadBattleByUuid() {
        assetManager.loadAny({ uuid: BATTLE_SCENE_UUID }, (err: Error | null, asset: SceneAsset) => {
            if (err || !asset) {
                console.error('[LobbyScene] UUID 加载 Battle 失败:', err);
                this._battleJumpStarted = false;
                return;
            }
            this.runBattleAsset(asset);
        });
    }
    
    private runBattleAsset(asset: SceneAsset) {
        try {
            director.runSceneImmediate(asset);
        } catch (e) {
            console.error('[LobbyScene] runSceneImmediate 失败，尝试 runScene:', e);
            try {
                director.runScene(asset);
            } catch (e2) {
                console.error('[LobbyScene] runScene(Battle) 失败:', e2);
                this._battleJumpStarted = false;
            }
        }
    }
}
