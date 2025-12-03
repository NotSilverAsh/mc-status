export const ERR_VARINT_BUFFER_UNDERFLOW = "VARINT_BUFFER_UNDERFLOW";
export const ERR_VARINT_MALFORMED = "VARINT_MALFORMED";
export const ERR_VARINT_ENCODE_TOO_LARGE = "VARINT_ENCODE_TOO_LARGE";

export class VarIntError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "VarIntError";
    this.code = code;
  }
}

export function encodeVarInt(value: number): Buffer {
  const buf = Buffer.alloc(5);
  let written = 0;
  let val = value;

  while (true) {
    const byte = val & 0x7f;
    val >>>= 7;

    if (val === 0) {
      buf.writeUInt8(byte, written++);
      break;
    }

    buf.writeUInt8(byte | 0x80, written++);

    if (written >= 5 && val > 0) {
      throw new VarIntError(
        "Value too large for a 5-byte VarInt",
        ERR_VARINT_ENCODE_TOO_LARGE
      );
    }
  }

  return buf.subarray(0, written);
}

export function decodeVarInt(buffer: Buffer, offset = 0): { value: number; bytesRead: number } {
  if (offset >= buffer.length) throw new VarIntError(
    "Buffer underflow: Cannot decode VarInt at or beyond buffer length.",
    ERR_VARINT_BUFFER_UNDERFLOW
  );

  const firstByte = buffer.readUInt8(offset);
  if ((firstByte & 0x80) === 0) return { value: firstByte, bytesRead: 1 };

  let val = firstByte & 0x7f;
  let position = 7;
  let bytesRead = 1;
  let currentOffset = offset + 1;

  for (let i = 0; i < 4; i++) {
    if (currentOffset >= buffer.length) throw new VarIntError(
      "Buffer underflow: Incomplete VarInt, expected more bytes.",
      ERR_VARINT_BUFFER_UNDERFLOW
    );

    const byte = buffer.readUInt8(currentOffset);
    val |= (byte & 0x7f) << position;
    position += 7;
    bytesRead++;
    currentOffset++;

    if ((byte & 0x80) === 0) return { value: val, bytesRead };
  }

  throw new VarIntError(
    "VarInt is too big or malformed: 5 bytes read with continuation bit still set.",
    ERR_VARINT_MALFORMED
  );
}