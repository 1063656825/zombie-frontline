/**
 * SupplyButton.ts
 * 波次补给按钮
 * Day7: Deploy 窗口 DP<3 时显示，看视频获得 +3 DP
 */

import { _decorator, Component, Node, Label, Graphics, Color, UITransform } from 'cc';
import { GameData, GameEvents, EVENT_DP_CHANGED } from '../data/GameData';
import { AdService, AdSlot } from '../ads/AdService';
import { BattleState } from '../battle/BattleFlow';

const { ccclass, property } = _decorator;

@ccclass('SupplyButton')
export class SupplyButton extends Component {
    
    @property(Node)
    buttonNode: Node | null = null;
    
    @property(Label)
    buttonLabel: Label | null = null;
    
    // 本局是否已使用
    private _usedThisRun: boolean = false;
    
    // 是否正在看广告
    private _isWatching: boolean = false;
    
    // 当前战斗状态
    private _currentState: BattleState = BattleState.None;
    
    // 回调
    private _onSupplyGranted: (() => void) | null = null;
    
    start() {
        if (!this.buttonNode) {
            this.createButton();
        }
        this.setupEvents();
        this.updateVisibility();
    }
    
    onDestroy() {
        GameEvents.off(EVENT_DP_CHANGED, this.onDpChanged, this);
    }
    
    /**
     * 动态创建按钮
     */
    private createButton() {
        this.buttonNode = new Node('SupplyButton');
        this.buttonNode.parent = this.node;
        this.buttonNode.setPosition(0, 350, 0);  // 屏幕上方
        
        const transform = this.buttonNode.addComponent(UITransform);
        transform.setContentSize(300, 50);
        
        const graphics = this.buttonNode.addComponent(Graphics);
        graphics.fillColor = new Color(100, 180, 255, 255);
        graphics.roundRect(-150, -25, 300, 50, 8);
        graphics.fill();
        
        const labelNode = new Node('Label');
        labelNode.parent = this.buttonNode;
        this.buttonLabel = labelNode.addComponent(Label);
        this.buttonLabel.string = '看完视频，紧急空投 3 部署点';
        this.buttonLabel.fontSize = 18;
        this.buttonLabel.lineHeight = 24;
        this.buttonLabel.color = new Color(255, 255, 255, 255);
        
        this.buttonNode.on(Node.EventType.TOUCH_END, this.onButtonClick, this);
    }
    
    /**
     * 设置事件监听
     */
    private setupEvents() {
        GameEvents.on(EVENT_DP_CHANGED, this.onDpChanged, this);
    }
    
    /**
     * DP 变化回调
     */
    private onDpChanged() {
        this.updateVisibility();
    }
    
    /**
     * 设置回调
     */
    setOnSupplyGranted(callback: () => void) {
        this._onSupplyGranted = callback;
    }
    
    /**
     * 设置战斗状态
     */
    setBattleState(state: BattleState) {
        this._currentState = state;
        this.updateVisibility();
    }
    
    /**
     * 重置本局状态
     */
    resetForNewRun() {
        this._usedThisRun = false;
        this._isWatching = false;
        this.updateVisibility();
    }
    
    /**
     * 更新可见性
     */
    private updateVisibility() {
        if (!this.buttonNode) return;
        
        // 条件：Deploy 阶段 + DP < 3 + 本局未使用 + 未在看广告
        const isDeployPhase = this._currentState === BattleState.DeployFast || 
                              this._currentState === BattleState.DeployTune;
        const dpLow = GameData.dp < 3;
        const canShow = isDeployPhase && dpLow && !this._usedThisRun && !this._isWatching;
        
        this.buttonNode.active = canShow;
        
        if (canShow) {
            console.log('[SupplyButton] 显示补给按钮 (DP < 3)');
        }
    }
    
    /**
     * 按钮点击
     */
    private async onButtonClick() {
        if (this._usedThisRun || this._isWatching) return;
        
        console.log('[SupplyButton] 请求补给广告');
        this._isWatching = true;
        
        if (this.buttonLabel) {
            this.buttonLabel.string = '加载中...';
        }
        
        // 通过 AdService 请求广告
        const result = await AdService.showRewarded(AdSlot.WaveSupply);
        
        this._isWatching = false;
        
        if (result.ok) {
            this._usedThisRun = true;
            
            // 发放 +3 DP（受上限限制）
            GameData.addDP(3);
            console.log(`[SupplyButton] 补给成功，+3 DP，当前 DP: ${GameData.dp}`);
            
            if (this._onSupplyGranted) {
                this._onSupplyGranted();
            }
        } else {
            console.log(`[SupplyButton] 补给广告失败: ${result.reason}`);
            if (this.buttonLabel) {
                this.buttonLabel.string = '看完视频，紧急空投 3 部署点';
            }
        }
        
        this.updateVisibility();
    }
}
