/**
 * BattleFlow.ts
 * 战斗流程状态机
 * 状态流转: DeployFast → DeployTune → Combat → WaveClear → (循环或 Settle)
 * Day4: 完善胜负判定、复活逻辑
 * Day6: 应用补给加成 (C线)
 */

import { _decorator, Component, Node, Label, EventTarget, director } from 'cc';
import { GameData, GameEvents, EVENT_HP_CHANGED } from '../data/GameData';
import { WaveConfig, WAVE_CONFIGS } from './WaveConfig';
import { MetaData } from '../data/MetaData';

const { ccclass, property } = _decorator;

// 战斗状态枚举
export enum BattleState {
    None = 'None',
    DeployFast = 'DeployFast',      // 快速落子阶段 (8s)
    DeployTune = 'DeployTune',      // 微调阶段 (4s)
    Combat = 'Combat',              // 战斗阶段
    WaveClear = 'WaveClear',        // 波次清除过渡
    Settle = 'Settle',              // 结算
    Paused = 'Paused',              // 暂停
    RevivePrompt = 'RevivePrompt'   // 复活提示
}

// 状态机事件
export const BattleEvents = new EventTarget();
export const EVENT_STATE_CHANGED = 'battle_state_changed';
export const EVENT_WAVE_START = 'wave_start';
export const EVENT_WAVE_CLEAR = 'wave_clear';
export const EVENT_BATTLE_WIN = 'battle_win';
export const EVENT_BATTLE_LOSE = 'battle_lose';
export const EVENT_SHOW_REVIVE = 'show_revive';  // 显示复活面板

@ccclass('BattleFlow')
export class BattleFlow extends Component {
    
    @property(Label)
    stateLabel: Label | null = null;
    
    @property(Label)
    timerLabel: Label | null = null;
    
    @property(Label)
    waveLabel: Label | null = null;
    
    @property(Label)
    hpLabel: Label | null = null;
    
    @property(Label)
    dpLabel: Label | null = null;
    
    // 当前状态
    private _state: BattleState = BattleState.None;
    private _previousState: BattleState = BattleState.None;
    
    // 计时器
    private _timer: number = 0;
    private _stateTime: number = 0;
    
    // 波次
    private _currentWave: number = 0;
    private _totalWaves: number = 6;  // W0-W5
    private _waveConfig: WaveConfig | null = null;
    
    // 战斗状态
    private _enemiesRemaining: number = 0;
    private _isRevived: boolean = false;  // 本关是否已复活
    
    // 配置常量
    private readonly DEPLOY_FAST_TIME = 8;  // 快落阶段时长
    private readonly DEPLOY_TUNE_TIME = 4;  // 微调阶段时长
    private readonly WAVE_CLEAR_TIME = 1.5; // 波次清除过渡时长
    
    get state(): BattleState { return this._state; }
    get currentWave(): number { return this._currentWave; }
    get timer(): number { return this._timer; }
    
    onLoad() {
        // 监听 HP 变化
        GameEvents.on(EVENT_HP_CHANGED, this.onHpChanged, this);
    }
    
    onDestroy() {
        GameEvents.off(EVENT_HP_CHANGED, this.onHpChanged, this);
    }
    
    start() {
        this.initBattle();
    }
    
    /**
     * 初始化战斗
     */
    initBattle() {
        console.log('[BattleFlow] 初始化战斗');
        
        // 重置游戏数据
        GameData.initBattle();
        
        this._currentWave = 0;
        this._isRevived = false;
        
        // 进入首波部署阶段
        this.startDeployPhase();
        
        this.updateUI();
    }
    
    /**
     * 切换状态
     */
    private changeState(newState: BattleState) {
        if (this._state === newState) return;
        
        this._previousState = this._state;
        this._state = newState;
        this._stateTime = 0;
        
        console.log(`[BattleFlow] 状态切换: ${this._previousState} → ${this._state}`);
        
        BattleEvents.emit(EVENT_STATE_CHANGED, this._state, this._previousState);
        
        this.updateUI();
    }
    
