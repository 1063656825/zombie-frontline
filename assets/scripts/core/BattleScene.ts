/**
 * BattleScene.ts
 * 战斗场景控制器
 * 整合 BattleFlow、GridBuild 等系统
 */

import { _decorator, Component, Label, Node, director, Button, Color, Sprite, UITransform, Graphics } from 'cc';
import { GameData, GameEvents, EVENT_HP_CHANGED, EVENT_DP_CHANGED } from '../data/GameData';
import { BattleFlow, BattleState, BattleEvents, EVENT_STATE_CHANGED, EVENT_WAVE_CLEAR, EVENT_BATTLE_WIN, EVENT_BATTLE_LOSE } from '../battle/BattleFlow';
import { GridBuild } from '../battle/GridBuild';
import { SCENE_LOBBY } from './SceneManager';

const { ccclass, property } = _decorator;

@ccclass('BattleScene')
export class BattleScene extends Component {
    
    @property(BattleFlow)
    battleFlow: BattleFlow | null = null;
    
    @property(GridBuild)
    gridBuild: GridBuild | null = null;
    
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
    
    start() {
        console.log('[BattleScene] 战斗场景开始');
        
        this.setupEventListeners();
        this.setupButtons();
        
        // 初始化网格
        if (this.gridBuild) {
            this.gridBuild.initGrid();
        }
        
        // 创建占位美术
        this.createPlaceholderGraphics();
    }
    
    onDestroy() {
        this.removeEventListeners();
    }
    
    private setupEventListeners() {
        BattleEvents.on(EVENT_STATE_CHANGED, this.onBattleStateChanged, this);
        BattleEvents.on(EVENT_BATTLE_WIN, this.onBattleWin, this);
        BattleEvents.on(EVENT_BATTLE_LOSE, this.onBattleLose, this);
    }
    
    private removeEventListeners() {
        BattleEvents.off(EVENT_STATE_CHANGED, this.onBattleStateChanged, this);
        BattleEvents.off(EVENT_BATTLE_WIN, this.onBattleWin, this);
        BattleEvents.off(EVENT_BATTLE_LOSE, this.onBattleLose, this);
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
                this.tutorialLabel.string = '快速落子阶段 - 从底部拖拽建筑到格子';
                break;
            case BattleState.DeployTune:
                this.tutorialLabel.string = '微调阶段 - 调整布局或点击「开战」';
                break;
            case BattleState.Combat:
                this.tutorialLabel.string = '战斗中 - 点击屏幕控制主角朝向';
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
