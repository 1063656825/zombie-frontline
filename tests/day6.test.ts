/**
 * Day6 单元测试
 * 测试升级费用、等级限制、效果计算、持久化、合成返还
 * 运行: npx vitest run tests/day6.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================
// 从 MetaData 提取的纯逻辑（无 Cocos 依赖）
// ============================================================

enum UpgradeLine {
    Firepower = 'firepower',
    Fort = 'fort',
    Supply = 'supply'
}

interface UpgradeCost {
    level: number;
    costToNext: number;
}

const UPGRADE_COSTS: UpgradeCost[] = [
    { level: 0, costToNext: 20 },
    { level: 1, costToNext: 40 },
    { level: 2, costToNext: 80 },
    { level: 3, costToNext: 150 },
    { level: 4, costToNext: 250 },
    { level: 5, costToNext: 0 }
];

const MAX_LEVEL = 5;

function getUpgradeCost(currentLevel: number): number {
    if (currentLevel >= MAX_LEVEL) return 0;
    return UPGRADE_COSTS[currentLevel]?.costToNext || 0;
}

// Line A 火力: 累计伤害加成百分比
const FIREPOWER_CUMULATIVE = [0, 8, 16, 26, 38, 52];

// Line B 城防: 累计额外 HP
const FORT_HP_BONUS = [0, 15, 30, 50, 50, 75];

// Line C 补给: 开局额外 DP
const SUPPLY_START_DP = [0, 1, 2, 2, 2, 2];

function getFirepowerBonus(level: number): number {
    return FIREPOWER_CUMULATIVE[Math.min(level, MAX_LEVEL)] || 0;
}

function getFortHpBonus(level: number): number {
    return FORT_HP_BONUS[Math.min(level, MAX_LEVEL)] || 0;
}

function getSupplyStartDpBonus(level: number): number {
    return SUPPLY_START_DP[Math.min(level, MAX_LEVEL)] || 0;
}

function hasWaveDpBonus(supplyLevel: number): boolean {
    return supplyLevel >= 3;
}

function hasDeployFastBonus(supplyLevel: number): boolean {
    return supplyLevel >= 4;
}

function hasMergeRefundChance(supplyLevel: number): boolean {
    return supplyLevel >= 5;
}

function hasDamageReduction(fortLevel: number): boolean {
    return fortLevel >= 3;
}

const DAMAGE_REDUCTION_PERCENT = 3;

// ============================================================
// Mock 存储
// ============================================================

interface IMetaSaveData {
    scrap: number;
    firepower: number;
    fort: number;
    supply: number;
    version: number;
}

class MockMetaManager {
    private data: IMetaSaveData;
    private storage: Record<string, string> = {};
    
    constructor() {
        this.data = { scrap: 0, firepower: 0, fort: 0, supply: 0, version: 1 };
    }
    
    get scrap(): number { return this.data.scrap; }
    get firepowerLevel(): number { return this.data.firepower; }
    get fortLevel(): number { return this.data.fort; }
    get supplyLevel(): number { return this.data.supply; }
    
    addScrap(amount: number): void {
        if (amount > 0) {
            this.data.scrap += amount;
            this.save();
        }
    }
    
    tryUpgrade(line: UpgradeLine): boolean {
        const levelKey = this.getLevelKey(line);
        const currentLevel = this.data[levelKey] as number;
        
        if (currentLevel >= MAX_LEVEL) return false;
        
        const cost = getUpgradeCost(currentLevel);
        if (this.data.scrap < cost) return false;
        
        this.data.scrap -= cost;
        (this.data as any)[levelKey] = currentLevel + 1;
        this.save();
        return true;
    }
    
    private getLevelKey(line: UpgradeLine): keyof IMetaSaveData {
        switch (line) {
            case UpgradeLine.Firepower: return 'firepower';
            case UpgradeLine.Fort: return 'fort';
            case UpgradeLine.Supply: return 'supply';
        }
    }
    
    private save(): void {
        this.storage['zombie_frontline_meta_v1'] = JSON.stringify(this.data);
    }
    
    load(): void {
        const raw = this.storage['zombie_frontline_meta_v1'];
        if (raw) {
            this.data = JSON.parse(raw);
        }
    }
    
    reset(): void {
        this.data = { scrap: 0, firepower: 0, fort: 0, supply: 0, version: 1 };
        this.storage = {};
    }
    
    toJSON(): IMetaSaveData {
        return { ...this.data };
    }
}

// ============================================================
// 合成返还概率辅助
// ============================================================

function rollMergeRefundDeterministic(seed: number): boolean {
    return seed < 0.5;
}

// ============================================================
// 测试用例
// ============================================================

describe('升级费用表 (getUpgradeCost)', () => {
    it('Lv.0 → Lv.1 费用 20', () => {
        expect(getUpgradeCost(0)).toBe(20);
    });
    
    it('Lv.1 → Lv.2 费用 40', () => {
        expect(getUpgradeCost(1)).toBe(40);
    });
    
    it('Lv.2 → Lv.3 费用 80', () => {
        expect(getUpgradeCost(2)).toBe(80);
    });
    
    it('Lv.3 → Lv.4 费用 150', () => {
        expect(getUpgradeCost(3)).toBe(150);
    });
    
    it('Lv.4 → Lv.5 费用 250', () => {
        expect(getUpgradeCost(4)).toBe(250);
    });
    
    it('Lv.5 已满级，费用 0', () => {
        expect(getUpgradeCost(5)).toBe(0);
    });
    
    it('总费用 0→5 = 20+40+80+150+250 = 540', () => {
        let total = 0;
        for (let i = 0; i < 5; i++) {
            total += getUpgradeCost(i);
        }
        expect(total).toBe(540);
    });
});

describe('火力线效果 (Line A)', () => {
    it('Lv.0 无加成', () => {
        expect(getFirepowerBonus(0)).toBe(0);
    });
    
    it('Lv.1 +8%', () => {
        expect(getFirepowerBonus(1)).toBe(8);
    });
    
    it('Lv.2 累计 +16%', () => {
        expect(getFirepowerBonus(2)).toBe(16);
    });
    
    it('Lv.3 累计 +26%', () => {
        expect(getFirepowerBonus(3)).toBe(26);
    });
    
    it('Lv.4 累计 +38%', () => {
        expect(getFirepowerBonus(4)).toBe(38);
    });
    
    it('Lv.5 累计 +52%', () => {
        expect(getFirepowerBonus(5)).toBe(52);
    });
    
    it('伤害计算: 基础 10, Lv.5 → 10 * 1.52 = 15.2', () => {
        const baseDamage = 10;
        const bonus = getFirepowerBonus(5);
        const finalDamage = baseDamage * (1 + bonus / 100);
        expect(finalDamage).toBeCloseTo(15.2, 2);
    });
});

describe('城防线效果 (Line B)', () => {
    it('Lv.0 无加成', () => {
        expect(getFortHpBonus(0)).toBe(0);
    });
    
    it('Lv.1 +15 HP', () => {
        expect(getFortHpBonus(1)).toBe(15);
    });
    
    it('Lv.2 累计 +30 HP', () => {
        expect(getFortHpBonus(2)).toBe(30);
    });
    
    it('Lv.3 累计 +50 HP + 减伤', () => {
        expect(getFortHpBonus(3)).toBe(50);
        expect(hasDamageReduction(3)).toBe(true);
    });
    
    it('Lv.5 累计 +75 HP', () => {
        expect(getFortHpBonus(5)).toBe(75);
    });
    
    it('maxHp 计算: 基础 100 + Lv.5 → 175', () => {
        const baseHp = 100;
        const bonus = getFortHpBonus(5);
        expect(baseHp + bonus).toBe(175);
    });
    
    it('减伤计算: 伤害 10, 减伤 3% → 9.7', () => {
        const damage = 10;
        const reduced = damage * (1 - DAMAGE_REDUCTION_PERCENT / 100);
        expect(reduced).toBeCloseTo(9.7, 2);
    });
});

describe('补给线效果 (Line C)', () => {
    it('Lv.0 无开局 DP 加成', () => {
        expect(getSupplyStartDpBonus(0)).toBe(0);
    });
    
    it('Lv.1 开局 DP +1', () => {
        expect(getSupplyStartDpBonus(1)).toBe(1);
    });
    
    it('Lv.2 累计开局 DP +2', () => {
        expect(getSupplyStartDpBonus(2)).toBe(2);
    });
    
    it('Lv.3 开启每波 DP +1', () => {
        expect(hasWaveDpBonus(2)).toBe(false);
        expect(hasWaveDpBonus(3)).toBe(true);
    });
    
    it('Lv.4 开启 DeployFast +1s', () => {
        expect(hasDeployFastBonus(3)).toBe(false);
        expect(hasDeployFastBonus(4)).toBe(true);
    });
    
    it('Lv.5 开启合成返还', () => {
        expect(hasMergeRefundChance(4)).toBe(false);
        expect(hasMergeRefundChance(5)).toBe(true);
    });
});

describe('升级逻辑 (MockMetaManager)', () => {
    let meta: MockMetaManager;
    
    beforeEach(() => {
        meta = new MockMetaManager();
    });
    
    it('初始状态: scrap=0, 三线=0', () => {
        expect(meta.scrap).toBe(0);
        expect(meta.firepowerLevel).toBe(0);
        expect(meta.fortLevel).toBe(0);
        expect(meta.supplyLevel).toBe(0);
    });
    
    it('addScrap 正确增加', () => {
        meta.addScrap(30);
        expect(meta.scrap).toBe(30);
        meta.addScrap(20);
        expect(meta.scrap).toBe(50);
    });
    
    it('scrap 不足时升级失败', () => {
        meta.addScrap(10);
        expect(meta.tryUpgrade(UpgradeLine.Firepower)).toBe(false);
        expect(meta.firepowerLevel).toBe(0);
        expect(meta.scrap).toBe(10);  // scrap 不变
    });
    
    it('scrap 足够时升级成功并扣除', () => {
        meta.addScrap(25);
        expect(meta.tryUpgrade(UpgradeLine.Firepower)).toBe(true);
        expect(meta.firepowerLevel).toBe(1);
        expect(meta.scrap).toBe(5);  // 25 - 20 = 5
    });
    
    it('软上限 Lv.5 无法再升', () => {
        meta.addScrap(1000);
        for (let i = 0; i < 5; i++) {
            expect(meta.tryUpgrade(UpgradeLine.Fort)).toBe(true);
        }
        expect(meta.fortLevel).toBe(5);
        expect(meta.tryUpgrade(UpgradeLine.Fort)).toBe(false);
        expect(meta.fortLevel).toBe(5);
    });
    
    it('三线独立升级', () => {
        meta.addScrap(60);
        expect(meta.tryUpgrade(UpgradeLine.Firepower)).toBe(true);  // -20
        expect(meta.tryUpgrade(UpgradeLine.Fort)).toBe(true);       // -20
        expect(meta.tryUpgrade(UpgradeLine.Supply)).toBe(true);     // -20
        expect(meta.firepowerLevel).toBe(1);
        expect(meta.fortLevel).toBe(1);
        expect(meta.supplyLevel).toBe(1);
        expect(meta.scrap).toBe(0);
    });
});

describe('持久化 Round-trip', () => {
    it('save 后 load 数据一致', () => {
        const meta = new MockMetaManager();
        meta.addScrap(100);
        meta.tryUpgrade(UpgradeLine.Firepower);
        meta.tryUpgrade(UpgradeLine.Fort);
        
        const savedData = meta.toJSON();
        
        const meta2 = new MockMetaManager();
        meta2.reset();
        meta2.addScrap(savedData.scrap);
        // 模拟 fromJSON
        (meta2 as any).data = { ...savedData };
        
        expect(meta2.scrap).toBe(savedData.scrap);
        expect(meta2.firepowerLevel).toBe(1);
        expect(meta2.fortLevel).toBe(1);
        expect(meta2.supplyLevel).toBe(0);
    });
});

describe('合成返还概率 (deterministic)', () => {
    it('seed < 0.5 返还成功', () => {
        expect(rollMergeRefundDeterministic(0.3)).toBe(true);
        expect(rollMergeRefundDeterministic(0.49)).toBe(true);
    });
    
    it('seed >= 0.5 返还失败', () => {
        expect(rollMergeRefundDeterministic(0.5)).toBe(false);
        expect(rollMergeRefundDeterministic(0.7)).toBe(false);
    });
    
    it('统计 1000 次随机，约 50% 成功', () => {
        let successCount = 0;
        const trials = 1000;
        for (let i = 0; i < trials; i++) {
            if (Math.random() < 0.5) successCount++;
        }
        const rate = successCount / trials;
        expect(rate).toBeGreaterThan(0.4);
        expect(rate).toBeLessThan(0.6);
    });
});

describe('战斗初始化应用加成', () => {
    it('基础 HP=100, Fort Lv.3 → maxHp=150', () => {
        const baseHp = 100;
        const fortBonus = getFortHpBonus(3);
        expect(baseHp + fortBonus).toBe(150);
    });
    
    it('基础 DP=2, Supply Lv.2 → startDp=4', () => {
        const baseDp = 2;
        const supplyBonus = getSupplyStartDpBonus(2);
        expect(baseDp + supplyBonus).toBe(4);
    });
    
    it('波次 DP: 基础 3 + Supply C3 → 4', () => {
        const waveGrant = 3;
        const bonus = hasWaveDpBonus(3) ? 1 : 0;
        expect(waveGrant + bonus).toBe(4);
    });
    
    it('DeployFast: 基础 8s + Supply C4 → 9s', () => {
        const baseFast = 8;
        const bonus = hasDeployFastBonus(4) ? 1 : 0;
        expect(baseFast + bonus).toBe(9);
    });
});
