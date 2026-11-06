/**
 * ExplosionVFX.ts
 * Day8: 炮轰爆炸圈视觉效果
 */

import { _decorator, Component, Node, Graphics, Color, UITransform, tween, Vec3 } from 'cc';
import { BuildingLevel, getBuildingConfig, BuildingType } from '../battle/BuildingConfig';

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
 * 创建后自动播放并销毁
 */
@ccclass('ExplosionRing')
export class ExplosionRing extends Component {
    
    private _graphics: Graphics | null = null;
    private _radius: number = 64;
    private _color: Color = new Color(255, 150, 50, 200);
    private _duration: number = EXPLOSION_DURATION;
    
    /**
     * 初始化并播放爆炸效果
     */
    init(radius: number, color?: Color, duration?: number) {
        this._radius = radius;
        if (color) this._color = color;
        if (duration) this._duration = duration;
        
        // 添加 UITransform
        let transform = this.node.getComponent(UITransform);
        if (!transform) {
            transform = this.node.addComponent(UITransform);
        }
        transform.setContentSize(radius * 2.5, radius * 2.5);
        
        // 添加 Graphics
        this._graphics = this.node.addComponent(Graphics);
        
        // 绘制初始圈
        this.drawRing(this._radius, this._color.a);
        
        // 播放动画
        this.playAnimation();
    }
    
    private drawRing(radius: number, opacity: number) {
        if (!this._graphics) return;
        
        this._graphics.clear();
        
        // 设置颜色
        const drawColor = this._color.clone();
        drawColor.a = opacity;
        
        // 绘制填充圆（半透明）
        this._graphics.fillColor = new Color(drawColor.r, drawColor.g, drawColor.b, opacity * 0.3);
        this._graphics.circle(0, 0, radius);
        this._graphics.fill();
        
        // 绘制边缘圈
        this._graphics.strokeColor = drawColor;
        this._graphics.lineWidth = 3;
        this._graphics.circle(0, 0, radius);
        this._graphics.stroke();
    }
    
    private playAnimation() {
        const startRadius = this._radius;
        const endRadius = this._radius * EXPLOSION_EXPAND_RATIO;
        
        // 使用代理对象来 tween
        const proxy = { progress: 0 };
        
        tween(proxy)
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
                if (this.node.isValid) {
                    this.node.destroy();
                }
            })
            .start();
    }
}

/**
 * 创建炮轰爆炸效果
 * @param parent 父节点
 * @param position 世界位置
 * @param level 炮轰等级（决定半径）
 * @param color 可选颜色覆盖
 */
export function createExplosionRing(
    parent: Node,
    position: Vec3,
    level: BuildingLevel,
    color?: Color
): Node {
    const node = new Node('ExplosionRing');
    node.parent = parent;
    node.setPosition(position);
    
    const radius = getCannonAoeRadiusPixels(level);
    const explosionColor = color ?? new Color(255, 150, 50, EXPLOSION_START_OPACITY);
    
    const ring = node.addComponent(ExplosionRing);
    ring.init(radius, explosionColor);
    
    console.log(`[ExplosionVFX] 爆炸圈 L${level} 半径=${radius}px`);
    
    return node;
}

/**
 * 地雷爆炸效果（紫色）
 */
export function createMineExplosion(
    parent: Node,
    position: Vec3,
    level: BuildingLevel
): Node {
    const config = getBuildingConfig(BuildingType.Mine, level);
    const radius = config?.triggerRadius ? config.triggerRadius * 40 : 48;
    
    const node = new Node('MineExplosion');
    node.parent = parent;
    node.setPosition(position);
    
    const explosionColor = new Color(180, 100, 255, EXPLOSION_START_OPACITY);
    
    const ring = node.addComponent(ExplosionRing);
    ring.init(radius, explosionColor, 0.25);
    
    console.log(`[ExplosionVFX] 地雷爆炸 L${level} 半径=${radius}px`);
    
    return node;
}
