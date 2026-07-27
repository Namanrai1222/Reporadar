import { defineConfig } from "@playwright/test";

const PORT = Number(process.env.TEST_PORT ?? 3100);
export const BASE_URL = `http://127.0.0.1:${PORT}`;

/**
 * Two projects, because the suite proves two different kinds of claim:
 *
 *  - `unit`   — the security primitives in isolation (URL parsing, CSRF origin
 *               checks, env guards). Fast, no server, no network.
 *  - `api`    — the same guarantees enforced end-to-end over real HTTP against a
 *               production build, which is the only thing that proves a *route*
 *               rejects an attacker rather than just a helper function returning false.
 *
 * The API project builds and boots the app, so it is deliberately slower.
 */
export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: process.env.CI ? "list" : [["list"]],

  projects: [
    { name: "unit", testMatch: /unit\/.*\.spec\.ts/ },
    {
      name: "api",
      testMatch: /api\/.*\.spec\.ts/,
      use: { baseURL: BASE_URL },
    },
  ],

  // The unit project needs no server, and booting one would mean a full production
  // build for tests that only exercise pure functions. `npm run test:unit` sets
  // PW_NO_SERVER so that suite stays fast.
  webServer: process.env.PW_NO_SERVER
    ? undefined
    : {
        // Production build: `NODE_ENV=production` is what disables dev error
        // overlays and stack traces, and switches the CSP to strict `script-src 'self'`.
        command: `npm run build && npx next start --port ${PORT}`,
        url: `${BASE_URL}/api/health`,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
