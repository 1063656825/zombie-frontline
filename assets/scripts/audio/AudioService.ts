/**
 * AudioService.ts
 * Day8: 音效服务占位
 * 
 * 使用方法：
 * 1. 导入: import { AudioService, SfxId } from '../audio/AudioService';
 * 2. 播放: AudioService.play(SfxId.Shoot);
 * 
 * 后续接入真实音效：
 * 1. 在 assets/audio/ 放置音频文件（.mp3/.ogg）
 * 2. 在 SFX_CLIPS 中配置 AudioClip 路径
 * 3. 调用 AudioService.init() 加载资源
 * 4. 修改 play() 使用 AudioSource 播放
 */

import { AudioClip, AudioSource, Node, director } from 'cc';

/**
 * 音效 ID 枚举
 */
export enum SfxId {
    Place = 'place',           // 落子
    Merge = 'merge',           // 合成
    Shoot = 'shoot',           // 射击（机枪/主角）
    CannonBoom = 'cannon_boom', // 炮轰爆炸
    MineBoom = 'mine_boom',     // 地雷爆炸
    EnemyHit = 'enemy_hit',     // 敌人受击
    BaseHit = 'base_hit',       // 据点受击
    WaveStart = 'wave_start',   // 波次开始
    Win = 'win',               // 胜利
    Lose = 'lose',             // 失败
    UiClick = 'ui_click'        // UI 点击
}

/**
 * 音效配置（后续可扩展为资源路径）
 */
interface SfxConfig {
    id: SfxId;
    volume: number;        // 0-1
    cooldown?: number;     // 防止重复播放的冷却时间（秒）
}

const SFX_CONFIGS: Record<SfxId, SfxConfig> = {
    [SfxId.Place]: { id: SfxId.Place, volume: 0.6 },
    [SfxId.Merge]: { id: SfxId.Merge, volume: 0.7 },
    [SfxId.Shoot]: { id: SfxId.Shoot, volume: 0.4, cooldown: 0.05 },
    [SfxId.CannonBoom]: { id: SfxId.CannonBoom, volume: 0.8 },
    [SfxId.MineBoom]: { id: SfxId.MineBoom, volume: 0.9 },
    [SfxId.EnemyHit]: { id: SfxId.EnemyHit, volume: 0.3, cooldown: 0.03 },
    [SfxId.BaseHit]: { id: SfxId.BaseHit, volume: 0.7 },
    [SfxId.WaveStart]: { id: SfxId.WaveStart, volume: 0.6 },
    [SfxId.Win]: { id: SfxId.Win, volume: 1.0 },
    [SfxId.Lose]: { id: SfxId.Lose, volume: 1.0 },
    [SfxId.UiClick]: { id: SfxId.UiClick, volume: 0.5 }
};

/**
 * 音效播放记录（用于调试和测试）
 */
export interface SfxPlayRecord {
    id: SfxId;
    timestamp: number;
}

/**
 * 音效服务单例
 */
class AudioServiceImpl {
    private _initialized: boolean = false;
    private _enabled: boolean = true;
    private _masterVolume: number = 1.0;
    private _debugMode: boolean = true;  // 开启调试日志
    
    // 音效资源（后续接入）
    private _clips: Map<SfxId, AudioClip> = new Map();
    
    // AudioSource 节点（后续接入）
    private _audioSource: AudioSource | null = null;
    
    // 冷却记录
    private _lastPlayTime: Map<SfxId, number> = new Map();
    
    // 播放记录（用于测试）
    private _playHistory: SfxPlayRecord[] = [];
    private _recordHistory: boolean = false;
    
    /**
     * 初始化音效服务
     * 当前为空实现，后续可加载 AudioClip 资源
     */
    async init(): Promise<void> {
        if (this._initialized) return;
        
        // 创建 AudioSource 节点（后续接入真实音效时使用）
        // const audioNode = new Node('AudioService');
        // director.getScene()?.addChild(audioNode);
        // this._audioSource = audioNode.addComponent(AudioSource);
        
        this._initialized = true;
        console.log('[AudioService] 初始化完成（占位模式）');
    }
    
    /**
     * 播放音效
     * 当前为空实现，仅记录日志
     */
    play(id: SfxId): boolean {
        if (!this._enabled) return false;
        
        const config = SFX_CONFIGS[id];
        if (!config) {
            console.warn(`[AudioService] 未知音效 ID: ${id}`);
            return false;
        }
        
        // 检查冷却
        const now = Date.now();
        const lastTime = this._lastPlayTime.get(id) || 0;
        const cooldown = (config.cooldown || 0) * 1000;
        
        if (cooldown > 0 && now - lastTime < cooldown) {
            return false;  // 冷却中
        }
        
        this._lastPlayTime.set(id, now);
        
        // 记录历史（测试用）
        if (this._recordHistory) {
            this._playHistory.push({ id, timestamp: now });
        }
        
        // 调试日志
        if (this._debugMode) {
            console.log(`[AudioService] 播放音效: ${id}`);
        }
        
        // TODO: 接入真实音效后，使用以下代码：
        // const clip = this._clips.get(id);
        // if (clip && this._audioSource) {
        //     this._audioSource.playOneShot(clip, config.volume * this._masterVolume);
        // }
        
        return true;
    }
    
    /**
     * 启用/禁用音效
     */
    setEnabled(enabled: boolean) {
        this._enabled = enabled;
        console.log(`[AudioService] 音效 ${enabled ? '启用' : '禁用'}`);
    }
    
    /**
     * 获取启用状态
     */
    isEnabled(): boolean {
        return this._enabled;
    }
    
    /**
     * 设置主音量
     */
    setMasterVolume(volume: number) {
        this._masterVolume = Math.max(0, Math.min(1, volume));
    }
    
    /**
     * 获取主音量
     */
    getMasterVolume(): number {
        return this._masterVolume;
    }
    
    /**
     * 设置调试模式
     */
    setDebugMode(enabled: boolean) {
        this._debugMode = enabled;
    }
    
    // ========== 测试辅助 ==========
    
    /**
     * 开始记录播放历史
     */
    startRecording() {
        this._recordHistory = true;
        this._playHistory = [];
    }
    
    /**
     * 停止记录并返回历史
     */
    stopRecording(): SfxPlayRecord[] {
        this._recordHistory = false;
        return [...this._playHistory];
    }
    
    /**
     * 获取播放历史（不清空）
     */
    getPlayHistory(): SfxPlayRecord[] {
        return [...this._playHistory];
    }
    
    /**
     * 清空播放历史
     */
    clearHistory() {
        this._playHistory = [];
    }
    
    /**
     * 重置服务状态（测试用）
     */
    reset() {
        this._lastPlayTime.clear();
        this._playHistory = [];
        this._recordHistory = false;
        this._enabled = true;
        this._masterVolume = 1.0;
    }
}

// 导出单例
export const AudioService = new AudioServiceImpl();

// 便捷函数
export function playSfx(id: SfxId): boolean {
    return AudioService.play(id);
}
