/**
 * BattleScene.ts
 * 战斗场景控制器
 * 整合 BattleFlow、GridBuild、BuildingPanel、Combat、EnemyWave 系统
 * Day3: 敌人移动、建筑开火、地雷触发、点屏转向
 */

import { _decorator, Component, Label, Node, director, Button, Color, Sprite, UITransform, Graphics, Vec3, EventTouch } from 'cc';
import { GameData, GameEvents, EVENT_HP_CHANGED, EVENT_DP_CHANGED } from '../data/GameData';
import { BattleFlow, BattleState, BattleEvents, EVENT_STATE_CHANGED, EVENT_WAVE_START, EVENT_WAVE_CLEAR, EVENT_BATTLE_WIN, EVENT_BATTLE_LOSE } from '../battle/BattleFlow';
import { GridBuild, GridEvents, EVENT_BUILDING_PLACED } from '../battle/GridBuild';
import { BuildingPanel, BuildingPanelEvents, EVENT_BUILDING_SELECTED, EVENT_BUILDING_DESELECTED } from '../ui/BuildingPanel';
import { Combat, CombatEvents, EVENT_ENEMY_KILLED, EVENT_BASE_DAMAGED, EVENT_MINE_TRIGGERED } from '../battle/Combat';
import { EnemyWave } from '../battle/EnemyWave';
import { BuildingType, BUILDING_NAMES } from '../battle/BuildingConfig';
import { SCENE_LOBBY } from './SceneManager';

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
    baseNode: Node | null = null;  // 据点
    
    @property(Node)
    buildingContainer: Node | null = null;  // 建筑容器
    
    @property(Node)
    enemyContainer: Node | null = null;  // 敌人容器
    
    @property(Node)
    gridNode: Node | null = null;  // 网格节点
    
    @property(Node)
    combatTouchArea: Node | null = null;  // 战斗触摸区域（点屏转向）
    
    // 主角朝向指示器
    private _aimIndicator: Node | null = null;
    
    start() {
        console.log('[BattleScene] 战斗场景开始');
        
        this.setupEventListeners();
        this.setupButtons();
        this.setupCombatTouch();
        
        // 初始化网格（传入建筑容器）
        if (this.gridBuild) {
            this.gridBuild.initGrid(this.buildingContainer || undefined);
        }
        
        // 初始化战斗系统
        if (this.combat && this.gridBuild) {
            this.combat.gridBuild = this.gridBuild;
            this.combat.enemyContainer = this.enemyContainer;
            
            // 设置击杀回调
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
        
        console.log('[BattleScene] Day3: 战斗系统已启用');
    }
    
    onDestroy() {
        this.removeEventListeners();
    }
    
    private setupEventListeners() {
        // 战斗流程事件
        BattleEvents.on(EVENT_STATE_CHANGED, this.onBattleStateChanged, this);
        BattleEvents.on(EVENT_WAVE_START, this.onWaveStart, this);
        BattleEvents.on(EVENT_WAVE_CLEAR, this.onWaveClear, this);
        BattleEvents.on(EVENT_BATTLE_WIN, this.onBattleWin, this);
        BattleEvents.on(EVENT_BATTLE_LOSE, this.onBattleLose, this);
        
        // 建筑面板事件
        BuildingPanelEvents.on(EVENT_BUILDING_SELECTED, this.onBuildingSelected, this);
        BuildingPanelEvents.on(EVENT_BUILDING_DESELECTED, this.onBuildingDeselected, this);
        
        // 网格事件
        GridEvents.on(EVENT_BUILDING_PLACED, this.onBuildingPlaced, this);
        
        // 战斗事件
        CombatEvents.on(EVENT_MINE_TRIGGERED, this.onMineTriggered, this);
    }
    
    private removeEventListeners() {
        BattleEvents.off(EVENT_STATE_CHANGED, this.onBattleStateChanged, this);
        BattleEvents.off(EVENT_WAVE_START, this.onWaveStart, this);
        BattleEvents.off(EVENT_WAVE_CLEAR, this.onWaveClear, this);
        BattleEvents.off(EVENT_BATTLE_WIN, this.onBattleWin, this);
        BattleEvents.off(EVENT_BATTLE_LOSE, this.onBattleLose, this);
        
        BuildingPanelEvents.off(EVENT_BUILDING_SELECTED, this.onBuildingSelected, this);
        BuildingPanelEvents.off(EVENT_BUILDING_DESELECTED, this.onBuildingDeselected, this);
        
        GridEvents.off(EVENT_BUILDING_PLACED, this.onBuildingPlaced, this);
        CombatEvents.off(EVENT_MINE_TRIGGERED, this.onMineTriggered, this);
    }
    
    /**
     * 设置战斗触摸（点屏转向）
     */
    private setupCombatTouch() {
        // 使用整个屏幕区域或指定区域
        const touchArea = this.combatTouchArea || this.node;
        
        // 确保有 UITransform
        let transform = touchArea.getComponent(UITransform);
        if (!transform) {
            transform = touchArea.addComponent(UITransform);
            transform.setContentSize(720, 1280);
        }
        
        touchArea.on(Node.EventType.TOUCH_START, this.onCombatTouchStart, this);
        touchArea.on(Node.EventType.TOUCH_MOVE, this.onCombatTouchMove, this);
    }
    
    /**
     * 战斗触摸开始
     */
    private onCombatTouchStart(event: EventTouch) {
        this.handleCombatTouch(event);
    }
    
    /**
     * 战斗触摸移动
     */
    private onCombatTouchMove(event: EventTouch) {
        this.handleCombatTouch(event);
    }
    
    /**
     * 处理战斗触摸（点屏转向）
     */
    private handleCombatTouch(event: EventTouch) {
        // 只在 Combat 状态处理
        if (!this.battleFlow || this.battleFlow.state !== BattleState.Combat) {
            return;
        }
        
        if (!this.combat) return;
        
        const touchPos = event.getUILocation();
        const touchArea = this.combatTouchArea || this.node;
        const transform = touchArea.getComponent(UITransform);
        
        if (!transform) return;
        
        // 转换为本地坐标
        const localPos = transform.convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0));
        
        // 设置主角朝向
        this.combat.aimAtPosition(localPos);
        
        // 更新朝向指示器
        this.updateAimIndicator(localPos);
    }
    
    /**
     * 创建朝向指示器
     */
    private createAimIndicator() {
        this._aimIndicator = new Node('AimIndicator');
        this._aimIndicator.parent = this.node;
        this._aimIndicator.setPosition(0, -450, 0);  // 据点位置
        
        const graphics = this._aimIndicator.addComponent(Graphics);
        graphics.strokeColor = new Color(255, 255, 100, 150);
        graphics.lineWidth = 3;
        
        // 初始绘制向上的线
        this.drawAimLine(graphics, new Vec3(0, 1, 0));
        
        this._aimIndicator.active = false;
    }
    
    /**
     * 绘制瞄准线
     */
    private drawAimLine(graphics: Graphics, direction: Vec3) {
        graphics.clear();
        
        const length = 150;
        const endX = direction.x * length;
        const endY = direction.y * length;
        
        // 画主线
        graphics.moveTo(0, 0);
        graphics.lineTo(endX, endY);
        graphics.stroke();
        
        // 画扇形指示
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
    
    /**
     * 更新朝向指示器
     */
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
    
    /**
     * 建筑选中回调
     */
    private onBuildingSelected(type: BuildingType) {
        console.log(`[BattleScene] 选中建筑: ${BUILDING_NAMES[type]}`);
        if (this.gridBuild) {
            this.gridBuild.setSelectedBuildingType(type);
        }
    }
    
    /**
     * 建筑取消选中回调
     */
    private onBuildingDeselected() {
        console.log('[BattleScene] 取消选中建筑');
        if (this.gridBuild) {
            this.gridBuild.setSelectedBuildingType(null);
        }
    }
    
    /**
     * 建筑放置成功回调
     */
    private onBuildingPlaced(building: any) {
        console.log(`[BattleScene] 建筑放置成功: ${building.type}`);
        
        // 更新建筑面板按钮状态
        if (this.buildingPanel) {
            this.buildingPanel.updateAllButtons();
        }
    }
    
    /**
     * 地雷触发回调
     */
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
    
    /**
     * 创建占位美术（使用 Graphics 绘制色块）
     */
    private createPlaceholderGraphics() {
        // 据点占位（底部蓝色方块）
        if (this.baseNode) {
            this.drawColorBlock(this.baseNode, new Color(33, 150, 243, 255), 200, 40);
            console.log('[BattleScene] 创建据点占位');
        }
    }
    
    /**
     * 绘制纯色方块
     */
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
        
        // 停止敌人生成
        if (this.enemyWave) {
            this.enemyWave.stopWave();
        }
        
        // 停用战斗系统
        if (this.combat) {
            this.combat.setActive(false);
        }
    }
    
    /**
     * 更新敌人数量显示
     */
    private updateEnemyCount() {
        if (this.enemyCountLabel && this.combat) {
            const count = this.combat.getAliveEnemyCount();
            this.enemyCountLabel.string = `敌人: ${count}`;
        }
    }
    
    /**
     * 状态变化回调
     */
    private onBattleStateChanged(newState: BattleState, oldState: BattleState) {
        console.log(`[BattleScene] 状态变化: ${oldState} → ${newState}`);
        
        // 更新 GridBuild 的战斗状态
        if (this.gridBuild) {
            this.gridBuild.setBattleState(newState);
        }
        
        // 更新「开战」按钮可见性
        if (this.startCombatBtn) {
            const showStartBtn = newState === BattleState.DeployFast || newState === BattleState.DeployTune;
            this.startCombatBtn.active = showStartBtn;
        }
        
        // 更新朝向指示器可见性
        if (this._aimIndicator) {
            this._aimIndicator.active = newState === BattleState.Combat;
        }
        
        // 非部署阶段时，取消建筑选中
        const isDeployPhase = newState === BattleState.DeployFast || newState === BattleState.DeployTune;
        if (!isDeployPhase) {
            if (this.gridBuild) {
                this.gridBuild.setSelectedBuildingType(null);
            }
        }
        
        // 更新教学提示
        this.updateTutorial(newState);
    }
    
    /**
     * 更新教学提示
     */
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
            case BattleState.Settle:
                this.tutorialLabel.string = GameData.hp > 0 ? '胜利！' : '据点被摧毁...';
                break;
            default:
                this.tutorialLabel.string = '';
        }
    }
    
    /**
     * 点击「开战」按钮
     */
    private onStartCombatClick() {
        if (this.battleFlow) {
            this.battleFlow.startCombat();
        }
    }
    
    /**
     * 返回大厅
     */
    private onBackToLobby() {
        console.log('[BattleScene] 返回大厅');
        
        // 清理战斗实体
        if (this.combat) {
            this.combat.clearAll();
        }
        
        director.loadScene(SCENE_LOBBY);
    }
    
    /**
     * 暂停/继续
     */
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
    }
    
    /**
     * 战斗失败
     */
    private onBattleLose() {
        console.log('[BattleScene] 战斗失败！');
        
        if (this.combat) {
            this.combat.setActive(false);
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
}
