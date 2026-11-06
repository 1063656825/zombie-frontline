/**
 * DangerSideIndicator.ts
 * Day11: 危险侧指示器
 * 当敌人从某一侧更密集时，显示警告箭头/光晕
 */

import { _decorator, Component, Node, Graphics, Color, Label, UITransform, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 敌人位置信息（简化接口）
 */
export interface EnemyPosition {
    x: number;
    y: number;
}

/**
 * 危险侧枚举
 */
export enum DangerSide {
    None = 'none',
    Left = 'left',
    Right = 'right',
    Both = 'both'
}

/**
 * 危险侧分析结果
 */
export interface DangerAnalysis {
    side: DangerSide;
    leftCount: number;
    rightCount: number;
    leftThreat: number;   // 加权威胁值（考虑距离）
    rightThreat: number;
}

// 配置常量
const BASE_Y = -450;           // 据点 Y 坐标
const DANGER_THRESHOLD = 2;    // 触发危险指示的最小敌人数差
const THREAT_WEIGHT_DISTANCE = 0.01;  // 距离权重（越近威胁越高）

/**
 * 分析敌人分布，判断危险侧
 * @param enemies 敌人位置列表
 * @returns 危险分析结果
 */
export function analyzeDangerSide(enemies: EnemyPosition[]): DangerAnalysis {
    let leftCount = 0;
    let rightCount = 0;
    let leftThreat = 0;
    let rightThreat = 0;
    
    for (const enemy of enemies) {
        // 计算距离据点的距离
        const distanceToBase = Math.abs(enemy.y - BASE_Y);
        const threatWeight = 1 + (1000 - Math.min(distanceToBase, 1000)) * THREAT_WEIGHT_DISTANCE;
        
        if (enemy.x < 0) {
            leftCount++;
            leftThreat += threatWeight;
        } else if (enemy.x > 0) {
            rightCount++;
            rightThreat += threatWeight;
        } else {
            // X=0 的敌人两边都算
            leftCount += 0.5;
            rightCount += 0.5;
            leftThreat += threatWeight * 0.5;
            rightThreat += threatWeight * 0.5;
        }
    }
    
    // 判断危险侧
    let side: DangerSide = DangerSide.None;
    const countDiff = Math.abs(leftCount - rightCount);
    const threatDiff = Math.abs(leftThreat - rightThreat);
    
    if (enemies.length === 0) {
        side = DangerSide.None;
    } else if (countDiff < DANGER_THRESHOLD && threatDiff < DANGER_THRESHOLD * 2) {
        // 两边差不多
        if (enemies.length >= 4) {
            side = DangerSide.Both;
        } else {
            side = DangerSide.None;
        }
    } else if (leftThreat > rightThreat) {
        side = DangerSide.Left;
    } else {
        side = DangerSide.Right;
    }
    
    return {
        side,
        leftCount,
        rightCount,
        leftThreat,
        rightThreat
    };
}

/**
 * 根据危险侧获取显示文本
 */
export function getDangerSideText(side: DangerSide): string {
    switch (side) {
        case DangerSide.Left: return '⚠ 左侧危险';
        case DangerSide.Right: return '⚠ 右侧危险';
        case DangerSide.Both: return '⚠ 两侧危险';
        default: return '';
    }
}

@ccclass('DangerSideIndicator')
export class DangerSideIndicator extends Component {
    
    private _leftIndicator: Node | null = null;
    private _rightIndicator: Node | null = null;
    private _leftGraphics: Graphics | null = null;
    private _rightGraphics: Graphics | null = null;
    
    private _currentSide: DangerSide = DangerSide.None;
    private _isVisible: boolean = false;
    
    // 动画
    private _pulseAlpha: number = 180;
    private _pulseDirection: number = 1;
    
    // 配置
    private readonly INDICATOR_WIDTH = 40;
    private readonly INDICATOR_HEIGHT = 200;
    private readonly SCREEN_EDGE_X = 340;  // 距离屏幕中心
    
    start() {
        this.createIndicators();
        this.hide();
    }
    
    private createIndicators() {
        // 左侧指示器
        this._leftIndicator = new Node('LeftIndicator');
        this._leftIndicator.parent = this.node;
        this._leftIndicator.setPosition(-this.SCREEN_EDGE_X, 0, 0);
        this._leftGraphics = this._leftIndicator.addComponent(Graphics);
        const leftTransform = this._leftIndicator.addComponent(UITransform);
        leftTransform.setContentSize(this.INDICATOR_WIDTH, this.INDICATOR_HEIGHT);
        
        // 右侧指示器
        this._rightIndicator = new Node('RightIndicator');
        this._rightIndicator.parent = this.node;
        this._rightIndicator.setPosition(this.SCREEN_EDGE_X, 0, 0);
        this._rightGraphics = this._rightIndicator.addComponent(Graphics);
        const rightTransform = this._rightIndicator.addComponent(UITransform);
        rightTransform.setContentSize(this.INDICATOR_WIDTH, this.INDICATOR_HEIGHT);
    }
    
    /**
     * 更新危险侧显示
     * @param enemies 当前敌人位置列表
     */
    updateDanger(enemies: EnemyPosition[]) {
        const analysis = analyzeDangerSide(enemies);
        this._currentSide = analysis.side;
        
        if (this._currentSide === DangerSide.None) {
            this.hide();
            return;
        }
        
        this._isVisible = true;
        this.node.active = true;
        
        // 更新左侧
        if (this._leftIndicator) {
            this._leftIndicator.active = 
                this._currentSide === DangerSide.Left || 
                this._currentSide === DangerSide.Both;
        }
        
        // 更新右侧
        if (this._rightIndicator) {
            this._rightIndicator.active = 
                this._currentSide === DangerSide.Right || 
                this._currentSide === DangerSide.Both;
        }
        
        this.drawIndicators();
    }
    
    /**
     * 绘制指示器
     */
    private drawIndicators() {
        const alpha = Math.floor(this._pulseAlpha);
        const dangerColor = new Color(255, 80, 80, alpha);
        
        // 左侧箭头
        if (this._leftGraphics && this._leftIndicator?.active) {
            this._leftGraphics.clear();
            this.drawArrow(this._leftGraphics, dangerColor, true);
        }
        
        // 右侧箭头
        if (this._rightGraphics && this._rightIndicator?.active) {
            this._rightGraphics.clear();
            this.drawArrow(this._rightGraphics, dangerColor, false);
        }
    }
    
    /**
     * 绘制箭头
     */
    private drawArrow(graphics: Graphics, color: Color, pointLeft: boolean) {
        const w = this.INDICATOR_WIDTH;
        const h = this.INDICATOR_HEIGHT;
        
        // 渐变条
        graphics.fillColor = color;
        
        if (pointLeft) {
            // 左侧：箭头指向左
            // 矩形条
            graphics.rect(w * 0.3, -h / 2, w * 0.7, h);
            graphics.fill();
            
            // 三角箭头（多个叠加表示危险）
            const arrowColor = color.clone();
            arrowColor.a = Math.min(255, color.a + 50);
            graphics.fillColor = arrowColor;
            
            for (let i = 0; i < 3; i++) {
                const y = -h / 4 + i * (h / 4);
                graphics.moveTo(w * 0.3, y - 20);
                graphics.lineTo(-w * 0.2, y);
                graphics.lineTo(w * 0.3, y + 20);
                graphics.close();
                graphics.fill();
            }
        } else {
            // 右侧：箭头指向右
            graphics.rect(0, -h / 2, w * 0.7, h);
            graphics.fill();
            
            const arrowColor = color.clone();
            arrowColor.a = Math.min(255, color.a + 50);
            graphics.fillColor = arrowColor;
            
            for (let i = 0; i < 3; i++) {
                const y = -h / 4 + i * (h / 4);
                graphics.moveTo(w * 0.7, y - 20);
                graphics.lineTo(w * 1.2, y);
                graphics.lineTo(w * 0.7, y + 20);
                graphics.close();
                graphics.fill();
            }
        }
        
        // 警告文字
        graphics.fillColor = new Color(255, 255, 255, color.a);
        graphics.fontSize = 16;
    }
    
    /**
     * 隐藏指示器
     */
    hide() {
        this._isVisible = false;
        this.node.active = false;
        this._currentSide = DangerSide.None;
    }
    
    /**
     * 获取当前危险侧
     */
    getCurrentSide(): DangerSide {
        return this._currentSide;
    }
    
    update(dt: number) {
        if (!this._isVisible) return;
        
        // 脉冲动画
        this._pulseAlpha += this._pulseDirection * dt * 200;
        
        if (this._pulseAlpha >= 220) {
            this._pulseAlpha = 220;
            this._pulseDirection = -1;
        } else if (this._pulseAlpha <= 100) {
            this._pulseAlpha = 100;
            this._pulseDirection = 1;
        }
        
        this.drawIndicators();
    }
}
