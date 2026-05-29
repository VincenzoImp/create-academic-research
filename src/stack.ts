export interface SkillBundle {
  description: string;
  commands: string[];
}

export interface SkillSource {
  description: string;
  source: string;
  skills: string[];
}

export interface CapabilityPreset {
  description: string;
  skill_bundles: string[];
  mcp_servers: string[];
}

export type McpConnectionMode =
  | "stdio-local"
  | "remote-curated"
  | "remote-custom"
  | "local-service"
  | "manual-local"
  | "manual";

export interface McpServerMode {
  connection_mode: McpConnectionMode;
  readiness?: string;
  priority?: string;
  execution_mode?: string;
  source_need?: string;
  source?: string;
  hosted_url?: string;
  install_command?: string;
  uninstall_command?: string;
  setup_commands?: string[];
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  required_env?: string[];
  recommended_env?: string[];
  local_service?: string;
  smoke_test?: string;
  risks?: string;
}

export interface McpServer {
  readiness: string;
  priority: string;
  execution_mode: string;
  source_need: string;
  source: string;
  hosted_url: string;
  install_command: string;
  uninstall_command: string;
  setup_commands: string[];
  command: string;
  args: string[];
  env: Record<string, string>;
  required_env: string[];
  recommended_env: string[];
  local_service: string;
  smoke_test: string;
  risks: string;
  default_mode?: string;
  recommended_mode?: string;
  modes?: Record<string, McpServerMode>;
}

export interface ResolvedMcpServer extends McpServer {
  selected_mode: string;
  connection_mode: McpConnectionMode;
  remote_url_env?: string;
  remote_configured?: boolean;
}

export interface AgentStack {
  version: number;
  description: string;
  skill_bundles: Record<string, SkillBundle>;
  skill_sources: Record<string, SkillSource>;
  presets: Record<string, CapabilityPreset>;
  mcp_servers: Record<string, McpServer>;
}

export type McpToolCommandKey = "install_command" | "uninstall_command";

