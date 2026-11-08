/**
 * LegalOverlay.ts
 * 大厅全屏协议页：可滚动正文 + 返回。不改场景 JSON。
 */

import { Node, Label, Graphics, Color, UITransform, EventTouch, BlockInputEvents } from 'cc';
import { LegalDocId, getLegalDoc } from '../core/LegalContent';
import { drawPixelPanel, PIXEL_UI } from '../pixel/PixelChrome';

const VIEW_W = 640;
const VIEW_H = 820;
const VIEW_Y = 20;

export class LegalOverlay {
    private readonly root: Node;
    private readonly titleLabel: Label;
    private readonly bodyLabel: Label;
    private readonly content: Node;
    private _contentMinY = 0;
    private _contentMaxY = 0;
    
    constructor(parent: Node) {
        this.root = new Node('LegalOverlay');
        this.root.parent = parent;
        this.root.setPosition(0, 0, 0);
        
        const rootTf = this.root.addComponent(UITransform);
        rootTf.setContentSize(720, 1280);
        this.root.addComponent(BlockInputEvents);
        
        const bg = this.root.addComponent(Graphics);
        bg.fillColor = new Color(10, 8, 14, 245);
        bg.rect(-360, -640, 720, 1280);
        bg.fill();
        drawPixelPanel(bg, -340, -600, 680, 1180, PIXEL_UI.bg, PIXEL_UI.accent, 4);
        
        const titleNode = new Node('Title');
        titleNode.parent = this.root;
        titleNode.setPosition(0, 560, 0);
        this.titleLabel = titleNode.addComponent(Label);
        this.titleLabel.fontSize = 36;
        this.titleLabel.lineHeight = 44;
        this.titleLabel.color = new Color(255, 220, 120, 255);
        this.titleLabel.string = '';
        titleNode.addComponent(UITransform).setContentSize(640, 50);
        
        const view = new Node('View');
        view.parent = this.root;
        view.setPosition(0, VIEW_Y, 0);
        const viewTf = view.addComponent(UITransform);
        viewTf.setContentSize(VIEW_W, VIEW_H);
        
        this.content = new Node('Content');
        this.content.parent = view;
        this.content.setPosition(0, 0, 0);
        const bodyNode = new Node('Body');
        bodyNode.parent = this.content;
        bodyNode.setPosition(0, 0, 0);
        this.bodyLabel = bodyNode.addComponent(Label);
        this.bodyLabel.fontSize = 22;
        this.bodyLabel.lineHeight = 32;
        this.bodyLabel.color = new Color(220, 220, 230, 255);
        this.bodyLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
        this.bodyLabel.enableWrapText = true;
        this.bodyLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
        this.bodyLabel.verticalAlign = Label.VerticalAlign.TOP;
        const bodyTf = bodyNode.addComponent(UITransform);
        bodyTf.setContentSize(VIEW_W - 16, 200);
        bodyTf.setAnchorPoint(0.5, 1);
        
        view.on(Node.EventType.TOUCH_MOVE, this.onDrag, this);
        
        const back = new Node('Back');
        back.parent = this.root;
        back.setPosition(0, -560, 0);
        const backTf = back.addComponent(UITransform);
        backTf.setContentSize(240, 72);
        const backBg = back.addComponent(Graphics);
        drawPixelPanel(backBg, -120, -36, 240, 72, new Color(58, 106, 170, 255), PIXEL_UI.accent);
        const backLblNode = new Node('Label');
        backLblNode.parent = back;
        const backLbl = backLblNode.addComponent(Label);
        backLbl.string = '返回';
        backLbl.fontSize = 28;
        backLbl.lineHeight = 36;
        backLbl.color = new Color(255, 255, 255, 255);
        back.on(Node.EventType.TOUCH_END, this.close, this);
        
        this.root.active = false;
    }
    
    open(id: LegalDocId) {
        const doc = getLegalDoc(id);
        this.titleLabel.string = doc.title;
        this.bodyLabel.string = doc.body;
        this.content.setPosition(0, VIEW_H / 2 - 8, 0);
        const bodyTf = this.bodyLabel.node.getComponent(UITransform);
        const h = bodyTf ? bodyTf.height : 800;
        this._contentMaxY = VIEW_H / 2 - 8;
        this._contentMinY = Math.min(this._contentMaxY, VIEW_H / 2 - 8 - Math.max(0, h - VIEW_H + 24));
        this.root.active = true;
        console.log(`[LegalOverlay] 打开 ${doc.title}`);
    }
    
    close = () => {
        this.root.active = false;
        console.log('[LegalOverlay] 返回大厅');
    };
    
    get isOpen(): boolean {
        return this.root.active;
    }
    
    private onDrag(e: EventTouch) {
        const dy = e.getDelta().y;
        const pos = this.content.position;
        let y = pos.y + dy;
        if (y > this._contentMaxY) {
            y = this._contentMaxY;
        }
        if (y < this._contentMinY) {
            y = this._contentMinY;
        }
        this.content.setPosition(pos.x, y, pos.z);
    }
}
