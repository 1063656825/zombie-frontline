# 本机构建：Creator → 微信开发者工具

本仓库 **AppID 与 adUnitId 故意留空**。不要填假号。本 VM 无 Creator，下列步骤在你 Mac 上做。

## 1. 打开工程

1. 安装 Cocos Creator **3.8.x**。
2. Dashboard → 添加 → 选本仓库根目录。
3. 首次打开会生成 `library/`。若曾用旧 UUID：完全退出后删 `library/`、`temp/` 再开。
4. 双击 `assets/scenes/Boot.scene` → 预览（F5）。约 1.5s 应进大厅。

## 2. 项目设置自检

| 项 | 位置 | 期望 |
|----|------|------|
| 设计分辨率 | `settings/v2/packages/project.json` → `general.designResolution` | **720×1280**，`fitHeight: true`，`fitWidth: false` |
| 启动场景 | 同上 `startSceneUuid` | `assets/scenes/Boot.scene` 的 meta uuid |
| 微信方向 | `settings/v2/packages/builder.json` → `wechatgame.orientation` | `portrait` |
| AppID | `builder.json` → `wechatgame.appid` **以及** 构建面板 | 现在是 `""`。提审前填**你的**小游戏 AppID |
| 广告 | `assets/scripts/ads/AdService.ts` → `AD_UNIT_IDS` | 三个 key 现为 `''`（Mock）。真机前填三个激励视频 adUnitId |

编辑器里也可对：项目 → 项目设置 → 项目数据（分辨率）、功能裁剪按默认即可。

## 3. 构建微信小游戏

1. 菜单 **项目 → 构建发布**。
2. 发布平台选 **微信小游戏**。
3. **AppID**：粘贴微信公众平台的小游戏 AppID（与 `builder.json` 一致）。空 AppID 只能用开发者工具游客/测试，**不能提审**。
4. 确认竖屏、设计分辨率 720×1280。
5. 构建。输出目录用 **微信开发者工具** 打开。
6. 开发者工具：详情 → 本地设置 → 调试期可勾选「不校验合法域名」。本包无服务端请求，正式提审前按微信要求配置。
7. 真机预览通过后：上传 → 提交审核。

## 4. 常见坑

- **Can not find class / Boot 卡加载**：删 `library/` `temp/`，确认场景脚本 `__type__` 是 23 位压缩 id。
- **预览只有当前 Boot、进不了大厅**：已用 Lobby SceneAsset + UUID 回退；仍失败则看 Console 是否脚本未编译。
- **左下角 FPS 叠层**：正式包默认关。要看性能加 `?zf_debug=1` 或见 `SUBMISSION.md`。
- **广告是空白延迟**：`AD_UNIT_IDS` 为空走 Mock，属预期。真机必须填真实 adUnitId。
- **测性能 / 导出埋点**：预览加 `?zf_debug=1`，控制台 `zfDumpAnalytics()`。正式包不要开。
- **构建选了横屏**：方向必须 portrait，否则审核/真机裁切。
- **填了测试 AppID/测试广告位进正式包**：容易被拒。正式包只用正式号。

## 5. 本地命令（不代替 Creator 预览）

```bash
npx vitest run
npx tsc -p tsconfig.test.json --noEmit
```
