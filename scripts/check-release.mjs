import { readFile } from "node:fs/promises";

const root = new URL("..", import.meta.url);
const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME ?? "";
const errors = [];

if (!/^v\d+\.\d+\.\d+$/.test(tag)) {
  errors.push(`release tag must match vX.Y.Z, got ${tag || "<empty>"}`);
}

const version = tag.replace(/^v/, "");
const packageJson = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const packageLock = JSON.parse(await readFile(new URL("package-lock.json", root), "utf8"));

if (packageJson.version !== version) {
  errors.push(`package.json version ${packageJson.version} does not match tag ${tag}`);
}

if (packageLock.version !== version) {
  errors.push(`package-lock.json version ${packageLock.version} does not match tag ${tag}`);
}

if (packageLock.packages?.[""]?.version !== version) {
  errors.push(`package-lock root package version ${packageLock.packages?.[""]?.version} does not match tag ${tag}`);
}

if (packageJson.name !== "create-academic-research") {
  errors.push(`unexpected package name ${packageJson.name}`);
}

if (packageJson.publishConfig?.access !== "public") {
  errors.push("package.json publishConfig.access must be public");
}

if (packageJson.publishConfig?.provenance !== true) {
  errors.push("package.json publishConfig.provenance must be true");
}

if (errors.length > 0) {
  console.error("Release check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`OK: release ${tag} matches package version ${version}`);
