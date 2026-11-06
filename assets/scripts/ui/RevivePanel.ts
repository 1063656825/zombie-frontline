/**
 * RevivePanel.ts
 * 复活面板 UI
 * Day4: 失败时显示复活选项
 * Day7: 使用 AdService 统一广告调用
 */

import { _decorator, Component, Node, Label, Graphics, Color, UITransform, Vec3 } from 'cc';
import { GameData } from '../data/GameData';
import { AdService, AdSlot } from '../ads/AdService';

const { ccclass, property } = _decorator;

// 复活面板事件回调
export type ReviveCallback = () => void;
export type GiveUpCallback = () => void;

@ccclass('RevivePanel')
export class RevivePanel extends Component {
    
    @property(Node)
    panelRoot: Node | null = null;
    
    @property(Label)
    titleLabel: Label | null = null;
    
    @property(Label)
    messageLabel: Label | null = null;
    
    @property(Node)
    reviveBtn: Node | null = null;
    
    @property(Node)
    giveUpBtn: Node | null = null;
    
    @property(Label)
    reviveBtnLabel: Label | null = null;
    
    @property(Label)
    giveUpBtnLabel: Label | null = null;
    
    // 回调
    private _onRevive: ReviveCallback | null = null;
    private _onGiveUp: GiveUpCallback | null = null;
    
    // 是否可以复活
    private _canRevive: boolean = true;
    
    // 广告状态
    private _isWatchingAd: boolean = false;
    
    onLoad() {
        this.hide();
    }
    
    start() {
        if (!this.panelRoot) {
            this.createPanel();
        }
        
        this.setupButtons();
    }
    
    /**
     * 动态创建面板
     */
    private createPanel() {
        this.panelRoot = new Node('RevivePanelRoot');
        this.panelRoot.parent = this.node;
        this.panelRoot.setPosition(0, 0, 0);
        
        // 半透明背景遮罩
        const mask = new Node('Mask');
        mask.parent = this.panelRoot;
        const maskTransform = mask.addComponent(UITransform);
        maskTransform.setContentSize(720, 1280);
        const maskGraphics = mask.addComponent(Graphics);
        maskGraphics.fillColor = new Color(0, 0, 0, 180);
        maskGraphics.rect(-360, -640, 720, 1280);
        maskGraphics.fill();
        
        // 面板背景
        const panel = new Node('Panel');
        panel.parent = this.panelRoot;
        const panelTransform = panel.addComponent(UITransform);
        panelTransform.setContentSize(400, 320);
        const panelGraphics = panel.addComponent(Graphics);
        panelGraphics.fillColor = new Color(40, 40, 50, 250);
        panelGraphics.roundRect(-200, -160, 400, 320, 16);
        panelGraphics.fill();
        panelGraphics.strokeColor = new Color(255, 100, 100, 255);
        panelGraphics.lineWidth = 3;
        panelGraphics.roundRect(-200, -160, 400, 320, 16);
        panelGraphics.stroke();
        
        // 标题
        const titleNode = new Node('Title');
        titleNode.parent = panel;
        titleNode.setPosition(0, 110, 0);
        this.titleLabel = titleNode.addComponent(Label);
        this.titleLabel.string = '据点被摧毁！';
        this.titleLabel.fontSize = 36;
        this.titleLabel.lineHeight = 44;
        this.titleLabel.color = new Color(255, 100, 100, 255);
        
        // 消息
        const msgNode = new Node('Message');
        msgNode.parent = panel;
        msgNode.setPosition(0, 50, 0);
        this.messageLabel = msgNode.addComponent(Label);
        this.messageLabel.string = '';
        this.messageLabel.fontSize = 22;
        this.messageLabel.lineHeight = 30;
        this.messageLabel.color = new Color(200, 200, 200, 255);
        
        // 复活按钮 - Day7 更新文案
        this.reviveBtn = this.createButton(panel, '看完视频，站起来再打一波', 0, -30, new Color(50, 180, 50, 255), 300);
        const reviveLabelNode = this.reviveBtn.getChildByName('Label');
        if (reviveLabelNode) {
            this.reviveBtnLabel = reviveLabelNode.getComponent(Label);
        }
        
        // 放弃按钮
        this.giveUpBtn = this.createButton(panel, '放弃', 0, -100, new Color(100, 100, 100, 255), 200);
        const giveUpLabelNode = this.giveUpBtn.getChildByName('Label');
        if (giveUpLabelNode) {
            this.giveUpBtnLabel = giveUpLabelNode.getComponent(Label);
        }
    }
    
