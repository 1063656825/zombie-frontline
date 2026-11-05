/**
 * WaveConfig.ts
 * 波次配置数据
 * 定义每波的敌人组成、部署点发放、时长等
 */

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
 */
export const WAVE_CONFIGS: WaveConfig[] = [
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
    createWaveConfig({
        wave: 2,
        deployFastTime: 8,
        deployTuneTime: 4,
        estimatedCombatTime: 40,
        dpGrant: 4,
        enemies: [
            { type: EnemyType.Z1_Walker, count: 8, interval: 3 },
            { type: EnemyType.Z2_Runner, count: 4, delay: 10, interval: 2 }
        ],
        tutorial: '快跑尸移动速度快，用地雷卡口'
    }),
    
    // W3 - 引入合成
    createWaveConfig({
        wave: 3,
        deployFastTime: 8,
        deployTuneTime: 4,
        estimatedCombatTime: 45,
        dpGrant: 3,
        enemies: [
            { type: EnemyType.Z1_Walker, count: 10, interval: 2.5 },
            { type: EnemyType.Z2_Runner, count: 6, delay: 15, interval: 2 }
        ],
        tutorial: '相同建筑叠一起可合成升级'
    }),
    
    // W4 小高潮 - 引入胖尸
    createWaveConfig({
        wave: 4,
        deployFastTime: 8,
        deployTuneTime: 4,
        estimatedCombatTime: 55,
        dpGrant: 4,
        enemies: [
            { type: EnemyType.Z1_Walker, count: 12, interval: 2 },
            { type: EnemyType.Z2_Runner, count: 6, delay: 10, interval: 2.5 },
            { type: EnemyType.Z3_Tank, count: 2, delay: 25, interval: 10 }
        ],
        tutorial: '胖尸血厚，用炮轰建筑更有效'
    }),
    
    // W5 Boss 波
    createWaveConfig({
        wave: 5,
        deployFastTime: 10,
        deployTuneTime: 5,
        estimatedCombatTime: 70,
        dpGrant: 5,
        enemies: [
            { type: EnemyType.Z1_Walker, count: 15, interval: 2 },
            { type: EnemyType.Z2_Runner, count: 10, delay: 15, interval: 2 },
            { type: EnemyType.Z3_Tank, count: 4, delay: 30, interval: 8 }
        ]
    })
];

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
