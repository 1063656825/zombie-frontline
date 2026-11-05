/**
 * BootScene.ts
 * 启动场景控制器
 * 负责初始化、资源预加载，然后自动跳转到 Lobby
 */

import { _decorator, Component, Label, director, ProgressBar } from 'cc';
import { GameData } from '../data/GameData';
import { SCENE_LOBBY } from './SceneManager';

const { ccclass, property } = _decorator;

@ccclass('BootScene')
export class BootScene extends Component {
    
    @property(Label)
    statusLabel: Label | null = null;
    
    @property(Label)
    versionLabel: Label | null = null;
    
    // 模拟加载时间
    private readonly MIN_BOOT_TIME = 1.5;
    private _bootTimer = 0;
    private _isReady = false;
    
    start() {
        console.log('[BootScene] 启动场景开始');
        
        // 显示版本信息
        if (this.versionLabel) {
            this.versionLabel.string = '尸潮防线 v0.1.0';
        }
        
        this.setStatus('正在初始化...');
        
        // 初始化游戏数据
        this.initGame();
    }
    
    private async initGame() {
        try {
            // 加载存档
            this.setStatus('加载存档...');
            // GameData 单例在首次访问时自动加载
            console.log(`[BootScene] 当前残骸: ${GameData.scrap}`);
            
            // 预加载战斗场景（后台）
            this.setStatus('预加载资源...');
            
            this._isReady = true;
            this.setStatus('准备就绪');
            
        } catch (e) {
            console.error('[BootScene] 初始化失败:', e);
            this.setStatus('初始化失败，请重试');
        }
    }
    
    update(dt: number) {
        if (!this._isReady) return;
        
        this._bootTimer += dt;
        
        // 确保最小显示时间
        if (this._bootTimer >= this.MIN_BOOT_TIME) {
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
        console.log('[BootScene] 跳转到大厅');
        director.loadScene(SCENE_LOBBY);
    }
}
