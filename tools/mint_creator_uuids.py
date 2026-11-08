#!/usr/bin/env python3
"""Replace sequential handcrafted UUIDs with Creator-style v4 UUIDs.

Scene script __type__ is the 23-char compressed form (compressUuid min=false),
matching Creator 3.8.6 _RF.push class ids. Asset __uuid__ and *.meta stay dashed.
"""
from __future__ import annotations

import json
import re
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from cocos_uuid import compress_uuid, decompress_uuid  # noqa: E402

ROOT = Path("/workspace")

DIR_META = {
    "ver": "1.1.0",
    "importer": "directory",
    "imported": True,
    "files": [],
    "subMetas": {},
    "userData": {},
}

FOLDERS = [
    "assets",
    "assets/scenes",
    "assets/scripts",
    "assets/scripts/ads",
    "assets/scripts/analytics",
    "assets/scripts/audio",
    "assets/scripts/battle",
    "assets/scripts/core",
    "assets/scripts/data",
    "assets/scripts/effects",
    "assets/scripts/platform",
    "assets/scripts/ui",
]


def mint() -> str:
    u = str(uuid.uuid4())
    assert decompress_uuid(compress_uuid(u)) == u
    return u


def walk_replace(obj, replacer):
    if isinstance(obj, dict):
        return {k: walk_replace(v, replacer) for k, v in obj.items()}
    if isinstance(obj, list):
        return [walk_replace(v, replacer) for v in obj]
    if isinstance(obj, str):
        return replacer(obj)
    return obj


def main() -> None:
    force = "--force" in sys.argv
    existing = list((ROOT / "assets").rglob("*.meta"))
    sequential = any("0000001-0000-4000-8000-" in p.read_text(encoding="utf-8") for p in existing)
    if existing and not sequential and not force:
        raise SystemExit("UUIDs already minted; pass --force only if you intend to break existing library/")

    known = "fc991dd7-0033-4b80-9d41-c8a86a702e59"
    assert compress_uuid(known) == "fc9913XADNLgJ1ByKhqcC5Z"
    assert compress_uuid(known, min_form=True) == "fcmR3XADNLgJ1ByKhqcC5Z"
    boot_old = "b0000001-0000-4000-8000-000000000001"
    assert compress_uuid(boot_old) == "b0000ABAABAAIAAAAAAAAAB"
    assert decompress_uuid("b0000ABAABAAIAAAAAAAAAB") == boot_old

    script_metas = sorted((ROOT / "assets").rglob("*.ts.meta"))
    scene_metas = sorted((ROOT / "assets").rglob("*.scene.meta"))
    if not script_metas or not scene_metas:
        raise SystemExit("missing metas")

    old_script = {p: json.loads(p.read_text())["uuid"] for p in script_metas}
    old_scene = {p: json.loads(p.read_text())["uuid"] for p in scene_metas}

    new_script = {p: mint() for p in script_metas}
    new_scene = {p: mint() for p in scene_metas}

    # old full script uuid -> 23-char class id for the NEW uuid
    script_type_map = {old_script[p]: compress_uuid(new_script[p]) for p in script_metas}
    scene_uuid_map = {old_scene[p]: new_scene[p] for p in scene_metas}

    def scene_replacer(value: str) -> str:
        if value in script_type_map:
            return script_type_map[value]
        if value in scene_uuid_map:
            return scene_uuid_map[value]
        return value

    for scene_path in sorted((ROOT / "assets/scenes").glob("*.scene")):
        data = json.loads(scene_path.read_text(encoding="utf-8"))
        patched = walk_replace(data, scene_replacer)
        scene_path.write_text(json.dumps(patched, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"patched {scene_path.relative_to(ROOT)}")

    for p, uid in {**new_script, **new_scene}.items():
        meta = json.loads(p.read_text(encoding="utf-8"))
        meta["uuid"] = uid
        p.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
        print(f"meta {p.relative_to(ROOT)} -> {uid}")

    for folder in FOLDERS:
        meta_path = ROOT / f"{folder}.meta"
        body = dict(DIR_META)
        body["uuid"] = mint()
        meta_path.write_text(json.dumps(body, indent=2) + "\n", encoding="utf-8")
        print(f"dir  {meta_path.relative_to(ROOT)} -> {body['uuid']}")

    lobby_uuid = new_scene[ROOT / "assets/scenes/Lobby.scene.meta"]
    battle_uuid = new_scene[ROOT / "assets/scenes/Battle.scene.meta"]
    boot_scene_uuid = new_scene[ROOT / "assets/scenes/Boot.scene.meta"]
    boot_script = ROOT / "assets/scripts/core/BootScene.ts.meta"
    boot_class = compress_uuid(new_script[boot_script])

    boot_gate = ROOT / "assets/scripts/core/BootGate.ts"
    text = boot_gate.read_text(encoding="utf-8")
    text = re.sub(
        r"export const LOBBY_SCENE_UUID = '[^']+';",
        f"export const LOBBY_SCENE_UUID = '{lobby_uuid}';",
        text,
        count=1,
    )
    text = re.sub(
        r"export const BATTLE_SCENE_UUID = '[^']+';",
        f"export const BATTLE_SCENE_UUID = '{battle_uuid}';",
        text,
        count=1,
    )
    boot_gate.write_text(text, encoding="utf-8")

    proj = ROOT / "settings/v2/packages/project.json"
    data = json.loads(proj.read_text(encoding="utf-8"))
    data["general"]["startSceneUuid"] = boot_scene_uuid
    proj.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")

    print("---")
    print(f"Boot.scene          {boot_scene_uuid}")
    print(f"Lobby.scene         {lobby_uuid}")
    print(f"Battle.scene        {battle_uuid}")
    print(f"BootScene class id  {boot_class}  (from {new_script[boot_script]})")
    print("ok")


if __name__ == "__main__":
    main()
