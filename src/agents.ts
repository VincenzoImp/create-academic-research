export const DEFAULT_AGENT = "universal";
export const AUTO_AGENT = "auto";

export const SUPPORTED_SKILL_AGENT_TARGETS = [
  "adal",
  "aider-desk",
  "amp",
  "antigravity",
  "augment",
  "bob",
  "claude-code",
  "cline",
  "codearts-agent",
  "codebuddy",
  "codemaker",
  "codestudio",
  "codex",
  "command-code",
  "continue",
  "cortex",
  "crush",
  "cursor",
  "deepagents",
  "devin",
  "dexto",
  "droid",
  "firebender",
  "forgecode",
  "gemini-cli",
  "github-copilot",
  "goose",
  "hermes-agent",
  "iflow-cli",
  "junie",
  "kilo",
  "kimi-cli",
  "kiro-cli",
  "kode",
  "mcpjam",
  "mistral-vibe",
  "mux",
  "neovate",
  "openclaw",
  "opencode",
  "openhands",
  "pi",
  "pochi",
  "qoder",
  "qwen-code",
  "replit",
  "roo",
  "rovodev",
  "tabnine-cli",
  "trae",
  "trae-cn",
  "universal",
  "warp",
  "windsurf",
  "zencoder"
] as const;

export const AGENT_TARGET_ALIASES: Record<string, string> = {
  claude: "claude-code",
  claude_code: "claude-code"
};

const SUPPORTED_AGENT_TARGETS = new Set<string>([
  AUTO_AGENT,
  ...SUPPORTED_SKILL_AGENT_TARGETS
]);

export function normalizeAgentTarget(agent: string | undefined): string {
  const value = agent?.trim();
  if (!value) return DEFAULT_AGENT;
  const normalized = value.toLowerCase();
  return AGENT_TARGET_ALIASES[normalized] ?? normalized;
}

export function assertKnownAgentTarget(agent: string | undefined): string {
  const normalized = normalizeAgentTarget(agent);
  if (!SUPPORTED_AGENT_TARGETS.has(normalized)) {
    const value = agent?.trim() || DEFAULT_AGENT;
    throw new Error(
      [
        `unknown agent target: ${value}`,
        `Use ${DEFAULT_AGENT}, ${AUTO_AGENT}, or one supported skills.sh agent id.`,
        "List targets with: npx --yes --package create-academic-research@latest academic-research agents list",
        `Supported ids: ${specificAgentTargets().join(", ")}`,
        `Aliases: ${formatAgentAliasesInline()}`
      ].join("\n")
    );
  }
  return normalized;
}

export function formatAgentTargetList(): string {
  const lines = [
    `${DEFAULT_AGENT}\tRecommended shared project-local .agents/skills copy`,
    `${AUTO_AGENT}\tLet the skills CLI detect installed agents; may create multiple agent-specific copies`,
    ...specificAgentTargets().map((agent) => `${agent}\tskills.sh agent id`),
    ...Object.entries(AGENT_TARGET_ALIASES).map(([alias, target]) => `alias\t${alias}\t${target}`)
  ];
  return `${lines.join("\n")}\n`;
}

export function formatSupportedAgentTargetLines(indent = "  ", width = 100): string[] {
  const labels = specificAgentTargets();
  const lines: string[] = [];
  let current = indent;
  for (const label of labels) {
    const next = current === indent ? label : `, ${label}`;
    if (current.length + next.length > width) {
      lines.push(current);
      current = `${indent}${label}`;
    } else {
      current += next;
    }
  }
  if (current.trim()) lines.push(current);
  return lines;
}

export function formatAgentAliasLines(indent = "  "): string[] {
  return Object.entries(AGENT_TARGET_ALIASES).map(([alias, target]) => `${indent}${alias} -> ${target}`);
}

function formatAgentAliasesInline(): string {
  return Object.entries(AGENT_TARGET_ALIASES)
    .map(([alias, target]) => `${alias} -> ${target}`)
    .join(", ");
}

function specificAgentTargets(): string[] {
  return SUPPORTED_SKILL_AGENT_TARGETS.filter((agent) => agent !== DEFAULT_AGENT);
}
