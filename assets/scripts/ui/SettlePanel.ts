/**
 * SettlePanel.ts
 * 结算面板 UI
 * Day4: 胜利/失败结算显示
 */

import { _decorator, Component, Node, Label, Graphics, Color, UITransform } from 'cc';
import { GameData } from '../data/GameData';

const { ccclass, property } = _decorator;

export type SettleCallback = () => void;

@ccclass('SettlePanel')
export class SettlePanel extends Component {
    
    @property(Node)
    panelRoot: Node | null = null;
    
    @property(Label)
    titleLabel: Label | null = null;
    
    @property(Label)
    waveLabel: Label | null = null;
    
    @property(Label)
    scrapLabel: Label | null = null;
    
    @property(Node)
    confirmBtn: Node | null = null;
    
    // 回调
    private _onConfirm: SettleCallback | null = null;
    
    // 是否胜利
    private _isWin: boolean = false;
    
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
        this.panelRoot = new Node('SettlePanelRoot');
        this.panelRoot.parent = this.node;
        
        // 半透明背景
        const mask = new Node('Mask');
        mask.parent = this.panelRoot;
        const maskTransform = mask.addComponent(UITransform);
        maskTransform.setContentSize(720, 1280);
        const maskGraphics = mask.addComponent(Graphics);
        maskGraphics.fillColor = new Color(0, 0, 0, 200);
        maskGraphics.rect(-360, -640, 720, 1280);
        maskGraphics.fill();
        
        // 面板
        const panel = new Node('Panel');
        panel.parent = this.panelRoot;
        const panelTransform = panel.addComponent(UITransform);
        panelTransform.setContentSize(400, 350);
        const panelGraphics = panel.addComponent(Graphics);
        panelGraphics.fillColor = new Color(30, 35, 45, 250);
        panelGraphics.roundRect(-200, -175, 400, 350, 16);
        panelGraphics.fill();
        
        // 标题
        const titleNode = new Node('Title');
        titleNode.parent = panel;
        titleNode.setPosition(0, 120, 0);
        this.titleLabel = titleNode.addComponent(Label);
        this.titleLabel.string = '胜利！';
        this.titleLabel.fontSize = 48;
        this.titleLabel.lineHeight = 56;
        
        // 波次信息
        const waveNode = new Node('Wave');
        waveNode.parent = panel;
        waveNode.setPosition(0, 50, 0);
        this.waveLabel = waveNode.addComponent(Label);
        this.waveLabel.string = '通关波次: 6/6';
        this.waveLabel.fontSize = 24;
        this.waveLabel.lineHeight = 32;
        this.waveLabel.color = new Color(180, 180, 180, 255);
        
        // 残骸奖励
        const scrapNode = new Node('Scrap');
        scrapNode.parent = panel;
        scrapNode.setPosition(0, 0, 0);
        this.scrapLabel = scrapNode.addComponent(Label);
        this.scrapLabel.string = '获得残骸: +30';
        this.scrapLabel.fontSize = 28;
        this.scrapLabel.lineHeight = 36;
        this.scrapLabel.color = new Color(255, 215, 0, 255);
        
        // 确认按钮
        this.confirmBtn = new Node('ConfirmBtn');
        this.confirmBtn.parent = panel;
        this.confirmBtn.setPosition(0, -80, 0);
        
        const btnTransform = this.confirmBtn.addComponent(UITransform);
        btnTransform.setContentSize(200, 50);
        
        const btnGraphics = this.confirmBtn.addComponent(Graphics);
        btnGraphics.fillColor = new Color(50, 150, 200, 255);
        btnGraphics.roundRect(-100, -25, 200, 50, 8);
        btnGraphics.fill();
        
        const btnLabelNode = new Node('Label');
        btnLabelNode.parent = this.confirmBtn;
        const btnLabel = btnLabelNode.addComponent(Label);
        btnLabel.string = '返回大厅';
        btnLabel.fontSize = 24;
        btnLabel.lineHeight = 32;
    }
    
    /**
     * 设置按钮事件
     */
    private setupButtons() {
        if (this.confirmBtn) {
            this.confirmBtn.on(Node.EventType.TOUCH_END, this.onConfirmClick, this);
        }
    }
    
    /**
     * 显示胜利结算
     */
    showWin(waveCleared: number, totalWaves: number, scrapEarned: number, onConfirm: SettleCallback) {
        this._isWin = true;
        this._onConfirm = onConfirm;
        
        if (this.panelRoot) {
            this.panelRoot.active = true;
        }
        
        if (this.titleLabel) {
            this.titleLabel.string = '🎉 胜利！';
            this.titleLabel.color = new Color(100, 255, 100, 255);
        }
        
        if (this.waveLabel) {
            this.waveLabel.string = `通关波次: ${waveCleared}/${totalWaves}`;
        }
        
        if (this.scrapLabel) {
            this.scrapLabel.string = `获得残骸: +${scrapEarned}`;
        }
        
        // 更新边框颜色
        this.updatePanelBorder(new Color(100, 255, 100, 255));
        
        console.log(`[SettlePanel] 显示胜利结算，残骸: ${scrapEarned}`);
    }
    
    /**
     * 显示失败结算
     */
    showLose(waveReached: number, totalWaves: number, scrapEarned: number, onConfirm: SettleCallback) {
        this._isWin = false;
        this._onConfirm = onConfirm;
        
        if (this.panelRoot) {
            this.panelRoot.active = true;
        }
        
        if (this.titleLabel) {
            this.titleLabel.string = '💀 失败';
            this.titleLabel.color = new Color(255, 100, 100, 255);
        }
        
        if (this.waveLabel) {
            this.waveLabel.string = `到达波次: ${waveReached + 1}/${totalWaves}`;
        }
        
        if (this.scrapLabel) {
            // 失败也给 30% 残骸
            const loseScrap = Math.floor(scrapEarned * 0.3);
            this.scrapLabel.string = `获得残骸: +${loseScrap}`;
            GameData.addScrap(loseScrap);
        }
        
        // 更新边框颜色
        this.updatePanelBorder(new Color(255, 100, 100, 255));
        
        console.log(`[SettlePanel] 显示失败结算`);
    }
    
    /**
     * 更新面板边框颜色
     */
    private updatePanelBorder(color: Color) {
        const panel = this.panelRoot?.getChildByName('Panel');
        if (panel) {
            const graphics = panel.getComponent(Graphics);
            if (graphics) {
                graphics.clear();
                graphics.fillColor = new Color(30, 35, 45, 250);
                graphics.roundRect(-200, -175, 400, 350, 16);
                graphics.fill();
                graphics.strokeColor = color;
                graphics.lineWidth = 3;
                graphics.roundRect(-200, -175, 400, 350, 16);
                graphics.stroke();
            }
        }
    }
    
    /**
     * 隐藏面板
     */
    hide() {
        if (this.panelRoot) {
            this.panelRoot.active = false;
        }
    }
    
    /**
     * 确认按钮点击
     */
    private onConfirmClick() {
        console.log('[SettlePanel] 点击确认');
        this.hide();
        if (this._onConfirm) {
            this._onConfirm();
        }
    }
}
