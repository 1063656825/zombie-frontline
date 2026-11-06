/**
 * BuildingConfig.ts
 * 建筑配置数据
 * 定义三种建筑的属性、费用、升级数值
 */

/**
 * 建筑类型枚举
 */
export enum BuildingType {
    MachineGun = 'MachineGun',   // 机枪塔
    Cannon = 'Cannon',           // 炮轰塔
    Mine = 'Mine'                // 地雷
}

/**
 * 建筑等级
 */
export enum BuildingLevel {
    L1 = 1,
    L2 = 2
}

/**
 * 建筑属性配置
 */
export interface BuildingStats {
    type: BuildingType;
    level: BuildingLevel;
    dpCost: number;              // DP 费用
    dps: number;                 // 每秒伤害
    range: number;               // 射程（相对值）
    fireRate: number;            // 射速（每秒攻击次数）
    aoeRadius?: number;          // AOE 半径（仅炮轰）
    tankBonus?: number;          // 对胖尸伤害系数
    penetration?: number;        // 穿透数量（机枪 L2）
    triggerDamage?: number;      // 触发伤害（地雷）
    triggerRadius?: number;      // 触发半径（地雷）
}

/**
 * 建筑配置表
 * 参考设计文档 §3
 * Day10: 平衡调参，见 BALANCE.md
 */
export const BUILDING_CONFIGS: Record<string, BuildingStats> = {
    // ========== 机枪塔 ==========
    'MachineGun_L1': {
        type: BuildingType.MachineGun,
        level: BuildingLevel.L1,
        dpCost: 2,
        dps: 7,      // Day10: 6→7, 应对 W2 Z2 rush，提升 TTK
        range: 1.0,
        fireRate: 4
    },
    'MachineGun_L2': {
        type: BuildingType.MachineGun,
        level: BuildingLevel.L2,
        dpCost: 4,   // 合成不额外消耗
        dps: 15,     // Day10: 14→15, 保持 L2 相对 L1 的 DPS 倍率
        range: 1.2,
        fireRate: 5,
        penetration: 1
    },
    
    // ========== 炮轰塔 ==========
    'Cannon_L1': {
        type: BuildingType.Cannon,
        level: BuildingLevel.L1,
        dpCost: 3,
        dps: 4,
        range: 1.2,
        fireRate: 0.8,
        aoeRadius: 0.8,
        tankBonus: 1.6  // Day10: 1.5→1.6, 缓解 W4/W5 Z3 压力
    },
    'Cannon_L2': {
        type: BuildingType.Cannon,
        level: BuildingLevel.L2,
        dpCost: 6,
        dps: 10,     // Day10: 9→10, 提升 Z3 cluster 处理能力
        range: 1.4,
        fireRate: 1.0,
        aoeRadius: 1.2,
        tankBonus: 2.2  // Day10: 2.0→2.2, 对抗 L2 大量 Z3
    },
    
    // ========== 地雷 ==========
    'Mine_L1': {
        type: BuildingType.Mine,
        level: BuildingLevel.L1,
        dpCost: 1,
        dps: 0,
        range: 0,
        fireRate: 0,
        triggerDamage: 28,   // Day10: 25→28, 配合火力加成可一击 Z2
        triggerRadius: 1.2
    },
    'Mine_L2': {
        type: BuildingType.Mine,
        level: BuildingLevel.L2,
        dpCost: 2,
        dps: 0,
        range: 0,
        fireRate: 0,
        triggerDamage: 60,   // Day10: 55→60, 保持 L2 相对 L1 的伤害倍率
        triggerRadius: 1.6
    }
};

/**
 * 获取建筑配置
 */
export function getBuildingConfig(type: BuildingType, level: BuildingLevel): BuildingStats | null {
    const key = `${type}_L${level}`;
    return BUILDING_CONFIGS[key] || null;
}

/**
 * 检查是否可以合成
 * 规则：仅同种类 L1+L1→L2；不可 L2 再合
 */
export function canMerge(building1: BuildingStats, building2: BuildingStats): boolean {
    return building1.type === building2.type &&
           building1.level === BuildingLevel.L1 &&
           building2.level === BuildingLevel.L1;
}

/**
 * 获取合成结果
 */
export function getMergeResult(type: BuildingType): BuildingStats | null {
    return getBuildingConfig(type, BuildingLevel.L2);
}

/**
 * 建筑显示颜色（占位用）
 */
export const BUILDING_COLORS: Record<BuildingType, string> = {
    [BuildingType.MachineGun]: '#4CAF50',  // 绿色
    [BuildingType.Cannon]: '#FF9800',       // 橙色
    [BuildingType.Mine]: '#9C27B0'          // 紫色
};

/**
 * 建筑中文名称
 */
export const BUILDING_NAMES: Record<BuildingType, string> = {
    [BuildingType.MachineGun]: '机枪塔',
    [BuildingType.Cannon]: '炮轰塔',
    [BuildingType.Mine]: '地雷'
};
