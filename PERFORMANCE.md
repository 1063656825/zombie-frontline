# PERFORMANCE.md — Day13 微信小游戏性能过关

中英对照。本轮 **不改玩法数值、不改 IAA**。VM 无 Cocos Creator，设备侧 Profiler 必须由人在真机/模拟器上量。

## 确认过的热点（实现前核对）

| Path | 原状 | 结论 |
|------|------|------|
| `Combat.spawnEnemy` + `killEnemy` | 每只怪 `PlaceholderGraphics.createEnemy` + `node.destroy()` | **最热分配**：波内持续生成/死亡 |
| `ExplosionVFX.createExplosionRing` / `createMineExplosion` | 每次炮轰/地雷 `new Node` + 动画结束 `destroy` | **第二热**：MG 不走这里，炮轰/地雷高频 |
| `Combat._projectiles` | 接口在，开火仍是即时伤害，`updateProjectiles` 原为空 | **未成为热点**；仍接上 `ObjectPool<Projectile>` 以免日后弹道再 new |
| `Combat.update` 热循环 | 每怪每帧 `new Vec3()`；`findEnemiesInRange/Cone` 每帧 `new Array` | 改为成员缓冲 |
| `EnemyWave.update` | 每只怪 `new Vec3` 出生点 | 复用 `_spawnPos`；`SpawnQueueItem` 归还内部池 |
| `GridBuild.getAllBuildings` | 战斗每帧 `Array.from(Map)` | dirty cache |
| `BattleScene.update` Day11 危险侧 | 每帧 `enemies.map(new pos)` | `fillEnemyPositions` 复用 `{x,y}` |
| `GridBuild` 落子/合成 | 低频，非战斗热路径 | **未池化**（有意跳过） |
| `HitEffects.screenFlashRed` | 失败时一次 `new Node` | **未池化**（低频） |

## 池化了什么 / What was pooled

- **Enemy nodes + EnemyInstance data** — `Combat` `ObjectPool`，预热 12。击杀/清波 `release`，不 `destroy`。回收时 `Tween.stopAllByTarget`。
- **Explosion / mine VFX nodes** — `ExplosionVfxPool`（`ObjectPool<Node>` + `ExplosionRing.stop()`），预热 6。播完归还；`clearAll` `releaseAll`。
- **Projectile data** — `ObjectPool<Projectile>` 预热 8。当前开火仍即时命中，不生成飞行弹；`clearAll` / lifetime 到期会归还。
- **Spawn queue items** — `EnemyWave` 内部栈，`stopWave` 归还容量。

通用实现：`assets/scripts/core/ObjectPool.ts`（无 `cc` 依赖，vitest 可直接 import）。

## How to verify in Cocos Creator

1. 打开 `Battle.scene`，预览窗口打开 **Profiler / Stats**（Draw call、Frame、Triangle）。
2. L1 W4–W5 或 L2 高潮波：同时在场敌人较多、炮轰开火时，看：
   - 帧时间是否尖刺后回落（池化后不应随击杀持续爬升 Node 数）。
   - Hierarchy 中 `Enemy_*` / `ExplosionRing` 数量应有上限（预热 + 峰值在场），死后应变为 `active=false` 而不是从树里消失再新建。
3. 控制台：清波 / 返回大厅应出现 `[Combat] 已清空所有战斗实体（池归还）`，`active` 归 0，`idle ≈ created`。
4. 合成、落子、三坑广告、胜负判定与 Day12 行为一致（本轮零数值改动）。

浏览器预览可作参考，**微信小游戏以真机为准**。

## WeChat mini-game targets

- 目标：中高负载（L2 中后段、多塔+炮轰 AOE）尽量稳住 **~30 fps**。
- 低端机允许掉到 25；长时间战斗后不应因节点泄漏越打越卡。
- 本 VM 无 Creator、无微信开发者工具，**device QA 必做**。

## Known remaining risks

- 即时命中仍无飞行弹，弹体池几乎闲置；若改弹道需在开火路径调用 `acquireProjectile`。
- `flashEnemy` / 击退 tween 仍可能每击 `Color.clone` / `Vec3`（HitEffects 纯函数，未改手感）。
- `findNearestEnemy` 仍线性扫全体敌人（数量 < 50 可接受）。
- `screenShake` / `screenFlashRed` 失败时仍临时建节点。
- 像素精灵用 SpriteFrame（NEAREST）或 Graphics 方格回退；敌人节点仍走 Day13 对象池 `restyleEnemy`，不要改回 destroy。
- 网格只在落子/高亮/合成时重绘像素格，不是每帧热路径。
- 对象池预热值（12/6/8）按当前波规模估计，若 L2 同时在场远超 12 会扩容；扩容本身有一次性分配。

## Creator QA checklist（人测，未勾）

测量叠层：预览加 `?zf_debug=1`（正式包默认关）。

- [ ] L1 W0–W5 完整打完，无报错、无残留可见敌人
- [ ] 失败复活重打当前波：旧怪消失，新怪从池复用（像素皮肤 restyle，不是新 destroy）
- [ ] 返回大厅再进 Battle：无上一局 VFX/敌人
- [ ] Profiler：高潮波尽量 ~30fps
- [ ] 微信开发者工具 / 真机：内存曲线不持续上涨
- [ ] 关 Debug 后玩家画面无 FPS 数字、无「测试」字样
