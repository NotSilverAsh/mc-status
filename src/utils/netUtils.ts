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
 * @param port - TCP port to ping (required)
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
  return new Promise<{ levelName: string | null; plugins: string[] }> ((resolve, reject) => {
    const client = createSocket("udp4");
    const start = Date.now();

    // Java Query Handshake Packet
    const handshake = Buffer.from([
      0xFe, 0xFD, 0x00, // Packet type
      0x09, 0x02, 0x04, 0x01 // Session ID
    ]);

    const timer = setTimeout(() => {
      client.close();
      resolve({ levelName: null, plugins: [] }); // Timeout fallback
    }, timeout);

    client.on("message", (msg) => {
      clearTimeout(timer);
      client.close();

      try {
        const str = msg.toString();
        let levelName: string | null = null;
        let plugins: string[] = [];

        const levelNameMatch = str.match(/hostname=(.*?)\;/);
        if (levelNameMatch) levelName = levelNameMatch[1];

        const pluginsMatch = str.match(/plugins=(.*?)\;/);
        if (pluginsMatch) plugins = pluginsMatch[1].split(";").map(p => p.trim()).filter(Boolean);

        resolve({ levelName, plugins, });
      } catch {
        resolve({ levelName: null, plugins: [] });
      }
    });

    client.send(handshake, port, host)
  });
}