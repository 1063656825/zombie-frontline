/**
 * ExplosionVFX.ts
 * Day8: 炮轰爆炸圈视觉效果
 * Day13: 节点池复用，播放完毕归还而非 destroy
 */

import { _decorator, Component, Node, Graphics, Color, UITransform, tween, Tween, Vec3 } from 'cc';
import { BuildingLevel, getBuildingConfig, BuildingType } from '../battle/BuildingConfig';
import { ObjectPool } from '../core/ObjectPool';

const { ccclass, property } = _decorator;

// 爆炸圈配置
export const EXPLOSION_DURATION = 0.3;       // 总持续时间
export const EXPLOSION_EXPAND_RATIO = 1.3;   // 扩张比例
export const EXPLOSION_START_OPACITY = 200;  // 起始透明度
export const EXPLOSION_END_OPACITY = 0;      // 结束透明度

// 从 BuildingConfig 读取 AOE 半径并转换为像素
export const AOE_PIXEL_SCALE = 80;  // aoeRadius 到像素的转换系数

/**
 * 获取炮轰 AOE 半径（像素）
 */
export function getCannonAoeRadiusPixels(level: BuildingLevel): number {
    const config = getBuildingConfig(BuildingType.Cannon, level);
    if (!config || !config.aoeRadius) {
        return level === BuildingLevel.L2 ? 96 : 64;  // 默认值
    }
    return config.aoeRadius * AOE_PIXEL_SCALE;
}

/**
 * 炮轰爆炸圈组件
 * Day13: 播放完毕回调归还对象池，不销毁节点
 */
@ccclass('ExplosionRing')
export class ExplosionRing extends Component {
    
    private _graphics: Graphics | null = null;
    private _radius: number = 64;
    private _color: Color = new Color(255, 150, 50, 200);
    private _duration: number = EXPLOSION_DURATION;
    private _animProxy = { progress: 0 };
    private _onFinished: (() => void) | null = null;
    
    /**
     * 初始化并播放爆炸效果
     */
    init(radius: number, color?: Color, duration?: number, onFinished?: () => void) {
        this._radius = radius;
        if (color) this._color = color;
        if (duration) this._duration = duration;
        this._onFinished = onFinished ?? null;
        
        // 添加 UITransform（复用时跳过）
        let transform = this.node.getComponent(UITransform);
        if (!transform) {
            transform = this.node.addComponent(UITransform);
        }
        transform.setContentSize(radius * 2.5, radius * 2.5);
        
        // 添加 Graphics（复用时跳过）
        this._graphics = this.node.getComponent(Graphics);
        if (!this._graphics) {
            this._graphics = this.node.addComponent(Graphics);
        }
        
        // 停止上次动画，避免回收后仍回调
        Tween.stopAllByTarget(this._animProxy);
        Tween.stopAllByTarget(this.node);
        
        this._animProxy.progress = 0;
        this.drawRing(this._radius, this._color.a);
        this.playAnimation();
    }
    
    /**
     * Day13: 立即停止动画（回收前调用）
     */
    stop() {
        Tween.stopAllByTarget(this._animProxy);
        Tween.stopAllByTarget(this.node);
        this._onFinished = null;
        if (this._graphics) {
            this._graphics.clear();
        }
    }
    
    private drawRing(radius: number, opacity: number) {
        if (!this._graphics) return;
        
        this._graphics.clear();
        
        const drawColor = this._color;
        
        this._graphics.fillColor = new Color(drawColor.r, drawColor.g, drawColor.b, opacity * 0.3);
        this._graphics.circle(0, 0, radius);
        this._graphics.fill();
        
        this._graphics.strokeColor = new Color(drawColor.r, drawColor.g, drawColor.b, opacity);
        this._graphics.lineWidth = 3;
        this._graphics.circle(0, 0, radius);
        this._graphics.stroke();
    }
    
    private playAnimation() {
        const startRadius = this._radius;
        const endRadius = this._radius * EXPLOSION_EXPAND_RATIO;
        this._animProxy.progress = 0;
        
        tween(this._animProxy)
            .to(this._duration, { progress: 1 }, {
                onUpdate: (target: { progress: number }) => {
                    if (!this.node.isValid) return;
                    
                    const t = target.progress;
                    const currentRadius = startRadius + (endRadius - startRadius) * t;
                    const currentOpacity = EXPLOSION_START_OPACITY * (1 - t);
                    
                    this.drawRing(currentRadius, currentOpacity);
                }
            })
            .call(() => {
                const cb = this._onFinished;
                this._onFinished = null;
                cb?.();
            })
            .start();
    }
}

