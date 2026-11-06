/**
 * Day8 单元测试
 * 测试受击闪白、击退、爆炸圈、音效服务
 * 运行: npx vitest run tests/day8.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================
// 闪白时长测试
// ============================================================

const FLASH_DURATION_MIN = 0.08;
const FLASH_DURATION_MAX = 0.15;
const FLASH_DURATION_DEFAULT = 0.1;

function clampFlashDuration(duration: number): number {
    return Math.max(FLASH_DURATION_MIN, Math.min(FLASH_DURATION_MAX, duration));
}

// ============================================================
// 击退向量测试
// ============================================================

enum EnemyType {
    Z1_Walker = 'Z1',
    Z2_Runner = 'Z2',
    Z3_Tank = 'Z3'
}

const KNOCKBACK_BASE_DISTANCE = 15;
const KNOCKBACK_Z1_MULTIPLIER = 1.0;
const KNOCKBACK_Z2_MULTIPLIER = 1.2;
const KNOCKBACK_Z3_MULTIPLIER = 0.4;
const BASE_Y_THRESHOLD = -400;

interface Vec3Like {
    x: number;
    y: number;
    z: number;
}

function getKnockbackMultiplier(enemyType: EnemyType): number {
    switch (enemyType) {
        case EnemyType.Z1_Walker:
            return KNOCKBACK_Z1_MULTIPLIER;
        case EnemyType.Z2_Runner:
            return KNOCKBACK_Z2_MULTIPLIER;
        case EnemyType.Z3_Tank:
            return KNOCKBACK_Z3_MULTIPLIER;
        default:
            return KNOCKBACK_Z1_MULTIPLIER;
    }
}

function getKnockbackDistance(enemyType: EnemyType): number {
    return KNOCKBACK_BASE_DISTANCE * getKnockbackMultiplier(enemyType);
}

function normalize(v: Vec3Like): Vec3Like {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len < 0.0001) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function calculateKnockbackVector(
    enemyType: EnemyType,
    enemyPos: Vec3Like,
    damageSourcePos: Vec3Like | null,
    pathDirection: Vec3Like | null
): Vec3Like {
    const multiplier = getKnockbackMultiplier(enemyType);
    const distance = KNOCKBACK_BASE_DISTANCE * multiplier;
    
    if (distance <= 0) {
        return { x: 0, y: 0, z: 0 };
    }
    
    let knockbackDir: Vec3Like;
    
    if (damageSourcePos) {
        knockbackDir = {
            x: enemyPos.x - damageSourcePos.x,
            y: enemyPos.y - damageSourcePos.y,
            z: 0
        };
        const len = Math.sqrt(knockbackDir.x * knockbackDir.x + knockbackDir.y * knockbackDir.y);
        if (len > 0.001) {
            knockbackDir = normalize(knockbackDir);
        } else {
            knockbackDir = pathDirection ? { x: -pathDirection.x, y: -pathDirection.y, z: 0 } : { x: 0, y: 1, z: 0 };
        }
    } else if (pathDirection) {
        knockbackDir = { x: -pathDirection.x, y: -pathDirection.y, z: 0 };
    } else {
        knockbackDir = { x: 0, y: 1, z: 0 };
    }
    
    knockbackDir = normalize(knockbackDir);
    
    return {
        x: knockbackDir.x * distance,
        y: knockbackDir.y * distance,
        z: 0
    };
}

function applyKnockbackWithClamp(currentPos: Vec3Like, knockbackVec: Vec3Like): Vec3Like {
    let newY = currentPos.y + knockbackVec.y;
    if (newY < BASE_Y_THRESHOLD) {
        newY = BASE_Y_THRESHOLD;
    }
    return {
        x: currentPos.x + knockbackVec.x,
        y: newY,
        z: currentPos.z + knockbackVec.z
    };
}

// ============================================================
// 爆炸圈半径测试
// ============================================================

enum BuildingLevel {
    L1 = 1,
    L2 = 2
}

const AOE_PIXEL_SCALE = 80;

const CANNON_AOE_RADIUS: Record<BuildingLevel, number> = {
    [BuildingLevel.L1]: 0.8,  // From BuildingConfig
    [BuildingLevel.L2]: 1.2
};

function getCannonAoeRadiusPixels(level: BuildingLevel): number {
    const configRadius = CANNON_AOE_RADIUS[level];
    return configRadius * AOE_PIXEL_SCALE;
}

// ============================================================
// 音效服务测试
// ============================================================

enum SfxId {
    Place = 'place',
    Merge = 'merge',
    Shoot = 'shoot',
    CannonBoom = 'cannon_boom',
    MineBoom = 'mine_boom',
    EnemyHit = 'enemy_hit',
    BaseHit = 'base_hit',
    WaveStart = 'wave_start',
    Win = 'win',
    Lose = 'lose',
    UiClick = 'ui_click'
}

interface SfxPlayRecord {
    id: SfxId;
    timestamp: number;
}

interface SfxConfig {
    id: SfxId;
    volume: number;
    cooldown?: number;
}

const SFX_CONFIGS: Record<SfxId, SfxConfig> = {
    [SfxId.Place]: { id: SfxId.Place, volume: 0.6 },
    [SfxId.Merge]: { id: SfxId.Merge, volume: 0.7 },
    [SfxId.Shoot]: { id: SfxId.Shoot, volume: 0.4, cooldown: 0.05 },
    [SfxId.CannonBoom]: { id: SfxId.CannonBoom, volume: 0.8 },
    [SfxId.MineBoom]: { id: SfxId.MineBoom, volume: 0.9 },
    [SfxId.EnemyHit]: { id: SfxId.EnemyHit, volume: 0.3, cooldown: 0.03 },
    [SfxId.BaseHit]: { id: SfxId.BaseHit, volume: 0.7 },
    [SfxId.WaveStart]: { id: SfxId.WaveStart, volume: 0.6 },
    [SfxId.Win]: { id: SfxId.Win, volume: 1.0 },
    [SfxId.Lose]: { id: SfxId.Lose, volume: 1.0 },
    [SfxId.UiClick]: { id: SfxId.UiClick, volume: 0.5 }
};

class MockAudioService {
    private _enabled: boolean = true;
    private _playHistory: SfxPlayRecord[] = [];
    private _lastPlayTime: Map<SfxId, number> = new Map();
    private _recordHistory: boolean = false;
    
    play(id: SfxId): boolean {
        if (!this._enabled) return false;
        
        const config = SFX_CONFIGS[id];
        if (!config) return false;
        
        const now = Date.now();
        const lastTime = this._lastPlayTime.get(id) || 0;
        const cooldown = (config.cooldown || 0) * 1000;
        
        if (cooldown > 0 && now - lastTime < cooldown) {
            return false;
        }
        
        this._lastPlayTime.set(id, now);
        
        if (this._recordHistory) {
            this._playHistory.push({ id, timestamp: now });
        }
        
        return true;
    }
    
    setEnabled(enabled: boolean) {
        this._enabled = enabled;
    }
    
    isEnabled(): boolean {
        return this._enabled;
    }
    
    startRecording() {
        this._recordHistory = true;
        this._playHistory = [];
    }
    
    stopRecording(): SfxPlayRecord[] {
        this._recordHistory = false;
        return [...this._playHistory];
    }
    
    getPlayHistory(): SfxPlayRecord[] {
        return [...this._playHistory];
    }
    
    clearHistory() {
        this._playHistory = [];
    }
    
    reset() {
        this._lastPlayTime.clear();
        this._playHistory = [];
        this._recordHistory = false;
        this._enabled = true;
    }
}

// ============================================================
// 测试用例
// ============================================================

describe('闪白时长限制', () => {
    it('正常值不变', () => {
        expect(clampFlashDuration(0.1)).toBe(0.1);
        expect(clampFlashDuration(0.12)).toBe(0.12);
    });
    
    it('小于最小值时取最小值', () => {
        expect(clampFlashDuration(0.01)).toBe(FLASH_DURATION_MIN);
        expect(clampFlashDuration(0)).toBe(FLASH_DURATION_MIN);
        expect(clampFlashDuration(-1)).toBe(FLASH_DURATION_MIN);
    });
    
    it('大于最大值时取最大值', () => {
        expect(clampFlashDuration(0.5)).toBe(FLASH_DURATION_MAX);
        expect(clampFlashDuration(1.0)).toBe(FLASH_DURATION_MAX);
    });
    
    it('边界值', () => {
        expect(clampFlashDuration(FLASH_DURATION_MIN)).toBe(FLASH_DURATION_MIN);
        expect(clampFlashDuration(FLASH_DURATION_MAX)).toBe(FLASH_DURATION_MAX);
    });
});

describe('击退倍率按敌人类型', () => {
    it('Z1 步行尸 1.0x', () => {
        expect(getKnockbackMultiplier(EnemyType.Z1_Walker)).toBe(1.0);
    });
    
    it('Z2 快跑尸 1.2x', () => {
        expect(getKnockbackMultiplier(EnemyType.Z2_Runner)).toBe(1.2);
    });
    
    it('Z3 胖尸 0.4x (大幅减少)', () => {
        expect(getKnockbackMultiplier(EnemyType.Z3_Tank)).toBe(0.4);
    });
});

describe('击退距离计算', () => {
    it('Z1 击退 15px', () => {
        expect(getKnockbackDistance(EnemyType.Z1_Walker)).toBe(15);
    });
    
    it('Z2 击退 18px', () => {
        expect(getKnockbackDistance(EnemyType.Z2_Runner)).toBe(18);
    });
    
    it('Z3 击退 6px', () => {
        expect(getKnockbackDistance(EnemyType.Z3_Tank)).toBe(6);
    });
});

describe('击退向量计算', () => {
    it('有伤害源时从源向外推', () => {
        const enemyPos = { x: 100, y: 0, z: 0 };
        const sourcePos = { x: 0, y: 0, z: 0 };
        
        const vec = calculateKnockbackVector(EnemyType.Z1_Walker, enemyPos, sourcePos, null);
        
        // 应该向 +x 方向推
        expect(vec.x).toBeGreaterThan(0);
        expect(Math.abs(vec.y)).toBeLessThan(0.1);
    });
    
    it('无伤害源时沿路径反方向推', () => {
        const enemyPos = { x: 0, y: 0, z: 0 };
        const pathDir = { x: 0, y: -1, z: 0 };  // 向下走
        
        const vec = calculateKnockbackVector(EnemyType.Z1_Walker, enemyPos, null, pathDir);
        
        // 应该向 +y 方向推（反方向）
        expect(vec.y).toBeGreaterThan(0);
        expect(Math.abs(vec.x)).toBeLessThan(0.1);
    });
    
    it('无伤害源无路径时默认向上推', () => {
        const enemyPos = { x: 0, y: 0, z: 0 };
        
        const vec = calculateKnockbackVector(EnemyType.Z1_Walker, enemyPos, null, null);
        
        expect(vec.y).toBeGreaterThan(0);
        expect(Math.abs(vec.x)).toBeLessThan(0.1);
    });
    
    it('胖尸击退距离小于步行尸', () => {
        const enemyPos = { x: 100, y: 0, z: 0 };
        const sourcePos = { x: 0, y: 0, z: 0 };
        
        const vecZ1 = calculateKnockbackVector(EnemyType.Z1_Walker, enemyPos, sourcePos, null);
        const vecZ3 = calculateKnockbackVector(EnemyType.Z3_Tank, enemyPos, sourcePos, null);
        
        const distZ1 = Math.sqrt(vecZ1.x * vecZ1.x + vecZ1.y * vecZ1.y);
        const distZ3 = Math.sqrt(vecZ3.x * vecZ3.x + vecZ3.y * vecZ3.y);
        
        expect(distZ3).toBeLessThan(distZ1);
    });
});

describe('击退位置限制', () => {
    it('正常击退', () => {
        const pos = { x: 0, y: 0, z: 0 };
        const knockback = { x: 10, y: -20, z: 0 };
        
        const result = applyKnockbackWithClamp(pos, knockback);
        
        expect(result.x).toBe(10);
        expect(result.y).toBe(-20);
    });
    
    it('击退到据点门槛时限制', () => {
        const pos = { x: 0, y: -390, z: 0 };
        const knockback = { x: 0, y: -50, z: 0 };  // 会超过 -400
        
        const result = applyKnockbackWithClamp(pos, knockback);
        
        expect(result.y).toBe(BASE_Y_THRESHOLD);  // 限制在 -400
    });
    
    it('已在据点附近的敌人不会被推得更近', () => {
        const pos = { x: 0, y: -410, z: 0 };  // 已超过门槛
        const knockback = { x: 0, y: -10, z: 0 };
        
        const result = applyKnockbackWithClamp(pos, knockback);
        
        expect(result.y).toBe(BASE_Y_THRESHOLD);
    });
});

describe('炮轰爆炸圈半径', () => {
    it('L1 炮轰半径 64px (0.8 * 80)', () => {
        const radius = getCannonAoeRadiusPixels(BuildingLevel.L1);
        expect(radius).toBe(64);
    });
    
    it('L2 炮轰半径 96px (1.2 * 80)', () => {
        const radius = getCannonAoeRadiusPixels(BuildingLevel.L2);
        expect(radius).toBe(96);
    });
    
    it('L2 半径大于 L1', () => {
        const r1 = getCannonAoeRadiusPixels(BuildingLevel.L1);
        const r2 = getCannonAoeRadiusPixels(BuildingLevel.L2);
        expect(r2).toBeGreaterThan(r1);
    });
});

describe('AudioService 基础功能', () => {
    let audio: MockAudioService;
    
    beforeEach(() => {
        audio = new MockAudioService();
        audio.reset();
    });
    
    it('初始启用状态', () => {
        expect(audio.isEnabled()).toBe(true);
    });
    
    it('禁用后不播放', () => {
        audio.setEnabled(false);
        expect(audio.play(SfxId.Shoot)).toBe(false);
    });
    
    it('启用后可播放', () => {
        audio.setEnabled(true);
        expect(audio.play(SfxId.Shoot)).toBe(true);
    });
    
    it('未知 ID 返回 false', () => {
        expect(audio.play('unknown' as SfxId)).toBe(false);
    });
});

describe('AudioService 播放记录', () => {
    let audio: MockAudioService;
    
    beforeEach(() => {
        audio = new MockAudioService();
        audio.reset();
    });
    
    it('开始记录后有历史', () => {
        audio.startRecording();
        audio.play(SfxId.Place);
        audio.play(SfxId.Merge);
        
        const history = audio.getPlayHistory();
        expect(history.length).toBe(2);
        expect(history[0].id).toBe(SfxId.Place);
        expect(history[1].id).toBe(SfxId.Merge);
    });
    
    it('停止记录后不再增加', () => {
        audio.startRecording();
        audio.play(SfxId.Place);
        audio.stopRecording();
        audio.play(SfxId.Merge);
        
        const history = audio.getPlayHistory();
        expect(history.length).toBe(1);
    });
    
    it('清空历史', () => {
        audio.startRecording();
        audio.play(SfxId.Place);
        audio.clearHistory();
        
        expect(audio.getPlayHistory().length).toBe(0);
    });
});

describe('AudioService 冷却机制', () => {
    let audio: MockAudioService;
    
    beforeEach(() => {
        audio = new MockAudioService();
        audio.reset();
    });
    
    it('无冷却的音效可连续播放', () => {
        expect(audio.play(SfxId.Place)).toBe(true);
        expect(audio.play(SfxId.Place)).toBe(true);
    });
    
    it('有冷却的音效在冷却期内被拒绝', async () => {
        // Shoot 有 50ms 冷却
        expect(audio.play(SfxId.Shoot)).toBe(true);
        expect(audio.play(SfxId.Shoot)).toBe(false);  // 立即调用被拒
        
        // 等待冷却
        await new Promise(resolve => setTimeout(resolve, 60));
        expect(audio.play(SfxId.Shoot)).toBe(true);
    });
});

describe('SfxId 枚举完整性', () => {
    it('包含所有必需的音效 ID', () => {
        expect(SfxId.Place).toBeDefined();
        expect(SfxId.Merge).toBeDefined();
        expect(SfxId.Shoot).toBeDefined();
        expect(SfxId.CannonBoom).toBeDefined();
        expect(SfxId.MineBoom).toBeDefined();
        expect(SfxId.EnemyHit).toBeDefined();
        expect(SfxId.BaseHit).toBeDefined();
        expect(SfxId.WaveStart).toBeDefined();
        expect(SfxId.Win).toBeDefined();
        expect(SfxId.Lose).toBeDefined();
        expect(SfxId.UiClick).toBeDefined();
    });
    
    it('11 种音效类型', () => {
        const ids = Object.values(SfxId);
        expect(ids.length).toBe(11);
    });
});

describe('音效配置完整性', () => {
    it('每个 SfxId 都有配置', () => {
        for (const id of Object.values(SfxId)) {
            const config = SFX_CONFIGS[id as SfxId];
            expect(config).toBeDefined();
            expect(config.volume).toBeGreaterThan(0);
            expect(config.volume).toBeLessThanOrEqual(1);
        }
    });
    
    it('高频音效有冷却', () => {
        expect(SFX_CONFIGS[SfxId.Shoot].cooldown).toBeGreaterThan(0);
        expect(SFX_CONFIGS[SfxId.EnemyHit].cooldown).toBeGreaterThan(0);
    });
});
