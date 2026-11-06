/**
 * Day10 单元测试
 * 测试配置不变性、难度曲线、DPS vs HP sanity check
 * 运行: npx vitest run tests/day10.test.ts
 */

import { describe, it, expect } from 'vitest';

// ============================================================
// 配置镜像（从实际配置复制）
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
    penetration?: number;
    triggerDamage?: number;
    triggerRadius?: number;
}

// Day10 调整后的建筑配置
const BUILDING_CONFIGS: Record<string, BuildingStats> = {
    'MachineGun_L1': { type: BuildingType.MachineGun, level: BuildingLevel.L1, dpCost: 2, dps: 7, range: 1.0, fireRate: 4 },
    'MachineGun_L2': { type: BuildingType.MachineGun, level: BuildingLevel.L2, dpCost: 4, dps: 15, range: 1.2, fireRate: 5, penetration: 1 },
    'Cannon_L1': { type: BuildingType.Cannon, level: BuildingLevel.L1, dpCost: 3, dps: 4, range: 1.2, fireRate: 0.8, aoeRadius: 0.8, tankBonus: 1.6 },
    'Cannon_L2': { type: BuildingType.Cannon, level: BuildingLevel.L2, dpCost: 6, dps: 10, range: 1.4, fireRate: 1.0, aoeRadius: 1.2, tankBonus: 2.2 },
    'Mine_L1': { type: BuildingType.Mine, level: BuildingLevel.L1, dpCost: 1, dps: 0, range: 0, fireRate: 0, triggerDamage: 28, triggerRadius: 1.2 },
    'Mine_L2': { type: BuildingType.Mine, level: BuildingLevel.L2, dpCost: 2, dps: 0, range: 0, fireRate: 0, triggerDamage: 60, triggerRadius: 1.6 }
};

// 敌人配置
enum EnemyType {
    Z1_Walker = 'Z1',
    Z2_Runner = 'Z2',
    Z3_Tank = 'Z3'
}

const ENEMY_STATS = {
    [EnemyType.Z1_Walker]: { hp: 10, speed: 1.0, damage: 5 },
    [EnemyType.Z2_Runner]: { hp: 8, speed: 1.7, damage: 5 },
    [EnemyType.Z3_Tank]: { hp: 50, speed: 0.67, damage: 15 }
};

// 波次配置（Day10 调整后）
interface EnemySpawn { type: EnemyType; count: number; delay?: number; interval?: number; }
interface WaveConfig { wave: number; dpGrant: number; enemies: EnemySpawn[]; }

const L1_WAVES: WaveConfig[] = [
    { wave: 0, dpGrant: 3, enemies: [{ type: EnemyType.Z1_Walker, count: 6 }] },
    { wave: 1, dpGrant: 3, enemies: [{ type: EnemyType.Z1_Walker, count: 10 }] },
    { wave: 2, dpGrant: 4, enemies: [{ type: EnemyType.Z1_Walker, count: 8 }, { type: EnemyType.Z2_Runner, count: 3 }] },
    { wave: 3, dpGrant: 4, enemies: [{ type: EnemyType.Z1_Walker, count: 10 }, { type: EnemyType.Z2_Runner, count: 5 }] },
    { wave: 4, dpGrant: 4, enemies: [{ type: EnemyType.Z1_Walker, count: 12 }, { type: EnemyType.Z2_Runner, count: 6 }, { type: EnemyType.Z3_Tank, count: 2 }] },
    { wave: 5, dpGrant: 6, enemies: [{ type: EnemyType.Z1_Walker, count: 15 }, { type: EnemyType.Z2_Runner, count: 10 }, { type: EnemyType.Z3_Tank, count: 4 }] }
];

const L2_WAVES: WaveConfig[] = [
    { wave: 0, dpGrant: 3, enemies: [{ type: EnemyType.Z1_Walker, count: 8 }, { type: EnemyType.Z2_Runner, count: 2 }] },
    { wave: 1, dpGrant: 3, enemies: [{ type: EnemyType.Z1_Walker, count: 10 }, { type: EnemyType.Z2_Runner, count: 5 }] },
    { wave: 2, dpGrant: 4, enemies: [{ type: EnemyType.Z1_Walker, count: 10 }, { type: EnemyType.Z2_Runner, count: 5 }, { type: EnemyType.Z3_Tank, count: 1 }] },
    { wave: 3, dpGrant: 3, enemies: [{ type: EnemyType.Z1_Walker, count: 12 }, { type: EnemyType.Z2_Runner, count: 7 }, { type: EnemyType.Z3_Tank, count: 2 }] },
    { wave: 4, dpGrant: 5, enemies: [{ type: EnemyType.Z1_Walker, count: 14 }, { type: EnemyType.Z2_Runner, count: 9 }, { type: EnemyType.Z3_Tank, count: 3 }] },
    { wave: 5, dpGrant: 5, enemies: [{ type: EnemyType.Z1_Walker, count: 18 }, { type: EnemyType.Z2_Runner, count: 13 }, { type: EnemyType.Z3_Tank, count: 5 }] }
];

