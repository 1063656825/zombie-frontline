/**
 * MetaData.ts
 * 三线成长 Meta 数据持久化层
 * Day6: Scrap余额、三线等级(0-5)持久化
 * WeChat/localStorage/内存兼容
 */

// ============================================================
// 升级配置表
// ============================================================

export enum UpgradeLine {
    Firepower = 'firepower',   // 火力线 A
    Fort = 'fort',             // 城防线 B
    Supply = 'supply'          // 补给线 C
}

export interface UpgradeCost {
    level: number;       // 当前等级
    costToNext: number;  // 升到下一级的费用
}

export const UPGRADE_COSTS: UpgradeCost[] = [
    { level: 0, costToNext: 20 },
    { level: 1, costToNext: 40 },
    { level: 2, costToNext: 80 },
    { level: 3, costToNext: 150 },
    { level: 4, costToNext: 250 },
    { level: 5, costToNext: 0 }  // 软上限，无法再升
];

export const MAX_LEVEL = 5;

export function getUpgradeCost(currentLevel: number): number {
    if (currentLevel >= MAX_LEVEL) return 0;
    return UPGRADE_COSTS[currentLevel]?.costToNext || 0;
}

// ============================================================
// 效果计算
// ============================================================

// Line A 火力: 累计伤害加成百分比
const FIREPOWER_CUMULATIVE = [0, 8, 16, 26, 38, 52];

// Line B 城防: 累计额外 HP
const FORT_HP_BONUS = [0, 15, 30, 50, 50, 75];

// Line C 补给: 开局额外 DP
const SUPPLY_START_DP = [0, 1, 2, 2, 2, 2];

export function getFirepowerBonus(level: number): number {
    return FIREPOWER_CUMULATIVE[Math.min(level, MAX_LEVEL)] || 0;
}

export function getFortHpBonus(level: number): number {
    return FORT_HP_BONUS[Math.min(level, MAX_LEVEL)] || 0;
}

export function getSupplyStartDpBonus(level: number): number {
    return SUPPLY_START_DP[Math.min(level, MAX_LEVEL)] || 0;
}

export function hasWaveDpBonus(supplyLevel: number): boolean {
    return supplyLevel >= 3;  // C≥3: 每波 DP +1
}

export function hasDeployFastBonus(supplyLevel: number): boolean {
    return supplyLevel >= 4;  // C≥4: DeployFast +1s
}

export function hasMergeRefundChance(supplyLevel: number): boolean {
    return supplyLevel >= 5;  // C=5: 合成 50% 返还 1 DP
}

export function rollMergeRefund(): boolean {
    return Math.random() < 0.5;
}

// Line B level 4: 3% damage reduction on hit (upgrade 3→4)
export function hasDamageReduction(fortLevel: number): boolean {
    return fortLevel >= 4;
}

export const DAMAGE_REDUCTION_PERCENT = 3;

// ============================================================
// 效果描述文本
// ============================================================

export function getFirepowerEffectText(level: number): string {
    if (level >= MAX_LEVEL) return '已满级';
    const texts = [
        '所有建筑伤害 +8%',
        '累计 +16%',
        '累计 +26%',
        '累计 +38%',
        '累计 +52%'
    ];
    return texts[level] || '';
}

export function getFortEffectText(level: number): string {
    if (level >= MAX_LEVEL) return '已满级';
    const texts = [
        '据点最大 HP +15',           // 0→1
        '累计 HP +30',               // 1→2
        '累计 HP +50',               // 2→3
        '受击减伤 3%',               // 3→4
        '累计 HP +75'                // 4→5
    ];
    return texts[level] || '';
}

export function getSupplyEffectText(level: number): string {
    if (level >= MAX_LEVEL) return '已满级';
    const texts = [
        '开局 DP +1',
        '累计开局 DP +2',
        '每波 DP 发放 +1',
        'DeployFast +1s',
        '合成 50% 返还 1 DP'
    ];
    return texts[level] || '';
}

// ============================================================
// 存储数据结构
// ============================================================

export interface IMetaSaveData {
    scrap: number;
    firepower: number;
    fort: number;
    supply: number;
    version: number;
}

const SAVE_KEY = 'zombie_frontline_meta_v1';
const CURRENT_VERSION = 1;

function createDefaultMeta(): IMetaSaveData {
    return {
        scrap: 0,
        firepower: 0,
        fort: 0,
        supply: 0,
        version: CURRENT_VERSION
    };
}

// ============================================================
// 存储抽象层
// ============================================================

interface IStorage {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
}

