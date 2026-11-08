# 数据埋点文档

Day12: 波失败与广告三坑及合成率埋点

## 概述

纯 IAA 游戏的原型验证埋点，追踪：
1. **波失败率** — 哪个关卡/波次失败，用于难度调整
2. **广告三坑展示/完成** — 复活/双倍/补给的转化率
3. **合成率** — 部署窗内的合成行为，衡量核心玩法参与度

当前实现为 debug 日志 + 内存 ring buffer，可选启用 `wx.reportAnalytics`。

---

## 事件目录

### 对局生命周期

| 事件名 | 触发时机 | 属性 | 验证指标 |
|--------|----------|------|----------|
| `run_start` | 进入战斗场景 | `level_id`, `run_index`, `is_first_run` | 对局开始数 |
| `run_end` | 对局结束（胜/负） | `level_id`, `won`, `wave_reached`, `duration_ms`, `merge_count` | 对局完成率、平均时长 |
| `run_win` | 胜利 | `level_id`, `wave_reached` | 胜率 |
| `run_lose` | 失败 | `level_id`, `wave_reached`, `gave_up_revive?` | 失败率 |
| `first_run_complete` | 首次通关 | `level_id` | 首局完成率 |

### 波次事件

| 事件名 | 触发时机 | 属性 | 验证指标 |
|--------|----------|------|----------|
| `wave_start` | 波次战斗开始 | `level_id`, `wave_index` | 波次尝试数 |
| `wave_clear` | 波次通关 | `level_id`, `wave_index` | 波次通关数 |
| `wave_fail` | 波次失败（HP≤0） | `level_id`, `wave_index`, `reason` | 波失败率 = fails/attempts |

**波失败率计算**:
```
失败率(L1_W2) = waveFails["L1_W2"] / waveAttempts["L1_W2"]
```

### 广告三坑

| 事件名 | 触发时机 | 属性 | 验证指标 |
|--------|----------|------|----------|
| `ad_show` | 广告入口展示 | `slot`, `level_id`, `wave_index` | 曝光数 |
| `ad_click` | 用户点击广告按钮 | `slot`, `level_id`, `wave_index` | 点击数 |
| `ad_complete` | 广告完成，奖励发放 | `slot`, `level_id`, `wave_index` | 完成数 |
| `ad_fail` | 广告失败/取消 | `slot`, `reason`, `level_id`, `wave_index` | 失败数 |

**slot 取值**:
- `revive` — ① 复活广告
- `settle_double` — ② 胜利双倍
- `wave_supply` — ③ 波次补给

**转化率计算**:
```
复活点击率 = ad_complete[revive] / ad_show[revive]
双倍点击率 = ad_complete[settle_double] / ad_show[settle_double]
```

### 合成事件

| 事件名 | 触发时机 | 属性 | 验证指标 |
|--------|----------|------|----------|
| `merge_attempt` | 开始拖拽 L1 建筑 | `level_id`, `wave_index` | 合成尝试数 |
| `merge_success` | 合成成功 | `level_id`, `wave_index`, `building_type` | 合成成功数 |

**合成率计算**:
```
合成成功率 = mergeSuccesses / mergeAttempts
合成对局占比 = runsWithMerge / runCount  (至少完成1次合成的对局)
```

### 复活专项

| 事件名 | 触发时机 | 属性 | 验证指标 |
|--------|----------|------|----------|
| `revive_used` | 复活成功使用 | `level_id`, `wave_index` | 复活使用数 |

---

## 验证指标对照表

| 设计文档指标 | 对应事件 | 计算方式 |
|--------------|----------|----------|
| 首局完成率 | `first_run_complete` | 触发数 / 新用户数 |
| 合成对局占比 | `run_end` | `merge_count > 0` 的对局 / 总对局 |
| 复活点击率 | `ad_show`, `ad_complete` | revive complete / revive show |
| 双倍点击率 | `ad_show`, `ad_complete` | settle_double complete / settle_double show |
| 波失败率 | `wave_start`, `wave_fail` | 按 level_id + wave_index 聚合 |

---

## API 使用

```typescript
import { Analytics } from './assets/scripts/analytics/Analytics';

// 手动追踪
Analytics.track('custom_event', { key: 'value' });

// 获取会话统计
const stats = Analytics.getSessionStats();
console.log(stats.runWins, stats.runLoses);

// 获取波失败率
const failRate = Analytics.getWaveFailRate(LevelId.L1, 2);

// 获取合成对局占比
const mergeRate = Analytics.getMergeRunRate();

// 获取广告转化率
const reviveConversion = Analytics.getAdConversionRate(AdSlot.Revive);

// 打印摘要
Analytics.printSummary();

// 重置会话
Analytics.resetSession();
```

---

## 调试

浏览器控制台会输出所有追踪事件：
```
[Analytics] run_start {"level_id":"L1","run_index":1,"is_first_run":true}
[Analytics] wave_start {"level_id":"L1","wave_index":0}
[Analytics] merge_attempt {"level_id":"L1","wave_index":0}
[Analytics] merge_success {"level_id":"L1","wave_index":0,"building_type":"MachineGun"}
[Analytics] ad_show {"slot":"wave_supply","level_id":"L1","wave_index":0}
```

---

## 微信上报

默认禁用，启用方式：
```typescript
Analytics.setWxReportEnabled(true);
```

启用后会调用 `wx.reportAnalytics(eventName, props)`，需要在微信后台配置对应的事件。

---

## 数据存储

当前实现：
- 内存 ring buffer (200 条事件)
- 会话级统计（页面刷新后重置）

未来可扩展：
- localStorage 持久化
- 服务端上报
- 微信数据分析对接

---

*Last updated: Day12*
