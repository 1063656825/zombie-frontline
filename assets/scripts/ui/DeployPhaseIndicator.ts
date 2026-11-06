/**
 * DeployPhaseIndicator.ts
 * Day11: 部署双节奏视觉反馈
 * - DeployFast: 绿色计时条，快节奏，最后2s警告脉冲
 * - DeployTune: 黄色计时条，慢节奏，稳定
 */

import { _decorator, Component, Node, Graphics, Color, Label, UITransform, tween, Tween, Vec3 } from 'cc';
import { BattleState } from '../battle/BattleFlow';

const { ccclass, property } = _decorator;

// 阶段样式配置
export interface PhaseStyle {
    barColor: Color;
    glowColor: Color;
    textColor: Color;
    phaseName: string;
    pulseSpeed: number;  // 脉冲速度（每秒次数）
}

export const DEPLOY_FAST_STYLE: PhaseStyle = {
    barColor: new Color(80, 200, 100, 255),    // 绿色
    glowColor: new Color(100, 255, 120, 200),
    textColor: new Color(200, 255, 200, 255),
    phaseName: '快速落子',
    pulseSpeed: 2
};

export const DEPLOY_TUNE_STYLE: PhaseStyle = {
    barColor: new Color(255, 200, 80, 255),    // 黄色
    glowColor: new Color(255, 220, 100, 200),
    textColor: new Color(255, 240, 200, 255),
    phaseName: '微调确认',
    pulseSpeed: 1
};

export const URGENCY_STYLE: PhaseStyle = {
    barColor: new Color(255, 100, 80, 255),    // 红色
    glowColor: new Color(255, 120, 100, 230),
    textColor: new Color(255, 200, 200, 255),
    phaseName: '即将开战!',
    pulseSpeed: 4
};

/**
 * 获取阶段样式
 */
export function getPhaseStyle(state: BattleState, timer: number): PhaseStyle {
    if (state === BattleState.DeployFast) {
        // 最后 2 秒进入紧急状态
        if (timer <= 2) {
            return URGENCY_STYLE;
        }
        return DEPLOY_FAST_STYLE;
    } else if (state === BattleState.DeployTune) {
        return DEPLOY_TUNE_STYLE;
    }
    return DEPLOY_FAST_STYLE;
}

/**
 * 计算计时条进度 (0-1)
 */
export function calculateProgress(timer: number, maxTime: number): number {
    if (maxTime <= 0) return 0;
    return Math.max(0, Math.min(1, timer / maxTime));
}

@ccclass('DeployPhaseIndicator')
export class DeployPhaseIndicator extends Component {
    
    private _barGraphics: Graphics | null = null;
    private _glowGraphics: Graphics | null = null;
    private _phaseLabel: Label | null = null;
    private _timerLabel: Label | null = null;
    
    private _currentStyle: PhaseStyle = DEPLOY_FAST_STYLE;
    private _progress: number = 1;
    private _maxTime: number = 8;
    private _isVisible: boolean = false;
    
    // 脉冲动画
    private _pulseScale: number = 1;
    private _pulseDirection: number = 1;
    
    // 配置
    private readonly BAR_WIDTH = 400;
    private readonly BAR_HEIGHT = 20;
    private readonly GLOW_SIZE = 6;
    
    start() {
        this.createUI();
        this.hide();
    }
    
    private createUI() {
        // 容器 Transform
        let transform = this.node.getComponent(UITransform);
        if (!transform) {
            transform = this.node.addComponent(UITransform);
        }
        transform.setContentSize(this.BAR_WIDTH + 40, 80);
        
        // 光晕层
        const glowNode = new Node('Glow');
        glowNode.parent = this.node;
        glowNode.setPosition(0, 0, 0);
        this._glowGraphics = glowNode.addComponent(Graphics);
        
        // 计时条
        const barNode = new Node('Bar');
        barNode.parent = this.node;
        barNode.setPosition(0, 0, 0);
        this._barGraphics = barNode.addComponent(Graphics);
        
        // 阶段名称
        const phaseNode = new Node('PhaseLabel');
        phaseNode.parent = this.node;
        phaseNode.setPosition(0, 25, 0);
        this._phaseLabel = phaseNode.addComponent(Label);
        this._phaseLabel.fontSize = 24;
        this._phaseLabel.lineHeight = 30;
        this._phaseLabel.string = '';
        
        // 倒计时
        const timerNode = new Node('TimerLabel');
        timerNode.parent = this.node;
        timerNode.setPosition(0, -25, 0);
        this._timerLabel = timerNode.addComponent(Label);
        this._timerLabel.fontSize = 20;
        this._timerLabel.lineHeight = 26;
        this._timerLabel.string = '';
    }
    
