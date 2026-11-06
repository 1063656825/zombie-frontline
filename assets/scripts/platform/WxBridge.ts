/**
 * WxBridge.ts
 * 微信平台轻钩子
 * Day7: 平台检测、分享存根、存储已在 MetaData 中处理
 */

// ============================================================
// 平台检测
// ============================================================

/**
 * 是否微信小游戏环境
 */
export function isWeChat(): boolean {
    // @ts-ignore
    return typeof wx !== 'undefined' && typeof wx.getSystemInfoSync === 'function';
}

/**
 * 获取系统信息
 */
export function getSystemInfo(): { platform: string; brand: string; model: string } | null {
    if (!isWeChat()) return null;
    
    try {
        // @ts-ignore
        const info = wx.getSystemInfoSync();
        return {
            platform: info.platform || 'unknown',
            brand: info.brand || 'unknown',
            model: info.model || 'unknown'
        };
    } catch {
        return null;
    }
}

// ============================================================
// 分享
// ============================================================

export interface ShareConfig {
    title?: string;
    imageUrl?: string;
    query?: string;
}

/**
 * 设置分享信息（存根）
 * 真实实现需要调用 wx.onShareAppMessage
 */
export function setupShareAppMessage(config: ShareConfig): void {
    if (!isWeChat()) {
        console.log('[WxBridge] 非微信环境，跳过分享设置');
        return;
    }
    
    try {
        // @ts-ignore
        wx.showShareMenu({
            withShareTicket: true,
            menus: ['shareAppMessage', 'shareTimeline']
        });
        
        // @ts-ignore
        wx.onShareAppMessage(() => ({
            title: config.title || '尸潮防线 - 波间落子，波内割草',
            imageUrl: config.imageUrl || '',
            query: config.query || ''
        }));
        
        console.log('[WxBridge] 分享设置完成');
    } catch (e) {
        console.error('[WxBridge] 分享设置失败:', e);
    }
}

/**
 * 主动触发分享（存根）
 */
export function shareAppMessage(config: ShareConfig): void {
    if (!isWeChat()) {
        console.log('[WxBridge] 非微信环境，模拟分享:', config.title);
        return;
    }
    
    try {
        // @ts-ignore
        wx.shareAppMessage({
            title: config.title || '尸潮防线',
            imageUrl: config.imageUrl || '',
            query: config.query || ''
        });
        console.log('[WxBridge] 触发分享');
    } catch (e) {
        console.error('[WxBridge] 分享失败:', e);
    }
}

// ============================================================
// 震动反馈
// ============================================================

/**
 * 短震动
 */
export function vibrateShort(): void {
    if (!isWeChat()) return;
    
    try {
        // @ts-ignore
        wx.vibrateShort({ type: 'light' });
    } catch { }
}

/**
 * 长震动
 */
export function vibrateLong(): void {
    if (!isWeChat()) return;
    
    try {
        // @ts-ignore
        wx.vibrateLong();
    } catch { }
}

// ============================================================
// 初始化
// ============================================================

/**
 * 初始化微信桥接
 */
export function initWxBridge(): void {
    if (isWeChat()) {
        const info = getSystemInfo();
        console.log(`[WxBridge] 微信环境: ${info?.platform} ${info?.brand} ${info?.model}`);
        
        // 设置默认分享
        setupShareAppMessage({
            title: '尸潮防线 - 来和我一起守住防线！'
        });
    } else {
        console.log('[WxBridge] 非微信环境');
    }
}
