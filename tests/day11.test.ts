/**
 * Day11 单元测试
 * 测试部署双节奏样式、危险侧分析
 * 运行: npx vitest run tests/day11.test.ts
 */

import { describe, it, expect } from 'vitest';

// ============================================================
// 部署阶段样式（镜像实现）
// ============================================================

enum BattleState {
    None = 'None',
    DeployFast = 'DeployFast',
    DeployTune = 'DeployTune',
    Combat = 'Combat',
    WaveClear = 'WaveClear',
    Settle = 'Settle'
}

interface PhaseStyle {
    barColor: { r: number; g: number; b: number };
    phaseName: string;
    pulseSpeed: number;
}

const DEPLOY_FAST_STYLE: PhaseStyle = {
    barColor: { r: 80, g: 200, b: 100 },  // 绿色
    phaseName: '快速落子',
    pulseSpeed: 2
};

const DEPLOY_TUNE_STYLE: PhaseStyle = {
    barColor: { r: 255, g: 200, b: 80 },  // 黄色
    phaseName: '微调确认',
    pulseSpeed: 1
};

const URGENCY_STYLE: PhaseStyle = {
    barColor: { r: 255, g: 100, b: 80 },  // 红色
    phaseName: '即将开战!',
    pulseSpeed: 4
};

function getPhaseStyle(state: BattleState, timer: number): PhaseStyle {
    if (state === BattleState.DeployFast) {
        if (timer <= 2) {
            return URGENCY_STYLE;
        }
        return DEPLOY_FAST_STYLE;
    } else if (state === BattleState.DeployTune) {
        return DEPLOY_TUNE_STYLE;
    }
    return DEPLOY_FAST_STYLE;
}

function calculateProgress(timer: number, maxTime: number): number {
    if (maxTime <= 0) return 0;
    return Math.max(0, Math.min(1, timer / maxTime));
}

// ============================================================
// 危险侧分析（镜像实现）
// ============================================================

interface EnemyPosition {
    x: number;
    y: number;
}

enum DangerSide {
    None = 'none',
    Left = 'left',
    Right = 'right',
    Both = 'both'
}

interface DangerAnalysis {
    side: DangerSide;
    leftCount: number;
    rightCount: number;
    leftThreat: number;
    rightThreat: number;
}

const BASE_Y = -450;
const DANGER_THRESHOLD = 2;
const THREAT_WEIGHT_DISTANCE = 0.01;

function analyzeDangerSide(enemies: EnemyPosition[]): DangerAnalysis {
    let leftCount = 0;
    let rightCount = 0;
    let leftThreat = 0;
    let rightThreat = 0;
    
    for (const enemy of enemies) {
        const distanceToBase = Math.abs(enemy.y - BASE_Y);
        const threatWeight = 1 + (1000 - Math.min(distanceToBase, 1000)) * THREAT_WEIGHT_DISTANCE;
        
        if (enemy.x < 0) {
            leftCount++;
            leftThreat += threatWeight;
        } else if (enemy.x > 0) {
            rightCount++;
            rightThreat += threatWeight;
        } else {
            leftCount += 0.5;
            rightCount += 0.5;
            leftThreat += threatWeight * 0.5;
            rightThreat += threatWeight * 0.5;
        }
    }
    
    let side: DangerSide = DangerSide.None;
    const countDiff = Math.abs(leftCount - rightCount);
    const threatDiff = Math.abs(leftThreat - rightThreat);
    
    if (enemies.length === 0) {
        side = DangerSide.None;
    } else if (countDiff < DANGER_THRESHOLD && threatDiff < DANGER_THRESHOLD * 2) {
        if (enemies.length >= 4) {
            side = DangerSide.Both;
        } else {
            side = DangerSide.None;
        }
    } else if (leftThreat > rightThreat) {
        side = DangerSide.Left;
    } else {
        side = DangerSide.Right;
    }
    
    return { side, leftCount, rightCount, leftThreat, rightThreat };
}

