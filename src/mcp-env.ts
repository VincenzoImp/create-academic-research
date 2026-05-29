import { readFile } from "node:fs/promises";

import { AGENT_STACK, resolveMcpServer } from "./stack.js";

export interface McpEnvironmentEntry {
  server: string;
  kind: "required" | "recommended" | "default";
  name: string;
  value: string;
}

export function listMcpEnvironmentEntries(
  servers: string[],
  options: { requiredOnly?: boolean; recommendedOnly?: boolean; mode?: string; modes?: Record<string, string | undefined> } = {}
): McpEnvironmentEntry[] {
  assertKnownMcpServers(servers);
  const entries: McpEnvironmentEntry[] = [];
  for (const serverName of servers) {
    const server = resolveMcpServer(serverName, options.mode ?? options.modes?.[serverName]);
    if (!options.recommendedOnly) {
      for (const envName of server.required_env) {
        entries.push({ server: serverName, kind: "required", name: envName, value: "" });
      }
    }
    if (!options.requiredOnly) {
      for (const envName of server.recommended_env) {
        entries.push({ server: serverName, kind: "recommended", name: envName, value: "" });
      }
      for (const [envName, value] of Object.entries(server.env)) {
        entries.push({ server: serverName, kind: "default", name: envName, value });
      }
    }
  }
  return dedupeMcpEnvironmentEntries(entries);
}

export function formatMcpDotenv(
  servers: string[],
  options: { requiredOnly?: boolean; recommendedOnly?: boolean; mode?: string; modes?: Record<string, string | undefined> } = {}
): string {
  const entries = listMcpEnvironmentEntries(servers, options);
  const lines = [
    "# Academic research MCP environment example.",
    "# Copy to .env.local, your shell profile, or your MCP client secret store.",
    "# Do not commit filled secrets. Empty values mean optional or user-supplied.",
    ""
  ];
  let previousServer = "";
  for (const entry of entries) {
    if (entry.server !== previousServer) {
      if (previousServer) lines.push("");
      lines.push(`# ${entry.server} environment`);
      previousServer = entry.server;
    }
    lines.push(`${entry.name}=${dotenvValue(entry.value)}`);
  }
  if (entries.length === 0) {
    lines.push("# No environment variables are required for the selected MCP servers.");
  }
  return `${lines.join("\n")}\n`;
}

export async function readMcpEnvironmentFile(path: string): Promise<Record<string, string>> {
  return parseDotenv(await readFile(path, "utf8"), path);
}

export function mergeMcpEnvironment(
  baseEnv: NodeJS.ProcessEnv = process.env,
  fileEnv: Record<string, string> = {}
): NodeJS.ProcessEnv {
  const merged: NodeJS.ProcessEnv = { ...baseEnv };
  for (const [name, value] of Object.entries(fileEnv)) {
    if (value || !(name in merged)) merged[name] = value;
  }
  return merged;
}

function assertKnownMcpServers(servers: string[]): void {
  const unknown = servers.filter((server) => !AGENT_STACK.mcp_servers[server]);
  if (unknown.length > 0) {
    throw new Error(`unknown MCP server: ${unknown.join(", ")}`);
  }
}

function dedupeMcpEnvironmentEntries(entries: McpEnvironmentEntry[]): McpEnvironmentEntry[] {
  const priority = { required: 0, default: 1, recommended: 2 } as const;
  const byName = new Map<string, McpEnvironmentEntry>();
  for (const entry of entries) {
    const previous = byName.get(entry.name);
    if (!previous || priority[entry.kind] < priority[previous.kind]) {
      byName.set(entry.name, entry);
    }
  }
  return [...byName.values()];
}

function dotenvValue(value: string): string {
  if (!value) return "";
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) return value;
  return JSON.stringify(value);
}

function parseDotenv(raw: string, path: string): Record<string, string> {
  const env: Record<string, string> = {};
  const lines = raw.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    let text = line.trim();
    if (!text || text.startsWith("#")) continue;
    if (text.startsWith("export ")) text = text.slice("export ".length).trimStart();
    const equals = text.indexOf("=");
    if (equals === -1) {
      throw new Error(`${path}:${index + 1}: expected KEY=value`);
    }
    const key = text.slice(0, equals).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(`${path}:${index + 1}: invalid environment variable name: ${key}`);
    }
    env[key] = parseDotenvValue(text.slice(equals + 1).trim(), path, index + 1);
  }
  return env;
}

function parseDotenvValue(value: string, path: string, line: number): string {
  if (!value) return "";
  const quote = value[0];
  if (quote === "'" || quote === '"') {
    if (!value.endsWith(quote) || value.length === 1) {
      throw new Error(`${path}:${line}: unterminated quoted value`);
    }
    const unquoted = value.slice(1, -1);
    if (quote === "'") return unquoted;
    return unquoted
      .replaceAll("\\n", "\n")
      .replaceAll("\\r", "\r")
      .replaceAll("\\t", "\t")
      .replaceAll('\\"', '"')
      .replaceAll("\\\\", "\\");
  }
  return value.replace(/\s+#.*$/, "").trimEnd();
}
