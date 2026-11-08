/**
 * BuildingPanel.ts
 * 底部建筑选择面板
 * Day2: 三建筑按钮、DP 校验、战斗锁定
 */

import { _decorator, Component, Node, Label, Color, Graphics, UITransform, EventTarget, Sprite } from 'cc';
import { BuildingType, BuildingLevel, getBuildingConfig, BUILDING_NAMES } from '../battle/BuildingConfig';
import { GameData, GameEvents, EVENT_DP_CHANGED } from '../data/GameData';
import { BattleState, BattleEvents, EVENT_STATE_CHANGED } from '../battle/BattleFlow';
import { drawPixelPanel, PIXEL_UI } from '../pixel/PixelChrome';

const { ccclass, property } = _decorator;

// 建筑面板事件
export const BuildingPanelEvents = new EventTarget();
export const EVENT_BUILDING_SELECTED = 'building_selected';
export const EVENT_BUILDING_DESELECTED = 'building_deselected';

/**
 * 建筑按钮数据
 */
interface BuildingButton {
    type: BuildingType;
    node: Node;
    label: Label | null;
    costLabel: Label | null;
    isEnabled: boolean;
}

@ccclass('BuildingPanel')
export class BuildingPanel extends Component {
    
    @property(Node)
    panelContainer: Node | null = null;
    
    // 按钮节点引用
    @property(Node)
    machineGunBtn: Node | null = null;
    
    @property(Node)
    cannonBtn: Node | null = null;
    
    @property(Node)
    mineBtn: Node | null = null;
    
    // 按钮数据
    private _buttons: BuildingButton[] = [];
    
    // 当前选中的建筑类型
    private _selectedType: BuildingType | null = null;
    
    // 当前战斗状态
    private _currentState: BattleState = BattleState.None;
    
    // 按钮尺寸配置
    private readonly BTN_WIDTH = 100;
    private readonly BTN_HEIGHT = 80;
    private readonly BTN_SPACING = 20;
    
    get selectedType(): BuildingType | null {
        return this._selectedType;
    }
    
    get canInteract(): boolean {
        return this._currentState === BattleState.DeployFast ||
               this._currentState === BattleState.DeployTune;
    }
    
    onLoad() {
        // 监听事件
        GameEvents.on(EVENT_DP_CHANGED, this.onDPChanged, this);
        BattleEvents.on(EVENT_STATE_CHANGED, this.onBattleStateChanged, this);
    }
    
    onDestroy() {
        GameEvents.off(EVENT_DP_CHANGED, this.onDPChanged, this);
        BattleEvents.off(EVENT_STATE_CHANGED, this.onBattleStateChanged, this);
    }
    
    start() {
        this.initButtons();
        this.updateAllButtons();
    }
    
    /**
     * 初始化按钮
     */
    private initButtons() {
        // 如果没有预设按钮节点，动态创建
        if (!this.machineGunBtn || !this.cannonBtn || !this.mineBtn) {
            this.createButtons();
        } else {
            // 使用预设节点
            this.setupButton(this.machineGunBtn, BuildingType.MachineGun);
            this.setupButton(this.cannonBtn, BuildingType.Cannon);
            this.setupButton(this.mineBtn, BuildingType.Mine);
        }
        
        console.log('[BuildingPanel] 按钮初始化完成');
    }
    
    /**
     * 动态创建按钮
     */
    private createButtons() {
        const container = this.panelContainer || this.node;
        const types = [BuildingType.MachineGun, BuildingType.Cannon, BuildingType.Mine];
        const totalWidth = types.length * this.BTN_WIDTH + (types.length - 1) * this.BTN_SPACING;
        const startX = -totalWidth / 2 + this.BTN_WIDTH / 2;
        
        types.forEach((type, index) => {
            const btnNode = this.createButtonNode(type);
            btnNode.parent = container;
            btnNode.setPosition(startX + index * (this.BTN_WIDTH + this.BTN_SPACING), 0, 0);
            this.setupButton(btnNode, type);
        });
    }
    
