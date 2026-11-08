/**
 * Creator 3.x editor UuidUtils.compressUuid / decompressUuid
 * Scene script __type__ and _RF.push use min=false (23-char).
 */

const BASE64_KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const ASCII_TO_64 = new Array<number>(128).fill(0);
for (let i = 0; i < 64; i++) {
    ASCII_TO_64[BASE64_KEY_CHARS.charCodeAt(i)] = i;
}

export function compressUuid(uuid: string, minForm = false): string {
    const hex = uuid.replace(/-/g, '').toLowerCase();
    if (hex.length !== 32) {
        throw new Error(`expected 32 hex chars, got ${uuid}`);
    }
    const reserved = minForm ? 2 : 5;
    let i = reserved;
    const chars: string[] = [];
    while (i < hex.length) {
        const v1 = parseInt(hex[i], 16);
        const v2 = parseInt(hex[i + 1], 16);
        const v3 = parseInt(hex[i + 2], 16);
        chars.push(BASE64_KEY_CHARS[(v1 << 2) | (v2 >> 2)]);
        chars.push(BASE64_KEY_CHARS[((v2 & 3) << 4) | v3]);
        i += 3;
    }
    return hex.slice(0, reserved) + chars.join('');
}

export function decompressUuid(compressed: string): string {
    let start: number;
    let end: number;
    if (compressed.length === 23) {
        start = 5;
        end = 23;
    } else if (compressed.length === 22) {
        start = 2;
        end = 22;
    } else {
        return compressed;
    }
    const hexChars: string[] = [];
    for (let i = start; i < end; i += 2) {
        const lhs = ASCII_TO_64[compressed.charCodeAt(i)];
        const rhs = ASCII_TO_64[compressed.charCodeAt(i + 1)];
        hexChars.push((lhs >> 2).toString(16));
        hexChars.push((((lhs & 3) << 2) | (rhs >> 4)).toString(16));
        hexChars.push((rhs & 0xF).toString(16));
    }
    const raw = compressed.slice(0, start) + hexChars.join('');
    return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}
