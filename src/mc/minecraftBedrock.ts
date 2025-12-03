/**
 * BEDROCK EDITION SERVER
 */
import { RemoteInfo, createSocket } from "node:dgram";
import crypto from "node:crypto";
import type { BedrockPingOptions, BedrockServerStatus, BedrockMotd } from "../types/mcTypes.js";
import { detectBedrockSoftware } from "../utils/mcParser.js";

const MAGIC = Buffer.from("00ffff00fefefefefdfdfdfd12345678", "hex");
const UNCONNECTED_PONG = 0x1c;

const createUnconnectedPingFrame = (timestamp: number): Buffer => {
  const buffer = Buffer.alloc(33);
  buffer.writeUInt8(0x01, 0);
  buffer.writeBigInt64LE(BigInt(timestamp), 1);
  MAGIC.copy(buffer, 9);
  crypto.randomBytes(8).copy(buffer, 25);
  return buffer;
};

const parseMotd = (motdString: string): BedrockMotd => {
  const parts = motdString.split(";");
  if (parts.length < 5) throw new Error(`Invalid MOTD: ${parts.length} fields`);

  const [
    edition,
    name,
    protocolStr,
    version,
    playerCountStr,
    playerMaxStr,
    serverGuidStr,
    subName,
    gamemode,
    nintendoLimitedStr,
    portStr,
    ipv6PortStr,
    editorModeStr,
  ] = parts;

  let nintendoLimited: boolean | undefined;
  if (nintendoLimitedStr === "0") nintendoLimited = true;
  else if (nintendoLimitedStr === "1") nintendoLimited = false;

  return {
    edition,
    name,
    protocol: Number(protocolStr),
    version,
    playerCount: Number(playerCountStr),
    playerMax: Number(playerMaxStr),
    serverGuid: BigInt(serverGuidStr || 0),
    subName,
    gamemode,
    nintendoLimited,
    port: portStr ? Number(portStr) : undefined,
    ipv6Port: ipv6PortStr ? Number(ipv6PortStr) : undefined,
    editorMode: editorModeStr ? Boolean(Number(editorModeStr)) : undefined,
  };
};

const motdToServerStatus = (motd: BedrockMotd): BedrockServerStatus => ({
  online: true,
  latency: null,
  motd: motd.name,
  playersOnline: motd.playerCount,
  playersMax: motd.playerMax,
  version: motd.version,
  software: detectBedrockSoftware(motd.name) || null,
  levelName: motd.subName || null,
});

const parseUnconnectedPong = (pongPacket: Buffer): BedrockServerStatus => {
  if (pongPacket.length < 35) throw new Error("Invalid pong packet");
  const packetId = pongPacket.readUInt8(0);
  if (packetId !== UNCONNECTED_PONG) throw new Error(`Unexpected packet ID: ${packetId}`);
  const motdLength = pongPacket.readUInt16BE(33);
  const motdOffset = 35;
  if (motdOffset + motdLength > pongPacket.length) throw new Error("MOTD exceeds buffer size");

  const motdString = pongPacket.toString("utf-8", motdOffset, motdOffset + motdLength);
  return motdToServerStatus(parseMotd(motdString));
};

const CACHE_TTL = 5000;
const PING_COUNT = 3;
const cache = new Map<string, { timestamp: number; data: BedrockServerStatus }>();

export async function getBedrockServer(host: string, options: BedrockPingOptions = {}): Promise<BedrockServerStatus> {
  if (!host) throw new Error("Host is required");
  const { port = 19132, timeout = 5000 } = options;

  const key = `${host}:${port}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && now - cached.timestamp < CACHE_TTL) return cached.data;

  const attempts: BedrockServerStatus[] = [];

  for (let i = 0; i < PING_COUNT; i++) {
    try {
      const status = await singlePing(host, port, timeout);
      attempts.push(status);
    } catch {
      attempts.push({
        online: false,
        latency: null,
        motd: null,
        playersOnline: null,
        playersMax: null,
        version: null,
        software: "Bedrock",
        levelName: null,
      });
    }
  }

  const online = attempts.filter(a => a.online);
  const avgLatency = online.length
    ? Math.round(online.reduce((a, b) => a + (b.latency ?? 0), 0) / online.length)
    : null;

  const final = online[0] ? { ...online[0], latency: avgLatency } : attempts[0];
  cache.set(key, { timestamp: now, data: final });
  return final;
}

function singlePing(host: string, port: number, timeout: number): Promise<BedrockServerStatus> {
  return new Promise((resolve, reject) => {
    const socket = createSocket("udp4");
    let cleanedUp = false;
    const start = Date.now();
    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      if (timeoutTask) clearTimeout(timeoutTask);
      socket.close();
    };

    let timeoutTask: NodeJS.Timeout | undefined;

    socket.on("error", (err) => {
      cleanup();
      reject(err);
    });

    socket.on("message", (msg: Buffer, rinfo: RemoteInfo) => {
      try {
        const status = parseUnconnectedPong(msg);
        status.latency = Date.now() - start;
        cleanup();
        resolve(status);
      } catch (err) {
        cleanup();
        reject(err as Error);
      }
    });

    timeoutTask = setTimeout(() => {
      cleanup();
      reject(new Error("Socket timeout"));
    }, timeout);

    try {
      socket.send(createUnconnectedPingFrame(Date.now() - start), port, host);
    } catch (err) {
      socket.emit("error", err);
    }
  });
}