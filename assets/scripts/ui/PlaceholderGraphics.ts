/**
 * PlaceholderGraphics.ts
 * 占位美术生成工具
 * 用于生成纯色块代表据点、建筑、敌人
 */

import { _decorator, Component, Node, Graphics, Color, UITransform, Vec3 } from 'cc';
import { BuildingType, BUILDING_COLORS, BUILDING_NAMES, BuildingLevel } from '../battle/BuildingConfig';
import { EnemyType } from '../battle/WaveConfig';

const { ccclass, property } = _decorator;

/**
 * 颜色配置
 */
export const PLACEHOLDER_COLORS = {
    // 据点
    BASE: new Color(33, 150, 243, 255),        // 蓝色
    
    // 建筑
    MACHINE_GUN: new Color(76, 175, 80, 255),  // 绿色
    CANNON: new Color(255, 152, 0, 255),        // 橙色
    MINE: new Color(156, 39, 176, 255),         // 紫色
    
    // 建筑 L2（更深色）
    MACHINE_GUN_L2: new Color(46, 125, 50, 255),
    CANNON_L2: new Color(230, 81, 0, 255),
    MINE_L2: new Color(106, 27, 154, 255),
    
    // 敌人
    Z1_WALKER: new Color(139, 69, 19, 255),     // 棕色（步行尸）
    Z2_RUNNER: new Color(255, 87, 34, 255),     // 深橙色（快跑尸）
    Z3_TANK: new Color(96, 125, 139, 255),      // 蓝灰色（胖尸）
    
    // 其他
    GRID_VALID: new Color(100, 200, 100, 80),   // 半透明绿（可放置格）
    GRID_INVALID: new Color(200, 100, 100, 80), // 半透明红（不可放置）
    GRID_HIGHLIGHT: new Color(255, 255, 100, 120), // 高亮
};

/**
 * 占位图形生成器
 */
@ccclass('PlaceholderGraphics')
export class PlaceholderGraphics extends Component {
    
    /**
     * 创建据点占位
     */
    static createBase(parent: Node): Node {
        const node = new Node('Base_Placeholder');
        node.parent = parent;
        
        const graphics = node.addComponent(Graphics);
        graphics.fillColor = PLACEHOLDER_COLORS.BASE;
        graphics.rect(-100, -20, 200, 40);
        graphics.fill();
        
        // 绘制边框
        graphics.strokeColor = new Color(255, 255, 255, 200);
        graphics.lineWidth = 2;
        graphics.rect(-100, -20, 200, 40);
        graphics.stroke();
        
        return node;
    }
    
    /**
     * 创建建筑占位
     */
    static createBuilding(parent: Node, type: BuildingType, level: BuildingLevel = BuildingLevel.L1): Node {
        const node = new Node(`Building_${type}_L${level}`);
        node.parent = parent;
        
        const graphics = node.addComponent(Graphics);
        const size = level === BuildingLevel.L2 ? 50 : 40;
        
        // 选择颜色
        let color: Color;
        switch (type) {
            case BuildingType.MachineGun:
                color = level === BuildingLevel.L2 
                    ? PLACEHOLDER_COLORS.MACHINE_GUN_L2 
                    : PLACEHOLDER_COLORS.MACHINE_GUN;
                break;
            case BuildingType.Cannon:
                color = level === BuildingLevel.L2 
                    ? PLACEHOLDER_COLORS.CANNON_L2 
                    : PLACEHOLDER_COLORS.CANNON;
                break;
            case BuildingType.Mine:
                color = level === BuildingLevel.L2 
                    ? PLACEHOLDER_COLORS.MINE_L2 
                    : PLACEHOLDER_COLORS.MINE;
                break;
            default:
                color = new Color(128, 128, 128, 255);
        }
        
        graphics.fillColor = color;
        
        // 不同形状表示不同建筑
        if (type === BuildingType.MachineGun) {
            // 正方形
            graphics.rect(-size / 2, -size / 2, size, size);
        } else if (type === BuildingType.Cannon) {
            // 八边形（近似圆形）
            this.drawOctagon(graphics, size / 2);
        } else if (type === BuildingType.Mine) {
            // 三角形
            this.drawTriangle(graphics, size / 2);
        }
        
        graphics.fill();
        
        // 边框
        graphics.strokeColor = new Color(255, 255, 255, 180);
        graphics.lineWidth = 2;
        graphics.stroke();
        
        return node;
    }
    
