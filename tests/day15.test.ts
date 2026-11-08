/**
 * Day15 提审前收口：协议文案、Lobby 入口、Debug 默认关、广告 Mock
 * 运行: npx vitest run tests/day15.test.ts
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
    LOBBY_LEGAL_ENTRIES,
    PRIVACY_POLICY_BODY,
    USER_AGREEMENT_BODY,
    PRIVACY_POLICY_TITLE,
    USER_AGREEMENT_TITLE,
    STORAGE_KEY_META_CURRENT,
    STORAGE_KEY_META_LEGACY,
    STORAGE_KEY_SAVE_LEGACY,
    getLegalDoc
} from '../assets/scripts/core/LegalContent';
import {
    FORCE_DEBUG_OVERLAY,
    DEBUG_STORAGE_KEY,
    DEBUG_QUERY_FLAG,
    isDebugOverlayEnabled,
    hrefRequestsDebug
} from '../assets/scripts/core/DebugFlags';
import { AD_UNIT_IDS, AdSlot, AD_SLOT_FILL_GUIDE, isAdConfigMock } from '../assets/scripts/ads/AdService';
import { compressUuid } from './cocos-uuid';

function src(rel: string): string {
    return readFileSync(resolve(__dirname, '..', rel), 'utf8');
}

describe('协议文案与实际存储一致', () => {
    it('Lobby 两个合规入口标签', () => {
        expect(LOBBY_LEGAL_ENTRIES.map((e) => e.label)).toEqual(['隐私政策', '用户协议']);
        expect(PRIVACY_POLICY_TITLE).toBe('隐私政策');
        expect(USER_AGREEMENT_TITLE).toBe('用户协议');
        expect(getLegalDoc('privacy').body.length).toBeGreaterThan(200);
        expect(getLegalDoc('terms').body.length).toBeGreaterThan(200);
    });
    
    it('隐私政策写明 localStorage / wx.setStorageSync 与真实键', () => {
        expect(PRIVACY_POLICY_BODY).toMatch(/localStorage/);
        expect(PRIVACY_POLICY_BODY).toMatch(/wx\.setStorageSync/);
        expect(PRIVACY_POLICY_BODY).toContain(STORAGE_KEY_META_LEGACY);
        expect(PRIVACY_POLICY_BODY).toContain(STORAGE_KEY_SAVE_LEGACY);
        expect(PRIVACY_POLICY_BODY).toContain(STORAGE_KEY_META_CURRENT);
        expect(STORAGE_KEY_META_LEGACY).toBe('zombie_frontline_meta_v1');
        expect(STORAGE_KEY_SAVE_LEGACY).toBe('zombie_frontline_save');
        expect(STORAGE_KEY_META_CURRENT).toBe('zombie_frontline_meta_v2');
        expect(src('assets/scripts/data/MetaData.ts')).toContain(`'${STORAGE_KEY_META_CURRENT}'`);
        expect(src('assets/scripts/data/MetaData.ts')).toContain(`'${STORAGE_KEY_META_LEGACY}'`);
        expect(src('assets/scripts/data/GameData.ts')).toContain(`'${STORAGE_KEY_SAVE_LEGACY}'`);
    });
    
    it('声明无账号、未使用定位/相册/通讯录、激励视频走微信 SDK', () => {
        expect(PRIVACY_POLICY_BODY).toMatch(/没有账号|无账号/);
        expect(PRIVACY_POLICY_BODY).toMatch(/定位/);
        expect(PRIVACY_POLICY_BODY).toMatch(/相册/);
        expect(PRIVACY_POLICY_BODY).toMatch(/通讯录/);
        expect(PRIVACY_POLICY_BODY).toMatch(/createRewardedVideoAd|微信广告 SDK/);
        expect(PRIVACY_POLICY_BODY).not.toMatch(/我们会读取通讯录/);
    });
    
    it('用户协议声明纯 IAA、无支付/商城', () => {
        expect(USER_AGREEMENT_BODY).toMatch(/IAA|激励视频/);
        expect(USER_AGREEMENT_BODY).toMatch(/没有支付|无支付/);
        expect(USER_AGREEMENT_BODY).toMatch(/商城/);
        expect(USER_AGREEMENT_BODY).toContain(STORAGE_KEY_META_LEGACY);
        expect(USER_AGREEMENT_BODY).toContain(STORAGE_KEY_SAVE_LEGACY);
    });
});

describe('Lobby 入口可达', () => {
    it('LobbyScene 引用合规入口并创建按钮', () => {
        const lobby = src('assets/scripts/core/LobbyScene.ts');
        expect(lobby).toContain('LOBBY_LEGAL_ENTRIES');
        expect(lobby).toContain('createLegalEntries');
        expect(lobby).toContain('LegalOverlay');
        expect(lobby).toContain('隐私政策');
        expect(src('assets/scripts/ui/LegalOverlay.ts')).toContain('返回');
    });
});

describe('Debug 正式包默认关', () => {
    it('FORCE_DEBUG_OVERLAY 为 false', () => {
        expect(FORCE_DEBUG_OVERLAY).toBe(false);
    });
    
    it('无 URL / 无存储时关闭', () => {
        expect(isDebugOverlayEnabled()).toBe(false);
        expect(isDebugOverlayEnabled({ href: 'http://127.0.0.1:7456/', storageGet: () => null })).toBe(false);
    });
    
    it('?zf_debug=1 或存储键可打开', () => {
        expect(DEBUG_QUERY_FLAG).toBe('zf_debug');
        expect(hrefRequestsDebug('http://localhost:7456/?zf_debug=1')).toBe(true);
        expect(isDebugOverlayEnabled({ href: 'http://localhost:7456/?zf_debug=1' })).toBe(true);
        expect(isDebugOverlayEnabled({
            href: '',
            storageGet: (k) => (k === DEBUG_STORAGE_KEY ? '1' : null)
        })).toBe(true);
        expect(isDebugOverlayEnabled({ force: true })).toBe(true);
    });
    
    it('Boot / Battle / Lobby 会应用叠层策略；DebugPanel 默认藏', () => {
        expect(src('assets/scripts/core/BootScene.ts')).toContain('applyDebugOverlayPolicy');
        expect(src('assets/scripts/core/LobbyScene.ts')).toContain('applyDebugOverlayPolicy');
        expect(src('assets/scripts/core/BattleScene.ts')).toContain('applyDebugOverlayPolicy');
        expect(src('assets/scripts/ui/DebugPanel.ts')).toContain('isDebugOverlayEnabled');
        expect(src('assets/scripts/ui/DebugPanel.ts')).toContain('this.node.active = false');
    });
});

describe('广告配置仍 Mock', () => {
    it('三个 adUnitId 为空且 isAdConfigMock', () => {
        expect(AD_UNIT_IDS[AdSlot.Revive]).toBe('');
        expect(AD_UNIT_IDS[AdSlot.SettleDouble]).toBe('');
        expect(AD_UNIT_IDS[AdSlot.WaveSupply]).toBe('');
        expect(isAdConfigMock()).toBe(true);
        expect(AD_SLOT_FILL_GUIDE.map((g) => g.wechatKey)).toEqual([
            'revive',
            'settle_double',
            'wave_supply'
        ]);
    });
    
    it('未编造假广告 ID', () => {
        const ids = Object.values(AD_UNIT_IDS).join('');
        expect(ids).toBe('');
        expect(src('assets/scripts/ads/AdService.ts')).not.toMatch(/adunit-[\w]+/i);
    });
});

describe('场景 class id 仍为压缩 UUID', () => {
    it('Boot.scene BootScene __type__ 23 位，_children 只有 Node', () => {
        const boot = JSON.parse(src('assets/scenes/Boot.scene')) as Array<Record<string, unknown>>;
        const meta = JSON.parse(src('assets/scripts/core/BootScene.ts.meta')) as { uuid: string };
        const classId = compressUuid(meta.uuid);
        expect(classId).toHaveLength(23);
        expect(boot.some((o) => o.__type__ === classId)).toBe(true);
        expect(boot.some((o) => o.__type__ === meta.uuid)).toBe(false);
        const scene = boot.find((o) => o.__type__ === 'cc.Scene') as { _children: Array<{ __id__: number }> };
        for (const c of scene._children) {
            expect(boot[c.__id__].__type__).toBe('cc.Node');
        }
    });
});
