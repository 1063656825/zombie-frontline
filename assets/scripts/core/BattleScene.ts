/**
 * BattleScene.ts
 * 战斗场景控制器
 * 整合 BattleFlow、GridBuild、BuildingPanel 等系统
 * Day2: 添加建筑面板与网格交互
 */

import { _decorator, Component, Label, Node, director, Button, Color, Sprite, UITransform, Graphics } from 'cc';
import { GameData, GameEvents, EVENT_HP_CHANGED, EVENT_DP_CHANGED } from '../data/GameData';
import { BattleFlow, BattleState, BattleEvents, EVENT_STATE_CHANGED, EVENT_WAVE_CLEAR, EVENT_BATTLE_WIN, EVENT_BATTLE_LOSE } from '../battle/BattleFlow';
import { GridBuild, GridEvents, EVENT_BUILDING_PLACED } from '../battle/GridBuild';
import { BuildingPanel, BuildingPanelEvents, EVENT_BUILDING_SELECTED, EVENT_BUILDING_DESELECTED } from '../ui/BuildingPanel';
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
    
    @property(Node)
    startCombatBtn: Node | null = null;
    
    @property(Node)
    backToLobbyBtn: Node | null = null;
    
    @property(Node)
    pauseBtn: Node | null = null;
    
    @property(Label)
    tutorialLabel: Label | null = null;
    
    // 占位节点
    @property(Node)
    baseNode: Node | null = null;  // 据点
    
    @property(Node)
    buildingContainer: Node | null = null;  // 建筑容器
    
    @property(Node)
    enemyContainer: Node | null = null;  // 敌人容器
    
    @property(Node)
    gridNode: Node | null = null;  // 网格节点
    
    start() {
        console.log('[BattleScene] 战斗场景开始');
        
        this.setupEventListeners();
        this.setupButtons();
        
        // 初始化网格（传入建筑容器）
        if (this.gridBuild) {
            this.gridBuild.initGrid(this.buildingContainer || undefined);
        }
        
        // 创建占位美术
        this.createPlaceholderGraphics();
        
        console.log('[BattleScene] Day2: 建筑面板与网格交互已启用');
    }
    
    onDestroy() {
        this.removeEventListeners();
    }
    
    private setupEventListeners() {
        // 战斗流程事件
        BattleEvents.on(EVENT_STATE_CHANGED, this.onBattleStateChanged, this);
        BattleEvents.on(EVENT_BATTLE_WIN, this.onBattleWin, this);
        BattleEvents.on(EVENT_BATTLE_LOSE, this.onBattleLose, this);
        
        // 建筑面板事件
        BuildingPanelEvents.on(EVENT_BUILDING_SELECTED, this.onBuildingSelected, this);
        BuildingPanelEvents.on(EVENT_BUILDING_DESELECTED, this.onBuildingDeselected, this);
        
        // 网格事件
        GridEvents.on(EVENT_BUILDING_PLACED, this.onBuildingPlaced, this);
    }
    
    private removeEventListeners() {
        BattleEvents.off(EVENT_STATE_CHANGED, this.onBattleStateChanged, this);
        BattleEvents.off(EVENT_BATTLE_WIN, this.onBattleWin, this);
        BattleEvents.off(EVENT_BATTLE_LOSE, this.onBattleLose, this);
        
        BuildingPanelEvents.off(EVENT_BUILDING_SELECTED, this.onBuildingSelected, this);
        BuildingPanelEvents.off(EVENT_BUILDING_DESELECTED, this.onBuildingDeselected, this);
        
        GridEvents.off(EVENT_BUILDING_PLACED, this.onBuildingPlaced, this);
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
        
        // 放置成功后取消选中（可选：保持选中以连续放置）
        // if (this.buildingPanel) {
        //     this.buildingPanel.deselectBuilding();
        // }
        
        // 更新建筑面板按钮状态
        if (this.buildingPanel) {
            this.buildingPanel.updateAllButtons();
        }
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
        
        // 非部署阶段时，取消建筑选中并禁用网格
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
                this.tutorialLabel.string = '【战斗中】建筑自动攻击（按钮已禁用）';
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
        // Day5 实现完整结算 UI
    }
    
    /**
     * 战斗失败
     */
    private onBattleLose() {
        console.log('[BattleScene] 战斗失败！');
        // Day4 实现复活广告逻辑
    }
    
    // ========== 调试方法 ==========
    
    /**
     * 调试：清除当前波
     */
    debugClearWave() {
        if (this.battleFlow) {
            this.battleFlow.debugClearWave();
        }
    }
    
    /**
     * 调试：扣除据点 HP
     */
    debugDamageBase(amount: number = 20) {
        GameData.hp -= amount;
    }
    
    /**
     * 调试：增加 DP
     */
    debugAddDP(amount: number = 5) {
        GameData.addDP(amount);
    }
}
