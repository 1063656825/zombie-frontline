/**
 * Day21：像素 UI、广告失败回退、Debug 摘要、占位品牌图、Day10 锁表
 * 运行: npx vitest run tests/day21.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { PIXEL_SPRITES } from '../assets/scripts/pixel/PixelMaps';
import { spriteRgba, spriteSize, opaquePixelCount } from '../assets/scripts/pixel/PixelDecode';
import {
    AD_UNIT_IDS,
    AdSlot,
    AdService,
    AdState,
    isAdConfigMock
} from '../assets/scripts/ads/AdService';
import { Analytics } from '../assets/scripts/analytics/Analytics';
import { FORCE_DEBUG_OVERLAY } from '../assets/scripts/core/DebugFlags';
import { BUILDING_CONFIGS } from '../assets/scripts/battle/BuildingConfig';
import { L1_WAVE_CONFIGS, L2_WAVE_CONFIGS, ENEMY_STATS, EnemyType, LevelId } from '../assets/scripts/battle/WaveConfig';
import { compressUuid } from './cocos-uuid';

const ROOT = resolve(__dirname, '..');

function src(rel: string): string {
    return readFileSync(resolve(ROOT, rel), 'utf8');
}

function pngSize(rel: string): { w: number; h: number } {
    const buf = readFileSync(resolve(ROOT, rel));
    expect(buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(true);
    return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

function fingerprint(name: string): string {
    const { data } = spriteRgba(name);
    let h = 2166136261;
    for (let i = 0; i < data.length; i++) {
        h ^= data[i];
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
}

function uniqueOpaqueColors(name: string): number {
    const { data } = spriteRgba(name);
    const set = new Set<string>();
    for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) {
            continue;
        }
        set.add(`${data[i]},${data[i + 1]},${data[i + 2]}`);
    }
    return set.size;
}

const COMBAT_SPRITES = [
    'mg_l1', 'mg_l2', 'cannon_l1', 'cannon_l2', 'mine',
    'z1', 'z2', 'z3', 'base', 'cell_ok', 'cell_no'
];

describe('像素精灵可区分、不是单色圆点', () => {
    it('11 张战斗精灵都在 PIXEL_SPRITES 与 textures/pixel', () => {
        expect(Object.keys(PIXEL_SPRITES).sort()).toEqual([...COMBAT_SPRITES].sort());
        for (const name of COMBAT_SPRITES) {
            expect(readFileSync(resolve(ROOT, `assets/textures/pixel/${name}.png`)).length).toBeGreaterThan(80);
        }
    });

    it('L1/L2 与 Z 类型指纹不同，不透明像素足够多', () => {
        const fps = COMBAT_SPRITES.map(fingerprint);
        expect(new Set(fps).size).toBe(COMBAT_SPRITES.length);
        expect(spriteSize('mg_l2').w).toBeGreaterThan(spriteSize('mg_l1').w);
        expect(spriteSize('cannon_l2').w).toBeGreaterThanOrEqual(spriteSize('cannon_l1').w);
        for (const name of ['mg_l1', 'mg_l2', 'cannon_l1', 'cannon_l2', 'mine', 'z1', 'z2', 'z3', 'base']) {
            expect(opaquePixelCount(name)).toBeGreaterThan(20);
            expect(uniqueOpaqueColors(name)).toBeGreaterThanOrEqual(3);
        }
        expect(uniqueOpaqueColors('cell_ok')).toBeGreaterThanOrEqual(2);
        expect(uniqueOpaqueColors('cell_no')).toBeGreaterThanOrEqual(2);
    });

    it('对象池 restyle 仍换皮肤；Blit 用 NEAREST', () => {
        const ph = src('assets/scripts/ui/PlaceholderGraphics.ts');
        expect(ph).toContain('applyPixelSprite');
        expect(ph).toContain("return 'z2'");
        expect(ph).toContain("return 'z3'");
        expect(ph).toContain('restyleEnemy');
        expect(src('assets/scripts/battle/Combat.ts')).toContain('PlaceholderGraphics.restyleEnemy');
        expect(src('assets/scripts/pixel/PixelBlit.ts')).toContain('Texture2D.Filter.NEAREST');
        expect(src('assets/scripts/battle/GridBuild.ts')).toContain('blitPixelTile');
        expect(src('assets/scripts/battle/GridBuild.ts')).toContain("'cell_ok'");
        expect(src('assets/scripts/core/BattleScene.ts')).toContain("applyPixelSprite(this.baseNode, 'base'");
    });

    it('大厅 / Boot / 结算面板走像素框', () => {
        expect(src('assets/scripts/core/LobbyScene.ts')).toContain('drawPixelPanel');
        expect(src('assets/scripts/core/LobbyScene.ts')).toContain('styleLobbyChrome');
        expect(src('assets/scripts/core/BootScene.ts')).toContain('drawPixelBar');
        expect(src('assets/scripts/core/BootScene.ts')).toContain('v0.21.0');
        expect(src('assets/scripts/ui/SettlePanel.ts')).toContain('drawPixelPanel');
        expect(src('assets/scripts/ui/RevivePanel.ts')).toContain('drawPixelPanel');
        expect(src('assets/scripts/ui/SupplyButton.ts')).toContain('drawPixelPanel');
        expect(src('assets/scripts/ui/LegalOverlay.ts')).toContain('drawPixelPanel');
        expect(src('assets/scripts/ui/BuildingPanel.ts')).toContain('drawPixelPanel');
    });
});

describe('品牌占位图', () => {
    it('图标 1024、分享图、启动图尺寸正确', () => {
        expect(pngSize('assets/branding/icon_1024.png')).toEqual({ w: 1024, h: 1024 });
        expect(pngSize('assets/branding/share_placeholder.png')).toEqual({ w: 640, h: 512 });
        expect(pngSize('assets/branding/splash_placeholder.png')).toEqual({ w: 720, h: 1280 });
    });

    it('SUBMISSION 标明占位可替换', () => {
        const sub = src('SUBMISSION.md');
        expect(sub).toContain('占位可替换');
        expect(sub).toContain('assets/branding/icon_1024.png');
        expect(src('BLIND_TEST.md')).toContain('尚未进行盲测');
    });
});

describe('广告失败不卡死', () => {
    beforeEach(() => {
        AdService.reset();
        AdService.setMockFailRate(0);
        AdService.setMockDelay(8);
        AdService.setForceMock(true);
    });

    afterEach(() => {
        AdService.reset();
        AdService.setMockFailRate(0);
        AdService.setMockDelay(0);
        AdService.setForceMock(false);
    });

    it('AD_UNIT_IDS 仍全空 Mock，未编造 ID', () => {
        expect(AD_UNIT_IDS[AdSlot.Revive]).toBe('');
        expect(AD_UNIT_IDS[AdSlot.SettleDouble]).toBe('');
        expect(AD_UNIT_IDS[AdSlot.WaveSupply]).toBe('');
        expect(isAdConfigMock()).toBe(true);
        expect(Object.values(AD_UNIT_IDS).join('')).toBe('');
        expect(src('assets/scripts/ads/AdService.ts')).not.toMatch(/adunit-[\w]+/i);
        expect(JSON.parse(src('settings/v2/packages/builder.json')).wechatgame.appid).toBe('');
    });

    it('失败后 isLoading 解除，可重试成功', async () => {
        AdService.setMockFailRate(1);
        const fail = await AdService.showRewarded(AdSlot.Revive);
        expect(fail.ok).toBe(false);
        expect(AdService.isLoading).toBe(false);
        expect(AdService.state).toBe(AdState.Failed);
        AdService.reset();
        AdService.setMockFailRate(0);
        const ok = await AdService.showRewarded(AdSlot.Revive);
        expect(ok.ok).toBe(true);
        expect(AdService.isLoading).toBe(false);
    });

    it('进行中的重复请求被拒，结束后可再点', async () => {
        const first = AdService.showRewarded(AdSlot.SettleDouble);
        const dup = await AdService.showRewarded(AdSlot.WaveSupply);
        expect(dup.ok).toBe(false);
        expect(dup.reason).toBe('error');
        const result = await first;
        expect(result.ok).toBe(true);
        const again = await AdService.showRewarded(AdSlot.WaveSupply);
        expect(again.ok).toBe(true);
    });

    it('UI 失败路径回 Idle / 恢复文案并 reset', () => {
        const settle = src('assets/scripts/ui/SettlePanel.ts');
        expect(settle).toContain('DoubleRewardState.Idle');
        expect(settle).toContain('广告失败/取消，可重试');
        expect(settle).toContain('AdService.reset()');
        expect(src('assets/scripts/ui/RevivePanel.ts')).toContain('AdService.reset()');
        expect(src('assets/scripts/ui/RevivePanel.ts')).toContain('看完视频，站起来再打一波');
        expect(src('assets/scripts/ui/SupplyButton.ts')).toContain('AdService.reset()');
        expect(src('assets/scripts/ads/AdService.ts')).toContain('finally');
    });
});

describe('ANALYTICS dump 仅 Debug', () => {
    beforeEach(() => {
        Analytics.resetSession();
    });

    it('FORCE_DEBUG_OVERLAY 为 false；无 Debug 时 dump 为 null', () => {
        expect(FORCE_DEBUG_OVERLAY).toBe(false);
        Analytics.trackRunStart(LevelId.L1);
        expect(Analytics.dumpSessionSummary()).toBeNull();
        const text = Analytics.dumpSessionSummary({ force: true });
        expect(text).toContain('Analytics Session Summary');
        expect(text).toContain('Runs: 1');
        expect(src('assets/scripts/core/DebugOverlay.ts')).toContain('zfDumpAnalytics');
        expect(src('assets/scripts/ui/DebugPanel.ts')).toContain('this.node.active = false');
    });
});

describe('Day10 数值未改、版本 Day21', () => {
    it('建筑费用 / DPS / 波次与 Day10 一致', () => {
        expect(BUILDING_CONFIGS.MachineGun_L1.dpCost).toBe(2);
        expect(BUILDING_CONFIGS.MachineGun_L1.dps).toBe(7);
        expect(BUILDING_CONFIGS.Cannon_L1.dpCost).toBe(3);
        expect(BUILDING_CONFIGS.Mine_L1.dpCost).toBe(1);
        expect(BUILDING_CONFIGS.Mine_L1.triggerDamage).toBe(28);
        expect(L1_WAVE_CONFIGS[0].dpGrant).toBe(3);
        expect(L1_WAVE_CONFIGS[0].enemies[0].count).toBe(6);
        expect(L1_WAVE_CONFIGS[5].enemies.find((e) => e.type === EnemyType.Z3_Tank)?.count).toBe(4);
        expect(L2_WAVE_CONFIGS[5].enemies.find((e) => e.type === EnemyType.Z3_Tank)?.count).toBe(5);
        expect(ENEMY_STATS[EnemyType.Z1_Walker].hp).toBe(10);
        expect(ENEMY_STATS[EnemyType.Z2_Runner].speed).toBe(1.7);
        expect(ENEMY_STATS[EnemyType.Z3_Tank].hp).toBe(50);
    });

    it('VERSION / package / Boot 为 0.21.0', () => {
        expect(src('VERSION')).toContain('0.21.0-v0-day21');
        expect(src('VERSION')).toContain('Day21');
        expect(JSON.parse(src('package.json')).version).toBe('0.21.0');
        const boot = JSON.parse(src('assets/scenes/Boot.scene')) as Array<Record<string, unknown>>;
        expect(boot.some((o) => o._string === 'v0.21.0')).toBe(true);
    });
});

describe('场景 UUID 约定仍成立', () => {
    it('三场景脚本 __type__ 为 23 位压缩 id，_children 只有 Node', () => {
        const scenes = [
            ['assets/scenes/Boot.scene', 'assets/scripts/core/BootScene.ts.meta'],
            ['assets/scenes/Lobby.scene', 'assets/scripts/core/LobbyScene.ts.meta'],
            ['assets/scenes/Battle.scene', 'assets/scripts/core/BattleScene.ts.meta']
        ] as const;
        for (const [sceneRel, metaRel] of scenes) {
            const scene = JSON.parse(src(sceneRel)) as Array<Record<string, unknown>>;
            const meta = JSON.parse(src(metaRel)) as { uuid: string };
            const classId = compressUuid(meta.uuid);
            expect(classId).toHaveLength(23);
            expect(scene.some((o) => o.__type__ === classId)).toBe(true);
            expect(scene.some((o) => o.__type__ === meta.uuid)).toBe(false);
            const root = scene.find((o) => o.__type__ === 'cc.Scene') as { _children: Array<{ __id__: number }> };
            for (const c of root._children) {
                expect(scene[c.__id__].__type__).toBe('cc.Node');
            }
        }
    });

    it('像素脚本 .meta 为 v4 UUID', () => {
        const metas = [
            'assets/scripts/pixel.meta',
            'assets/scripts/pixel/PixelMaps.ts.meta',
            'assets/scripts/pixel/PixelDecode.ts.meta',
            'assets/scripts/pixel/PixelBlit.ts.meta',
            'assets/scripts/pixel/PixelChrome.ts.meta'
        ];
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        for (const rel of metas) {
            const meta = JSON.parse(src(rel)) as { uuid: string; ver: string };
            expect(meta.uuid).toMatch(uuidRe);
        }
        const pngMetas = readdirSync(resolve(ROOT, 'assets/textures/pixel')).filter((f) => f.endsWith('.png.meta'));
        expect(pngMetas.length).toBe(COMBAT_SPRITES.length);
        for (const f of pngMetas) {
            const meta = JSON.parse(src(`assets/textures/pixel/${f}`)) as { uuid: string };
            expect(meta.uuid).toMatch(uuidRe);
        }
    });
});
