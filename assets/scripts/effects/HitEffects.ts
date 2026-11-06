/**
 * HitEffects.ts
 * Day8: 受击视觉反馈 - 闪白 + 击退
 */

import { Node, Color, Graphics, Vec3, tween, Tween } from 'cc';
import { EnemyType } from '../battle/WaveConfig';

// 闪白时长配置
export const FLASH_DURATION_MIN = 0.08;
export const FLASH_DURATION_MAX = 0.15;
export const FLASH_DURATION_DEFAULT = 0.1;

// 击退配置
export const KNOCKBACK_BASE_DISTANCE = 15;  // 基础击退距离（像素）
export const KNOCKBACK_Z1_MULTIPLIER = 1.0;
export const KNOCKBACK_Z2_MULTIPLIER = 1.2; // 快跑尸略多
export const KNOCKBACK_Z3_MULTIPLIER = 0.4; // 胖尸大幅减少

// 据点边界（防止击退到据点内）
export const BASE_Y_THRESHOLD = -400;

/**
 * 闪白效果类型
 */
export enum FlashType {
    Enemy = 'enemy',
    Base = 'base'
}

/**
 * 限制闪白时长在合理范围
 */
export function clampFlashDuration(duration: number): number {
    return Math.max(FLASH_DURATION_MIN, Math.min(FLASH_DURATION_MAX, duration));
}

/**
 * 获取敌人类型的击退倍率
 */
export function getKnockbackMultiplier(enemyType: EnemyType): number {
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

/**
 * 计算击退向量
 * @param enemyType 敌人类型
 * @param damageSourcePos 伤害来源位置（可选，用于计算击退方向）
 * @param enemyPos 敌人当前位置
 * @param pathDirection 敌人沿路径的行进方向（归一化）
 * @returns 击退偏移向量
 */
export function calculateKnockbackVector(
    enemyType: EnemyType,
    enemyPos: Vec3,
    damageSourcePos: Vec3 | null,
    pathDirection: Vec3 | null
): Vec3 {
    const multiplier = getKnockbackMultiplier(enemyType);
    const distance = KNOCKBACK_BASE_DISTANCE * multiplier;
    
    if (distance <= 0) {
        return new Vec3(0, 0, 0);
    }
    
    let knockbackDir: Vec3;
    
    if (damageSourcePos) {
        // 从伤害源向外推
        knockbackDir = new Vec3();
        Vec3.subtract(knockbackDir, enemyPos, damageSourcePos);
        knockbackDir.z = 0;
        
        if (knockbackDir.length() > 0.001) {
            knockbackDir.normalize();
        } else {
            // 如果重合，沿路径反方向
            knockbackDir = pathDirection ? pathDirection.clone().negative() : new Vec3(0, 1, 0);
        }
    } else if (pathDirection) {
        // 沿路径反方向推
        knockbackDir = pathDirection.clone().negative();
    } else {
        // 默认向上推
        knockbackDir = new Vec3(0, 1, 0);
    }
    
    knockbackDir.normalize();
    knockbackDir.multiplyScalar(distance);
    
    return knockbackDir;
}

/**
 * 应用击退并限制位置
 * @param currentPos 当前位置
 * @param knockbackVec 击退向量
 * @returns 击退后的新位置（已限制不穿过据点）
 */
export function applyKnockbackWithClamp(currentPos: Vec3, knockbackVec: Vec3): Vec3 {
    const newPos = currentPos.clone();
    newPos.add(knockbackVec);
    
    // 限制 Y 不低于据点门槛，防止击退直接到据点
    if (newPos.y < BASE_Y_THRESHOLD) {
        newPos.y = BASE_Y_THRESHOLD;
    }
    
    return newPos;
}

/**
 * 敌人闪白效果
 * 对节点应用短暂白色叠加，然后恢复
 */
export function flashEnemy(
    node: Node,
    duration: number = FLASH_DURATION_DEFAULT,
    onComplete?: () => void
): Tween<Node> | null {
    if (!node || !node.isValid) return null;
    
    const graphics = node.getComponent(Graphics);
    if (!graphics) return null;
    
    // 保存原始颜色
    const originalFillColor = graphics.fillColor.clone();
    
    // 设置白色
    graphics.fillColor = new Color(255, 255, 255, 255);
    
    // 使用 tween 恢复
    const clampedDuration = clampFlashDuration(duration);
    
    const tw = tween(node)
        .delay(clampedDuration)
        .call(() => {
            if (node.isValid && graphics.isValid) {
                graphics.fillColor = originalFillColor;
            }
            onComplete?.();
        })
        .start();
    
    return tw;
}

/**
 * 据点受击闪烁（轻微红色叠加）
 */
export function flashBase(
    node: Node,
    duration: number = 0.12,
    onComplete?: () => void
): Tween<Node> | null {
    if (!node || !node.isValid) return null;
    
    const graphics = node.getComponent(Graphics);
    if (!graphics) return null;
    
    const originalFillColor = graphics.fillColor.clone();
    
    // 轻微红色叠加
    graphics.fillColor = new Color(255, 100, 100, 255);
    
    const tw = tween(node)
        .delay(duration)
        .call(() => {
            if (node.isValid && graphics.isValid) {
                graphics.fillColor = originalFillColor;
            }
            onComplete?.();
        })
        .start();
    
    return tw;
}

/**
 * 应用击退动画
 * @param node 敌人节点
 * @param targetPos 目标位置
 * @param duration 动画时长
 */
export function animateKnockback(
    node: Node,
    targetPos: Vec3,
    duration: number = 0.1
): Tween<Node> | null {
    if (!node || !node.isValid) return null;
    
    return tween(node)
        .to(duration, { position: targetPos })
        .start();
}
