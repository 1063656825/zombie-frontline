/**
 * Combat.ts
 * 战斗系统
 * Day3: 敌人移动、建筑开火、地雷触发、主角射击
 */

import { _decorator, Component, Node, Vec3, EventTarget, Graphics, Color, UITransform } from 'cc';
import { EnemyType, ENEMY_STATS } from './WaveConfig';
import { BuildingType, getBuildingConfig, BuildingLevel } from './BuildingConfig';
import { GameData } from '../data/GameData';
import { GridBuild, PlacedBuilding, GridPosition } from './GridBuild';
import { PlaceholderGraphics, PLACEHOLDER_COLORS } from '../ui/PlaceholderGraphics';
import { MetaData, DAMAGE_REDUCTION_PERCENT } from '../data/MetaData';

const { ccclass, property } = _decorator;

// 战斗事件
export const CombatEvents = new EventTarget();
export const EVENT_ENEMY_DAMAGED = 'enemy_damaged';
export const EVENT_ENEMY_KILLED = 'enemy_killed';
export const EVENT_BASE_DAMAGED = 'base_damaged';
export const EVENT_MINE_TRIGGERED = 'mine_triggered';

/**
 * 路径点
 */
export interface PathPoint {
    position: Vec3;
    isEnd: boolean;  // 是否到达终点（据点）
}

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
    currentPathIndex: number;  // 当前路径点索引
    pathPoints: PathPoint[];   // 路径点列表
}

/**
 * 子弹数据
 */
export interface Projectile {
    id: string;
    sourceType: 'building' | 'player';
    sourceId: string;
    damage: number;
    position: Vec3;
    velocity: Vec3;
    target: EnemyInstance | null;
    isAOE: boolean;
    aoeRadius: number;
    tankBonus: number;
    node: Node | null;
    lifetime: number;
}

/**
 * 建筑攻击状态
 */
interface BuildingCombatState {
    buildingId: string;
    lastFireTime: number;
    target: EnemyInstance | null;
}

@ccclass('Combat')
export class Combat extends Component {
    
    @property(GridBuild)
    gridBuild: GridBuild | null = null;
    
    @property(Node)
    enemyContainer: Node | null = null;
    
    @property(Node)
    projectileContainer: Node | null = null;
    
    // 敌人列表
    private _enemies: Map<string, EnemyInstance> = new Map();
    private _enemyIdCounter = 0;
    
    // 子弹列表
    private _projectiles: Projectile[] = [];
    private _projectileIdCounter = 0;
    
    // 建筑攻击状态
    private _buildingStates: Map<string, BuildingCombatState> = new Map();
    
    // 主角配置
    private readonly PLAYER_POSITION = new Vec3(0, -450, 0);  // 据点位置
    private readonly PLAYER_DPS = 4;
    private readonly PLAYER_FIRE_RATE = 2;  // 每秒攻击次数
    private readonly PLAYER_RANGE = 500;    // 射程
    private readonly PLAYER_AIM_ANGLE = 60; // 瞄准扇形角度（度）
    private _playerAimDirection: Vec3 = new Vec3(0, 1, 0);
    private _playerFireTimer = 0;
    
    // 敌人路径配置（两条路径：左侧和右侧）
    private readonly PATH_LEFT: PathPoint[] = [
        { position: new Vec3(-120, 450, 0), isEnd: false },
        { position: new Vec3(-120, 200, 0), isEnd: false },
        { position: new Vec3(-80, 50, 0), isEnd: false },
        { position: new Vec3(0, -100, 0), isEnd: false },
        { position: new Vec3(0, -450, 0), isEnd: true }
    ];
    
    private readonly PATH_RIGHT: PathPoint[] = [
        { position: new Vec3(120, 450, 0), isEnd: false },
        { position: new Vec3(120, 200, 0), isEnd: false },
        { position: new Vec3(80, 50, 0), isEnd: false },
        { position: new Vec3(0, -100, 0), isEnd: false },
        { position: new Vec3(0, -450, 0), isEnd: true }
    ];
    
    // 敌人基础移动速度（像素/秒）
    private readonly BASE_MOVE_SPEED = 60;
    
    // 战斗是否激活
    private _isActive: boolean = false;
    
    // 击杀回调
    private _onEnemyKilledCallback: (() => void) | null = null;
    
    /**
     * 设置击杀回调
     */
    setOnEnemyKilledCallback(callback: () => void) {
        this._onEnemyKilledCallback = callback;
    }
    
