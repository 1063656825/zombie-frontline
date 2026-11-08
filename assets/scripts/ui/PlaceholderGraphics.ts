/**
 * PlaceholderGraphics.ts
 * Day21: 像素精灵替换圆点色块；API 保持给对象池 restyle 用。
 */

import { _decorator, Component, Node, Color, UITransform } from 'cc';
import { BuildingType, BuildingLevel } from '../battle/BuildingConfig';
import { EnemyType } from '../battle/WaveConfig';
import { applyPixelSprite, PIXEL_SCALE } from '../pixel/PixelBlit';

const { ccclass } = _decorator;

export const PLACEHOLDER_COLORS = {
    BASE: new Color(58, 106, 170, 255),
    MACHINE_GUN: new Color(74, 140, 62, 255),
    CANNON: new Color(224, 112, 32, 255),
    MINE: new Color(138, 60, 176, 255),
    MACHINE_GUN_L2: new Color(40, 82, 38, 255),
    CANNON_L2: new Color(168, 72, 16, 255),
    MINE_L2: new Color(88, 32, 120, 255),
    Z1_WALKER: new Color(107, 68, 35, 255),
    Z2_RUNNER: new Color(224, 90, 40, 255),
    Z3_TANK: new Color(106, 122, 130, 255),
    GRID_VALID: new Color(48, 90, 56, 140),
    GRID_INVALID: new Color(90, 40, 40, 140),
    GRID_HIGHLIGHT: new Color(224, 180, 64, 160)
};

function buildingSprite(type: BuildingType, level: BuildingLevel): string {
    if (type === BuildingType.MachineGun) {
        return level === BuildingLevel.L2 ? 'mg_l2' : 'mg_l1';
    }
    if (type === BuildingType.Cannon) {
        return level === BuildingLevel.L2 ? 'cannon_l2' : 'cannon_l1';
    }
    return 'mine';
}

function enemySprite(type: EnemyType): string {
    switch (type) {
        case EnemyType.Z2_Runner:
            return 'z2';
        case EnemyType.Z3_Tank:
            return 'z3';
        default:
            return 'z1';
    }
}

@ccclass('PlaceholderGraphics')
export class PlaceholderGraphics extends Component {
    
    static createBase(parent: Node): Node {
        const node = new Node('Base_Pixel');
        node.parent = parent;
        applyPixelSprite(node, 'base', 5);
        return node;
    }
    
    static createBuilding(parent: Node, type: BuildingType, level: BuildingLevel = BuildingLevel.L1): Node {
        const node = new Node(`Building_${type}_L${level}`);
        node.parent = parent;
        applyPixelSprite(node, buildingSprite(type, level), PIXEL_SCALE);
        return node;
    }
    
    static createEnemy(parent: Node, type: EnemyType): Node {
        const node = new Node(`Enemy_${type}`);
        node.parent = parent;
        applyPixelSprite(node, enemySprite(type), PIXEL_SCALE);
        return node;
    }
    
    /** Day13 对象池：复用节点只换皮肤，不 destroy */
    static restyleEnemy(node: Node, type: EnemyType): void {
        node.name = `Enemy_${type}`;
        applyPixelSprite(node, enemySprite(type), PIXEL_SCALE);
    }
    
    static restyleBuilding(node: Node, type: BuildingType, level: BuildingLevel): void {
        node.name = `Building_${type}_L${level}`;
        applyPixelSprite(node, buildingSprite(type, level), PIXEL_SCALE);
    }
    
    static createGridCell(parent: Node, isValid: boolean, size: number = 80): Node {
        const node = new Node('GridCell');
        node.parent = parent;
        applyPixelSprite(node, isValid ? 'cell_ok' : 'cell_no', Math.max(1, Math.floor(size / 8)));
        const ui = node.getComponent(UITransform);
        if (ui) {
            ui.setContentSize(size - 4, size - 4);
        }
        return node;
    }
}

export { buildingSprite as pixelBuildingKey, enemySprite as pixelEnemyKey };