    /**
     * 创建单个按钮节点
     */
    private createButtonNode(type: BuildingType): Node {
        const node = new Node(`Btn_${type}`);
        
        // 添加 UITransform
        const transform = node.addComponent(UITransform);
        transform.setContentSize(this.BTN_WIDTH, this.BTN_HEIGHT);
        
        // 绘制背景
        const graphics = node.addComponent(Graphics);
        this.drawButtonBackground(graphics, type, true);
        
        // 添加名称标签
        const nameNode = new Node('NameLabel');
        nameNode.parent = node;
        nameNode.setPosition(0, 15, 0);
        const nameLabel = nameNode.addComponent(Label);
        nameLabel.string = BUILDING_NAMES[type];
        nameLabel.fontSize = 18;
        nameLabel.lineHeight = 22;
        nameLabel.color = new Color(255, 255, 255, 255);
        
        // 添加费用标签
        const costNode = new Node('CostLabel');
        costNode.parent = node;
        costNode.setPosition(0, -15, 0);
        const costLabel = costNode.addComponent(Label);
        const config = getBuildingConfig(type, BuildingLevel.L1);
        costLabel.string = `${config?.dpCost || 0} DP`;
        costLabel.fontSize = 16;
        costLabel.lineHeight = 20;
        costLabel.color = new Color(255, 215, 0, 255);
        
        return node;
    }
    
    /**
     * 绘制按钮背景
     */
    private drawButtonBackground(graphics: Graphics, type: BuildingType, isEnabled: boolean) {
        graphics.clear();
        
        // 背景色（根据启用状态）
        const baseAlpha = isEnabled ? 200 : 100;
        let bgColor: Color;
        
        switch (type) {
            case BuildingType.MachineGun:
                bgColor = new Color(76, 175, 80, baseAlpha);
                break;
            case BuildingType.Cannon:
                bgColor = new Color(255, 152, 0, baseAlpha);
                break;
            case BuildingType.Mine:
                bgColor = new Color(156, 39, 176, baseAlpha);
                break;
            default:
                bgColor = new Color(100, 100, 100, baseAlpha);
        }
        
        const border = isEnabled ? PIXEL_UI.accent : PIXEL_UI.muted;
        drawPixelPanel(
            graphics,
            -this.BTN_WIDTH / 2,
            -this.BTN_HEIGHT / 2,
            this.BTN_WIDTH,
            this.BTN_HEIGHT,
            bgColor,
            border
        );
    }
    
    /**
     * 设置按钮
     */
    private setupButton(node: Node, type: BuildingType) {
        // 查找或创建标签
        let nameLabel: Label | null = null;
        let costLabel: Label | null = null;
        
        const nameLabelNode = node.getChildByName('NameLabel') || node.getChildByName('Label');
        if (nameLabelNode) {
            nameLabel = nameLabelNode.getComponent(Label);
            if (nameLabel) {
                nameLabel.string = BUILDING_NAMES[type];
            }
        }
        
        const costLabelNode = node.getChildByName('CostLabel');
        if (costLabelNode) {
            costLabel = costLabelNode.getComponent(Label);
        }
        
        // 确保有 UITransform
        let transform = node.getComponent(UITransform);
        if (!transform) {
            transform = node.addComponent(UITransform);
            transform.setContentSize(this.BTN_WIDTH, this.BTN_HEIGHT);
        }
        
        // 绑定点击事件
        node.on(Node.EventType.TOUCH_END, () => this.onButtonClick(type), this);
        
        // 记录按钮数据
        this._buttons.push({
            type,
            node,
            label: nameLabel,
            costLabel,
            isEnabled: true
        });
    }
    
    /**
     * 按钮点击回调
     */
    private onButtonClick(type: BuildingType) {
        if (!this.canInteract) {
            console.log('[BuildingPanel] 非部署阶段，无法选择建筑');
            return;
        }
        
        const config = getBuildingConfig(type, BuildingLevel.L1);
        if (!config) return;
        
        // 检查 DP
        if (GameData.dp < config.dpCost) {
            console.log(`[BuildingPanel] DP 不足: 需要 ${config.dpCost}, 当前 ${GameData.dp}`);
            return;
        }
        
        // 切换选中状态
        if (this._selectedType === type) {
            this.deselectBuilding();
        } else {
            this.selectBuilding(type);
        }
    }
    
