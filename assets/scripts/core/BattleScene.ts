/**
 * BattleScene.ts
 * 战斗场景控制器
 * 整合 BattleFlow、GridBuild、BuildingPanel、Combat、EnemyWave 系统
 * Day4: 复活面板、结算面板、胜负判定
 * Day7: 补给按钮、微信桥接
 */

import { _decorator, Component, Label, Node, director, Button, Color, Sprite, UITransform, Graphics, Vec3, EventTouch } from 'cc';
import { GameData, GameEvents, EVENT_HP_CHANGED, EVENT_DP_CHANGED } from '../data/GameData';
import { BattleFlow, BattleState, BattleEvents, EVENT_STATE_CHANGED, EVENT_WAVE_START, EVENT_WAVE_CLEAR, EVENT_BATTLE_WIN, EVENT_BATTLE_LOSE, EVENT_SHOW_REVIVE } from '../battle/BattleFlow';
import { GridBuild, GridEvents, EVENT_BUILDING_PLACED, EVENT_BUILDING_MERGED, EVENT_MERGE_AVAILABLE } from '../battle/GridBuild';
import { BuildingPanel, BuildingPanelEvents, EVENT_BUILDING_SELECTED, EVENT_BUILDING_DESELECTED } from '../ui/BuildingPanel';
import { Combat, CombatEvents, EVENT_ENEMY_KILLED, EVENT_BASE_DAMAGED, EVENT_MINE_TRIGGERED } from '../battle/Combat';
import { EnemyWave } from '../battle/EnemyWave';
import { RevivePanel } from '../ui/RevivePanel';
import { SettlePanel } from '../ui/SettlePanel';
import { TutorialGuide, TutorialType } from '../ui/TutorialGuide';
import { SupplyButton } from '../ui/SupplyButton';
import { BuildingType, BUILDING_NAMES } from '../battle/BuildingConfig';
import { SCENE_LOBBY } from './SceneManager';
import { screenShake, screenFlashRed } from '../effects/HitEffects';
import { initWxBridge } from '../platform/WxBridge';

const { ccclass, property } = _decorator;

@ccclass('BattleScene')
export class BattleScene extends Component {
    
    @property(BattleFlow)
    battleFlow: BattleFlow | null = null;
    
    @property(GridBuild)
    gridBuild: GridBuild | null = null;
    
    @property(BuildingPanel)
    buildingPanel: BuildingPanel | null = null;
    
    @property(Combat)
    combat: Combat | null = null;
    
    @property(EnemyWave)
    enemyWave: EnemyWave | null = null;
    
    @property(Node)
    startCombatBtn: Node | null = null;
    
    @property(Node)
    backToLobbyBtn: Node | null = null;
    
    @property(Node)
    pauseBtn: Node | null = null;
    
    @property(Label)
    tutorialLabel: Label | null = null;
    
    @property(Label)
    enemyCountLabel: Label | null = null;
    
    // 占位节点
    @property(Node)
    baseNode: Node | null = null;
    
    @property(Node)
    buildingContainer: Node | null = null;
    
    @property(Node)
    enemyContainer: Node | null = null;
    
    @property(Node)
    gridNode: Node | null = null;
    
    @property(Node)
    combatTouchArea: Node | null = null;
    
    // UI 面板
    private _revivePanel: RevivePanel | null = null;
    private _settlePanel: SettlePanel | null = null;
    private _tutorialGuide: TutorialGuide | null = null;
    private _supplyButton: SupplyButton | null = null;
    
    // 主角朝向指示器
    private _aimIndicator: Node | null = null;
    
    // 首次战斗触摸标记（用于显示引导）
    private _firstCombatTouchShown = false;
    
    // 本局获得的残骸（胜利时发放）
    private readonly BASE_SCRAP_REWARD = 30;
    
