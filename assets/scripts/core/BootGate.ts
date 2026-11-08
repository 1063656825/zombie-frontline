/**
 * BootGate.ts
 * Day15: Boot → Lobby 跳转闸门（无 Cocos 依赖，供 vitest 直接导入）
 *
 * 规则：就绪且未发起过跳转，且停留时间达到最小 Boot 时长，才允许发起一次 loadScene。
 */

export const MIN_BOOT_TIME = 1.5;
export const SCENE_NAME_LOBBY = 'Lobby';
export const LOBBY_SCENE_UUID = 'a0000001-0000-4000-8000-000000000002';

export function shouldJumpFromBoot(
    isReady: boolean,
    jumpStarted: boolean,
    elapsedSec: number,
    minSec: number = MIN_BOOT_TIME
): boolean {
    return isReady && !jumpStarted && elapsedSec >= minSec;
}
