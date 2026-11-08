# 微信小游戏提审清单 — 尸潮防线 v0

冻包玩法：Day14。代码收口：Day21（像素 UI v1 + 构建/广告/素材占位/盲测工具）。玩法与 Day10 数值已锁。纯 IAA，无支付/商城。

本 VM **无 Cocos Creator、无微信开发者工具、无真机**。构建逐步说明见 `LOCAL_SETUP.md`。下列步骤必须在本机 Creator + 微信后台完成。

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

### 构建微信小游戏

完整步骤与常见坑见 **`LOCAL_SETUP.md`**。摘要：

1. 菜单 **项目 → 构建发布** → 平台 **微信小游戏**。
2. **AppID**：`settings/v2/packages/builder.json` → `wechatgame.appid` 现为 `""`。提审前填公众平台真实 AppID（构建面板与 json 保持一致）。**不要填假号。**
3. 竖屏 `portrait`，设计分辨率 **720×1280**（`project.json`）。
4. 构建输出用微信开发者工具打开 → 真机预览 → 上传 → 提交审核。

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

- 配置文件：`assets/scripts/ads/AdService.ts` → `AD_UNIT_IDS`（三个 key 仍为 `''`，**不要编造 ID**）。
- 对应关系：`revive` 复活 / `settle_double` 胜利双倍 / `wave_supply` 波间补给（见 `AD_SLOT_FILL_GUIDE`）。
- 填写步骤：微信公众平台 → 流量主 → 创建三个激励式视频广告位 → 把真实 `adUnitId` 分别粘进上述三个 key。空字符串则该槽走 Mock（0.5–1s 延迟，默认成功）。
- 真实路径：微信环境且 adUnitId 非空 → `wx.createRewardedVideoAd`；`onError` 回退 Mock（见 `showRealAd`）。
- 不要把测试广告位 ID 提交到正式审核包。

**失败 / 取消回退（代码）：** 进行中重复请求直接 `ok: false`；`showRewarded` 用 try/finally，不会停在 Loading；Mock 失败或取消后 `isLoading === false`；复活按钮恢复原文案、双倍回到 Idle 可再点、补给可重试（均 `AdService.reset()`）。真机取消/失败仍须你在开发者工具勾选。

文案已避免「看广告领钱」类违规承诺，保持「看完视频再打一波 / 残骸翻倍 / 紧急空投 DP」。

### 隐私 / 用户协议（Day15 已落地）

大厅底部有「隐私政策」「用户协议」按钮（不挡「开始战斗」）。点开为全屏可滚动 Overlay，点「返回」关闭。正文在 `assets/scripts/core/LegalContent.ts`。

- [x] 《隐私政策》：说明 localStorage / `wx.setStorageSync`；当前键 `zombie_frontline_meta_v2`，历史 `zombie_frontline_meta_v1` 与 `zombie_frontline_save`；无账号；仅本地成长/关卡解锁；激励视频由微信 SDK；不使用定位/相册/通讯录。
- [x] 《用户协议》：纯 IAA、无支付/商城、本地进度无云存档。
- [ ] 微信公众平台「用户隐私保护指引」仍须运营按上文勾选（**不要**勾未使用权限）。本仓库不包含公众平台后台字段。

存储键（与代码一致）：`zombie_frontline_meta_v2`（当前）、`zombie_frontline_meta_v1`（迁移）、`zombie_frontline_save`（GameData 历史）。

### 适龄与题材（末日丧尸）

- 题材：轻塔防 + 丧尸（像素风，无写实肢解、无过度血腥）。
- 建议年龄：**12+** 或按微信类目「战争/射击/冒险」实际要求填写；不要标 3+。
- 提审说明建议写：卡通/像素表现、无恐怖跳吓、无真实暴力影像。
- 若审核要求弱化「尸」字，可考虑副标题或审核版文案，**正式改名需另开一轮**（见商标）。

### 其它常见驳回点

- [ ] 分享文案不诱导（`WxBridge` 默认标题可用，勿改成「不分享无法玩」）。
- [x] 玩家可见 UI 默认不显示性能叠层 / DebugPanel（Day15：`applyDebugOverlayPolicy`，见下「如何开 Debug」）。
- [ ] 小游戏类目与玩法一致（塔防/策略）。

**如何临时打开 Debug / 性能叠层（正式包保持关）：**

1. 浏览器预览 URL 加 `?zf_debug=1` 后刷新。
2. 控制台执行 `localStorage.setItem('zombie_frontline_debug','1')` 后刷新（清掉则关）。
3. 仅本地把 `FORCE_DEBUG_OVERLAY`（`assets/scripts/core/DebugFlags.ts`）改为 `true` 再编译；**不要把 true 提交进正式包**。

