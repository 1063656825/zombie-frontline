# 微信小游戏提审清单 — 尸潮防线 v0

冻包玩法：Day14。代码收口：Day15。玩法与 Day10 数值已锁。纯 IAA，无支付/商城。

本 VM **无 Cocos Creator、无微信开发者工具、无真机**。下列构建/提审步骤必须在本机 Creator + 微信后台完成。

---

## 1. 工程

| 项 | 值 |
|----|-----|
| 引擎 | Cocos Creator **3.8.x**（`package.json` → `creator.version` = 3.8.0） |
| 入口场景 | `assets/scenes/Boot.scene`（`settings/v2/packages/project.json` → `startSceneUuid`） |
| 设计分辨率 | **720×1280** 竖屏，`fitHeight: true`，`fitWidth: false` |
| 微信构建配置 | `settings/v2/packages/builder.json` → `wechatgame` |
| AppID | 当前为空字符串，提审前填入小游戏 AppID |
| 方向 | `portrait` |

场景流：`Boot`（约 1.5s）→ `Lobby` → `Battle`。

### 打开项目

1. 安装 [Cocos Creator 3.8.x](https://www.cocos.com/creator-download)。
2. Dashboard → 添加 → 选择本仓库根目录。
3. 首次打开会生成 `library/`；若提示升级，选升级即可。
4. 双击 `assets/scenes/Boot.scene`，预览（F5）确认能进大厅。

### 构建微信小游戏（概要）

1. 菜单 **项目 → 构建发布**。
2. 发布平台选 **微信小游戏**。
3. 填 **AppID**（与微信公众平台一致）。
4. 确认竖屏、设计分辨率 720×1280。
5. 构建输出目录用微信开发者工具打开。
6. 开发者工具：详情 → 本地设置 → 勾选不校验合法域名（仅调试）；正式提审前配好 request/socket 合法域名（本包当前无服务端，可暂无）。
7. 预览/真机调试通过后，上传代码 → 提交审核。

微信后台还需配置：类目、标签、简介、截图、年龄分级、隐私协议链接。本仓库 **不包含** 这些后台字段。

---

## 2. 合规

### 无 IAP / 支付 / 充值

- 代码与 UI **没有** 支付、商城、钻石充值、iOS/微信米大师入口。
- 局外货币「残骸 (scrap)」仅能通过 **通关结算** 与 **激励视频双倍** 获得，用于三线升级。
- 提审材料中变现方式应填：**激励视频广告**，不要勾选虚拟支付。

若后续误加支付，**不得**在未走微信支付/虚拟支付资质前送审。

### 激励视频三坑（IAA）

| 坑位 | 槽位 ID | UI | 奖励 |
|------|---------|-----|------|
| ① 复活 | `revive` | 据点 HP≤0 面板 | 回复 50% HP，重打当前波，本关 1 次 |
| ② 结算双倍 | `settle_double` | 仅胜利结算 | 残骸 ×2 |
| ③ 波间补给 | `wave_supply` | 部署窗且 DP&lt;3 | +3 DP，本局 1 次 |

**Mock ↔ 真实广告：**

- 配置文件：`assets/scripts/ads/AdService.ts` → `AD_UNIT_IDS`（Day15 三个 key 仍为 `''`，**不要编造 ID**）。
- 对应关系：`revive` 复活 / `settle_double` 胜利双倍 / `wave_supply` 波间补给。
- 填写步骤：微信公众平台 → 流量主 → 创建三个激励式视频广告位 → 把真实 `adUnitId` 分别粘进上述三个 key。空字符串则该槽走 Mock（0.5–1s 延迟，默认成功）。
- 真实路径：微信环境且 adUnitId 非空 → `wx.createRewardedVideoAd`；失败回退 Mock（见 `showRealAd`）。
- 不要把测试广告位 ID 提交到正式审核包。

文案已避免「看广告领钱」类违规承诺，保持「看完视频再打一波 / 残骸翻倍 / 紧急空投 DP」。

### 隐私 / 用户协议（Day15 已落地）

大厅底部有「隐私政策」「用户协议」按钮（不挡「开始战斗」）。点开为全屏可滚动 Overlay，点「返回」关闭。正文在 `assets/scripts/core/LegalContent.ts`。

- [x] 《隐私政策》：说明 localStorage / `wx.setStorageSync`；当前键 `zombie_frontline_meta_v2`，历史 `zombie_frontline_meta_v1` 与 `zombie_frontline_save`；无账号；仅本地成长/关卡解锁；激励视频由微信 SDK；不使用定位/相册/通讯录。
- [x] 《用户协议》：纯 IAA、无支付/商城、本地进度无云存档。
- [ ] 微信公众平台「用户隐私保护指引」仍须运营按上文勾选（**不要**勾未使用权限）。本仓库不包含公众平台后台字段。

存储键（与代码一致）：`zombie_frontline_meta_v2`（当前）、`zombie_frontline_meta_v1`（迁移）、`zombie_frontline_save`（GameData 历史）。

### 适龄与题材（末日丧尸）

- 题材：轻塔防 + 丧尸（占位色块，无写实肢解、无过度血腥）。
- 建议年龄：**12+** 或按微信类目「战争/射击/冒险」实际要求填写；不要标 3+。
- 提审说明建议写：卡通/色块表现、无恐怖跳吓、无真实暴力影像。
- 若审核要求弱化「尸」字，可考虑副标题或审核版文案，**正式改名需另开一轮**（见商标）。

### 其它常见驳回点

- [ ] 分享文案不诱导（`WxBridge` 默认标题可用，勿改成「不分享无法玩」）。
- [x] 玩家可见 UI 默认不显示性能叠层 / DebugPanel（Day15：`applyDebugOverlayPolicy`，见下「如何开 Debug」）。
- [ ] 小游戏类目与玩法一致（塔防/策略）。

**如何临时打开 Debug / 性能叠层（正式包保持关）：**

1. 浏览器预览 URL 加 `?zf_debug=1` 后刷新。
2. 控制台执行 `localStorage.setItem('zombie_frontline_debug','1')` 后刷新（清掉则关）。
3. 仅本地把 `FORCE_DEBUG_OVERLAY`（`assets/scripts/core/DebugFlags.ts`）改为 `true` 再编译；**不要把 true 提交进正式包**。

不要用引擎 `DEBUG` 宏当开关：Creator 预览里它几乎总是 true。

---

## 3. 素材待补清单

构建和公众平台都需要，**仓库内目前没有正式美术**：

| 素材 | 规格参考 | 状态 |
|------|----------|------|
| 小游戏图标 | 通常 1024×1024 PNG | 待补 |
| 启动页 / 加载图 | 按微信后台模板 | 待补 |
| 审核截图 | 竖屏若干张：大厅、部署、战斗、结算 | 待补（Creator 实机截） |
| 分享图 | `WxBridge.setupShareAppMessage` 的 `imageUrl` | 待补（可空，审核不友好） |
| 商店简介图 | 微信后台 | 待补 |

占位色块可过内测，**正式提审强烈建议至少替换图标与 4 张真实截图**。

---

## 4. 临时名与商标

正式名（临）：**尸潮防线**。英文目录名 `zombie-frontline`。

送审前请做一次 **粗查**：

- 国家知识产权局商标网：检索「尸潮防线」「尸潮」「Zombie Frontline」等近似。
- 微信小游戏名称占用：公众平台创建时即会校验重名。
- 若撞名，改 Lobby 标题与 `package.json` `displayName`，不要等到驳回。

本仓库作者未做法律检索，**粗查提醒不等于已清权**。

---

## 5. 验收门禁（冻 v0 → 可提审）

必须全部勾上再点「提交审核」：

1. **Creator 实机 L1 通关**  
   - 用 Creator 预览或开发者工具打完 L1 W0–W5，胜利结算、残骸入账、回大厅可见升级。  
   - 见 `CREATOR_QA.md` 战斗闭环。

2. **真机广告位**  
   - 三个 `AD_UNIT_IDS` 已填正式/提审用激励视频 ID。  
   - 真机走完：复活完成、双倍到账、补给 +3 DP；取消路径不发卡死。  
   - Mock 不得作为正式审核包的唯一路径（审核员若点广告应出微信广告，而不是空白延迟）。

3. **≥10 人盲测 + 验证指标**  
   - 找 ≥10 名未玩过的人各打至少 1 局 L1（可再打 L2）。  
   - 对照 `ANALYTICS.md` 验证指标表收集（控制台 `[Analytics]` 或会话摘要）：

   | 指标 | 事件 | 建议观察 |
   |------|------|----------|
   | 首局完成率 | `first_run_complete` / `run_end` | 新用户是否打完或明确失败 |
   | 合成对局占比 | `run_end.merge_count > 0` | 是否理解 L1+L1 |
   | 复活点击率 | `ad_complete[revive] / ad_show[revive]` | 失败后是否愿意看广告 |
   | 双倍点击率 | `ad_complete[settle_double] / ad_show[settle_double]` | 胜利后是否翻倍 |
   | 波失败率 | `wave_fail / wave_start` 按波 | 哪一波劝退（对照 Day10） |

   盲测 **不改 Day10 数值**；若失败率极端再单独立项调参。

4. **性能（Day13）**  
   - 真机高潮波尽量稳住 ~30fps。见 `PERFORMANCE.md`。

5. **单元测试（本仓库 CI/本地）**  
   - `npx vitest run` 全绿；`npx tsc -p tsconfig.test.json --noEmit` 无错误。

---

## 6. 已知限制（冻包如实申报）

- 广告默认 Mock；未填 adUnitId 时不是正式变现（Day15 仍为空字符串）。
- 美术为 Graphics 色块，非最终视觉。
- 埋点仅内存 ring buffer + 控制台；`wx.reportAnalytics` 默认关。
- 本开发 VM 从未跑过 Creator 预览或微信真机。
- 无服务端、无登录；进度在本地存储，清缓存即丢。
- 弹体为即时命中，无飞行弹表现。
- 大厅已有隐私/协议 Overlay；微信公众平台隐私指引仍须人工勾选。

---

*Day15 提审前代码收口（玩法仍为 Day14 冻包）*
