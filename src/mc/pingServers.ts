/**
 * PING MULTIPLE SERVERS
 * @param servers - Array of server addresses
 * @example const serversList = [
  { name: 'Java Demo', host: 'noel.hidencloud.com', port: 24601, type: 'java', timeout: 10000 },
  { name: 'Bedrock Demo', host: 'demo.mcstatus.io', port: 19132, type: 'bedrock', timeout: 10000 },
    ];
 */
import type { ServerInfo, JavaServerStatus, BedrockServerStatus, BedrockPingOptions } from "../types/mcTypes.js";
import { getJavaServer } from "./minecraftJava.js";
import { getBedrockServer } from "./minecraftBedrock.js";

export async function pingServers(
  servers: ServerInfo[]
): Promise<Array<JavaServerStatus & { name: string; type: "java" } | BedrockServerStatus & { name: string; type: "bedrock" }>> {
  const results = await Promise.allSettled(
    servers.map(async (srv) => {
      if (srv.type === "java") {
        const port = srv.port ?? 25565;
        const status: JavaServerStatus = await getJavaServer(srv.host, port, srv.timeout ?? 15000);
        return { name: srv.name, type: "java" as const, ...status };
      } else {
        const options: BedrockPingOptions = { port: srv.port ?? 19132, timeout: srv.timeout ?? 15000 };
        const status: BedrockServerStatus = await getBedrockServer(srv.host, options);
        return { name: srv.name, type: "bedrock" as const, ...status };
      }
    })
  );

  return results.map((result, idx) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      const srv = servers[idx];
      return {
        name: srv?.name ?? "unknown",
        type: (srv?.type ?? "java") as "java" | "bedrock",
        online: false,
        latency: null,
        motd: null,
        playersOnline: null,
        playersMax: null,
        version: null,
        plugins: [],
        levelName: null,
      } as any;
    }
  });
}