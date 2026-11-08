/**
 * PixelDecode.ts
 * 把 PIXEL_SPRITES 解成 RGBA，无 Cocos 依赖。
 */

import { PIXEL_PALETTE, PIXEL_SPRITES } from './PixelMaps';

const rgbaCache = new Map<string, { w: number; h: number; data: Uint8Array }>();

export function spriteRows(name: string): string[] {
    const rows = PIXEL_SPRITES[name];
    if (!rows || rows.length === 0) {
        throw new Error(`unknown pixel sprite: ${name}`);
    }
    return rows;
}

export function spriteSize(name: string): { w: number; h: number } {
    const rows = spriteRows(name);
    return { w: rows[0].length, h: rows.length };
}

export function spriteRgba(name: string): { w: number; h: number; data: Uint8Array } {
    const hit = rgbaCache.get(name);
    if (hit) {
        return hit;
    }
    const rows = spriteRows(name);
    const h = rows.length;
    const w = rows[0].length;
    const data = new Uint8Array(w * h * 4);
    let i = 0;
    for (let y = 0; y < h; y++) {
        const row = rows[y];
        for (let x = 0; x < w; x++) {
            const packed = PIXEL_PALETTE[row[x]] ?? PIXEL_PALETTE['K'];
            if (packed == null) {
                data[i++] = 0;
                data[i++] = 0;
                data[i++] = 0;
                data[i++] = 0;
            } else {
                data[i++] = (packed >>> 24) & 0xff;
                data[i++] = (packed >>> 16) & 0xff;
                data[i++] = (packed >>> 8) & 0xff;
                data[i++] = packed & 0xff;
            }
        }
    }
    const result = { w, h, data };
    rgbaCache.set(name, result);
    return result;
}

export function opaquePixelCount(name: string): number {
    const { data } = spriteRgba(name);
    let n = 0;
    for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) {
            n++;
        }
    }
    return n;
}
