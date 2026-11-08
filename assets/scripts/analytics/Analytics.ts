/**
 * Analytics.ts
 * 数据埋点服务
 * Day12: 波失败率、广告三坑展示/完成、合成率追踪
 * 
 * 设计原则：
 * - 纯 debug 日志 + 内存 ring buffer，不依赖外部服务
 * - 可选 wx.reportAnalytics 存根（配置开启）
 * - payload 精简，仅 string/number
 */

import { isWeChat } from '../platform/WxBridge';
import { LevelId } from '../battle/WaveConfig';
import { AdSlot } from '../ads/AdService';

// ============================================================
// 事件类型定义
// ============================================================

/** 事件属性类型 */
export type EventProps = Record<string, string | number | boolean>;

/** 存储的事件 */
export interface TrackedEvent {
    name: string;
    props: EventProps;
    timestamp: number;
}

// ============================================================
// 会话统计
// ============================================================

export interface SessionStats {
    runCount: number;
    runWins: number;
    runLoses: number;
    
    waveAttempts: Record<string, number>;  // "L1_W0" => attempts
    waveFails: Record<string, number>;     // "L1_W0" => fails
    waveClears: Record<string, number>;    // "L1_W0" => clears
    
    mergeAttempts: number;
    mergeSuccesses: number;
    runsWithMerge: number;  // 至少完成 1 次合成的对局数
    
    adShows: Record<string, number>;       // slot => show count
    adCompletes: Record<string, number>;   // slot => complete count
    adFails: Record<string, number>;       // slot => fail count
    
    revivesUsed: number;
    firstRunComplete: boolean;
}

// ============================================================
// 单局统计（用于计算 runsWithMerge）
// ============================================================

interface RunStats {
    levelId: LevelId;
    startTime: number;
    mergeCount: number;
    waveReached: number;
}

// ============================================================
// Analytics 服务
// ============================================================

const RING_BUFFER_SIZE = 200;

class AnalyticsService {
    private static _instance: AnalyticsService | null = null;
    
    private _events: TrackedEvent[] = [];
    private _enabled: boolean = true;
    private _wxReportEnabled: boolean = false;  // 是否调用 wx.reportAnalytics
    
    private _sessionStats: SessionStats = this.createEmptyStats();
    private _currentRun: RunStats | null = null;
    
    private constructor() {}
    
    static get instance(): AnalyticsService {
        if (!this._instance) {
            this._instance = new AnalyticsService();
        }
        return this._instance;
    }
    
    /**
     * 创建空统计
     */
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
    
    // ============================================================
    // 核心 API
    // ============================================================
    
    /**
     * 追踪事件
     */
    track(name: string, props: EventProps = {}): void {
        if (!this._enabled) return;
        
        const event: TrackedEvent = {
            name,
            props,
            timestamp: Date.now()
        };
        
        // Ring buffer
        this._events.push(event);
        if (this._events.length > RING_BUFFER_SIZE) {
            this._events.shift();
        }
        
        // Debug 日志
        const propsStr = Object.keys(props).length > 0 
            ? ` ${JSON.stringify(props)}` 
            : '';
        console.log(`[Analytics] ${name}${propsStr}`);
        
        // 可选 wx.reportAnalytics
        if (this._wxReportEnabled && isWeChat()) {
            this.reportToWx(name, props);
        }
    }
    
    /**
     * 微信上报（存根）
     */
    private reportToWx(name: string, props: EventProps): void {
        try {
            // @ts-ignore
            if (typeof wx !== 'undefined' && wx.reportAnalytics) {
                // @ts-ignore
                wx.reportAnalytics(name, props);
            }
        } catch (e) {
            // 静默失败，不影响游戏
        }
    }
    
    // ============================================================
    // 对局生命周期
    // ============================================================
    
    /**
     * 对局开始
     */
    trackRunStart(levelId: LevelId): void {
        this._currentRun = {
            levelId,
            startTime: Date.now(),
            mergeCount: 0,
            waveReached: 0
        };
        
        this._sessionStats.runCount++;
        
        this.track('run_start', {
            level_id: levelId,
            run_index: this._sessionStats.runCount,
            is_first_run: this._sessionStats.runCount === 1
        });
    }
    