// ============================================================
// 辅助函数
// ============================================================

function getWaveHp(wave: WaveConfig): number {
    return wave.enemies.reduce((sum, spawn) => {
        return sum + spawn.count * ENEMY_STATS[spawn.type].hp;
    }, 0);
}

function getWaveEnemyCount(wave: WaveConfig): number {
    return wave.enemies.reduce((sum, spawn) => sum + spawn.count, 0);
}

function getLevelTotalHp(waves: WaveConfig[]): number {
    return waves.reduce((sum, wave) => sum + getWaveHp(wave), 0);
}

function getLevelTotalEnemies(waves: WaveConfig[]): number {
    return waves.reduce((sum, wave) => sum + getWaveEnemyCount(wave), 0);
}

function getLevelTotalDp(waves: WaveConfig[]): number {
    return waves.reduce((sum, wave) => sum + wave.dpGrant, 0);
}

function countEnemyType(waves: WaveConfig[], type: EnemyType): number {
    return waves.reduce((sum, wave) => {
        return sum + wave.enemies.filter(e => e.type === type).reduce((s, e) => s + e.count, 0);
    }, 0);
}

// ============================================================
// 测试用例
// ============================================================

describe('建筑配置不变性', () => {
    it('所有建筑 dpCost > 0', () => {
        for (const [key, config] of Object.entries(BUILDING_CONFIGS)) {
            expect(config.dpCost, `${key} dpCost`).toBeGreaterThan(0);
        }
    });
    
    it('所有建筑 dps >= 0 (Mine dps=0 合法)', () => {
        for (const [key, config] of Object.entries(BUILDING_CONFIGS)) {
            expect(config.dps, `${key} dps`).toBeGreaterThanOrEqual(0);
            expect(Number.isNaN(config.dps), `${key} dps isNaN`).toBe(false);
        }
    });
    
    it('所有建筑 range >= 0', () => {
        for (const [key, config] of Object.entries(BUILDING_CONFIGS)) {
            expect(config.range, `${key} range`).toBeGreaterThanOrEqual(0);
        }
    });
    
    it('所有建筑 fireRate >= 0', () => {
        for (const [key, config] of Object.entries(BUILDING_CONFIGS)) {
            expect(config.fireRate, `${key} fireRate`).toBeGreaterThanOrEqual(0);
        }
    });
    
    it('tankBonus 存在时 > 1', () => {
        for (const [key, config] of Object.entries(BUILDING_CONFIGS)) {
            if (config.tankBonus !== undefined) {
                expect(config.tankBonus, `${key} tankBonus`).toBeGreaterThan(1);
            }
        }
    });
    
    it('triggerDamage 存在时 > 0', () => {
        for (const [key, config] of Object.entries(BUILDING_CONFIGS)) {
            if (config.triggerDamage !== undefined) {
                expect(config.triggerDamage, `${key} triggerDamage`).toBeGreaterThan(0);
            }
        }
    });
});

describe('建筑 DPS 排序', () => {
    it('MG L2 DPS > MG L1 DPS', () => {
        expect(BUILDING_CONFIGS['MachineGun_L2'].dps).toBeGreaterThan(BUILDING_CONFIGS['MachineGun_L1'].dps);
    });
    
    it('Cannon L2 DPS > Cannon L1 DPS', () => {
        expect(BUILDING_CONFIGS['Cannon_L2'].dps).toBeGreaterThan(BUILDING_CONFIGS['Cannon_L1'].dps);
    });
    
    it('Mine L2 triggerDamage > Mine L1 triggerDamage', () => {
        expect(BUILDING_CONFIGS['Mine_L2'].triggerDamage).toBeGreaterThan(BUILDING_CONFIGS['Mine_L1'].triggerDamage!);
    });
    
    it('MG DPS > Cannon DPS (单体)', () => {
        expect(BUILDING_CONFIGS['MachineGun_L1'].dps).toBeGreaterThan(BUILDING_CONFIGS['Cannon_L1'].dps);
    });
});

