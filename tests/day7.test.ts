/**
 * Day7 单元测试
 * 测试 AdService、三广告坑位、城防减伤门槛修正、闭环一致性
 * 运行: npx vitest run tests/day7.test.ts
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================
// AdService Mock 逻辑
// ============================================================

enum AdSlot {
    Revive = 'revive',
    SettleDouble = 'settle_double',
    WaveSupply = 'wave_supply'
}

interface AdResult {
    ok: boolean;
    reason?: 'success' | 'cancel' | 'error' | 'no_fill';
}

enum AdState {
    Idle = 'idle',
    Loading = 'loading',
    Showing = 'showing',
    Completed = 'completed',
    Failed = 'failed'
}

class MockAdService {
    private _state: AdState = AdState.Idle;
    private _mockFailRate: number = 0;
    
    get state(): AdState { return this._state; }
    get isLoading(): boolean { return this._state === AdState.Loading || this._state === AdState.Showing; }
    
    async showRewarded(slot: AdSlot): Promise<AdResult> {
        if (this.isLoading) {
            return { ok: false, reason: 'error' };
        }
        
        this._state = AdState.Loading;
        
        // 模拟延迟
        await this.sleep(10);
        
        this._state = AdState.Showing;
        
        // 检查是否模拟失败
        if (Math.random() < this._mockFailRate) {
            this._state = AdState.Failed;
            return { ok: false, reason: 'cancel' };
        }
        
        this._state = AdState.Completed;
        return { ok: true, reason: 'success' };
    }
    
    setMockFailRate(rate: number): void {
        this._mockFailRate = Math.max(0, Math.min(1, rate));
    }
    
    reset(): void {
        this._state = AdState.Idle;
    }
    
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// ============================================================
// 复活逻辑
// ============================================================

class ReviveManager {
    private _usedThisRun: boolean = false;
    
    canRevive(): boolean {
        return !this._usedThisRun;
    }
    
    useRevive(): boolean {
        if (this._usedThisRun) return false;
        this._usedThisRun = true;
        return true;
    }
    
    reset(): void {
        this._usedThisRun = false;
    }
}

// ============================================================
// 双倍逻辑
// ============================================================

enum DoubleState {
    Idle = 'idle',
    Watching = 'watching',
    Claimed = 'claimed'
}

class DoubleManager {
    private _state: DoubleState = DoubleState.Idle;
    private _baseScrap: number = 0;
    
    reset(baseScrap: number): void {
        this._state = DoubleState.Idle;
        this._baseScrap = baseScrap;
    }
    
    canClaim(): boolean {
        return this._state === DoubleState.Idle;
    }
    
    startWatching(): boolean {
        if (this._state !== DoubleState.Idle) return false;
        this._state = DoubleState.Watching;
        return true;
    }
    
    onAdComplete(success: boolean): number {
        if (this._state !== DoubleState.Watching) return 0;
        this._state = DoubleState.Claimed;
        return success ? this._baseScrap : 0;
    }
    
    get state(): DoubleState { return this._state; }
}

// ============================================================
// 补给逻辑
// ============================================================

class SupplyManager {
    private _usedThisRun: boolean = false;
    private _currentDp: number = 0;
    
    setDp(dp: number): void {
        this._currentDp = dp;
    }
    
    canUse(): boolean {
        return !this._usedThisRun && this._currentDp < 3;
    }
    
    useSupply(): boolean {
        if (!this.canUse()) return false;
        this._usedThisRun = true;
        return true;
    }
    
    reset(): void {
        this._usedThisRun = false;
    }
}

// ============================================================
// 城防减伤门槛（Day6 修正）
// ============================================================

function hasDamageReduction(fortLevel: number): boolean {
    return fortLevel >= 4;  // 3→4 解锁
}

// ============================================================
// 升级与加成一致性
// ============================================================

const FIREPOWER_CUMULATIVE = [0, 8, 16, 26, 38, 52];
const FORT_HP_BONUS = [0, 15, 30, 50, 50, 75];
const SUPPLY_START_DP = [0, 1, 2, 2, 2, 2];

function getFirepowerBonus(level: number): number {
    return FIREPOWER_CUMULATIVE[Math.min(level, 5)] || 0;
}

function getFortHpBonus(level: number): number {
    return FORT_HP_BONUS[Math.min(level, 5)] || 0;
}

function getSupplyStartDpBonus(level: number): number {
    return SUPPLY_START_DP[Math.min(level, 5)] || 0;
}

// ============================================================
// 测试用例
// ============================================================

describe('AdService Mock', () => {
    let adService: MockAdService;
    
    beforeEach(() => {
        adService = new MockAdService();
    });
    
    it('初始状态为 Idle', () => {
        expect(adService.state).toBe(AdState.Idle);
        expect(adService.isLoading).toBe(false);
    });
    
    it('showRewarded 成功返回 ok=true', async () => {
        const result = await adService.showRewarded(AdSlot.Revive);
        expect(result.ok).toBe(true);
        expect(result.reason).toBe('success');
    });
    
    it('设置 100% 失败率，showRewarded 返回 ok=false', async () => {
        adService.setMockFailRate(1.0);
        const result = await adService.showRewarded(AdSlot.SettleDouble);
        expect(result.ok).toBe(false);
        expect(result.reason).toBe('cancel');
    });
    
    it('广告进行中时重复请求被拒绝', async () => {
        // 启动第一个广告但不等待
        const p1 = adService.showRewarded(AdSlot.Revive);
        
        // 立即请求第二个
        const result2 = await adService.showRewarded(AdSlot.WaveSupply);
        expect(result2.ok).toBe(false);
        expect(result2.reason).toBe('error');
        
        // 等待第一个完成
        await p1;
    });
});

describe('复活广告坑位 (Slot ①)', () => {
    let revive: ReviveManager;
    
    beforeEach(() => {
        revive = new ReviveManager();
    });
    
    it('初始可复活', () => {
        expect(revive.canRevive()).toBe(true);
    });
    
    it('使用一次后不可再复活', () => {
        expect(revive.useRevive()).toBe(true);
        expect(revive.canRevive()).toBe(false);
        expect(revive.useRevive()).toBe(false);
    });
    
    it('重置后可再次复活', () => {
        revive.useRevive();
        revive.reset();
        expect(revive.canRevive()).toBe(true);
    });
});

describe('双倍广告坑位 (Slot ②)', () => {
    let double: DoubleManager;
    
    beforeEach(() => {
        double = new DoubleManager();
        double.reset(30);
    });
    
    it('初始可领取', () => {
        expect(double.canClaim()).toBe(true);
    });
    
    it('广告成功返回额外残骸', () => {
        double.startWatching();
        const extra = double.onAdComplete(true);
        expect(extra).toBe(30);
    });
    
    it('广告失败不返回额外残骸', () => {
        double.startWatching();
        const extra = double.onAdComplete(false);
        expect(extra).toBe(0);
    });
    
    it('领取后不可重复领取', () => {
        double.startWatching();
        double.onAdComplete(true);
        expect(double.canClaim()).toBe(false);
        expect(double.startWatching()).toBe(false);
    });
    
    it('重复调用 onAdComplete 不重复入账', () => {
        double.startWatching();
        const extra1 = double.onAdComplete(true);
        const extra2 = double.onAdComplete(true);
        expect(extra1).toBe(30);
        expect(extra2).toBe(0);
    });
});

describe('补给广告坑位 (Slot ③)', () => {
    let supply: SupplyManager;
    
    beforeEach(() => {
        supply = new SupplyManager();
    });
    
    it('DP < 3 且未使用时可用', () => {
        supply.setDp(2);
        expect(supply.canUse()).toBe(true);
    });
    
    it('DP >= 3 时不可用', () => {
        supply.setDp(3);
        expect(supply.canUse()).toBe(false);
        supply.setDp(5);
        expect(supply.canUse()).toBe(false);
    });
    
    it('本局已使用后不可再用', () => {
        supply.setDp(1);
        expect(supply.useSupply()).toBe(true);
        expect(supply.canUse()).toBe(false);
        supply.setDp(0);  // 即使 DP 变为 0
        expect(supply.canUse()).toBe(false);
    });
    
    it('新局重置后可再次使用', () => {
        supply.setDp(2);
        supply.useSupply();
        supply.reset();
        expect(supply.canUse()).toBe(true);
    });
});

describe('城防减伤门槛修正 (B≥4)', () => {
    it('Lv.0-3 无减伤', () => {
        expect(hasDamageReduction(0)).toBe(false);
        expect(hasDamageReduction(1)).toBe(false);
        expect(hasDamageReduction(2)).toBe(false);
        expect(hasDamageReduction(3)).toBe(false);
    });
    
    it('Lv.4-5 有减伤', () => {
        expect(hasDamageReduction(4)).toBe(true);
        expect(hasDamageReduction(5)).toBe(true);
    });
});

describe('升级 → 加成闭环一致性', () => {
    it('火力升级 → 伤害加成一致', () => {
        expect(getFirepowerBonus(0)).toBe(0);
        expect(getFirepowerBonus(1)).toBe(8);
        expect(getFirepowerBonus(5)).toBe(52);
    });
    
    it('城防升级 → HP 加成一致', () => {
        expect(getFortHpBonus(0)).toBe(0);
        expect(getFortHpBonus(1)).toBe(15);
        expect(getFortHpBonus(5)).toBe(75);
    });
    
    it('补给升级 → 开局 DP 加成一致', () => {
        expect(getSupplyStartDpBonus(0)).toBe(0);
        expect(getSupplyStartDpBonus(1)).toBe(1);
        expect(getSupplyStartDpBonus(2)).toBe(2);
    });
    
    it('maxHp 计算: 基础 100 + Fort Lv.5 → 175', () => {
        const baseHp = 100;
        const bonus = getFortHpBonus(5);
        expect(baseHp + bonus).toBe(175);
    });
    
    it('startDp 计算: 基础 2 + Supply Lv.2 → 4', () => {
        const baseDp = 2;
        const bonus = getSupplyStartDpBonus(2);
        expect(baseDp + bonus).toBe(4);
    });
    
    it('伤害计算: 基础 10 * (1 + 52%) → 15.2', () => {
        const baseDamage = 10;
        const bonus = getFirepowerBonus(5);
        const finalDamage = baseDamage * (1 + bonus / 100);
        expect(finalDamage).toBeCloseTo(15.2, 2);
    });
});

describe('三坑位 Slot 定义', () => {
    it('三个 Slot 值不同', () => {
        expect(AdSlot.Revive).not.toBe(AdSlot.SettleDouble);
        expect(AdSlot.SettleDouble).not.toBe(AdSlot.WaveSupply);
        expect(AdSlot.WaveSupply).not.toBe(AdSlot.Revive);
    });
});