    /**
     * 设置阶段状态
     */
    setPhase(state: BattleState, timer: number, maxTime: number) {
        if (state !== BattleState.DeployFast && state !== BattleState.DeployTune) {
            this.hide();
            return;
        }
        
        this._isVisible = true;
        this.node.active = true;
        
        this._maxTime = maxTime;
        this._progress = calculateProgress(timer, maxTime);
        this._currentStyle = getPhaseStyle(state, timer);
        
        this.updateVisuals(timer);
    }
    
    /**
     * 更新视觉效果
     */
    private updateVisuals(timer: number) {
        if (!this._isVisible) return;
        
        // 更新阶段名称
        if (this._phaseLabel) {
            this._phaseLabel.string = this._currentStyle.phaseName;
            this._phaseLabel.color = this._currentStyle.textColor;
        }
        
        // 更新倒计时
        if (this._timerLabel) {
            const seconds = Math.ceil(timer);
            this._timerLabel.string = `${seconds}s`;
            this._timerLabel.color = this._currentStyle.textColor;
        }
        
        // 绘制光晕
        this.drawGlow();
        
        // 绘制计时条
        this.drawBar();
    }
    
    /**
     * 绘制光晕
     */
    private drawGlow() {
        if (!this._glowGraphics) return;
        
        this._glowGraphics.clear();
        
        const glowAlpha = Math.floor(150 + 50 * this._pulseScale);
        const glowColor = this._currentStyle.glowColor.clone();
        glowColor.a = glowAlpha;
        
        this._glowGraphics.fillColor = glowColor;
        
        // 外发光矩形
        const glowOffset = this.GLOW_SIZE * this._pulseScale;
        this._glowGraphics.roundRect(
            -this.BAR_WIDTH / 2 - glowOffset,
            -this.BAR_HEIGHT / 2 - glowOffset,
            this.BAR_WIDTH + glowOffset * 2,
            this.BAR_HEIGHT + glowOffset * 2,
            8
        );
        this._glowGraphics.fill();
    }
    
    /**
     * 绘制计时条
     */
    private drawBar() {
        if (!this._barGraphics) return;
        
        this._barGraphics.clear();
        
        // 背景
        this._barGraphics.fillColor = new Color(40, 45, 55, 200);
        this._barGraphics.roundRect(
            -this.BAR_WIDTH / 2,
            -this.BAR_HEIGHT / 2,
            this.BAR_WIDTH,
            this.BAR_HEIGHT,
            6
        );
        this._barGraphics.fill();
        
        // 进度条
        const progressWidth = this.BAR_WIDTH * this._progress;
        if (progressWidth > 0) {
            this._barGraphics.fillColor = this._currentStyle.barColor;
            this._barGraphics.roundRect(
                -this.BAR_WIDTH / 2,
                -this.BAR_HEIGHT / 2,
                progressWidth,
                this.BAR_HEIGHT,
                6
            );
            this._barGraphics.fill();
        }
        
        // 边框
        this._barGraphics.strokeColor = new Color(255, 255, 255, 150);
        this._barGraphics.lineWidth = 2;
        this._barGraphics.roundRect(
            -this.BAR_WIDTH / 2,
            -this.BAR_HEIGHT / 2,
            this.BAR_WIDTH,
            this.BAR_HEIGHT,
            6
        );
        this._barGraphics.stroke();
    }
    
    /**
     * 隐藏指示器
     */
    hide() {
        this._isVisible = false;
        this.node.active = false;
    }
    
    update(dt: number) {
        if (!this._isVisible) return;
        
        // 脉冲动画
        const pulseSpeed = this._currentStyle.pulseSpeed;
        this._pulseScale += this._pulseDirection * dt * pulseSpeed;
        
        if (this._pulseScale >= 1.2) {
            this._pulseScale = 1.2;
            this._pulseDirection = -1;
        } else if (this._pulseScale <= 0.8) {
            this._pulseScale = 0.8;
            this._pulseDirection = 1;
        }
        
        // 更新光晕
        this.drawGlow();
    }
}
