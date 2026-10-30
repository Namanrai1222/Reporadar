/**
 * Repository structure for the architecture map: folders, their role, and the
 * files that explain how the project is set up. Built from the full file tree
 * (paths only), so it works for any language and whether or not anything was
 * flagged. Pure — also runs in the browser for reports saved before it existed.
 */

import type { Finding, Report } from "./types";

export type DirRole =
  | "source"
  | "app"
  | "api"
  | "components"
  | "lib"
  | "database"
  | "tests"
  | "docs"
  | "config"
  | "ci"
  | "assets"
  | "data"
  | "notebooks"
  | "models"
  | "scripts"
  | "infra"
  | "other";

export type KeyFileKind = "entry" | "manifest" | "config" | "ci" | "container" | "env" | "docs";

export interface LanguageCount {
  name: string;
  files: number;
}

export interface StructureDir {
  path: string;
  name: string;
  depth: 1 | 2;
  /** Files anywhere below this folder. */
  files: number;
  role: DirRole;
  languages: LanguageCount[];
  /** Subfolders not drawn because of the per-folder cap. */
  hiddenChildren: number;
}

export interface RepoStructure {
  totalFiles: number;
  rootFiles: number;
  dirs: StructureDir[];
  /** Top-level folders not drawn because of the cap. */
  hiddenDirs: number;
  keyFiles: Array<{ path: string; kind: KeyFileKind }>;
  languages: LanguageCount[];
}

// Generated or environment folders that say nothing about how the project is built.
const NOISE = /(^|\/)(__pycache__|\.ipynb_checkpoints|\.pytest_cache|\.mypy_cache|\.venv|venv|\.tox|\.idea)(\/|$)|\.pyc$|(^|\/)\.DS_Store$/;

const MAX_TOP_DIRS = 12;
const MAX_CHILDREN = 5;
const MAX_KEY_FILES = 24;

const ROLE_BY_NAME: Array<[DirRole, RegExp]> = [
  ["ci", /^\.(github|circleci|gitlab|buildkite)$/],
  ["tests", /^(tests?|__tests__|specs?|e2e|cypress|playwright)$/],
  ["docs", /^(docs?|documentation|wiki)$/],
  ["api", /^(api|server|backend|routes?|controllers?|handlers?|endpoints?)$/],
  ["app", /^(app|pages|views|screens|frontend|client|web)$/],
  ["components", /^(components?|ui|widgets|layouts?)$/],
  ["lib", /^(lib|libs|utils?|helpers?|core|common|shared|services?|pkg|internal|hooks|store|modules)$/],
  ["database", /^(db|database|migrations?|prisma|supabase|schema|sql|seeds?)$/],
  ["config", /^(config|configs|settings|conf|\.vscode|\.husky)$/],
  ["assets", /^(public|static|assets|images?|img|media|styles?|css|fonts)$/],
  ["notebooks", /^(notebooks?|nb|experiments?|research)$/],
  ["data", /^(data|datasets?|raw|processed|inputs?|fixtures)$/],
  ["models", /^(models?|checkpoints?|weights|artifacts|saved_models?)$/],
  ["scripts", /^(scripts?|bin|tools|cli|tasks)$/],
  ["infra", /^(docker|deploy(ment)?|infra|k8s|kubernetes|terraform|helm|\.devcontainer|ops)$/],
  ["source", /^(src|source|app_src|cmd)$/],
];

const KEY_FILES: Array<[KeyFileKind, RegExp]> = [
  ["ci", /^\.github\/workflows\/[^/]+\.ya?ml$/],
  ["manifest", /(^|\/)(package\.json|requirements[^/]*\.txt|pyproject\.toml|Pipfile|setup\.py|environment\.ya?ml|go\.mod|Cargo\.toml|pom\.xml|build\.gradle(\.kts)?|Gemfile|composer\.json)$/],
  ["container", /(^|\/)(Dockerfile[^/]*|docker-compose[^/]*\.ya?ml|compose\.ya?ml|Procfile|vercel\.json|netlify\.toml)$/],
  ["env", /(^|\/)\.env\.(example|sample|template)$/],
  ["config", /^(next|vite|webpack|tailwind|postcss|nuxt|svelte|astro|jest|vitest|playwright)\.config\.[cm]?[jt]s$|^(tsconfig\.json|setup\.cfg|tox\.ini|Makefile|\.eslintrc[^/]*|eslint\.config\.[cm]?js)$/],
  ["entry", /^(src\/)?(main|app|server|index|manage|run|wsgi|asgi|cli)\.(py|[cm]?[jt]sx?|go|rs)$|^(src\/)?app\/(layout|page)\.[jt]sx?$|^pages\/_app\.[jt]sx?$|^cmd\/[^/]+\/main\.go$/],
  ["docs", /^(README|CONTRIBUTING|ARCHITECTURE|LICENSE)(\.[a-z]+)?$/i],
];

