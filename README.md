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

## Day2+ 开发计划

### Day2 — 部署窗落子
- [ ] 底部三建筑按钮（机枪/炮轰/地雷）+ DP 消耗校验
- [ ] 点按钮 → 在道路可建区落 L1
- [ ] 快落 / 微调 UI 与「开战」跳过
- [ ] 战斗窗禁用建造按钮

### Day3 — 战斗：敌人与建筑开火
- [ ] 敌人沿路径移动；到据点扣 HP
- [ ] 机枪/炮轰自动索敌开火
- [ ] 地雷踩踏触发与销毁
- [ ] 点屏：主角朝向触摸点，按射速打射线/子弹

### Day4 — 波次驱动 + 首关表
- [ ] 配置表驱动 W0～W5
- [ ] 波清空判定 → 下一部署窗
- [ ] 失败：据点 0 → 复活坑 UI

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
| `GridBuild.ts` | 格子建造系统骨架（Day2 实现完整逻辑） |
| `Combat.ts` | 战斗系统骨架（Day3 实现完整逻辑） |

### 本地存储

- 使用 `localStorage`（浏览器）或 `wx.setStorageSync`（微信）
- 存储键：`zombie_frontline_save`
- 存储内容：JSON 序列化的 `ISaveData`

---

## 联系方式

如有问题，请联系项目负责人。

---

*Last updated: Day1 骨架版本*
