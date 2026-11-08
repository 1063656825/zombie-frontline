/**
 * BootScene.ts
 * 启动场景控制器
 * 负责初始化、资源预加载，然后自动跳转到 Lobby
 */

import { _decorator, Component, Label, director, assetManager, SceneAsset } from 'cc';
import { GameData } from '../data/GameData';
import { SCENE_LOBBY } from './SceneManager';
import { MIN_BOOT_TIME, shouldJumpFromBoot, LOBBY_SCENE_UUID } from './BootGate';

const { ccclass, property } = _decorator;

@ccclass('BootScene')
export class BootScene extends Component {
    
    @property(Label)
    statusLabel: Label | null = null;
    
    @property(Label)
    versionLabel: Label | null = null;
    
    private readonly MIN_BOOT_TIME = MIN_BOOT_TIME;
    private _bootTimer = 0;
    private _isReady = false;
    /** 只发起一次 loadScene，避免每帧重入把预览卡在加载页 */
    private _jumpStarted = false;
    
    start() {
        console.log('[BootScene] 启动场景开始');
        
        if (this.versionLabel) {
            this.versionLabel.string = '尸潮防线 v0.14.0';
        }
        
        this.setStatus('正在初始化...');
        this.initGame();
        
        // 双保险：scheduleOnce 不依赖 update；update 闸门防止漏触发
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
        if (shouldJumpFromBoot(this._isReady, this._jumpStarted, this._bootTimer, this.MIN_BOOT_TIME)) {
            this.gotoLobby();
        }
    }
    
    private setStatus(text: string) {
        if (this.statusLabel) {
            this.statusLabel.string = text;
        }
        console.log(`[BootScene] ${text}`);
    }
    
    private gotoLobby() {
        if (this._jumpStarted) {
            return;
        }
        if (!this._isReady) {
            return;
        }
        this._jumpStarted = true;
        this.setStatus('进入大厅...');
        console.log(`[BootScene] 跳转到大厅: ${SCENE_LOBBY}`);
        
        director.loadScene(SCENE_LOBBY, () => {
            console.log('[BootScene] Lobby onBeforeLoadScene');
        }, (err: Error | null) => {
            if (!err) {
                console.log('[BootScene] Lobby 加载成功');
                return;
            }
            console.warn('[BootScene] loadScene(Lobby) 失败，尝试 UUID 回退:', err);
            this.loadLobbyByUuid();
        });
    }
    
    /**
     * 预览「当前场景」时有时不把其它场景打进 name 表；用 Lobby.scene.meta UUID 再拉一次。
     */
    private loadLobbyByUuid() {
        assetManager.loadAny({ uuid: LOBBY_SCENE_UUID }, (err: Error | null, asset: SceneAsset) => {
            if (err || !asset) {
                console.error('[BootScene] UUID 加载 Lobby 失败:', err);
                this.setStatus('大厅加载失败（Lobby 场景）');
                return;
            }
            director.runScene(asset, null, (runErr: Error | null) => {
                if (runErr) {
                    console.error('[BootScene] runScene(Lobby) 失败:', runErr);
                    this.setStatus('进入大厅失败');
                    return;
                }
                console.log('[BootScene] Lobby runScene 成功');
            });
        });
    }
}
