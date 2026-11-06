/**
 * AdService.ts
 * 激励视频广告服务抽象层
 * Day7: 统一三个广告坑位（复活、双倍、补给）
 * Mock 路径 + 微信真实路径存根
 */

// ============================================================
// 广告槽位定义
// ============================================================

export enum AdSlot {
    Revive = 'revive',           // ① 复活
    SettleDouble = 'settle_double', // ② 胜利双倍
    WaveSupply = 'wave_supply'   // ③ 波次补给
}

// 广告单元 ID 配置（留空使用 Mock）
export const AD_UNIT_IDS: Record<AdSlot, string> = {
    [AdSlot.Revive]: '',         // 填入真实 adUnitId
    [AdSlot.SettleDouble]: '',
    [AdSlot.WaveSupply]: ''
};

// ============================================================
// 广告结果
// ============================================================

export interface AdResult {
    ok: boolean;
    reason?: 'success' | 'cancel' | 'error' | 'no_fill';
}

// ============================================================
// 广告状态
// ============================================================

export enum AdState {
    Idle = 'idle',
    Loading = 'loading',
    Ready = 'ready',
    Showing = 'showing',
    Completed = 'completed',
    Failed = 'failed'
}

// ============================================================
// 广告服务
// ============================================================

class AdServiceManager {
    private static _instance: AdServiceManager | null = null;
    
    private _state: AdState = AdState.Idle;
    private _currentSlot: AdSlot | null = null;
    
    // Mock 模式配置
    private _forceMock: boolean = false;
    private _mockFailRate: number = 0;  // 0-1, 用于测试
    
    private constructor() {}
    
    static get instance(): AdServiceManager {
        if (!this._instance) {
            this._instance = new AdServiceManager();
        }
        return this._instance;
    }
    
    get state(): AdState { return this._state; }
    get isLoading(): boolean { return this._state === AdState.Loading || this._state === AdState.Showing; }
    
    /**
     * 显示激励视频广告
     */
    async showRewarded(slot: AdSlot): Promise<AdResult> {
        if (this.isLoading) {
            console.log(`[AdService] 广告正在进行中，忽略重复请求`);
            return { ok: false, reason: 'error' };
        }
        
        this._currentSlot = slot;
        this._state = AdState.Loading;
        
        console.log(`[AdService] 请求广告: ${slot}`);
        
        // 检查是否有真实广告单元
        const adUnitId = AD_UNIT_IDS[slot];
        const useRealAd = !this._forceMock && this.isWeChatEnv() && adUnitId;
        
        if (useRealAd) {
            return this.showRealAd(slot, adUnitId);
        } else {
            return this.showMockAd(slot);
        }
    }
    
    /**
     * Mock 广告（默认路径）
     */
    private async showMockAd(slot: AdSlot): Promise<AdResult> {
        console.log(`[AdService] 使用 Mock 广告: ${slot}`);
        
        this._state = AdState.Showing;
        
        // 模拟延迟 0.5-1s
        const delay = 500 + Math.random() * 500;
        await this.sleep(delay);
        
        // 检查是否模拟失败
        if (Math.random() < this._mockFailRate) {
            this._state = AdState.Failed;
            console.log(`[AdService] Mock 广告失败 (模拟)`);
            return { ok: false, reason: 'cancel' };
        }
        
        this._state = AdState.Completed;
        console.log(`[AdService] Mock 广告成功: ${slot}`);
        return { ok: true, reason: 'success' };
    }
    
    /**
     * 真实微信广告（存根）
     */
    private async showRealAd(slot: AdSlot, adUnitId: string): Promise<AdResult> {
        console.log(`[AdService] 尝试真实广告: ${slot}, adUnitId=${adUnitId}`);
        
        try {
            // @ts-ignore - wx 类型在微信环境中存在
            if (typeof wx === 'undefined' || !wx.createRewardedVideoAd) {
                console.warn(`[AdService] wx.createRewardedVideoAd 不可用，回退到 Mock`);
                return this.showMockAd(slot);
            }
            
            // @ts-ignore
            const ad = wx.createRewardedVideoAd({ adUnitId });
            
            return new Promise<AdResult>((resolve) => {
                ad.onClose((res: { isEnded: boolean }) => {
                    if (res.isEnded) {
                        this._state = AdState.Completed;
                        console.log(`[AdService] 真实广告完成: ${slot}`);
                        resolve({ ok: true, reason: 'success' });
                    } else {
                        this._state = AdState.Failed;
                        console.log(`[AdService] 真实广告取消: ${slot}`);
                        resolve({ ok: false, reason: 'cancel' });
                    }
                });
                
                ad.onError((err: any) => {
                    console.error(`[AdService] 真实广告错误: ${slot}`, err);
                    this._state = AdState.Failed;
                    // 错误时回退到 Mock
                    this.showMockAd(slot).then(resolve);
                });
                
                this._state = AdState.Showing;
                ad.show().catch(() => {
                    ad.load().then(() => ad.show());
                });
            });
        } catch (e) {
            console.error(`[AdService] 创建广告失败，回退到 Mock`, e);
            return this.showMockAd(slot);
        }
    }
    
    /**
     * 检查是否微信环境
     */
    private isWeChatEnv(): boolean {
        // @ts-ignore
        return typeof wx !== 'undefined' && typeof wx.createRewardedVideoAd === 'function';
    }
    
    /**
     * 辅助睡眠
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * 重置状态
     */
    reset(): void {
        this._state = AdState.Idle;
        this._currentSlot = null;
    }
    
    // ============================================================
    // 调试方法
    // ============================================================
    
    /**
     * 强制使用 Mock（调试）
     */
    setForceMock(force: boolean): void {
        this._forceMock = force;
        console.log(`[AdService] 强制 Mock: ${force}`);
    }
    
    /**
     * 设置 Mock 失败率（调试/测试）
     */
    setMockFailRate(rate: number): void {
        this._mockFailRate = Math.max(0, Math.min(1, rate));
        console.log(`[AdService] Mock 失败率: ${this._mockFailRate}`);
    }
}

export const AdService = AdServiceManager.instance;