    /**
     * 开始部署阶段
     */
    startDeployPhase() {
        // 加载波次配置
        this._waveConfig = WAVE_CONFIGS[this._currentWave] || WAVE_CONFIGS[0];
        
        // 发放本波 DP
        if (this._waveConfig) {
            let dpGrant = this._waveConfig.dpGrant;
            
            // Day6: 补给线 C≥3 每波 DP +1
            if (GameData.hasWaveDpBonus()) {
                dpGrant += 1;
                console.log(`[BattleFlow] 补给加成: 每波 DP +1`);
            }
            
            GameData.addDP(dpGrant);
            console.log(`[BattleFlow] 波次 ${this._currentWave} 发放 DP: +${dpGrant}`);
        }
        
        // 计算快落时间
        let fastTime = this._currentWave === 0 ? 6 : this.DEPLOY_FAST_TIME;
        
        // Day6: 补给线 C≥4 DeployFast +1s
        if (GameData.hasDeployFastBonus()) {
            fastTime += 1;
            console.log(`[BattleFlow] 补给加成: DeployFast +1s`);
        }
        
        this._timer = fastTime;
        
        this.changeState(BattleState.DeployFast);
    }
    
    /**
     * 进入微调阶段
     */
    private enterDeployTune() {
        this._timer = this.DEPLOY_TUNE_TIME;
        this.changeState(BattleState.DeployTune);
    }
    
    /**
     * 开始战斗（手动点击「开战」或时间到）
     */
    startCombat() {
        if (this._state !== BattleState.DeployFast && this._state !== BattleState.DeployTune) {
            return;
        }
        
        // 设置敌人数量（从波次配置读取）
        if (this._waveConfig) {
            this._enemiesRemaining = this._waveConfig.getTotalEnemies();
        }
        
        this._timer = 0;  // 战斗阶段不使用倒计时
        
        BattleEvents.emit(EVENT_WAVE_START, this._currentWave);
        this.changeState(BattleState.Combat);
        
        console.log(`[BattleFlow] 战斗开始，波次 ${this._currentWave}，敌人数量: ${this._enemiesRemaining}`);
    }
    
    /**
     * 敌人被消灭时调用
     */
    onEnemyKilled() {
        this._enemiesRemaining--;
        console.log(`[BattleFlow] 敌人被消灭，剩余: ${this._enemiesRemaining}`);
        
        if (this._enemiesRemaining <= 0 && this._state === BattleState.Combat) {
            this.onWaveClear();
        }
    }
    
    /**
     * 波次清除
     */
    private onWaveClear() {
        console.log(`[BattleFlow] 波次 ${this._currentWave} 清除`);
        
        this._timer = this.WAVE_CLEAR_TIME;
        this.changeState(BattleState.WaveClear);
        
        BattleEvents.emit(EVENT_WAVE_CLEAR, this._currentWave);
    }
    
    /**
     * 处理波次清除后的逻辑
     */
    private processAfterWaveClear() {
        this._currentWave++;
        GameData.currentWave = this._currentWave;
        
        if (this._currentWave >= this._totalWaves) {
            // 所有波次完成，胜利
            this.onBattleWin();
        } else {
            // 进入下一波部署阶段
            this.startDeployPhase();
        }
    }
    
    /**
     * 战斗胜利
     */
    private onBattleWin() {
        console.log('[BattleFlow] 战斗胜利！');
        
        // 发放基础残骸奖励
        const baseScrap = 30;
        GameData.addScrap(baseScrap);
        
        this.changeState(BattleState.Settle);
        BattleEvents.emit(EVENT_BATTLE_WIN);
    }
    
    /**
     * HP 变化回调
     */
    private onHpChanged(hp: number, maxHp: number) {
        this.updateUI();
        
        if (hp <= 0 && this._state === BattleState.Combat) {
            this.onBattleLose();
        }
    }
    
    /**
     * 战斗失败
     */
    private onBattleLose() {
        console.log('[BattleFlow] 据点被摧毁！');
        
        if (!this._isRevived) {
            // 可以复活，显示复活面板
            console.log('[BattleFlow] 可使用复活广告');
            this.changeState(BattleState.RevivePrompt);
            BattleEvents.emit(EVENT_SHOW_REVIVE, true);  // true = 可复活
        } else {
            // 已用过复活，直接失败
            console.log('[BattleFlow] 已使用过复活，直接失败');
            this.changeState(BattleState.Settle);
            BattleEvents.emit(EVENT_BATTLE_LOSE);
        }
    }
    
    /**
     * 检查是否可以复活
     */
    canRevive(): boolean {
        return !this._isRevived;
    }
    