    /**
     * 选中建筑类型
     */
    selectBuilding(type: BuildingType) {
        this._selectedType = type;
        this.updateAllButtons();
        
        console.log(`[BuildingPanel] 选中建筑: ${BUILDING_NAMES[type]}`);
        BuildingPanelEvents.emit(EVENT_BUILDING_SELECTED, type);
    }
    
    /**
     * 取消选中
     */
    deselectBuilding() {
        if (this._selectedType) {
            console.log(`[BuildingPanel] 取消选中: ${BUILDING_NAMES[this._selectedType]}`);
        }
        this._selectedType = null;
        this.updateAllButtons();
        
        BuildingPanelEvents.emit(EVENT_BUILDING_DESELECTED);
    }
    
    /**
     * DP 变化回调
     */
    private onDPChanged(dp: number, maxDp: number) {
        this.updateAllButtons();
    }
    
    /**
     * 战斗状态变化回调
     */
    private onBattleStateChanged(newState: BattleState, oldState: BattleState) {
        this._currentState = newState;
        
        // 非部署阶段取消选中
        if (!this.canInteract && this._selectedType) {
            this.deselectBuilding();
        }
        
        this.updateAllButtons();
    }
    
    /**
     * 更新所有按钮状态
     */
    updateAllButtons() {
        for (const btn of this._buttons) {
            this.updateButton(btn);
        }
    }
    
    /**
     * 更新单个按钮状态
     */
    private updateButton(btn: BuildingButton) {
        const config = getBuildingConfig(btn.type, BuildingLevel.L1);
        if (!config) return;
        
        // 计算是否可用
        const hasEnoughDP = GameData.dp >= config.dpCost;
        const isDeployPhase = this.canInteract;
        btn.isEnabled = hasEnoughDP && isDeployPhase;
        
        // 是否选中
        const isSelected = this._selectedType === btn.type;
        
        // 更新视觉效果
        const graphics = btn.node.getComponent(Graphics);
        if (graphics) {
            this.drawButtonWithState(graphics, btn.type, btn.isEnabled, isSelected);
        }
        
        // 更新费用标签颜色
        if (btn.costLabel) {
            btn.costLabel.color = hasEnoughDP 
                ? new Color(255, 215, 0, 255) 
                : new Color(255, 100, 100, 255);
        }
    }
    
    /**
     * 绘制带状态的按钮
     */
    private drawButtonWithState(graphics: Graphics, type: BuildingType, isEnabled: boolean, isSelected: boolean) {
        graphics.clear();
        
        const baseAlpha = isEnabled ? (isSelected ? 255 : 200) : 80;
        let bgColor: Color;
        
        switch (type) {
            case BuildingType.MachineGun:
                bgColor = new Color(76, 175, 80, baseAlpha);
                break;
            case BuildingType.Cannon:
                bgColor = new Color(255, 152, 0, baseAlpha);
                break;
            case BuildingType.Mine:
                bgColor = new Color(156, 39, 176, baseAlpha);
                break;
            default:
                bgColor = new Color(100, 100, 100, baseAlpha);
        }
        
        // 背景
        graphics.fillColor = bgColor;
        graphics.roundRect(-this.BTN_WIDTH / 2, -this.BTN_HEIGHT / 2, this.BTN_WIDTH, this.BTN_HEIGHT, 8);
        graphics.fill();
        
        // 边框（选中时高亮）
        if (isSelected) {
            graphics.strokeColor = new Color(255, 255, 100, 255);
            graphics.lineWidth = 4;
        } else {
            graphics.strokeColor = isEnabled 
                ? new Color(255, 255, 255, 180) 
                : new Color(80, 80, 80, 150);
            graphics.lineWidth = 2;
        }
        graphics.roundRect(-this.BTN_WIDTH / 2, -this.BTN_HEIGHT / 2, this.BTN_WIDTH, this.BTN_HEIGHT, 8);
        graphics.stroke();
        
        // 禁用状态叠加层
        if (!isEnabled) {
            graphics.fillColor = new Color(0, 0, 0, 100);
            graphics.roundRect(-this.BTN_WIDTH / 2, -this.BTN_HEIGHT / 2, this.BTN_WIDTH, this.BTN_HEIGHT, 8);
            graphics.fill();
        }
    }
}
