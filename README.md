# 尸潮防线 - Cocos Creator 3.x 微信小游戏

> 竖屏轻塔防：波间落子 + 波内自动割草

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

1. 在项目管理器中双击 `assets/scenes/Boot.scene` 打开启动场景
2. 点击编辑器顶部的「预览」按钮（或按 F5）
3. 在浏览器中查看游戏

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

## Day4+ 开发计划

### Day4 — 波次驱动完善
- [ ] 波清空判定优化
- [ ] 失败：据点 HP≤0 → 复活坑 UI

### Day5 — 合成与教学
- [ ] 部署窗拖拽同种 L1 合成 L2
- [ ] 引导气泡（落子、合成各一次）
- [ ] 胜负结算页

### Day6 — 三线成长
- [ ] Lobby 三线升级 UI + 费用表
- [ ] 升级持久化
- [ ] 局内读取加成

### Day7 — 微信与广告桩
- [ ] 微信登录/分享空钩子
- [ ] 激励视频三坑接口
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

### 本地存储

- 使用 `localStorage`（浏览器）或 `wx.setStorageSync`（微信）
- 存储键：`zombie_frontline_save`
- 存储内容：JSON 序列化的 `ISaveData`

---

## 联系方式

如有问题，请联系项目负责人。

---

*Last updated: Day3 战斗系统版本*