const LANGUAGE_BY_EXT: Record<string, string> = {
  ts: "TypeScript", tsx: "TypeScript", mts: "TypeScript", cts: "TypeScript",
  js: "JavaScript", jsx: "JavaScript", mjs: "JavaScript", cjs: "JavaScript",
  py: "Python", ipynb: "Jupyter", go: "Go", rs: "Rust", java: "Java", kt: "Kotlin",
  rb: "Ruby", php: "PHP", cs: "C#", cpp: "C++", cc: "C++", c: "C", h: "C", swift: "Swift",
  dart: "Dart", scala: "Scala", vue: "Vue", svelte: "Svelte", html: "HTML", css: "CSS",
  scss: "CSS", sql: "SQL", sh: "Shell", md: "Markdown", mdx: "Markdown",
  json: "JSON", yml: "YAML", yaml: "YAML", toml: "TOML", csv: "Data", tsv: "Data", parquet: "Data",
};

export function languageOf(path: string): string | null {
  const base = path.split("/").pop() ?? "";
  if (/^Dockerfile/.test(base)) return "Docker";
  const ext = base.includes(".") ? base.split(".").pop()!.toLowerCase() : "";
  return LANGUAGE_BY_EXT[ext] ?? null;
}

export function roleOf(name: string): DirRole {
  const lower = name.toLowerCase();
  return ROLE_BY_NAME.find(([, pattern]) => pattern.test(lower))?.[0] ?? "other";
}

function topLanguages(counts: Map<string, number>, limit: number): LanguageCount[] {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([name, files]) => ({ name, files }));
}

export function buildStructure(paths: string[]): RepoStructure {
  const unique = [...new Set(paths.filter((p) => p && !NOISE.test(p)))];
  const dirFiles = new Map<string, number>();
  const dirLangs = new Map<string, Map<string, number>>();
  const repoLangs = new Map<string, number>();
  let rootFiles = 0;

  for (const path of unique) {
    const parts = path.split("/");
    const language = languageOf(path);
    if (language) repoLangs.set(language, (repoLangs.get(language) ?? 0) + 1);
    if (parts.length === 1) {
      rootFiles += 1;
      continue;
    }
    // Credit the file to its top-level folder and, when deeper, its second-level one.
    for (const dir of [parts[0], parts.length > 2 ? `${parts[0]}/${parts[1]}` : null]) {
      if (!dir) continue;
      dirFiles.set(dir, (dirFiles.get(dir) ?? 0) + 1);
      if (language) {
        const langs = dirLangs.get(dir) ?? new Map<string, number>();
        langs.set(language, (langs.get(language) ?? 0) + 1);
        dirLangs.set(dir, langs);
      }
    }
  }

  const bySize = (a: string, b: string) => (dirFiles.get(b) ?? 0) - (dirFiles.get(a) ?? 0) || a.localeCompare(b);
  const allTop = [...dirFiles.keys()].filter((d) => !d.includes("/")).sort(bySize);
  const top = allTop.slice(0, MAX_TOP_DIRS);

  const dirs: StructureDir[] = [];
  for (const parent of top) {
    const children = [...dirFiles.keys()].filter((d) => d.startsWith(`${parent}/`)).sort(bySize);
    const shown = children.slice(0, MAX_CHILDREN);
    const toDir = (path: string, depth: 1 | 2, hiddenChildren: number): StructureDir => {
      const name = path.split("/").pop()!;
      // A child folder named generically ("other") inherits its parent's role.
      const role = roleOf(name);
      return {
        path,
        name,
        depth,
        files: dirFiles.get(path) ?? 0,
        role: role === "other" && depth === 2 ? roleOf(parent) : role,
        languages: topLanguages(dirLangs.get(path) ?? new Map(), 3),
        hiddenChildren,
      };
    };
    dirs.push(toDir(parent, 1, children.length - shown.length));
    for (const child of shown) dirs.push(toDir(child, 2, 0));
  }

  const keyFiles: RepoStructure["keyFiles"] = [];
  for (const path of [...unique].sort((a, b) => a.split("/").length - b.split("/").length || a.localeCompare(b))) {
    const match = KEY_FILES.find(([, pattern]) => pattern.test(path));
    if (match) keyFiles.push({ path, kind: match[0] });
    if (keyFiles.length >= MAX_KEY_FILES) break;
  }

  return {
    totalFiles: unique.length,
    rootFiles,
    dirs,
    hiddenDirs: allTop.length - top.length,
    keyFiles,
    languages: topLanguages(repoLangs, 6),
  };
}

