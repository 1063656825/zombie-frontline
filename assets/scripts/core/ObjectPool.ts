/**
 * ObjectPool.ts
 * Day13: 通用对象池（无 Cocos 依赖，可供 vitest 直接导入）
 *
 * - acquire: 从空闲栈取出，空则 create 扩容
 * - release: 归还空闲栈，调用 onRelease 复位
 * - releaseAll: 清场（波次结束 / 离开 Battle）把全部在用对象归还
 */

export interface ObjectPoolOptions<T> {
    create: () => T;
    onAcquire?: (item: T) => void;
    onRelease?: (item: T) => void;
    /** 预热数量（可选） */
    initialSize?: number;
    /** 空闲上限，超出则丢弃（不调用 destroy，仅不再持有引用） */
    maxIdle?: number;
}

export interface PoolStats {
    created: number;
    idle: number;
    active: number;
    acquireCount: number;
    releaseCount: number;
}

export class ObjectPool<T> {
    private _idle: T[] = [];
    private _active: Set<T> = new Set();
    private _create: () => T;
    private _onAcquire?: (item: T) => void;
    private _onRelease?: (item: T) => void;
    private _maxIdle: number;
    private _created = 0;
    private _acquireCount = 0;
    private _releaseCount = 0;

    constructor(options: ObjectPoolOptions<T>) {
        this._create = options.create;
        this._onAcquire = options.onAcquire;
        this._onRelease = options.onRelease;
        this._maxIdle = options.maxIdle ?? Infinity;
        if (options.initialSize && options.initialSize > 0) {
            this.prewarm(options.initialSize);
        }
    }

    /**
     * 预创建空闲对象
     */
    prewarm(count: number): void {
        const n = Math.max(0, count);
        for (let i = 0; i < n; i++) {
            const item = this._create();
            this._created++;
            this._idle.push(item);
        }
    }

    /**
     * 取出一个对象。池空时扩容。
     */
    acquire(): T {
        let item = this._idle.pop();
        if (item === undefined) {
            item = this._create();
            this._created++;
        }
        this._active.add(item);
        this._acquireCount++;
        this._onAcquire?.(item);
        return item;
    }

    /**
     * 归还对象。重复 release 安全（返回 false）。
     */
    release(item: T): boolean {
        if (!this._active.has(item)) {
            return false;
        }
        this._active.delete(item);
        this._onRelease?.(item);
        this._releaseCount++;
        if (this._idle.length < this._maxIdle) {
            this._idle.push(item);
        }
        return true;
    }

    /**
     * 将所有在用对象归还。容量（created / idle）保留。
     */
    releaseAll(): void {
        if (this._active.size === 0) return;
        const items = Array.from(this._active);
        this._active.clear();
        for (const item of items) {
            this._onRelease?.(item);
            this._releaseCount++;
            if (this._idle.length < this._maxIdle) {
                this._idle.push(item);
            }
        }
    }

    getStats(): PoolStats {
        return {
            created: this._created,
            idle: this._idle.length,
            active: this._active.size,
            acquireCount: this._acquireCount,
            releaseCount: this._releaseCount
        };
    }

    get created(): number { return this._created; }
    get idleCount(): number { return this._idle.length; }
    get activeCount(): number { return this._active.size; }
    /** idle + active，清场后应等于 created（未超 maxIdle 时） */
    get capacity(): number { return this._idle.length + this._active.size; }

    /**
     * 丢弃全部引用（测试 / 彻底重置）。不调用 create 的销毁逻辑。
     */
    reset(): void {
        this._idle.length = 0;
        this._active.clear();
        this._created = 0;
        this._acquireCount = 0;
        this._releaseCount = 0;
    }
}

/**
 * 可复用列表：clear 只把 length 置 0，保留底层容量，避免每帧 new Array。
 */
export class ReusableList<T> {
    private _items: T[] = [];
    private _length = 0;

    get length(): number { return this._length; }
    get capacity(): number { return this._items.length; }

    push(item: T): void {
        if (this._length < this._items.length) {
            this._items[this._length] = item;
        } else {
            this._items.push(item);
        }
        this._length++;
    }

    get(index: number): T | undefined {
        if (index < 0 || index >= this._length) return undefined;
        return this._items[index];
    }

    set(index: number, item: T): void {
        if (index < 0 || index >= this._length) return;
        this._items[index] = item;
    }

    /**
     * 保留 capacity，length 归零。
     */
    clear(): void {
        this._length = 0;
    }

    /**
     * 截断到 n，n 不得大于当前 length。
     */
    truncate(n: number): void {
        this._length = Math.max(0, Math.min(n, this._length));
    }

    toArray(): T[] {
        return this._items.slice(0, this._length);
    }

    forEach(fn: (item: T, index: number) => void): void {
        for (let i = 0; i < this._length; i++) {
            fn(this._items[i], i);
        }
    }
}