export const AGENT_STACK: AgentStack = {
  version: 1,
  description: "Project-local academic research capability stack.",
  skill_bundles: {
    academic_research: {
      description: "Research-native workflow skills.",
      commands: [
        "npm exec --yes --package skills -- skills add VincenzoImp/academic-research-skills {agent_flag} --skill '*' --copy -y"
      ]
    },
    default_complementary: {
      description: "General agent engineering, document, frontend, testing, and skill helpers.",
      commands: [
        "npm exec --yes --package skills -- skills add obra/superpowers {agent_flag} --skill '*' --copy -y",
        "npm exec --yes --package skills -- skills add anthropics/skills {agent_flag} --skill frontend-design webapp-testing skill-creator mcp-builder pdf docx xlsx pptx --copy -y"
      ]
    },
    docling: {
      description: "PDF and document conversion helper.",
      commands: [
        "npm exec --yes --package skills -- skills add existential-birds/beagle {agent_flag} --skill docling --copy -y"
      ]
    }
  },
  skill_sources: {
    academic_research: {
      description: "Academic research skills maintained by this project.",
      source: "VincenzoImp/academic-research-skills",
      skills: [
        "academic-mcp-tooling",
        "adversarial-peer-review",
        "artifact-open-science",
        "citation-bibliography-tooling",
        "citation-claim-audit",
        "cs-methodology-evaluation",
        "cs-venue-strategy",
        "document-conversion",
        "ethics-data-governance",
        "experiment-logbook",
        "paper-writing-review",
        "rebuttal-revision-strategy",
        "repo-migration",
        "research-data-analysis",
        "research-design-positioning",
        "research-project-maintenance",
        "research-project-router",
        "research-repo-reproduction",
        "research-ui-prototyping",
        "skill-evaluation",
        "sota-literature-review",
        "source-ingestion",
        "systematic-review-prisma"
      ]
    },
    superpowers: {
      description: "General agent engineering skills from Superpowers.",
      source: "obra/superpowers",
      skills: [
        "brainstorming",
        "dispatching-parallel-agents",
        "executing-plans",
        "finishing-a-development-branch",
        "receiving-code-review",
        "requesting-code-review",
        "subagent-driven-development",
        "systematic-debugging",
        "test-driven-development",
        "using-git-worktrees",
        "using-superpowers",
        "verification-before-completion",
        "writing-plans",
        "writing-skills"
      ]
    },
    anthropics: {
      description: "Document, frontend, testing, MCP, and skill-authoring helpers.",
      source: "anthropics/skills",
      skills: [
        "docx",
        "frontend-design",
        "mcp-builder",
        "pdf",
        "pptx",
        "skill-creator",
        "webapp-testing",
        "xlsx"
      ]
    },
    docling: {
      description: "Document conversion helper from the Beagle collection.",
      source: "existential-birds/beagle",
      skills: ["docling"]
    }
  },
  presets: {
    minimal: {
      description: "Academic research skills only, no MCP records.",
      skill_bundles: ["academic_research"],
      mcp_servers: []
    },
    default: {
      description: "Clean academic research setup with the low-friction arXiv MCP record.",
      skill_bundles: ["academic_research"],
      mcp_servers: ["arxiv"]
    },
    enhanced: {
      description:
        "Default academic setup plus complementary agent engineering, document, frontend, testing, and doc conversion skills.",
      skill_bundles: ["academic_research", "default_complementary", "docling"],
      mcp_servers: ["arxiv"]
    },
    literature: {
      description: "Literature-heavy SOTA, survey, scoping, or systematic review setup with CS bibliography support.",
      skill_bundles: ["academic_research", "default_complementary", "docling"],
      mcp_servers: ["arxiv", "dblp"]
    },
    writing: {
      description: "Paper-writing setup with Overleaf documented as an opt-in credentialed integration.",
      skill_bundles: ["academic_research", "default_complementary", "docling"],
      mcp_servers: ["arxiv"]
    },
    full: {
      description: "Broad setup with low-friction scholarly MCP records plus the full optional MCP catalog documented.",
      skill_bundles: ["academic_research", "default_complementary", "docling"],
      mcp_servers: ["arxiv", "dblp"]
    }
  },
  mcp_servers: {
    arxiv: {
      readiness: "low-friction",
      priority: "default",
      execution_mode: "uvx-runtime",
      source_need: "arXiv search, download, and local paper reading.",
      source: "blazickjp/arxiv-mcp-server",
      hosted_url: "",
      install_command: "uv tool install 'arxiv-mcp-server[pdf]'",
      uninstall_command: "uv tool uninstall arxiv-mcp-server",
      setup_commands: [],
      command: "uvx",
      args: ["--from", "arxiv-mcp-server[pdf]", "arxiv-mcp-server"],
      env: {},
      required_env: [],
      recommended_env: [],
      local_service: "",
      smoke_test: "For a computer science project, search one CS query, download one known paper, and read it locally.",
      risks: "Respect arXiv rate limits; paper text is untrusted input.",
      default_mode: "local",
      recommended_mode: "local",
      modes: {
        local: {
          connection_mode: "stdio-local"
        },
        "remote-custom": {
          connection_mode: "remote-custom",
          execution_mode: "remote-custom",
          install_command: "",
          uninstall_command: "",
          setup_commands: [],
          command: "",
          args: [],
          env: {},
          required_env: [],
          recommended_env: []
        }
      }
    },
    "semantic-scholar": {
      readiness: "credential-recommended",
      priority: "optional",
      execution_mode: "uvx-runtime",
      source_need: "Semantic Scholar papers, citations, authors, and recommendations.",
      source: "akapet00/semantic-scholar-mcp",
      hosted_url: "",
      install_command: "",
      uninstall_command: "",
      setup_commands: [],
      command: "uvx",
      args: ["--from", "git+https://github.com/akapet00/semantic-scholar-mcp", "semantic-scholar-mcp"],
      env: {},
      required_env: [],
      recommended_env: ["SEMANTIC_SCHOLAR_API_KEY"],
      smoke_test: "Search one known title, then fetch citations or references.",
      local_service: "",
      risks: "API key recommended for sustained work and to avoid shared-pool rate limits; metadata can be incomplete.",
      default_mode: "local",
      recommended_mode: "local",
      modes: {
        local: {
          connection_mode: "stdio-local"
        },
        "remote-custom": {
          connection_mode: "remote-custom",
          execution_mode: "remote-custom",
          install_command: "",
          uninstall_command: "",
          setup_commands: [],
          command: "",
          args: [],
          env: {},
          required_env: [],
          recommended_env: []
        }
      }
    },
    openalex: {
      readiness: "credential-required",
      priority: "optional",
      execution_mode: "npx-runtime",
      source_need: "OpenAlex broad scholarly graph.",
      source: "cyanheads/openalex-mcp-server",
      hosted_url: "",
      install_command: "",
      uninstall_command: "",
      setup_commands: [],
      command: "npx",
      args: ["-y", "@cyanheads/openalex-mcp-server@latest"],
      env: {},
      required_env: ["OPENALEX_API_KEY"],
      recommended_env: [],
      local_service: "",
      smoke_test: "Search works by title or DOI and confirm stable OpenAlex IDs.",
      risks: "The selected local server requires OPENALEX_API_KEY. OpenAlex keys are free and include a free daily quota; check current credit limits, smoke-test coverage, and inspect cost headers before high-volume work.",
      default_mode: "local",
      recommended_mode: "remote",
      modes: {
        local: {
          connection_mode: "stdio-local"
        },
        remote: {
          connection_mode: "remote-curated",
          execution_mode: "remote-curated",
          hosted_url: "https://openalex.caseyjhand.com/mcp",
          install_command: "",
          uninstall_command: "",
          setup_commands: [],
          command: "",
          args: [],
          env: {},
          required_env: [],
          recommended_env: [],
          smoke_test: "Connect the MCP client to the hosted streamable HTTP endpoint and run a read-only works search.",
          risks: "Hosted endpoint behavior, authentication, rate limits, and availability are controlled by the endpoint operator; verify current policy before sustained use."
        },
        "remote-custom": {
          connection_mode: "remote-custom",
          execution_mode: "remote-custom",
          hosted_url: "",
          install_command: "",
          uninstall_command: "",
          setup_commands: [],
          command: "",
          args: [],
          env: {},
          required_env: [],
          recommended_env: [],
          smoke_test: "Connect the MCP client to the custom streamable HTTP endpoint and run a read-only works search.",
          risks: "Custom endpoint behavior, authentication, rate limits, and availability are controlled by the endpoint operator; verify current policy before sustained use."
        }
      }
    },
    crossref: {
      readiness: "manual",
      priority: "manual",
      execution_mode: "manual",
      source_need: "DOI and publication metadata.",
      source: "manual selection required; candidate: AiAgentKarl/crossref-academic-mcp-server",
      hosted_url: "",
      install_command: "",
      uninstall_command: "",
      setup_commands: [],
      command: "",
      args: [],
      env: {},
      required_env: [],
      recommended_env: [],
      local_service: "",
      smoke_test: "Resolve one DOI into publication metadata after choosing a maintained local server.",
      risks: "Manual integration only; current zero-friction Crossref-only MCP candidates are less mature than arXiv, DBLP, PubMed, or OpenAlex.",
      default_mode: "manual",
      recommended_mode: "manual",
      modes: {
        manual: {
          connection_mode: "manual"
        }
      }
    },
    pubmed: {
      readiness: "domain-specific",
      priority: "domain-specific",
      execution_mode: "npx-runtime",
      source_need: "PubMed and biomedical literature.",
      source: "cyanheads/pubmed-mcp-server",
      hosted_url: "",
      install_command: "",
      uninstall_command: "",
      setup_commands: [],
      command: "npx",
      args: ["-y", "@cyanheads/pubmed-mcp-server@latest"],
      env: { MCP_TRANSPORT_TYPE: "stdio", MCP_LOG_LEVEL: "warning" },
      required_env: [],
      recommended_env: ["NCBI_API_KEY", "NCBI_ADMIN_EMAIL"],
      local_service: "",
      smoke_test: "Search one PMID or title and fetch metadata.",
      risks: "Domain-specific; observe NCBI rate limits. API key and contact email improve reliability.",
      default_mode: "local",
      recommended_mode: "remote",
      modes: {
        local: {
          connection_mode: "stdio-local"
        },
        remote: {
          connection_mode: "remote-curated",
          execution_mode: "remote-curated",
          hosted_url: "https://pubmed.caseyjhand.com/mcp",
          install_command: "",
          uninstall_command: "",
          setup_commands: [],
          command: "",
          args: [],
          env: {},
          required_env: [],
          recommended_env: [],
          smoke_test: "Connect the MCP client to the hosted streamable HTTP endpoint and run a read-only PubMed search.",
          risks: "Hosted endpoint behavior, authentication, NCBI policy handling, and availability are controlled by the endpoint operator; verify current policy before sustained use."
        },
        "remote-custom": {
          connection_mode: "remote-custom",
          execution_mode: "remote-custom",
          hosted_url: "",
          install_command: "",
          uninstall_command: "",
          setup_commands: [],
          command: "",
          args: [],
          env: {},
          required_env: [],
          recommended_env: [],
          smoke_test: "Connect the MCP client to the custom streamable HTTP endpoint and run a read-only PubMed search.",
          risks: "Custom endpoint behavior, authentication, NCBI policy handling, and availability are controlled by the endpoint operator; verify current policy before sustained use."
        }
      }
    },
    dblp: {
      readiness: "low-friction-cs",
      priority: "cs",
      execution_mode: "uvx-runtime",
      source_need: "DBLP computer science bibliography, venues, authors, and BibTeX.",
      source: "szeider/mcp-dblp",
      hosted_url: "",
      install_command: "",
      uninstall_command: "",
      setup_commands: [],
      command: "uvx",
      args: ["mcp-dblp"],
      env: {},
      required_env: [],
      recommended_env: [],
      local_service: "",
      smoke_test: "Search one known CS paper title and export or inspect its DBLP BibTeX.",
      risks: "CS-specific metadata source; use with arXiv/Semantic Scholar/OpenAlex for coverage beyond DBLP.",
      default_mode: "local",
      recommended_mode: "local",
      modes: {
        local: {
          connection_mode: "stdio-local"
        },
        "remote-custom": {
          connection_mode: "remote-custom",
          execution_mode: "remote-custom",
          install_command: "",
          uninstall_command: "",
          setup_commands: [],
          command: "",
          args: [],
          env: {},
          required_env: [],
          recommended_env: []
        }
      }
    },
    zotero: {
      readiness: "local-service",
      priority: "local-library",
      execution_mode: "local-service",
      source_need: "Zotero local library and attachments.",
      source: "eric-tramel/zoty",
      hosted_url: "",
      install_command: "",
      uninstall_command: "",
      setup_commands: ["uvx --refresh zoty setup", "uvx --refresh zoty doctor"],
      command: "uvx",
      args: ["zoty", "mcp"],
      env: {},
      required_env: [],
      recommended_env: [],
      local_service: "Zotero desktop running with local API enabled; Zoty Bridge required for attachment and collection write operations.",
      smoke_test: "List collections, search one known item, and export BibTeX.",
      risks: "Requires Zotero local API and bridge setup.",
      default_mode: "local",
      recommended_mode: "local",
      modes: {
        local: {
          connection_mode: "local-service"
        }
      }
    },
    overleaf: {
      readiness: "manual-credentialed",
      priority: "writing",
      execution_mode: "manual-local",
      source_need: "Overleaf project sync.",
      source: "YounesBensafia/overleaf-mcp-server",
      hosted_url: "",
      install_command: "",
      uninstall_command: "",
      setup_commands: [],
      command: ".academic-research/mcp/overleaf/run-overleaf-mcp.sh",
      args: [],
      env: {},
      required_env: ["OVERLEAF_TOKEN", "PROJECT_ID"],
      recommended_env: [],
      local_service: "Local clone of the Overleaf MCP server configured with uv and an Overleaf project that supports Git sync.",
      smoke_test: "List projects or read one .tex file; do not write by default.",
      risks: "Requires token and project setup; write/push access needs explicit approval.",
      default_mode: "local",
      recommended_mode: "local",
      modes: {
        local: {
          connection_mode: "manual-local"
        }
      }
    },
    "paper-search": {
      readiness: "fallback",
      priority: "fallback",
      execution_mode: "manual-fallback",
      source_need: "Multi-source paper search and download fallback across many scholarly sources.",
      source: "openags/paper-search-mcp",
      hosted_url: "",
      install_command: "",
      uninstall_command: "",
      setup_commands: [],
      command: "",
      args: [],
      env: {},
      required_env: [],
      recommended_env: [
        "PAPER_SEARCH_MCP_UNPAYWALL_EMAIL",
        "PAPER_SEARCH_MCP_SEMANTIC_SCHOLAR_API_KEY"
      ],
      local_service: "Manual review required before enabling; configure only permitted sources.",
      smoke_test: "Search one harmless query with a source allow-list and verify provenance for each result.",
      risks: "Powerful aggregator with optional restricted-source workflows; keep Sci-Hub or questionable download features disabled unless explicitly accepted.",
      default_mode: "manual",
      recommended_mode: "manual",
      modes: {
        manual: {
          connection_mode: "manual"
        }
      }
    }
  }
};

