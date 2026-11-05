/**
 * GameData.ts
 * 游戏核心数据模型 - 据点 HP、DP、Scrap
 * 可序列化为 JSON，供存档/读档使用
 */

import { _decorator, Component, EventTarget } from 'cc';

// 事件总线，用于数据变化通知
export const GameEvents = new EventTarget();

// 事件名称常量
export const EVENT_HP_CHANGED = 'hp_changed';
export const EVENT_DP_CHANGED = 'dp_changed';
export const EVENT_SCRAP_CHANGED = 'scrap_changed';

/**
 * 据点数据接口
 */
export interface IBaseData {
    hp: number;           // 当前生命值
    maxHp: number;        // 最大生命值
    dp: number;           // 当前部署点
    maxDp: number;        // 部署点上限（防囤积）
    scrap: number;        // 残骸（局外货币）
}

/**
 * 三线成长数据接口
 */
export interface IProgressData {
    firepower: number;    // 火力线等级 (0-5)
    defense: number;      // 城防线等级 (0-5)
    supply: number;       // 补给线等级 (0-5)
}

/**
 * 完整存档数据接口
 */
export interface ISaveData {
    base: IBaseData;
    progress: IProgressData;
    currentWave: number;
    currentLevel: string;
}

/**
 * 游戏数据管理器 - 单例模式
 */
export class GameDataManager {
    private static _instance: GameDataManager | null = null;
    
    // 据点数据
    private _hp: number = 100;
    private _maxHp: number = 100;
    private _dp: number = 2;        // 开局 DP
    private _maxDp: number = 12;    // DP 囤积上限
    private _scrap: number = 0;
    
    // 三线成长
    private _progress: IProgressData = {
        firepower: 0,
        defense: 0,
        supply: 0
    };
    
    // 当前关卡状态
    private _currentWave: number = 0;
    private _currentLevel: string = 'L1-Tutorial';
    
    private constructor() {
        this.loadFromLocal();
    }
    
    public static get instance(): GameDataManager {
        if (!this._instance) {
            this._instance = new GameDataManager();
        }
        return this._instance;
    }
    
    // ========== HP 相关 ==========
    get hp(): number { return this._hp; }
    set hp(value: number) {
        const oldValue = this._hp;
        this._hp = Math.max(0, Math.min(value, this._maxHp));
        if (oldValue !== this._hp) {
            GameEvents.emit(EVENT_HP_CHANGED, this._hp, this._maxHp);
        }
    }
    
    get maxHp(): number { return this._maxHp; }
    set maxHp(value: number) {
        this._maxHp = Math.max(1, value);
        if (this._hp > this._maxHp) {
            this.hp = this._maxHp;
        }
    }
    
    get hpPercent(): number {
        return this._maxHp > 0 ? this._hp / this._maxHp : 0;
    }
    
    // ========== DP 相关 ==========
    get dp(): number { return this._dp; }
    set dp(value: number) {
        const oldValue = this._dp;
        this._dp = Math.max(0, Math.min(value, this._maxDp));
        if (oldValue !== this._dp) {
            GameEvents.emit(EVENT_DP_CHANGED, this._dp, this._maxDp);
        }
    }
    
    get maxDp(): number { return this._maxDp; }
    
    /**
     * 消耗 DP
     * @returns 是否成功消耗
     */
    consumeDP(amount: number): boolean {
        if (this._dp >= amount) {
            this.dp = this._dp - amount;
            return true;
        }
        return false;
    }
    
    /**
     * 增加 DP（受上限限制）
     */
    addDP(amount: number): void {
        this.dp = this._dp + amount;
    }
    
    // ========== Scrap 相关 ==========
    get scrap(): number { return this._scrap; }
    set scrap(value: number) {
        const oldValue = this._scrap;
        this._scrap = Math.max(0, value);
        if (oldValue !== this._scrap) {
            GameEvents.emit(EVENT_SCRAP_CHANGED, this._scrap);
        }
    }
    
