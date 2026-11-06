/**
 * WaveConfig.ts
 * 波次配置数据
 * 定义每波的敌人组成、部署点发放、时长等
 * Day9: 支持多关卡配置
 */

/**
 * 关卡 ID
 */
export enum LevelId {
    L1 = 'L1',  // 首关（教学）
    L2 = 'L2'   // 第二关（进阶）
}

/**
 * 关卡配置
 */
export interface LevelConfig {
    id: LevelId;
    name: string;
    description: string;
    baseScrapReward: number;   // 基础残骸奖励
    waves: WaveConfig[];
}

/**
 * 敌人类型枚举
 */
export enum EnemyType {
    Z1_Walker = 'Z1',      // 步行尸（普通）
    Z2_Runner = 'Z2',      // 快跑尸（快速）
    Z3_Tank = 'Z3'         // 胖尸（高血慢速）
}

/**
 * 敌人生成配置
 */
export interface EnemySpawn {
    type: EnemyType;
    count: number;
    delay?: number;        // 生成延迟（秒）
    interval?: number;     // 生成间隔（秒）
}

/**
 * 波次配置
 */
export interface WaveConfig {
    wave: number;                    // 波次编号
    deployFastTime: number;          // 快落阶段时长
    deployTuneTime: number;          // 微调阶段时长
    estimatedCombatTime: number;     // 预估战斗时长
    dpGrant: number;                 // 本波发放 DP
    enemies: EnemySpawn[];           // 敌人配置
    tutorial?: string;               // 教学提示文字
    
    getTotalEnemies(): number;       // 获取总敌人数
}

/**
 * 创建波次配置的工厂函数
 */
function createWaveConfig(config: Omit<WaveConfig, 'getTotalEnemies'>): WaveConfig {
    return {
        ...config,
        getTotalEnemies(): number {
            return this.enemies.reduce((sum, spawn) => sum + spawn.count, 0);
        }
    };
}

/**
 * L1-Tutorial 首关波次配置表
 * 参考设计文档 §2
 * Day10: 平衡调参，见 BALANCE.md
 */
export const L1_WAVE_CONFIGS: WaveConfig[] = [
    // W0 教学波
    createWaveConfig({
        wave: 0,
        deployFastTime: 6,
        deployTuneTime: 4,
        estimatedCombatTime: 25,
        dpGrant: 3,  // 开局另给 2，合计可放 1 座机枪
        enemies: [
            { type: EnemyType.Z1_Walker, count: 6, interval: 3 }
        ],
        tutorial: '拖拽建筑到高亮格子放置'
    }),
    
    // W1
    createWaveConfig({
        wave: 1,
        deployFastTime: 8,
        deployTuneTime: 4,
        estimatedCombatTime: 35,
        dpGrant: 3,
        enemies: [
            { type: EnemyType.Z1_Walker, count: 10, interval: 2.5 }
        ],
        tutorial: '点击屏幕控制主角朝向'
    }),
    
    // W2 - 引入快跑尸
    // Day10: Z2 count 4→3, 更温和的 Z2 引入，降低首次失败率
    createWaveConfig({
        wave: 2,
        deployFastTime: 8,
        deployTuneTime: 4,
        estimatedCombatTime: 40,
        dpGrant: 4,
        enemies: [
            { type: EnemyType.Z1_Walker, count: 8, interval: 3 },
            { type: EnemyType.Z2_Runner, count: 3, delay: 12, interval: 2.5 }  // Day10: 4→3, delay 10→12
        ],
        tutorial: '快跑尸移动速度快，用地雷卡口'
    }),
    
    // W3 - 引入合成
    // Day10: dpGrant 3→4, 鼓励合成，缓解无合成体验
    createWaveConfig({
        wave: 3,
        deployFastTime: 8,
        deployTuneTime: 4,
        estimatedCombatTime: 45,
        dpGrant: 4,  // Day10: 3→4
        enemies: [
            { type: EnemyType.Z1_Walker, count: 10, interval: 2.5 },
            { type: EnemyType.Z2_Runner, count: 5, delay: 15, interval: 2 }  // Day10: 6→5, 配合更多 DP
        ],
        tutorial: '相同建筑叠一起可合成升级'
    }),
    
    // W4 小高潮 - 引入胖尸
    // Day10: Z3 interval 10→12, 分散 Z3 cluster
    createWaveConfig({
        wave: 4,
        deployFastTime: 8,
        deployTuneTime: 4,
        estimatedCombatTime: 55,
        dpGrant: 4,
        enemies: [
            { type: EnemyType.Z1_Walker, count: 12, interval: 2 },
            { type: EnemyType.Z2_Runner, count: 6, delay: 10, interval: 2.5 },
            { type: EnemyType.Z3_Tank, count: 2, delay: 28, interval: 12 }  // Day10: delay 25→28, interval 10→12
        ],
        tutorial: '胖尸血厚，用炮轰建筑更有效'
    }),
    
    // W5 Boss 波
    // Day10: Z3 interval 8→10, dpGrant 5→6, 给予最终波更多资源
    createWaveConfig({
        wave: 5,
        deployFastTime: 10,
        deployTuneTime: 5,
        estimatedCombatTime: 70,
        dpGrant: 6,  // Day10: 5→6
        enemies: [
            { type: EnemyType.Z1_Walker, count: 15, interval: 2 },
            { type: EnemyType.Z2_Runner, count: 10, delay: 15, interval: 2 },
            { type: EnemyType.Z3_Tank, count: 4, delay: 30, interval: 10 }  // Day10: interval 8→10
        ]
    })
];

