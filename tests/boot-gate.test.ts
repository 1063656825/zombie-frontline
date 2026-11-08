/**
 * Boot → Lobby 跳转闸门
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
        expect(LOBBY_SCENE_UUID).toBe('a0000001-0000-4000-8000-000000000002');
        expect(BATTLE_SCENE_UUID).toBe('a0000001-0000-4000-8000-000000000003');
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

describe('Boot.scene 序列化', () => {
    const bootPath = resolve(__dirname, '../assets/scenes/Boot.scene');
    const boot = JSON.parse(readFileSync(bootPath, 'utf8')) as Array<Record<string, unknown>>;
    
    it('_children 只有 Node（避免 _onBatchCreated is not a function）', () => {
        const scene = boot.find((o) => o.__type__ === 'cc.Scene' && o._name === 'Boot') as {
            _children: Array<{ __id__: number }>;
        };
        expect(scene).toBeTruthy();
        for (const child of scene._children) {
            expect(boot[child.__id__].__type__).toBe('cc.Node');
        }
    });
    
    it('BootScene 序列化引用 Lobby.scene UUID（预览当前 Boot 也会打进 Lobby）', () => {
        const bootComp = boot.find((o) => o.__type__ === 'b0000001-0000-4000-8000-000000000001') as {
            lobbyScene?: { __uuid__: string };
        };
        expect(bootComp).toBeTruthy();
        expect(bootComp.lobbyScene?.__uuid__).toBe(LOBBY_SCENE_UUID);
    });
});

describe('Lobby.scene 序列化', () => {
    const lobbyPath = resolve(__dirname, '../assets/scenes/Lobby.scene');
    const lobby = JSON.parse(readFileSync(lobbyPath, 'utf8')) as Array<Record<string, unknown>>;
    
    it('_children 只有 Node', () => {
        const scene = lobby.find((o) => o.__type__ === 'cc.Scene' && o._name === 'Lobby') as {
            _children: Array<{ __id__: number }>;
        };
        expect(scene).toBeTruthy();
        for (const child of scene._children) {
            expect(lobby[child.__id__].__type__).toBe('cc.Node');
        }
    });
    
    it('LobbyScene 序列化引用 Battle.scene UUID', () => {
        const lobbyComp = lobby.find((o) => o.__type__ === 'b0000001-0000-4000-8000-000000000002') as {
            battleScene?: { __uuid__: string };
        };
        expect(lobbyComp.battleScene?.__uuid__).toBe(BATTLE_SCENE_UUID);
    });
});