    addScrap(amount: number): void {
        this.scrap = this._scrap + amount;
    }
    
    // ========== 三线成长 ==========
    get progress(): IProgressData {
        return { ...this._progress };
    }
    
    /**
     * 获取火力加成（百分比）
     */
    getFirepowerBonus(): number {
        const bonuses = [0, 8, 16, 26, 38, 52];
        return bonuses[this._progress.firepower] || 0;
    }
    
    /**
     * 获取额外 HP
     */
    getDefenseBonus(): number {
        const bonuses = [0, 15, 30, 50, 50, 75];
        return bonuses[this._progress.defense] || 0;
    }
    
    /**
     * 获取开局额外 DP
     */
    getSupplyBonus(): number {
        const bonuses = [0, 1, 2, 2, 2, 2];
        return bonuses[this._progress.supply] || 0;
    }
    
    // ========== 关卡状态 ==========
    get currentWave(): number { return this._currentWave; }
    set currentWave(value: number) { this._currentWave = value; }
    
    get currentLevel(): string { return this._currentLevel; }
    set currentLevel(value: string) { this._currentLevel = value; }
    
    // ========== 关卡初始化 ==========
    /**
     * 开始新关卡时重置战斗数据
     */
    initBattle(): void {
        // 应用城防加成
        this._maxHp = 100 + this.getDefenseBonus();
        this._hp = this._maxHp;
        
        // 应用补给加成
        this._dp = 2 + this.getSupplyBonus();
        
        this._currentWave = 0;
        
        GameEvents.emit(EVENT_HP_CHANGED, this._hp, this._maxHp);
        GameEvents.emit(EVENT_DP_CHANGED, this._dp, this._maxDp);
    }
    
    // ========== 序列化 ==========
    toJSON(): ISaveData {
        return {
            base: {
                hp: this._hp,
                maxHp: this._maxHp,
                dp: this._dp,
                maxDp: this._maxDp,
                scrap: this._scrap
            },
            progress: { ...this._progress },
            currentWave: this._currentWave,
            currentLevel: this._currentLevel
        };
    }
    
    fromJSON(data: ISaveData): void {
        if (data.base) {
            this._hp = data.base.hp ?? 100;
            this._maxHp = data.base.maxHp ?? 100;
            this._dp = data.base.dp ?? 2;
            this._maxDp = data.base.maxDp ?? 12;
            this._scrap = data.base.scrap ?? 0;
        }
        if (data.progress) {
            this._progress = { ...data.progress };
        }
        this._currentWave = data.currentWave ?? 0;
        this._currentLevel = data.currentLevel ?? 'L1-Tutorial';
    }
    
    // ========== 本地存储 ==========
    saveToLocal(): void {
        try {
            const data = JSON.stringify(this.toJSON());
            if (typeof wx !== 'undefined') {
                wx.setStorageSync('zombie_frontline_save', data);
            } else {
                localStorage.setItem('zombie_frontline_save', data);
            }
            console.log('[GameData] 存档成功');
        } catch (e) {
            console.error('[GameData] 存档失败:', e);
        }
    }
    
    loadFromLocal(): void {
        try {
            let data: string | null = null;
            if (typeof wx !== 'undefined') {
                data = wx.getStorageSync('zombie_frontline_save');
            } else if (typeof localStorage !== 'undefined') {
                data = localStorage.getItem('zombie_frontline_save');
            }
            if (data) {
                this.fromJSON(JSON.parse(data));
                console.log('[GameData] 读档成功');
            }
        } catch (e) {
            console.error('[GameData] 读档失败:', e);
        }
    }
    
    /**
     * 重置所有数据（调试用）
     */
    reset(): void {
        this._hp = 100;
        this._maxHp = 100;
        this._dp = 2;
        this._scrap = 0;
        this._progress = { firepower: 0, defense: 0, supply: 0 };
        this._currentWave = 0;
        this._currentLevel = 'L1-Tutorial';
    }
}

// 导出单例访问快捷方式
export const GameData = GameDataManager.instance;
