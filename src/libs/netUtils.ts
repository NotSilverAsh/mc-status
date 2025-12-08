import { Socket } from "net";
import { resolveSrv } from "node:dns/promises";
import { createSocket } from "dgram";

export interface TcpPingResult {
  online: boolean;
  latency: number | null;
}

/**
 * TCP PING
 * @param host - Hostname or IP
 * @param port - Port to ping (required)
 * @param timeout - Timeout in ms (default 3000)
 */
export async function tcpPing(
  host: string,
  port: number,
  timeout: number = 3000
): Promise<TcpPingResult> {
  return new Promise((resolve) => {
    const socket = new Socket();
    let called = false;
    const start = Date.now();

    const fail = () => {
      if (!called) {
        called = true;
        resolve({ online: false, latency: null });
        socket.destroy();
      }
    };

    socket.setTimeout(timeout, fail);
    socket.once("error", fail);

    socket.connect(port, host, () => {
      if (!called) {
        called = true;
        resolve({ online: true, latency: Date.now() - start });
        socket.destroy();
      }
    });
  });
}

// Resolve SRV record
export async function resolveSRVRecord(host: string, port = 25565) {
  try {
    const res = await resolveSrv(`_minecraft._tcp.${host}`);
    if (res.length) return { host: res[0].name, port: res[0].port };
  } catch {}
  return { host, port };
}

// LevelName (world name), plugins query function
export async function queryJavaServer(host: string, port = 25565, timeout = 5000) {
  return new Promise<{ levelName: string | null; plugins: string[] }>((resolve, reject) => {
    const client = createSocket("udp4");
    const sessionId = Math.floor(Math.random() * 0x7FFFFFFF);
    let handshakeComplete = false;

    const timer = setTimeout(() => {
      cleanup();
      resolve({ levelName: null, plugins: [] });
    }, timeout);

    const cleanup = () => {
      clearTimeout(timer);
      client.close();
    };

    client.on("error", (err) => {
      cleanup();
      resolve({ levelName: null, plugins: [] });
    });

    client.on("message", (msg) => {
      try {
        if (!handshakeComplete) {
          // First response is handshake, extract challenge token
          if (msg.length < 5) return;
          
          const challengeToken = msg.readUInt32BE(1);
          handshakeComplete = true;

          // Send stats request with challenge token
          const statsPacket = Buffer.alloc(14);
          statsPacket[0] = 0xFe;
          statsPacket[1] = 0xFd;
          statsPacket[2] = 0x00; // Stat packet type
          statsPacket.writeUInt32BE(sessionId, 3);
          statsPacket.writeUInt32BE(challengeToken, 7);
          statsPacket.writeUInt32BE(0, 11);

          client.send(statsPacket, 0, statsPacket.length, port, host);
        } else {
          // Second response contains the actual stats
          cleanup();

          // Parse the response (skip first 5 bytes of header)
          if (msg.length < 6) {
            resolve({ levelName: null, plugins: [] });
            return;
          }

          const data = msg.toString("utf8", 5);
          const pairs = data.split("\x00");

          let levelName: string | null = null;
          let plugins: string[] = [];

          // Parse key=value pairs
          for (let i = 0; i < pairs.length - 1; i += 2) {
            const key = pairs[i];
            const value = pairs[i + 1];

            if (key === "level-name") {
              levelName = value;
            }
            if (key === "plugins") {
              // Format: "CraftBukkit on Bukkit 1.20.1: Plugin1, Plugin2, Plugin3"
              const pluginStr = value.split(": ")[1] || value;
              plugins = pluginStr.split(", ").filter(p => p.length > 0);
            }
          }

          resolve({ levelName, plugins });
        }
      } catch (err) {
        cleanup();
        resolve({ levelName: null, plugins: [] });
      }
    });

    // Send handshake packet
    const handshakePacket = Buffer.from([
      0xFe, 0xFd, 0x09, // Packet type (handshake)
      0x00, 0x00, 0x00, 0x00 // Session ID placeholder
    ]);
    handshakePacket.writeUInt32BE(sessionId, 3);

    client.send(handshakePacket, 0, handshakePacket.length, port, host);
  });
}