describe('建筑成本效率', () => {
    it('MG L1 DPS/DP > 3', () => {
        const eff = BUILDING_CONFIGS['MachineGun_L1'].dps / BUILDING_CONFIGS['MachineGun_L1'].dpCost;
        expect(eff).toBeGreaterThan(3);  // 7/2 = 3.5
    });
    
    it('Mine 是最便宜的建筑', () => {
        const costs = Object.values(BUILDING_CONFIGS).map(c => c.dpCost);
        const mineCost = BUILDING_CONFIGS['Mine_L1'].dpCost;
        expect(mineCost).toBe(Math.min(...costs));
    });
    
    it('L2 建筑成本 > L1 同类型', () => {
        expect(BUILDING_CONFIGS['MachineGun_L2'].dpCost).toBeGreaterThan(BUILDING_CONFIGS['MachineGun_L1'].dpCost);
        expect(BUILDING_CONFIGS['Cannon_L2'].dpCost).toBeGreaterThan(BUILDING_CONFIGS['Cannon_L1'].dpCost);
        expect(BUILDING_CONFIGS['Mine_L2'].dpCost).toBeGreaterThan(BUILDING_CONFIGS['Mine_L1'].dpCost);
    });
});

describe('敌人配置不变性', () => {
    it('所有敌人 HP > 0', () => {
        for (const [type, stats] of Object.entries(ENEMY_STATS)) {
            expect(stats.hp, `${type} hp`).toBeGreaterThan(0);
        }
    });
    
    it('所有敌人 speed > 0', () => {
        for (const [type, stats] of Object.entries(ENEMY_STATS)) {
            expect(stats.speed, `${type} speed`).toBeGreaterThan(0);
        }
    });
    
    it('Z3 HP > Z1 HP (胖尸更肉)', () => {
        expect(ENEMY_STATS[EnemyType.Z3_Tank].hp).toBeGreaterThan(ENEMY_STATS[EnemyType.Z1_Walker].hp);
    });
    
    it('Z2 speed > Z1 speed (快跑尸更快)', () => {
        expect(ENEMY_STATS[EnemyType.Z2_Runner].speed).toBeGreaterThan(ENEMY_STATS[EnemyType.Z1_Walker].speed);
    });
});

describe('波次配置不变性', () => {
    it('L1 有 6 波', () => {
        expect(L1_WAVES.length).toBe(6);
    });
    
    it('L2 有 6 波', () => {
        expect(L2_WAVES.length).toBe(6);
    });
    
    it('所有波次 dpGrant > 0', () => {
        for (const wave of [...L1_WAVES, ...L2_WAVES]) {
            expect(wave.dpGrant, `W${wave.wave} dpGrant`).toBeGreaterThan(0);
        }
    });
    
    it('所有波次敌人数 > 0', () => {
        for (const wave of [...L1_WAVES, ...L2_WAVES]) {
            expect(getWaveEnemyCount(wave), `W${wave.wave} enemy count`).toBeGreaterThan(0);
        }
    });
});

describe('L2 比 L1 更难', () => {
    it('L2 总敌人 >= L1 总敌人', () => {
        const l1 = getLevelTotalEnemies(L1_WAVES);
        const l2 = getLevelTotalEnemies(L2_WAVES);
        expect(l2).toBeGreaterThanOrEqual(l1);
    });
    
    it('L2 总 HP >= L1 总 HP', () => {
        const l1 = getLevelTotalHp(L1_WAVES);
        const l2 = getLevelTotalHp(L2_WAVES);
        expect(l2).toBeGreaterThanOrEqual(l1);
    });
    
    it('L2 Z3 数量 > L1 Z3 数量', () => {
        const l1 = countEnemyType(L1_WAVES, EnemyType.Z3_Tank);
        const l2 = countEnemyType(L2_WAVES, EnemyType.Z3_Tank);
        expect(l2).toBeGreaterThan(l1);
    });
    
    it('L2 W0 就有 Z2 (更早引入精英)', () => {
        const l2w0z2 = countEnemyType([L2_WAVES[0]], EnemyType.Z2_Runner);
        expect(l2w0z2).toBeGreaterThan(0);
    });
});

describe('Day10 调整后数值', () => {
    it('L1 总敌人 = 91', () => {
        // W0:6 + W1:10 + W2:11 + W3:15 + W4:20 + W5:29 = 91
        expect(getLevelTotalEnemies(L1_WAVES)).toBe(91);
    });
    
    it('L2 总敌人 = 124', () => {
        // W0:10 + W1:15 + W2:16 + W3:21 + W4:26 + W5:36 = 124
        expect(getLevelTotalEnemies(L2_WAVES)).toBe(124);
    });
    
    it('L1 总 DP = 24', () => {
        expect(getLevelTotalDp(L1_WAVES)).toBe(24);
    });
    
    it('L2 总 DP = 23', () => {
        expect(getLevelTotalDp(L2_WAVES)).toBe(23);
    });
    
    it('MG L1 DPS = 7', () => {
        expect(BUILDING_CONFIGS['MachineGun_L1'].dps).toBe(7);
    });
    
    it('Cannon L2 tankBonus = 2.2', () => {
        expect(BUILDING_CONFIGS['Cannon_L2'].tankBonus).toBe(2.2);
    });
    
    it('Mine L1 triggerDamage = 28', () => {
        expect(BUILDING_CONFIGS['Mine_L1'].triggerDamage).toBe(28);
    });
});

