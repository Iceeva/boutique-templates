// Lecture et création de ZIP en JS natif (DecompressionStream / CompressionStream), sans dépendance.
const te = new TextEncoder();
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(b) { let c = ~0; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return ~c >>> 0; }

const pipe = async (u8, stream) => new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(stream)).arrayBuffer());
const inflateRaw = (u8) => pipe(u8, new DecompressionStream('deflate-raw'));
const deflateRaw = (u8) => pipe(u8, new CompressionStream('deflate-raw'));

function decodeName(bytes) {
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes); }
  catch { return new TextDecoder('windows-1252').decode(bytes); }
}

// -> [{ path, dir, size, bytes(): Promise<Uint8Array> }]
export function readZip(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let eocd = -1;
  for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("Archive ZIP invalide");
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  if (p === 0xFFFFFFFF || count === 0xFFFF) throw new Error('ZIP64 non pris en charge');
  const out = [];
  for (let i = 0; i < count; i++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Archive ZIP corrompue');
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true);
    const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const path = decodeName(u8.subarray(p + 46, p + 46 + nl));
    p += 46 + nl + xl + cl;
    const dir = path.endsWith('/');
    out.push({
      path, dir, size: usize,
      async bytes() {
        if (dir) return new Uint8Array(0);
        const start = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true);
        const raw = u8.subarray(start, start + csize);
        if (method === 0) return raw.slice();
        if (method === 8) return inflateRaw(raw);
        throw new Error(`Compression ZIP non prise en charge (${method})`);
      },
    });
  }
  return out;
}

// entries: [{ path, data: Uint8Array }] -> Blob
export async function makeZip(entries) {
  const parts = [], central = [];
  let offset = 0;
  const d = new Date();
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  const canDeflate = typeof CompressionStream === 'function';
  for (const { path, data } of entries) {
    const name = te.encode(path), crc = crc32(data);
    let body = data, method = 0;
    if (canDeflate && data.length > 64) { const z = await deflateRaw(data); if (z.length < data.length) { body = z; method = 8; } }
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, method, true);
    lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, body.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, method, true);
    ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, body.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, name.length, true); ch.setUint32(42, offset, true);
    parts.push(new Uint8Array(lh.buffer), name, body);
    central.push(new Uint8Array(ch.buffer), name);
    offset += 30 + name.length + body.length;
  }
  const size = central.reduce((n, x) => n + x.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, entries.length, true); end.setUint16(10, entries.length, true);
  end.setUint32(12, size, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}
