#!/usr/bin/env python3
"""Rebuild Cocos Creator 3.8 scene JSON with valid Node children and script refs."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path("/workspace")

# Stable UUIDs (must match *.meta)
UUID = {
    "Boot.scene": "a0000001-0000-4000-8000-000000000001",
    "Lobby.scene": "a0000001-0000-4000-8000-000000000002",
    "Battle.scene": "a0000001-0000-4000-8000-000000000003",
    "BootScene": "b0000001-0000-4000-8000-000000000001",
    "LobbyScene": "b0000001-0000-4000-8000-000000000002",
    "BattleScene": "b0000001-0000-4000-8000-000000000003",
    "BattleFlow": "b0000001-0000-4000-8000-000000000004",
    "GridBuild": "b0000001-0000-4000-8000-000000000005",
    "Combat": "b0000001-0000-4000-8000-000000000006",
    "EnemyWave": "b0000001-0000-4000-8000-000000000007",
    "BuildingPanel": "b0000001-0000-4000-8000-000000000008",
}

LAYER_UI = 33554432  # UI_2D


def vec3(x=0, y=0, z=0):
    return {"__type__": "cc.Vec3", "x": x, "y": y, "z": z}


def quat():
    return {"__type__": "cc.Quat", "x": 0, "y": 0, "z": 0, "w": 1}


def color(r, g, b, a=255):
    return {"__type__": "cc.Color", "r": r, "g": g, "b": b, "a": a}


def size(w, h):
    return {"__type__": "cc.Size", "width": w, "height": h}


def vec2(x, y):
    return {"__type__": "cc.Vec2", "x": x, "y": y}


def ref(i):
    return {"__id__": i}


def scene_asset(uuid: str):
    return {"__uuid__": uuid, "__expectedType__": "cc.SceneAsset"}


class SceneBuilder:
    def __init__(self, name: str):
        self.name = name
        self.objs: list[dict] = []
        self.scene_id = None
        self.globals_id = None

        # index 0: SceneAsset (filled at end)
        self.objs.append({})

        self.scene_id = self.add({
            "__type__": "cc.Scene",
            "_name": name,
            "_objFlags": 0,
            "_parent": None,
            "_children": [],
            "_active": true_val(),
            "_components": [],
            "_prefab": None,
            "autoReleaseAssets": False,
            "_globals": None,
        })

    def add(self, obj: dict) -> int:
        self.objs.append(obj)
        return len(self.objs) - 1

    def add_node(self, name: str, parent: int, pos=(0, 0, 0), layer=LAYER_UI) -> int:
        nid = self.add({
            "__type__": "cc.Node",
            "_name": name,
            "_objFlags": 0,
            "_parent": ref(parent),
            "_children": [],
            "_active": True,
            "_components": [],
            "_prefab": None,
            "_lpos": vec3(*pos),
            "_lrot": quat(),
            "_lscale": vec3(1, 1, 1),
            "_mobility": 0,
            "_layer": layer,
            "_euler": vec3(),
        })
        self.objs[parent]["_children"].append(ref(nid))
        return nid

    def add_comp(self, node_id: int, obj: dict) -> int:
        obj.setdefault("_name", "")
        obj.setdefault("_objFlags", 0)
        obj.setdefault("_enabled", True)
        obj["node"] = ref(node_id)
        cid = self.add(obj)
        self.objs[node_id]["_components"].append(ref(cid))
        return cid

    def ui_transform(self, node_id: int, w: float, h: float) -> int:
        return self.add_comp(node_id, {
            "__type__": "cc.UITransform",
            "_contentSize": size(w, h),
            "_anchorPoint": vec2(0.5, 0.5),
        })

    def label(self, node_id: int, text: str, font=28, line=36, col=(255, 255, 255, 255),
              h_align=1, w=400, h=50) -> int:
        self.ui_transform(node_id, w, h)
        return self.add_comp(node_id, {
            "__type__": "cc.Label",
            "_string": text,
            "_horizontalAlign": h_align,
            "_verticalAlign": 1,
            "_actualFontSize": font,
            "_fontSize": font,
            "_fontFamily": "Arial",
            "_lineHeight": line,
            "_overflow": 0,
            "_enableWrapText": True,
            "_isSystemFontUsed": True,
            "_color": color(*col),
        })

    def camera(self, node_id: int, bg) -> int:
        return self.add_comp(node_id, {
            "__type__": "cc.Camera",
            "_projection": 0,
            "_priority": 0,
            "_fov": 45,
            "_fovAxis": 0,
            "_orthoHeight": 640,
            "_near": 1,
            "_far": 2000,
            "_color": color(*bg),
            "_depth": 1,
            "_stencil": 0,
            "_clearFlags": 7,
            "_rect": {"__type__": "cc.Rect", "x": 0, "y": 0, "width": 1, "height": 1},
            "_aperture": 19,
            "_shutter": 7,
            "_iso": 0,
            "_screenScale": 1,
            "_visibility": 4294967295,
            "_targetTexture": None,
        })

    def canvas(self, node_id: int, camera_id: int) -> int:
        self.ui_transform(node_id, 720, 1280)
        self.add_comp(node_id, {
            "__type__": "cc.Widget",
            "_alignFlags": 45,
            "_target": None,
            "_left": 0,
            "_right": 0,
            "_top": 0,
            "_bottom": 0,
            "_horizontalCenter": 0,
            "_verticalCenter": 0,
            "_isAbsLeft": True,
            "_isAbsRight": True,
            "_isAbsTop": True,
            "_isAbsBottom": True,
            "_isAbsHorizontalCenter": True,
            "_isAbsVerticalCenter": True,
            "_alignMode": 2,
        })
        return self.add_comp(node_id, {
            "__type__": "cc.Canvas",
            "_cameraComponent": ref(camera_id),
            "_alignCanvasWithScreen": True,
        })

    def script(self, node_id: int, class_key: str, props: dict | None = None) -> int:
        obj = {"__type__": UUID[class_key]}
        if props:
            obj.update(props)
        return self.add_comp(node_id, obj)

    def button_visual(self, node_id: int, w: float, h: float, col) -> None:
        self.ui_transform(node_id, w, h)
        self.add_comp(node_id, {
            "__type__": "cc.Sprite",
            "_color": color(*col),
            "_type": 1,
            "_sizeMode": 0,
        })

    def globals(self) -> None:
        amb = self.add({
            "__type__": "cc.AmbientInfo",
            "_skyLightingColor": color(51, 128, 204, 1),
            "_skyIllum": 20000,
            "_groundLightingColor": color(51, 51, 51, 255),
        })
        shadows = self.add({"__type__": "cc.ShadowsInfo", "_enabled": False, "_type": 0})
        sky = self.add({"__type__": "cc.SkyboxInfo", "_enabled": False})
        gid = self.add({
            "__type__": "cc.SceneGlobals",
            "ambient": ref(amb),
            "shadows": ref(shadows),
            "skybox": ref(sky),
        })
        self.objs[self.scene_id]["_globals"] = ref(gid)

    def finish(self) -> list:
        self.globals()
        self.objs[0] = {
            "__type__": "cc.SceneAsset",
            "_name": self.name,
            "_objFlags": 0,
            "_native": "",
            "scene": ref(self.scene_id),
        }
        return self.objs


def true_val():
    return True


def write_json(path: Path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {path} ({len(data)} objects)")


def build_boot():
    b = SceneBuilder("Boot")
    cam_node = b.add_node("Main Camera", b.scene_id, (0, 0, 1000), layer=1073741824)
    cam = b.camera(cam_node, (20, 20, 28, 255))
    canvas = b.add_node("Canvas", b.scene_id, (0, 0, 0))
    b.canvas(canvas, cam)

    title = b.add_node("Title", canvas, (0, 220, 0))
    b.label(title, "尸潮防线", font=60, line=70, w=720, h=80)

    status = b.add_node("StatusLabel", canvas, (0, 0, 0))
    status_lbl = b.label(status, "正在加载...", font=30, line=40, w=720, h=50)

    version = b.add_node("VersionLabel", canvas, (0, -420, 0))
    ver_lbl = b.label(version, "v0.14.0", font=20, line=30, col=(180, 180, 180, 255), w=720, h=40)

    b.script(canvas, "BootScene", {
        "statusLabel": ref(status_lbl),
        "versionLabel": ref(ver_lbl),
        "lobbyScene": scene_asset(UUID["Lobby.scene"]),
    })
    return b.finish()


def build_lobby():
    b = SceneBuilder("Lobby")
    cam_node = b.add_node("Main Camera", b.scene_id, (0, 0, 1000), layer=1073741824)
    cam = b.camera(cam_node, (30, 30, 40, 255))
    canvas = b.add_node("Canvas", b.scene_id, (0, 0, 0))
    b.canvas(canvas, cam)

    title = b.add_node("Title", canvas, (0, 500, 0))
    b.label(title, "尸潮防线", font=48, line=60, w=720, h=70)

    scrap = b.add_node("ScrapLabel", canvas, (0, 430, 0))
    scrap_lbl = b.label(scrap, "残骸: 0", font=32, line=40, col=(255, 215, 0, 255), w=720, h=50)

    start = b.add_node("StartBattleBtn", canvas, (0, -420, 0))
    b.button_visual(start, 260, 80, (50, 150, 50, 255))
    start_lbl_n = b.add_node("BtnLabel", start, (0, 0, 0))
    b.label(start_lbl_n, "开始战斗", font=36, line=44, w=240, h=50)

    b.script(canvas, "LobbyScene", {
        "scrapLabel": ref(scrap_lbl),
        "startBattleBtn": ref(start),
        "upgradeContainer": ref(canvas),
        "battleScene": scene_asset(UUID["Battle.scene"]),
    })
    return b.finish()


def build_battle():
    b = SceneBuilder("Battle")
    cam_node = b.add_node("Main Camera", b.scene_id, (0, 0, 1000), layer=1073741824)
    cam = b.camera(cam_node, (20, 25, 30, 255))
    canvas = b.add_node("Canvas", b.scene_id, (0, 0, 0))
    b.canvas(canvas, cam)

    top = b.add_node("TopHUD", canvas, (0, 520, 0))
    b.ui_transform(top, 720, 220)

    state_n = b.add_node("StateLabel", top, (0, 40, 0))
    state_lbl = b.label(state_n, "状态: 初始化", font=32, line=40, col=(255, 200, 50, 255), w=720, h=40)

    timer_n = b.add_node("TimerLabel", top, (0, -10, 0))
    timer_lbl = b.label(timer_n, "倒计时: --", font=28, line=36, col=(255, 150, 150, 255), w=720, h=40)

    wave_n = b.add_node("WaveLabel", top, (0, -55, 0))
    wave_lbl = b.label(wave_n, "波次: 1/6", font=24, line=32, w=720, h=36)

    hp_n = b.add_node("HPLabel", top, (-180, -95, 0))
    hp_lbl = b.label(hp_n, "HP: 100/100", font=24, line=32, col=(100, 255, 100, 255), h_align=0, w=300, h=36)

    dp_n = b.add_node("DPLabel", top, (180, -95, 0))
    dp_lbl = b.label(dp_n, "DP: 2/12", font=24, line=32, col=(100, 200, 255, 255), h_align=2, w=300, h=36)

    area = b.add_node("GameArea", canvas, (0, 0, 0))
    b.ui_transform(area, 720, 900)

    base = b.add_node("Base", area, (0, -500, 0))
    b.ui_transform(base, 200, 40)
    b.add_comp(base, {
        "__type__": "cc.Graphics",
        "_lineWidth": 2,
        "_strokeColor": color(255, 255, 255, 255),
        "_fillColor": color(33, 150, 243, 255),
    })

    buildings = b.add_node("BuildingContainer", area, (0, 0, 0))
    b.ui_transform(buildings, 720, 800)

    enemies = b.add_node("EnemyContainer", area, (0, 0, 0))
    b.ui_transform(enemies, 720, 800)

    tut = b.add_node("TutorialLabel", area, (0, 200, 0))
    tut_lbl = b.label(tut, "", font=22, line=30, col=(200, 200, 200, 200), w=700, h=40)

    bottom = b.add_node("BottomHUD", canvas, (0, -540, 0))
    b.ui_transform(bottom, 720, 160)

    start = b.add_node("StartCombatBtn", bottom, (0, 40, 0))
    b.button_visual(start, 180, 60, (200, 50, 50, 255))
    start_l = b.add_node("Label", start, (0, 0, 0))
    b.label(start_l, "开战！", font=28, line=36, w=180, h=50)

    pause = b.add_node("PauseBtn", bottom, (-250, 40, 0))
    b.button_visual(pause, 100, 50, (80, 80, 80, 255))
    pause_l = b.add_node("Label", pause, (0, 0, 0))
    b.label(pause_l, "暂停", font=22, line=30, w=100, h=40)

    back = b.add_node("BackBtn", bottom, (250, 40, 0))
    b.button_visual(back, 100, 50, (80, 80, 80, 255))
    back_l = b.add_node("Label", back, (0, 0, 0))
    b.label(back_l, "返回", font=22, line=30, w=100, h=40)

    flow = b.script(canvas, "BattleFlow", {
        "stateLabel": ref(state_lbl),
        "timerLabel": ref(timer_lbl),
        "waveLabel": ref(wave_lbl),
        "hpLabel": ref(hp_lbl),
        "dpLabel": ref(dp_lbl),
    })
    grid = b.script(buildings, "GridBuild", {})
    combat = b.script(canvas, "Combat", {
        "gridBuild": ref(grid),
        "enemyContainer": ref(enemies),
        "projectileContainer": ref(enemies),
    })
    wave = b.script(canvas, "EnemyWave", {
        "combat": ref(combat),
    })
    panel = b.script(bottom, "BuildingPanel", {
        "panelContainer": ref(bottom),
        "machineGunBtn": None,
        "cannonBtn": None,
        "mineBtn": None,
    })
    b.script(canvas, "BattleScene", {
        "battleFlow": ref(flow),
        "gridBuild": ref(grid),
        "buildingPanel": ref(panel),
        "combat": ref(combat),
        "enemyWave": ref(wave),
        "startCombatBtn": ref(start),
        "backToLobbyBtn": ref(back),
        "pauseBtn": ref(pause),
        "tutorialLabel": ref(tut_lbl),
        "enemyCountLabel": None,
        "baseNode": ref(base),
        "buildingContainer": ref(buildings),
        "enemyContainer": ref(enemies),
        "gridNode": ref(buildings),
        "combatTouchArea": ref(canvas),
    })
    return b.finish()


def write_meta(path: Path, importer: str, uuid: str, ver: str, files=None):
    meta = {
        "ver": ver,
        "importer": importer,
        "imported": True,
        "uuid": uuid,
        "files": files or [],
        "subMetas": {},
        "userData": {},
    }
    path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {path}")


def main():
    scenes = ROOT / "assets/scenes"
    write_json(scenes / "Boot.scene", build_boot())
    write_json(scenes / "Lobby.scene", build_lobby())
    write_json(scenes / "Battle.scene", build_battle())

    write_meta(scenes / "Boot.scene.meta", "scene", UUID["Boot.scene"], "1.1.50", [".json"])
    write_meta(scenes / "Lobby.scene.meta", "scene", UUID["Lobby.scene"], "1.1.50", [".json"])
    write_meta(scenes / "Battle.scene.meta", "scene", UUID["Battle.scene"], "1.1.50", [".json"])

    scripts = {
        "assets/scripts/core/BootScene.ts": "BootScene",
        "assets/scripts/core/LobbyScene.ts": "LobbyScene",
        "assets/scripts/core/BattleScene.ts": "BattleScene",
        "assets/scripts/battle/BattleFlow.ts": "BattleFlow",
        "assets/scripts/battle/GridBuild.ts": "GridBuild",
        "assets/scripts/battle/Combat.ts": "Combat",
        "assets/scripts/battle/EnemyWave.ts": "EnemyWave",
        "assets/scripts/ui/BuildingPanel.ts": "BuildingPanel",
    }
    extra = [
        "assets/scripts/core/SceneManager.ts",
        "assets/scripts/core/ObjectPool.ts",
        "assets/scripts/data/GameData.ts",
        "assets/scripts/data/MetaData.ts",
        "assets/scripts/battle/WaveConfig.ts",
        "assets/scripts/battle/BuildingConfig.ts",
        "assets/scripts/ui/PlaceholderGraphics.ts",
        "assets/scripts/ui/RevivePanel.ts",
        "assets/scripts/ui/SettlePanel.ts",
        "assets/scripts/ui/TutorialGuide.ts",
        "assets/scripts/ui/SupplyButton.ts",
        "assets/scripts/ui/DebugPanel.ts",
        "assets/scripts/ui/DeployPhaseIndicator.ts",
        "assets/scripts/ui/DangerSideIndicator.ts",
        "assets/scripts/ads/AdService.ts",
        "assets/scripts/platform/WxBridge.ts",
        "assets/scripts/audio/AudioService.ts",
        "assets/scripts/analytics/Analytics.ts",
        "assets/scripts/effects/HitEffects.ts",
        "assets/scripts/effects/ExplosionVFX.ts",
    ]
    n = 20
    for rel, key in scripts.items():
        write_meta(ROOT / f"{rel}.meta", "typescript", UUID[key], "4.0.24")
    for rel in extra:
        n += 1
        uid = f"b0000001-0000-4000-8000-0000000000{n:02d}"
        write_meta(ROOT / f"{rel}.meta", "typescript", uid, "4.0.24")

    # start scene uuid
    proj = ROOT / "settings/v2/packages/project.json"
    data = json.loads(proj.read_text())
    data["general"]["startSceneUuid"] = UUID["Boot.scene"]
    proj.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print("updated project.json startSceneUuid")


if __name__ == "__main__":
    main()