describe('DPS vs HP Sanity Check', () => {
    const W0_COMBAT_TIME = 25;  // 预估战斗时间
    const W2_COMBAT_TIME = 40;
    
    it('单 MG L1 能清 W0', () => {
        const mgDps = BUILDING_CONFIGS['MachineGun_L1'].dps;
        const w0Hp = getWaveHp(L1_WAVES[0]);
        const requiredDps = w0Hp / W0_COMBAT_TIME;
        expect(mgDps).toBeGreaterThan(requiredDps);
    });
    
    it('双 MG L1 能清 W2', () => {
        const mgDps = BUILDING_CONFIGS['MachineGun_L1'].dps * 2;
        const w2Hp = getWaveHp(L1_WAVES[2]);
        const requiredDps = w2Hp / W2_COMBAT_TIME;
        expect(mgDps).toBeGreaterThan(requiredDps);
    });
    
    it('Cannon L2 vs Z3 TTK < 3s', () => {
        const cannonDps = BUILDING_CONFIGS['Cannon_L2'].dps;
        const tankBonus = BUILDING_CONFIGS['Cannon_L2'].tankBonus!;
        const effectiveDps = cannonDps * tankBonus;
        const z3Hp = ENEMY_STATS[EnemyType.Z3_Tank].hp;
        const ttk = z3Hp / effectiveDps;
        expect(ttk).toBeLessThan(3);  // 2.3s
    });
    
    it('Mine L1 + 火力 Lv.1 可一击 Z2', () => {
        const mineDmg = BUILDING_CONFIGS['Mine_L1'].triggerDamage!;
        const firepowerBonus = 1.08;  // Lv.1 = +8%
        const effectiveDmg = mineDmg * firepowerBonus;
        const z2Hp = ENEMY_STATS[EnemyType.Z2_Runner].hp;
        expect(effectiveDmg).toBeGreaterThan(z2Hp);  // 28 * 1.08 = 30.24 > 8
    });
});

describe('难度曲线递增', () => {
    it('L1 每波 HP 递增', () => {
        let prevHp = 0;
        for (const wave of L1_WAVES) {
            const hp = getWaveHp(wave);
            expect(hp, `W${wave.wave}`).toBeGreaterThanOrEqual(prevHp);
            prevHp = hp;
        }
    });
    
    it('L2 每波 HP 递增', () => {
        let prevHp = 0;
        for (const wave of L2_WAVES) {
            const hp = getWaveHp(wave);
            expect(hp, `W${wave.wave}`).toBeGreaterThanOrEqual(prevHp);
            prevHp = hp;
        }
    });
});

describe('无 NaN 检查', () => {
    it('建筑配置无 NaN', () => {
        for (const [key, config] of Object.entries(BUILDING_CONFIGS)) {
            expect(Number.isNaN(config.dpCost), `${key} dpCost`).toBe(false);
            expect(Number.isNaN(config.dps), `${key} dps`).toBe(false);
            expect(Number.isNaN(config.range), `${key} range`).toBe(false);
            expect(Number.isNaN(config.fireRate), `${key} fireRate`).toBe(false);
            if (config.aoeRadius !== undefined) expect(Number.isNaN(config.aoeRadius), `${key} aoeRadius`).toBe(false);
            if (config.tankBonus !== undefined) expect(Number.isNaN(config.tankBonus), `${key} tankBonus`).toBe(false);
            if (config.triggerDamage !== undefined) expect(Number.isNaN(config.triggerDamage), `${key} triggerDamage`).toBe(false);
        }
    });
    
    it('敌人配置无 NaN', () => {
        for (const [type, stats] of Object.entries(ENEMY_STATS)) {
            expect(Number.isNaN(stats.hp), `${type} hp`).toBe(false);
            expect(Number.isNaN(stats.speed), `${type} speed`).toBe(false);
            expect(Number.isNaN(stats.damage), `${type} damage`).toBe(false);
        }
    });
    
    it('波次配置无 NaN', () => {
        for (const wave of [...L1_WAVES, ...L2_WAVES]) {
            expect(Number.isNaN(wave.dpGrant), `W${wave.wave} dpGrant`).toBe(false);
            for (const spawn of wave.enemies) {
                expect(Number.isNaN(spawn.count), `W${wave.wave} ${spawn.type} count`).toBe(false);
            }
        }
    });
});