    /**
     * 创建敌人占位
     */
    static createEnemy(parent: Node, type: EnemyType): Node {
        const node = new Node(`Enemy_${type}`);
        node.parent = parent;
        
        const graphics = node.addComponent(Graphics);
        
        let color: Color;
        let size: number;
        
        switch (type) {
            case EnemyType.Z1_Walker:
                color = PLACEHOLDER_COLORS.Z1_WALKER;
                size = 25;
                break;
            case EnemyType.Z2_Runner:
                color = PLACEHOLDER_COLORS.Z2_RUNNER;
                size = 22;
                break;
            case EnemyType.Z3_Tank:
                color = PLACEHOLDER_COLORS.Z3_TANK;
                size = 40;
                break;
            default:
                color = new Color(128, 128, 128, 255);
                size = 25;
        }
        
        PlaceholderGraphics.drawEnemyGraphics(graphics, color, size);
        
        return node;
    }
    
    /**
     * Day13: 复用已有敌人节点时重绘外观（避免 destroy + new Node）
     */
    static restyleEnemy(node: Node, type: EnemyType): void {
        node.name = `Enemy_${type}`;
        const graphics = node.getComponent(Graphics);
        if (!graphics) return;
        
        let color: Color;
        let size: number;
        
        switch (type) {
            case EnemyType.Z1_Walker:
                color = PLACEHOLDER_COLORS.Z1_WALKER;
                size = 25;
                break;
            case EnemyType.Z2_Runner:
                color = PLACEHOLDER_COLORS.Z2_RUNNER;
                size = 22;
                break;
            case EnemyType.Z3_Tank:
                color = PLACEHOLDER_COLORS.Z3_TANK;
                size = 40;
                break;
            default:
                color = new Color(128, 128, 128, 255);
                size = 25;
        }
        
        PlaceholderGraphics.drawEnemyGraphics(graphics, color, size);
    }
    
    private static drawEnemyGraphics(graphics: Graphics, color: Color, size: number) {
        graphics.clear();
        graphics.fillColor = color;
        graphics.circle(0, 0, size / 2);
        graphics.fill();
        graphics.strokeColor = new Color(50, 50, 50, 200);
        graphics.lineWidth = 2;
        graphics.circle(0, 0, size / 2);
        graphics.stroke();
    }
    
    /**
     * 创建网格格子占位
     */
    static createGridCell(parent: Node, isValid: boolean, size: number = 80): Node {
        const node = new Node('GridCell');
        node.parent = parent;
        
        const graphics = node.addComponent(Graphics);
        
        if (isValid) {
            graphics.fillColor = PLACEHOLDER_COLORS.GRID_VALID;
        } else {
            graphics.fillColor = PLACEHOLDER_COLORS.GRID_INVALID;
        }
        
        graphics.rect(-size / 2 + 2, -size / 2 + 2, size - 4, size - 4);
        graphics.fill();
        
        // 边框
        graphics.strokeColor = new Color(255, 255, 255, 100);
        graphics.lineWidth = 1;
        graphics.rect(-size / 2, -size / 2, size, size);
        graphics.stroke();
        
        return node;
    }
    
    /**
     * 绘制八边形
     */
    private static drawOctagon(graphics: Graphics, radius: number) {
        const sides = 8;
        const angleStep = (Math.PI * 2) / sides;
        
        graphics.moveTo(radius, 0);
        for (let i = 1; i <= sides; i++) {
            const angle = i * angleStep;
            graphics.lineTo(
                Math.cos(angle) * radius,
                Math.sin(angle) * radius
            );
        }
        graphics.close();
    }
    
    /**
     * 绘制三角形
     */
    private static drawTriangle(graphics: Graphics, size: number) {
        graphics.moveTo(0, size);
        graphics.lineTo(-size, -size * 0.6);
        graphics.lineTo(size, -size * 0.6);
        graphics.close();
    }
}
