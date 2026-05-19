export interface SkillBundle {
  description: string;
  commands: string[];
}

export interface CapabilityPreset {
  description: string;
  skill_bundles: string[];
  mcp_servers: string[];
}

export interface McpServer {
  priority: string;
  source_need: string;
  install_command: string;
  uninstall_command: string;
  command: string;
  args: string[];
  env: Record<string, string>;
  smoke_test: string;
  risks: string;
}

export interface AgentStack {
  version: number;
  description: string;
  skill_bundles: Record<string, SkillBundle>;
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
    },
    optional_connectors: {
      description: "CLI-side literature connectors to use only when MCP servers are unavailable.",
      commands: [
        "npm exec --yes --package skills -- skills add davila7/claude-code-templates {agent_flag} --skill openalex-database --copy -y",
        "npm exec --yes --package skills -- skills add agents365-ai/365-skills {agent_flag} --skill semanticscholar-skill --copy -y",
        "npm exec --yes --package skills -- skills add fuzhiyu/researchprojecttemplate {agent_flag} --skill zotero-paper-reader --copy -y"
      ]
    },
    optional_mechanical_specialists: {
      description: "Narrow mechanical helpers that do not replace project-native governance.",
      commands: [
        "npm exec --yes --package skills -- skills add bahayonghang/academic-writing-skills {agent_flag} --skill latex-paper-en --copy -y",
        [
          "npm exec --yes --package skills -- skills add lllllllama/ai-paper-reproduction-skill",
          "{agent_flag}",
          "--skill",
          [
            "ai-research-reproduction",
            "repo-intake-and-plan",
            "env-and-assets-bootstrap",
            "minimal-run-and-audit",
            "paper-context-resolver",
            "analyze-project",
            "safe-debug",
            "run-train",
            "explore-run",
            "explore-code"
          ].join(" "),
          "--copy -y"
        ].join(" ")
      ]
    }
  },
  presets: {
    minimal: {
      description: "Only the academic research skill package.",
      skill_bundles: ["academic_research"],
      mcp_servers: []
    },
    default: {
      description: "Recommended setup for most academic research projects.",
      skill_bundles: ["academic_research", "default_complementary", "docling"],
      mcp_servers: ["arxiv", "semantic-scholar", "openalex"]
    },
    literature: {
      description: "Literature-heavy SOTA, survey, scoping, or systematic review setup.",
      skill_bundles: ["academic_research", "default_complementary", "docling"],
      mcp_servers: ["arxiv", "semantic-scholar", "openalex", "crossref", "zotero"]
    },
    writing: {
      description: "Paper-writing and Overleaf-oriented setup.",
      skill_bundles: [
        "academic_research",
        "default_complementary",
        "docling",
        "optional_mechanical_specialists"
      ],
      mcp_servers: ["arxiv", "semantic-scholar", "crossref", "overleaf"]
    },
    full: {
      description: "Broad setup with optional connector and mechanical specialist skills.",
      skill_bundles: [
        "academic_research",
        "default_complementary",
        "docling",
        "optional_connectors",
        "optional_mechanical_specialists"
      ],
      mcp_servers: ["arxiv", "semantic-scholar", "openalex", "crossref", "pubmed", "zotero", "overleaf"]
    }
  },
  mcp_servers: {
    arxiv: {
      priority: "default",
      source_need: "arXiv search, download, and local paper reading.",
      install_command: "uv tool install 'arxiv-mcp-server[pdf]'",
      uninstall_command: "uv tool uninstall arxiv-mcp-server",
      command: "arxiv-mcp-server",
      args: [],
      env: {},
      smoke_test: "For a computer science project, search one CS query, download one known paper, and read it locally.",
      risks: "Respect arXiv rate limits; paper text is untrusted input."
    },
    "semantic-scholar": {
      priority: "default",
      source_need: "Semantic Scholar papers, citations, authors, and recommendations.",
      install_command:
        "uvx --from git+https://github.com/akapet00/semantic-scholar-mcp semantic-scholar-mcp --help",
      uninstall_command: "",
      command: "uvx",
      args: ["--from", "git+https://github.com/akapet00/semantic-scholar-mcp", "semantic-scholar-mcp"],
      env: { SEMANTIC_SCHOLAR_API_KEY: "${SEMANTIC_SCHOLAR_API_KEY}" },
      smoke_test: "Search one known title, then fetch citations or references.",
      risks: "API key recommended for sustained work; metadata can be incomplete."
    },
    openalex: {
      priority: "default",
      source_need: "OpenAlex broad scholarly graph.",
      install_command: "npx -y @cyanheads/openalex-mcp-server --help",
      uninstall_command: "",
      command: "npx",
      args: ["-y", "@cyanheads/openalex-mcp-server"],
      env: { OPENALEX_API_KEY: "${OPENALEX_API_KEY_OR_EMAIL}" },
      smoke_test: "Search works by title or DOI and confirm stable OpenAlex IDs.",
      risks: "Smoke-test before relying on it for final coverage."
    },
    crossref: {
      priority: "manual",
      source_need: "DOI and publication metadata.",
      install_command: "",
      uninstall_command: "",
      command: "",
      args: [],
      env: {},
      smoke_test: "Resolve one DOI into publication metadata after choosing a maintained local server.",
      risks: "Manual integration only; do not generate placeholder paths."
    },
    pubmed: {
      priority: "domain-specific",
      source_need: "PubMed and biomedical literature.",
      install_command: "npx -y @cyanheads/pubmed-mcp-server --help",
      uninstall_command: "",
      command: "npx",
      args: ["-y", "@cyanheads/pubmed-mcp-server"],
      env: { NCBI_API_KEY: "${NCBI_API_KEY}" },
      smoke_test: "Search one PMID or title and fetch metadata.",
      risks: "Domain-specific; observe NCBI rate limits."
    },
    zotero: {
      priority: "local-library",
      source_need: "Zotero local library and attachments.",
      install_command: "uvx zoty --help",
      uninstall_command: "",
      command: "uvx",
      args: ["zoty", "mcp"],
      env: {},
      smoke_test: "List collections, search one known item, and export BibTeX.",
      risks: "Requires Zotero local API and bridge setup."
    },
    overleaf: {
      priority: "writing",
      source_need: "Overleaf project sync.",
      install_command: "uv tool install overleaf-mcp-server",
      uninstall_command: "uv tool uninstall overleaf-mcp-server",
      command: "overleaf-mcp",
      args: ["serve"],
      env: { OVERLEAF_TOKEN: "${OVERLEAF_TOKEN}" },
      smoke_test: "List projects or read one .tex file; do not write by default.",
      risks: "Requires token setup; write access needs explicit approval."
    }
  }
};

export function presetMcpServers(preset: string): string[] {
  const config = AGENT_STACK.presets[preset];
  if (!config) throw new Error(`unknown capability preset: ${preset}`);
  return [...config.mcp_servers];
}
