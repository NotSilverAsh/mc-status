/**
 * JAVA EDITION SERVER
 */
import { Socket } from "node:net";
import { encodeVarInt, decodeVarInt } from "../utils/varInt.js";
import type { JavaServerStatus, JavaPingResponse } from "../types/mcTypes.js";
import { parseMotd, detectSoftware } from "../utils/mcParser.js";
import { resolveSRVRecord, queryJavaServer, tcpPing } from "../utils/netUtils.js";

const CACHE_TTL = 5000;
const PING_COUNT = 3;
const cache = new Map<string, { timestamp: number; data: JavaServerStatus }>();

async function singlePingJava(host: string, port = 25565, timeout = 5000, protocolVersion = 758): Promise<JavaServerStatus> {
  const { host: realHost, port: realPort } = await resolveSRVRecord(host, port);

  // Measure latency using tcpPing
  const pingResult = await tcpPing(realHost, realPort, timeout);
  if (!pingResult.online) {
    return {
      online: false,
      latency: null,
      motd: null,
      playersOnline: null,
      playersMax: null,
      version: null,
      software: "Unknown",
      plugins: [],
      levelName: null,
    };
  }

  return new Promise((resolve) => {
    const socket = new Socket();
    let called = false;

    const fail = () => {
      if (called) return;
      called = true;
      resolve({
        online: false,
        latency: pingResult.latency,
        motd: null,
        playersOnline: null,
        playersMax: null,
        version: null,
        software: "Unknown",
        plugins: [],
        levelName: null,
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
          modInfo?: any;
        };

        if (!called) {
          called = true;

          const software = detectSoftware(json.version?.name, json.modInfo);

          const response: JavaPingResponse = {
            online: true,
            latency: pingResult.latency, // use tcpPing latency
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
            software,
            plugins: [],
            levelName: null,
          };

          resolve({
            online: response.online,
            latency: response.latency,
            motd: response.motd,
            playersOnline: response.players.online,
            playersMax: response.players.max,
            version: response.version.name,
            software: response.software,
            plugins: response.plugins,
            levelName: response.levelName,
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

  for (let i = 0; i < PING_COUNT; i++) {
    const pingResult = await tcpPing(host, port, timeout);

    if (!pingResult.online) {
      attempts.push({
        online: false,
        latency: null,
        motd: null,
        playersOnline: null,
        playersMax: null,
        version: null,
        software: "Unknown",
        plugins: [],
        levelName: null,
      });
      continue;
    }

    const serverData = await singlePingJava(host, port, timeout);
    serverData.latency = pingResult.latency;
    attempts.push(serverData);
  }

  const online = attempts.filter(a => a.online);
  const avgLatency = online.length
    ? Math.round(online.reduce((a, b) => a + (b.latency ?? 0), 0) / online.length)
    : null;

  const final = online[0] ? { ...online[0], latency: avgLatency } : attempts[0];

  const query = await queryJavaServer(host, port).catch(() => ({ levelName: null, plugins: [] }));
  final.levelName = query.levelName;
  final.plugins = query.plugins;

  cache.set(key, { timestamp: now, data: final });
  return final;
}