    /**
     * 激活/停用战斗系统
     */
    setActive(active: boolean) {
        this._isActive = active;
        console.log(`[Combat] 战斗系统: ${active ? '激活' : '停用'}`);
    }
    
    /**
     * 生成敌人
     */
    spawnEnemy(type: EnemyType, spawnPosition: Vec3, useLeftPath: boolean = true): EnemyInstance {
        const stats = ENEMY_STATS[type];
        const id = `enemy_${++this._enemyIdCounter}`;
        
        // 选择路径
        const pathTemplate = useLeftPath ? this.PATH_LEFT : this.PATH_RIGHT;
        const pathPoints = pathTemplate.map(p => ({
            position: p.position.clone(),
            isEnd: p.isEnd
        }));
        
        // 设置起始位置为路径第一个点
        const startPos = pathPoints[0].position.clone();
        
        const enemy: EnemyInstance = {
            id,
            type,
            hp: stats.hp,
            maxHp: stats.hp,
            position: startPos,
            node: null,
            isDead: false,
            currentPathIndex: 0,
            pathPoints
        };
        
        // 创建敌人节点
        this.createEnemyNode(enemy);
        
        this._enemies.set(id, enemy);
        console.log(`[Combat] 生成敌人: ${type} (${useLeftPath ? '左' : '右'}路)`);
        
        return enemy;
    }
    
    /**
     * 创建敌人节点
     */
    private createEnemyNode(enemy: EnemyInstance) {
        const container = this.enemyContainer || this.node;
        const enemyNode = PlaceholderGraphics.createEnemy(container, enemy.type);
        enemyNode.setPosition(enemy.position);
        enemy.node = enemyNode;
    }
    
    /**
     * 对敌人造成伤害
     */
    damageEnemy(enemy: EnemyInstance, damage: number, tankBonus: number = 1): boolean {
        if (enemy.isDead) return false;
        
        // 应用火力加成
        const bonusPercent = GameData.getFirepowerBonus();
        let finalDamage = damage * (1 + bonusPercent / 100);
        
        // 对胖尸应用额外系数
        if (enemy.type === EnemyType.Z3_Tank && tankBonus > 1) {
            finalDamage *= tankBonus;
        }
        
        enemy.hp -= finalDamage;
        CombatEvents.emit(EVENT_ENEMY_DAMAGED, enemy, finalDamage);
        
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
        
        console.log(`[Combat] 击杀敌人: ${enemy.type}`);
        CombatEvents.emit(EVENT_ENEMY_KILLED, enemy);
        
        // 从列表移除
        this._enemies.delete(enemy.id);
        
        if (enemy.node) {
            enemy.node.destroy();
        }
        
        // 通知 BattleFlow
        if (this._onEnemyKilledCallback) {
            this._onEnemyKilledCallback();
        }
    }
    
    /**
     * 敌人到达据点
     */
    private enemyReachBase(enemy: EnemyInstance) {
        const stats = ENEMY_STATS[enemy.type];
        let damage = stats.damage;
        
        // Day6: 城防线 B≥4 受击减伤 3%
        if (GameData.hasDamageReduction()) {
            const reduction = damage * (DAMAGE_REDUCTION_PERCENT / 100);
            damage = Math.max(1, damage - reduction);
        }
        
        GameData.hp -= damage;
        
        console.log(`[Combat] ${enemy.type} 到达据点，造成 ${damage.toFixed(1)} 伤害，剩余 HP: ${GameData.hp}`);
        CombatEvents.emit(EVENT_BASE_DAMAGED, enemy, damage);
        
        // 敌人到达后消失
        this.killEnemy(enemy);
    }
    
    /**
     * 设置主角朝向（点屏转向）
     */
    setPlayerAimDirection(direction: Vec3) {
        if (direction.length() > 0.001) {
            this._playerAimDirection = direction.clone().normalize();
        }
    }
    
    /**
     * 设置主角朝向（世界坐标目标点）
     */
    aimAtPosition(targetPos: Vec3) {
        const direction = new Vec3();
        Vec3.subtract(direction, targetPos, this.PLAYER_POSITION);
        direction.z = 0;
        this.setPlayerAimDirection(direction);
    }
    
