/**
 * GridBuild.ts
 * 格子建造系统
 * 管理可放置格子、拖拽落子、同型合成
 * Day1 骨架：定义接口和数据结构，Day2 实现完整逻辑
 */

import { _decorator, Component, Node, Vec2, Vec3, EventTarget } from 'cc';
import { BuildingType, BuildingLevel, getBuildingConfig, canMerge, BuildingStats } from './BuildingConfig';
import { GameData } from '../data/GameData';
import { BattleState } from './BattleFlow';

const { ccclass, property } = _decorator;

// 格子事件
export const GridEvents = new EventTarget();
export const EVENT_BUILDING_PLACED = 'building_placed';
export const EVENT_BUILDING_MERGED = 'building_merged';
export const EVENT_BUILDING_REMOVED = 'building_removed';

/**
 * 格子坐标
 */
export interface GridPosition {
    row: number;
    col: number;
}

/**
 * 格子数据
 */
export interface GridCell {
    position: GridPosition;
    worldPos: Vec3;
    isValid: boolean;           // 是否可放置
    isOccupied: boolean;        // 是否已被占用
    building: PlacedBuilding | null;
}

/**
 * 已放置的建筑
 */
export interface PlacedBuilding {
    id: string;
    type: BuildingType;
    level: BuildingLevel;
    gridPos: GridPosition;
    node: Node | null;
}

@ccclass('GridBuild')
export class GridBuild extends Component {
    
    // 网格配置
    private readonly GRID_ROWS = 6;
    private readonly GRID_COLS = 4;
    private readonly CELL_SIZE = 80;  // 格子大小（像素）
    
    // 网格数据
    private _grid: GridCell[][] = [];
    private _buildings: Map<string, PlacedBuilding> = new Map();
    private _buildingIdCounter = 0;
    
    // 当前拖拽状态
    private _isDragging = false;
    private _dragBuildingType: BuildingType | null = null;
    private _dragNode: Node | null = null;
    
    // 战斗状态引用（用于判断是否可操作）
    private _currentBattleState: BattleState = BattleState.None;
    
    /**
     * 初始化网格
     */
    initGrid() {
        this._grid = [];
        this._buildings.clear();
        
        // 创建网格数据
        for (let row = 0; row < this.GRID_ROWS; row++) {
            this._grid[row] = [];
            for (let col = 0; col < this.GRID_COLS; col++) {
                // 计算世界坐标（居中）
                const worldX = (col - this.GRID_COLS / 2 + 0.5) * this.CELL_SIZE;
                const worldY = (row - this.GRID_ROWS / 2 + 0.5) * this.CELL_SIZE;
                
                this._grid[row][col] = {
                    position: { row, col },
                    worldPos: new Vec3(worldX, worldY, 0),
                    isValid: this.isValidPlacement(row, col),
                    isOccupied: false,
                    building: null
                };
            }
        }
        
        console.log(`[GridBuild] 网格初始化完成: ${this.GRID_ROWS}x${this.GRID_COLS}`);
    }
    
    /**
     * 判断格子是否可放置（根据地图设计）
     * Day2 可根据实际地图配置
     */
    private isValidPlacement(row: number, col: number): boolean {
        // 默认：中间两行不可放（敌人路径）
        // 两侧可放
        return row !== 2 && row !== 3;
    }
    
    /**
     * 更新战斗状态
     */
    setBattleState(state: BattleState) {
        this._currentBattleState = state;
    }
    
    /**
     * 检查是否在部署阶段
     */
    get canDeploy(): boolean {
        return this._currentBattleState === BattleState.DeployFast ||
               this._currentBattleState === BattleState.DeployTune;
    }
    
    /**
     * 尝试放置建筑
     */
    tryPlaceBuilding(type: BuildingType, gridPos: GridPosition): boolean {
        if (!this.canDeploy) {
            console.log('[GridBuild] 非部署阶段，无法放置');
            return false;
        }
        
        const cell = this.getCell(gridPos);
        if (!cell || !cell.isValid || cell.isOccupied) {
            console.log('[GridBuild] 格子不可用');
            return false;
        }
        
        const config = getBuildingConfig(type, BuildingLevel.L1);
        if (!config) {
            console.log('[GridBuild] 建筑配置不存在');
            return false;
        }
        
        // 检查 DP
        if (!GameData.consumeDP(config.dpCost)) {
            console.log(`[GridBuild] DP 不足: 需要 ${config.dpCost}, 当前 ${GameData.dp}`);
            return false;
        }
        
        // 创建建筑
        const building = this.createBuilding(type, BuildingLevel.L1, gridPos);
        cell.isOccupied = true;
        cell.building = building;
        
        console.log(`[GridBuild] 放置建筑: ${type} 于 (${gridPos.row}, ${gridPos.col})`);
        GridEvents.emit(EVENT_BUILDING_PLACED, building);
        
        return true;
    }
    