    start() {
        console.log('[BattleScene] 战斗场景开始');
        
        // Day7: 初始化微信桥接
        initWxBridge();
        
        this.setupEventListeners();
        this.setupButtons();
        this.setupCombatTouch();
        this.createUIPanels();
        
        // 初始化网格
        if (this.gridBuild) {
            this.gridBuild.initGrid(this.buildingContainer || undefined);
        }
        
        // 初始化战斗系统
        if (this.combat && this.gridBuild) {
            this.combat.gridBuild = this.gridBuild;
            this.combat.enemyContainer = this.enemyContainer;
            
            this.combat.setOnEnemyKilledCallback(() => {
                if (this.battleFlow) {
                    this.battleFlow.onEnemyKilled();
                }
                this.updateEnemyCount();
            });
        }
        
        // 初始化敌人波次
        if (this.enemyWave && this.combat) {
            this.enemyWave.combat = this.combat;
        }
        
        // 创建占位美术
        this.createPlaceholderGraphics();
        
        // 创建朝向指示器
        this.createAimIndicator();
        
        console.log('[BattleScene] Day7: 广告三坑与微信桥接已启用');
    }
    
    onDestroy() {
        this.removeEventListeners();
    }
    
    /**
     * 创建 UI 面板
     */
    private createUIPanels() {
        // 复活面板
        const reviveNode = new Node('RevivePanel');
        reviveNode.parent = this.node;
        reviveNode.setPosition(0, 0, 0);
        this._revivePanel = reviveNode.addComponent(RevivePanel);
        
        // 结算面板
        const settleNode = new Node('SettlePanel');
        settleNode.parent = this.node;
        settleNode.setPosition(0, 0, 0);
        this._settlePanel = settleNode.addComponent(SettlePanel);
        
        // 引导气泡（Day5）
        const tutorialNode = new Node('TutorialGuide');
        tutorialNode.parent = this.node;
        tutorialNode.setPosition(0, 0, 0);
        this._tutorialGuide = tutorialNode.addComponent(TutorialGuide);
        
        // 补给按钮（Day7）
        const supplyNode = new Node('SupplyButton');
        supplyNode.parent = this.node;
        supplyNode.setPosition(0, 0, 0);
        this._supplyButton = supplyNode.addComponent(SupplyButton);
        this._supplyButton.setOnSupplyGranted(() => {
            if (this.buildingPanel) {
                this.buildingPanel.updateAllButtons();
            }
        });
    }
    
    private setupEventListeners() {
        // 战斗流程事件
        BattleEvents.on(EVENT_STATE_CHANGED, this.onBattleStateChanged, this);
        BattleEvents.on(EVENT_WAVE_START, this.onWaveStart, this);
        BattleEvents.on(EVENT_WAVE_CLEAR, this.onWaveClear, this);
        BattleEvents.on(EVENT_BATTLE_WIN, this.onBattleWin, this);
        BattleEvents.on(EVENT_BATTLE_LOSE, this.onBattleLose, this);
        BattleEvents.on(EVENT_SHOW_REVIVE, this.onShowRevive, this);
        
        // 建筑面板事件
        BuildingPanelEvents.on(EVENT_BUILDING_SELECTED, this.onBuildingSelected, this);
        BuildingPanelEvents.on(EVENT_BUILDING_DESELECTED, this.onBuildingDeselected, this);
        
        // 网格事件
        GridEvents.on(EVENT_BUILDING_PLACED, this.onBuildingPlaced, this);
        GridEvents.on(EVENT_BUILDING_MERGED, this.onBuildingMerged, this);
        GridEvents.on(EVENT_MERGE_AVAILABLE, this.onMergeAvailable, this);
        
        // 战斗事件
        CombatEvents.on(EVENT_MINE_TRIGGERED, this.onMineTriggered, this);
    }
    
    private removeEventListeners() {
        BattleEvents.off(EVENT_STATE_CHANGED, this.onBattleStateChanged, this);
        BattleEvents.off(EVENT_WAVE_START, this.onWaveStart, this);
        BattleEvents.off(EVENT_WAVE_CLEAR, this.onWaveClear, this);
        BattleEvents.off(EVENT_BATTLE_WIN, this.onBattleWin, this);
        BattleEvents.off(EVENT_BATTLE_LOSE, this.onBattleLose, this);
        BattleEvents.off(EVENT_SHOW_REVIVE, this.onShowRevive, this);
        
        BuildingPanelEvents.off(EVENT_BUILDING_SELECTED, this.onBuildingSelected, this);
        BuildingPanelEvents.off(EVENT_BUILDING_DESELECTED, this.onBuildingDeselected, this);
        
        GridEvents.off(EVENT_BUILDING_PLACED, this.onBuildingPlaced, this);
        GridEvents.off(EVENT_BUILDING_MERGED, this.onBuildingMerged, this);
        GridEvents.off(EVENT_MERGE_AVAILABLE, this.onMergeAvailable, this);
        CombatEvents.off(EVENT_MINE_TRIGGERED, this.onMineTriggered, this);
    }
    
