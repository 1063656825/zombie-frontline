/**
 * GridBuild.ts
 * 格子建造系统
 * 管理可放置格子、拖拽落子、同型合成
 * Day2: 网格渲染、点击落子、战斗锁定
 * Day5: 拖拽合成 L1+L1→L2
 */

import { _decorator, Component, Node, Vec2, Vec3, EventTarget, Graphics, Color, UITransform, input, Input, EventTouch } from 'cc';
import { BuildingType, BuildingLevel, getBuildingConfig, canMerge, BuildingStats } from './BuildingConfig';
import { GameData } from '../data/GameData';
import { BattleState } from './BattleFlow';
import { PlaceholderGraphics, PLACEHOLDER_COLORS } from '../ui/PlaceholderGraphics';
import { MetaData, rollMergeRefund } from '../data/MetaData';
import { AudioService, SfxId } from '../audio/AudioService';
import { Analytics } from '../analytics/Analytics';
import { LevelId } from './WaveConfig';

const { ccclass, property } = _decorator;

// 格子事件
export const GridEvents = new EventTarget();
export const EVENT_BUILDING_PLACED = 'building_placed';
export const EVENT_BUILDING_MERGED = 'building_merged';
export const EVENT_BUILDING_REMOVED = 'building_removed';
export const EVENT_MERGE_AVAILABLE = 'merge_available';  // 首次可合成

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
    private readonly GRID_OFFSET_Y = 50;  // 网格垂直偏移（相对屏幕中心）
    
    // 网格数据
    private _grid: GridCell[][] = [];
    private _buildings: Map<string, PlacedBuilding> = new Map();
    private _buildingIdCounter = 0;
    
    // 渲染节点
    private _gridGraphics: Graphics | null = null;
    private _buildingContainer: Node | null = null;
    private _cellNodes: Map<string, Node> = new Map();
    
    // 当前选中的建筑类型（由 BuildingPanel 设置）
    private _selectedBuildingType: BuildingType | null = null;
    
    // 当前拖拽状态（新放置）
    private _isDragging = false;
    private _dragBuildingType: BuildingType | null = null;
    private _dragNode: Node | null = null;
    
    // 合成拖拽状态（Day5）
    private _isMergeDragging = false;
    private _mergeDragSourcePos: GridPosition | null = null;
    private _mergeDragPreviewNode: Node | null = null;
    private _mergeDragTargetPos: GridPosition | null = null;
    private _mergeHighlightCells: GridPosition[] = [];
    
    // 战斗状态引用（用于判断是否可操作）
    private _currentBattleState: BattleState = BattleState.None;
    
    // Day12: 当前关卡和波次（用于埋点）
    private _currentLevelId: LevelId = LevelId.L1;
    private _currentWaveIndex: number = 0;
    
    // 高亮的格子
    private _highlightedCell: GridPosition | null = null;
    
    // 首次可合成事件是否已触发
    private _mergeAvailableEmitted = false;
    
    // Day13: 建筑列表缓存，避免每帧 Array.from
    private _buildingCache: PlacedBuilding[] = [];
    private _buildingCacheDirty = true;
    
    /**
     * 初始化网格
     */
    initGrid(buildingContainer?: Node) {
        this._grid = [];
        this._buildings.clear();
        this._cellNodes.clear();
        this._buildingCache.length = 0;
        this._buildingCacheDirty = true;
        
        // 设置建筑容器
        if (buildingContainer) {
            this._buildingContainer = buildingContainer;
        }
        
        // 创建网格数据
        for (let row = 0; row < this.GRID_ROWS; row++) {
            this._grid[row] = [];
            for (let col = 0; col < this.GRID_COLS; col++) {
                // 计算世界坐标（居中，带垂直偏移）
                const worldX = (col - this.GRID_COLS / 2 + 0.5) * this.CELL_SIZE;
                const worldY = (row - this.GRID_ROWS / 2 + 0.5) * this.CELL_SIZE + this.GRID_OFFSET_Y;
                
                this._grid[row][col] = {
                    position: { row, col },
                    worldPos: new Vec3(worldX, worldY, 0),
                    isValid: this.isValidPlacement(row, col),
                    isOccupied: false,
                    building: null
                };
            }
        }
        
        // 渲染网格
        this.renderGrid();
        
        // 注册触摸事件
        this.setupTouchEvents();
        
        console.log(`[GridBuild] 网格初始化完成: ${this.GRID_ROWS}x${this.GRID_COLS}`);
    }
    
    /**
     * 渲染网格
     */
    renderGrid() {
        // 获取或创建 Graphics 组件
        if (!this._gridGraphics) {
            this._gridGraphics = this.node.getComponent(Graphics);
            if (!this._gridGraphics) {
                this._gridGraphics = this.node.addComponent(Graphics);
            }
        }
        
        this._gridGraphics.clear();
        
        // 绘制所有格子
        for (let row = 0; row < this.GRID_ROWS; row++) {
            for (let col = 0; col < this.GRID_COLS; col++) {
                const cell = this._grid[row][col];
                this.drawCell(cell, false);
            }
        }
    }
    
    /**
     * 绘制单个格子
     */
    private drawCell(cell: GridCell, isHighlighted: boolean) {
        if (!this._gridGraphics) return;
        
        const x = cell.worldPos.x - this.CELL_SIZE / 2;
        const y = cell.worldPos.y - this.CELL_SIZE / 2;
        const padding = 2;
        
        // 根据状态选择颜色
        let fillColor: Color;
        if (isHighlighted && cell.isValid && !cell.isOccupied) {
            fillColor = PLACEHOLDER_COLORS.GRID_HIGHLIGHT;
        } else if (cell.isValid) {
            fillColor = cell.isOccupied 
                ? new Color(80, 80, 80, 60) 
                : PLACEHOLDER_COLORS.GRID_VALID;
        } else {
            fillColor = PLACEHOLDER_COLORS.GRID_INVALID;
        }
        
        // 填充
        this._gridGraphics.fillColor = fillColor;
        this._gridGraphics.rect(x + padding, y + padding, this.CELL_SIZE - padding * 2, this.CELL_SIZE - padding * 2);
        this._gridGraphics.fill();
        
        // 边框
        this._gridGraphics.strokeColor = isHighlighted 
            ? new Color(255, 255, 100, 200) 
            : new Color(255, 255, 255, 80);
        this._gridGraphics.lineWidth = isHighlighted ? 2 : 1;
        this._gridGraphics.rect(x, y, this.CELL_SIZE, this.CELL_SIZE);
        this._gridGraphics.stroke();
    }
    
    /**
     * 设置触摸事件
     */
    private setupTouchEvents() {
        // 确保节点有 UITransform 以接收触摸
        let transform = this.node.getComponent(UITransform);
        if (!transform) {
            transform = this.node.addComponent(UITransform);
        }
        // 设置足够大的区域
        transform.setContentSize(
            this.GRID_COLS * this.CELL_SIZE + 100,
            this.GRID_ROWS * this.CELL_SIZE + 100
        );
        
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchCancel, this);
    }
    
    /**
     * 触摸开始（检测合成拖拽）
     */
    private onTouchStart(event: EventTouch) {
        if (!this.canDeploy) return;
        
        const touchPos = event.getUILocation();
        const localPos = this.node.getComponent(UITransform)?.convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0));
        if (!localPos) return;
        
        const gridPos = this.worldToGrid(localPos);
        if (!gridPos) return;
        
        const cell = this.getCell(gridPos);
        if (!cell?.building) return;
        
        // 检测是否点击了 L1 建筑（可作为合成源）
        if (cell.building.level === BuildingLevel.L1) {
            this._isMergeDragging = true;
            this._mergeDragSourcePos = gridPos;
            this._mergeDragTargetPos = null;
            
            // Day12: 埋点 - 合成尝试（开始拖拽）
            Analytics.trackMergeAttempt(this._currentLevelId, this._currentWaveIndex);
            
            // 创建拖拽预览节点
            this.createMergeDragPreview(cell.building, localPos);
            
            // 计算并高亮可合成目标
            this.updateMergeHighlights();
            
            console.log(`[GridBuild] 开始合成拖拽: ${cell.building.type} L1 from (${gridPos.row}, ${gridPos.col})`);
        }
    }
    
    /**
     * 触摸取消
     */
    private onTouchCancel(event: EventTouch) {
        this.cancelMergeDrag();
    }
    
    /**
     * 触摸移动（高亮预览）
     */
    private onTouchMove(event: EventTouch) {
        if (!this.canDeploy) return;
        
        const touchPos = event.getUILocation();
        const localPos = this.node.getComponent(UITransform)?.convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0));
        if (!localPos) return;
        
        // 合成拖拽中
        if (this._isMergeDragging && this._mergeDragSourcePos) {
            // 更新预览节点位置
            if (this._mergeDragPreviewNode) {
                this._mergeDragPreviewNode.setPosition(localPos);
            }
            
            // 检测目标格
            const gridPos = this.worldToGrid(localPos);
            this._mergeDragTargetPos = gridPos;
            this.updateMergeHighlights();
            return;
        }
        
        // 普通放置高亮
        if (!this._selectedBuildingType) return;
        
        const gridPos = this.worldToGrid(localPos);
        if (gridPos && (!this._highlightedCell || 
            this._highlightedCell.row !== gridPos.row || 
            this._highlightedCell.col !== gridPos.col)) {
            this._highlightedCell = gridPos;
            this.updateGridHighlight();
        }
    }
    
    /**
     * 触摸结束（放置建筑或确认合成）
     */
    private onTouchEnd(event: EventTouch) {
        // 合成拖拽结束
        if (this._isMergeDragging && this._mergeDragSourcePos) {
            this.finishMergeDrag();
            return;
        }
        
        if (!this.canDeploy) {
            console.log('[GridBuild] 非部署阶段，无法放置');
            return;
        }
        
        if (!this._selectedBuildingType) {
            console.log('[GridBuild] 未选中建筑类型');
            return;
        }
        
        const touchPos = event.getUILocation();
        const localPos = this.node.getComponent(UITransform)?.convertToNodeSpaceAR(new Vec3(touchPos.x, touchPos.y, 0));
        
        if (!localPos) return;
        
        const gridPos = this.worldToGrid(localPos);
        if (!gridPos) {
            console.log('[GridBuild] 点击位置不在网格内');
            return;
        }
        
        // 尝试放置
        const success = this.tryPlaceBuilding(this._selectedBuildingType, gridPos);
        
        if (success) {
            // 放置成功后清除高亮
            this._highlightedCell = null;
            this.updateGridHighlight();
        }
    }
    
    /**
     * 更新网格高亮
     */
    private updateGridHighlight() {
        this.renderGrid();
        
        // 高亮当前格子
        if (this._highlightedCell) {
            const cell = this.getCell(this._highlightedCell);
            if (cell) {
                this.drawCell(cell, true);
            }
        }
    }
    
    /**
     * 设置选中的建筑类型
     */
    setSelectedBuildingType(type: BuildingType | null) {
        this._selectedBuildingType = type;
        console.log(`[GridBuild] 建筑类型: ${type || '无'}`);
        
        // 更新高亮显示
        if (!type) {
            this._highlightedCell = null;
        }
        this.updateGridHighlight();
    }
    
    /**
     * 获取选中的建筑类型
     */
    getSelectedBuildingType(): BuildingType | null {
        return this._selectedBuildingType;
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
        const wasDeploying = this.canDeploy;
        this._currentBattleState = state;
        
        // 状态切换时安全取消拖拽
        if (wasDeploying && !this.canDeploy) {
            this.cancelMergeDrag();
            console.log('[GridBuild] 状态切换，取消拖拽');
        }
    }
    
    /**
     * Day12: 设置当前关卡和波次（用于埋点上下文）
     */
    setLevelContext(levelId: LevelId, waveIndex: number) {
        this._currentLevelId = levelId;
        this._currentWaveIndex = waveIndex;
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
            console.log(`[GridBuild] 格子不可用: valid=${cell?.isValid}, occupied=${cell?.isOccupied}`);
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
        
        // 创建建筑节点
        this.createBuildingNode(building, cell.worldPos);
        
        // 更新网格渲染
        this.renderGrid();
        
        console.log(`[GridBuild] 放置建筑: ${type} 于 (${gridPos.row}, ${gridPos.col}), 消耗 ${config.dpCost} DP`);
        
        // Day8: 落子音效
        AudioService.play(SfxId.Place);
        
        GridEvents.emit(EVENT_BUILDING_PLACED, building);
        
        // 检查是否触发首次可合成
        this.checkAndEmitMergeAvailable();
        
        return true;
    }
    
    /**
     * 创建建筑节点（占位图形）
     */
    private createBuildingNode(building: PlacedBuilding, worldPos: Vec3) {
        const container = this._buildingContainer || this.node;
        const buildingNode = PlaceholderGraphics.createBuilding(container, building.type, building.level);
        buildingNode.setPosition(worldPos);
        building.node = buildingNode;
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
        
        // 更新目标建筑节点外观为 L2
        this.updateBuildingNodeAppearance(targetBuilding, targetCell.worldPos);
        
        // Day6: 补给线 C=5 合成 50% 返还 1 DP
        if (GameData.hasMergeRefundChance() && rollMergeRefund()) {
            GameData.addDP(1);
            console.log(`[GridBuild] 补给加成: 合成返还 1 DP`);
        }
        
        // Day12: 埋点 - 合成成功
        Analytics.trackMergeSuccess(this._currentLevelId, this._currentWaveIndex, targetBuilding.type);
        
        console.log(`[GridBuild] 合成成功: ${targetBuilding.type} 升级到 L2`);
        
        // Day8: 合成音效
        AudioService.play(SfxId.Merge);
        
        GridEvents.emit(EVENT_BUILDING_MERGED, targetBuilding);
        
        return true;
    }
    
    /**
     * 更新建筑节点外观（用于合成后）
     */
    private updateBuildingNodeAppearance(building: PlacedBuilding, worldPos: Vec3) {
        // 销毁旧节点
        if (building.node) {
            building.node.destroy();
        }
        
        // 创建新的 L2 外观节点
        const container = this._buildingContainer || this.node;
        const newNode = PlaceholderGraphics.createBuilding(container, building.type, building.level);
        newNode.setPosition(worldPos);
        building.node = newNode;
    }
    
    /**
     * 创建合成拖拽预览节点
     */
    private createMergeDragPreview(building: PlacedBuilding, pos: Vec3) {
        if (this._mergeDragPreviewNode) {
            this._mergeDragPreviewNode.destroy();
        }
        
        const container = this._buildingContainer || this.node;
        this._mergeDragPreviewNode = PlaceholderGraphics.createBuilding(
            container, 
            building.type, 
            building.level
        );
        this._mergeDragPreviewNode.setPosition(pos);
        
        // 半透明效果
        const graphics = this._mergeDragPreviewNode.getComponent(Graphics);
        if (graphics) {
            graphics.fillColor = new Color(graphics.fillColor.r, graphics.fillColor.g, graphics.fillColor.b, 150);
        }
    }
    
    /**
     * 更新合成目标高亮
     */
    private updateMergeHighlights() {
        if (!this._mergeDragSourcePos) return;
        
        const sourceCell = this.getCell(this._mergeDragSourcePos);
        if (!sourceCell?.building) return;
        
        // 找出所有可合成目标
        this._mergeHighlightCells = [];
        
        for (let row = 0; row < this.GRID_ROWS; row++) {
            for (let col = 0; col < this.GRID_COLS; col++) {
                if (row === this._mergeDragSourcePos.row && col === this._mergeDragSourcePos.col) continue;
                
                const cell = this._grid[row][col];
                if (!cell.building) continue;
                
                const srcConfig = getBuildingConfig(sourceCell.building.type, sourceCell.building.level);
                const tgtConfig = getBuildingConfig(cell.building.type, cell.building.level);
                
                if (srcConfig && tgtConfig && canMerge(srcConfig, tgtConfig)) {
                    this._mergeHighlightCells.push({ row, col });
                }
            }
        }
        
        // 重绘网格
        this.renderGridWithMergeHighlights();
    }
    
    /**
     * 绘制带合成高亮的网格
     */
    private renderGridWithMergeHighlights() {
        if (!this._gridGraphics) return;
        
        this._gridGraphics.clear();
        
        for (let row = 0; row < this.GRID_ROWS; row++) {
            for (let col = 0; col < this.GRID_COLS; col++) {
                const cell = this._grid[row][col];
                const isMergeTarget = this._mergeHighlightCells.some(
                    p => p.row === row && p.col === col
                );
                const isCurrentTarget = this._mergeDragTargetPos && 
                    this._mergeDragTargetPos.row === row && 
                    this._mergeDragTargetPos.col === col;
                
                this.drawCellWithMergeState(cell, isMergeTarget, isCurrentTarget && isMergeTarget);
            }
        }
    }
    
    /**
     * 绘制带合成状态的格子
     */
    private drawCellWithMergeState(cell: GridCell, isMergeTarget: boolean, isActive: boolean) {
        if (!this._gridGraphics) return;
        
        const x = cell.worldPos.x - this.CELL_SIZE / 2;
        const y = cell.worldPos.y - this.CELL_SIZE / 2;
        const padding = 2;
        
        let fillColor: Color;
        if (isActive) {
            fillColor = new Color(100, 255, 100, 180);  // 激活的合成目标
        } else if (isMergeTarget) {
            fillColor = new Color(255, 255, 100, 120);  // 可合成目标
        } else if (cell.isValid) {
            fillColor = cell.isOccupied 
                ? new Color(80, 80, 80, 60) 
                : PLACEHOLDER_COLORS.GRID_VALID;
        } else {
            fillColor = PLACEHOLDER_COLORS.GRID_INVALID;
        }
        
        this._gridGraphics.fillColor = fillColor;
        this._gridGraphics.rect(x + padding, y + padding, this.CELL_SIZE - padding * 2, this.CELL_SIZE - padding * 2);
        this._gridGraphics.fill();
        
        this._gridGraphics.strokeColor = isActive 
            ? new Color(100, 255, 100, 255)
            : isMergeTarget 
                ? new Color(255, 255, 100, 255) 
                : new Color(255, 255, 255, 80);
        this._gridGraphics.lineWidth = isActive ? 3 : isMergeTarget ? 2 : 1;
        this._gridGraphics.rect(x, y, this.CELL_SIZE, this.CELL_SIZE);
        this._gridGraphics.stroke();
    }
    
    /**
     * 完成合成拖拽
     */
    private finishMergeDrag() {
        if (!this._mergeDragSourcePos || !this._mergeDragTargetPos) {
            this.cancelMergeDrag();
            return;
        }
        
        // 检查目标是否为有效合成目标
        const isValidTarget = this._mergeHighlightCells.some(
            p => p.row === this._mergeDragTargetPos!.row && p.col === this._mergeDragTargetPos!.col
        );
        
        if (isValidTarget) {
            const success = this.tryMergeBuildings(this._mergeDragSourcePos, this._mergeDragTargetPos);
            if (success) {
                console.log('[GridBuild] 拖拽合成成功');
            }
        } else {
            console.log('[GridBuild] 拖拽合成取消：无效目标');
        }
        
        this.cancelMergeDrag();
    }
    
    /**
     * 取消合成拖拽（安全清理）
     */
    cancelMergeDrag() {
        this._isMergeDragging = false;
        this._mergeDragSourcePos = null;
        this._mergeDragTargetPos = null;
        this._mergeHighlightCells = [];
        
        if (this._mergeDragPreviewNode) {
            this._mergeDragPreviewNode.destroy();
            this._mergeDragPreviewNode = null;
        }
        
        // 恢复正常网格渲染
        this.renderGrid();
    }
    
    /**
     * 检查是否有可合成的建筑对
     */
    checkMergeAvailable(): boolean {
        const buildings = this.getAllBuildings();
        const l1Buildings = buildings.filter(b => b.level === BuildingLevel.L1);
        
        // 按类型分组检查
        const typeCount: Record<string, number> = {};
        for (const b of l1Buildings) {
            typeCount[b.type] = (typeCount[b.type] || 0) + 1;
        }
        
        // 任意类型有 >= 2 个 L1 即可合成
        for (const count of Object.values(typeCount)) {
            if (count >= 2) return true;
        }
        return false;
    }
    
    /**
     * 检查并触发首次可合成事件
     */
    private checkAndEmitMergeAvailable() {
        if (this._mergeAvailableEmitted) return;
        
        if (this.checkMergeAvailable()) {
            this._mergeAvailableEmitted = true;
            GridEvents.emit(EVENT_MERGE_AVAILABLE);
            console.log('[GridBuild] 首次可合成');
        }
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
        this._buildingCacheDirty = true;
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
        
        this._buildingCacheDirty = true;
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
        // 考虑垂直偏移
        const adjustedY = worldPos.y - this.GRID_OFFSET_Y;
        
        const col = Math.floor((worldPos.x / this.CELL_SIZE) + this.GRID_COLS / 2);
        const row = Math.floor((adjustedY / this.CELL_SIZE) + this.GRID_ROWS / 2);
        
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
        if (this._buildingCacheDirty) {
            const cache = this._buildingCache;
            cache.length = 0;
            for (const b of this._buildings.values()) {
                cache.push(b);
            }
            this._buildingCacheDirty = false;
        }
        return this._buildingCache;
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
        
        this._buildingCache.length = 0;
        this._buildingCacheDirty = true;
        console.log('[GridBuild] 已清空所有建筑');
    }
}