/**
 * Day13: 爆炸圈节点池
 */
export class ExplosionVfxPool {
    private _pool: ObjectPool<Node>;
    private _parent: Node;
    
    constructor(parent: Node) {
        this._parent = parent;
        this._pool = new ObjectPool<Node>({
            create: () => this.createNode(),
            onAcquire: (node) => {
                node.active = true;
            },
            onRelease: (node) => {
                const ring = node.getComponent(ExplosionRing);
                ring?.stop();
                node.active = false;
            },
            initialSize: 6
        });
    }
    
    private createNode(): Node {
        const node = new Node('ExplosionRing');
        node.parent = this._parent;
        node.addComponent(UITransform);
        node.addComponent(Graphics);
        node.addComponent(ExplosionRing);
        node.active = false;
        return node;
    }
    
    prewarm(count: number): void {
        this._pool.prewarm(count);
    }
    
    /**
     * 在指定位置播放爆炸圈，结束后自动归还
     */
    play(position: Vec3, radius: number, color: Color, duration?: number): Node {
        const node = this._pool.acquire();
        if (node.parent !== this._parent) {
            node.parent = this._parent;
        }
        node.setPosition(position);
        
        let ring = node.getComponent(ExplosionRing);
        if (!ring) {
            ring = node.addComponent(ExplosionRing);
        }
        ring.init(radius, color, duration, () => {
            this._pool.release(node);
        });
        return node;
    }
    
    playCannon(position: Vec3, level: BuildingLevel, color?: Color): Node {
        const radius = getCannonAoeRadiusPixels(level);
        const explosionColor = color ?? new Color(255, 150, 50, EXPLOSION_START_OPACITY);
        return this.play(position, radius, explosionColor);
    }
    
    playMine(position: Vec3, level: BuildingLevel): Node {
        const config = getBuildingConfig(BuildingType.Mine, level);
        const radius = config?.triggerRadius ? config.triggerRadius * 40 : 48;
        const explosionColor = new Color(180, 100, 255, EXPLOSION_START_OPACITY);
        return this.play(position, radius, explosionColor, 0.25);
    }
    
    releaseAll(): void {
        this._pool.releaseAll();
    }
    
    getStats() {
        return this._pool.getStats();
    }
}

/**
 * 创建炮轰爆炸效果
 * @param parent 父节点
 * @param position 世界位置
 * @param level 炮轰等级（决定半径）
 * @param color 可选颜色覆盖
 * @param pool 可选对象池（Day13）；缺省时走池化共享实例
 */
export function createExplosionRing(
    parent: Node,
    position: Vec3,
    level: BuildingLevel,
    color?: Color,
    pool?: ExplosionVfxPool
): Node {
    const p = pool ?? getSharedExplosionPool(parent);
    const node = p.playCannon(position, level, color);
    console.log(`[ExplosionVFX] 爆炸圈 L${level} 半径=${getCannonAoeRadiusPixels(level)}px`);
    return node;
}

/**
 * 地雷爆炸效果（紫色）
 */
export function createMineExplosion(
    parent: Node,
    position: Vec3,
    level: BuildingLevel,
    pool?: ExplosionVfxPool
): Node {
    const p = pool ?? getSharedExplosionPool(parent);
    const node = p.playMine(position, level);
    const config = getBuildingConfig(BuildingType.Mine, level);
    const radius = config?.triggerRadius ? config.triggerRadius * 40 : 48;
    console.log(`[ExplosionVFX] 地雷爆炸 L${level} 半径=${radius}px`);
    return node;
}

let _sharedPool: ExplosionVfxPool | null = null;

function getSharedExplosionPool(parent: Node): ExplosionVfxPool {
    if (!_sharedPool) {
        _sharedPool = new ExplosionVfxPool(parent);
    }
    return _sharedPool;
}

/**
 * Day13: 战斗清场时归还共享爆炸池
 */
export function releaseSharedExplosionPool(): void {
    _sharedPool?.releaseAll();
}
