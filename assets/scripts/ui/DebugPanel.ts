/**
 * DebugPanel.ts
 * 调试面板
 * 用于 Day1 验证状态机流转
 */

import { _decorator, Component, Node, Label, Button } from 'cc';
import { BattleFlow, BattleState, BattleEvents, EVENT_STATE_CHANGED } from '../battle/BattleFlow';
import { GameData, GameEvents, EVENT_HP_CHANGED, EVENT_DP_CHANGED } from '../data/GameData';

const { ccclass, property } = _decorator;

@ccclass('DebugPanel')
export class DebugPanel extends Component {
    
    @property(BattleFlow)
    battleFlow: BattleFlow | null = null;
    
    @property(Label)
    logLabel: Label | null = null;
    
    private _logs: string[] = [];
    private readonly MAX_LOGS = 10;
    
    start() {
        this.setupEventListeners();
        this.log('调试面板启动');
    }
    
    onDestroy() {
        BattleEvents.off(EVENT_STATE_CHANGED, this.onStateChanged, this);
        GameEvents.off(EVENT_HP_CHANGED, this.onHpChanged, this);
        GameEvents.off(EVENT_DP_CHANGED, this.onDpChanged, this);
    }
    
    private setupEventListeners() {
        BattleEvents.on(EVENT_STATE_CHANGED, this.onStateChanged, this);
        GameEvents.on(EVENT_HP_CHANGED, this.onHpChanged, this);
        GameEvents.on(EVENT_DP_CHANGED, this.onDpChanged, this);
    }
    
    private onStateChanged(newState: BattleState, oldState: BattleState) {
        this.log(`状态: ${oldState} → ${newState}`);
    }
    
    private onHpChanged(hp: number, maxHp: number) {
        this.log(`HP: ${hp}/${maxHp}`);
    }
    
    private onDpChanged(dp: number, maxDp: number) {
        this.log(`DP: ${dp}/${maxDp}`);
    }
    
    /**
     * 添加日志
     */
    log(message: string) {
        const timestamp = new Date().toLocaleTimeString();
        this._logs.push(`[${timestamp}] ${message}`);
        
        if (this._logs.length > this.MAX_LOGS) {
            this._logs.shift();
        }
        
        this.updateLogDisplay();
        console.log(`[Debug] ${message}`);
    }
    
    private updateLogDisplay() {
        if (this.logLabel) {
            this.logLabel.string = this._logs.join('\n');
        }
    }
    
    // ========== 调试按钮回调 ==========
    
    /**
     * 强制进入战斗
     */
    onForceStartCombat() {
        if (this.battleFlow) {
            this.battleFlow.startCombat();
            this.log('强制开始战斗');
        }
    }
    
    /**
     * 强制清波
     */
    onForceClearWave() {
        if (this.battleFlow) {
            this.battleFlow.debugClearWave();
            this.log('强制清波');
        }
    }
    
    /**
     * 模拟击杀敌人
     */
    onKillEnemy() {
        if (this.battleFlow) {
            this.battleFlow.debugKillEnemy(1);
            this.log('模拟击杀 1 敌人');
        }
    }
    
    /**
     * 模拟据点受伤
     */
    onDamageBase() {
        GameData.hp -= 20;
        this.log('据点受伤 -20 HP');
    }
    
    /**
     * 增加 DP
     */
    onAddDP() {
        GameData.addDP(3);
        this.log('增加 +3 DP');
    }
    
    /**
     * 重置战斗
     */
    onResetBattle() {
        if (this.battleFlow) {
            this.battleFlow.initBattle();
            this.log('重置战斗');
        }
    }
}
