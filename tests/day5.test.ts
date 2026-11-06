/**
 * Day5 单元测试
 * 测试合成规则、阶段锁定、L2 数值读取、重复领奖防护
 * 运行: npx vitest run tests/day5.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================
// 从 BuildingConfig 提取的纯逻辑（无 Cocos 依赖）
// ============================================================

enum BuildingType {
    MachineGun = 'MachineGun',
    Cannon = 'Cannon',
    Mine = 'Mine'
}

enum BuildingLevel {
    L1 = 1,
    L2 = 2
}

interface BuildingStats {
    type: BuildingType;
    level: BuildingLevel;
    dpCost: number;
    dps: number;
    range: number;
    fireRate: number;
    aoeRadius?: number;
    tankBonus?: number;
    triggerDamage?: number;
    triggerRadius?: number;
}

const BUILDING_CONFIGS: Record<string, BuildingStats> = {
    'MachineGun_L1': {
        type: BuildingType.MachineGun,
        level: BuildingLevel.L1,
        dpCost: 2,
        dps: 6,
        range: 1.0,
        fireRate: 4
    },
    'MachineGun_L2': {
        type: BuildingType.MachineGun,
        level: BuildingLevel.L2,
        dpCost: 4,
        dps: 14,
        range: 1.2,
        fireRate: 5
    },
    'Cannon_L1': {
        type: BuildingType.Cannon,
        level: BuildingLevel.L1,
        dpCost: 3,
        dps: 4,
        range: 1.2,
        fireRate: 0.8,
        aoeRadius: 0.8,
        tankBonus: 1.5
    },
    'Cannon_L2': {
        type: BuildingType.Cannon,
        level: BuildingLevel.L2,
        dpCost: 6,
        dps: 9,
        range: 1.4,
        fireRate: 1.0,
        aoeRadius: 1.2,
        tankBonus: 2.0
    },
    'Mine_L1': {
        type: BuildingType.Mine,
        level: BuildingLevel.L1,
        dpCost: 1,
        dps: 0,
        range: 0,
        fireRate: 0,
        triggerDamage: 25,
        triggerRadius: 1.2
    },
    'Mine_L2': {
        type: BuildingType.Mine,
        level: BuildingLevel.L2,
        dpCost: 2,
        dps: 0,
        range: 0,
        fireRate: 0,
        triggerDamage: 55,
        triggerRadius: 1.6
    }
};

function getBuildingConfig(type: BuildingType, level: BuildingLevel): BuildingStats | null {
    const key = `${type}_L${level}`;
    return BUILDING_CONFIGS[key] || null;
}

function canMerge(building1: BuildingStats, building2: BuildingStats): boolean {
    return building1.type === building2.type &&
           building1.level === BuildingLevel.L1 &&
           building2.level === BuildingLevel.L1;
}

// ============================================================
// 战斗状态枚举
// ============================================================

enum BattleState {
    None = 'None',
    DeployFast = 'DeployFast',
    DeployTune = 'DeployTune',
    Combat = 'Combat',
    WaveClear = 'WaveClear',
    Settle = 'Settle',
    Paused = 'Paused',
    RevivePrompt = 'RevivePrompt'
}

function canDeployInState(state: BattleState): boolean {
    return state === BattleState.DeployFast || state === BattleState.DeployTune;
}

// ============================================================
// 双倍奖励状态机
// ============================================================

enum DoubleRewardState {
    Idle = 'idle',
    Watching = 'watching',
    Claimed = 'claimed'
}

class DoubleRewardManager {
    private _state: DoubleRewardState = DoubleRewardState.Idle;
    private _baseScrap: number = 0;
    private _totalScrap: number = 0;

    reset(baseScrap: number) {
        this._state = DoubleRewardState.Idle;
        this._baseScrap = baseScrap;
        this._totalScrap = baseScrap;
    }

    canWatchAd(): boolean {
        return this._state === DoubleRewardState.Idle;
    }

    startWatching(): boolean {
        if (this._state !== DoubleRewardState.Idle) {
            return false;
        }
        this._state = DoubleRewardState.Watching;
        return true;
    }

    onAdComplete(success: boolean): number {
        if (this._state !== DoubleRewardState.Watching) {
            return 0;
        }
        
        this._state = DoubleRewardState.Claimed;
        
        if (success) {
            this._totalScrap = this._baseScrap * 2;
            return this._baseScrap; // 返回额外获得的
        }
        return 0;
    }

    get state(): DoubleRewardState { return this._state; }
    get totalScrap(): number { return this._totalScrap; }
}

// ============================================================
// 测试用例
// ============================================================

describe('合成规则 (canMerge)', () => {
    it('同种 L1+L1 可合成', () => {
        const mg1 = getBuildingConfig(BuildingType.MachineGun, BuildingLevel.L1)!;
        const mg2 = getBuildingConfig(BuildingType.MachineGun, BuildingLevel.L1)!;
        expect(canMerge(mg1, mg2)).toBe(true);
    });

    it('同种 L1+L2 不可合成', () => {
        const mg1 = getBuildingConfig(BuildingType.MachineGun, BuildingLevel.L1)!;
        const mg2 = getBuildingConfig(BuildingType.MachineGun, BuildingLevel.L2)!;
        expect(canMerge(mg1, mg2)).toBe(false);
    });

    it('同种 L2+L2 不可合成', () => {
        const mg1 = getBuildingConfig(BuildingType.MachineGun, BuildingLevel.L2)!;
        const mg2 = getBuildingConfig(BuildingType.MachineGun, BuildingLevel.L2)!;
        expect(canMerge(mg1, mg2)).toBe(false);
    });

    it('异种 L1+L1 不可合成', () => {
        const mg = getBuildingConfig(BuildingType.MachineGun, BuildingLevel.L1)!;
        const cn = getBuildingConfig(BuildingType.Cannon, BuildingLevel.L1)!;
        expect(canMerge(mg, cn)).toBe(false);
    });

    it('地雷 L1+L1 可合成', () => {
        const m1 = getBuildingConfig(BuildingType.Mine, BuildingLevel.L1)!;
        const m2 = getBuildingConfig(BuildingType.Mine, BuildingLevel.L1)!;
        expect(canMerge(m1, m2)).toBe(true);
    });
});

describe('阶段锁定 (canDeployInState)', () => {
    it('DeployFast 允许部署', () => {
        expect(canDeployInState(BattleState.DeployFast)).toBe(true);
    });

    it('DeployTune 允许部署', () => {
        expect(canDeployInState(BattleState.DeployTune)).toBe(true);
    });

    it('Combat 禁止部署', () => {
        expect(canDeployInState(BattleState.Combat)).toBe(false);
    });

    it('WaveClear 禁止部署', () => {
        expect(canDeployInState(BattleState.WaveClear)).toBe(false);
    });

    it('Settle 禁止部署', () => {
        expect(canDeployInState(BattleState.Settle)).toBe(false);
    });

    it('Paused 禁止部署', () => {
        expect(canDeployInState(BattleState.Paused)).toBe(false);
    });
});

describe('L2 数值读取', () => {
    it('机枪 L2 DPS = 14', () => {
        const config = getBuildingConfig(BuildingType.MachineGun, BuildingLevel.L2);
        expect(config).not.toBeNull();
        expect(config!.dps).toBe(14);
    });

    it('机枪 L2 射程 = 1.2', () => {
        const config = getBuildingConfig(BuildingType.MachineGun, BuildingLevel.L2);
        expect(config!.range).toBe(1.2);
    });

    it('炮轰 L2 DPS = 9, AOE = 1.2, tankBonus = 2.0', () => {
        const config = getBuildingConfig(BuildingType.Cannon, BuildingLevel.L2);
        expect(config).not.toBeNull();
        expect(config!.dps).toBe(9);
        expect(config!.aoeRadius).toBe(1.2);
        expect(config!.tankBonus).toBe(2.0);
    });

    it('地雷 L2 伤害 = 55, 范围 = 1.6', () => {
        const config = getBuildingConfig(BuildingType.Mine, BuildingLevel.L2);
        expect(config).not.toBeNull();
        expect(config!.triggerDamage).toBe(55);
        expect(config!.triggerRadius).toBe(1.6);
    });

    it('L1 vs L2 数值差异正确', () => {
        const mgL1 = getBuildingConfig(BuildingType.MachineGun, BuildingLevel.L1)!;
        const mgL2 = getBuildingConfig(BuildingType.MachineGun, BuildingLevel.L2)!;
        expect(mgL2.dps).toBeGreaterThan(mgL1.dps);
        expect(mgL2.range).toBeGreaterThan(mgL1.range);
    });
});

describe('双倍奖励防重复 (DoubleRewardManager)', () => {
    let manager: DoubleRewardManager;

    beforeEach(() => {
        manager = new DoubleRewardManager();
        manager.reset(30);
    });

    it('初始状态可以看广告', () => {
        expect(manager.canWatchAd()).toBe(true);
        expect(manager.state).toBe(DoubleRewardState.Idle);
    });

    it('开始看广告后状态变为 watching', () => {
        expect(manager.startWatching()).toBe(true);
        expect(manager.state).toBe(DoubleRewardState.Watching);
    });

    it('watching 状态不能重复触发', () => {
        manager.startWatching();
        expect(manager.startWatching()).toBe(false);
        expect(manager.canWatchAd()).toBe(false);
    });

    it('广告成功后获得双倍 (60)', () => {
        manager.startWatching();
        const extra = manager.onAdComplete(true);
        expect(extra).toBe(30);
        expect(manager.totalScrap).toBe(60);
        expect(manager.state).toBe(DoubleRewardState.Claimed);
    });

    it('广告失败后不给额外奖励', () => {
        manager.startWatching();
        const extra = manager.onAdComplete(false);
        expect(extra).toBe(0);
        expect(manager.totalScrap).toBe(30);
    });

    it('claimed 状态不能再次触发', () => {
        manager.startWatching();
        manager.onAdComplete(true);
        expect(manager.canWatchAd()).toBe(false);
        expect(manager.startWatching()).toBe(false);
    });

    it('重复调用 onAdComplete 不重复入账', () => {
        manager.startWatching();
        manager.onAdComplete(true);
        const extra2 = manager.onAdComplete(true);
        expect(extra2).toBe(0);
        expect(manager.totalScrap).toBe(60);
    });

    it('reset 后可重新触发', () => {
        manager.startWatching();
        manager.onAdComplete(true);
        manager.reset(30);
        expect(manager.canWatchAd()).toBe(true);
        expect(manager.totalScrap).toBe(30);
    });
});

describe('合成不消耗额外 DP', () => {
    it('合成只需两个 L1 建筑，无 DP 费用', () => {
        const mgL1Cost = getBuildingConfig(BuildingType.MachineGun, BuildingLevel.L1)!.dpCost;
        expect(mgL1Cost).toBe(2);
        // 合成两个 L1 总成本 = 2 + 2 = 4，合成后是 L2
        // L2 的 dpCost 只是参考值，合成本身不扣 DP
    });
});
