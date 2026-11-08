/**
 * DebugFlags.ts
 * 正式包默认关闭性能叠层 / DebugPanel。
 * 不要用引擎 DEBUG 宏：Creator 预览里它几乎总是 true。
 */

/** 编译期硬开关：仅本地排查时改为 true，正式包必须保持 false。 */
export const FORCE_DEBUG_OVERLAY = false;

/** localStorage / wx 存储键，值为 '1' 时打开叠层 */
export const DEBUG_STORAGE_KEY = 'zombie_frontline_debug';

/** 预览 URL 查询参数，例如 http://localhost:7456/?zf_debug=1 */
export const DEBUG_QUERY_FLAG = 'zf_debug';

export interface DebugFlagInput {
    href?: string;
    storageGet?: (key: string) => string | null;
    force?: boolean;
}

export function hrefRequestsDebug(href: string, flag: string = DEBUG_QUERY_FLAG): boolean {
    if (!href) {
        return false;
    }
    const escaped = flag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`[?&#]${escaped}=1(?:&|#|$)`);
    return re.test(href);
}

/**
 * 玩家可见 Debug / Profiler 是否打开。默认 false。
 */
export function isDebugOverlayEnabled(input: DebugFlagInput = {}): boolean {
    if (input.force === true || FORCE_DEBUG_OVERLAY) {
        return true;
    }
    if (hrefRequestsDebug(input.href ?? '')) {
        return true;
    }
    try {
        const raw = input.storageGet?.(DEBUG_STORAGE_KEY);
        if (raw === '1' || raw === 'true') {
            return true;
        }
    } catch {
        /* ignore */
    }
    return false;
}
