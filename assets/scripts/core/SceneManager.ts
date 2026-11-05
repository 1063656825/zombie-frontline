/**
 * SceneManager.ts
 * 场景管理器
 * 负责场景切换：Boot → Lobby → Battle
 */

import { _decorator, Component, director, Node } from 'cc';

const { ccclass, property } = _decorator;

/**
 * 场景名称常量
 */
export const SCENE_BOOT = 'Boot';
export const SCENE_LOBBY = 'Lobby';
export const SCENE_BATTLE = 'Battle';

@ccclass('SceneManager')
export class SceneManager extends Component {
    
    private static _instance: SceneManager | null = null;
    
    public static get instance(): SceneManager | null {
        return this._instance;
    }
    
    onLoad() {
        if (SceneManager._instance) {
            this.node.destroy();
            return;
        }
        SceneManager._instance = this;
        // 跨场景保留
        director.addPersistRootNode(this.node);
    }
    
    onDestroy() {
        if (SceneManager._instance === this) {
            SceneManager._instance = null;
        }
    }
    
    /**
     * 切换到启动场景
     */
    gotoBootScene() {
        this.loadScene(SCENE_BOOT);
    }
    
    /**
     * 切换到大厅场景
     */
    gotoLobbyScene() {
        this.loadScene(SCENE_LOBBY);
    }
    
    /**
     * 切换到战斗场景
     */
    gotoBattleScene() {
        this.loadScene(SCENE_BATTLE);
    }
    
    /**
     * 加载场景
     */
    private loadScene(sceneName: string) {
        console.log(`[SceneManager] 切换场景: ${sceneName}`);
        
        director.loadScene(sceneName, (err) => {
            if (err) {
                console.error(`[SceneManager] 场景加载失败: ${sceneName}`, err);
                return;
            }
            console.log(`[SceneManager] 场景加载成功: ${sceneName}`);
        });
    }
    
    /**
     * 预加载场景
     */
    preloadScene(sceneName: string, onProgress?: (progress: number) => void): Promise<void> {
        return new Promise((resolve, reject) => {
            director.preloadScene(sceneName, 
                (completedCount, totalCount) => {
                    const progress = totalCount > 0 ? completedCount / totalCount : 0;
                    onProgress?.(progress);
                },
                (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                }
            );
        });
    }
}
