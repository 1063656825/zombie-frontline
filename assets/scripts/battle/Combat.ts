/**
 * Combat.ts
 * 战斗系统空壳
 * Day3 实现完整的弹道/扫描攻击、伤害计算、盾怪朝向判定等
 */

import { _decorator, Component, Node, Vec3, EventTarget } from 'cc';
import { EnemyType, ENEMY_STATS } from './WaveConfig';
import { BuildingType, getBuildingConfig, BuildingLevel } from './BuildingConfig';
import { GameData } from '../data/GameData';

const { ccclass, property } = _decorator;

// 战斗事件
export const CombatEvents = new EventTarget();
export const EVENT_ENEMY_DAMAGED = 'enemy_damaged';
export const EVENT_ENEMY_KILLED = 'enemy_killed';
export const EVENT_BASE_DAMAGED = 'base_damaged';

/**
 * 敌人实例数据
 */
export interface EnemyInstance {
    id: string;
    type: EnemyType;
    hp: number;
    maxHp: number;
    position: Vec3;
    node: Node | null;
    isDead: boolean;
}

/**
 * 子弹/弹道数据
 */
export interface Projectile {
    id: string;
    sourceType: 'building' | 'player';
    damage: number;
    position: Vec3;
    target: EnemyInstance | null;
    isAOE: boolean;
    aoeRadius?: number;
    node: Node | null;
}

@ccclass('Combat')
export class Combat extends Component {
    
    // 敌人列表
    private _enemies: Map<string, EnemyInstance> = new Map();
    private _enemyIdCounter = 0;
    
    // 子弹列表
    private _projectiles: Projectile[] = [];
    private _projectileIdCounter = 0;
    
    // 主角朝向（用于点屏转向）
    private _playerAimDirection: Vec3 = new Vec3(0, 1, 0);
    
    // 主角射击配置
    private readonly PLAYER_DPS = 4;
    private readonly PLAYER_FIRE_RATE = 2;  // 每秒攻击次数
    private _playerFireTimer = 0;
    
    /**
     * 生成敌人
     */
    spawnEnemy(type: EnemyType, position: Vec3): EnemyInstance {
        const stats = ENEMY_STATS[type];
        const id = `enemy_${++this._enemyIdCounter}`;
        
        const enemy: EnemyInstance = {
            id,
            type,
            hp: stats.hp,
            maxHp: stats.hp,
            position: position.clone(),
            node: null,  // Day3 创建实际节点
            isDead: false
        };
        
        this._enemies.set(id, enemy);
        console.log(`[Combat] 生成敌人: ${type} at (${position.x}, ${position.y})`);
        
        return enemy;
    }
    
    /**
     * 对敌人造成伤害
     */
    damageEnemy(enemy: EnemyInstance, damage: number): boolean {
        if (enemy.isDead) return false;
        
        // 应用火力加成
        const bonusPercent = GameData.getFirepowerBonus();
        const finalDamage = damage * (1 + bonusPercent / 100);
        
        enemy.hp -= finalDamage;
        CombatEvents.emit(EVENT_ENEMY_DAMAGED, enemy, finalDamage);
        
        console.log(`[Combat] ${enemy.type} 受到 ${finalDamage.toFixed(1)} 伤害, 剩余 HP: ${enemy.hp.toFixed(1)}`);
        
        if (enemy.hp <= 0) {
            this.killEnemy(enemy);
            return true;
        }
        
        return false;
    }
    
    /**
     * 击杀敌人
     */
    private killEnemy(enemy: EnemyInstance) {
        enemy.isDead = true;
        enemy.hp = 0;
        
        // 掉落残骸
        const stats = ENEMY_STATS[enemy.type];
        // Day5 处理残骸掉落
        
        console.log(`[Combat] 击杀敌人: ${enemy.type}`);
        CombatEvents.emit(EVENT_ENEMY_KILLED, enemy);
        
        // 从列表移除
        this._enemies.delete(enemy.id);
        
        if (enemy.node) {
            enemy.node.destroy();
        }
    }
    
    /**
     * 敌人攻击据点
     */
    enemyAttackBase(enemy: EnemyInstance) {
        const stats = ENEMY_STATS[enemy.type];
        GameData.hp -= stats.damage;
        
        console.log(`[Combat] ${enemy.type} 攻击据点，造成 ${stats.damage} 伤害`);
        CombatEvents.emit(EVENT_BASE_DAMAGED, enemy, stats.damage);
        
        // 敌人攻击后消失
        this.killEnemy(enemy);
    }
    
    /**
     * 设置主角朝向（点屏转向）
     */
    setPlayerAimDirection(direction: Vec3) {
        this._playerAimDirection = direction.normalize();
    }
    
    /**
     * 设置主角朝向（世界坐标目标点）
     */
    aimAtPosition(targetPos: Vec3, playerPos: Vec3) {
        const direction = new Vec3();
        Vec3.subtract(direction, targetPos, playerPos);
        direction.z = 0;
        this.setPlayerAimDirection(direction);
    }
    
    /**
     * 获取存活敌人数量
     */
    getAliveEnemyCount(): number {
        return this._enemies.size;
    }
    
    /**
     * 获取所有存活敌人
     */
    getAllEnemies(): EnemyInstance[] {
        return Array.from(this._enemies.values());
    }
    
    /**
     * 查找最近的敌人
     */
    findNearestEnemy(position: Vec3): EnemyInstance | null {
        let nearest: EnemyInstance | null = null;
        let minDist = Infinity;
        
        for (const enemy of this._enemies.values()) {
            const dist = Vec3.distance(position, enemy.position);
            if (dist < minDist) {
                minDist = dist;
                nearest = enemy;
            }
        }
        
        return nearest;
    }
    
    /**
     * 查找范围内的敌人
     */
    findEnemiesInRange(position: Vec3, range: number): EnemyInstance[] {
        const result: EnemyInstance[] = [];
        
        for (const enemy of this._enemies.values()) {
            if (Vec3.distance(position, enemy.position) <= range) {
                result.push(enemy);
            }
        }
        
        return result;
    }
    
    /**
     * 清空所有战斗实体
     */
    clearAll() {
        for (const enemy of this._enemies.values()) {
            if (enemy.node) {
                enemy.node.destroy();
            }
        }
        this._enemies.clear();
        
        for (const proj of this._projectiles) {
            if (proj.node) {
                proj.node.destroy();
            }
        }
        this._projectiles = [];
        
        console.log('[Combat] 已清空所有战斗实体');
    }
    
    update(dt: number) {
        // Day3 实现：
        // - 敌人移动
        // - 建筑自动索敌开火
        // - 主角射击
        // - 子弹移动与碰撞
        // - 地雷触发
    }
}
