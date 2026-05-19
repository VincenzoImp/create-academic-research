import { createInterface } from "node:readline/promises";
import type { Interface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

export interface CreatePromptDefaults {
  title: string;
  slug: string;
  packageName: string;
  preset: string;
  agent: string;
  installSkills: boolean;
  installMcpTools: boolean;
}

export interface CreatePromptAnswers extends CreatePromptDefaults {
  installSkills: boolean;
  installMcpTools: boolean;
}

export interface CreatePromptLocks {
  installSkills?: boolean;
  installMcpTools?: boolean;
}

export async function askCreateOptions(
  defaults: CreatePromptDefaults,
  locks: CreatePromptLocks = {}
): Promise<CreatePromptAnswers> {
  const rl = createInterface({ input, output });
  try {
    const title = await question(rl, "Project title", defaults.title);
    const slug = await question(rl, "Project slug", defaults.slug);
    const packageName = await question(rl, "Python package", defaults.packageName);
    const preset = await question(rl, "Capability preset", defaults.preset);
    const agent = await question(rl, "Agent target", defaults.agent);
    const installSkills =
      locks.installSkills ?? (await yesNo(rl, "Install project-local skills now", defaults.installSkills));
    const installMcpTools =
      locks.installMcpTools ?? (await yesNo(rl, "Run external MCP installers now", defaults.installMcpTools));
    return { title, slug, packageName, preset, agent, installSkills, installMcpTools };
  } finally {
    rl.close();
  }
}

async function question(rl: Interface, prompt: string, fallback: string): Promise<string> {
  const answer = await rl.question(`${prompt} [${fallback}]: `);
  return answer.trim() || fallback;
}

async function yesNo(rl: Interface, prompt: string, fallback: boolean): Promise<boolean> {
  const label = fallback ? "Y/n" : "y/N";
  const answer = (await rl.question(`${prompt} [${label}]: `)).trim().toLowerCase();
  if (!answer) return fallback;
  return ["y", "yes", "s", "si", "sì"].includes(answer);
}