    /**
     * 尝试合成建筑
     */
    tryMergeBuildings(sourcePos: GridPosition, targetPos: GridPosition): boolean {
        if (!this.canDeploy) {
            console.log('[GridBuild] 非部署阶段，无法合成');
            return false;
        }
        
        const sourceCell = this.getCell(sourcePos);
        const targetCell = this.getCell(targetPos);
        
        if (!sourceCell?.building || !targetCell?.building) {
            return false;
        }
        
        const sourceBuilding = sourceCell.building;
        const targetBuilding = targetCell.building;
        
        // 检查是否可合成
        const sourceConfig = getBuildingConfig(sourceBuilding.type, sourceBuilding.level);
        const targetConfig = getBuildingConfig(targetBuilding.type, targetBuilding.level);
        
        if (!sourceConfig || !targetConfig || !canMerge(sourceConfig, targetConfig)) {
            console.log('[GridBuild] 无法合成：不满足条件');
            return false;
        }
        
        // 执行合成：移除源建筑，升级目标建筑
        this.removeBuilding(sourcePos);
        targetBuilding.level = BuildingLevel.L2;
        
        console.log(`[GridBuild] 合成成功: ${targetBuilding.type} 升级到 L2`);
        GridEvents.emit(EVENT_BUILDING_MERGED, targetBuilding);
        
        return true;
    }
    
    /**
     * 创建建筑数据
     */
    private createBuilding(type: BuildingType, level: BuildingLevel, gridPos: GridPosition): PlacedBuilding {
        const id = `building_${++this._buildingIdCounter}`;
        const building: PlacedBuilding = {
            id,
            type,
            level,
            gridPos,
            node: null  // Day2 创建实际节点
        };
        this._buildings.set(id, building);
        return building;
    }
    
    /**
     * 移除建筑
     */
    removeBuilding(gridPos: GridPosition): boolean {
        const cell = this.getCell(gridPos);
        if (!cell?.building) return false;
        
        const building = cell.building;
        this._buildings.delete(building.id);
        
        if (building.node) {
            building.node.destroy();
        }
        
        cell.building = null;
        cell.isOccupied = false;
        
        GridEvents.emit(EVENT_BUILDING_REMOVED, building);
        return true;
    }
    
    /**
     * 获取格子
     */
    getCell(pos: GridPosition): GridCell | null {
        if (pos.row < 0 || pos.row >= this.GRID_ROWS ||
            pos.col < 0 || pos.col >= this.GRID_COLS) {
            return null;
        }
        return this._grid[pos.row]?.[pos.col] || null;
    }
    
    /**
     * 世界坐标转格子坐标
     */
    worldToGrid(worldPos: Vec3): GridPosition | null {
        const col = Math.floor((worldPos.x / this.CELL_SIZE) + this.GRID_COLS / 2);
        const row = Math.floor((worldPos.y / this.CELL_SIZE) + this.GRID_ROWS / 2);
        
        if (row < 0 || row >= this.GRID_ROWS || col < 0 || col >= this.GRID_COLS) {
            return null;
        }
        
        return { row, col };
    }
    
    /**
     * 格子坐标转世界坐标
     */
    gridToWorld(gridPos: GridPosition): Vec3 {
        const cell = this.getCell(gridPos);
        if (cell) {
            return cell.worldPos.clone();
        }
        return new Vec3();
    }
    
    /**
     * 获取所有建筑
     */
    getAllBuildings(): PlacedBuilding[] {
        return Array.from(this._buildings.values());
    }
    
    /**
     * 获取指定类型的建筑数量
     */
    getBuildingCount(type?: BuildingType): number {
        if (!type) {
            return this._buildings.size;
        }
        return Array.from(this._buildings.values())
            .filter(b => b.type === type).length;
    }
    
    /**
     * 清空所有建筑（关卡重置时调用）
     */
    clearAllBuildings() {
        for (const building of this._buildings.values()) {
            if (building.node) {
                building.node.destroy();
            }
        }
        this._buildings.clear();
        
        // 重置格子状态
        for (const row of this._grid) {
            for (const cell of row) {
                cell.isOccupied = false;
                cell.building = null;
            }
        }
        
        console.log('[GridBuild] 已清空所有建筑');
    }
}