export function presetMcpServers(preset: string): string[] {
  const config = AGENT_STACK.presets[preset];
  if (!config) throw new Error(`unknown capability preset: ${preset}`);
  return [...config.mcp_servers];
}

export function resolveMcpServer(serverName: string, mode?: string): ResolvedMcpServer {
  const server = AGENT_STACK.mcp_servers[serverName];
  if (!server) throw new Error(`unknown MCP server: ${serverName}`);
  const selectedMode = normalizeMcpMode(serverName, mode);
  const variant = server.modes?.[selectedMode];
  return {
    ...server,
    ...variant,
    selected_mode: selectedMode,
    connection_mode: variant?.connection_mode ?? defaultConnectionMode(server.execution_mode)
  };
}

export function normalizeMcpMode(serverName: string, mode?: string): string {
  const server = AGENT_STACK.mcp_servers[serverName];
  if (!server) throw new Error(`unknown MCP server: ${serverName}`);
  const defaultMode = server.default_mode ?? "local";
  if (!mode) return defaultMode;
  const normalized = modeAlias(mode);
  if (server.modes?.[normalized]) return normalized;
  if (!server.modes && normalized === defaultMode) return defaultMode;
  throw new Error(
    `${serverName} does not support MCP mode ${mode}. Supported modes: ${mcpServerModeKeys(serverName).join(", ")}`
  );
}