// 向后兼容
export const WAVE_CONFIGS = L1_WAVE_CONFIGS;

/**
 * L2-进阶 第二关波次配置表
 * Day9: 更难 - 更多 Z2/Z3、更紧凑部署、更少 DP
 * Day10: 平衡调参，见 BALANCE.md
 */
export const L2_WAVE_CONFIGS: WaveConfig[] = [
    // W0 开局波 - 比 L1 W0 更多敌人，已有快跑尸
    // Day10: dpGrant 2→3, 降低开局惩罚感
    createWaveConfig({
        wave: 0,
        deployFastTime: 6,
        deployTuneTime: 3,  // 微调时间缩短
        estimatedCombatTime: 30,
        dpGrant: 3,         // Day10: 2→3, 降低开局惩罚
        enemies: [
            { type: EnemyType.Z1_Walker, count: 8, interval: 2.5 },
            { type: EnemyType.Z2_Runner, count: 2, delay: 14, interval: 3 }  // Day10: delay 12→14
        ]
    }),
    
    // W1 - 快跑尸增多
    createWaveConfig({
        wave: 1,
        deployFastTime: 7,
        deployTuneTime: 3,
        estimatedCombatTime: 35,
        dpGrant: 3,
        enemies: [
            { type: EnemyType.Z1_Walker, count: 10, interval: 2 },
            { type: EnemyType.Z2_Runner, count: 5, delay: 10, interval: 2.5 }  // Day10: delay 8→10
        ]
    }),
    
    // W2 - 首次出现胖尸
    // Day10: dpGrant 3→4, 首次 Z3 需要更多资源应对
    createWaveConfig({
        wave: 2,
        deployFastTime: 7,
        deployTuneTime: 3,
        estimatedCombatTime: 45,
        dpGrant: 4,  // Day10: 3→4
        enemies: [
            { type: EnemyType.Z1_Walker, count: 10, interval: 2.5 },
            { type: EnemyType.Z2_Runner, count: 5, delay: 10, interval: 2 },  // Day10: 6→5
            { type: EnemyType.Z3_Tank, count: 1, delay: 22, interval: 0 }     // Day10: delay 20→22
        ]
    }),
    
    // W3 - 压力升级
    // Day10: Z3 interval 8→10, 分散 cluster
    createWaveConfig({
        wave: 3,
        deployFastTime: 7,
        deployTuneTime: 3,
        estimatedCombatTime: 50,
        dpGrant: 3,
        enemies: [
            { type: EnemyType.Z1_Walker, count: 12, interval: 2 },
            { type: EnemyType.Z2_Runner, count: 7, delay: 10, interval: 1.8 },  // Day10: 8→7
            { type: EnemyType.Z3_Tank, count: 2, delay: 28, interval: 10 }      // Day10: delay 25→28, interval 8→10
        ]
    }),
    
    // W4 高潮波 - 大量混合
    // Day10: Z3 interval 8→9, dpGrant 4→5
    createWaveConfig({
        wave: 4,
        deployFastTime: 8,
        deployTuneTime: 4,
        estimatedCombatTime: 60,
        dpGrant: 5,  // Day10: 4→5
        enemies: [
            { type: EnemyType.Z1_Walker, count: 14, interval: 1.8 },  // Day10: 15→14
            { type: EnemyType.Z2_Runner, count: 9, delay: 8, interval: 1.5 },   // Day10: 10→9
            { type: EnemyType.Z3_Tank, count: 3, delay: 22, interval: 9 }       // Day10: delay 20→22, interval 8→9
        ]
    }),
    
    // W5 Boss 波 - 尸潮
    // Day10: dpGrant 4→5, Z3 interval 6→8
    createWaveConfig({
        wave: 5,
        deployFastTime: 10,
        deployTuneTime: 4,
        estimatedCombatTime: 80,
        dpGrant: 5,  // Day10: 4→5
        enemies: [
            { type: EnemyType.Z1_Walker, count: 18, interval: 1.5 },  // Day10: 20→18
            { type: EnemyType.Z2_Runner, count: 13, delay: 10, interval: 1.5 }, // Day10: 15→13
            { type: EnemyType.Z3_Tank, count: 5, delay: 28, interval: 8 }       // Day10: 6→5, delay 25→28, interval 6→8
        ]
    })
];

