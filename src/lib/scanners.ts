import type { CodeEdge, CodeNode, Finding, RepoFile } from "./types";
import { maskEvidence, normalizeRepoPath } from "./security";

const SECRET_PATTERNS = [
  /sk-(live|test|proj)-[A-Za-z0-9_-]{12,}/,
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /AKIA[0-9A-Z]{16}/,
  /AIza[0-9A-Za-z_-]{20,}/,
  /xox[baprs]-[0-9A-Za-z-]{12,}/,
  /-----BEGIN (RSA |EC |OPENSSH |)?PRIVATE KEY-----/,
  /(postgres|mysql):\/\/[^\s"'`]+/,
  /mongodb\+srv:\/\/[^\s"'`]+/,
];

const ENV_USAGE = /(?:process\.env\.|import\.meta\.env\.)([A-Z0-9_]+)/g;
const FRONTEND_FILE = /(app|pages|components|src\/components|src\/app).*\.(tsx|jsx|ts|js)$/;
const ROUTE_FILE = /(app\/api\/.*\/route\.(ts|js)|pages\/api\/.*\.(ts|js)|server\/routes\/.*\.(ts|js))/;
const FETCH_CALL = /(?:fetch|axios\.(?:get|post|put|patch|delete))\(\s*["'`]([^"'`]+)["'`]/g;

export function analyzeFiles(files: RepoFile[]) {
  const safeFiles = files.map((file) => ({
    ...file,
    path: normalizeRepoPath(file.path),
  }));

  const findings: Finding[] = [];
  const nodes: CodeNode[] = [];
  const edges: CodeEdge[] = [];
  const envUsed = new Map<string, string[]>();
  const documentedEnv = new Set<string>();
  const routes = new Map<string, string>();
  const frontendCalls: Array<{ route: string; filePath: string; lineNumber: number }> = [];

  for (const file of safeFiles) {
    if (isEnvExample(file.path) || /README\.md$/i.test(file.path)) {
      for (const envName of extractEnvNames(file.content)) {
        documentedEnv.add(envName);
      }
    }

    if (ROUTE_FILE.test(file.path)) {
      const route = routeFromFile(file.path);
      routes.set(route, file.path);
      nodes.push({
        id: `route:${route}`,
        type: "api_route",
        label: route,
        layer: "application",
        filePath: file.path,
      });
    }

    if (FRONTEND_FILE.test(file.path)) {
      nodes.push({
        id: `file:${file.path}`,
        type: file.content.includes("use client") ? "client_page" : "file",
        label: readableFileLabel(file.path),
        layer: "client",
        filePath: file.path,
      });
    }

    const lines = file.content.split(/\r?\n/);
    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      for (const pattern of SECRET_PATTERNS) {
        if (pattern.test(line)) {
          findings.push(finding("RR-SEC-001", "secret_leak", "critical", "medium", file.path, lineNumber, line));
        }
      }

      for (const envName of line.matchAll(ENV_USAGE)) {
        const name = envName[1];
        envUsed.set(name, [...(envUsed.get(name) ?? []), file.path]);
        nodes.push({
          id: `env:${name}`,
          type: "env_var",
          label: name,
          layer: name.startsWith("NEXT_PUBLIC_") || name.startsWith("VITE_") ? "client" : "data",
          filePath: file.path,
        });

        if (isFrontendSecretExposure(file.path, name, file.content)) {
          findings.push({
            id: `finding-${findings.length + 1}`,
            ruleId: "RR-SEC-002",
            category: "frontend_secret_exposure",
            severity: "high",
            confidence: "high",
            title: "Secret-like environment variable may be exposed to the browser",
            filePath: file.path,
            lineNumber,
            evidence: maskEvidence(line),
            explanation:
              "Frontend-accessible environment variables are bundled into client code. Secret-bearing names should stay server-only.",
            suggestedFix:
              "Move this value to a server-only environment variable and access it from a protected backend route.",
            status: "open",
            relatedNodeIds: [`env:${name}`, `file:${file.path}`],
          });
        }
      }

      for (const call of line.matchAll(FETCH_CALL)) {
        const route = call[1].split("?")[0];
        if (route.startsWith("/api/")) {
          frontendCalls.push({ route, filePath: file.path, lineNumber });
        }
      }
    });

    addHeuristicFindings(file, findings);
  }

  for (const [envName, paths] of envUsed) {
    if (!documentedEnv.has(envName)) {
      findings.push({
        id: `finding-${findings.length + 1}`,
        ruleId: "RR-SEC-003",
        category: "missing_env_documentation",
        severity: "low",
        confidence: "high",
        title: "Environment variable is used but not documented",
        filePath: paths[0],
        lineNumber: 1,
        evidence: envName,
        explanation:
          "Missing environment documentation slows onboarding and increases the chance of unsafe local configuration.",
        suggestedFix: "Add this variable to .env.example or the README setup section without exposing the real value.",
        status: "open",
        relatedNodeIds: [`env:${envName}`],
      });
    }
  }

  for (const call of frontendCalls) {
    const matched = [...routes.keys()].some((route) => route === call.route || route.replace(/\[.+?\]/g, ":param") === call.route);
    edges.push({
      from: `file:${call.filePath}`,
      to: `route:${call.route}`,
      type: "calls",
      label: "calls",
    });

    if (!matched) {
      findings.push({
        id: `finding-${findings.length + 1}`,
        ruleId: "RR-SEC-004",
        category: "broken_api_link",
        severity: "medium",
        confidence: "high",
        title: "Frontend API call has no matching backend route",
        filePath: call.filePath,
        lineNumber: call.lineNumber,
        evidence: call.route,
        explanation:
          "The frontend references an API route that static route mapping could not find. This may break user flows or hide dead code.",
        suggestedFix: "Create the matching route, correct the URL, or remove the stale client call.",
        status: "open",
        relatedNodeIds: [`file:${call.filePath}`, `route:${call.route}`],
      });
    }
  }

  const dedupedNodes = Array.from(new Map(nodes.map((node) => [node.id, node])).values());
  const enrichedNodes = dedupedNodes.map((node) => {
    const related = findings.filter((findingItem) => findingItem.relatedNodeIds.includes(node.id));
    const worst = related.sort((a, b) => severityWeight(b.severity) - severityWeight(a.severity))[0];
    return worst ? { ...node, riskLevel: worst.severity } : node;
  });

  return {
    findings,
    nodes: enrichedNodes,
    edges,
    envUsed,
    routes,
  };
}

function addHeuristicFindings(file: RepoFile, findings: Finding[]) {
  if (!ROUTE_FILE.test(file.path)) {
    return;
  }

  const content = file.content;
  const mutates = /\b(POST|PUT|PATCH|DELETE)\b|\.delete\(|\.update\(|\.create\(|request\.json\(\)/i.test(content);
  const hasAuth = /(auth\(|getServerSession|requireAuth|verifyToken|jwt\.verify|supabase\.auth\.getUser|middleware)/.test(content);
  const hasValidation = /(zod|yup|joi|schema\.parse|safeParse|validate\()/i.test(content);

  if (mutates && !hasAuth) {
    findings.push({
      id: `finding-${findings.length + 1}`,
      ruleId: "RR-SEC-014",
      category: "auth",
      severity: "high",
      confidence: "medium",
      title: "Sensitive route has no obvious local authentication check",
      filePath: file.path,
      lineNumber: firstLine(content, /request\.json\(\)|\.delete\(|\.update\(|\.create\(/),
      evidence: "No obvious auth helper detected before a mutating operation.",
      explanation:
        "This is a heuristic finding. Middleware may still protect the route, but destructive handlers should be reviewed.",
      suggestedFix: "Confirm middleware coverage or add an explicit server-side user and role check in this route.",
      status: "open",
      relatedNodeIds: [`route:${routeFromFile(file.path)}`],
    });
  }

  if (mutates && !hasValidation) {
    findings.push({
      id: `finding-${findings.length + 1}`,
      ruleId: "RR-SEC-015",
      category: "validation",
      severity: "medium",
      confidence: "medium",
      title: "Route reads user-controlled input without an obvious validation signal",
      filePath: file.path,
      lineNumber: firstLine(content, /request\.json\(\)|req\.body|searchParams|params/),
      evidence: "No zod/yup/joi/schema validation signal detected.",
      explanation:
        "User-controlled input should be validated before database writes, external requests, or authorization decisions.",
      suggestedFix: "Validate request bodies, params, and search params with a schema before use.",
      status: "open",
      relatedNodeIds: [`route:${routeFromFile(file.path)}`],
    });
  }

  if (/`[^`]*(SELECT|UPDATE|DELETE|INSERT)[^`]*\$\{[^}]+}/i.test(content)) {
    findings.push({
      id: `finding-${findings.length + 1}`,
      ruleId: "RR-SEC-020",
      category: "sql_injection",
      severity: "high",
      confidence: "medium",
      title: "Possible SQL injection from interpolated raw SQL",
      filePath: file.path,
      lineNumber: firstLine(content, /SELECT|UPDATE|DELETE|INSERT/i),
      evidence: "SQL template string contains interpolation.",
      explanation: "Interpolated SQL can let user-controlled values alter query structure.",
      suggestedFix: "Use parameterized queries, ORM query builders, or prepared statements.",
      status: "open",
      relatedNodeIds: [`route:${routeFromFile(file.path)}`],
    });
  }

  if (/Access-Control-Allow-Origin["']?\s*:\s*["']\*|origin\s*:\s*["']\*["']|cors\(\s*\)/i.test(content)) {
    findings.push({
      id: `finding-${findings.length + 1}`,
      ruleId: "RR-SEC-030",
      category: "cors",
      severity: /credentials\s*:\s*true/i.test(content) ? "high" : "medium",
      confidence: "medium",
      title: "Permissive CORS configuration detected",
      filePath: file.path,
      lineNumber: firstLine(content, /cors|Access-Control-Allow-Origin|origin/i),
      evidence: "Wildcard CORS signal detected.",
      explanation: "Wildcard origins can expose API surfaces more broadly than intended.",
      suggestedFix: "Replace wildcard CORS with an explicit allowlist of trusted origins.",
      status: "open",
      relatedNodeIds: [`route:${routeFromFile(file.path)}`],
    });
  }
}

function finding(
  ruleId: Finding["ruleId"],
  category: Finding["category"],
  severity: Finding["severity"],
  confidence: Finding["confidence"],
  filePath: string,
  lineNumber: number,
  line: string,
): Finding {
  return {
    id: `finding-${filePath}-${lineNumber}-${ruleId}`.replace(/[^A-Za-z0-9_-]/g, "-"),
    ruleId,
    category,
    severity,
    confidence,
    title: "Possible committed secret in source",
    filePath,
    lineNumber,
    evidence: maskEvidence(line.trim()),
    explanation:
      "A deterministic scanner matched a known secret-like token pattern. RepoRadar does not validate whether the credential is active.",
    suggestedFix: "Rotate the credential if real, remove it from git history, and load it from server-only environment variables.",
    status: "open",
    relatedNodeIds: [`file:${filePath}`],
  };
}

function isFrontendSecretExposure(path: string, envName: string, content: string) {
  const frontendContext = FRONTEND_FILE.test(path) || content.includes("use client");
  const secretName = /(SECRET|TOKEN|KEY|PASSWORD|DATABASE|PRIVATE|SERVICE_ROLE)/i.test(envName);
  const publicPrefix = /^(NEXT_PUBLIC_|VITE_|REACT_APP_)/.test(envName);
  return frontendContext && secretName && publicPrefix;
}

function extractEnvNames(content: string) {
  return Array.from(new Set([...content.matchAll(/[A-Z][A-Z0-9_]{2,}/g)].map((match) => match[0])));
}

function isEnvExample(path: string) {
  return /(^|\/)\.env\.(example|sample)$|(^|\/)env\.example$/i.test(path);
}

function routeFromFile(path: string) {
  if (path.startsWith("app/api/")) {
    return `/${path.replace(/^app\/api\//, "api/").replace(/\/route\.(ts|js)$/, "")}`;
  }

  if (path.startsWith("pages/api/")) {
    return `/${path.replace(/^pages\//, "").replace(/\.(ts|js)$/, "")}`;
  }

  return `/${path.replace(/\.(ts|js)$/, "")}`;
}

function readableFileLabel(path: string) {
  return path.split("/").slice(-2).join("/");
}

function firstLine(content: string, pattern: RegExp) {
  const index = content.split(/\r?\n/).findIndex((line) => pattern.test(line));
  return index >= 0 ? index + 1 : 1;
}

function severityWeight(severity: Finding["severity"]) {
  return { critical: 5, high: 4, medium: 3, low: 2, info: 1 }[severity];
}