export function mcpServerModeKeys(serverName: string): string[] {
  const server = AGENT_STACK.mcp_servers[serverName];
  if (!server) throw new Error(`unknown MCP server: ${serverName}`);
  return Object.keys(server.modes ?? { [server.default_mode ?? "local"]: { connection_mode: defaultConnectionMode(server.execution_mode) } });
}

export function mcpRecommendedMode(serverName: string): string {
  const server = AGENT_STACK.mcp_servers[serverName];
  if (!server) throw new Error(`unknown MCP server: ${serverName}`);
  return normalizeMcpMode(serverName, server.recommended_mode ?? server.default_mode);
}

export function mcpModeLabel(serverName: string, mode?: string): string {
  const server = resolveMcpServer(serverName, mode);
  if (server.selected_mode === "remote-custom") return "custom remote";
  if (server.connection_mode === "remote-curated") return "remote";
  if (server.connection_mode === "remote-custom") return "custom remote";
  if (server.connection_mode === "local-service") return "requires local app";
  if (server.connection_mode === "manual-local") return "manual setup";
  if (server.connection_mode === "manual") return "manual setup";
  return "local";
}

export function mcpModeKeyLabel(mode: string): string {
  if (mode === "remote-custom") return "custom remote";
  if (mode === "remote" || mode === "remote-curated" || mode === "http-remote") return "remote";
  if (mode === "local-service") return "requires local app";
  if (mode === "manual-local" || mode === "manual") return "manual setup";
  return "local";
}

export function mcpSupportedModeLabels(serverName: string): string[] {
  return mcpServerModeKeys(serverName).map((mode) => mcpModeLabel(serverName, mode));
}

export function modeAlias(mode: string): string {
  if (mode === "stdio-local" || mode === "manual-local" || mode === "local-service") return "local";
  if (mode === "http-remote" || mode === "remote-curated" || mode === "curated-remote") return "remote";
  if (mode === "custom-remote") return "remote-custom";
  return mode;
}

function defaultConnectionMode(executionMode: string): McpConnectionMode {
  if (executionMode === "uvx-runtime" || executionMode === "npx-runtime") return "stdio-local";
  if (executionMode === "local-service") return "local-service";
  if (executionMode === "manual-local") return "manual-local";
  return "manual";
}
