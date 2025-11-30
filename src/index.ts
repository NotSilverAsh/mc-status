/**
 * MAIN FILE ENTRY (index.js) - Sh4rk7 (A lil cutie bear)
 */
import { getJavaServer } from "./mc/minecraftJava.js";
import { getBedrockServer } from "./mc/minecraftBedrock.js";
import type { ServerInfo, JavaServerStatus, BedrockServerStatus, BedrockPingOptions } from "./types/mcTypes.js";

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
      } as any;
    }
  });
}

export { getJavaServer, getBedrockServer };
