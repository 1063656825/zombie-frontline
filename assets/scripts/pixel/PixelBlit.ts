/**
 * PixelBlit.ts
 * 把像素图贴到 Node：优先 Texture2D + Sprite（NEAREST），失败则 Graphics 方格。
 */

import { Node, Sprite, SpriteFrame, Texture2D, UITransform, Graphics, Color } from 'cc';
import { spriteRgba, spriteSize } from './PixelDecode';

const frameCache = new Map<string, SpriteFrame>();
const PIXEL_SCALE_DEFAULT = 4;

function makeFrame(name: string): SpriteFrame | null {
    const cached = frameCache.get(name);
    if (cached) {
        return cached;
    }
    try {
        const { w, h, data } = spriteRgba(name);
        const texture = new Texture2D();
        texture.reset({
            width: w,
            height: h,
            format: Texture2D.PixelFormat.RGBA8888
        });
        texture.uploadData(data);
        texture.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
        texture.setMipFilter(Texture2D.Filter.NONE);
        const sf = new SpriteFrame();
        sf.texture = texture;
        frameCache.set(name, sf);
        return sf;
    } catch (e) {
        console.warn('[PixelBlit] Texture2D 失败，将用 Graphics:', name, e);
        return null;
    }
}

function blitGraphics(node: Node, name: string, scale: number) {
    const { w, h, data } = spriteRgba(name);
    let g = node.getComponent(Graphics);
    if (!g) {
        g = node.addComponent(Graphics);
    }
    g.clear();
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4;
            const a = data[i + 3];
            if (a === 0) {
                continue;
            }
            g.fillColor = new Color(data[i], data[i + 1], data[i + 2], a);
            const px = (x - w / 2) * scale;
            const py = (h / 2 - y - 1) * scale;
            g.rect(px, py, scale, scale);
            g.fill();
        }
    }
}

export function applyPixelSprite(node: Node, name: string, scale: number = PIXEL_SCALE_DEFAULT): void {
    const { w, h } = spriteSize(name);
    let ui = node.getComponent(UITransform);
    if (!ui) {
        ui = node.addComponent(UITransform);
    }
    ui.setContentSize(w * scale, h * scale);
    
    const sf = makeFrame(name);
    if (sf) {
        const oldG = node.getComponent(Graphics);
        if (oldG) {
            oldG.clear();
            oldG.enabled = false;
        }
        let sprite = node.getComponent(Sprite);
        if (!sprite) {
            sprite = node.addComponent(Sprite);
        }
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        sprite.spriteFrame = sf;
        sprite.enabled = true;
        return;
    }
    blitGraphics(node, name, scale);
}

export const PIXEL_SCALE = PIXEL_SCALE_DEFAULT;
