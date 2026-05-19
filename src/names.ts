const PYTHON_KEYWORDS = new Set([
  "false",
  "none",
  "true",
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield"
]);

export function slugify(value: unknown): string {
  const slug = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "academic-research-project";
}

export function packageify(value: unknown): string {
  let packageName = String(value ?? "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  if (!packageName) packageName = "academic_research_project";
  if (/^[0-9]/.test(packageName)) packageName = `project_${packageName}`;
  if (PYTHON_KEYWORDS.has(packageName)) packageName = `${packageName}_project`;
  return packageName;
}

export function titleFromSlug(value: unknown): string {
  const words = String(value ?? "")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => `${word[0]?.toUpperCase() ?? ""}${word.slice(1)}`);
  return words.join(" ") || "Academic Research Project";
}
