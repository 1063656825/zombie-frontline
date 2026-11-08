/**
 * Day12 单元测试
 * 测试 Analytics 模块：事件追踪、统计计算
 * 运行: npx vitest run tests/day12.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';

// ============================================================
// Analytics 模块镜像实现（用于单元测试）
// ============================================================

enum LevelId {
    L1 = 'L1',
    L2 = 'L2'
}

enum AdSlot {
    Revive = 'revive',
    SettleDouble = 'settle_double',
    WaveSupply = 'wave_supply'
}

type EventProps = Record<string, string | number | boolean>;

interface TrackedEvent {
    name: string;
    props: EventProps;
    timestamp: number;
}

interface SessionStats {
    runCount: number;
    runWins: number;
    runLoses: number;
    waveAttempts: Record<string, number>;
    waveFails: Record<string, number>;
    waveClears: Record<string, number>;
    mergeAttempts: number;
    mergeSuccesses: number;
    runsWithMerge: number;
    adShows: Record<string, number>;
    adCompletes: Record<string, number>;
    adFails: Record<string, number>;
    revivesUsed: number;
    firstRunComplete: boolean;
}

interface RunStats {
    levelId: LevelId;
    startTime: number;
    mergeCount: number;
    waveReached: number;
}

const RING_BUFFER_SIZE = 200;

class TestAnalytics {
    private _events: TrackedEvent[] = [];
    private _enabled: boolean = true;
    private _sessionStats: SessionStats = this.createEmptyStats();
    private _currentRun: RunStats | null = null;
    
    private createEmptyStats(): SessionStats {
        return {
            runCount: 0,
            runWins: 0,
            runLoses: 0,
            waveAttempts: {},
            waveFails: {},
            waveClears: {},
            mergeAttempts: 0,
            mergeSuccesses: 0,
            runsWithMerge: 0,
            adShows: {},
            adCompletes: {},
            adFails: {},
            revivesUsed: 0,
            firstRunComplete: false
        };
    }
    
    track(name: string, props: EventProps = {}): void {
        if (!this._enabled) return;
        
        const event: TrackedEvent = {
            name,
            props,
            timestamp: Date.now()
        };
        
        this._events.push(event);
        if (this._events.length > RING_BUFFER_SIZE) {
            this._events.shift();
        }
    }
    
    trackRunStart(levelId: LevelId): void {
        this._currentRun = {
            levelId,
            startTime: Date.now(),
            mergeCount: 0,
            waveReached: 0
        };
        this._sessionStats.runCount++;
        this.track('run_start', { level_id: levelId, run_index: this._sessionStats.runCount });
    }
    
    trackRunEnd(won: boolean, waveReached: number): void {
        const levelId = this._currentRun?.levelId || LevelId.L1;
        
        if (won) {
            this._sessionStats.runWins++;
            if (!this._sessionStats.firstRunComplete) {
                this._sessionStats.firstRunComplete = true;
                this.track('first_run_complete', { level_id: levelId });
            }
        } else {
            this._sessionStats.runLoses++;
        }
        
        if (this._currentRun && this._currentRun.mergeCount > 0) {
            this._sessionStats.runsWithMerge++;
        }
        
        this.track('run_end', {
            level_id: levelId,
            won: won ? 1 : 0,
            wave_reached: waveReached,
            merge_count: this._currentRun?.mergeCount || 0
        });
        
        this._currentRun = null;
    }
    
    trackWaveStart(levelId: LevelId, waveIndex: number): void {
        const key = `${levelId}_W${waveIndex}`;
        this._sessionStats.waveAttempts[key] = (this._sessionStats.waveAttempts[key] || 0) + 1;
        if (this._currentRun) {
            this._currentRun.waveReached = waveIndex;
        }
        this.track('wave_start', { level_id: levelId, wave_index: waveIndex });
    }
    
    trackWaveClear(levelId: LevelId, waveIndex: number): void {
        const key = `${levelId}_W${waveIndex}`;
        this._sessionStats.waveClears[key] = (this._sessionStats.waveClears[key] || 0) + 1;
        this.track('wave_clear', { level_id: levelId, wave_index: waveIndex });
    }
    
    trackWaveFail(levelId: LevelId, waveIndex: number, reason: string = 'base_hp_zero'): void {
        const key = `${levelId}_W${waveIndex}`;
        this._sessionStats.waveFails[key] = (this._sessionStats.waveFails[key] || 0) + 1;
        this.track('wave_fail', { level_id: levelId, wave_index: waveIndex, reason });
    }
    
    trackAdShow(slot: AdSlot, context: EventProps = {}): void {
        this._sessionStats.adShows[slot] = (this._sessionStats.adShows[slot] || 0) + 1;
        this.track('ad_show', { slot, ...context });
    }
    
    trackAdClick(slot: AdSlot, context: EventProps = {}): void {
        this.track('ad_click', { slot, ...context });
    }
    
    trackAdComplete(slot: AdSlot, context: EventProps = {}): void {
        this._sessionStats.adCompletes[slot] = (this._sessionStats.adCompletes[slot] || 0) + 1;
        this.track('ad_complete', { slot, ...context });
    }
    
    trackAdFail(slot: AdSlot, reason: string, context: EventProps = {}): void {
        this._sessionStats.adFails[slot] = (this._sessionStats.adFails[slot] || 0) + 1;
        this.track('ad_fail', { slot, reason, ...context });
    }
    
    trackAdSkip(slot: AdSlot, context: EventProps = {}): void {
        this.trackAdFail(slot, 'user_skip', context);
    }
    
    trackMergeAttempt(levelId: LevelId, waveIndex: number): void {
        this._sessionStats.mergeAttempts++;
        this.track('merge_attempt', { level_id: levelId, wave_index: waveIndex });
    }
    
    trackMergeSuccess(levelId: LevelId, waveIndex: number, buildingType: string): void {
        this._sessionStats.mergeSuccesses++;
        if (this._currentRun) {
            this._currentRun.mergeCount++;
        }
        this.track('merge_success', { level_id: levelId, wave_index: waveIndex, building_type: buildingType });
    }
    
    trackReviveUsed(levelId: LevelId, waveIndex: number): void {
        this._sessionStats.revivesUsed++;
        this.track('revive_used', { level_id: levelId, wave_index: waveIndex });
    }
    
    getSessionStats(): SessionStats {
        return { ...this._sessionStats };
    }
    
    getWaveFailRate(levelId: LevelId, waveIndex: number): number {
        const key = `${levelId}_W${waveIndex}`;
        const attempts = this._sessionStats.waveAttempts[key] || 0;
        const fails = this._sessionStats.waveFails[key] || 0;
        return attempts > 0 ? fails / attempts : 0;
    }
    
    getMergeRunRate(): number {
        return this._sessionStats.runCount > 0 
            ? this._sessionStats.runsWithMerge / this._sessionStats.runCount 
            : 0;
    }
    
    getMergeSuccessRate(): number {
        return this._sessionStats.mergeAttempts > 0 
            ? this._sessionStats.mergeSuccesses / this._sessionStats.mergeAttempts 
            : 0;
    }
    
    getAdConversionRate(slot: AdSlot): number {
        const shows = this._sessionStats.adShows[slot] || 0;
        const completes = this._sessionStats.adCompletes[slot] || 0;
        return shows > 0 ? completes / shows : 0;
    }
    
    getEvents(): TrackedEvent[] {
        return [...this._events];
    }
    
    getEventCount(): number {
        return this._events.length;
    }
    
    getEventsByName(name: string): TrackedEvent[] {
        return this._events.filter(e => e.name === name);
    }
    
    setEnabled(enabled: boolean): void {
        this._enabled = enabled;
    }
    
    resetSession(): void {
        this._sessionStats = this.createEmptyStats();
        this._events = [];
        this._currentRun = null;
    }
}

// ============================================================
// 测试用例
// ============================================================

describe('Analytics 核心功能', () => {
    let analytics: TestAnalytics;
    
    beforeEach(() => {
        analytics = new TestAnalytics();
    });
    
    it('track 记录事件到 buffer', () => {
        analytics.track('test_event', { key: 'value' });
        expect(analytics.getEventCount()).toBe(1);
        
        const events = analytics.getEventsByName('test_event');
        expect(events.length).toBe(1);
        expect(events[0].props.key).toBe('value');
    });
    
    it('禁用后不记录事件', () => {
        analytics.setEnabled(false);
        analytics.track('test_event');
        expect(analytics.getEventCount()).toBe(0);
    });
    
    it('ring buffer 限制事件数量', () => {
        for (let i = 0; i < 250; i++) {
            analytics.track('event', { index: i });
        }
        expect(analytics.getEventCount()).toBe(RING_BUFFER_SIZE);
    });
    
    it('resetSession 清空所有数据', () => {
        analytics.track('test');
        analytics.trackRunStart(LevelId.L1);
        analytics.resetSession();
        
        expect(analytics.getEventCount()).toBe(0);
        expect(analytics.getSessionStats().runCount).toBe(0);
    });
});

describe('对局生命周期追踪', () => {
    let analytics: TestAnalytics;
    
    beforeEach(() => {
        analytics = new TestAnalytics();
    });
    
    it('trackRunStart 递增 runCount', () => {
        analytics.trackRunStart(LevelId.L1);
        analytics.trackRunEnd(false, 2);
        analytics.trackRunStart(LevelId.L2);
        
        expect(analytics.getSessionStats().runCount).toBe(2);
    });
    
    it('trackRunEnd(true) 递增 runWins', () => {
        analytics.trackRunStart(LevelId.L1);
        analytics.trackRunEnd(true, 5);
        
        expect(analytics.getSessionStats().runWins).toBe(1);
        expect(analytics.getSessionStats().runLoses).toBe(0);
    });
    
    it('trackRunEnd(false) 递增 runLoses', () => {
        analytics.trackRunStart(LevelId.L1);
        analytics.trackRunEnd(false, 2);
        
        expect(analytics.getSessionStats().runWins).toBe(0);
        expect(analytics.getSessionStats().runLoses).toBe(1);
    });
    
    it('首次胜利触发 first_run_complete', () => {
        analytics.trackRunStart(LevelId.L1);
        analytics.trackRunEnd(true, 5);
        
        expect(analytics.getSessionStats().firstRunComplete).toBe(true);
        
        const events = analytics.getEventsByName('first_run_complete');
        expect(events.length).toBe(1);
    });
    
    it('first_run_complete 只触发一次', () => {
        analytics.trackRunStart(LevelId.L1);
        analytics.trackRunEnd(true, 5);
        analytics.trackRunStart(LevelId.L2);
        analytics.trackRunEnd(true, 5);
        
        const events = analytics.getEventsByName('first_run_complete');
        expect(events.length).toBe(1);
    });
});

describe('波次事件追踪', () => {
    let analytics: TestAnalytics;
    
    beforeEach(() => {
        analytics = new TestAnalytics();
    });
    
    it('trackWaveStart 记录尝试次数', () => {
        analytics.trackWaveStart(LevelId.L1, 0);
        analytics.trackWaveStart(LevelId.L1, 0);
        analytics.trackWaveStart(LevelId.L1, 1);
        
        const stats = analytics.getSessionStats();
        expect(stats.waveAttempts['L1_W0']).toBe(2);
        expect(stats.waveAttempts['L1_W1']).toBe(1);
    });
    
    it('trackWaveClear 记录通关次数', () => {
        analytics.trackWaveClear(LevelId.L1, 0);
        analytics.trackWaveClear(LevelId.L1, 0);
        
        expect(analytics.getSessionStats().waveClears['L1_W0']).toBe(2);
    });
    
    it('trackWaveFail 记录失败次数', () => {
        analytics.trackWaveFail(LevelId.L1, 2, 'base_hp_zero');
        
        expect(analytics.getSessionStats().waveFails['L1_W2']).toBe(1);
    });
    
    it('getWaveFailRate 计算正确', () => {
        analytics.trackWaveStart(LevelId.L1, 2);
        analytics.trackWaveStart(LevelId.L1, 2);
        analytics.trackWaveStart(LevelId.L1, 2);
        analytics.trackWaveStart(LevelId.L1, 2);
        
        analytics.trackWaveFail(LevelId.L1, 2);
        
        expect(analytics.getWaveFailRate(LevelId.L1, 2)).toBe(0.25);  // 1/4
    });
    
    it('getWaveFailRate 无尝试返回 0', () => {
        expect(analytics.getWaveFailRate(LevelId.L1, 5)).toBe(0);
    });
});

describe('广告三坑追踪', () => {
    let analytics: TestAnalytics;
    
    beforeEach(() => {
        analytics = new TestAnalytics();
    });
    
    it('trackAdShow 按 slot 计数', () => {
        analytics.trackAdShow(AdSlot.Revive);
        analytics.trackAdShow(AdSlot.Revive);
        analytics.trackAdShow(AdSlot.SettleDouble);
        
        const stats = analytics.getSessionStats();
        expect(stats.adShows[AdSlot.Revive]).toBe(2);
        expect(stats.adShows[AdSlot.SettleDouble]).toBe(1);
    });
    
    it('trackAdComplete 按 slot 计数', () => {
        analytics.trackAdComplete(AdSlot.Revive);
        analytics.trackAdComplete(AdSlot.WaveSupply);
        
        const stats = analytics.getSessionStats();
        expect(stats.adCompletes[AdSlot.Revive]).toBe(1);
        expect(stats.adCompletes[AdSlot.WaveSupply]).toBe(1);
    });
    
    it('trackAdFail 按 slot 计数', () => {
        analytics.trackAdFail(AdSlot.Revive, 'cancel');
        analytics.trackAdFail(AdSlot.Revive, 'error');
        
        expect(analytics.getSessionStats().adFails[AdSlot.Revive]).toBe(2);
    });
    
    it('trackAdSkip 归类为 fail', () => {
        analytics.trackAdSkip(AdSlot.Revive);
        
        expect(analytics.getSessionStats().adFails[AdSlot.Revive]).toBe(1);
        
        const events = analytics.getEventsByName('ad_fail');
        expect(events[0].props.reason).toBe('user_skip');
    });
    
    it('getAdConversionRate 计算正确', () => {
        analytics.trackAdShow(AdSlot.Revive);
        analytics.trackAdShow(AdSlot.Revive);
        analytics.trackAdShow(AdSlot.Revive);
        analytics.trackAdShow(AdSlot.Revive);
        
        analytics.trackAdComplete(AdSlot.Revive);
        analytics.trackAdComplete(AdSlot.Revive);
        
        expect(analytics.getAdConversionRate(AdSlot.Revive)).toBe(0.5);  // 2/4
    });
    
    it('getAdConversionRate 无展示返回 0', () => {
        expect(analytics.getAdConversionRate(AdSlot.WaveSupply)).toBe(0);
    });
    
    it('广告事件包含上下文', () => {
        analytics.trackAdShow(AdSlot.Revive, { level_id: 'L1', wave_index: 2 });
        
        const events = analytics.getEventsByName('ad_show');
        expect(events[0].props.level_id).toBe('L1');
        expect(events[0].props.wave_index).toBe(2);
    });
});

describe('合成率追踪', () => {
    let analytics: TestAnalytics;
    
    beforeEach(() => {
        analytics = new TestAnalytics();
    });
    
    it('trackMergeAttempt 递增计数', () => {
        analytics.trackMergeAttempt(LevelId.L1, 0);
        analytics.trackMergeAttempt(LevelId.L1, 0);
        
        expect(analytics.getSessionStats().mergeAttempts).toBe(2);
    });
    
    it('trackMergeSuccess 递增计数', () => {
        analytics.trackMergeSuccess(LevelId.L1, 0, 'MachineGun');
        
        expect(analytics.getSessionStats().mergeSuccesses).toBe(1);
    });
    
    it('getMergeSuccessRate 计算正确', () => {
        analytics.trackMergeAttempt(LevelId.L1, 0);
        analytics.trackMergeAttempt(LevelId.L1, 0);
        analytics.trackMergeAttempt(LevelId.L1, 0);
        analytics.trackMergeAttempt(LevelId.L1, 0);
        
        analytics.trackMergeSuccess(LevelId.L1, 0, 'MachineGun');
        analytics.trackMergeSuccess(LevelId.L1, 0, 'Cannon');
        analytics.trackMergeSuccess(LevelId.L1, 0, 'Mine');
        
        expect(analytics.getMergeSuccessRate()).toBe(0.75);  // 3/4
    });
    
    it('getMergeSuccessRate 无尝试返回 0', () => {
        expect(analytics.getMergeSuccessRate()).toBe(0);
    });
    
    it('有合成的对局计入 runsWithMerge', () => {
        // 对局1：有合成
        analytics.trackRunStart(LevelId.L1);
        analytics.trackMergeSuccess(LevelId.L1, 0, 'MachineGun');
        analytics.trackRunEnd(true, 5);
        
        // 对局2：无合成
        analytics.trackRunStart(LevelId.L1);
        analytics.trackRunEnd(false, 2);
        
        // 对局3：有合成
        analytics.trackRunStart(LevelId.L1);
        analytics.trackMergeSuccess(LevelId.L1, 0, 'Cannon');
        analytics.trackRunEnd(true, 5);
        
        expect(analytics.getSessionStats().runsWithMerge).toBe(2);
    });
    
    it('getMergeRunRate 计算正确', () => {
        // 2 个有合成，2 个无合成
        analytics.trackRunStart(LevelId.L1);
        analytics.trackMergeSuccess(LevelId.L1, 0, 'MachineGun');
        analytics.trackRunEnd(true, 5);
        
        analytics.trackRunStart(LevelId.L1);
        analytics.trackRunEnd(false, 2);
        
        analytics.trackRunStart(LevelId.L1);
        analytics.trackMergeSuccess(LevelId.L1, 0, 'Cannon');
        analytics.trackRunEnd(true, 5);
        
        analytics.trackRunStart(LevelId.L1);
        analytics.trackRunEnd(false, 1);
        
        expect(analytics.getMergeRunRate()).toBe(0.5);  // 2/4
    });
    
    it('getMergeRunRate 无对局返回 0', () => {
        expect(analytics.getMergeRunRate()).toBe(0);
    });
});

describe('复活追踪', () => {
    let analytics: TestAnalytics;
    
    beforeEach(() => {
        analytics = new TestAnalytics();
    });
    
    it('trackReviveUsed 递增计数', () => {
        analytics.trackReviveUsed(LevelId.L1, 2);
        analytics.trackReviveUsed(LevelId.L2, 3);
        
        expect(analytics.getSessionStats().revivesUsed).toBe(2);
    });
    
    it('revive_used 事件包含上下文', () => {
        analytics.trackReviveUsed(LevelId.L1, 2);
        
        const events = analytics.getEventsByName('revive_used');
        expect(events.length).toBe(1);
        expect(events[0].props.level_id).toBe(LevelId.L1);
        expect(events[0].props.wave_index).toBe(2);
    });
});

describe('事件查询', () => {
    let analytics: TestAnalytics;
    
    beforeEach(() => {
        analytics = new TestAnalytics();
    });
    
    it('getEventsByName 过滤正确', () => {
        analytics.track('event_a');
        analytics.track('event_b');
        analytics.track('event_a');
        analytics.track('event_c');
        
        const eventsA = analytics.getEventsByName('event_a');
        expect(eventsA.length).toBe(2);
    });
    
    it('getEvents 返回副本', () => {
        analytics.track('test');
        const events1 = analytics.getEvents();
        const events2 = analytics.getEvents();
        
        expect(events1).not.toBe(events2);
        expect(events1).toEqual(events2);
    });
});

describe('完整对局流程', () => {
    let analytics: TestAnalytics;
    
    beforeEach(() => {
        analytics = new TestAnalytics();
    });
    
    it('模拟完整胜利对局', () => {
        analytics.trackRunStart(LevelId.L1);
        
        // W0
        analytics.trackWaveStart(LevelId.L1, 0);
        analytics.trackMergeAttempt(LevelId.L1, 0);
        analytics.trackMergeSuccess(LevelId.L1, 0, 'MachineGun');
        analytics.trackWaveClear(LevelId.L1, 0);
        
        // W1
        analytics.trackWaveStart(LevelId.L1, 1);
        analytics.trackWaveClear(LevelId.L1, 1);
        
        // 胜利
        analytics.trackRunEnd(true, 1);
        
        const stats = analytics.getSessionStats();
        expect(stats.runCount).toBe(1);
        expect(stats.runWins).toBe(1);
        expect(stats.mergeSuccesses).toBe(1);
        expect(stats.runsWithMerge).toBe(1);
        expect(stats.waveClears['L1_W0']).toBe(1);
        expect(stats.waveClears['L1_W1']).toBe(1);
        expect(stats.firstRunComplete).toBe(true);
    });
    
    it('模拟失败+复活对局', () => {
        analytics.trackRunStart(LevelId.L1);
        
        // W0
        analytics.trackWaveStart(LevelId.L1, 0);
        analytics.trackWaveClear(LevelId.L1, 0);
        
        // W1 失败
        analytics.trackWaveStart(LevelId.L1, 1);
        analytics.trackWaveFail(LevelId.L1, 1);
        
        // 复活
        analytics.trackAdShow(AdSlot.Revive);
        analytics.trackAdClick(AdSlot.Revive);
        analytics.trackAdComplete(AdSlot.Revive);
        analytics.trackReviveUsed(LevelId.L1, 1);
        
        // 继续 W1
        analytics.trackWaveStart(LevelId.L1, 1);
        analytics.trackWaveClear(LevelId.L1, 1);
        
        analytics.trackRunEnd(true, 1);
        
        const stats = analytics.getSessionStats();
        expect(stats.revivesUsed).toBe(1);
        expect(stats.waveFails['L1_W1']).toBe(1);
        expect(stats.waveAttempts['L1_W1']).toBe(2);  // 尝试了 2 次
        expect(stats.adCompletes[AdSlot.Revive]).toBe(1);
    });
    
    it('模拟广告跳过', () => {
        analytics.trackRunStart(LevelId.L1);
        analytics.trackWaveStart(LevelId.L1, 0);
        analytics.trackWaveFail(LevelId.L1, 0);
        
        analytics.trackAdShow(AdSlot.Revive);
        analytics.trackAdSkip(AdSlot.Revive);
        
        analytics.trackRunEnd(false, 0);
        
        const stats = analytics.getSessionStats();
        expect(stats.adShows[AdSlot.Revive]).toBe(1);
        expect(stats.adFails[AdSlot.Revive]).toBe(1);
        expect(stats.adCompletes[AdSlot.Revive]).toBeUndefined();
    });
});

describe('AdSlot 枚举完整性', () => {
    it('包含三个广告坑位', () => {
        expect(AdSlot.Revive).toBe('revive');
        expect(AdSlot.SettleDouble).toBe('settle_double');
        expect(AdSlot.WaveSupply).toBe('wave_supply');
    });
});

describe('LevelId 枚举完整性', () => {
    it('包含两个关卡', () => {
        expect(LevelId.L1).toBe('L1');
        expect(LevelId.L2).toBe('L2');
    });
});