/**
 * 关卡配置表
 */
export const LEVEL_CONFIGS: Record<LevelId, LevelConfig> = {
    [LevelId.L1]: {
        id: LevelId.L1,
        name: '首关',
        description: '学习基础，熟悉操作',
        baseScrapReward: 30,
        waves: L1_WAVE_CONFIGS
    },
    [LevelId.L2]: {
        id: LevelId.L2,
        name: '进阶',
        description: '尸潮汹涌，考验策略',
        baseScrapReward: 45,
        waves: L2_WAVE_CONFIGS
    }
};

/**
 * 获取关卡配置
 */
export function getLevelConfig(levelId: LevelId): LevelConfig {
    return LEVEL_CONFIGS[levelId];
}

/**
 * 获取关卡波次配置
 */
export function getLevelWaves(levelId: LevelId): WaveConfig[] {
    return LEVEL_CONFIGS[levelId]?.waves || L1_WAVE_CONFIGS;
}

/**
 * 获取关卡基础残骸奖励
 */
export function getLevelBaseScrap(levelId: LevelId): number {
    return LEVEL_CONFIGS[levelId]?.baseScrapReward || 30;
}

/**
 * 计算关卡总敌人数
 */
export function getLevelTotalEnemies(levelId: LevelId): number {
    const waves = getLevelWaves(levelId);
    return waves.reduce((sum, wave) => sum + wave.getTotalEnemies(), 0);
}

/**
 * 计算关卡总 DP 发放
 */
export function getLevelTotalDpGrant(levelId: LevelId): number {
    const waves = getLevelWaves(levelId);
    return waves.reduce((sum, wave) => sum + wave.dpGrant, 0);
}

/**
 * 敌人属性配置
 * 基准：Z1 血量 = 10 HP
 */
export const ENEMY_STATS: Record<EnemyType, {
    hp: number;
    speed: number;          // 移动速度（相对值）
    damage: number;         // 对据点伤害
    scrapDrop: number;      // 击杀掉落残骸
}> = {
    [EnemyType.Z1_Walker]: {
        hp: 10,
        speed: 1.0,
        damage: 5,
        scrapDrop: 1
    },
    [EnemyType.Z2_Runner]: {
        hp: 8,
        speed: 1.7,         // 到据点约 7s vs Z1 的 12s
        damage: 5,
        scrapDrop: 2
    },
    [EnemyType.Z3_Tank]: {
        hp: 50,
        speed: 0.67,        // 到据点约 18s
        damage: 15,
        scrapDrop: 5
    }
};