    /**
     * 创建按钮
     */
    private createButton(parent: Node, text: string, x: number, y: number, color: Color, width: number = 200): Node {
        const btn = new Node('Button');
        btn.parent = parent;
        btn.setPosition(x, y, 0);
        
        const transform = btn.addComponent(UITransform);
        transform.setContentSize(width, 50);
        
        const graphics = btn.addComponent(Graphics);
        graphics.fillColor = color;
        graphics.roundRect(-width / 2, -25, width, 50, 8);
        graphics.fill();
        
        const labelNode = new Node('Label');
        labelNode.parent = btn;
        const label = labelNode.addComponent(Label);
        label.string = text;
        label.fontSize = 20;
        label.lineHeight = 26;
        label.color = new Color(255, 255, 255, 255);
        
        return btn;
    }
    
    /**
     * 设置按钮事件
     */
    private setupButtons() {
        if (this.reviveBtn) {
            this.reviveBtn.on(Node.EventType.TOUCH_END, this.onReviveClick, this);
        }
        if (this.giveUpBtn) {
            this.giveUpBtn.on(Node.EventType.TOUCH_END, this.onGiveUpClick, this);
        }
    }
    
    /**
     * 显示复活面板
     */
    show(canRevive: boolean, onRevive: ReviveCallback, onGiveUp: GiveUpCallback) {
        this._canRevive = canRevive;
        this._onRevive = onRevive;
        this._onGiveUp = onGiveUp;
        this._isWatchingAd = false;
        
        if (this.panelRoot) {
            this.panelRoot.active = true;
        }
        
        this.updateUI();
        
        console.log(`[RevivePanel] 显示复活面板，可复活: ${canRevive}`);
    }
    
    /**
     * 隐藏复活面板
     */
    hide() {
        if (this.panelRoot) {
            this.panelRoot.active = false;
        }
    }
    
    /**
     * 更新 UI
     */
    private updateUI() {
        if (this.titleLabel) {
            this.titleLabel.string = '据点被摧毁！';
        }
        
        if (this.messageLabel) {
            if (this._canRevive) {
                this.messageLabel.string = '观看视频复活，回复 50% HP！\n（本关仅限 1 次）';
            } else {
                this.messageLabel.string = '本关已使用过复活机会';
            }
        }
        
        // 复活按钮状态
        if (this.reviveBtn) {
            this.reviveBtn.active = this._canRevive;
        }
        
        if (this.reviveBtnLabel) {
            this.reviveBtnLabel.string = '看完视频，站起来再打一波';
        }
        
        if (this.giveUpBtnLabel) {
            this.giveUpBtnLabel.string = this._canRevive ? '放弃' : '返回大厅';
        }
    }
    
    /**
     * 点击复活按钮 - Day7: 使用 AdService
     */
    private async onReviveClick() {
        if (!this._canRevive || this._isWatchingAd) return;
        
        console.log('[RevivePanel] 请求复活广告');
        this._isWatchingAd = true;
        
        // 更新按钮文字
        if (this.reviveBtnLabel) {
            this.reviveBtnLabel.string = '加载中...';
        }
        
        // 通过 AdService 请求广告
        const result = await AdService.showRewarded(AdSlot.Revive);
        
        this._isWatchingAd = false;
        
        if (result.ok) {
            console.log('[RevivePanel] 广告完成，执行复活');
            this.hide();
            if (this._onRevive) {
                this._onRevive();
            }
        } else {
            console.log(`[RevivePanel] 广告失败: ${result.reason}`);
            if (this.reviveBtnLabel) {
                this.reviveBtnLabel.string = '看完视频，站起来再打一波';
            }
        }
    }
    
    /**
     * 点击放弃按钮
     */
    private onGiveUpClick() {
        if (this._isWatchingAd) return;
        
        console.log('[RevivePanel] 放弃复活');
        this.hide();
        if (this._onGiveUp) {
            this._onGiveUp();
        }
    }
}
