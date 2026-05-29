import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { delimiter, isAbsolute, join } from "node:path";

import { AGENT_STACK, resolveMcpServer, type ResolvedMcpServer } from "./stack.js";

export type McpProbeStatus =
  | "ok"
  | "manual"
  | "remote-configured"
  | "missing-remote-url"
  | "missing-env"
  | "runtime-missing"
  | "startup-failed"
  | "protocol-error"
  | "timeout";

export interface McpProbeServerResult {
  server: string;
  status: McpProbeStatus;
  detail: string;
}

export interface McpProbeResult {
  ok: boolean;
  results: McpProbeServerResult[];
}

export async function probeMcpServerList(
  root: string,
  servers: string[],
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
  clientVersion = "unknown",
  modes: Record<string, string> = {},
  resolvedServers: Record<string, ResolvedMcpServer> = {}
): Promise<McpProbeResult> {
  assertKnownMcpServers(servers);
  const results: McpProbeServerResult[] = [];

  for (const name of servers) {
    const server = resolvedServers[name] ?? resolveMcpServer(name, modes[name]);
    const missingRequired = server.required_env.filter((envName) => !envHasValue(env, envName));
    if (missingRequired.length > 0) {
      results.push({ server: name, status: "missing-env", detail: missingRequired.join(",") });
      continue;
    }
    if (server.connection_mode === "remote-custom" && !server.remote_configured) {
      results.push({ server: name, status: "missing-remote-url", detail: "custom remote endpoint not configured" });
      continue;
    }
    if (server.connection_mode === "remote-curated" || server.connection_mode === "remote-custom") {
      results.push({ server: name, status: "remote-configured", detail: remoteProbeDetail(server) });
      continue;
    }
    if (!server.command) {
      results.push({ server: name, status: "manual", detail: server.hosted_url || server.local_service || "manual setup only" });
      continue;
    }
    const command = resolveCommand(root, server.command);
    if (!commandExists(command, env)) {
      results.push({ server: name, status: "runtime-missing", detail: server.command });
      continue;
    }
    results.push(
      await probeMcpServerProcess(
        root,
        name,
        command,
        server.args,
        { ...server.env, ...env },
        timeoutMs,
        clientVersion
      )
    );
  }

  return { ok: results.every((result) => result.status === "ok" || result.status === "remote-configured"), results };
}

function remoteProbeDetail(server: ResolvedMcpServer): string {
  const urlEnv = server.connection_mode === "remote-custom" ? server.remote_url_env : undefined;
  const source = urlEnv
    ? `custom remote endpoint from ${urlEnv}`
    : server.connection_mode === "remote-custom"
      ? "custom remote endpoint configured"
      : "remote endpoint configured";
  return `${source}; remote probe does not perform a stdio handshake`;
}

function assertKnownMcpServers(servers: string[]): void {
  const unknown = servers.filter((server) => !AGENT_STACK.mcp_servers[server]);
  if (unknown.length > 0) {
    throw new Error(`unknown MCP server: ${unknown.join(", ")}`);
  }
}

function envHasValue(env: NodeJS.ProcessEnv, name: string): boolean {
  return typeof env[name] === "string" && env[name] !== "";
}

function commandExists(command: string, env: NodeJS.ProcessEnv = process.env): boolean {
  if (!command) return false;
  if (command.includes("/") || command.includes("\\")) return existsSync(command);
  const pathValue = env.PATH ?? "";
  const extensions = process.platform === "win32"
    ? (env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";")
    : [""];
  for (const directory of pathValue.split(delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const hasExtension = extension && command.toLowerCase().endsWith(extension.toLowerCase());
      const candidate = join(directory, hasExtension ? command : `${command}${extension}`);
      if (existsSync(candidate)) return true;
    }
  }
  return false;
}

function resolveCommand(root: string, command: string): string {
  if (!command.includes("/") && !command.includes("\\")) return command;
  return isAbsolute(command) ? command : join(root, command);
}

