export interface JavaServerStatus {
  online: boolean;
  latency: number | null;
  motd: string | null;
  playersOnline: number | null;
  playersMax: number | null;
  version: string | null;
}

export interface JavaPingResponse {
  online: boolean;
  latency: number | null;
  motd: string | null;
  players: {
    online: number | null;
    max: number | null;
  };
  version: {
    name: string | null;
    protocol?: number;
  };
  favicon?: string;
}

export interface BedrockServerStatus {
  online: boolean;
  latency: number | null;
  motd: string | null;
  playersOnline: number | null;
  playersMax: number | null;
  version: string | null;
}

export interface BedrockPingResponse {
  edition: string;
  name: string;
  levelName?: string;
  gamemode?: string;
  version: {
    protocol: number;
    minecraft: string;
  };
  players: {
    online: number;
    max: number;
  };
  port: {
    v4?: number;
    v6?: number;
  };
  guid: bigint;
  isNintendoLimited?: boolean;
  isEditorModeEnabled?: boolean;
}

export type ServerInfo = {
  name: string;
  host: string;
  port?: number;
  timeout?: number;
  type: "java" | "bedrock";
};

export interface BedrockPingOptions {
  port?: number;
  timeout?: number;
}