    /**
     * 复活（看完广告后调用）
     */
    revive() {
        if (this._isRevived) {
            console.log('[BattleFlow] 本关已复活过');
            return false;
        }
        
        this._isRevived = true;
        
        // 回复 50% HP
        GameData.hp = Math.floor(GameData.maxHp * 0.5);
        
        // 重置当前波的敌人计数
        if (this._waveConfig) {
            this._enemiesRemaining = this._waveConfig.getTotalEnemies();
        }
        
        console.log(`[BattleFlow] 复活成功，HP 恢复至 ${GameData.hp}，重打波次 ${this._currentWave}`);
        
        // 重新开始战斗（发出 WAVE_START 让 EnemyWave 重新生成敌人）
        this._timer = 0;
        BattleEvents.emit(EVENT_WAVE_START, this._currentWave);
        this.changeState(BattleState.Combat);
        
        return true;
    }
    
    /**
     * 放弃复活，直接失败结算
     */
    giveUpRevive() {
        console.log('[BattleFlow] 放弃复活');
        this.changeState(BattleState.Settle);
        BattleEvents.emit(EVENT_BATTLE_LOSE);
    }
    
    /**
     * 暂停/继续
     */
    togglePause() {
        if (this._state === BattleState.Paused) {
            this.changeState(this._previousState);
        } else if (this._state !== BattleState.Settle) {
            this.changeState(BattleState.Paused);
        }
    }
    
    update(dt: number) {
        if (this._state === BattleState.Paused || 
            this._state === BattleState.Settle ||
            this._state === BattleState.RevivePrompt) {
            return;
        }
        
        this._stateTime += dt;
        
        switch (this._state) {
            case BattleState.DeployFast:
                this._timer -= dt;
                if (this._timer <= 0) {
                    this.enterDeployTune();
                }
                break;
                
            case BattleState.DeployTune:
                this._timer -= dt;
                if (this._timer <= 0) {
                    this.startCombat();
                }
                break;
                
            case BattleState.Combat:
                // 战斗逻辑由其他系统处理
                // 这里可以更新战斗计时器显示
                this._timer += dt;
                break;
                
            case BattleState.WaveClear:
                this._timer -= dt;
                if (this._timer <= 0) {
                    this.processAfterWaveClear();
                }
                break;
        }
        
        this.updateUI();
    }
    
    /**
     * 更新 UI 显示
     */
    private updateUI() {
        // 状态显示
        if (this.stateLabel) {
            let stateText = this._state.toString();
            if (this._state === BattleState.DeployFast) {
                stateText = '快速落子';
            } else if (this._state === BattleState.DeployTune) {
                stateText = '微调确认';
            } else if (this._state === BattleState.Combat) {
                stateText = '战斗中';
            } else if (this._state === BattleState.WaveClear) {
                stateText = '波次清除';
            } else if (this._state === BattleState.Settle) {
                stateText = GameData.hp > 0 ? '胜利结算' : '失败结算';
            } else if (this._state === BattleState.Paused) {
                stateText = '暂停';
            } else if (this._state === BattleState.RevivePrompt) {
                stateText = '复活确认';
            }
            this.stateLabel.string = `状态: ${stateText}`;
        }
        
        // 计时器显示
        if (this.timerLabel) {
            if (this._state === BattleState.DeployFast || 
                this._state === BattleState.DeployTune ||
                this._state === BattleState.WaveClear) {
                this.timerLabel.string = `倒计时: ${Math.ceil(this._timer)}s`;
            } else if (this._state === BattleState.Combat) {
                this.timerLabel.string = `战斗: ${Math.floor(this._timer)}s`;
            } else {
                this.timerLabel.string = '';
            }
        }
        
        // 波次显示
        if (this.waveLabel) {
            this.waveLabel.string = `波次: ${this._currentWave + 1}/${this._totalWaves}`;
        }
        
        // HP 显示
        if (this.hpLabel) {
            this.hpLabel.string = `HP: ${GameData.hp}/${GameData.maxHp}`;
        }
        
        // DP 显示
        if (this.dpLabel) {
            this.dpLabel.string = `DP: ${GameData.dp}/${GameData.maxDp}`;
        }
    }
    
    // ========== 调试方法 ==========
    
    /**
     * 强制清除当前波（调试用）
     */
    debugClearWave() {
        if (this._state === BattleState.Combat) {
            this._enemiesRemaining = 0;
            this.onWaveClear();
        }
    }
    
    /**
     * 模拟敌人击杀
     */
    debugKillEnemy(count: number = 1) {
        for (let i = 0; i < count; i++) {
            this.onEnemyKilled();
        }
    }
}
