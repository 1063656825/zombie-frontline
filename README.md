# 尸潮防线 - Cocos Creator 3.x 微信小游戏

> 竖屏轻塔防：波间落子 + 波内自动割草

**v0 / Day15** — 提审前代码收口（隐私/协议、Debug 默认关、广告配置说明）。玩法与数值仍为 Day14 冻包 / Day10 锁表。版本见 `VERSION`（`0.15.0-v0-day15`）。无 IAP。

| 文档 | 用途 |
|------|------|
| `SUBMISSION.md` | 微信小游戏提审清单（构建、合规、素材、盲测门禁） |
| `CREATOR_QA.md` | Day1–15 Creator / 微信开发者工具可勾选验收 |
| `PERFORMANCE.md` | Day13 对象池与真机帧率目标 |
| `ANALYTICS.md` | 埋点与验证指标 |
| `BALANCE.md` | Day10 平衡表（勿在冻包后顺手改） |

**已知限制：** 广告默认 Mock（`AdService.ts` `AD_UNIT_IDS` 为空）；美术为色块占位；本开发环境 **无 Creator、无真机**，通关/广告/30fps **均未在此 VM 跑过**，必须以 `CREATOR_QA.md` 人测为准。

## 项目简介

「尸潮防线」是一款末日丧尸题材的竖屏轻塔防微信小游戏。游戏采用独特的"双节奏"设计：
- **部署窗**：落子/合成建筑（快落 8s + 微调 4s）
- **战斗窗**：点屏转向 + 朝向处自动开火

纯 IAA 变现（激励视频），无内购。

## Day1 完成内容

### ✅ 工程结构
```
zombie-frontline/
├── assets/
│   ├── scenes/           # 场景文件
│   │   ├── Boot.scene    # 启动场景
│   │   ├── Lobby.scene   # 大厅场景
│   │   └── Battle.scene  # 战斗场景
│   ├── scripts/
│   │   ├── battle/       # 战斗系统
│   │   │   ├── BattleFlow.ts      # 状态机（核心）
│   │   │   ├── WaveConfig.ts      # 波次配置
│   │   │   ├── BuildingConfig.ts  # 建筑配置
│   │   │   ├── GridBuild.ts       # 格子系统骨架
│   │   │   ├── Combat.ts          # 战斗系统骨架
│   │   │   └── EnemyWave.ts       # 敌人生成器骨架
│   │   ├── core/         # 核心系统
│   │   │   ├── SceneManager.ts    # 场景管理
│   │   │   ├── BootScene.ts       # 启动场景控制
│   │   │   ├── LobbyScene.ts      # 大厅场景控制
│   │   │   └── BattleScene.ts     # 战斗场景控制
│   │   ├── data/         # 数据模型
│   │   │   └── GameData.ts        # HP/DP/Scrap 数据
│   │   └── ui/           # UI 组件
│   │       ├── PlaceholderGraphics.ts  # 占位美术
│   │       └── DebugPanel.ts           # 调试面板
│   ├── prefabs/          # 预制体（Day2+）
│   └── resources/        # 动态加载资源
├── settings/             # 项目设置
│   └── v2/packages/
│       ├── project.json  # 720×1280 竖屏
│       └── builder.json  # 微信小游戏配置
├── package.json          # 项目信息
└── tsconfig.json         # TypeScript 配置
```

### ✅ 设计分辨率
- **竖屏 720×1280**
- fitHeight = true（高度适配）

### ✅ 战斗状态机
```
DeployFast (8s) → DeployTune (4s) → Combat → WaveClear (1.5s) → 循环或 Settle
```

状态流转：
1. **DeployFast**：快速落子阶段（8 秒，W0 教学波 6 秒）
2. **DeployTune**：微调/确认阶段（4 秒，可点「开战」跳过）
3. **Combat**：战斗阶段，敌人生成与攻击
4. **WaveClear**：波次清除过渡（1.5 秒）
5. **Settle**：结算（胜利/失败）

### ✅ 数据模型
```typescript
// 据点数据
hp: number;       // 当前生命值
maxHp: number;    // 最大生命值（含城防加成）
dp: number;       // 部署点
maxDp: number;    // 部署点上限（12）
scrap: number;    // 残骸（局外货币）

// 三线成长
firepower: 0-5;   // 火力线（伤害加成）
defense: 0-5;     // 城防线（HP 加成）
supply: 0-5;      // 补给线（开局 DP 加成）
```

### ✅ 占位美术
- **据点**：蓝色方块
- **建筑**：
  - 机枪塔：绿色方块
  - 炮轰塔：橙色八边形
  - 地雷：紫色三角形
- **敌人**：
  - Z1 步行尸：棕色圆形
  - Z2 快跑尸：深橙色圆形
  - Z3 胖尸：蓝灰色大圆形

---

## 如何打开项目