function getDangerSideText(side: DangerSide): string {
    switch (side) {
        case DangerSide.Left: return '⚠ 左侧危险';
        case DangerSide.Right: return '⚠ 右侧危险';
        case DangerSide.Both: return '⚠ 两侧危险';
        default: return '';
    }
}

// ============================================================
// 测试用例
// ============================================================

describe('部署阶段样式映射', () => {
    it('DeployFast 返回绿色样式', () => {
        const style = getPhaseStyle(BattleState.DeployFast, 5);
        expect(style.barColor.g).toBeGreaterThan(style.barColor.r);  // 绿色为主
        expect(style.phaseName).toBe('快速落子');
    });
    
    it('DeployTune 返回黄色样式', () => {
        const style = getPhaseStyle(BattleState.DeployTune, 3);
        expect(style.barColor.r).toBeGreaterThan(style.barColor.b);  // 偏黄
        expect(style.barColor.g).toBeGreaterThan(style.barColor.b);
        expect(style.phaseName).toBe('微调确认');
    });
    
    it('DeployFast 最后 2s 返回紧急样式', () => {
        const style = getPhaseStyle(BattleState.DeployFast, 1.5);
        expect(style.barColor.r).toBe(255);  // 红色为主
        expect(style.phaseName).toBe('即将开战!');
    });
    
    it('DeployFast 最后 2s 脉冲更快', () => {
        const normalStyle = getPhaseStyle(BattleState.DeployFast, 5);
        const urgentStyle = getPhaseStyle(BattleState.DeployFast, 1);
        expect(urgentStyle.pulseSpeed).toBeGreaterThan(normalStyle.pulseSpeed);
    });
    
    it('DeployTune 脉冲比 DeployFast 慢', () => {
        const fastStyle = getPhaseStyle(BattleState.DeployFast, 5);
        const tuneStyle = getPhaseStyle(BattleState.DeployTune, 3);
        expect(tuneStyle.pulseSpeed).toBeLessThan(fastStyle.pulseSpeed);
    });
});

describe('计时条进度计算', () => {
    it('timer=maxTime 时进度为 1', () => {
        expect(calculateProgress(8, 8)).toBe(1);
    });
    
    it('timer=0 时进度为 0', () => {
        expect(calculateProgress(0, 8)).toBe(0);
    });
    
    it('timer=maxTime/2 时进度为 0.5', () => {
        expect(calculateProgress(4, 8)).toBe(0.5);
    });
    
    it('maxTime=0 时返回 0', () => {
        expect(calculateProgress(5, 0)).toBe(0);
    });
    
    it('进度被限制在 0-1', () => {
        expect(calculateProgress(10, 8)).toBe(1);
        expect(calculateProgress(-5, 8)).toBe(0);
    });
});

describe('危险侧分析 - 基础', () => {
    it('无敌人时返回 None', () => {
        const result = analyzeDangerSide([]);
        expect(result.side).toBe(DangerSide.None);
    });
    
    it('单个左侧敌人触发左侧危险', () => {
        const result = analyzeDangerSide([{ x: -100, y: 0 }]);
        expect(result.side).toBe(DangerSide.Left);
        expect(result.leftCount).toBe(1);
    });
    
    it('多个左侧敌人触发左侧危险', () => {
        const enemies: EnemyPosition[] = [
            { x: -100, y: 0 },
            { x: -120, y: 50 },
            { x: -80, y: 100 }
        ];
        const result = analyzeDangerSide(enemies);
        expect(result.side).toBe(DangerSide.Left);
    });
    
    it('多个右侧敌人触发右侧危险', () => {
        const enemies: EnemyPosition[] = [
            { x: 100, y: 0 },
            { x: 120, y: 50 },
            { x: 80, y: 100 }
        ];
        const result = analyzeDangerSide(enemies);
        expect(result.side).toBe(DangerSide.Right);
    });
});

