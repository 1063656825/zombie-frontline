# Creator / 微信开发者工具验收清单

汇总 Day1–13 需在 **Cocos Creator 3.8+** 或微信开发者工具勾选的项。  
VM 无 Creator：**下列全部仍须人工**。单元测试见仓库 `npx vitest run`，不能替代本表。

冻包：v0 / Day14。数值以 Day10 / `BALANCE.md` 为准，本表不改数值。

---

## 0. 环境

- [ ] Creator 3.8.x 打开仓库根目录，无报错生成 `library/`
- [ ] `settings/v2/packages/project.json` 设计分辨率 720×1280、fitHeight
- [ ] 启动场景为 `assets/scenes/Boot.scene`
- [ ] 预览竖屏，画布不被横向裁切到无法点按钮

---

## 1. 场景流（Day1）

- [ ] `Boot.scene` 约 1.5s 自动进 `Lobby`
- [ ] Lobby 点「开始战斗」进 `Battle`
- [ ] Battle 顶部状态：快速落子 → 微调确认 → 战斗中
- [ ] 倒计时：DeployFast 约 8s（W0 教学 6s），DeployTune 约 4s（L2 微调更短）
- [ ] 点「开战」可跳过剩余部署时间

---

## 2. 部署落子（Day2）

- [ ] 底部三按钮：机枪 2DP / 炮轰 3DP / 地雷 1DP
- [ ] 选中黄框，点绿色格落下 L1 色块，DP 扣除
- [ ] DP 不足按钮灰、点了无落子
- [ ] Combat / WaveClear / Settle：按钮灰、点格子无落子

---

## 3. 战斗（Day3）

- [ ] 敌人左右路从上往下走，到达据点扣 HP
- [ ] 机枪单体开火、炮轰 AOE、地雷踩踏后消失
- [ ] Combat 点屏/拖动，黄色朝向线，扇形内主角开火
- [ ] 清波后进入下一波部署并给 DP

---

## 4. 胜负 / 复活 / 结算（Day4）

- [ ] L1 打完 W5 出胜利面板，基础残骸入账（L1=30，L2=45）
- [ ] HP≤0 出复活面板；看完 Mock/真广告后 50% HP 重打当前波，建筑保留
- [ ] 本关第二次 HP≤0 不再复活，失败结算（约 30% 残骸）
- [ ] 「放弃」进失败结算；确认回 Lobby

---

## 5. 合成与引导（Day5）

- [ ] 仅部署窗：两座同种 L1 拖到一起 → L2（更深/更大），不扣 DP
- [ ] L2 不可再合；异种不合；Combat 中拖拽取消
- [ ] 首次落子 / 首次可合成 / 首次战斗触摸气泡，3s 消失且不挡操作
- [ ] 胜利「看视频双倍」：Mock 后残骸翻倍，不可领第二次；失败无双倍按钮

---

## 6. 三线成长（Day6）

- [ ] Lobby 火力 / 城防 / 补给三行，残骸不足灰显
- [ ] 升级扣残骸、刷新等级，杀进程再开会保留（`MetaData`）
- [ ] 火力升级后战斗伤害日志带加成；城防升 HP；补给影响开局 DP / 波次 DP

---

## 7. 广告三坑与微信桩（Day7）

- [ ] ① 复活：文案「看完视频，站起来再打一波」；本关仅一次
- [ ] ② 双倍：仅胜利；领完变「已领取双倍」
- [ ] ③ 补给：部署窗且 DP&lt;3 出现「紧急空投」；本局一次 +3 DP
- [ ] DP≥3 或战斗中或已用过：补给按钮隐藏
- [ ] 城防 Lv.3 无减伤，Lv.4 受击约 -3%（日志 `[Combat] 城防减伤`）
- [ ] 非微信环境：`[WxBridge] 非微信环境`，分享不崩
- [ ] **提审包**：`AdService.ts` `AD_UNIT_IDS` 已填，真机出微信激励视频（见 `SUBMISSION.md`）

---

## 8. 手感（Day8）

- [ ] 敌人受击闪白约 0.1s；据点受击偏红
- [ ] 击退：Z1 可见、Z3 明显更短
- [ ] 炮轰橙色扩散圈、地雷紫色圈，约 0.3s 淡出
- [ ] 控制台 `[AudioService] 播放音效:`，shoot / enemy_hit 不刷屏

---

## 9. 第二关（Day9）

- [ ] Lobby L1 可选；L2 未通关 L1 时锁定
- [ ] 通关 L1 后 L2 解锁，刷新仍解锁
- [ ] L2：W0 有 Z2，W2 有 Z3，微调时间短于 L1
- [ ] 失败：震动 + 红闪；文案「据点沦陷」+ 坚持波次
- [ ] 控制台 `MetaData.debugUnlockAllLevels()` 可解锁（调试，正式包勿教玩家）

---

## 10. 平衡抽检（Day10，数值已锁）

对照 `BALANCE.md`，不要顺手改表：

- [ ] L1 W3 发放 4 DP；L2 W0 发放 3 DP
- [ ] 机枪能处理早期 Z2；炮轰对 Z3 有意义
- [ ] 不在 QA 中改 `BuildingConfig` / `WaveConfig`

---

## 11. UI 波兰（Day11）

- [ ] DeployFast：绿色条「快速落子」；最后 2s 变红「即将开战!」
- [ ] DeployTune：黄色「微调确认」；Combat 隐藏该条
- [ ] Combat：偏左/偏右来怪时侧向警告；Settle 隐藏

---

## 12. 埋点（Day12）

控制台应出现 `[Analytics] ...`（详见 `ANALYTICS.md`）：

- [ ] 进战斗：`run_start`；开波：`wave_start`；清波：`wave_clear`
- [ ] 合成拖拽：`merge_attempt` / 成功：`merge_success`
- [ ] HP=0：`wave_fail`；复活面板：`ad_show {slot:"revive"}`
- [ ] 胜利：`ad_show {slot:"settle_double"}`；DP&lt;3：`ad_show {slot:"wave_supply"}`
- [ ] 结束：`run_end`（含 `won` / `duration_ms` / `merge_count`）

盲测时用这些事件填 `SUBMISSION.md` 验证指标表。

---

## 13. 性能（Day13）

- [ ] Hierarchy：击杀后敌人节点隐藏复用，不是反复销毁新建
- [ ] 爆炸圈数量有上限
- [ ] 清波 / 回大厅：`[Combat] 已清空所有战斗实体（池归还）`，无残留怪/VFX
- [ ] Profiler：L2 高潮波尽量 ~30fps（真机为准，见 `PERFORMANCE.md`）

---

## 14. 提审前总闸（Day14）

- [ ] `CREATOR_QA.md` 第 1–13 节与本机相关的项已勾
- [ ] `SUBMISSION.md` 门禁：L1 通关、真机三坑广告、≥10 人盲测指标
- [ ] 图标 / 启动图 / 截图已备（或接受占位被拒风险）
- [ ] 隐私政策 URL 已配；无 IAP 声明属实
- [ ] `builder.json` AppID 已填；广告位 ID 非空
- [ ] 名称「尸潮防线」已做商标/重名粗查
- [ ] 正式包关闭或藏起 Debug 跳波等调试入口

---

## 本地命令（不替代本表）

```bash
npx vitest run
npx tsc -p tsconfig.test.json --noEmit
```
