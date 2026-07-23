export type Severity = "critical" | "high" | "medium" | "low" | "info";

export type Confidence = "high" | "medium" | "low";

export type FindingStatus = "open" | "reviewed" | "ignored";

export type ScanMode = "full-map" | "security-lens" | "onboarding";

export type ScanStage =
  | "validating"
  | "indexing"
  | "detecting_structure"
  | "mapping_relations"
  | "scanning_security"
  | "building_report"
  | "explaining_optional"
  | "complete";

export interface RepoIdentity {
  owner: string;
  name: string;
  branch: string;
  url: string;
  description?: string;
  primaryLanguage?: string;
  stars?: number;
  forks?: number;
}

export interface RepoFile {
  path: string;
  content: string;
  size: number;
  language: string;
}

export interface CodeNode {
  id: string;
  type:
    | "client_page"
    | "api_route"
    | "service"
    | "database"
    | "env_var"
    | "external_api"
    | "file";
  label: string;
  layer: "client" | "application" | "data" | "external";
  filePath?: string;
  riskLevel?: Severity;
}

export interface CodeEdge {
  from: string;
  to: string;
  type: "imports" | "calls" | "reads_env" | "writes_database" | "external_request" | "risky_path";
  label: string;
}

export interface Finding {
  id: string;
  ruleId: string;
  category:
    | "secret_leak"
    | "frontend_secret_exposure"
    | "missing_env_documentation"
    | "broken_api_link"
    | "auth"
    | "validation"
    | "sql_injection"
    | "cors"
    | "debug_config"
    | "dependency"
    | "prompt_injection";
  severity: Severity;
  confidence: Confidence;
  title: string;
  filePath: string;
  lineNumber: number;
  evidence: string;
  explanation: string;
  suggestedFix: string;
  status: FindingStatus;
  relatedNodeIds: string[];
}

export interface RiskPath {
  id: string;
  severity: Severity;
  title: string;
  path: string[];
  findingId: string;
  assessment: string;
}

export interface Report {
  id: string;
  repo: RepoIdentity;
  mode: ScanMode;
  createdAt: string;
  stack: string[];
  coverage: {
    filesFound: number;
    filesAnalyzed: number;
    filesIgnored: number;
    scannersCompleted: number;
    maskedSecrets: number;
  };
  nodes: CodeNode[];
  edges: CodeEdge[];
  findings: Finding[];
  riskPaths: RiskPath[];
  markdown: string;
}

export interface ScanRequest {
  githubUrl: string;
  branch?: string;
  mode: ScanMode;
  includeDependencyAdvisories: boolean;
}

