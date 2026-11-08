/**
 * Boot → Lobby 跳转闸门
 * 运行: npx vitest run tests/boot-gate.test.ts
 */

import { describe, it, expect } from 'vitest';
import { MIN_BOOT_TIME, SCENE_NAME_LOBBY, shouldJumpFromBoot } from '../assets/scripts/core/BootGate';

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
});
