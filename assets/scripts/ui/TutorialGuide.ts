/**
 * TutorialGuide.ts
 * 引导气泡系统
 * Day5: 首次落子、战斗点屏、首次可合成引导
 * 非阻塞，不抢触摸，3秒自动消失
 */

import { _decorator, Component, Node, Label, Graphics, Color, UITransform, Vec3, sys } from 'cc';

const { ccclass, property } = _decorator;

// 引导类型
export enum TutorialType {
    FirstPlace = 'first_place',      // 首次落子
    CombatAim = 'combat_aim',        // 战斗点屏转向
    FirstMerge = 'first_merge'       // 首次可合成
}

// 引导文案
const TUTORIAL_TEXTS: Record<TutorialType, string> = {
    [TutorialType.FirstPlace]: '点击下方建筑按钮，再点绿色格子放置',
    [TutorialType.CombatAim]: '点击屏幕改变朝向，自动攻击扇形范围内敌人',
    [TutorialType.FirstMerge]: '拖动同种 L1 建筑到另一个上可合成 L2'
};

// 引导位置（相对屏幕中心）
const TUTORIAL_POSITIONS: Record<TutorialType, Vec3> = {
    [TutorialType.FirstPlace]: new Vec3(0, -200, 0),
    [TutorialType.CombatAim]: new Vec3(0, 100, 0),
    [TutorialType.FirstMerge]: new Vec3(0, -100, 0)
};

// localStorage key 前缀
const STORAGE_KEY_PREFIX = 'tutorial_shown_';

@ccclass('TutorialGuide')
export class TutorialGuide extends Component {
    
    private _bubbleNode: Node | null = null;
    private _labelNode: Label | null = null;
    private _hideTimer: number = 0;
    private _currentType: TutorialType | null = null;
    
    // 显示时长（秒）
    private readonly SHOW_DURATION = 3;
    
    start() {
        this.createBubble();
        this.hide();
    }
    
    onDestroy() {
        // 清理定时器
        if (this._hideTimer) {
            this.unschedule(this.hide);
        }
    }
    
    /**
     * 创建气泡节点
     */
    private createBubble() {
        this._bubbleNode = new Node('TutorialBubble');
        this._bubbleNode.parent = this.node;
        
        // 背景
        const bgNode = new Node('BubbleBg');
        bgNode.parent = this._bubbleNode;
        const transform = bgNode.addComponent(UITransform);
        transform.setContentSize(400, 60);
        
        const graphics = bgNode.addComponent(Graphics);
        graphics.fillColor = new Color(0, 0, 0, 200);
        graphics.roundRect(-200, -30, 400, 60, 12);
        graphics.fill();
        graphics.strokeColor = new Color(255, 215, 0, 255);
        graphics.lineWidth = 2;
        graphics.roundRect(-200, -30, 400, 60, 12);
        graphics.stroke();
        
        // 文字
        const labelNode = new Node('BubbleLabel');
        labelNode.parent = this._bubbleNode;
        this._labelNode = labelNode.addComponent(Label);
        this._labelNode.string = '';
        this._labelNode.fontSize = 20;
        this._labelNode.lineHeight = 26;
        this._labelNode.color = new Color(255, 255, 255, 255);
    }
    
    /**
     * 显示引导
     */
    show(type: TutorialType): boolean {
        // 检查是否已显示过
        if (this.hasShown(type)) {
            return false;
        }
        
        // 如果当前正在显示其他引导，不打断
        if (this._currentType !== null && this._bubbleNode?.active) {
            return false;
        }
        
        this._currentType = type;
        
        // 设置文案和位置
        if (this._labelNode) {
            this._labelNode.string = TUTORIAL_TEXTS[type];
        }
        
        if (this._bubbleNode) {
            this._bubbleNode.setPosition(TUTORIAL_POSITIONS[type]);
            this._bubbleNode.active = true;
        }
        
        // 标记已显示
        this.markAsShown(type);
        
        // 设置自动隐藏
        this.unschedule(this.hide);
        this.scheduleOnce(this.hide, this.SHOW_DURATION);
        
        console.log(`[TutorialGuide] 显示引导: ${type}`);
        return true;
    }
    
    /**
     * 隐藏气泡
     */
    hide() {
        if (this._bubbleNode) {
            this._bubbleNode.active = false;
        }
        this._currentType = null;
    }
    
    /**
     * 检查是否已显示过
     */
    hasShown(type: TutorialType): boolean {
        const key = STORAGE_KEY_PREFIX + type;
        return sys.localStorage.getItem(key) === 'true';
    }
    
    /**
     * 标记为已显示
     */
    private markAsShown(type: TutorialType) {
        const key = STORAGE_KEY_PREFIX + type;
        sys.localStorage.setItem(key, 'true');
    }
    
    /**
     * 重置所有引导状态（调试用）
     */
    static resetAll() {
        for (const type of Object.values(TutorialType)) {
            const key = STORAGE_KEY_PREFIX + type;
            sys.localStorage.removeItem(key);
        }
        console.log('[TutorialGuide] 已重置所有引导状态');
    }
    
    /**
     * 重置单关引导（同关重开时调用）
     */
    resetSession() {
        this.hide();
        this.unschedule(this.hide);
    }
}
