/**
 * EnemyWave.ts
 * 敌人波次生成器
 * Day4 实现完整的波次驱动与时间轴生成
 */

import { _decorator, Component, Node, Vec3 } from 'cc';
import { WaveConfig, EnemySpawn, EnemyType, WAVE_CONFIGS } from './WaveConfig';
import { Combat, EnemyInstance } from './Combat';

const { ccclass, property } = _decorator;

/**
 * 生成队列项
 */
interface SpawnQueueItem {
    type: EnemyType;
    spawnTime: number;      // 相对本波开始的时间
    spawnPosition: Vec3;    // 生成位置
    spawned: boolean;
}

@ccclass('EnemyWave')
export class EnemyWave extends Component {
    
    @property(Combat)
    combat: Combat | null = null;
    
    @property(Node)
    spawnPointLeft: Node | null = null;
    
    @property(Node)
    spawnPointRight: Node | null = null;
    
    // 当前波次
    private _currentWave: number = -1;
    private _waveConfig: WaveConfig | null = null;
    
    // 生成队列
    private _spawnQueue: SpawnQueueItem[] = [];
    private _waveTimer: number = 0;
    private _isWaveActive: boolean = false;
    
    /**
     * 开始波次
     */
    startWave(waveIndex: number) {
        this._currentWave = waveIndex;
        this._waveConfig = WAVE_CONFIGS[waveIndex];
        
        if (!this._waveConfig) {
            console.error(`[EnemyWave] 波次配置不存在: ${waveIndex}`);
            return;
        }
        
        // 构建生成队列
        this._spawnQueue = this.buildSpawnQueue(this._waveConfig);
        this._waveTimer = 0;
        this._isWaveActive = true;
        
        console.log(`[EnemyWave] 开始波次 ${waveIndex}, 敌人总数: ${this._spawnQueue.length}`);
    }
    
    /**
     * 构建生成队列
     */
    private buildSpawnQueue(config: WaveConfig): SpawnQueueItem[] {
        const queue: SpawnQueueItem[] = [];
        
        for (const spawn of config.enemies) {
            const delay = spawn.delay ?? 0;
            const interval = spawn.interval ?? 1;
            
            for (let i = 0; i < spawn.count; i++) {
                const spawnTime = delay + i * interval;
                const spawnPosition = this.getSpawnPosition(i % 2 === 0);
                
                queue.push({
                    type: spawn.type,
                    spawnTime,
                    spawnPosition,
                    spawned: false
                });
            }
        }
        
        // 按时间排序
        queue.sort((a, b) => a.spawnTime - b.spawnTime);
        
        return queue;
    }
    
    /**
     * 获取生成位置
     */
    private getSpawnPosition(isLeft: boolean): Vec3 {
        // 默认位置（屏幕顶部两侧）
        const x = isLeft ? -150 : 150;
        const y = 500;
        
        if (isLeft && this.spawnPointLeft) {
            return this.spawnPointLeft.position.clone();
        }
        if (!isLeft && this.spawnPointRight) {
            return this.spawnPointRight.position.clone();
        }
        
        return new Vec3(x, y, 0);
    }
    
    /**
     * 停止波次
     */
    stopWave() {
        this._isWaveActive = false;
        this._spawnQueue = [];
    }
    
    /**
     * 检查波次是否完成生成
     */
    isSpawnComplete(): boolean {
        return this._spawnQueue.every(item => item.spawned);
    }
    
    update(dt: number) {
        if (!this._isWaveActive || !this.combat) return;
        
        this._waveTimer += dt;
        
        // 处理生成队列
        for (const item of this._spawnQueue) {
            if (!item.spawned && this._waveTimer >= item.spawnTime) {
                // 生成敌人
                this.combat.spawnEnemy(item.type, item.spawnPosition);
                item.spawned = true;
            }
        }
    }
}
