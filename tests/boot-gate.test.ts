/**
 * Boot → Lobby 跳转闸门 + Creator 3.8.6 脚本 class id
 * 运行: npx vitest run tests/boot-gate.test.ts
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
    MIN_BOOT_TIME,
    SCENE_NAME_LOBBY,
    LOBBY_SCENE_UUID,
    BATTLE_SCENE_UUID,
    shouldJumpFromBoot,
    shouldFallbackToUuid,
    launchedCallbackHasError
} from '../assets/scripts/core/BootGate';
import { compressUuid, decompressUuid } from './cocos-uuid';

function readJson(rel: string) {
    return JSON.parse(readFileSync(resolve(__dirname, '..', rel), 'utf8'));
}

function metaUuid(rel: string): string {
    return readJson(rel).uuid as string;
}

describe('shouldJumpFromBoot', () => {
    it('未就绪不跳', () => {
        expect(shouldJumpFromBoot(false, false, 10)).toBe(false);
    });
    
    it('已发起过不跳（单次）', () => {
        expect(shouldJumpFromBoot(true, true, 10)).toBe(false);
    });
    
    it('未到最小时长不跳', () => {
        expect(shouldJumpFromBoot(true, false, 1.49)).toBe(false);
        expect(shouldJumpFromBoot(true, false, 0)).toBe(false);
    });
    
    it('就绪且满 1.5s 且未跳过则跳一次', () => {
        expect(shouldJumpFromBoot(true, false, MIN_BOOT_TIME)).toBe(true);
        expect(shouldJumpFromBoot(true, false, 2)).toBe(true);
    });
    
    it('模拟每帧：跳过之后保持 false', () => {
        let jumped = false;
        let t = 0;
        let fireCount = 0;
        for (let i = 0; i < 120; i++) {
            t += 0.016;
            if (shouldJumpFromBoot(true, jumped, t)) {
                jumped = true;
                fireCount++;
            }
        }
        expect(fireCount).toBe(1);
        expect(t).toBeGreaterThan(MIN_BOOT_TIME);
    });
});

describe('Lobby 场景名', () => {
    it('与 SceneManager / 文件名一致', () => {
        expect(SCENE_NAME_LOBBY).toBe('Lobby');
    });
    
    it('Lobby / Battle UUID 与 *.scene.meta 一致', () => {
        expect(LOBBY_SCENE_UUID).toBe(metaUuid('assets/scenes/Lobby.scene.meta'));
        expect(BATTLE_SCENE_UUID).toBe(metaUuid('assets/scenes/Battle.scene.meta'));
    });
});

describe('shouldFallbackToUuid（3.8.6 loadScene）', () => {
    it('loadScene 返回 false 立刻回退（预览当前场景缺 name 表）', () => {
        expect(shouldFallbackToUuid(false, false)).toBe(true);
    });
    
    it('loadScene 返回 true 且 onLaunched 无错则不回退', () => {
        expect(shouldFallbackToUuid(true, false)).toBe(false);
    });
    
    it('onLaunched 报错则回退', () => {
        expect(shouldFallbackToUuid(true, true)).toBe(true);
        expect(shouldFallbackToUuid(undefined, true)).toBe(true);
    });
    
    it('返回值未知且无错则先等 onLaunched', () => {
        expect(shouldFallbackToUuid(undefined, false)).toBe(false);
    });
});

describe('launchedCallbackHasError', () => {
    it('null / undefined / false 不是错误', () => {
        expect(launchedCallbackHasError(null)).toBe(false);
        expect(launchedCallbackHasError(undefined)).toBe(false);
        expect(launchedCallbackHasError(false)).toBe(false);
    });
    
    it('Error 或带 message 的对象是错误', () => {
        expect(launchedCallbackHasError(new Error('missing scene'))).toBe(true);
        expect(launchedCallbackHasError({ message: 'fail' })).toBe(true);
        expect(launchedCallbackHasError('scene not in build')).toBe(true);
    });
    
    it('Scene 对象不是错误（避免把 onLaunched(scene) 误当失败）', () => {
        expect(launchedCallbackHasError({ _objFlags: 0, name: 'Lobby' })).toBe(false);
        expect(launchedCallbackHasError({ scene: { name: 'Lobby' } })).toBe(false);
    });
});

describe('Creator 3.8.6 UUID compress', () => {
    it('官方向量：默认 23 位与 min 22 位', () => {
        const known = 'fc991dd7-0033-4b80-9d41-c8a86a702e59';
        expect(compressUuid(known)).toBe('fc9913XADNLgJ1ByKhqcC5Z');
        expect(compressUuid(known, true)).toBe('fcmR3XADNLgJ1ByKhqcC5Z');
        expect(decompressUuid('fc9913XADNLgJ1ByKhqcC5Z')).toBe(known);
        expect(decompressUuid('fcmR3XADNLgJ1ByKhqcC5Z')).toBe(known);
    });
    
    it('旧手搓 BootScene uuid 的 compress 正是 Mac 预览里的 _RF.push id', () => {
        expect(compressUuid('b0000001-0000-4000-8000-000000000001')).toBe('b0000ABAABAAIAAAAAAAAAB');
    });
    
    it('当前脚本 meta uuid 都能 compress/decompress 往返', () => {
        const boot = metaUuid('assets/scripts/core/BootScene.ts.meta');
        expect(boot).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
        expect(decompressUuid(compressUuid(boot))).toBe(boot);
        expect(compressUuid(boot)).toHaveLength(23);
        expect(compressUuid(boot)).not.toMatch(/-/);
    });
});

describe('Boot.scene 序列化', () => {
    const boot = readJson('assets/scenes/Boot.scene') as Array<Record<string, unknown>>;
    const bootSceneUuid = metaUuid('assets/scripts/core/BootScene.ts.meta');
    const classId = compressUuid(bootSceneUuid);
    
    it('_children 只有 Node（避免 _onBatchCreated is not a function）', () => {
        const scene = boot.find((o) => o.__type__ === 'cc.Scene' && o._name === 'Boot') as {
            _children: Array<{ __id__: number }>;
        };
        expect(scene).toBeTruthy();
        for (const child of scene._children) {
            expect(boot[child.__id__].__type__).toBe('cc.Node');
        }
    });
    
    it('BootScene __type__ 是 23 位压缩 id（与 _RF.push 一致，不是 dashed meta uuid）', () => {
        const bootComp = boot.find((o) => o.__type__ === classId) as {
            __type__: string;
            lobbyScene?: { __uuid__: string };
        };
        expect(bootComp, `missing __type__ ${classId}`).toBeTruthy();
        expect(bootComp.__type__).toBe(classId);
        expect(bootComp.__type__).not.toBe(bootSceneUuid);
        expect(boot.find((o) => o.__type__ === bootSceneUuid)).toBeUndefined();
        expect(bootComp.lobbyScene?.__uuid__).toBe(LOBBY_SCENE_UUID);
    });
    
    it('Canvas 第 4 个组件（index 3）仍是 BootScene', () => {
        const canvas = boot.find((o) => o.__type__ === 'cc.Node' && o._name === 'Canvas') as {
            _components: Array<{ __id__: number }>;
        };
        expect(canvas._components.length).toBeGreaterThanOrEqual(4);
        const idx3 = boot[canvas._components[3].__id__] as { __type__: string };
        expect(idx3.__type__).toBe(classId);
    });
});

describe('Lobby.scene 序列化', () => {
    const lobby = readJson('assets/scenes/Lobby.scene') as Array<Record<string, unknown>>;
    const lobbySceneUuid = metaUuid('assets/scripts/core/LobbyScene.ts.meta');
    const classId = compressUuid(lobbySceneUuid);
    
    it('_children 只有 Node', () => {
        const scene = lobby.find((o) => o.__type__ === 'cc.Scene' && o._name === 'Lobby') as {
            _children: Array<{ __id__: number }>;
        };
        expect(scene).toBeTruthy();
        for (const child of scene._children) {
            expect(lobby[child.__id__].__type__).toBe('cc.Node');
        }
    });
    
    it('LobbyScene __type__ 为压缩 class id，并序列化引用 Battle.scene', () => {
        const lobbyComp = lobby.find((o) => o.__type__ === classId) as {
            battleScene?: { __uuid__: string };
        };
        expect(lobbyComp).toBeTruthy();
        expect(lobbyComp.battleScene?.__uuid__).toBe(BATTLE_SCENE_UUID);
        expect(lobby.find((o) => o.__type__ === lobbySceneUuid)).toBeUndefined();
    });
});
