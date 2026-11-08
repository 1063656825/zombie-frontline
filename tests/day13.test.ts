/**
 * Day13 单元测试
 * 测试 ObjectPool / ReusableList：acquire-release 复用、清场归还容量
 * 直接导入无 Cocos 依赖的 assets/scripts/core/ObjectPool.ts
 * 运行: npx vitest run tests/day13.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ObjectPool, ReusableList } from '../assets/scripts/core/ObjectPool';

interface DummyEnemy {
    id: number;
    hp: number;
    active: boolean;
}

function makeEnemyPool(initialSize = 0, maxIdle?: number): ObjectPool<DummyEnemy> {
    let seq = 0;
    return new ObjectPool<DummyEnemy>({
        create: () => ({ id: ++seq, hp: 10, active: false }),
        onAcquire: (e) => {
            e.active = true;
            e.hp = 10;
        },
        onRelease: (e) => {
            e.active = false;
            e.hp = 0;
        },
        initialSize,
        maxIdle
    });
}

describe('ObjectPool acquire / release / reuse', () => {
    let pool: ObjectPool<DummyEnemy>;
    
    beforeEach(() => {
        pool = makeEnemyPool();
    });
    
    it('空池 acquire 会 create', () => {
        const a = pool.acquire();
        expect(a.id).toBe(1);
        expect(a.active).toBe(true);
        expect(pool.created).toBe(1);
        expect(pool.activeCount).toBe(1);
        expect(pool.idleCount).toBe(0);
    });
    
    it('release 后再 acquire 得到同一实例', () => {
        const a = pool.acquire();
        pool.release(a);
        const b = pool.acquire();
        expect(b).toBe(a);
        expect(pool.created).toBe(1);
    });
    
    it('池空时扩容（grow）', () => {
        const a = pool.acquire();
        const b = pool.acquire();
        expect(a).not.toBe(b);
        expect(pool.created).toBe(2);
        expect(pool.activeCount).toBe(2);
    });
    
    it('重复 release 安全且不重复入栈', () => {
        const a = pool.acquire();
        expect(pool.release(a)).toBe(true);
        expect(pool.release(a)).toBe(false);
        expect(pool.idleCount).toBe(1);
        expect(pool.activeCount).toBe(0);
    });
    
    it('onRelease 复位状态', () => {
        const a = pool.acquire();
        a.hp = 3;
        pool.release(a);
        expect(a.active).toBe(false);
        expect(a.hp).toBe(0);
        pool.acquire();
        expect(a.active).toBe(true);
        expect(a.hp).toBe(10);
    });
});

describe('ObjectPool prewarm 与清场归还容量', () => {
    it('prewarm 只增加 idle，不增加 active', () => {
        const pool = makeEnemyPool(8);
        expect(pool.created).toBe(8);
        expect(pool.idleCount).toBe(8);
        expect(pool.activeCount).toBe(0);
        expect(pool.capacity).toBe(8);
    });
    
    it('acquire 5 再 releaseAll：active=0，capacity 保持', () => {
        const pool = makeEnemyPool(8);
        const taken: DummyEnemy[] = [];
        for (let i = 0; i < 5; i++) {
            taken.push(pool.acquire());
        }
        expect(pool.activeCount).toBe(5);
        expect(pool.idleCount).toBe(3);
        
        pool.releaseAll();
        
        expect(pool.activeCount).toBe(0);
        expect(pool.idleCount).toBe(8);
        expect(pool.capacity).toBe(8);
        expect(pool.created).toBe(8);
        for (const e of taken) {
            expect(e.active).toBe(false);
        }
    });
    
    it('模拟清波：超出预热后 releaseAll 容量=created', () => {
        const pool = makeEnemyPool(4);
        for (let i = 0; i < 10; i++) {
            pool.acquire();
        }
        expect(pool.created).toBe(10);
        expect(pool.activeCount).toBe(10);
        
        pool.releaseAll();
        
        expect(pool.activeCount).toBe(0);
        expect(pool.idleCount).toBe(10);
        expect(pool.capacity).toBe(pool.created);
    });
    
    it('清场后再 acquire 仍复用，不再 create', () => {
        const pool = makeEnemyPool(3);
        const first = pool.acquire();
        pool.releaseAll();
        const again = pool.acquire();
        expect(again).toBe(first);
        expect(pool.created).toBe(3);
    });
    
    it('maxIdle 限制空闲堆积', () => {
        const pool = makeEnemyPool(0, 2);
        const items = [pool.acquire(), pool.acquire(), pool.acquire()];
        pool.releaseAll();
        expect(pool.idleCount).toBe(2);
        expect(pool.capacity).toBe(2);
        expect(items.length).toBe(3);
    });
    
    it('reset 清空计数', () => {
        const pool = makeEnemyPool(4);
        pool.acquire();
        pool.reset();
        expect(pool.created).toBe(0);
        expect(pool.capacity).toBe(0);
        expect(pool.getStats().acquireCount).toBe(0);
    });
});

describe('PoolStats', () => {
    it('acquireCount / releaseCount 累计', () => {
        const pool = makeEnemyPool();
        const a = pool.acquire();
        const b = pool.acquire();
        pool.release(a);
        pool.release(b);
        const stats = pool.getStats();
        expect(stats.acquireCount).toBe(2);
        expect(stats.releaseCount).toBe(2);
        expect(stats.created).toBe(2);
        expect(stats.idle).toBe(2);
        expect(stats.active).toBe(0);
    });
});

describe('ReusableList 清场保留 capacity', () => {
    it('push 超过初始容量会扩容', () => {
        const list = new ReusableList<number>();
        list.push(1);
        list.push(2);
        expect(list.length).toBe(2);
        expect(list.capacity).toBeGreaterThanOrEqual(2);
        expect(list.get(0)).toBe(1);
    });
    
    it('clear 后 length=0 但 capacity 保留', () => {
        const list = new ReusableList<string>();
        list.push('a');
        list.push('b');
        list.push('c');
        const cap = list.capacity;
        list.clear();
        expect(list.length).toBe(0);
        expect(list.capacity).toBe(cap);
        expect(list.get(0)).toBeUndefined();
    });
    
    it('clear 后再 push 复用槽位（模拟波次队列）', () => {
        const list = new ReusableList<{ t: number }>();
        list.push({ t: 1 });
        list.push({ t: 2 });
        list.clear();
        list.push({ t: 9 });
        expect(list.length).toBe(1);
        expect(list.get(0)?.t).toBe(9);
        expect(list.capacity).toBeGreaterThanOrEqual(2);
    });
    
    it('toArray 只返回有效 length', () => {
        const list = new ReusableList<number>();
        list.push(1);
        list.push(2);
        list.clear();
        list.push(7);
        expect(list.toArray()).toEqual([7]);
    });
    
    it('truncate 缩短 length', () => {
        const list = new ReusableList<number>();
        list.push(1);
        list.push(2);
        list.push(3);
        list.truncate(1);
        expect(list.length).toBe(1);
        expect(list.get(0)).toBe(1);
        expect(list.get(1)).toBeUndefined();
    });
});

describe('波次风格模拟：敌人池 + 清波', () => {
    it('一波生成 N 只，击杀归还，清波 idle=created', () => {
        const pool = makeEnemyPool(6);
        const live: DummyEnemy[] = [];
        
        // spawn 8（超过预热）
        for (let i = 0; i < 8; i++) {
            live.push(pool.acquire());
        }
        expect(pool.activeCount).toBe(8);
        expect(pool.created).toBe(8);
        
        // 击杀 3 只
        pool.release(live[0]);
        pool.release(live[1]);
        pool.release(live[2]);
        expect(pool.activeCount).toBe(5);
        expect(pool.idleCount).toBe(3);
        
        // 清波（离开战斗 / WaveClear）
        pool.releaseAll();
        expect(pool.activeCount).toBe(0);
        expect(pool.idleCount).toBe(pool.created);
        expect(pool.capacity).toBe(8);
    });
    
    it('VFX 池：同时播放后全部结束归还', () => {
        let created = 0;
        const vfx = new ObjectPool<{ playing: boolean }>({
            create: () => {
                created++;
                return { playing: false };
            },
            onAcquire: (n) => { n.playing = true; },
            onRelease: (n) => { n.playing = false; },
            initialSize: 6
        });
        
        const playing = [vfx.acquire(), vfx.acquire(), vfx.acquire()];
        expect(playing.every(p => p.playing)).toBe(true);
        expect(created).toBe(6);
        
        for (const p of playing) {
            vfx.release(p);
        }
        expect(vfx.activeCount).toBe(0);
        expect(vfx.idleCount).toBe(6);
        expect(vfx.created).toBe(6);
    });
});
