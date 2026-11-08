/**
 * LegalContent.ts
 * 隐私政策 / 用户协议正文（无 Cocos 依赖，可供 vitest 直接断言）
 *
 * 存储键必须与 MetaData / GameData 实际读写一致。
 */

export type LegalDocId = 'privacy' | 'terms';

export const LOBBY_LEGAL_ENTRIES: ReadonlyArray<{ id: LegalDocId; label: string }> = [
    { id: 'privacy', label: '隐私政策' },
    { id: 'terms', label: '用户协议' }
];

/** 当前成长档（MetaData.SAVE_KEY） */
export const STORAGE_KEY_META_CURRENT = 'zombie_frontline_meta_v2';
/** 历史成长档，读到后迁移并删除 */
export const STORAGE_KEY_META_LEGACY = 'zombie_frontline_meta_v1';
/** GameData 局内进度历史键 */
export const STORAGE_KEY_SAVE_LEGACY = 'zombie_frontline_save';

export const PRIVACY_POLICY_TITLE = '隐私政策';
export const USER_AGREEMENT_TITLE = '用户协议';

export const PRIVACY_POLICY_BODY = `生效说明
本《隐私政策》说明「尸潮防线」如何处理与本小游戏相关的信息。我们没有账号系统，不要求注册或登录。

一、我们不收集的信息
本游戏不申请、不使用定位、相册、摄像头、麦克风、通讯录、日历、蓝牙等与玩法无关的系统权限。请勿在微信公众平台「用户隐私保护指引」中勾选上述未使用权限。

二、本地存储（仅本机）
成长进度与关卡解锁保存在本机，通过微信 wx.setStorageSync 或浏览器 localStorage 读写，不上传服务器。

当前键：
· ${STORAGE_KEY_META_CURRENT}：三线成长（火力 / 城防 / 补给）、残骸、已解锁关卡。
历史键（仍可能读到，读后迁到当前键）：
· ${STORAGE_KEY_META_LEGACY}：旧版成长档。
· ${STORAGE_KEY_SAVE_LEGACY}：旧版局内进度。

清除微信缓存或卸载小游戏会导致上述本地数据丢失，无法恢复。我们无法在其它设备同步你的进度。

三、广告
变现方式为激励视频（IAA）。激励视频由微信广告 SDK（wx.createRewardedVideoAd）提供与展示。广告素材与投放由微信平台处理；本游戏只在你主动点击复活、结算双倍、波间补给时请求播放。广告单元 ID 由运营在提审前填入，空置时仅走本地 Mock，不会向微信请求广告。

四、无支付 / 无商城
本游戏没有内购、支付、充值、钻石商城或米大师入口。残骸只能通过通关结算及自愿观看激励视频获得。

五、日志
开发期可能在控制台输出玩法日志与埋点摘要，默认不向微信 reportAnalytics。这些日志不包含真实姓名、手机号或身份证。

六、未成年人
建议 12 岁以上游玩。请监护人关注游戏时间。

如对本政策有疑问，请通过微信小游戏后台留言联系开发者。`;

export const USER_AGREEMENT_BODY = `许可
在遵守本协议与微信小游戏平台规范的前提下，我们许可你免费游玩「尸潮防线」。本游戏以娱乐为目的，不构成任何收益承诺。

一、纯 IAA，无支付 / 商城
本游戏是纯广告变现（激励视频），没有支付、充值、商城、抽卡付费或任何强制看广告才能继续主线的设计。复活、结算双倍、波间补给均为可选。拒绝观看广告不会删除存档。

二、本地进度
三线升级与关卡解锁仅保存在本机（见《隐私政策》中的存储键 ${STORAGE_KEY_META_CURRENT}、历史 ${STORAGE_KEY_META_LEGACY} 与 ${STORAGE_KEY_SAVE_LEGACY}）。无账号、无云存档。换机或清缓存即视为新进度。

三、公平与作弊
禁止使用外挂、内存修改或破坏匹配公平的方式。我们可能在发现异常时重置本地档或拒绝服务。

四、内容与适龄
题材为末日丧尸轻塔防，当前为色块占位表现，无写实血腥。不适合过小儿童。

五、广告与第三方
激励视频由微信 SDK 提供。观看广告即表示你同时受微信广告相关规范约束。

六、变更
我们可能更新本协议；更新后请在大厅再次阅读。继续游玩视为接受更新。

七、返回游戏
点「返回」关闭本页即可继续。开始战斗入口仍在大厅，本页不阻挡对局。`;

export function getLegalDoc(id: LegalDocId): { title: string; body: string } {
    if (id === 'privacy') {
        return { title: PRIVACY_POLICY_TITLE, body: PRIVACY_POLICY_BODY };
    }
    return { title: USER_AGREEMENT_TITLE, body: USER_AGREEMENT_BODY };
}
