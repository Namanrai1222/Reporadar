const { chromium } = require('playwright');
const path = require('path');

const REPORT_DATA = {
  id: "demo-test",
  repo: { owner: "vercel", name: "next.js", branch: "main", url: "https://github.com/vercel/next.js", description: "The React Framework", primaryLanguage: "TypeScript", stars: 128000, forks: 27000 },
  mode: "security-lens",
  createdAt: "2026-07-22T00:00:00Z",
  stack: ["Next.js", "TypeScript"],
  coverage: { filesFound: 124, filesAnalyzed: 80, filesIgnored: 44, scannersCompleted: 10, maskedSecrets: 2 },
  nodes: [
    { id: "file:app/dashboard/page.tsx", type: "client_page", label: "dashboard/page.tsx", layer: "client", filePath: "app/dashboard/page.tsx" },
    { id: "route:/api/users", type: "api_route", label: "/api/users", layer: "application", filePath: "app/api/users/route.ts" }
  ],
  edges: [],
  findings: [{ id: "f1", ruleId: "RR-SEC-001", category: "secret_leak", severity: "critical", confidence: "high", title: "Possible committed secret", filePath: "src/lib/config.ts", lineNumber: 1, evidence: "sk-live-12345...abcd", explanation: "A secret was found", suggestedFix: "Rotate and remove", status: "open", relatedNodeIds: [] }],
  riskPaths: [{ id: "rp1", severity: "critical", title: "Secret in source", path: ["repository source", "src/lib/config.ts", "RR-SEC-001"], findingId: "f1", assessment: "High risk" }],
  markdown: "# Report"
};

const REPORT_URL = "http://localhost:3000/report/demo-report-id?data=" + encodeURIComponent(JSON.stringify(REPORT_DATA));
const OUTPUT_DIR = "C:\\Users\\LENOVO\\.gemini\\antigravity\\brain\\2b47a36f-4299-4aba-b94b-938bcb671a1c";

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log("Navigating to homepage...");
  await page.goto("http://localhost:3000", { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshot_homepage.png") });
  console.log("Homepage screenshot saved");

  console.log("Navigating to report...");
  await page.goto(REPORT_URL, { waitUntil: "networkidle", timeout: 30000 });
  await page.waitForTimeout(5000);
  await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshot_report_overview.png") });
  console.log("Report overview saved");

  console.log("Looking for Findings tab...");
  const allText = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll("button, a, [role=tab]"));
    return els.map(el => el.textContent.trim()).filter(t => t.length > 0);
  });
  console.log("Clickable elements:", JSON.stringify(allText.slice(0, 30)));

  try {
    const tab = page.locator("button:has-text('Findings'), [role=tab]:has-text('Findings'), a:has-text('Findings')").first();
    await tab.click({ timeout: 5000 });
    await page.waitForTimeout(2000);
    console.log("Clicked Findings tab");
  } catch(e) {
    console.log("Could not click findings tab:", e.message);
  }
  await page.screenshot({ path: path.join(OUTPUT_DIR, "screenshot_findings_tab.png") });
  console.log("Findings tab screenshot saved");

  await browser.close();
  console.log("Done!");
}

run().catch(e => { console.error(e); process.exit(1); });
