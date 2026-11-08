/**
 * BootScene.ts
 * 启动场景控制器
 * Creator 3.8.6: loadScene(name, onLaunched?, onUnloaded?) — 不是 (onBefore, onError)
 */

import { _decorator, Component, Label, director, assetManager, SceneAsset, Node, Graphics, UITransform } from 'cc';
import { drawPixelBar, drawPixelPanel, PIXEL_UI } from '../pixel/PixelChrome';
import { GameData } from '../data/GameData';
import { SCENE_LOBBY } from './SceneManager';
import {
    MIN_BOOT_TIME,
    shouldJumpFromBoot,
    shouldFallbackToUuid,
    launchedCallbackHasError,
    LOBBY_SCENE_UUID
} from './BootGate';
import { applyDebugOverlayPolicy } from './DebugOverlay';

const { ccclass, property } = _decorator;

@ccclass('BootScene')
export class BootScene extends Component {
    
    @property(Label)
    statusLabel: Label | null = null;
    
    @property(Label)
    versionLabel: Label | null = null;
    
    /**
     * 序列化引用 Lobby.scene，让「预览当前 Boot」也会把 Lobby 打进预览包。
     */
    @property(SceneAsset)
    lobbyScene: SceneAsset | null = null;
    
    private readonly MIN_BOOT_TIME = MIN_BOOT_TIME;
    private _bootTimer = 0;
    private _isReady = false;
    private _jumpStarted = false;
    private _uuidLoadStarted = false;
    private _bootBarGraphics: Graphics | null = null;
    
    start() {
        console.log('[BootScene] 启动场景开始');
        applyDebugOverlayPolicy();
        
        if (this.versionLabel) {
            this.versionLabel.string = '尸潮防线 v0.21.0';
        }
        
        this.createBootChrome();
        this.setStatus('正在初始化...');
        this.initGame();
        
        if (this._isReady) {
            this.scheduleOnce(() => this.gotoLobby(), this.MIN_BOOT_TIME);
        }
    }
    
    private initGame() {
        try {
            this.setStatus('加载存档...');
            console.log(`[BootScene] 当前残骸: ${GameData.scrap}`);
            this.setStatus('预加载资源...');
            this._isReady = true;
            this.setStatus('准备就绪');
        } catch (e) {
            console.error('[BootScene] 初始化失败:', e);
            this.setStatus('初始化失败，请重试');
            this._isReady = false;
        }
    }
    
    update(dt: number) {
        if (this._jumpStarted || !this._isReady) {
            return;
        }
        this._bootTimer += dt;
        if (this._bootBarGraphics) {
            drawPixelBar(this._bootBarGraphics, -160, -12, 320, 24, this._bootTimer / this.MIN_BOOT_TIME);
        }
        if (shouldJumpFromBoot(this._isReady, this._jumpStarted, this._bootTimer, this.MIN_BOOT_TIME)) {
            this.gotoLobby();
        }
    }
    
    private createBootChrome() {
        const title = this.node.getChildByName('Title');
        if (title) {
            const tg = title.getComponent(Graphics) || title.addComponent(Graphics);
            drawPixelPanel(tg, -220, -40, 440, 80, PIXEL_UI.panel, PIXEL_UI.accent);
            const label = title.getComponent(Label);
            if (label) {
                label.color = PIXEL_UI.text;
            }
        }
        const bar = new Node('BootBar');
        bar.parent = this.node;
        bar.setPosition(0, -80, 0);
        bar.addComponent(UITransform).setContentSize(320, 24);
        this._bootBarGraphics = bar.addComponent(Graphics);
        drawPixelBar(this._bootBarGraphics, -160, -12, 320, 24, 0);
        
        const frame = new Node('BootFrame');
        frame.parent = this.node;
        frame.setPosition(0, 40, 0);
        frame.addComponent(UITransform).setContentSize(520, 120);
        const g = frame.addComponent(Graphics);
        drawPixelPanel(g, -260, -60, 520, 120, PIXEL_UI.panel, PIXEL_UI.accent);
    }
    
    private setStatus(text: string) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
        console.log(`[BootScene] ${text}`);
    }
    
    private gotoLobby() {
        if (this._jumpStarted || !this._isReady) {
            return;
        }
        this._jumpStarted = true;
        this.setStatus('进入大厅...');
        console.log(`[BootScene] 跳转到大厅: ${SCENE_LOBBY}`);
        
        // 1) 预览包已带上序列化的 Lobby 资源：直接切，不依赖 name 表
        if (this.lobbyScene) {
            console.log('[BootScene] 使用序列化 Lobby SceneAsset');
            if (this.runLobbyAsset(this.lobbyScene)) {
                return;
            }
            console.warn('[BootScene] 序列化 SceneAsset 切换失败，继续 loadScene / UUID');
        }
        
        // 2) 3.8.6: loadScene(name, onLaunched, onUnloaded) — 第二参是启动完成，不是 onError
        let accepted = true;
        try {
            accepted = director.loadScene(SCENE_LOBBY, (err: Error | null) => {
                if (launchedCallbackHasError(err)) {
                    console.warn('[BootScene] onLaunched 报错，UUID 回退:', err);
                    this.loadLobbyByUuid();
                    return;
                }
                console.log('[BootScene] loadScene(Lobby) 成功');
            });
        } catch (e) {
            console.warn('[BootScene] loadScene 抛错:', e);
            accepted = false;
        }
        
        if (shouldFallbackToUuid(accepted, false)) {
            console.warn('[BootScene] loadScene 返回 false，立即 UUID 回退');
            this.loadLobbyByUuid();
        }
    }
    
    private loadLobbyByUuid() {
        if (this._uuidLoadStarted) {
            return;
        }
        this._uuidLoadStarted = true;
        assetManager.loadAny({ uuid: LOBBY_SCENE_UUID }, (err: Error | null, asset: SceneAsset) => {
            if (err || !asset) {
                assetManager.loadAny(LOBBY_SCENE_UUID, (err2: Error | null, asset2: SceneAsset) => {
                    if (err2 || !asset2) {
                        console.error('[BootScene] UUID 加载 Lobby 失败:', err2 || err);
                        this.setStatus('大厅加载失败（Lobby 场景）');
                        return;
                    }
                    if (!this.runLobbyAsset(asset2)) {
                        this.setStatus('进入大厅失败');
                    }
                });
                return;
            }
            if (!this.runLobbyAsset(asset)) {
                this.setStatus('进入大厅失败');
            }
        });
    }
    
    private runLobbyAsset(asset: SceneAsset): boolean {
        try {
            director.runSceneImmediate(asset);
            console.log('[BootScene] runSceneImmediate(Lobby) 完成');
            return true;
        } catch (e) {
            console.error('[BootScene] runSceneImmediate 失败，尝试 runScene:', e);
            try {
                director.runScene(asset);
                return true;
            } catch (e2) {
                console.error('[BootScene] runScene(Lobby) 失败:', e2);
                return false;
            }
        }
    }
}
