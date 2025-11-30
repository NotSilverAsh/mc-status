/**
 * JAVA EDITION SERVER
 */
import { Socket } from "node:net";
import { resolveSrv } from "node:dns/promises";
import { encodeVarInt, decodeVarInt } from "../utils/varInt.js";
import type { JavaServerStatus, JavaPingResponse } from "../types/mcTypes.js";

const CACHE_TTL = 5000;
const PING_COUNT = 3;
const cache = new Map<string, { timestamp: number; data: JavaServerStatus }>();

function parseMotd(desc: any): string | null {
  if (!desc) return null;

  if (typeof desc === "string") return desc.trim() || null;

  if (typeof desc.text === "string") {
    let text = desc.text;
    if (desc.color) text = `§${desc.color}${text}`;
    if (Array.isArray(desc.extra)) {
      text += desc.extra.map((e: any) => parseMotd(e)).join("");
    }
    return text;
  }

  if (Array.isArray(desc)) return desc.map(parseMotd).join("") || null;

  if (Array.isArray(desc.extra)) return desc.extra.map(parseMotd).join("") || null;

  return typeof desc === "object" ? JSON.stringify(desc) : null;
}

async function resolveSRVRecord(host: string, port = 25565) {
  try {
    const res = await resolveSrv(`_minecraft._tcp.${host}`);
    if (res.length) return { host: res[0].name, port: res[0].port };
  } catch {}
  return { host, port };
}

async function singlePingJava(host: string, port = 25565, timeout = 5000, protocolVersion = 758): Promise<JavaServerStatus> {
  const { host: realHost, port: realPort } = await resolveSRVRecord(host, port);
  return new Promise((resolve) => {
    const socket = new Socket();
    let called = false;

    const fail = () => {
      if (called) return;
      called = true;
      resolve({
        online: false,
        latency: null,
        motd: null,
        playersOnline: null,
        playersMax: null,
        version: null,
      });
      socket.destroy();
    };

    socket.setTimeout(timeout, fail);
    socket.once("error", fail);

    socket.connect(realPort, realHost, () => {
      try {
        const hostBuf = Buffer.from(realHost, "utf8");
        const handshakeBody = Buffer.concat([
          encodeVarInt(protocolVersion),
          encodeVarInt(hostBuf.length),
          hostBuf,
          Buffer.from([(realPort >> 8) & 0xff, realPort & 0xff]),
          encodeVarInt(1),
        ]);
        const handshakePacket = Buffer.concat([
          encodeVarInt(handshakeBody.length + 1),
          Buffer.from([0x00]),
          handshakeBody,
        ]);
        socket.write(handshakePacket);
        socket.write(Buffer.from([0x01, 0x00]));
      } catch {
        fail();
      }
    });

    let buf = Buffer.alloc(0);
    const start = Date.now();

    socket.on("data", (data) => {
      buf = Buffer.concat([buf, data]);
      try {
        const len = decodeVarInt(buf, 0);
        const pid = decodeVarInt(buf, len.bytesRead);
        if (pid.value !== 0x00) return;

        const jsonLen = decodeVarInt(buf, len.bytesRead + pid.bytesRead);
        const startPos = len.bytesRead + pid.bytesRead + jsonLen.bytesRead;
        const endPos = startPos + jsonLen.value;

        if (buf.length < endPos) return;

        const json = JSON.parse(buf.subarray(startPos, endPos).toString("utf8")) as {
          description?: any;
          players?: { online?: number; max?: number };
          version?: { name?: string; protocol?: number };
          favicon?: string;
        };

        if (!called) {
          called = true;

          const response: JavaPingResponse = {
            online: true,
            latency: Date.now() - start,
            motd: parseMotd(json.description),
            players: {
              online: json.players?.online ?? null,
              max: json.players?.max ?? null,
            },
            version: {
              name: json.version?.name ?? null,
              protocol: json.version?.protocol,
            },
            favicon: json.favicon,
          };

          resolve({
            online: response.online,
            latency: response.latency,
            motd: response.motd,
            playersOnline: response.players.online,
            playersMax: response.players.max,
            version: response.version.name,
          });

          socket.destroy();
        }
      } catch {
        fail();
      }
    });
  });
}

export async function getJavaServer(host: string, port = 25565, timeout = 5000): Promise<JavaServerStatus> {
  const key = `${host}:${port}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.timestamp < CACHE_TTL) return cached.data;

  const attempts: JavaServerStatus[] = [];
  for (let i = 0; i < PING_COUNT; i++) attempts.push(await singlePingJava(host, port, timeout));

  const online = attempts.filter(a => a.online);
  const avgLatency = online.length
    ? Math.round(online.reduce((a, b) => a + (b.latency ?? 0), 0) / online.length)
    : null;

  const final = online[0] ? { ...online[0], latency: avgLatency } : attempts[0];
  cache.set(key, { timestamp: now, data: final });
  return final;
}