function getStorage(): IStorage {
    // WeChat 环境
    if (typeof wx !== 'undefined' && wx.getStorageSync) {
        return {
            getItem: (key: string) => {
                try {
                    return wx.getStorageSync(key) || null;
                } catch { return null; }
            },
            setItem: (key: string, value: string) => {
                try {
                    wx.setStorageSync(key, value);
                } catch (e) {
                    console.error('[MetaData] wx storage write failed:', e);
                }
            },
            removeItem: (key: string) => {
                try {
                    wx.removeStorageSync(key);
                } catch { }
            }
        };
    }
    
    // 浏览器 localStorage
    if (typeof localStorage !== 'undefined') {
        return localStorage;
    }
    
    // 内存回退
    const memoryStore: Record<string, string> = {};
    console.warn('[MetaData] Using in-memory storage fallback');
    return {
        getItem: (key: string) => memoryStore[key] || null,
        setItem: (key: string, value: string) => { memoryStore[key] = value; },
        removeItem: (key: string) => { delete memoryStore[key]; }
    };
}

// ============================================================
// MetaData 管理器
// ============================================================

class MetaDataManager {
    private static _instance: MetaDataManager | null = null;
    private _data: IMetaSaveData;
    private _storage: IStorage;
    
    private constructor() {
        this._storage = getStorage();
        this._data = this.load();
    }
    
    static get instance(): MetaDataManager {
        if (!this._instance) {
            this._instance = new MetaDataManager();
        }
        return this._instance;
    }
    
    // ========== 读取 ==========
    
    get scrap(): number { return this._data.scrap; }
    get firepowerLevel(): number { return this._data.firepower; }
    get fortLevel(): number { return this._data.fort; }
    get supplyLevel(): number { return this._data.supply; }
    
    // ========== 写入 (原子操作) ==========
    
    addScrap(amount: number): void {
        if (amount <= 0) return;
        this._data.scrap += amount;
        this.save();
        console.log(`[MetaData] Scrap +${amount}, 总计: ${this._data.scrap}`);
    }
    
    /**
     * 尝试升级指定线
     * @returns 是否成功
     */
    tryUpgrade(line: UpgradeLine): boolean {
        const levelKey = this.getLevelKey(line);
        const currentLevel = this._data[levelKey] as number;
        
        if (currentLevel >= MAX_LEVEL) {
            console.log(`[MetaData] ${line} 已达软上限`);
            return false;
        }
        
        const cost = getUpgradeCost(currentLevel);
        if (this._data.scrap < cost) {
            console.log(`[MetaData] Scrap 不足: 需要 ${cost}, 当前 ${this._data.scrap}`);
            return false;
        }
        
        // 扣除并升级 (原子)
        this._data.scrap -= cost;
        (this._data as any)[levelKey] = currentLevel + 1;
        this.save();
        
        console.log(`[MetaData] 升级 ${line}: Lv.${currentLevel} → Lv.${currentLevel + 1}, 消耗 ${cost}`);
        return true;
    }
    
    private getLevelKey(line: UpgradeLine): keyof IMetaSaveData {
        switch (line) {
            case UpgradeLine.Firepower: return 'firepower';
            case UpgradeLine.Fort: return 'fort';
            case UpgradeLine.Supply: return 'supply';
        }
    }
    
    // ========== 效果获取 ==========
    
    getFirepowerBonus(): number {
        return getFirepowerBonus(this._data.firepower);
    }
    
    getFortHpBonus(): number {
        return getFortHpBonus(this._data.fort);
    }
    
    getSupplyStartDpBonus(): number {
        return getSupplyStartDpBonus(this._data.supply);
    }
    
    hasWaveDpBonus(): boolean {
        return hasWaveDpBonus(this._data.supply);
    }
    
    hasDeployFastBonus(): boolean {
        return hasDeployFastBonus(this._data.supply);
    }
    
    hasMergeRefundChance(): boolean {
        return hasMergeRefundChance(this._data.supply);
    }
    
    hasDamageReduction(): boolean {
        return hasDamageReduction(this._data.fort);
    }
    
    // ========== 持久化 ==========
    
    private load(): IMetaSaveData {
        try {
            const raw = this._storage.getItem(SAVE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as IMetaSaveData;
                if (parsed.version === CURRENT_VERSION) {
                    console.log('[MetaData] 读档成功:', parsed);
                    return parsed;
                }
            }
        } catch (e) {
            console.error('[MetaData] 读档失败:', e);
        }
        return createDefaultMeta();
    }
    
    private save(): void {
        try {
            this._storage.setItem(SAVE_KEY, JSON.stringify(this._data));
        } catch (e) {
            console.error('[MetaData] 存档失败:', e);
        }
    }
    
    // ========== 调试 ==========
    
    reset(): void {
        this._data = createDefaultMeta();
        this.save();
        console.log('[MetaData] 已重置');
    }
    
    debugAddScrap(amount: number): void {
        this._data.scrap += amount;
        this.save();
        console.log(`[MetaData] DEBUG: Scrap +${amount}, 总计: ${this._data.scrap}`);
    }
    
    debugSetLevel(line: UpgradeLine, level: number): void {
        const levelKey = this.getLevelKey(line);
        (this._data as any)[levelKey] = Math.min(Math.max(0, level), MAX_LEVEL);
        this.save();
        console.log(`[MetaData] DEBUG: ${line} = Lv.${level}`);
    }
    
    toJSON(): IMetaSaveData {
        return { ...this._data };
    }
}

export const MetaData = MetaDataManager.instance;