    /**
     * 设置战斗触摸（点屏转向）
     */
    private setupCombatTouch() {
        const touchArea = this.combatTouchArea || this.node;
        
        let transform = touchArea.getComponent(UITransform);
        if (!transform) {
            transform = touchArea.addComponent(UITransform);
            transform.setContentSize(720, 1280);
        }
        
        touchArea.on(Node.EventType.TOUCH_START, this.onCombatTouchStart, this);
        touchArea.on(Node.EventType.TOUCH_MOVE, this.onCombatTouchMove, this);
    }
    
    private onCombatTouchStart(event: EventTouch) {
        this.handleCombatTouch(event);
    }
    
    private onCombatTouchMove(event: EventTouch) {
        this.handleCombatTouch(event);
    }
    
    private handleCombatTouch(event: EventTouch) {
        if (!this.battleFlow || this.battleFlow.state !== BattleState.Combat) {
            return;
        }
        
        if (!this.combat) return;
        
        // Day5 引导：首次战斗触摸
        if (!this._firstCombatTouchShown && this._tutorialGuide) {
            this._firstCombatTouchShown = true;
            this._tutorialGuide.show(TutorialType.CombatAim);
        }
        
        const touchPos = event.getUILocation();
        const touchArea = this.combatTouchArea || this.node;
        const transform = touchArea.getComponent(UITransform);
        
        if (!transform) return;
        
        const localPos = transform.convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0));
        
        this.combat.aimAtPosition(localPos);
        this.updateAimIndicator(localPos);
    }
    
    private createAimIndicator() {
        this._aimIndicator = new Node('AimIndicator');
        this._aimIndicator.parent = this.node;
        this._aimIndicator.setPosition(0, -450, 0);
        
        const graphics = this._aimIndicator.addComponent(Graphics);
        graphics.strokeColor = new Color(255, 255, 100, 150);
        graphics.lineWidth = 3;
        
        this.drawAimLine(graphics, new Vec3(0, 1, 0));
        this._aimIndicator.active = false;
    }
    
    private drawAimLine(graphics: Graphics, direction: Vec3) {
        graphics.clear();
        
        const length = 150;
        const endX = direction.x * length;
        const endY = direction.y * length;
        
        graphics.moveTo(0, 0);
        graphics.lineTo(endX, endY);
        graphics.stroke();
        
        const angle = 30 * Math.PI / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        const leftX = (direction.x * cos - direction.y * sin) * length * 0.7;
        const leftY = (direction.x * sin + direction.y * cos) * length * 0.7;
        const rightX = (direction.x * cos + direction.y * sin) * length * 0.7;
        const rightY = (-direction.x * sin + direction.y * cos) * length * 0.7;
        
        graphics.moveTo(0, 0);
        graphics.lineTo(leftX, leftY);
        graphics.moveTo(0, 0);
        graphics.lineTo(rightX, rightY);
        graphics.stroke();
    }
    
    private updateAimIndicator(targetPos: Vec3) {
        if (!this._aimIndicator) return;
        
        const basePos = new Vec3(0, -450, 0);
        const direction = new Vec3();
        Vec3.subtract(direction, targetPos, basePos);
        direction.normalize();
        
        const graphics = this._aimIndicator.getComponent(Graphics);
        if (graphics) {
            this.drawAimLine(graphics, direction);
        }
    }
    
    private onBuildingSelected(type: BuildingType) {
        console.log(`[BattleScene] 选中建筑: ${BUILDING_NAMES[type]}`);
        if (this.gridBuild) {
            this.gridBuild.setSelectedBuildingType(type);
        }
    }
    
    private onBuildingDeselected() {
        console.log('[BattleScene] 取消选中建筑');
        if (this.gridBuild) {
            this.gridBuild.setSelectedBuildingType(null);
        }
    }
    
    private onBuildingPlaced(building: any) {
        console.log(`[BattleScene] 建筑放置成功: ${building.type}`);
        
        if (this.buildingPanel) {
            this.buildingPanel.updateAllButtons();
        }
    }
    
    /**
     * 建筑合成成功回调（Day5）
     */
    private onBuildingMerged(building: any) {
        console.log(`[BattleScene] 建筑合成成功: ${building.type} → L${building.level}`);
        
        if (this.buildingPanel) {
            this.buildingPanel.updateAllButtons();
        }
    }
    
    /**
     * 首次可合成回调（Day5）
     */
    private onMergeAvailable() {
        if (this._tutorialGuide) {
            this._tutorialGuide.show(TutorialType.FirstMerge);
        }
    }
    
    private onMineTriggered(building: any, enemies: any[]) {
        console.log(`[BattleScene] 地雷爆炸！影响 ${enemies.length} 个敌人`);
    }
    
    private setupButtons() {
        if (this.startCombatBtn) {
            this.startCombatBtn.on(Node.EventType.TOUCH_END, this.onStartCombatClick, this);
        }
        
        if (this.backToLobbyBtn) {
            this.backToLobbyBtn.on(Node.EventType.TOUCH_END, this.onBackToLobby, this);
        }
        
        if (this.pauseBtn) {
            this.pauseBtn.on(Node.EventType.TOUCH_END, this.onPauseClick, this);
        }
    }
    
    private createPlaceholderGraphics() {
        if (this.baseNode) {
            this.drawColorBlock(this.baseNode, new Color(33, 150, 243, 255), 200, 40);
            console.log('[BattleScene] 创建据点占位');
        }
    }
    
    private drawColorBlock(node: Node, color: Color, width: number, height: number) {
        let graphics = node.getComponent(Graphics);
        if (!graphics) {
            graphics = node.addComponent(Graphics);
        }
        
        graphics.clear();
        graphics.fillColor = color;
        graphics.rect(-width / 2, -height / 2, width, height);
        graphics.fill();
    }
    
    /**
     * 波次开始回调
     */
    private onWaveStart(waveIndex: number) {
        console.log(`[BattleScene] 波次 ${waveIndex} 开始`);
        
        // 复活时需要清除现有敌人
        if (this.combat) {
            this.combat.clearAll();
        }
        
        // 启动敌人生成
        if (this.enemyWave) {
            this.enemyWave.startWave(waveIndex);
        }
        
        // 激活战斗系统
        if (this.combat) {
            this.combat.setActive(true);
        }
        
        this.updateEnemyCount();
    }
    
    /**
     * 波次清除回调
     */
    private onWaveClear(waveIndex: number) {
        console.log(`[BattleScene] 波次 ${waveIndex} 清除`);
        
        if (this.enemyWave) {
            this.enemyWave.stopWave();
        }
        
        if (this.combat) {
            this.combat.setActive(false);
        }
    }
    
    private updateEnemyCount() {
        if (this.enemyCountLabel && this.combat) {
            const count = this.combat.getAliveEnemyCount();
            this.enemyCountLabel.string = `敌人: ${count}`;
        }
    }
    
    /**
     * 显示复活面板
     */
    private onShowRevive(canRevive: boolean) {
        console.log(`[BattleScene] 显示复活面板，可复活: ${canRevive}`);
        
        // 停止战斗
        if (this.combat) {
            this.combat.setActive(false);
        }
        if (this.enemyWave) {
            this.enemyWave.stopWave();
        }
        
        // 显示复活面板
        if (this._revivePanel) {
            this._revivePanel.show(
                canRevive,
                () => this.onReviveConfirm(),
                () => this.onReviveGiveUp()
            );
        }
    }
    
    /**
     * 确认复活
     */
    private onReviveConfirm() {
        console.log('[BattleScene] 执行复活');
        
        if (this.battleFlow) {
            this.battleFlow.revive();
        }
    }
    
    /**
     * 放弃复活
     */
    private onReviveGiveUp() {
        console.log('[BattleScene] 放弃复活，进入失败结算');
        
        if (this.battleFlow) {
            this.battleFlow.giveUpRevive();
        }
    }
    
    /**
     * 状态变化回调
     */
    private onBattleStateChanged(newState: BattleState, oldState: BattleState) {
        console.log(`[BattleScene] 状态变化: ${oldState} → ${newState}`);
        
        if (this.gridBuild) {
            this.gridBuild.setBattleState(newState);
        }
        
        if (this.startCombatBtn) {
            const showStartBtn = newState === BattleState.DeployFast || newState === BattleState.DeployTune;
            this.startCombatBtn.active = showStartBtn;
        }
        
        if (this._aimIndicator) {
            this._aimIndicator.active = newState === BattleState.Combat;
        }
        
        // Day7: 更新补给按钮状态
        if (this._supplyButton) {
            this._supplyButton.setBattleState(newState);
        }
        
        const isDeployPhase = newState === BattleState.DeployFast || newState === BattleState.DeployTune;
        if (!isDeployPhase) {
            if (this.gridBuild) {
                this.gridBuild.setSelectedBuildingType(null);
            }
        }
        
        // Day5 引导：首次落子
        if (newState === BattleState.DeployFast && this._tutorialGuide) {
            this._tutorialGuide.show(TutorialType.FirstPlace);
        }
        
        this.updateTutorial(newState);
    }
    
    private updateTutorial(state: BattleState) {
        if (!this.tutorialLabel) return;
        
        switch (state) {
            case BattleState.DeployFast:
                this.tutorialLabel.string = '【快速落子】点击下方建筑按钮，再点击绿色格子放置';
                break;
            case BattleState.DeployTune:
                this.tutorialLabel.string = '【微调确认】继续部署或点击「开战」';
                break;
            case BattleState.Combat:
                this.tutorialLabel.string = '【战斗中】点击屏幕改变主角朝向，自动射击！';
                break;
            case BattleState.WaveClear:
                this.tutorialLabel.string = '波次清除！准备下一波...';
                break;
            case BattleState.RevivePrompt:
                this.tutorialLabel.string = '据点被摧毁！';
                break;
            case BattleState.Settle:
                this.tutorialLabel.string = GameData.hp > 0 ? '胜利！' : '失败...';
                break;
            default:
                this.tutorialLabel.string = '';
        }
    }
    
    private onStartCombatClick() {
        if (this.battleFlow) {
            this.battleFlow.startCombat();
        }
    }
    
    private onBackToLobby() {
        console.log('[BattleScene] 返回大厅');
        
        if (this.combat) {
            this.combat.clearAll();
        }
        
        director.loadScene(SCENE_LOBBY);
    }
    
    private onPauseClick() {
        if (this.battleFlow) {
            this.battleFlow.togglePause();
        }
    }
    
    /**
     * 战斗胜利
     */
    private onBattleWin() {
        console.log('[BattleScene] 战斗胜利！');
        
        if (this.combat) {
            this.combat.setActive(false);
        }
        
        // 显示胜利结算
        if (this._settlePanel && this.battleFlow) {
            this._settlePanel.showWin(
                this.battleFlow.currentWave + 1,  // 已通过的波次
                6,  // 总波次
                this.BASE_SCRAP_REWARD,
                () => this.onBackToLobby()
            );
        }
    }
    
    /**
     * 战斗失败
     */
    private onBattleLose() {
        console.log('[BattleScene] 战斗失败！');
        
        if (this.combat) {
            this.combat.setActive(false);
        }
        
        // Day9: 失败视觉反馈
        screenShake(this.node, 12, 0.35, 8);
        screenFlashRed(this.node, 0.2);
        
        // 显示失败结算
        if (this._settlePanel && this.battleFlow) {
            this._settlePanel.showLose(
                this.battleFlow.currentWave,
                6,
                this.BASE_SCRAP_REWARD,
                () => this.onBackToLobby()
            );
        }
    }
    
    // ========== 调试方法 ==========
    
    debugClearWave() {
        if (this.battleFlow) {
            this.battleFlow.debugClearWave();
        }
    }
    
    debugDamageBase(amount: number = 20) {
        GameData.hp -= amount;
    }
    
    debugAddDP(amount: number = 5) {
        GameData.addDP(amount);
    }
    
    debugSpawnEnemy() {
        if (this.combat) {
            this.combat.spawnEnemy('Z1' as any, new Vec3(-120, 450, 0), true);
        }
    }
    
    debugTriggerLose() {
        GameData.hp = 0;
    }
}
