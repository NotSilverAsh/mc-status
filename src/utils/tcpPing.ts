/**
 * TCP Ping
 */
import { Socket } from "net";

export interface TcpPingResult {
  online: boolean;
  latency: number | null;
}

/**
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
