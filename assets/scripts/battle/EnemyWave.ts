/**
 * EnemyWave.ts
 * 敌人波次生成器
 * Day3: 按 WaveConfig 生成敌人，双路径交替
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
    useLeftPath: boolean;   // 使用左路还是右路
    spawned: boolean;
}

@ccclass('EnemyWave')
export class EnemyWave extends Component {
    
    @property(Combat)
    combat: Combat | null = null;
    
    // 当前波次
    private _currentWave: number = -1;
    private _waveConfig: WaveConfig | null = null;
    
    // 生成队列
    private _spawnQueue: SpawnQueueItem[] = [];
    private _spawnItemPool: SpawnQueueItem[] = [];
    private _waveTimer: number = 0;
    private _isWaveActive: boolean = false;
    
    // 路径交替计数
    private _pathCounter: number = 0;
    
    // Day13: 复用生成坐标，避免每只敌人 new Vec3
    private readonly _spawnPos = new Vec3();
    
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
        
        // 构建生成队列（复用 SpawnQueueItem）
        this.recycleSpawnQueue();
        this.buildSpawnQueue(this._waveConfig);
        this._waveTimer = 0;
        this._isWaveActive = true;
        this._pathCounter = 0;
        
        console.log(`[EnemyWave] 开始波次 ${waveIndex}, 敌人总数: ${this._spawnQueue.length}`);
    }
    
    /**
     * 构建生成队列
     */
    private buildSpawnQueue(config: WaveConfig): void {
        for (const spawn of config.enemies) {
            const delay = spawn.delay ?? 0;
            const interval = spawn.interval ?? 1;
            
            for (let i = 0; i < spawn.count; i++) {
                const spawnTime = delay + i * interval;
                
                // 交替使用左右路径
                const useLeftPath = (this._pathCounter + i) % 2 === 0;
                
                const item = this.acquireSpawnItem();
                item.type = spawn.type;
                item.spawnTime = spawnTime;
                item.useLeftPath = useLeftPath;
                item.spawned = false;
                this._spawnQueue.push(item);
            }
            
            this._pathCounter += spawn.count;
        }
        
        // 按时间排序
        this._spawnQueue.sort((a, b) => a.spawnTime - b.spawnTime);
    }
    
    private acquireSpawnItem(): SpawnQueueItem {
        const item = this._spawnItemPool.pop();
        if (item) return item;
        return {
            type: EnemyType.Z1_Walker,
            spawnTime: 0,
            useLeftPath: true,
            spawned: false
        };
    }
    
    /**
     * Day13: 将队列项归还内部池，保留容量
     */
    private recycleSpawnQueue() {
        for (const item of this._spawnQueue) {
            this._spawnItemPool.push(item);
        }
        this._spawnQueue.length = 0;
    }
    
    /**
     * 停止波次
     */
    stopWave() {
        this._isWaveActive = false;
        this.recycleSpawnQueue();
        console.log('[EnemyWave] 波次停止');
    }
    
    /**
     * 检查波次是否完成生成
     */
    isSpawnComplete(): boolean {
        return this._spawnQueue.every(item => item.spawned);
    }
    
    /**
     * 获取已生成数量
     */
    getSpawnedCount(): number {
        return this._spawnQueue.filter(item => item.spawned).length;
    }
    
    /**
     * 获取总数量
     */
    getTotalCount(): number {
        return this._spawnQueue.length;
    }
    
    update(dt: number) {
        if (!this._isWaveActive || !this.combat) return;
        
        this._waveTimer += dt;
        
        // 处理生成队列
        for (const item of this._spawnQueue) {
            if (!item.spawned && this._waveTimer >= item.spawnTime) {
                // 生成敌人（复用坐标）
                this._spawnPos.set(item.useLeftPath ? -120 : 120, 450, 0);
                this.combat.spawnEnemy(item.type, this._spawnPos, item.useLeftPath);
                item.spawned = true;
                
                console.log(`[EnemyWave] 生成敌人: ${item.type} (${item.useLeftPath ? '左' : '右'}路), 进度: ${this.getSpawnedCount()}/${this.getTotalCount()}`);
            }
        }
    }
}