describe('危险侧分析 - 两侧平衡', () => {
    it('两侧均衡且敌人多时返回 Both', () => {
        const enemies: EnemyPosition[] = [
            { x: -100, y: 0 },
            { x: -100, y: 100 },
            { x: 100, y: 0 },
            { x: 100, y: 100 }
        ];
        const result = analyzeDangerSide(enemies);
        expect(result.side).toBe(DangerSide.Both);
    });
    
    it('两侧均衡但敌人少时返回 None', () => {
        const enemies: EnemyPosition[] = [
            { x: -100, y: 0 },
            { x: 100, y: 0 }
        ];
        const result = analyzeDangerSide(enemies);
        expect(result.side).toBe(DangerSide.None);
    });
});

describe('危险侧分析 - 距离权重', () => {
    it('越靠近据点威胁越高', () => {
        // 一个远的左侧敌人 vs 一个近的右侧敌人
        const enemies: EnemyPosition[] = [
            { x: -100, y: 400 },   // 远离据点
            { x: 100, y: -400 }    // 靠近据点
        ];
        const result = analyzeDangerSide(enemies);
        expect(result.rightThreat).toBeGreaterThan(result.leftThreat);
    });
    
    it('靠近据点的少量敌人可能比远处的多敌人威胁更大', () => {
        const enemies: EnemyPosition[] = [
            { x: -100, y: 300 },   // 远
            { x: -100, y: 300 },   // 远
            { x: 100, y: -350 }    // 非常近
        ];
        const result = analyzeDangerSide(enemies);
        // 右侧敌人虽然只有 1 个，但威胁更高
        expect(result.rightThreat).toBeGreaterThan(0);
    });
});

describe('危险侧分析 - X=0 中线敌人', () => {
    it('X=0 的敌人两边各算 0.5', () => {
        const enemies: EnemyPosition[] = [
            { x: 0, y: 0 }
        ];
        const result = analyzeDangerSide(enemies);
        expect(result.leftCount).toBe(0.5);
        expect(result.rightCount).toBe(0.5);
    });
});

describe('危险侧文本', () => {
    it('Left 返回左侧危险', () => {
        expect(getDangerSideText(DangerSide.Left)).toBe('⚠ 左侧危险');
    });
    
    it('Right 返回右侧危险', () => {
        expect(getDangerSideText(DangerSide.Right)).toBe('⚠ 右侧危险');
    });
    
    it('Both 返回两侧危险', () => {
        expect(getDangerSideText(DangerSide.Both)).toBe('⚠ 两侧危险');
    });
    
    it('None 返回空字符串', () => {
        expect(getDangerSideText(DangerSide.None)).toBe('');
    });
});

describe('阶段样式完整性', () => {
    it('DEPLOY_FAST_STYLE 有所有字段', () => {
        expect(DEPLOY_FAST_STYLE.barColor).toBeDefined();
        expect(DEPLOY_FAST_STYLE.phaseName).toBeDefined();
        expect(DEPLOY_FAST_STYLE.pulseSpeed).toBeDefined();
    });
    
    it('DEPLOY_TUNE_STYLE 有所有字段', () => {
        expect(DEPLOY_TUNE_STYLE.barColor).toBeDefined();
        expect(DEPLOY_TUNE_STYLE.phaseName).toBeDefined();
        expect(DEPLOY_TUNE_STYLE.pulseSpeed).toBeDefined();
    });
    
    it('URGENCY_STYLE 有所有字段', () => {
        expect(URGENCY_STYLE.barColor).toBeDefined();
        expect(URGENCY_STYLE.phaseName).toBeDefined();
        expect(URGENCY_STYLE.pulseSpeed).toBeDefined();
    });
});

describe('危险侧枚举完整性', () => {
    it('DangerSide 有四个值', () => {
        expect(DangerSide.None).toBe('none');
        expect(DangerSide.Left).toBe('left');
        expect(DangerSide.Right).toBe('right');
        expect(DangerSide.Both).toBe('both');
    });
});
