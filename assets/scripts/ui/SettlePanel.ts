/**
 * SettlePanel.ts
 * 结算面板 UI
 * Day4: 胜利/失败结算显示
 * Day5: 胜利双倍奖励
 * Day7: 使用 AdService 统一广告调用
 */

import { _decorator, Component, Node, Label, Graphics, Color, UITransform } from 'cc';
import { GameData } from '../data/GameData';
import { AdService, AdSlot } from '../ads/AdService';
import { AudioService, SfxId } from '../audio/AudioService';

const { ccclass, property } = _decorator;

export type SettleCallback = () => void;

// 双倍奖励状态
enum DoubleRewardState {
    Idle = 'idle',
    Watching = 'watching',
    Claimed = 'claimed'
}

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
    
    // 双倍按钮（Day5）
    private _doubleBtn: Node | null = null;
    private _doubleBtnLabel: Label | null = null;
    
    // 回调
    private _onConfirm: SettleCallback | null = null;
    
    // 是否胜利
    private _isWin: boolean = false;
    
    // 双倍奖励状态（Day5）
    private _doubleState: DoubleRewardState = DoubleRewardState.Idle;
    private _baseScrap: number = 0;
    private _totalScrap: number = 0;
    
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
        
        // 双倍奖励按钮（Day5/Day7）
        this._doubleBtn = new Node('DoubleBtn');
        this._doubleBtn.parent = panel;
        this._doubleBtn.setPosition(0, -60, 0);
        
        const doubleBtnTransform = this._doubleBtn.addComponent(UITransform);
        doubleBtnTransform.setContentSize(300, 50);
        
        const doubleBtnGraphics = this._doubleBtn.addComponent(Graphics);
        doubleBtnGraphics.fillColor = new Color(255, 180, 0, 255);
        doubleBtnGraphics.roundRect(-150, -25, 300, 50, 8);
        doubleBtnGraphics.fill();
        
        const doubleBtnLabelNode = new Node('Label');
        doubleBtnLabelNode.parent = this._doubleBtn;
        this._doubleBtnLabel = doubleBtnLabelNode.addComponent(Label);
        this._doubleBtnLabel.string = '看完视频，残骸翻倍带走';
        this._doubleBtnLabel.fontSize = 20;
        this._doubleBtnLabel.lineHeight = 26;
        this._doubleBtnLabel.color = new Color(0, 0, 0, 255);
        
        // 确认按钮
        this.confirmBtn = new Node('ConfirmBtn');
        this.confirmBtn.parent = panel;
        this.confirmBtn.setPosition(0, -120, 0);
        
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
        if (this._doubleBtn) {
            this._doubleBtn.on(Node.EventType.TOUCH_END, this.onDoubleClick, this);
        }
    }
    
    /**
     * 显示胜利结算
     */
    showWin(waveCleared: number, totalWaves: number, scrapEarned: number, onConfirm: SettleCallback) {
        this._isWin = true;
        this._onConfirm = onConfirm;
        
        // 重置双倍状态（Day5）
        this._doubleState = DoubleRewardState.Idle;
        this._baseScrap = scrapEarned;
        this._totalScrap = scrapEarned;
        
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
        
        // 显示双倍按钮（仅胜利）
        this.updateDoubleButton();
        
        // 更新边框颜色
        this.updatePanelBorder(new Color(100, 255, 100, 255));
        
        // 发放基础残骸
        GameData.addScrap(scrapEarned);
        
        console.log(`[SettlePanel] 显示胜利结算，基础残骸: ${scrapEarned}`);
    }
    
    /**
     * 显示失败结算
     */
    showLose(waveReached: number, totalWaves: number, scrapEarned: number, onConfirm: SettleCallback) {
        this._isWin = false;
        this._onConfirm = onConfirm;
        
        // 失败不提供双倍（Day5）
        this._doubleState = DoubleRewardState.Claimed;  // 直接置为已领取，禁用按钮
        this._baseScrap = 0;
        this._totalScrap = 0;
        
        if (this.panelRoot) {
            this.panelRoot.active = true;
        }
        
        if (this.titleLabel) {
            this.titleLabel.string = '💀 据点沦陷';
            this.titleLabel.color = new Color(255, 100, 100, 255);
        }
        
        if (this.waveLabel) {
            // Day9: 更清晰的失败文案
            const progress = Math.floor(((waveReached + 1) / totalWaves) * 100);
            this.waveLabel.string = `坚持到第 ${waveReached + 1} 波 (${progress}%)`;
        }
        
        if (this.scrapLabel) {
            // 失败也给 30% 残骸
            const loseScrap = Math.floor(scrapEarned * 0.3);
            this.scrapLabel.string = `抢救残骸: +${loseScrap}`;
            GameData.addScrap(loseScrap);
        }
        
        // 隐藏双倍按钮（失败不提供双倍入口）
        this.updateDoubleButton();
        
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
        // 异步期间禁止确认
        if (this._doubleState === DoubleRewardState.Watching) {
            console.log('[SettlePanel] 广告进行中，请等待');
            return;
        }
        
        console.log('[SettlePanel] 点击确认');
        this.resetAndHide();
    }
    
    /**
     * 双倍按钮点击 - Day7: 使用 AdService
     */
    private async onDoubleClick() {
        if (this._doubleState !== DoubleRewardState.Idle) {
            console.log('[SettlePanel] 双倍奖励不可用');
            return;
        }
        
        // Day8: UI 点击音效
        AudioService.play(SfxId.UiClick);
        
        console.log('[SettlePanel] 请求双倍广告...');
        this._doubleState = DoubleRewardState.Watching;
        this.updateDoubleButton();
        
        // 通过 AdService 请求广告
        const result = await AdService.showRewarded(AdSlot.SettleDouble);
        this.onAdComplete(result.ok);
    }
    
    /**
     * 广告完成回调
     */
    private onAdComplete(success: boolean) {
        if (this._doubleState !== DoubleRewardState.Watching) {
            console.log('[SettlePanel] 重复回调被忽略');
            return;
        }
        
        this._doubleState = DoubleRewardState.Claimed;
        
        if (success) {
            // 额外发放等额残骸
            GameData.addScrap(this._baseScrap);
            this._totalScrap = this._baseScrap * 2;
            
            // 更新显示
            if (this.scrapLabel) {
                this.scrapLabel.string = `获得残骸: +${this._totalScrap} (已双倍)`;
            }
            
            console.log(`[SettlePanel] 模拟广告成功，额外获得: +${this._baseScrap}，总计: ${this._totalScrap}`);
        } else {
            console.log('[SettlePanel] 模拟广告失败/取消');
        }
        
        this.updateDoubleButton();
    }
    
    /**
     * 更新双倍按钮状态
     */
    private updateDoubleButton() {
        if (!this._doubleBtn || !this._doubleBtnLabel) return;
        
        // 仅胜利时显示
        this._doubleBtn.active = this._isWin;
        
        if (!this._isWin) return;
        
        const graphics = this._doubleBtn.getComponent(Graphics);
        
        switch (this._doubleState) {
            case DoubleRewardState.Idle:
                this._doubleBtnLabel.string = '看完视频，残骸翻倍带走';
                if (graphics) {
                    graphics.clear();
                    graphics.fillColor = new Color(255, 180, 0, 255);
                    graphics.roundRect(-150, -25, 300, 50, 8);
                    graphics.fill();
                }
                break;
                
            case DoubleRewardState.Watching:
                this._doubleBtnLabel.string = '加载中...';
                if (graphics) {
                    graphics.clear();
                    graphics.fillColor = new Color(150, 150, 150, 255);
                    graphics.roundRect(-150, -25, 300, 50, 8);
                    graphics.fill();
                }
                break;
                
            case DoubleRewardState.Claimed:
                this._doubleBtnLabel.string = '✓ 已领取双倍';
                if (graphics) {
                    graphics.clear();
                    graphics.fillColor = new Color(100, 150, 100, 255);
                    graphics.roundRect(-150, -25, 300, 50, 8);
                    graphics.fill();
                }
                break;
        }
    }
    
    /**
     * 重置状态并隐藏
     */
    private resetAndHide() {
        // 取消未完成的定时器
        this.unscheduleAllCallbacks();
        
        // 清理回调引用防止悬挂
        const callback = this._onConfirm;
        this._onConfirm = null;
        
        this.hide();
        
        if (callback) {
            callback();
        }
    }
}
