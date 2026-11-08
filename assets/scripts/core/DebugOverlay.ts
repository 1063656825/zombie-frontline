/**
 * DebugOverlay.ts
 * 按 DebugFlags 显示或隐藏 Creator profiler 叠层（FPS / Draw call 那种）。
 */

import { profiler } from 'cc';
import { DEBUG_STORAGE_KEY, isDebugOverlayEnabled } from './DebugFlags';

function readStorage(key: string): string | null {
    try {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem(key);
        }
    } catch {
        /* ignore */
    }
    return null;
}

function currentHref(): string {
    try {
        if (typeof location !== 'undefined' && location.href) {
            return location.href;
        }
    } catch {
        /* ignore */
    }
    return '';
}

export function applyDebugOverlayPolicy(): boolean {
    const enabled = isDebugOverlayEnabled({
        href: currentHref(),
        storageGet: readStorage
    });
    try {
        if (enabled) {
            profiler.showStats();
            console.log(`[DebugOverlay] 性能叠层已打开（${DEBUG_STORAGE_KEY} 或 ?zf_debug=1）`);
        } else {
            profiler.hideStats();
        }
    } catch (e) {
        console.warn('[DebugOverlay] profiler 不可用:', e);
    }
    return enabled;
}
