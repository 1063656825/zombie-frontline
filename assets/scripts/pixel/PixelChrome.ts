/**
 * PixelChrome.ts
 * 统一的像素风面板 / 按钮 / 进度条（块状直角，不要圆角色块）。
 */

import { Graphics, Color, Node, UITransform, Label } from 'cc';

export const PIXEL_UI = {
    bg: new Color(22, 18, 26, 245),
    panel: new Color(36, 32, 44, 250),
    panelAlt: new Color(48, 42, 56, 250),
    edge: new Color(18, 14, 16, 255),
    hi: new Color(90, 110, 90, 255),
    accent: new Color(224, 180, 64, 255),
    danger: new Color(180, 60, 50, 255),
    ok: new Color(62, 140, 70, 255),
    text: new Color(232, 220, 196, 255),
    muted: new Color(160, 150, 140, 255)
};

export function drawPixelPanel(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    fill: Color = PIXEL_UI.panel,
    border: Color = PIXEL_UI.accent,
    edge = 4
) {
    g.clear();
    g.fillColor = PIXEL_UI.edge;
    g.rect(x - edge, y - edge, w + edge * 2, h + edge * 2);
    g.fill();
    g.fillColor = fill;
    g.rect(x, y, w, h);
    g.fill();
    g.fillColor = PIXEL_UI.hi;
    g.rect(x, y + h - 3, w, 3);
    g.fill();
    g.fillColor = border;
    g.rect(x, y, w, 3);
    g.fill();
}

export function drawPixelBar(g: Graphics, x: number, y: number, w: number, h: number, t: number) {
    const clamped = Math.max(0, Math.min(1, t));
    g.clear();
    g.fillColor = PIXEL_UI.edge;
    g.rect(x - 3, y - 3, w + 6, h + 6);
    g.fill();
    g.fillColor = new Color(28, 24, 32, 255);
    g.rect(x, y, w, h);
    g.fill();
    g.fillColor = PIXEL_UI.accent;
    g.rect(x, y, Math.floor(w * clamped / 4) * 4, h);
    g.fill();
}

export function ensureUi(node: Node, w: number, h: number): UITransform {
    let ui = node.getComponent(UITransform);
    if (!ui) {
        ui = node.addComponent(UITransform);
    }
    ui.setContentSize(w, h);
    return ui;
}

export function styleLabel(label: Label, size = 24, color: Color = PIXEL_UI.text) {
    label.fontSize = size;
    label.lineHeight = Math.ceil(size * 1.25);
    label.color = color;
}