/** One-line plain-English description of each folder role, shown in the map's explainer. */
export const ROLE_INFO: Record<DirRole, { label: string; explains: string }> = {
  source: { label: "Source", explains: "Main source tree — most of the application code lives here." },
  app: { label: "App / pages", explains: "User-facing screens and routing: what a visitor actually loads." },
  api: { label: "API / server", explains: "Server-side endpoints and request handlers." },
  components: { label: "Components", explains: "Reusable UI building blocks shared across screens." },
  lib: { label: "Library", explains: "Shared logic, helpers and services the rest of the code calls into." },
  database: { label: "Database", explains: "Schema, migrations and data-access setup." },
  tests: { label: "Tests", explains: "Automated tests that check the code still works." },
  docs: { label: "Docs", explains: "Written documentation for contributors and users." },
  config: { label: "Config", explains: "Project and tooling configuration." },
  ci: { label: "CI / automation", explains: "Pipelines that build, test or deploy on every push." },
  assets: { label: "Assets", explains: "Static files served as-is: images, fonts, styles." },
  data: { label: "Data", explains: "Datasets and data files the project reads or produces." },
  notebooks: { label: "Notebooks", explains: "Exploratory notebooks and experiments." },
  models: { label: "Models", explains: "Trained models, weights and saved artifacts." },
  scripts: { label: "Scripts", explains: "One-off and developer scripts run from the command line." },
  infra: { label: "Infra", explains: "Containers and deployment configuration." },
  other: { label: "Folder", explains: "Project folder without a conventional name." },
};

export const KEY_FILE_LABEL: Record<KeyFileKind, string> = {
  entry: "Entry points",
  manifest: "Dependencies",
  config: "Tooling config",
  ci: "CI workflows",
  container: "Deploy / runtime",
  env: "Environment template",
  docs: "Docs",
};

/**
 * A report's structure. Reports saved before full-tree capture fall back to the
 * files we do know about (indexed and flagged), and say so via `partial`.
 */
export function reportStructure(report: Report): { structure: RepoStructure; partial: boolean } {
  if (report.structure) return { structure: report.structure, partial: false };
  const known = [
    ...report.nodes.flatMap((n) => (n.filePath ? [n.filePath] : [])),
    ...report.findings.map((f) => f.filePath),
  ];
  return { structure: buildStructure(known), partial: true };
}

/** Findings grouped by the top-level and second-level folder they sit in. */
export function findingsByDir(findings: Finding[]): Map<string, Finding[]> {
  const map = new Map<string, Finding[]>();
  const add = (dir: string, f: Finding) => map.set(dir, [...(map.get(dir) ?? []), f]);
  for (const f of findings) {
    const parts = f.filePath.split("/");
    if (parts.length >= 2) add(parts[0], f);
    if (parts.length >= 3) add(`${parts[0]}/${parts[1]}`, f);
  }
  return map;
}

/** Architecture layers, top (what users touch) to bottom (what keeps it shipping). */
export const LAYERS = [
  { id: "interface", label: "Interface", explains: "What people see and click.", roles: ["app", "components", "assets"] },
  { id: "logic", label: "Logic", explains: "Business rules, services and endpoints.", roles: ["source", "api", "lib", "scripts", "other"] },
  { id: "data", label: "Data", explains: "Storage, datasets and trained models.", roles: ["database", "data", "models", "notebooks"] },
  { id: "delivery", label: "Delivery", explains: "Tests, config and the path to production.", roles: ["tests", "ci", "infra", "config", "docs"] },
] as const satisfies ReadonlyArray<{ id: string; label: string; explains: string; roles: readonly DirRole[] }>;