### 前置要求
- [Cocos Creator 3.8.x](https://www.cocos.com/creator-download)（推荐 3.8.0+）
- Node.js 18+

### 打开步骤

1. **下载/克隆项目**
   ```bash
   git clone <repository-url>
   cd zombie-frontline
   ```

2. **用 Cocos Creator 打开**
   - 启动 Cocos Dashboard
   - 点击「添加」→ 选择项目根目录
   - 双击项目打开编辑器

3. **首次打开**
   - Creator 会自动生成 `library/` 目录
   - 可能提示升级项目，选择「升级」即可

### 预览运行

1. 在项目管理器中双击 `assets/scenes/Boot.scene` 打开启动场景（只开 Boot 即可，不必先打开 Lobby）
2. 点击编辑器顶部的「预览」按钮（或按 F5）
3. 浏览器应先显示「尸潮防线」加载页，约 1.5 秒进入大厅（「开始战斗」）

若仍停在加载页、Console 出现 `Can not find class`，或 `_onBatchCreated is not a function`：关掉 Creator，删除项目下 `library/` 与 `temp/` 后重新打开再预览 Boot。脚本 class id 已改为 Creator 压缩 UUID，旧 `library/` 对不上。详情见 `CREATOR_QA.md` §0。

---

## Day1 验收步骤

### 1. 状态机流转验证

1. 打开 `Battle.scene` 并运行预览
2. 观察屏幕顶部状态显示：
   - 应显示「状态: 快速落子」+ 倒计时
   - 8 秒后自动切换到「状态: 微调确认」
   - 再 4 秒后自动切换到「状态: 战斗中」
3. 点击「开战」按钮可提前结束部署阶段

### 2. 数据模型验证

1. 在浏览器控制台查看日志输出
2. 应看到类似：
   ```
   [BattleFlow] 状态切换: None → DeployFast
   [BattleFlow] 波次 0 发放 DP: +3
   [GameData] DP: 5/12
   ```

### 3. 场景切换验证

1. 从 `Boot.scene` 启动
2. 等待 1.5 秒自动跳转到 `Lobby`
3. 点击「开始战斗」进入 `Battle`

---

## Day2 完成内容

### ✅ 底部三建筑按钮
- **机枪塔**：2 DP（绿色按钮）
- **炮轰塔**：3 DP（橙色按钮）
- **地雷**：1 DP（紫色按钮）

### ✅ 点选落子
1. 点击建筑按钮选中（黄色边框高亮）
2. 点击绿色可放置格子落下 L1 建筑
3. 建筑立即显示为占位色块

### ✅ DP 校验
- 余额不足时按钮变灰，无法点击
- 费用显示红色表示 DP 不足
- 落子成功后自动扣除 DP

### ✅ 战斗窗锁定
- Combat/WaveClear/Settle 状态下：
  - 建筑按钮全部禁用（灰显）
  - 点击网格无反应
  - 自动取消已选中的建筑

### ✅ 网格渲染
- 绿色格子：可放置区域
- 红色格子：不可放置（敌人路径）
- 黄色高亮：当前鼠标/触摸位置

### 新增文件
```
assets/scripts/ui/BuildingPanel.ts   # 建筑选择面板
```

### 修改文件
```
assets/scripts/battle/GridBuild.ts   # 添加渲染与点击处理
assets/scripts/core/BattleScene.ts   # 整合建筑面板
```

---

## Day2 验收步骤

### 1. 建筑按钮功能

1. 打开 `Battle.scene` 并预览
2. 在 DeployFast/DeployTune 阶段：
   - 底部应显示三个建筑按钮
   - 点击按钮，边框变黄色（选中状态）
   - 再次点击取消选中

### 2. 落子功能

1. 选中一个建筑（如机枪塔）
2. 点击屏幕中间的**绿色格子**
3. 应看到：
   - 控制台输出 `[GridBuild] 放置建筑: MachineGun 于 (x, y)`
   - HUD 显示 DP 减少
   - 格子上出现建筑色块

### 3. DP 校验

1. 消耗 DP 直到余额 < 3
2. 炮轰按钮（3 DP）应变灰
3. 点击灰色按钮无反应

### 4. 战斗锁定

1. 点击「开战」进入 Combat 状态
2. 所有建筑按钮应变灰
3. 点击网格无反应
4. 控制台输出 `[GridBuild] 非部署阶段，无法放置`

### 5. 控制台日志示例
```
[BattleScene] Day2: 建筑面板与网格交互已启用
[GridBuild] 网格初始化完成: 6x4
[BattleFlow] 状态切换: None → DeployFast
[BuildingPanel] 选中建筑: 机枪塔
[BattleScene] 选中建筑: 机枪塔
[GridBuild] 建筑类型: MachineGun
[GridBuild] 放置建筑: MachineGun 于 (0, 1), 消耗 2 DP
[BattleScene] 建筑放置成功: MachineGun
```

---

## Day3 完成内容

### ✅ 敌人沿路径移动
- 两条路径（左/右）从屏幕顶部到据点
- 敌人按 WaveConfig 配置生成（W0-W5）
- 三种敌人：Z1 步行尸、Z2 快跑尸、Z3 胖尸
- 敌人到达据点扣 HP 后消失

### ✅ 建筑自动索敌开火
- **机枪塔**：单体攻击，DPS 6，射程中等
- **炮轰塔**：AOE 攻击，DPS 4，对胖尸 1.5x 伤害
- 根据 BuildingConfig 读取射程、射速、伤害
- 攻击时建筑有闪烁反馈

### ✅ 地雷踩踏触发
- 敌人进入地雷触发范围时爆炸
- L1 地雷：25 伤害，1.2 半径
- 触发后地雷自动移除
- 可影响多个敌人

### ✅ 点屏转向 + 朝向自动开火
- Combat 状态下点击/拖动屏幕改变主角朝向
- 黄色瞄准线指示当前朝向
- 60° 扇形范围内自动射击最近敌人
- 主角 DPS 4，每秒 2 次攻击

### 修改文件
```
assets/scripts/battle/Combat.ts      # 完整战斗系统实现
assets/scripts/battle/EnemyWave.ts   # 敌人生成与双路径
assets/scripts/core/BattleScene.ts   # 整合战斗系统、点屏转向
```

---

## Day3 验收步骤

### 1. 敌人生成与移动

1. 打开 `Battle.scene` 并预览
2. 部署 1-2 个建筑后点击「开战」
3. 观察：
   - 敌人从屏幕顶部生成（左右交替）
   - 沿红色路径向下移动
   - 控制台输出 `[Combat] 生成敌人: Z1 (左路)`

### 2. 建筑自动开火

1. 放置机枪塔在路径附近
2. 开战后观察：
   - 敌人进入射程时建筑闪烁
   - 控制台输出伤害日志
   - 敌人血量减少直到死亡

### 3. 地雷触发

1. 在红色路径格子附近放置地雷
2. 开战后等待敌人路过
3. 观察：
   - 控制台输出 `[Combat] 地雷触发！`
   - 地雷消失，敌人受伤

### 4. 点屏转向射击

1. Combat 状态下点击/拖动屏幕
2. 观察：
   - 黄色瞄准线跟随触摸位置
   - 扇形范围内敌人被攻击
   - 控制台输出 `[Combat] 主角射击 Z1`

### 5. 敌人到达据点

1. 让敌人穿过防线到达底部
2. 观察：
   - 据点 HP 减少
   - 控制台输出 `[Combat] Z1 到达据点，造成 5 伤害`

### 6. 波次清除

1. 击杀所有敌人
2. 观察：
   - 状态切换到 WaveClear
   - 1.5 秒后进入下一波 DeployFast
   - 获得新的 DP 可继续部署

### 控制台日志示例
```
[BattleScene] Day3: 战斗系统已启用
[BattleScene] 波次 0 开始
[EnemyWave] 开始波次 0, 敌人总数: 6
[Combat] 战斗系统: 激活
[Combat] 生成敌人: Z1 (左路)
[Combat] 生成敌人: Z1 (右路)
[Combat] Z1 受到 3.0 伤害, 剩余 HP: 7.0
[Combat] 击杀敌人: Z1
[BattleFlow] 敌人被消灭，剩余: 5
[Combat] 地雷触发！影响 2 个敌人
[Combat] 主角射击 Z1，造成 2.0 伤害
[Combat] Z1 到达据点，造成 5 伤害，剩余 HP: 95
[BattleFlow] 波次 0 清除
```

---

## Day4 完成内容

### ✅ W0-W5 配置驱动
- WaveConfig 完整驱动刷怪种类、数量、DP 发放、部署时长
- W0 教学波：6 只 Z1，6 秒快落
- W1-W4 逐波增加敌人数量和种类
- W5 Boss 波：15×Z1 + 10×Z2 + 4×Z3

### ✅ 胜负判定
- **胜利**：W5 清完 → Settle 状态，显示胜利面板，+30 残骸
- **失败**：据点 HP≤0 → 触发复活判定

### ✅ 复活 UI（Mock 广告）
- 失败时弹出复活面板（半透明遮罩）
- 点击「看视频复活」→ Mock 延迟 0.5-1s
- 复活后：回复 50% HP，重打当前波，保留已放置建筑
- 本关仅限 1 次复活机会
- 可点「放弃」返回失败结算

### ✅ 结算面板
- 胜利：显示通关波次、获得残骸 +30
- 失败：显示到达波次、获得残骸 +9（30% 基础奖励）
- 点击确认返回大厅

### 新增文件
```
assets/scripts/ui/RevivePanel.ts    # 复活面板
assets/scripts/ui/SettlePanel.ts    # 结算面板
```

### 修改文件
```
assets/scripts/battle/BattleFlow.ts  # 复活逻辑、RevivePrompt 状态
assets/scripts/core/BattleScene.ts   # 整合复活与结算面板
```

---

## Day4 验收步骤

### 1. 完整波次流程

1. 打开 `Battle.scene` 预览
2. 从 W0 开始，合理部署建筑
3. 观察波次推进：W0 → W1 → ... → W5
4. W5 清完后显示胜利面板

### 2. 胜利结算

1. 通关 W5 后
2. 显示绿色边框胜利面板
3. 显示「通关波次: 6/6」
4. 显示「获得残骸: +30」
5. 点击「返回大厅」

### 3. 失败与复活

1. 故意让敌人穿过防线，HP 归零
2. 弹出复活面板（红色边框）
3. 点击「看视频复活」
4. 等待 0.5-1 秒 Mock 加载
5. 观察：
   - HP 恢复到 50%
   - 当前波重新开始
   - 建筑保留
   - 控制台输出 `[BattleFlow] 复活成功`

### 4. 复活限制

1. 复活后再次 HP 归零
2. 直接进入失败结算（无复活选项）
3. 显示「到达波次: X/6」
4. 显示「获得残骸: +9」

### 5. 放弃复活

1. 触发失败，显示复活面板
2. 点击「放弃」
3. 进入失败结算面板

### 控制台日志示例
```
[BattleScene] Day4: 复活与结算系统已启用
[BattleFlow] 波次 0 发放 DP: +3
[Combat] Z1 到达据点，造成 5 伤害，剩余 HP: 0
[BattleFlow] 据点被摧毁！
[BattleFlow] 可使用复活广告
[BattleScene] 显示复活面板，可复活: true
[RevivePanel] 开始 Mock 广告...
[RevivePanel] Mock 广告成功，执行复活
[BattleFlow] 复活成功，HP 恢复至 50，重打波次 0
[BattleScene] 波次 0 开始
...
[BattleFlow] 波次 5 清除
[BattleFlow] 战斗胜利！
[SettlePanel] 显示胜利结算，残骸: 30
```

---

## Day5 完成内容

### ✅ 同种合成 L1+L1→L2
- 仅 DeployFast/DeployTune 阶段允许合成
- 拖拽 L1 建筑到另一同种 L1 即可合成
- 可合成目标高亮（黄色），激活目标高亮（绿色）
- 合成后：源格释放、目标格显示 L2 外观
- Combat 及其他阶段禁止合成，中途切状态安全取消
- 无额外 DP 费用
- L2 战斗数值正确读取（DPS、射程、AOE、地雷伤害等）

### ✅ 引导气泡
- 首次落子：进入 DeployFast 时显示
- 首次战斗触摸：Combat 阶段首次触摸时显示
- 首次可合成：放置第二个同种 L1 后显示
- 3 秒自动消失，非阻塞，不抢触摸
- localStorage 存储已显示标记，不重复弹

### ✅ 胜利双倍奖励
- 基础残骸 30，点击「看视频双倍 (模拟)」
- Mock 广告延迟 0.5-1s
- 成功后额外 +30，显示「已双倍」
- 防重复入账：状态机 idle→watching→claimed
- 异步期间禁止确认按钮
- 失败结算不显示双倍入口

### 新增文件
```
assets/scripts/ui/TutorialGuide.ts   # 引导气泡
tests/day5.test.ts                   # 单元测试（vitest）
tsconfig.test.json                   # 测试 TS 配置
```

### 修改文件
```
assets/scripts/battle/GridBuild.ts   # 拖拽合成、首次可合成事件
assets/scripts/ui/SettlePanel.ts     # 双倍奖励状态机
assets/scripts/core/BattleScene.ts   # 整合引导系统
```

---

## Day5 验收步骤

### 1. 合成功能

1. 打开 `Battle.scene` 预览
2. 放置两个机枪塔（同种 L1）
3. 拖动其中一个到另一个上
4. 观察：
   - 可合成目标高亮为黄色
   - 释放后合成为 L2（更深绿色、更大）
   - 控制台输出 `[GridBuild] 合成成功: MachineGun 升级到 L2`

### 2. 合成限制

1. 尝试拖动 L2 建筑 → 无法启动拖拽
2. 尝试拖动到不同种类 → 无高亮，释放后取消
3. 进入 Combat 状态 → 拖拽自动取消

### 3. L2 战斗数值

1. 放置机枪 L1 + L1 → 合成 L2
2. 开战后观察攻击伤害：
   - L1 DPS=6, L2 DPS=14
   - 控制台伤害日志应更高

### 4. 引导气泡

1. 重置引导（控制台运行 `TutorialGuide.resetAll()`）
2. 进入 DeployFast → 显示「点击下方建筑按钮...」
3. 放置两个同种 L1 → 显示「拖动同种 L1 建筑...」
4. 进入 Combat 并触摸 → 显示「点击屏幕改变朝向...」
5. 同关重开引导不再重复弹出

### 5. 胜利双倍

1. 通关 W5，显示胜利面板
2. 点击「看视频双倍 (模拟)」
3. 按钮变为「加载中...」
4. 0.5-1 秒后显示「✓ 已领取双倍」
5. 残骸显示「获得残骸: +60 (已双倍)」
6. 再次点击按钮无效（已领取）
7. 点击「返回大厅」正常退出

### 6. 失败结算

1. 故意失败（HP 归零）
2. 放弃复活，进入失败结算
3. 确认：无双倍按钮显示

### 控制台日志示例
```
[BattleScene] Day5: 引导与合成系统已启用
[TutorialGuide] 显示引导: first_place
[GridBuild] 放置建筑: MachineGun 于 (0, 0), 消耗 2 DP
[GridBuild] 放置建筑: MachineGun 于 (1, 0), 消耗 2 DP
[GridBuild] 首次可合成
[TutorialGuide] 显示引导: first_merge
[GridBuild] 开始合成拖拽: MachineGun L1 from (1, 0)
[GridBuild] 拖拽合成成功
[GridBuild] 合成成功: MachineGun 升级到 L2
...
[SettlePanel] 显示胜利结算，基础残骸: 30
[SettlePanel] 开始模拟广告...
[SettlePanel] 模拟广告成功，额外获得: +30，总计: 60
```

---

## Day5 单元测试

运行测试：
```bash
npm install
npx vitest run tests/day5.test.ts
```

测试覆盖：
- 合成规则 (canMerge)：同种 L1+L1 可合成，L2 不可再合
- 阶段锁定 (canDeployInState)：仅 DeployFast/DeployTune 允许
- L2 数值读取：机枪 DPS=14, 炮轰 AOE=1.2, 地雷伤害=55
- 双倍奖励状态机：防重复触发、防重复入账

---

## Day6 完成内容

### ✅ Meta 持久化层
- 新建 `MetaData.ts`：独立的三线成长数据管理
- 存储键：`zombie_frontline_meta_v1`
- WeChat (`wx.setStorageSync`) / localStorage / 内存回退兼容
- 原子读写：升级失败不扣 scrap

### ✅ 三线升级费用表

| 等级 | 费用 | 火力 (A) | 城防 (B) | 补给 (C) |
|------|------|----------|----------|----------|
| 0→1 | 20 | 伤害 +8% | HP +15 | 开局 DP +1 |
| 1→2 | 40 | 累计 +16% | HP +30 | 累计 DP +2 |
| 2→3 | 80 | 累计 +26% | HP +50 | 每波 DP +1 |
| 3→4 | 150 | 累计 +38% | 受击减伤 3% | DeployFast +1s |
| 4→5 | 250 | 累计 +52% | HP +75 | 合成 50% 返还 1 DP |

### ✅ Lobby 升级 UI
- 三行升级卡片：🔥 火力 / 🛡️ 城防 / 📦 补给
- 显示：当前等级、下一级效果、费用、当前 scrap
- 升级按钮：scrap 不足灰显、满级禁用
- 升级成功：扣费、刷新 UI、持久化

### ✅ 战斗读取 Meta 加成
- **火力线 (A)**：所有建筑 + 主角伤害乘以 `(1 + bonus%)`
- **城防线 (B)**：maxHp = 100 + bonus，B≥3 受击减伤 3%
- **补给线 (C)**：
  - 开局 DP = 2 + bonus
  - C≥3：每波 DP 发放 +1
  - C≥4：DeployFast 时长 +1s
  - C=5：合成成功 50% 返还 1 DP

### ✅ SettlePanel 残骸持久化
- 胜利/双倍残骸通过 `MetaData.addScrap` 写入
- 返回 Lobby 后可见余额更新

### 新增文件
```
assets/scripts/data/MetaData.ts      # 三线成长持久化层
tests/day6.test.ts                   # 41 个单元测试
```

### 修改文件
```
assets/scripts/data/GameData.ts      # 从 MetaData 读取 scrap 和三线效果
assets/scripts/core/LobbyScene.ts    # 三线升级 UI
assets/scripts/battle/BattleFlow.ts  # 应用补给加成 (C线)
assets/scripts/battle/Combat.ts      # 应用火力加成 (A线)、城防减伤 (B线)
assets/scripts/battle/GridBuild.ts   # 合成返还 DP (C5)
```

---

## Day6 验收步骤

### 1. Lobby 升级 UI

1. 启动游戏，进入 Lobby
2. 查看三行升级卡片
3. 确认显示：当前等级、下一级效果、费用
4. 初始 scrap=0，升级按钮应灰显

### 2. 获取残骸并升级

1. 进入 Battle，通关 W0-W5
2. 胜利后获得 30 残骸（双倍 60）
3. 返回 Lobby，确认 scrap 余额更新
4. 点击「升级」按钮，确认：
   - 等级 +1
   - scrap 扣除
   - 效果文本更新

### 3. 持久化验证

1. 升级后刷新页面
2. 重新进入 Lobby
3. 确认等级和 scrap 保持不变

### 4. 战斗加成验证

1. 升级火力 Lv.1 (+8%)
2. 进入 Battle，观察建筑伤害日志
3. 确认伤害比升级前高 8%

### 5. 补给加成验证

1. 升级补给至 Lv.3
2. 进入 Battle，观察：
   - 每波 DP 发放 +1
   - 控制台输出 `[BattleFlow] 补给加成: 每波 DP +1`

### 6. 城防加成验证

1. 升级城防至 Lv.3
2. 进入 Battle，观察：
   - maxHp = 150（基础 100 + 50）
   - 敌人到达据点时受击减伤

### 7. 合成返还验证 (C5)

1. 升级补给至 Lv.5
2. 进入 Battle，合成建筑
3. 约 50% 概率返还 1 DP
4. 控制台输出 `[GridBuild] 补给加成: 合成返还 1 DP`

---

## Day7 完成内容

### ✅ AdService 广告统一抽象

```
assets/scripts/ads/
├── AdService.ts        # 广告服务单例
└── (三坑位统一走 showRewarded API)
```

三个广告坑位：
1. **Revive** (①)：据点 HP≤0 后弹出复活面板
2. **SettleDouble** (②)：胜利结算双倍残骸
3. **WaveSupply** (③)：部署阶段 DP<3 时补给 +3

Mock 模式（无 adUnitId 时）：0.5-1s 延迟模拟成功
真机模式（配置 adUnitId 后）：调用 `wx.createRewardedVideoAd`

### ✅ 微信平台桥接

```
assets/scripts/platform/
└── WxBridge.ts         # 微信 API 桩
```

功能：
- `isWeChat()`: 检测是否微信环境
- `initWxBridge()`: 初始化分享、振动等微信 API
- 非微信环境自动降级为空实现

### ✅ 补给按钮 (③坑位)

```
assets/scripts/ui/
└── SupplyButton.ts     # 补给按钮组件
```

显示条件：
- 部署阶段 (DeployFast/DeployTune)
- DP < 3
- 本局未使用过

按钮文案：「看广告补充物资」
奖励：+3 DP

### ✅ Day6 Bug 修复

城防减伤门槛修正：
- 原：`fortLevel >= 3` (错误)
- 现：`fortLevel >= 4` (正确，3→4 升级解锁)

设计表要求：
| 升级 | 效果 |
|------|------|
| 2→3 | +20 HP (累计 50) |
| 3→4 | 受击减伤 3% |

### ✅ 单元测试

新增 `tests/day7.test.ts`：
- AdService Mock 逻辑
- 复活单次限制
- 双倍领取状态机
- 补给 DP<3 条件
- 城防减伤门槛修正
- 升级→加成闭环一致性

---

## Day7 验收步骤

### 1. 复活广告 (①坑位)

1. 进入 Battle，故意让据点 HP 降为 0
2. 弹出复活面板，点击「看完视频，站起来再打一波」
3. 等待 Mock 广告完成（0.5-1s）
4. 确认 HP 恢复到 50%，继续战斗
5. 再次 HP≤0，确认只显示「返回大厅」（不可二次复活）

### 2. 双倍广告 (②坑位)

1. 通关 W0-W5，进入胜利结算
2. 确认显示「看完视频，残骸翻倍带走」按钮
3. 点击按钮，等待 Mock 广告
4. 确认残骸从 30 变为 60
5. 确认按钮变灰或消失（不可重复领取）

### 3. 补给广告 (③坑位)

1. 进入 Battle，消耗 DP 至 <3
2. 在部署阶段，确认出现「看广告补充物资」按钮
3. 点击按钮，等待 Mock 广告
4. 确认 DP +3
5. 确认按钮消失（本局不可再用）
6. 下一局重新出现（如果 DP<3）

### 4. 补给按钮隐藏条件

1. DP≥3 时，补给按钮不显示
2. 战斗阶段，补给按钮不显示
3. 本局已用过，即使 DP<3 也不显示

### 5. 城防减伤门槛验证

1. 升级城防至 Lv.3，进入 Battle
2. 让敌人攻击据点，观察伤害日志
3. 确认无减伤（Lv.3 只有 HP 加成）
4. 升级城防至 Lv.4，再次进入 Battle
5. 确认受击伤害减少 3%
6. 控制台输出 `[Combat] 城防减伤: 伤害 X → Y`

### 6. 单元测试

```bash
npx vitest run tests/day7.test.ts
```

确认全部通过（约 26 个测试）

### 控制台日志示例
```
[LobbyScene] 大厅场景开始
[MetaData] 读档成功: {scrap: 60, firepower: 1, fort: 0, supply: 0}
[LobbyScene] 开始战斗
[LobbyScene] 当前三线: 火力=1, 城防=0, 补给=0
[GameData] initBattle: maxHp=100, startDp=2
[GameData] 三线加成: 火力+8%, 城防+0HP, 补给+0DP
[BattleFlow] 波次 0 发放 DP: +3
[Combat] 机枪攻击 Z1，伤害 1.62 (基础 1.5 * 1.08)
...
[SettlePanel] 模拟广告成功，额外获得: +30，总计: 60
[MetaData] Scrap +60, 总计: 120
```

---

## Day6 单元测试

运行测试：
```bash
npx vitest run tests/day6.test.ts
```

测试覆盖（41 个）：
- 升级费用表：0→5 各级费用正确
- 火力线效果：累计伤害百分比
- 城防线效果：累计 HP、减伤门槛
- 补给线效果：开局 DP、波次 DP、DeployFast、合成返还
- 升级逻辑：扣费、等级递增、软上限、scrap 不足拒绝
- 持久化：save/load round-trip
- 合成返还概率：50% 门槛验证

---

## Day7+ 开发计划

### Day7 — 微信与广告桩
- [ ] 微信登录/分享空钩子
- [ ] 激励视频三坑接口（复活、双倍、补给箱）
- [ ] 内测包打包

---

## 技术说明

### 模块依赖关系
```
GameData (单例)
    ↑
BattleFlow (状态机)
    ↓
┌─────────┼─────────┐
GridBuild  Combat  EnemyWave
(格子系统) (战斗)  (波次生成)
```

### 关键文件说明

| 文件 | 职责 |
|------|------|
| `BattleFlow.ts` | 战斗流程状态机，管理部署/战斗/结算切换 |
| `GameData.ts` | 全局数据单例，HP/DP/Scrap/三线成长 |
| `WaveConfig.ts` | 波次配置表，定义每波敌人组成和 DP 发放 |
| `BuildingConfig.ts` | 建筑属性配置，DPS/射程/费用等 |
| `GridBuild.ts` | 格子建造系统，网格渲染与点击落子 |
| `BuildingPanel.ts` | 底部建筑选择面板，DP 校验与状态联动 |
| `Combat.ts` | 战斗系统：敌人移动、建筑开火、地雷触发、主角射击 |
| `EnemyWave.ts` | 敌人波次生成器，双路径交替 |
| `RevivePanel.ts` | 复活面板 UI，Mock 广告延迟 |
| `SettlePanel.ts` | 结算面板 UI，胜利/失败显示，双倍奖励 |
| `TutorialGuide.ts` | 引导气泡，首次落子/战斗/合成 |
| `MetaData.ts` | 三线成长持久化层，升级费用表，效果计算 |

### 本地存储

- 使用 `localStorage`（浏览器）或 `wx.setStorageSync`（微信）
- 存储键：`zombie_frontline_save`
- 存储内容：JSON 序列化的 `ISaveData`

---

## Day8 完成内容

### ✅ 受击闪白

```
assets/scripts/effects/
└── HitEffects.ts       # 闪白 + 击退工具
```

功能：
- 敌人受击时短暂白色闪烁（0.08-0.15s）
- 据点受击时轻微红色闪烁
- 时长自动限制在合理范围

### ✅ 击退系统

击退倍率：
| 敌人类型 | 倍率 | 击退距离 |
|----------|------|----------|
| Z1 步行尸 | 1.0x | 15px |
| Z2 快跑尸 | 1.2x | 18px |
| Z3 胖尸 | 0.4x | 6px |

特性：
- 从伤害源向外推（建筑/主角/地雷）
- 无伤害源时沿路径反方向推
- Y 坐标限制在 -400 以上，防止瞬移进据点
- 胖尸大幅降低击退距离（BOSS 感）

### ✅ 炮轰爆炸圈 VFX

```
assets/scripts/effects/
└── ExplosionVFX.ts     # 爆炸圈动画
```

功能：
- 炮轰命中时显示扩散圈（橙色）
- 地雷爆炸时显示扩散圈（紫色）
- L1/L2 半径分别为 64px/96px
- 0.3s 扩张 + 淡出动画

### ✅ 音效服务占位

```
assets/scripts/audio/
└── AudioService.ts     # 音效服务单例
```

11 种音效 ID：
| ID | 触发位置 | 冷却 |
|----|----------|------|
| place | 落子 | - |
| merge | 合成 | - |
| shoot | 机枪/主角射击 | 50ms |
| cannon_boom | 炮轰命中 | - |
| mine_boom | 地雷爆炸 | - |
| enemy_hit | 敌人受击 | 30ms |
| base_hit | 据点受击 | - |
| wave_start | 波次开始 | - |
| win | 胜利 | - |
| lose | 失败 | - |
| ui_click | UI 点击 | - |

当前为占位模式：
- 播放时输出 `[AudioService] 播放音效: xxx`
- 后续接入：放置音频文件到 `assets/audio/`，修改 `play()` 使用 `AudioSource`

### ✅ 单元测试

新增 `tests/day8.test.ts`：
- 闪白时长限制
- 击退倍率/距离/向量
- 位置限制（防瞬移）
- 爆炸圈半径 L1/L2
- AudioService 记录/冷却/启用

---

## Day8 验收步骤（Creator 必需）

### 1. 受击闪白

1. 进入 Battle，等待敌人出现
2. 观察敌人被建筑/主角攻击时：
   - 瞬间变白色
   - 约 0.1s 后恢复原色
3. 让敌人到达据点：
   - 据点应短暂变红

### 2. 击退效果

1. 放置机枪塔靠近敌人路径
2. 观察敌人被射击时：
   - 被推向远离建筑的方向
   - 移动距离约 15px（Z1）
3. 观察胖尸被击退：
   - 移动距离明显小于步行尸

### 3. 炮轰爆炸圈

1. 放置炮轰塔（建议 L2）
2. 等待炮轰命中敌人：
   - 橙色圆圈从命中点扩散
   - 约 0.3s 淡出消失
3. 放置地雷，等待触发：
   - 紫色圆圈扩散

### 4. 音效调试

1. 打开浏览器控制台
2. 进行游戏操作，观察日志：
   ```
   [AudioService] 播放音效: place
   [AudioService] 播放音效: shoot
   [AudioService] 播放音效: cannon_boom
   [AudioService] 播放音效: enemy_hit
   [AudioService] 播放音效: wave_start
   ```
3. 确认高频音效（shoot/enemy_hit）不会刷屏

### 5. 单元测试

```bash
npx vitest run tests/day8.test.ts
```

确认全部通过（33 个测试）

---

## Day8 单元测试

运行测试：
```bash
npx vitest run tests/day8.test.ts
```

测试覆盖（33 个）：
- 闪白时长限制：边界值、clamp
- 击退倍率：Z1/Z2/Z3 各类型
- 击退距离：15/18/6px
- 击退向量：方向计算、无源默认
- 位置限制：据点门槛 -400
- 爆炸圈半径：L1=64px、L2=96px
- AudioService：启用/禁用/记录/冷却/配置完整性

---

## Day9 完成内容

### ✅ 第二关配置 (L2)

```
assets/scripts/battle/WaveConfig.ts
├── LevelId 枚举 (L1, L2)
├── LevelConfig 接口
├── L1_WAVE_CONFIGS (原首关)
├── L2_WAVE_CONFIGS (新增进阶关)
└── getLevelConfig / getLevelWaves / getLevelBaseScrap
```

### ✅ 关卡选择 UI

Lobby 新增关卡选择：
- L1「首关」- 默认解锁
- L2「进阶」- 通关 L1 后解锁
- 锁定关卡显示 🔒 图标
- 点击切换选中高亮

### ✅ 关卡解锁持久化

```typescript
// MetaData.ts
unlockedLevels: string[]  // ['L1', 'L2', ...]

MetaData.isLevelUnlocked(levelId)
MetaData.unlockLevel(levelId)
MetaData.debugUnlockAllLevels()  // 调试用
```

### ✅ 难度曲线对比

| 维度 | L1 首关 | L2 进阶 |
|------|---------|---------|
| 总敌人 | 93 | 119 (+28%) |
| 总 Z3 胖尸 | 6 | 12 (×2) |
| Z3 首次出现 | W4 | W2 (更早) |
| Z2 首次出现 | W2 | W0 (更早) |
| 总 DP 发放 | 22 | 19 (-14%) |
| W0 DP | 3 | 2 (更紧) |
| 微调时间 | 4s | 3s (更紧) |
| 基础残骸 | 30 | 45 (+50%) |

**L2 为何更难：**
1. **敌人更多**：总量 +28%，压力更大
2. **精英更早**：Z2 开局就有，Z3 第三波出现
3. **资源更紧**：DP 总发放 -14%，部署时间 -1s
4. **密度更高**：敌人刷新间隔更短

**首通预期：**
- L1：新手可首次通关，熟悉机制
- L2：需要升级 2-3 条线，合理搭配建筑

### ✅ 失败手感改进

```
assets/scripts/effects/HitEffects.ts
├── screenShake()      - 屏幕震动
└── screenFlashRed()   - 红色闪屏
```

失败时触发：
- 屏幕震动 0.35s (强度 12px)
- 红色闪烁 0.2s

失败文案改进：
- 标题：「💀 据点沦陷」
- 进度：「坚持到第 X 波 (Y%)」
- 奖励：「抢救残骸: +Z」

### ✅ 单元测试

新增 `tests/day9.test.ts`：
- 关卡配置存在
- L2 敌人总数 > L1
- L2 Z2/Z3 出现更早
- L2 DP 发放更紧
- L2 部署时间更紧
- 残骸奖励对比
- 关卡解锁逻辑
- 难度曲线递增

---

## Day9 验收步骤（Creator 必需）

### 1. 关卡选择 UI

1. 启动游戏，进入 Lobby
2. 查看「选择关卡」区域
3. 确认 L1 可选，L2 显示 🔒 锁定
4. 点击 L2，确认无法选中

### 2. L1 通关解锁 L2

1. 选择 L1，开始战斗
2. 通关 W0-W5（或 debug 跳过）
3. 返回 Lobby，确认 L2 解锁
4. 刷新页面，确认 L2 仍解锁

### 3. L2 难度体验

1. 选择 L2 开始战斗
2. W0 即有快跑尸（Z2）
3. W2 首次出现胖尸（Z3）
4. 注意 DP 发放比 L1 少
5. 部署时间（微调 3s）比 L1 短

### 4. 失败手感

1. 在 L2 故意失败（让敌人打穿）
2. 观察失败瞬间：
   - 屏幕震动
   - 红色闪烁
3. 查看结算面板：
   - 标题「💀 据点沦陷」
   - 显示「坚持到第 X 波 (Y%)」

### 5. 残骸奖励

1. 通关 L1，获得 30 基础残骸
2. 通关 L2，获得 45 基础残骸
3. 双倍后分别为 60 / 90

### 6. 调试解锁

浏览器控制台：
```javascript
MetaData.debugUnlockAllLevels()
```
确认 L2 立即解锁。

### 7. 单元测试

```bash
npx vitest run tests/day9.test.ts
```

确认全部通过（30 个测试）

---

## Day9 单元测试

运行测试：
```bash
npx vitest run tests/day9.test.ts
```

测试覆盖（30 个）：
- 关卡配置存在：L1、L2 各 6 波
- 敌人总数：L2 (119) > L1 (93)
- Z2/Z3 出现时机：L2 更早
- DP 发放：L2 更紧
- 部署时间：L2 更短
- 残骸奖励：L2 (45) > L1 (30)
- 解锁逻辑：初始 L1，通关解锁
- 难度曲线：每波敌人递增

---

## Day10 完成内容

### ✅ 平衡调参

详见 `BALANCE.md`，完整记录调整前后对比与理由。

### 关键调整摘要

**建筑 DPS 调整：**
| 建筑 | 调整 | 理由 |
|------|------|------|
| MachineGun L1 | DPS 6→7 | W2 Z2 rush TTK 提升 |
| MachineGun L2 | DPS 14→15 | 保持 L2/L1 倍率 |
| Cannon L1 | tankBonus 1.5→1.6 | 缓解 Z3 压力 |
| Cannon L2 | DPS 9→10, tankBonus 2.0→2.2 | Z3 cluster 清场 |
| Mine L1 | triggerDamage 25→28 | 火力+8%后可一击 Z2 |
| Mine L2 | triggerDamage 55→60 | 保持倍率 |

**DP 发放调整：**
| 关卡 | 波次 | 调整 | 理由 |
|------|------|------|------|
| L1 | W3 | 3→4 | 鼓励合成 |
| L1 | W5 | 5→6 | 最终波资源 |
| L2 | W0 | 2→3 | 降低开局惩罚 |
| L2 | W2 | 3→4 | 首次 Z3 |
| L2 | W4 | 4→5 | 高潮波 |
| L2 | W5 | 4→5 | 最终波 |

**敌人调整：**
- L1 W2 Z2: 4→3, delay 10s→12s
- L1 W3 Z2: 6→5
- L1/L2 Z3 interval 拉长 (避免 cluster)
- L2 W5 敌人减少 (Z1:20→18, Z2:15→13, Z3:6→5)

### 总体变化

| 指标 | L1 调整前 | L1 调整后 | L2 调整前 | L2 调整后 |
|------|-----------|-----------|-----------|-----------|
| 总敌人 | 93 | 91 | 133 | 124 |
| 总 DP | 22 | 24 | 19 | 23 |

### ✅ 单元测试

新增 `tests/day10.test.ts`：
- 建筑配置不变性 (cost>0, dps≥0, 无 NaN)
- 建筑 DPS 排序 (L2>L1, MG>Cannon 单体)
- 敌人配置不变性
- 波次配置不变性
- L2 比 L1 更难断言
- DPS vs HP sanity check
- 难度曲线递增

---

## Day10 验收步骤（Creator 必需）

### 1. MG DPS 提升体验

1. 进入 L1 W2
2. 放置 1-2 座机枪
3. 观察 Z2 被击杀速度比之前快

### 2. W3 DP+1 体验

1. 进入 L1 W3
2. 确认收到 4 DP（而非 3）
3. 尝试合成一座 L2 建筑

### 3. Z3 cluster 缓解

1. 进入 L1 W4
2. 观察 2 只 Z3 不再同时到达
3. 炮轰有时间逐个击杀

### 4. L2 开局体验

1. 选择 L2 开始
2. W0 收到 3 DP（而非 2）
3. 可放置 1 座机枪 + 1 座地雷

### 5. 单元测试

```bash
npx vitest run tests/day10.test.ts
```

确认全部通过（41 个测试）

---

## Day10 单元测试

运行测试：
```bash
npx vitest run tests/day10.test.ts
```

测试覆盖（41 个）：
- 建筑配置不变性：dpCost>0, dps≥0, range≥0, fireRate≥0
- 建筑 DPS 排序：L2>L1, MG>Cannon
- 建筑成本效率：Mine 最便宜
- 敌人配置：HP>0, speed>0, Z3>Z1 HP, Z2>Z1 speed
- 波次配置：6 波, dpGrant>0, enemies>0
- L2 比 L1 更难：总敌人≥, 总 HP≥, Z3 更多
- Day10 调整后数值：L1=91, L2=124, DP=24/23
- DPS vs HP sanity check：MG 能清 W0/W2, Cannon vs Z3 TTK<3s
- 难度曲线递增
- 无 NaN 检查

---

## Day11 完成内容

### ✅ 部署双节奏 VFX

```
assets/scripts/ui/
└── DeployPhaseIndicator.ts  # 部署阶段指示器
```

**阶段样式：**
| 阶段 | 颜色 | 脉冲速度 | 文案 |
|------|------|----------|------|
| DeployFast | 🟢 绿色 | 2x | 「快速落子」|
| DeployFast 最后 2s | 🔴 红色 | 4x | 「即将开战!」|
| DeployTune | 🟡 黄色 | 1x | 「微调确认」|

**视觉反馈：**
- 计时条颜色随阶段变化
- 脉冲发光效果
- 进度百分比显示
- 最后 2 秒紧急样式

### ✅ 危险侧指示器

```
assets/scripts/ui/
└── DangerSideIndicator.ts   # 危险侧指示器
```

**功能：**
- 实时分析敌人位置（X<0 左侧，X>0 右侧）
- 根据威胁程度显示警告箭头
- 靠近据点的敌人威胁权重更高
- Combat 阶段显示，Settle 时隐藏

**危险判定：**
| 状态 | 条件 | 显示 |
|------|------|------|
| None | 无敌人或敌人<4 且均衡 | 无 |
| Left | 左侧威胁 > 右侧 | ← 左箭头 |
| Right | 右侧威胁 > 左侧 | → 右箭头 |
| Both | 两侧均衡且敌人≥4 | ← → 双箭头 |

### ✅ BattleScene 集成

- `update()` 每帧更新两个指示器
- 部署阶段：根据 timer 和 maxTime 更新计时条
- 战斗阶段：从 Combat 获取敌人位置，分析危险侧
- 结算阶段：隐藏危险侧指示器

### ✅ 单元测试

新增 `tests/day11.test.ts`：
- 阶段样式映射正确
- DeployFast 最后 2s 紧急样式
- 计时条进度计算
- 危险侧分析（左/右/两侧/无）
- 距离权重影响威胁值
- X=0 中线敌人两边各算 0.5

---

## Day11 验收步骤（Creator 必需）

### 1. 部署节奏指示器

1. 进入 Battle，观察 DeployFast 阶段
2. 屏幕上方应显示绿色计时条
3. 计时条随时间减少
4. 文案显示「快速落子」
5. 最后 2 秒变红色，文案「即将开战!」
6. 进入 DeployTune，变黄色，「微调确认」
7. Combat 阶段指示器隐藏

### 2. 危险侧指示器

1. 进入 Combat 阶段
2. 敌人从左路来时，左侧显示警告箭头
3. 敌人从右路来时，右侧显示警告箭头
4. 两侧都有敌人且数量相近时，显示双箭头
5. 敌人被清完后箭头消失
6. 进入 Settle 阶段，指示器隐藏

### 3. 距离权重验证

1. 观察 Combat 阶段
2. 当一侧有靠近据点的敌人时
3. 即使该侧敌人数量少，也可能显示该侧危险
4. 体现「距离越近，威胁越高」的设计

### 4. 单元测试

```bash
npx vitest run tests/day11.test.ts
```

确认全部通过

---

## Day11 单元测试

运行测试：
```bash
npx vitest run tests/day11.test.ts
```

测试覆盖：
- 部署阶段样式映射
- DeployFast 绿色样式
- DeployTune 黄色样式
- 最后 2s 紧急红色样式
- 脉冲速度排序
- 计时条进度计算
- 危险侧分析基础
- 两侧平衡判定
- 距离权重影响
- X=0 中线处理
- 危险侧文本映射
- 样式/枚举完整性

---

## Day12 完成内容

### ✅ Analytics 埋点模块

```
assets/scripts/analytics/
└── Analytics.ts         # 埋点服务单例
```

**功能：**
- `track(name, props)` 通用事件追踪
- 内存 ring buffer (200 条事件)
- 会话级统计汇总
- 可选 `wx.reportAnalytics` 上报

### ✅ 对局/波次追踪

| 事件 | 说明 |
|------|------|
| `run_start` | 对局开始 |
| `run_end` | 对局结束 (含 won/duration_ms/merge_count) |
| `run_win` / `run_lose` | 胜利/失败 |
| `first_run_complete` | 首次通关 |
| `wave_start` | 波次开始 (算作尝试) |
| `wave_clear` | 波次通关 |
| `wave_fail` | 波次失败 (HP≤0) |

### ✅ 广告三坑追踪

| 事件 | 说明 |
|------|------|
| `ad_show` | 广告入口展示 |
| `ad_click` | 用户点击广告 |
| `ad_complete` | 广告完成、奖励发放 |
| `ad_fail` | 广告失败/取消 |

**三坑位：** Revive (复活) / SettleDouble (胜利双倍) / WaveSupply (波次补给)

### ✅ 合成率追踪

| 事件 | 说明 |
|------|------|
| `merge_attempt` | 开始拖拽 L1 建筑 |
| `merge_success` | 合成成功 |
| `revive_used` | 复活使用 |

**统计 API：**
- `getMergeRunRate()` — 有合成的对局占比
- `getMergeSuccessRate()` — 合成成功率
- `getWaveFailRate(level, wave)` — 波失败率
- `getAdConversionRate(slot)` — 广告转化率

### ✅ 埋点接入点

- `BattleFlow.ts` — run_start/run_end, wave events, revive_used
- `GridBuild.ts` — merge_attempt/merge_success
- `RevivePanel.ts` — ad_show/click/complete/fail
- `SettlePanel.ts` — ad_show/click/complete/fail
- `SupplyButton.ts` — ad_show/click/complete/fail

### ✅ 文档

新增 `ANALYTICS.md`：
- 完整事件目录
- 验证指标对照表
- API 使用示例
- 调试说明

### ✅ 单元测试

新增 `tests/day12.test.ts`（37 个测试）：
- 事件追踪核心功能
- 对局生命周期追踪
- 波次事件追踪
- 广告三坑追踪
- 合成率追踪
- 复活追踪
- 完整对局流程模拟

---

## Day12 验收步骤（Creator 必需）

### 1. 事件日志输出

1. 进入 Battle，打开浏览器控制台
2. 观察输出：
   ```
   [Analytics] run_start {"level_id":"L1","run_index":1,"is_first_run":true}
   [Analytics] wave_start {"level_id":"L1","wave_index":0}
   ```

### 2. 合成事件

1. 放置两个同种 L1 建筑
2. 开始拖拽合成
3. 观察：
   ```
   [Analytics] merge_attempt {"level_id":"L1","wave_index":0}
   [Analytics] merge_success {"level_id":"L1","wave_index":0,"building_type":"MachineGun"}
   ```

### 3. 广告三坑事件

1. 复活广告：让 HP 归零，观察 `ad_show {slot: "revive"}`
2. 双倍广告：胜利后观察 `ad_show {slot: "settle_double"}`
3. 补给广告：DP<3 时观察 `ad_show {slot: "wave_supply"}`
4. 点击广告后观察 `ad_click` → `ad_complete` 或 `ad_fail`

### 4. 波失败事件

1. 故意让据点 HP 归零
2. 观察：
   ```
   [Analytics] wave_fail {"level_id":"L1","wave_index":2,"reason":"base_hp_zero"}
   ```

### 5. 单元测试

```bash
npx vitest run tests/day12.test.ts
```

确认全部通过（37 个测试）

---

## Day12 单元测试

运行测试：
```bash
npx vitest run tests/day12.test.ts
```

测试覆盖（37 个）：
- Analytics 核心功能
- 对局生命周期追踪
- 波次事件追踪
- 广告三坑追踪
- 合成率追踪
- 复活追踪
- 事件查询
- 完整对局流程模拟
- 枚举完整性

---

## Day13 完成内容

### ✅ 对象池（战斗热路径）

```
assets/scripts/core/ObjectPool.ts     # 通用池 + ReusableList（无 cc，vitest 可 import）
assets/scripts/effects/ExplosionVFX.ts  # ExplosionVfxPool，播完归还
assets/scripts/battle/Combat.ts         # 敌人节点/数据池、弹体数据池、热循环缓冲
assets/scripts/battle/EnemyWave.ts      # 出生点 Vec3 复用、SpawnQueueItem 归还
```

**池化对象：**
| 池 | 预热 | 归还时机 |
|----|------|----------|
| 敌人 Node + EnemyInstance | 12 | 击杀 / `clearAll` |
| 爆炸圈 / 地雷 VFX | 6 | 动画结束 / `clearAll` |
| Projectile 数据 | 8 | lifetime / `clearAll`（开火仍即时命中） |
| SpawnQueueItem | 按波增长 | `stopWave` |

**有意未池化：** Grid 落子/合成节点（低频）、失败红闪（一次）。

### ✅ 分配卫生

- 敌人移动 / 扇形索敌：复用 `_tmpVecA/B`
- `findEnemiesInRange/Cone`、`getAllBuildings`、危险侧坐标：复用数组
- 路径点只读共享，不再每只怪 clone
- 回收时 `Tween.stopAllByTarget`，避免闪白/击退回调打到复用节点

### ✅ 安全拆场

- `Combat.clearAll` / `onDestroy` 归还全部池对象
- 胜利、失败、返回大厅、复活重开波都会清场
- 详见 `PERFORMANCE.md`

### ✅ 单元测试

`tests/day13.test.ts` 直接 import `ObjectPool`（非镜像）。

---

## Day13 验收步骤（Creator 必需）

### 1. 池化可见性

1. 预览 Battle，打开 Hierarchy
2. 开战后击杀敌人：节点应变为隐藏复用，而不是从树中销毁再新建
3. 炮轰命中后 `ExplosionRing` 数量有上限

### 2. 清场

1. 清波 / 失败 / 返回大厅
2. 控制台：`[Combat] 已清空所有战斗实体（池归还）`
3. 再进战斗无残留敌人或爆炸圈

### 3. Profiler（真机/微信）

见 `PERFORMANCE.md`：高潮波目标 ~30fps。VM 无 Creator，此项必须人测。

### 4. 单元测试

```bash
npx vitest run tests/day13.test.ts
npx tsc -p tsconfig.test.json --noEmit
```

---

## Day13 单元测试

运行测试：
```bash
npx vitest run tests/day13.test.ts
```

测试覆盖：
- acquire/release 复用同一实例
- 池空扩容
- 重复 release 安全
- prewarm
- releaseAll 清波后 capacity = created
- maxIdle
- ReusableList clear 保留 capacity
- 波次风格模拟（生成/击杀/清波）
- VFX 池播放后归还

---

## Day14 完成内容（v0 freeze）

冻包：不新开玩法、不改 Day10 数值。交付为提审与 QA 收口。

### ✅ 文档

- `SUBMISSION.md` — 微信提审：Creator 3.8 打开、`Boot.scene` 入口、720×1280、构建概要；无 IAP；三坑 Mock↔adUnitId；隐私占位；适龄/丧尸题材；图标截图待补；「尸潮防线」商标粗查；门禁（L1 通关、真机广告、≥10 人盲测指标）
- `CREATOR_QA.md` — Day1–13 可勾选清单 + 提审前总闸
- `VERSION` — `v0` / `0.14.0-v0-freeze`

### ✅ 工程说明

已有 `settings/v2/packages/project.json`（分辨率与启动场景）与 `builder.json`（微信竖屏、AppID 空）。未改玩法代码。`package.json` version 标为 `0.14.0`。

### 仍须人工（Creator / 微信 / 真机）

见 `CREATOR_QA.md` 与 `SUBMISSION.md` 第 5 节。本 VM 不能代替实机 L1 通关与真机广告。

---

## Day15 完成内容（提审前代码收口）

不改 Day10 数值、不填真实 AppID/adUnitId。

### ✅ 合规入口
大厅底部「隐私政策」「用户协议」→ 全屏可滚动 Overlay →「返回」。正文见 `assets/scripts/core/LegalContent.ts`，存储键与 `MetaData` / `GameData` 一致。

### ✅ Debug 默认关
Boot / Lobby / Battle 启动时 `profiler.hideStats()`。需要时：预览 URL `?zf_debug=1`，或 `localStorage.setItem('zombie_frontline_debug','1')`，或把 `FORCE_DEBUG_OVERLAY` 改为 `true`（勿提交正式包）。

### ✅ 广告仍 Mock
`AD_UNIT_IDS` 三个 key 为空。填写步骤与 `revive` / `settle_double` / `wave_supply` 对应关系写在 `AdService.ts` 与 `SUBMISSION.md`。

---

## 联系方式

如有问题，请联系项目负责人。

---

*Last updated: Day15 提审前代码收口*
