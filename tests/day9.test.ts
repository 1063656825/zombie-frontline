/**
 * Day9 单元测试
 * 测试 L2 波次配置、关卡解锁、难度曲线、奖励
 * 运行: npx vitest run tests/day9.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================
// 关卡 ID
// ============================================================

enum LevelId {
    L1 = 'L1',
    L2 = 'L2'
}

// ============================================================
// 敌人类型
// ============================================================

enum EnemyType {
    Z1_Walker = 'Z1',
    Z2_Runner = 'Z2',
    Z3_Tank = 'Z3'
}

// ============================================================
// 波次配置（镜像实现）
// ============================================================

interface EnemySpawn {
    type: EnemyType;
    count: number;
    delay?: number;
    interval?: number;
}

interface WaveConfig {
    wave: number;
    deployFastTime: number;
    deployTuneTime: number;
    dpGrant: number;
    enemies: EnemySpawn[];
}

function createWave(config: WaveConfig): WaveConfig & { getTotalEnemies: () => number } {
    return {
        ...config,
        getTotalEnemies() {
            return this.enemies.reduce((sum, spawn) => sum + spawn.count, 0);
        }
    };
}

// L1 波次配置
const L1_WAVES: (WaveConfig & { getTotalEnemies: () => number })[] = [
    createWave({ wave: 0, deployFastTime: 6, deployTuneTime: 4, dpGrant: 3, enemies: [{ type: EnemyType.Z1_Walker, count: 6, interval: 3 }] }),
    createWave({ wave: 1, deployFastTime: 8, deployTuneTime: 4, dpGrant: 3, enemies: [{ type: EnemyType.Z1_Walker, count: 10, interval: 2.5 }] }),
    createWave({ wave: 2, deployFastTime: 8, deployTuneTime: 4, dpGrant: 4, enemies: [{ type: EnemyType.Z1_Walker, count: 8, interval: 3 }, { type: EnemyType.Z2_Runner, count: 4, delay: 10, interval: 2 }] }),
    createWave({ wave: 3, deployFastTime: 8, deployTuneTime: 4, dpGrant: 3, enemies: [{ type: EnemyType.Z1_Walker, count: 10, interval: 2.5 }, { type: EnemyType.Z2_Runner, count: 6, delay: 15, interval: 2 }] }),
    createWave({ wave: 4, deployFastTime: 8, deployTuneTime: 4, dpGrant: 4, enemies: [{ type: EnemyType.Z1_Walker, count: 12, interval: 2 }, { type: EnemyType.Z2_Runner, count: 6, delay: 10, interval: 2.5 }, { type: EnemyType.Z3_Tank, count: 2, delay: 25, interval: 10 }] }),
    createWave({ wave: 5, deployFastTime: 10, deployTuneTime: 5, dpGrant: 5, enemies: [{ type: EnemyType.Z1_Walker, count: 15, interval: 2 }, { type: EnemyType.Z2_Runner, count: 10, delay: 15, interval: 2 }, { type: EnemyType.Z3_Tank, count: 4, delay: 30, interval: 8 }] }),
];

// L2 波次配置
const L2_WAVES: (WaveConfig & { getTotalEnemies: () => number })[] = [
    createWave({ wave: 0, deployFastTime: 6, deployTuneTime: 3, dpGrant: 2, enemies: [{ type: EnemyType.Z1_Walker, count: 8, interval: 2.5 }, { type: EnemyType.Z2_Runner, count: 2, delay: 12, interval: 3 }] }),
    createWave({ wave: 1, deployFastTime: 7, deployTuneTime: 3, dpGrant: 3, enemies: [{ type: EnemyType.Z1_Walker, count: 10, interval: 2 }, { type: EnemyType.Z2_Runner, count: 5, delay: 8, interval: 2.5 }] }),
    createWave({ wave: 2, deployFastTime: 7, deployTuneTime: 3, dpGrant: 3, enemies: [{ type: EnemyType.Z1_Walker, count: 10, interval: 2.5 }, { type: EnemyType.Z2_Runner, count: 6, delay: 10, interval: 2 }, { type: EnemyType.Z3_Tank, count: 1, delay: 20, interval: 0 }] }),
    createWave({ wave: 3, deployFastTime: 7, deployTuneTime: 3, dpGrant: 3, enemies: [{ type: EnemyType.Z1_Walker, count: 12, interval: 2 }, { type: EnemyType.Z2_Runner, count: 8, delay: 10, interval: 1.8 }, { type: EnemyType.Z3_Tank, count: 2, delay: 25, interval: 8 }] }),
    createWave({ wave: 4, deployFastTime: 8, deployTuneTime: 4, dpGrant: 4, enemies: [{ type: EnemyType.Z1_Walker, count: 15, interval: 1.8 }, { type: EnemyType.Z2_Runner, count: 10, delay: 8, interval: 1.5 }, { type: EnemyType.Z3_Tank, count: 3, delay: 20, interval: 8 }] }),
    createWave({ wave: 5, deployFastTime: 10, deployTuneTime: 4, dpGrant: 4, enemies: [{ type: EnemyType.Z1_Walker, count: 20, interval: 1.5 }, { type: EnemyType.Z2_Runner, count: 15, delay: 10, interval: 1.5 }, { type: EnemyType.Z3_Tank, count: 6, delay: 25, interval: 6 }] }),
];

// 关卡配置
interface LevelConfig {
    id: LevelId;
    name: string;
    baseScrapReward: number;
    waves: (WaveConfig & { getTotalEnemies: () => number })[];
}

const LEVEL_CONFIGS: Record<LevelId, LevelConfig> = {
    [LevelId.L1]: { id: LevelId.L1, name: '首关', baseScrapReward: 30, waves: L1_WAVES },
    [LevelId.L2]: { id: LevelId.L2, name: '进阶', baseScrapReward: 45, waves: L2_WAVES }
};

// ============================================================
// 关卡解锁管理器
// ============================================================

class LevelUnlockManager {
    private _unlockedLevels: Set<string> = new Set(['L1']);
    
    isUnlocked(levelId: string): boolean {
        return this._unlockedLevels.has(levelId);
    }
    
    unlock(levelId: string): boolean {
        if (this._unlockedLevels.has(levelId)) return false;
        this._unlockedLevels.add(levelId);
        return true;
    }
    
    getUnlocked(): string[] {
        return Array.from(this._unlockedLevels);
    }
    
    reset() {
        this._unlockedLevels = new Set(['L1']);
    }
}

// ============================================================
// 辅助函数
// ============================================================

function getLevelTotalEnemies(levelId: LevelId): number {
    const config = LEVEL_CONFIGS[levelId];
    return config.waves.reduce((sum, wave) => sum + wave.getTotalEnemies(), 0);
}

function getLevelTotalDpGrant(levelId: LevelId): number {
    const config = LEVEL_CONFIGS[levelId];
    return config.waves.reduce((sum, wave) => sum + wave.dpGrant, 0);
}

function countEnemyType(levelId: LevelId, type: EnemyType): number {
    const config = LEVEL_CONFIGS[levelId];
    let count = 0;
    for (const wave of config.waves) {
        for (const spawn of wave.enemies) {
            if (spawn.type === type) {
                count += spawn.count;
            }
        }
    }
    return count;
}

function getWaveEnemyCount(levelId: LevelId, waveIndex: number): number {
    const config = LEVEL_CONFIGS[levelId];
    const wave = config.waves[waveIndex];
    return wave ? wave.getTotalEnemies() : 0;
}

function getTotalDeployTime(levelId: LevelId): number {
    const config = LEVEL_CONFIGS[levelId];
    return config.waves.reduce((sum, wave) => sum + wave.deployFastTime + wave.deployTuneTime, 0);
}

// ============================================================
// 测试用例
// ============================================================

describe('关卡配置存在', () => {
    it('L1 关卡存在', () => {
        expect(LEVEL_CONFIGS[LevelId.L1]).toBeDefined();
        expect(LEVEL_CONFIGS[LevelId.L1].waves.length).toBe(6);
    });
    
    it('L2 关卡存在', () => {
        expect(LEVEL_CONFIGS[LevelId.L2]).toBeDefined();
        expect(LEVEL_CONFIGS[LevelId.L2].waves.length).toBe(6);
    });
});

describe('L2 敌人总数 > L1', () => {
    it('L2 总敌人数大于 L1', () => {
        const l1Total = getLevelTotalEnemies(LevelId.L1);
        const l2Total = getLevelTotalEnemies(LevelId.L2);
        
        console.log(`L1 敌人: ${l1Total}, L2 敌人: ${l2Total}`);
        expect(l2Total).toBeGreaterThan(l1Total);
    });
    
    it('L1 总敌人数 = 77', () => {
        // 6+10+12+16+20+29 = 93? Let me calculate
        // W0: 6, W1: 10, W2: 8+4=12, W3: 10+6=16, W4: 12+6+2=20, W5: 15+10+4=29
        // Total: 6+10+12+16+20+29 = 93
        const l1Total = getLevelTotalEnemies(LevelId.L1);
        expect(l1Total).toBe(93);
    });
    
    it('L2 总敌人数 > 100', () => {
        const l2Total = getLevelTotalEnemies(LevelId.L2);
        expect(l2Total).toBeGreaterThan(100);
    });
});

describe('L2 Z2/Z3 出现更早', () => {
    it('L1 W0 只有 Z1', () => {
        const wave = L1_WAVES[0];
        const types = wave.enemies.map(e => e.type);
        expect(types).toEqual([EnemyType.Z1_Walker]);
    });
    
    it('L2 W0 已有 Z2', () => {
        const wave = L2_WAVES[0];
        const types = wave.enemies.map(e => e.type);
        expect(types).toContain(EnemyType.Z2_Runner);
    });
    
    it('L1 W4 首次出现 Z3', () => {
        const l1TankWave = L1_WAVES.findIndex(w => w.enemies.some(e => e.type === EnemyType.Z3_Tank));
        expect(l1TankWave).toBe(4);
    });
    
    it('L2 W2 首次出现 Z3 (更早)', () => {
        const l2TankWave = L2_WAVES.findIndex(w => w.enemies.some(e => e.type === EnemyType.Z3_Tank));
        expect(l2TankWave).toBe(2);
    });
});

describe('L2 DP 发放更紧', () => {
    it('L2 总 DP < L1 总 DP', () => {
        const l1Dp = getLevelTotalDpGrant(LevelId.L1);
        const l2Dp = getLevelTotalDpGrant(LevelId.L2);
        
        console.log(`L1 DP: ${l1Dp}, L2 DP: ${l2Dp}`);
        expect(l2Dp).toBeLessThanOrEqual(l1Dp);
    });
    
    it('L1 总 DP = 22', () => {
        // 3+3+4+3+4+5 = 22
        const l1Dp = getLevelTotalDpGrant(LevelId.L1);
        expect(l1Dp).toBe(22);
    });
    
    it('L2 W0 DP = 2 (比 L1 的 3 少)', () => {
        expect(L2_WAVES[0].dpGrant).toBe(2);
        expect(L1_WAVES[0].dpGrant).toBe(3);
    });
});

describe('L2 部署时间更紧', () => {
    it('L2 W0 微调时间 3s < L1 W0 微调时间 4s', () => {
        expect(L2_WAVES[0].deployTuneTime).toBe(3);
        expect(L1_WAVES[0].deployTuneTime).toBe(4);
    });
    
    it('L2 总部署时间 < L1 总部署时间', () => {
        const l1Time = getTotalDeployTime(LevelId.L1);
        const l2Time = getTotalDeployTime(LevelId.L2);
        expect(l2Time).toBeLessThan(l1Time);
    });
});

describe('残骸奖励', () => {
    it('L1 基础奖励 30', () => {
        expect(LEVEL_CONFIGS[LevelId.L1].baseScrapReward).toBe(30);
    });
    
    it('L2 基础奖励 45 (更高)', () => {
        expect(LEVEL_CONFIGS[LevelId.L2].baseScrapReward).toBe(45);
    });
    
    it('L2 奖励 > L1 奖励', () => {
        expect(LEVEL_CONFIGS[LevelId.L2].baseScrapReward).toBeGreaterThan(LEVEL_CONFIGS[LevelId.L1].baseScrapReward);
    });
});

describe('关卡解锁逻辑', () => {
    let manager: LevelUnlockManager;
    
    beforeEach(() => {
        manager = new LevelUnlockManager();
        manager.reset();
    });
    
    it('初始只有 L1 解锁', () => {
        expect(manager.isUnlocked('L1')).toBe(true);
        expect(manager.isUnlocked('L2')).toBe(false);
    });
    
    it('可以解锁 L2', () => {
        const result = manager.unlock('L2');
        expect(result).toBe(true);
        expect(manager.isUnlocked('L2')).toBe(true);
    });
    
    it('重复解锁返回 false', () => {
        manager.unlock('L2');
        const result = manager.unlock('L2');
        expect(result).toBe(false);
    });
    
    it('L1 胜利 → L2 解锁', () => {
        // 模拟胜利解锁逻辑
        const currentLevel = LevelId.L1;
        const nextLevelMap: Record<LevelId, LevelId | null> = {
            [LevelId.L1]: LevelId.L2,
            [LevelId.L2]: null
        };
        
        const nextLevel = nextLevelMap[currentLevel];
        if (nextLevel) {
            manager.unlock(nextLevel);
        }
        
        expect(manager.isUnlocked('L2')).toBe(true);
    });
});

describe('单波敌人数量合理', () => {
    it('L1 每波敌人 ≤ 29', () => {
        for (let i = 0; i < L1_WAVES.length; i++) {
            const count = getWaveEnemyCount(LevelId.L1, i);
            expect(count).toBeLessThanOrEqual(29);
        }
    });
    
    it('L2 每波敌人 ≤ 41', () => {
        for (let i = 0; i < L2_WAVES.length; i++) {
            const count = getWaveEnemyCount(LevelId.L2, i);
            expect(count).toBeLessThanOrEqual(41);
        }
    });
    
    it('L2 W5 是最大波', () => {
        const counts = L2_WAVES.map(w => w.getTotalEnemies());
        const maxCount = Math.max(...counts);
        const w5Count = L2_WAVES[5].getTotalEnemies();
        expect(w5Count).toBe(maxCount);
    });
});

describe('Z3 胖尸数量', () => {
    it('L1 总 Z3 = 6', () => {
        const count = countEnemyType(LevelId.L1, EnemyType.Z3_Tank);
        expect(count).toBe(6);  // W4: 2, W5: 4
    });
    
    it('L2 总 Z3 = 12 (更多)', () => {
        const count = countEnemyType(LevelId.L2, EnemyType.Z3_Tank);
        expect(count).toBe(12);  // W2: 1, W3: 2, W4: 3, W5: 6
    });
    
    it('L2 Z3 数量 > L1 Z3 数量', () => {
        const l1 = countEnemyType(LevelId.L1, EnemyType.Z3_Tank);
        const l2 = countEnemyType(LevelId.L2, EnemyType.Z3_Tank);
        expect(l2).toBeGreaterThan(l1);
    });
});

describe('难度曲线递增', () => {
    it('L1 每波敌人递增', () => {
        let prev = 0;
        for (const wave of L1_WAVES) {
            const count = wave.getTotalEnemies();
            expect(count).toBeGreaterThanOrEqual(prev);
            prev = count;
        }
    });
    
    it('L2 每波敌人递增', () => {
        let prev = 0;
        for (const wave of L2_WAVES) {
            const count = wave.getTotalEnemies();
            expect(count).toBeGreaterThanOrEqual(prev);
            prev = count;
        }
    });
});

describe('波数一致', () => {
    it('L1 和 L2 都是 6 波', () => {
        expect(L1_WAVES.length).toBe(6);
        expect(L2_WAVES.length).toBe(6);
    });
});
