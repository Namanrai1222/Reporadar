# RepoRadar

**AI-powered code intelligence platform** that scans public GitHub repositories to surface security risks, map architecture, and generate onboarding documentation - automatically.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-92%25-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-3ECF8E)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Tests-Playwright-2EAD33)](https://playwright.dev/)

## Overview

RepoRadar takes a public GitHub repo URL and runs deterministic static-analysis scanners across the codebase to:

- Generate an **interactive code map** of modules and dependencies
- Detect **security vulnerabilities** and flag risky patterns
- Identify **leaked secrets** (API keys, tokens) committed to history
- Map **API dependencies** and environment-variable usage
- Produce **AI-generated onboarding docs** - a plain-English synthesis of what the scanners found, written by a hosted LLM (Groq/OpenRouter/Ollama, with automatic fallback)

Scan results, not raw source code, are sent to the LLM - the model never sees your code, only masked findings.

## Why I built this

Reviewing an unfamiliar codebase before a PR, an audit, or an interview take-home is slow. RepoRadar automates the first hour of that process: it tells you what's risky, what's connected to what, and where to start reading.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS |
| Visualization | React Three Fiber / Drei (3D code map), @xyflow/react (dependency graphs), Framer Motion, GSAP |
| Backend / Auth | Supabase (Postgres, Row-Level Security, Auth - Google & email login) |
| LLM Inference | Groq / OpenRouter / Ollama, with key-rotation and automatic provider fallback |
| Caching / Rate limiting | Upstash Redis (optional, for distributed limits) |
| Testing | Playwright (unit + API/security test projects) |

## Architecture Highlights

- **Defense-in-depth data access**: row ownership enforced in application code via a `requireUserId` guard, backed by Postgres RLS policies as a secondary gate - documented tradeoff, not an oversight.
- **Resilient LLM layer**: round-robins across multiple API keys per provider, and falls back Groq -> OpenRouter -> Ollama -> deterministic mock summary, so a scan never hard-fails on a rate limit.
- **Progressive setup**: the app runs fully anonymously with zero configuration (mocked synthesis, 3 scans/day), then layers in persistence, OAuth, and real LLM synthesis as keys are added - see `SETUP.md`.
- **No source code retention**: only masked findings and generated reports are persisted.

## Getting Started

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` - the app runs with zero API keys (anonymous scans, mock synthesis). Check `/api/health` to see what's wired up.

For full backend setup (Supabase, LLM providers, OAuth, Redis), see [`SETUP.md`](./SETUP.md).

## Testing

```bash
npm run lint          # ESLint
npm run typecheck     # TypeScript
npm run test:unit     # Playwright unit tests
npm run test:security # API/security test suite
```

## Roadmap

- [ ] Public deployment with live demo link
- [ ] Support for private repos via GitHub App installation
- [ ] Exportable PDF onboarding reports

## License

MIT