    /**
     * 获取主角朝向
     */
    getPlayerAimDirection(): Vec3 {
        return this._playerAimDirection.clone();
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
    findNearestEnemy(position: Vec3, maxRange?: number): EnemyInstance | null {
        let nearest: EnemyInstance | null = null;
        let minDist = maxRange ?? Infinity;
        
        for (const enemy of this._enemies.values()) {
            if (enemy.isDead) continue;
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
            if (enemy.isDead) continue;
            if (Vec3.distance(position, enemy.position) <= range) {
                result.push(enemy);
            }
        }
        
        return result;
    }
    
    /**
     * 查找扇形范围内的敌人
     */
    findEnemiesInCone(position: Vec3, direction: Vec3, range: number, angleInDegrees: number): EnemyInstance[] {
        const result: EnemyInstance[] = [];
        const halfAngle = angleInDegrees / 2 * Math.PI / 180;
        const dirNorm = direction.clone().normalize();
        
        for (const enemy of this._enemies.values()) {
            if (enemy.isDead) continue;
            
            const toEnemy = new Vec3();
            Vec3.subtract(toEnemy, enemy.position, position);
            const dist = toEnemy.length();
            
            if (dist > range || dist < 0.001) continue;
            
            toEnemy.normalize();
            const dot = Vec3.dot(dirNorm, toEnemy);
            const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
            
            if (angle <= halfAngle) {
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
        this._buildingStates.clear();
        
        console.log('[Combat] 已清空所有战斗实体');
    }
    
    update(dt: number) {
        if (!this._isActive) return;
        
        // 更新敌人移动
        this.updateEnemyMovement(dt);
        
        // 更新建筑开火
        this.updateBuildingAttacks(dt);
        
        // 更新主角射击
        this.updatePlayerAttack(dt);
        
        // 检查地雷触发
        this.checkMineTriggers();
        
        // 更新子弹
        this.updateProjectiles(dt);
    }
    
    /**
     * 更新敌人移动
     */
    private updateEnemyMovement(dt: number) {
        for (const enemy of this._enemies.values()) {
            if (enemy.isDead) continue;
            
            const currentTarget = enemy.pathPoints[enemy.currentPathIndex];
            if (!currentTarget) continue;
            
            // 计算移动方向和距离
            const toTarget = new Vec3();
            Vec3.subtract(toTarget, currentTarget.position, enemy.position);
            const distToTarget = toTarget.length();
            
            // 获取敌人速度
            const stats = ENEMY_STATS[enemy.type];
            const moveSpeed = this.BASE_MOVE_SPEED * stats.speed;
            const moveDistance = moveSpeed * dt;
            
            if (distToTarget <= moveDistance) {
                // 到达当前路径点
                enemy.position.set(currentTarget.position);
                
                if (currentTarget.isEnd) {
                    // 到达终点（据点）
                    this.enemyReachBase(enemy);
                } else {
                    // 前往下一个路径点
                    enemy.currentPathIndex++;
                }
            } else {
                // 移动向目标
                toTarget.normalize();
                toTarget.multiplyScalar(moveDistance);
                enemy.position.add(toTarget);
            }
            
            // 更新节点位置
            if (enemy.node) {
                enemy.node.setPosition(enemy.position);
            }
        }
    }
    
    /**
     * 更新建筑攻击
     */
    private updateBuildingAttacks(dt: number) {
        if (!this.gridBuild) return;
        
        const buildings = this.gridBuild.getAllBuildings();
        
        for (const building of buildings) {
            // 地雷不主动攻击
            if (building.type === BuildingType.Mine) continue;
            
            const config = getBuildingConfig(building.type, building.level);
            if (!config || config.dps <= 0) continue;
            
            // 获取建筑世界坐标
            const buildingPos = this.gridBuild.gridToWorld(building.gridPos);
            
            // 获取或创建攻击状态
            let state = this._buildingStates.get(building.id);
            if (!state) {
                state = {
                    buildingId: building.id,
                    lastFireTime: 0,
                    target: null
                };
                this._buildingStates.set(building.id, state);
            }
            
            // 计算射程（相对值转像素）
            const range = config.range * 200;
            
            // 寻找目标
            const target = this.findNearestEnemy(buildingPos, range);
            state.target = target;
            
            if (!target) continue;
            
            // 检查射击间隔
            state.lastFireTime += dt;
            const fireInterval = 1 / config.fireRate;
            
            if (state.lastFireTime >= fireInterval) {
                state.lastFireTime = 0;
                
                // 计算伤害 (Day6: 应用火力加成)
                let damagePerShot = config.dps / config.fireRate;
                const firepowerBonus = GameData.getFirepowerBonus();
                if (firepowerBonus > 0) {
                    damagePerShot *= (1 + firepowerBonus / 100);
                }
                
                // 炮轰是 AOE
                if (building.type === BuildingType.Cannon && config.aoeRadius) {
                    const enemies = this.findEnemiesInRange(target.position, config.aoeRadius * 80);
                    for (const e of enemies) {
                        this.damageEnemy(e, damagePerShot * 0.7, config.tankBonus || 1);
                    }
                    // 主目标受全额伤害
                    this.damageEnemy(target, damagePerShot * 0.3, config.tankBonus || 1);
                } else {
                    // 单体攻击
                    this.damageEnemy(target, damagePerShot);
                }
                
                // 视觉反馈（简单闪烁）
                if (building.node) {
                    this.flashNode(building.node);
                }
            }
        }
    }
    
    /**
     * 更新主角射击
     */
    private updatePlayerAttack(dt: number) {
        this._playerFireTimer += dt;
        
        const fireInterval = 1 / this.PLAYER_FIRE_RATE;
        if (this._playerFireTimer < fireInterval) return;
        
        // 寻找扇形范围内的敌人
        const targets = this.findEnemiesInCone(
            this.PLAYER_POSITION,
            this._playerAimDirection,
            this.PLAYER_RANGE,
            this.PLAYER_AIM_ANGLE
        );
        
        if (targets.length === 0) return;
        
        this._playerFireTimer = 0;
        
        // 攻击最近的敌人
        const target = targets.reduce((nearest, e) => {
            const distA = Vec3.distance(this.PLAYER_POSITION, nearest.position);
            const distB = Vec3.distance(this.PLAYER_POSITION, e.position);
            return distB < distA ? e : nearest;
        });
        
        // Day6: 主角也应用火力加成
        let damagePerShot = this.PLAYER_DPS / this.PLAYER_FIRE_RATE;
        const firepowerBonus = GameData.getFirepowerBonus();
        if (firepowerBonus > 0) {
            damagePerShot *= (1 + firepowerBonus / 100);
        }
        
        this.damageEnemy(target, damagePerShot);
        
        console.log(`[Combat] 主角射击 ${target.type}，造成 ${damagePerShot.toFixed(1)} 伤害`);
    }
    
    /**
     * 检查地雷触发
     */
    private checkMineTriggers() {
        if (!this.gridBuild) return;
        
        const buildings = this.gridBuild.getAllBuildings();
        const minesToRemove: GridPosition[] = [];
        
        for (const building of buildings) {
            if (building.type !== BuildingType.Mine) continue;
            
            const config = getBuildingConfig(building.type, building.level);
            if (!config) continue;
            
            const minePos = this.gridBuild.gridToWorld(building.gridPos);
            const triggerRadius = (config.triggerRadius || 1) * 40;
            
            // 检查是否有敌人踩上
            const enemies = this.findEnemiesInRange(minePos, triggerRadius);
            
            if (enemies.length > 0) {
                console.log(`[Combat] 地雷触发！影响 ${enemies.length} 个敌人`);
                
                // 对范围内敌人造成伤害 (Day6: 应用火力加成)
                let damage = config.triggerDamage || 25;
                const firepowerBonus = GameData.getFirepowerBonus();
                if (firepowerBonus > 0) {
                    damage *= (1 + firepowerBonus / 100);
                }
                
                for (const enemy of enemies) {
                    this.damageEnemy(enemy, damage);
                }
                
                // 标记待移除
                minesToRemove.push(building.gridPos);
                
                CombatEvents.emit(EVENT_MINE_TRIGGERED, building, enemies);
            }
        }
        
        // 移除触发的地雷
        for (const pos of minesToRemove) {
            this.gridBuild.removeBuilding(pos);
            console.log(`[Combat] 地雷已移除: (${pos.row}, ${pos.col})`);
        }
    }
    
    /**
     * 更新子弹（预留，目前使用即时伤害）
     */
    private updateProjectiles(dt: number) {
        // 当前实现使用即时伤害，无需子弹飞行
    }
    
    /**
     * 节点闪烁效果
     */
    private flashNode(node: Node) {
        // 简单的缩放动画表示攻击
        const originalScale = node.scale.clone();
        node.setScale(originalScale.x * 1.2, originalScale.y * 1.2, 1);
        
        this.scheduleOnce(() => {
            if (node.isValid) {
                node.setScale(originalScale);
            }
        }, 0.1);
    }
}
