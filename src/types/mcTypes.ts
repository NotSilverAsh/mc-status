export interface JavaServerStatus {
  online: boolean;
  latency: number | null;
  motd: string | null;
  playersOnline: number | null;
  playersMax: number | null;
  version: string | null;
  levelName?: string | null;
  plugins?: string[] | null;
  software?: string | null;
}

export interface JavaPingResponse {
  online: boolean;
  latency: number | null;
  motd: string | null;
  players: {
    online: number | null;
    max: number | null;
    list?: string[] | null; // Optional list of player detail
  };
  version: {
    name: string | null;
    protocol?: number;
  };
  software?: string | null;
  plugins?: string[] | null;
  favicon?: string; // Optional
  brand?: string | null; // Server brand name is optional
  modinfo?: any | null; // Mod info (forge/fabric)
  levelName?: string | null; // World name
}

export interface BedrockServerStatus {
  online: boolean;
  latency: number | null;
  motd: string | null;
  playersOnline: number | null;
  playersMax: number | null;
  version: string | null;
  levelName?: string | null;
  software?: string | null;
}

export interface BedrockPingResponse {
  edition: string;
  name: string;
  levelName?: string | null;
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
  software?: string | null;
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

export interface BedrockMotd {
  edition: string;
  name: string;
  protocol: number;
  version: string;
  playerCount: number;
  playerMax: number;
  serverGuid: bigint;
  subName?: string;
  gamemode?: string;
  nintendoLimited?: boolean;
  port?: number;
  ipv6Port?: number;
  editorMode?: boolean;
}