async function probeMcpServerProcess(
  root: string,
  server: string,
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  timeoutMs: number,
  clientVersion: string
): Promise<McpProbeServerResult> {
  return new Promise((resolve) => {
    let settled = false;
    let stderr = "";
    let stdout: Buffer = Buffer.alloc(0);
    const child = spawn(command, args, {
      cwd: root,
      env,
      stdio: ["pipe", "pipe", "pipe"]
    });
    const timer = setTimeout(() => finish("timeout", `${timeoutMs}ms`), timeoutMs);

    function finish(status: McpProbeStatus, detail: string): void {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      resolve({ server, status, detail: detail || "-" });
    }

    child.on("error", (error: NodeJS.ErrnoException) => {
      finish(error.code === "ENOENT" ? "runtime-missing" : "startup-failed", error.message);
    });
    child.on("close", (code) => {
      if (!settled) finish("startup-failed", stderr.trim() || `process exited with code ${code ?? "unknown"}`);
    });
    child.stdin.on("error", (error: Error) => {
      finish("startup-failed", error.message);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.stdout.on("data", (chunk: Buffer) => {
      stdout = Buffer.concat([stdout, chunk]);
      try {
        for (const message of drainMcpMessages()) {
          handleMcpProbeMessage(message);
        }
      } catch (error) {
        finish("protocol-error", error instanceof Error ? error.message : String(error));
      }
    });

    try {
      child.stdin.write(encodeMcpLineMessage({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "academic-research-cli", version: clientVersion }
        }
      }));
    } catch (error) {
      finish("startup-failed", error instanceof Error ? error.message : String(error));
    }

    function handleMcpProbeMessage(message: Record<string, unknown>): void {
      if (message.id === 1) {
        if (message.error) {
          finish("protocol-error", formatJsonRpcError(message.error));
          return;
        }
        child.stdin.write(encodeMcpLineMessage({
          jsonrpc: "2.0",
          method: "notifications/initialized",
          params: {}
        }));
        child.stdin.write(encodeMcpLineMessage({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
          params: {}
        }));
      } else if (message.id === 2) {
        if (message.error) {
          finish("protocol-error", formatJsonRpcError(message.error));
          return;
        }
        const result = typeof message.result === "object" && message.result !== null
          ? message.result as { tools?: unknown }
          : {};
        const toolCount = Array.isArray(result.tools) ? result.tools.length : "unknown";
        finish("ok", `tools=${toolCount}`);
      }
    }

    function drainMcpMessages(): Record<string, unknown>[] {
      const messages: Record<string, unknown>[] = [];
      while (true) {
        stdout = trimLeadingMcpWhitespace(stdout);
        if (stdout.length === 0) return messages;
        if (startsWithContentLength(stdout)) {
          const framed = drainContentLengthMessage(stdout);
          if (!framed) return messages;
          stdout = framed.remaining;
          messages.push(parseMcpMessage(framed.body));
          continue;
        }

        const newline = stdout.indexOf("\n");
        if (newline === -1) return messages;
        const line = stdout.slice(0, newline).toString("utf8").trim();
        stdout = stdout.slice(newline + 1);
        if (!line) continue;
        messages.push(parseMcpMessage(line));
      }
    }
  });
}

function encodeMcpLineMessage(message: unknown): string {
  return `${JSON.stringify(message)}\n`;
}

function trimLeadingMcpWhitespace(buffer: Buffer): Buffer {
  let offset = 0;
  while (offset < buffer.length && (buffer[offset] === 0x0a || buffer[offset] === 0x0d)) {
    offset += 1;
  }
  return offset === 0 ? buffer : buffer.slice(offset);
}

function startsWithContentLength(buffer: Buffer): boolean {
  return buffer.slice(0, "Content-Length:".length).toString("utf8").toLowerCase() === "content-length:";
}

function drainContentLengthMessage(buffer: Buffer): { body: string; remaining: Buffer } | undefined {
  const separator = buffer.indexOf("\r\n\r\n");
  if (separator === -1) return undefined;
  const header = buffer.slice(0, separator).toString("utf8");
  const match = /Content-Length:\s*(\d+)/i.exec(header);
  if (!match) throw new Error("missing Content-Length header");
  const length = Number(match[1]);
  const bodyStart = separator + 4;
  const bodyEnd = bodyStart + length;
  if (buffer.length < bodyEnd) return undefined;
  return {
    body: buffer.slice(bodyStart, bodyEnd).toString("utf8"),
    remaining: buffer.slice(bodyEnd)
  };
}

function parseMcpMessage(raw: string): Record<string, unknown> {
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== "object" || parsed === null) throw new Error("MCP response is not an object");
  return parsed as Record<string, unknown>;
}

function formatJsonRpcError(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message?: unknown }).message);
  }
  return JSON.stringify(error);
}