打开后控制台可用 `zfDumpAnalytics()` 导出 ANALYTICS 摘要。不要用引擎 `DEBUG` 宏当开关：Creator 预览里它几乎总是 true。

---

## 3. 素材待补清单

构建和公众平台都需要。仓库内是 **像素占位，可替换**，非正式终稿：

| 素材 | 规格参考 | 状态 |
|------|----------|------|
| 小游戏图标 | 通常 1024×1024 PNG | **占位可替换**：`assets/branding/icon_1024.png` |
| 启动页 / 加载图 | 按微信后台模板 | **占位可替换**：`assets/branding/splash_placeholder.png`（720×1280） |
| 审核截图 | 竖屏若干张：大厅、部署、战斗、结算 | 待补（Creator 实机截，勿用占位当审核图凑数） |
| 分享图 | `WxBridge.setupShareAppMessage` 的 `imageUrl` | **占位可替换**：`assets/branding/share_placeholder.png` |
| 商店简介图 | 微信后台 | 待补 |

像素局内精灵可过内测观感；**正式提审强烈建议至少替换图标、启动图、分享图与 4 张真实截图**。

---

## 4. 临时名与商标

正式名（临）：**尸潮防线**。英文目录名 `zombie-frontline`。

送审前请做一次 **粗查**：

- 国家知识产权局商标网：检索「尸潮防线」「尸潮」「Zombie Frontline」等近似。
- 微信小游戏名称占用：公众平台创建时即会校验重名。
- 若撞名，改 Lobby 标题与 `package.json` `displayName`，不要等到驳回。

本仓库作者未做法律检索，**粗查提醒不等于已清权**。

---

## 5. 验收门禁

### 代码已就绪（仓库内，Day21）

- [x] Boot → Lobby → Battle 跳转代码 + 压缩 class id（人测仍须你本机预览确认）
- [x] 大厅隐私政策 / 用户协议 Overlay
- [x] Debug / 性能叠层默认关；`?zf_debug=1` 可开；`zfDumpAnalytics()` 仅 Debug 下导出摘要
- [x] `AD_UNIT_IDS` 三槽为空走 Mock；取消/失败解除占用（`AdService.reset` / UI 回 Idle）
- [x] 像素 UI v1（建筑/敌人/据点/格子/大厅/结算面板）；品牌图为**占位**
- [x] `npx vitest run` / `tsc -p tsconfig.test.json --noEmit`（以当前 tip 为准）
- [x] 盲测记录表模板 `BLIND_TEST.md`（空表，不是已测）

### 人工待做（未完成，勿勾）

1. **Creator 预览 / 真机 L1 通关** — 见 `CREATOR_QA.md`。本 VM 未跑。
2. **填真实 AppID** — `builder.json` `wechatgame.appid` 与构建面板。
3. **填三个真实 adUnitId** — `revive` / `settle_double` / `wave_supply`。真机走完复活/双倍/补给；取消不卡死。Mock 不得作为正式审核包唯一路径。
4. **≥10 人盲测** — 用 `BLIND_TEST.md` 手填。对照 `ANALYTICS.md`。不改 Day10 数值。
5. **性能** — 真机高潮波 ~30fps。见 `PERFORMANCE.md`。开 Debug 叠层只为测量。
6. **商标/重名粗查** — 第 4 节步骤；本仓库不做法律结论。
7. **替换占位图标/启动图/分享图/审核截图** — `assets/branding/` 现为像素占位。
8. **微信公众平台隐私指引** — 与大厅协议一致，勿勾未使用权限。
9. **上传代码并提交审核**。

广告三坑代码侧 checklist（真机仍待做）：

- [x] 空 ID → Mock
- [x] 进行中重复请求被拒
- [x] Mock 失败率 1 → `ok: false`，UI 可再点（复活文案恢复、双倍回 Idle、补给可重试）
- [ ] 真广告取消 / 失败不卡死（真机）
- [ ] 真广告完成发奖（真机）

---

## 6. 已知限制（如实申报）

- 广告默认 Mock；未填 adUnitId 时不是正式变现。
- 局内为程序生成像素精灵；品牌图为占位，非正式美术终稿。
- 埋点仅内存 ring buffer + 控制台；`wx.reportAnalytics` 默认关。
- 本开发 VM 从未跑过 Creator 预览或微信真机。
- 无服务端、无登录；进度在本地存储，清缓存即丢。
- 弹体为即时命中，无飞行弹表现。
- 大厅已有隐私/协议 Overlay；微信公众平台隐私指引仍须人工勾选。

---

*Day21 提审代码收口（玩法仍为 Day14 冻包 / Day10 数值）*