    /**
     * 对局结束
     */
    trackRunEnd(won: boolean, waveReached: number): void {
        const durationMs = this._currentRun 
            ? Date.now() - this._currentRun.startTime 
            : 0;
        
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
        
        // 记录有合成的对局
        if (this._currentRun && this._currentRun.mergeCount > 0) {
            this._sessionStats.runsWithMerge++;
        }
        
        this.track('run_end', {
            level_id: levelId,
            won: won ? 1 : 0,
            wave_reached: waveReached,
            duration_ms: durationMs,
            merge_count: this._currentRun?.mergeCount || 0
        });
        
        this._currentRun = null;
    }
    
    // ============================================================
    // 波次事件
    // ============================================================
    
    /**
     * 波次开始（算作一次尝试）
     */
    trackWaveStart(levelId: LevelId, waveIndex: number): void {
        const key = `${levelId}_W${waveIndex}`;
        this._sessionStats.waveAttempts[key] = (this._sessionStats.waveAttempts[key] || 0) + 1;
        
        if (this._currentRun) {
            this._currentRun.waveReached = waveIndex;
        }
        
        this.track('wave_start', {
            level_id: levelId,
            wave_index: waveIndex
        });
    }
    
    /**
     * 波次清除
     */
    trackWaveClear(levelId: LevelId, waveIndex: number): void {
        const key = `${levelId}_W${waveIndex}`;
        this._sessionStats.waveClears[key] = (this._sessionStats.waveClears[key] || 0) + 1;
        
        this.track('wave_clear', {
            level_id: levelId,
            wave_index: waveIndex
        });
    }
    
    /**
     * 波次失败（据点 HP≤0）
     */
    trackWaveFail(levelId: LevelId, waveIndex: number, reason: string = 'base_hp_zero'): void {
        const key = `${levelId}_W${waveIndex}`;
        this._sessionStats.waveFails[key] = (this._sessionStats.waveFails[key] || 0) + 1;
        
        this.track('wave_fail', {
            level_id: levelId,
            wave_index: waveIndex,
            reason
        });
    }
    
    // ============================================================
    // 广告三坑
    // ============================================================
    
    /**
     * 广告展示（UI 出现）
     */
    trackAdShow(slot: AdSlot, context: EventProps = {}): void {
        this._sessionStats.adShows[slot] = (this._sessionStats.adShows[slot] || 0) + 1;
        
        this.track('ad_show', {
            slot,
            ...context
        });
    }
    
    /**
     * 广告点击（可选，用户点击按钮请求广告）
     */
    trackAdClick(slot: AdSlot, context: EventProps = {}): void {
        this.track('ad_click', {
            slot,
            ...context
        });
    }
    
    /**
     * 广告完成（奖励发放）
     */
    trackAdComplete(slot: AdSlot, context: EventProps = {}): void {
        this._sessionStats.adCompletes[slot] = (this._sessionStats.adCompletes[slot] || 0) + 1;
        
        this.track('ad_complete', {
            slot,
            ...context
        });
    }
    
    /**
     * 广告失败/跳过
     */
    trackAdFail(slot: AdSlot, reason: string, context: EventProps = {}): void {
        this._sessionStats.adFails[slot] = (this._sessionStats.adFails[slot] || 0) + 1;
        
        this.track('ad_fail', {
            slot,
            reason,
            ...context
        });
    }
    
    /**
     * 广告跳过（用户主动取消）
     */
    trackAdSkip(slot: AdSlot, context: EventProps = {}): void {
        this.trackAdFail(slot, 'user_skip', context);
    }
    
    // ============================================================
    // 合成追踪
    // ============================================================
    
    /**
     * 合成尝试（开始拖拽）
     */
    trackMergeAttempt(levelId: LevelId, waveIndex: number): void {
        this._sessionStats.mergeAttempts++;
        
        this.track('merge_attempt', {
            level_id: levelId,
            wave_index: waveIndex
        });
    }
    
    /**
     * 合成成功
     */
    trackMergeSuccess(levelId: LevelId, waveIndex: number, buildingType: string): void {
        this._sessionStats.mergeSuccesses++;
        
        if (this._currentRun) {
            this._currentRun.mergeCount++;
        }
        
        this.track('merge_success', {
            level_id: levelId,
            wave_index: waveIndex,
            building_type: buildingType
        });
    }
    
