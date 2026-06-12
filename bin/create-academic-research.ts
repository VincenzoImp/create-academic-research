#!/usr/bin/env node
import * as p from "@clack/prompts";
import { basename, resolve } from "node:path";
import { createProject } from "../src/scaffold.js";

interface CliArgs {
  target?: string;
  yes: boolean;
  installSkills: boolean;
  git: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { yes: false, installSkills: true, git: true };
  for (const a of argv) {
    if (a === "--yes" || a === "-y") args.yes = true;
    else if (a === "--no-install-skills") args.installSkills = false;
    else if (a === "--no-git") args.git = false;
    else if (a.startsWith("-")) throw new Error(`unknown flag: ${a}`);
    else if (!args.target) args.target = a;
    else throw new Error(`unexpected argument: ${a}`);
  }
  return args;
}

async function guard<T>(value: Promise<T | symbol>): Promise<T> {
  const v = await value;
  if (p.isCancel(v)) {
    p.cancel("cancelled");
    process.exit(1);
  }
  return v as T;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  let target = args.target;
  let title: string;
  let topic: string;
  let optionalMcps: string[];
  let installSkills = args.installSkills;

  if (args.yes) {
    if (!target) throw new Error("--yes requires a target directory argument");
    title = basename(resolve(target));
    topic = "Academic research project";
    optionalMcps = ["openalex"];
  } else {
    p.intro("create-academic-research v0.2");
    if (!target) {
      target = String(
        await guard(p.text({ message: "Project directory", placeholder: "my-research" }))
      );
    }
    title = String(
      await guard(p.text({ message: "Project title", initialValue: basename(resolve(target)) }))
    );
    topic = String(await guard(p.text({ message: "One-line research topic" })));
    optionalMcps = (await guard(
      p.multiselect({
        message: "Optional MCP servers (arxiv, semantic-scholar, dblp are always on)",
        options: [
          { value: "openalex", label: "openalex — cross-discipline coverage (needs OPENALEX_API_KEY)" },
          { value: "zotero", label: "zotero — read-only Zotero mirror (needs desktop app + zoty)" },
          { value: "overleaf", label: "overleaf — external LaTeX project (manual setup, README docs only)" }
        ],
        initialValues: ["openalex"],
        required: false
      })
    )) as string[];
    if (installSkills) {
      installSkills = Boolean(
        await guard(
          p.confirm({
            message: "Install companion skills (academic-research-skills)?",
            initialValue: true
          })
        )
      );
    }
  }

  createProject({ target, title, topic, optionalMcps, installSkills, git: args.git });

  const next = [
    `created ${resolve(target)}`,
    "next steps:",
    "  1. cp .env.example .env   # add API keys (recommended)",
    "  2. make check",
    "  3. open the project with your agent and start with the explore-sota skill"
  ].join("\n");
  if (args.yes) console.log(next);
  else p.outro(next);
}

main().catch((error: unknown) => {
  console.error(String(error instanceof Error ? error.message : error));
  process.exit(1);
});
