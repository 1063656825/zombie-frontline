/**
 * BootGate.ts
 * Boot → Lobby 跳转闸门（无 Cocos 依赖）
 *
 * Creator 3.8.6: director.loadScene(name, onLaunched?, onUnloaded?)
 * 预览「当前场景」时 name 表常常没有 Lobby；loadScene 返回 false 或 onLaunched(err)
 * 时必须立刻走 UUID / 已序列化 SceneAsset。
 */

export const MIN_BOOT_TIME = 1.5;
export const SCENE_NAME_LOBBY = 'Lobby';
export const LOBBY_SCENE_UUID = '574302a8-b8cc-477d-8f8f-44fa52d267bf';
export const BATTLE_SCENE_UUID = 'fc9cb047-7356-4dff-a2de-92a27c4ee4f3';

export function shouldJumpFromBoot(
    isReady: boolean,
    jumpStarted: boolean,
    elapsedSec: number,
    minSec: number = MIN_BOOT_TIME
): boolean {
    return isReady && !jumpStarted && elapsedSec >= minSec;
}

/**
 * 3.8.6 onLaunched 第一参是 Error | null，不是 Scene。
 * 若误把 Scene 当 err，会在已进大厅后再走 UUID。
 */
export function launchedCallbackHasError(firstArg: unknown): boolean {
    if (firstArg == null || firstArg === false) {
        return false;
    }
    if (firstArg instanceof Error) {
        return true;
    }
    if (typeof firstArg === 'string') {
        return firstArg.length > 0;
    }
    if (typeof firstArg === 'object') {
        const obj = firstArg as { message?: unknown; _objFlags?: unknown; scene?: unknown };
        if (obj._objFlags !== undefined || obj.scene !== undefined) {
            return false;
        }
        if (typeof obj.message === 'string') {
            return true;
        }
    }
    return false;
}

/**
 * 3.8.6：按名 loadScene 失败时是否立刻 UUID 回退。
 * loadScene 返回 false = 未开始加载（预览当前场景常见）。
 * onLaunched 带 error = 加载过程失败。
 */
export function shouldFallbackToUuid(
    loadSceneReturned: boolean | undefined,
    launchedHasError: boolean
): boolean {
    if (loadSceneReturned === false) {
        return true;
    }
    if (launchedHasError) {
        return true;
    }
    return false;
}
