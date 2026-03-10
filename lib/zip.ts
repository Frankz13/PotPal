const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

type ZipInputFile = {
  path: string;
  data: Uint8Array;
};

type ZipOutputFile = {
  path: string;
  data: Uint8Array;
};

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

const crcTable = (() => {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n += 1) {
    let c = n;

    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }

    table[n] = c >>> 0;
  }

  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;

  for (let i = 0; i < data.length; i += 1) {
    c = crcTable[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }

  return (c ^ 0xffffffff) >>> 0;
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const totalLength = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });

  return output;
}

function utf8(input: string): Uint8Array {
  return textEncoder.encode(input);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let output = '';

  for (let i = 0; i < bytes.length; i += 3) {
    const b1 = bytes[i] ?? 0;
    const b2 = bytes[i + 1] ?? 0;
    const b3 = bytes[i + 2] ?? 0;

    const chunk = (b1 << 16) | (b2 << 8) | b3;

    output += BASE64_ALPHABET[(chunk >> 18) & 63];
    output += BASE64_ALPHABET[(chunk >> 12) & 63];
    output += i + 1 < bytes.length ? BASE64_ALPHABET[(chunk >> 6) & 63] : '=';
    output += i + 2 < bytes.length ? BASE64_ALPHABET[chunk & 63] : '=';
  }

  return output;
}

export function base64ToBytes(input: string): Uint8Array {
  const cleaned = input.replace(/\s+/g, '');
  const chunks = Math.floor(cleaned.length / 4);
  const output: number[] = [];

  for (let i = 0; i < chunks; i += 1) {
    const index = i * 4;
    const c1 = BASE64_ALPHABET.indexOf(cleaned[index]);
    const c2 = BASE64_ALPHABET.indexOf(cleaned[index + 1]);
    const c3Raw = cleaned[index + 2];
    const c4Raw = cleaned[index + 3];
    const c3 = c3Raw === '=' ? 0 : BASE64_ALPHABET.indexOf(c3Raw);
    const c4 = c4Raw === '=' ? 0 : BASE64_ALPHABET.indexOf(c4Raw);

    if (c1 < 0 || c2 < 0 || (c3Raw !== '=' && c3 < 0) || (c4Raw !== '=' && c4 < 0)) {
      throw new Error('Invalid base64');
    }

    const chunk = (c1 << 18) | (c2 << 12) | (c3 << 6) | c4;
    output.push((chunk >> 16) & 255);

    if (c3Raw !== '=') {
      output.push((chunk >> 8) & 255);
    }

    if (c4Raw !== '=') {
      output.push(chunk & 255);
    }
  }

  return new Uint8Array(output);
}

export function createZipBase64(files: ZipInputFile[]): string {
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let localOffset = 0;

  files.forEach((file) => {
    const filenameBytes = utf8(file.path);
    const fileData = file.data;
    const crc = crc32(fileData);

    const localHeader = new ArrayBuffer(30);
    const localView = new DataView(localHeader);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, 0);
    writeUint16(localView, 12, 0);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, fileData.length);
    writeUint32(localView, 22, fileData.length);
    writeUint16(localView, 26, filenameBytes.length);
    writeUint16(localView, 28, 0);

    const localChunk = concatBytes([new Uint8Array(localHeader), filenameBytes, fileData]);
    localChunks.push(localChunk);

    const centralHeader = new ArrayBuffer(46);
    const centralView = new DataView(centralHeader);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, 0);
    writeUint16(centralView, 14, 0);
    writeUint32(centralView, 16, crc);
    writeUint32(centralView, 20, fileData.length);
    writeUint32(centralView, 24, fileData.length);
    writeUint16(centralView, 28, filenameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, localOffset);

    const centralChunk = concatBytes([new Uint8Array(centralHeader), filenameBytes]);
    centralChunks.push(centralChunk);

    localOffset += localChunk.length;
  });

  const centralDirectory = concatBytes(centralChunks);
  const localDirectory = concatBytes(localChunks);

  const eocd = new ArrayBuffer(22);
  const eocdView = new DataView(eocd);
  writeUint32(eocdView, 0, 0x06054b50);
  writeUint16(eocdView, 4, 0);
  writeUint16(eocdView, 6, 0);
  writeUint16(eocdView, 8, files.length);
  writeUint16(eocdView, 10, files.length);
  writeUint32(eocdView, 12, centralDirectory.length);
  writeUint32(eocdView, 16, localDirectory.length);
  writeUint16(eocdView, 20, 0);

  const zipBytes = concatBytes([localDirectory, centralDirectory, new Uint8Array(eocd)]);
  return bytesToBase64(zipBytes);
}

function findEocdOffset(zipBytes: Uint8Array): number {
  for (let i = zipBytes.length - 22; i >= 0; i -= 1) {
    if (
      zipBytes[i] === 0x50 &&
      zipBytes[i + 1] === 0x4b &&
      zipBytes[i + 2] === 0x05 &&
      zipBytes[i + 3] === 0x06
    ) {
      return i;
    }
  }

  return -1;
}

export function unzipBase64(base64: string): ZipOutputFile[] {
  const zipBytes = base64ToBytes(base64);
  const view = new DataView(zipBytes.buffer, zipBytes.byteOffset, zipBytes.byteLength);
  const eocdOffset = findEocdOffset(zipBytes);

  if (eocdOffset < 0) {
    throw new Error('Invalid ZIP (EOCD not found)');
  }

  const entryCount = view.getUint16(eocdOffset + 10, true);
  const centralOffset = view.getUint32(eocdOffset + 16, true);

  const files: ZipOutputFile[] = [];
  let cursor = centralOffset;

  for (let i = 0; i < entryCount; i += 1) {
    const signature = view.getUint32(cursor, true);

    if (signature !== 0x02014b50) {
      throw new Error('Invalid ZIP central directory');
    }

    const compressionMethod = view.getUint16(cursor + 10, true);
    const compressedSize = view.getUint32(cursor + 20, true);
    const uncompressedSize = view.getUint32(cursor + 24, true);
    const filenameLength = view.getUint16(cursor + 28, true);
    const extraLength = view.getUint16(cursor + 30, true);
    const commentLength = view.getUint16(cursor + 32, true);
    const localHeaderOffset = view.getUint32(cursor + 42, true);

    const filenameStart = cursor + 46;
    const filenameBytes = zipBytes.subarray(filenameStart, filenameStart + filenameLength);
    const filename = textDecoder.decode(filenameBytes);

    const localSignature = view.getUint32(localHeaderOffset, true);

    if (localSignature !== 0x04034b50) {
      throw new Error('Invalid ZIP local header');
    }

    const localFilenameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const localDataStart = localHeaderOffset + 30 + localFilenameLength + localExtraLength;

    if (compressionMethod !== 0) {
      cursor += 46 + filenameLength + extraLength + commentLength;
      continue;
    }

    const fileBytes = zipBytes.subarray(localDataStart, localDataStart + compressedSize);

    if (fileBytes.length !== uncompressedSize) {
      throw new Error('Invalid ZIP file size');
    }

    files.push({ path: filename, data: new Uint8Array(fileBytes) });
    cursor += 46 + filenameLength + extraLength + commentLength;
  }

  return files;
}

export function utf8ToBytes(value: string): Uint8Array {
  return textEncoder.encode(value);
}

export function bytesToUtf8(value: Uint8Array): string {
  return textDecoder.decode(value);
}