    // ============================================================
    // 复活追踪
    // ============================================================
    
    /**
     * 复活使用
     */
    trackReviveUsed(levelId: LevelId, waveIndex: number): void {
        this._sessionStats.revivesUsed++;
        
        this.track('revive_used', {
            level_id: levelId,
            wave_index: waveIndex
        });
    }
    
    // ============================================================
    // 统计查询
    // ============================================================
    
    /**
     * 获取会话统计
     */
    getSessionStats(): SessionStats {
        return { ...this._sessionStats };
    }
    
    /**
     * 获取波次失败率
     * @returns 失败数 / 尝试数
     */
    getWaveFailRate(levelId: LevelId, waveIndex: number): number {
        const key = `${levelId}_W${waveIndex}`;
        const attempts = this._sessionStats.waveAttempts[key] || 0;
        const fails = this._sessionStats.waveFails[key] || 0;
        return attempts > 0 ? fails / attempts : 0;
    }
    
    /**
     * 获取合成对局占比
     * @returns 有合成的对局数 / 总对局数
     */
    getMergeRunRate(): number {
        return this._sessionStats.runCount > 0 
            ? this._sessionStats.runsWithMerge / this._sessionStats.runCount 
            : 0;
    }
    
    /**
     * 获取合成成功率
     * @returns 成功数 / 尝试数
     */
    getMergeSuccessRate(): number {
        return this._sessionStats.mergeAttempts > 0 
            ? this._sessionStats.mergeSuccesses / this._sessionStats.mergeAttempts 
            : 0;
    }
    
    /**
     * 获取广告点击率（展示 → 完成）
     */
    getAdConversionRate(slot: AdSlot): number {
        const shows = this._sessionStats.adShows[slot] || 0;
        const completes = this._sessionStats.adCompletes[slot] || 0;
        return shows > 0 ? completes / shows : 0;
    }
    
    /**
     * 获取所有事件（用于调试）
     */
    getEvents(): TrackedEvent[] {
        return [...this._events];
    }
    
    /**
     * 获取事件数量
     */
    getEventCount(): number {
        return this._events.length;
    }
    
    /**
     * 按名称筛选事件
     */
    getEventsByName(name: string): TrackedEvent[] {
        return this._events.filter(e => e.name === name);
    }
    
    // ============================================================
    // 配置
    // ============================================================
    
    /**
     * 启用/禁用追踪
     */
    setEnabled(enabled: boolean): void {
        this._enabled = enabled;
        console.log(`[Analytics] ${enabled ? '启用' : '禁用'}`);
    }
    
    /**
     * 启用/禁用微信上报
     */
    setWxReportEnabled(enabled: boolean): void {
        this._wxReportEnabled = enabled;
        console.log(`[Analytics] wx.reportAnalytics: ${enabled ? '启用' : '禁用'}`);
    }
    
    /**
     * 重置会话统计
     */
    resetSession(): void {
        this._sessionStats = this.createEmptyStats();
        this._events = [];
        this._currentRun = null;
        console.log('[Analytics] 会话统计已重置');
    }
    
    /**
     * 打印会话摘要
     */
    printSummary(): void {
        const stats = this._sessionStats;
        console.log('=== Analytics Session Summary ===');
        console.log(`Runs: ${stats.runCount} (Win: ${stats.runWins}, Lose: ${stats.runLoses})`);
        console.log(`Merge: ${stats.mergeSuccesses}/${stats.mergeAttempts} attempts, ${stats.runsWithMerge} runs with merge`);
        console.log(`Revives: ${stats.revivesUsed}`);
        console.log(`Ads:`);
        for (const slot of Object.values(AdSlot)) {
            const shows = stats.adShows[slot] || 0;
            const completes = stats.adCompletes[slot] || 0;
            const fails = stats.adFails[slot] || 0;
            if (shows > 0) {
                console.log(`  ${slot}: ${shows} shows, ${completes} complete, ${fails} fail`);
            }
        }
        console.log('=================================');
    }
}

export const Analytics = AnalyticsService.instance;

// ============================================================
// 便捷导出
// ============================================================

export const track = Analytics.track.bind(Analytics);
