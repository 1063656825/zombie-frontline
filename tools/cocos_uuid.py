"""Cocos Creator 3.x UUID compress/decompress (editor UuidUtils).

Script class ids in scene JSON and _RF.push use compressUuid(uuid, min=false):
keep first 5 hex chars, encode the remaining 27 as 18 base64 chars → 23-char id.

Engine runtime decodeUuid() only expands the 22-char min form. 23-char ids are
looked up as-is, so scene __type__ MUST be the 23-char form, not the dashed UUID.
"""
from __future__ import annotations

BASE64_KEY_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
ASCII_TO_64 = [0] * 128
for _i, _ch in enumerate(BASE64_KEY_CHARS):
    ASCII_TO_64[ord(_ch)] = _i


def compress_uuid(uuid: str, min_form: bool = False) -> str:
    hexstr = uuid.replace("-", "").lower()
    if len(hexstr) != 32:
        raise ValueError(f"expected 32 hex chars, got {uuid!r}")
    reserved = 2 if min_form else 5
    i = reserved
    head = hexstr[:i]
    chars: list[str] = []
    while i < len(hexstr):
        v1 = int(hexstr[i], 16)
        v2 = int(hexstr[i + 1], 16)
        v3 = int(hexstr[i + 2], 16)
        chars.append(BASE64_KEY_CHARS[(v1 << 2) | (v2 >> 2)])
        chars.append(BASE64_KEY_CHARS[((v2 & 3) << 4) | v3])
        i += 3
    return head + "".join(chars)


def decompress_uuid(compressed: str) -> str:
    if len(compressed) == 23:
        start = 5
        end = 23
    elif len(compressed) == 22:
        start = 2
        end = 22
    else:
        return compressed
    hex_chars: list[str] = []
    for i in range(start, end, 2):
        lhs = ASCII_TO_64[ord(compressed[i])]
        rhs = ASCII_TO_64[ord(compressed[i + 1])]
        hex_chars.append(format(lhs >> 2, "x"))
        hex_chars.append(format(((lhs & 3) << 2) | (rhs >> 4), "x"))
        hex_chars.append(format(rhs & 0xF, "x"))
    raw = compressed[:start] + "".join(hex_chars)
    return f"{raw[0:8]}-{raw[8:12]}-{raw[12:16]}-{raw[16:20]}-{raw[20:]}"
