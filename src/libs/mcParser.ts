// Software Detection
export function detectSoftware(versionName?: string, modinfo?: any): string {
  if (!versionName) return "null";
  const name = versionName.toLowerCase();
  if (name.includes("paper")) return "Paper";
  if (name.includes("purpur")) return "Purpur";
  if (name.includes("spigot")) return "Spigot";
  if (name.includes("bukkit")) return "Bukkit";
  if (name.includes("velocity")) return "Velocity";
  if (modinfo?.modList?.length) return modinfo.type === "FML" ? "Forge" : "Fabric";
  return "Vanilla";
};
export function detectBedrockSoftware(name?: string): string {
  if (!name) return "null";
  const lower = name.toLowerCase();
  if (lower.includes("pe") || lower.includes("bedrock")) return "Bedrock";
  return "Unknown";
}

// MOTD Parser
export function parseMotd(desc: any): string | null {
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