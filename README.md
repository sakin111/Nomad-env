# Nomad-env

Auto-generate TypeScript autocomplete for environment variables from .env files

A zero-config CLI tool that automatically generates type-safe environment variable definitions from your `.env` files. Nomad-env provides full TypeScript/JavaScript IntelliSense support, eliminating runtime errors caused by missing or misspelled environment variables.

---

## Key Features

- **Full TypeScript Autocomplete** - Get IntelliSense for all environment variables
- **Zero Configuration** - Works out-of-the-box with sensible defaults
- **Live Reload** - Watch mode automatically regenerates types when `.env` files change
- **Framework Agnostic** - Works with Next.js, Vite, Express, NestJS, Bun, and more
- **Type-Safe** - Catch environment variable errors at compile time, not runtime
- **Smart Output Detection** - Automatically places generated files in `src/` if it exists
- **Required Variable Validation** - Fail fast with a clear error when a required variable is missing
- **Rich Types** - Declare `url` and `enum(...)` types, not just string/number/boolean
- **Works on Vercel, Render, Netlify, and CI** - Falls back to `process.env` automatically when no `.env` file is present
- **Schema Drift Detection** - `nomad-env check` flags undocumented keys and vars missing from `.env.example`
- **Secret Exposure Warnings** - Flags publicly-exposed keys (`NEXT_PUBLIC_`, `VITE_`, etc.) that look like secrets

---

## Installation

```bash
npm install --save-dev nomad-env
```

---

## Quick Start: Two Usage Patterns

### Pattern 1: Dynamic Runtime Loading (Development)

Use this approach when you need to load environment variables at runtime with full type checking:

```ts
import { nomad, init } from "nomad-env";

// Initialize and load environment variables
await init(); 

// Type-safe access to environment variables
const databaseUrl = nomad.DATABASE_URL;
const apiKey = nomad.API_KEY;

console.log(`Connected to: ${databaseUrl}`);
console.log(`Using API Key: ${apiKey}`);
```

**Best for:**
- Development workflows with dotenv
- Applications that load configuration at startup
- Runtime environment variable validation

---

### Pattern 2: Static Type Definitions (Production)

Use this approach for better performance and build-time type safety:

```ts
import { nomad } from "./env.auto.js";

// Direct, zero-overhead access
const databaseUrl = nomad.DATABASE_URL;
const apiKey = nomad.API_KEY;

console.log(`Connected to: ${databaseUrl}`);
console.log(`Using API Key: ${apiKey}`);
```

**Best for:**
- Production builds with pre-configured environments
- Maximum performance (no runtime overhead)
- CI/CD pipelines with environment parity
- Build-time type safety

---

## Professional Setup Guide

### Step 1: Initialize the Generator

```bash
npx nomad-env generate
```

This creates `env.auto.d.ts` and `env.auto.ts` with type definitions for all variables in your `.env` file.

---

### Step 2: Choose Your Integration Pattern

**For Development (Dynamic Loading):**

```json
{
  "scripts": {
    "dev": "npx nomad-env watch & your-dev-server"
  }
}
```

**For Production Build (Static Typing):**

```json
{
  "scripts": {
    "prebuild": "npx nomad-env generate",
    "build": "tsc && your-build-step"
  }
}
```

---

### Step 3: Version Control

Add generated files to `.gitignore` for dynamic loading or commit them for static typing:

```bash
# Dynamic mode (regenerate per environment)
echo "env.auto.d.ts" >> .gitignore
echo "env.auto.ts" >> .gitignore

# Static mode (commit types)
git add env.auto.d.ts env.auto.ts
```

---

### Professional Example: Express Server

```ts
import express from "express";
import { nomad, init } from "nomad-env";

const app = express();

async function startServer() {
  // Initialize environment variables
  await init();

  // Validate critical variables exist
  if (!nomad.DATABASE_URL || !nomad.API_KEY) {
    throw new Error("Missing required environment variables");
  }

  const PORT = parseInt(nomad.PORT || "3000", 10);

  app.get("/health", (req, res) => {
    res.json({ status: "healthy" });
  });

  app.listen(PORT, () => {
    console.log("Server running on port", PORT);
    console.log("Database:", nomad.DATABASE_URL);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
```

---

## Schema Annotations (`.env.example`)

Since v0.2.0, `.env.example` isn't just documentation — it's a real schema. Add
annotation comments directly above a key to mark it required or give it a
richer type. Annotations only apply to the very next key; a blank line resets
them.

```bash
# required
NEXT_PUBLIC_API_URL=

# required
# type: url
API_BASE_URL=

# type: enum(development,staging,production)
NODE_ENV=

# optional, plain string — no annotations needed
FEATURE_FLAG_LABEL=
```

Supported `type:` values: `string` (default), `number`, `boolean`, `url`,
`enum(value1,value2,...)`.

- **`required`** — if the key has no value in any `.env` file *and* isn't set
  in `process.env`, `generate` fails immediately with a clear error listing
  every missing variable, instead of silently producing `undefined`.
- **`enum(...)`** — generates a TypeScript literal union
  (`"development" | "staging" | "production"`) instead of a plain `string`.
- **`url`** — currently typed as `string`, reserved for future runtime
  validation (basic URL shape checking).

This is fully backwards compatible: a `.env.example` with no annotations
behaves exactly as before (all keys optional, type inferred from value).

---

## Works Out-of-the-Box on Vercel, Render, Netlify, and CI

Hosting platforms like Vercel and Render inject dashboard-configured
environment variables directly into `process.env` — they don't write a
physical `.env` file into your build. Nomad-env detects this automatically:

1. It first reads any real `.env` / `.env.local` / `.env.production` files
   present (local dev values always win).
2. For any key declared in `.env.example` that isn't resolved from a file, it
   falls back to `process.env`.
3. It logs which platform it detected, so the behavior isn't a mystery:

```
[env-auto] Detected Vercel — reading vars from process.env where no .env file is present.
```

**This means your app's required variables — set in your host's dashboard —
will be picked up correctly, as long as they're declared as keys in
`.env.example`.** Nothing else in `process.env` (system variables, unrelated
CI internals) is ever pulled in; only declared keys are considered.

---

## CLI Commands Reference

| Command | Description | Use Case |
|---------|-------------|----------|
| `npx nomad-env generate` | Generate types from .env files | Initial setup and CI/CD builds |
| `npx nomad-env generate -o <folder>` | Generate into specific folder | Custom project structures |
| `npx nomad-env generate -e <profile>` | Generate using a named profile (reads `.env.<profile>` first) | Explicit environment selection in CI/CD |
| `npx nomad-env generate -v` | Generate with verbose output (resolved keys, secrets masked) | Debugging what value/source each key resolved from |
| `npx nomad-env generate --no-strict` | Don't fail the build on missing required keys | Gradual rollout of required-key validation |
| `npx nomad-env watch` | Watch and auto-regenerate on changes | Development workflow |
| `npx nomad-env check` | Diff `.env` against `.env.example`, flag drift and exposed secrets | Pre-commit / CI hygiene check |

### `generate` flags in detail

```bash
# Explicit environment profile — reads .env.production.local, .env.production,
# then falls through to .env, .env.local, etc.
npx nomad-env generate -e production

# Verbose mode — prints every resolved key, its source, and whether it's
# required. Values are masked unless the key is a NEXT_PUBLIC_/VITE_-style
# public key that doesn't look like a secret.
npx nomad-env generate -v
```

```
[env-auto] Resolved keys:
  NEXT_PUBLIC_API_URL = https://api.example.com  (env-file)
  JWT_ACCESS_SECRET = ab**********f2  (process.env, required)
```

### `check` in detail

```bash
npx nomad-env check
```

Flags three kinds of issues:

- **Undocumented keys** — present in `.env` but missing from `.env.example`
  (usually means someone added a var locally and forgot to document it).
- **Unset keys** — declared in `.env.example` but not set in `.env` or
  `process.env` anywhere (a good pre-deploy sanity check).
- **Exposed secrets** — a `NEXT_PUBLIC_`/`VITE_`/`PUBLIC_`/`REACT_APP_`
  prefixed key whose name contains `SECRET`, `TOKEN`, `PASSWORD`,
  `PRIVATE`, or `CREDENTIAL`. These prefixes ship the value to the client
  bundle, so this is usually a real bug worth double-checking.

Exits with a non-zero code if anything is flagged, so it's safe to use as a
CI or pre-commit gate:

```json
{
  "scripts": {
    "precommit": "nomad-env check"
  }
}
```

---

## Smart Output Directory

Nomad-env intelligently detects your project structure:

- If `src/` exists - Generated files placed in `src/` (ready for TypeScript compilation)
- If `src/` doesn't exist - Generated files placed in project root

Override this behavior with the `-o` or `--out` flag:

```bash
npx nomad-env generate -o config/env-types
```

---

## Integration with Build Scripts

### Recommended: Development & Production Setup

```json
{
  "scripts": {
    "dev": "npm run generate:types && concurrently \"npm run generate:watch\" \"your-dev-server\"",
    "build": "npm run generate:types && tsc && your-build-step",
    "generate:types": "nomad-env generate",
    "generate:watch": "nomad-env watch"
  }
}
```

---

### Environment-Specific Setup

```json
{
  "scripts": {
    "dev": "NODE_ENV=development nomad-env watch & vite",
    "build:staging": "nomad-env generate -e staging && tsc && vite build",
    "build:prod": "nomad-env generate -e production && tsc && vite build"
  }
}
```

---

## Best Practices for Professional Use

### 1. Environment Variable Validation

With schema annotations (recommended, since v0.2.0), mark keys `# required`
in `.env.example` and let `generate` fail the build with a clear message —
no extra code needed:

```bash
# .env.example
# required
DATABASE_URL=

# required
API_KEY=

# required
JWT_SECRET=
```

```bash
npx nomad-env generate
```

```
[env-auto] error: Missing required environment variables: DATABASE_URL, API_KEY
[env-auto] error: Add these to your .env file, or set them in your hosting provider's environment variables.
```

If you're on the dynamic runtime pattern instead, the manual check still
works:

```ts
import { nomad, init } from "nomad-env";

async function validateEnvironment() {
  await init();

  const requiredVars = ["DATABASE_URL", "API_KEY", "JWT_SECRET"];
  const missing = requiredVars.filter(v => !nomad[v as keyof typeof nomad]);

  if (missing.length > 0) {
    throw new Error(`Missing required variables: ${missing.join(", ")}`);
  }
}
```

---

### 2. Type-Safe Configuration Objects

```ts
import { nomad } from "./env.auto.js";

export const config = {
  database: {
    url: nomad.DATABASE_URL,
    maxConnections: parseInt(nomad.DB_MAX_CONNECTIONS || "10", 10),
  },
  api: {
    key: nomad.API_KEY,
    baseUrl: nomad.API_BASE_URL,
  },
  features: {
    enableAnalytics: nomad.ENABLE_ANALYTICS === "true",
  },
} as const;
```

---

### 3. Development vs Production

Create separate `.env` files for different environments:

```bash
.env              # Base defaults
.env.local        # Local development (add to .gitignore)
.env.development  # Development environment
.env.production   # Production environment
```

Generate types for your current environment:

```bash
npx nomad-env generate
```

Or target a specific profile explicitly:

```bash
npx nomad-env generate -e production
```

---

### 4. Keeping `.env.example` in Sync

Commit `.env.example` to version control (never commit real `.env` files).
Run `check` before pushing or as a pre-commit hook to catch drift early:

```bash
npx nomad-env check
```

---

## Compatibility

Supported Environments:
- TypeScript projects (Full autocomplete via .d.ts files)
- JavaScript projects (VS Code reads .d.ts files for IntelliSense)
- All Frameworks: Next.js, Vite, Express, NestJS, Bun, Remix, SvelteKit, and more
- Deploy targets: Vercel, Render, Netlify, GitHub Actions (auto-detected), and any platform that injects variables via `process.env`

---

## Troubleshooting

**Q: Generated files are not updating**

```bash
npx nomad-env generate
```

---

**Q: Can't find environment variables in TypeScript**

- Ensure `env.auto.d.ts` is in your `tsconfig.json` include path
- If using `src/` folder, verify it's included in `include` array

---

**Q: Type checking for optional variables**

```ts
import { nomad } from "./env.auto.js";

const maybePort = nomad.PORT ? parseInt(nomad.PORT, 10) : 3000;
```

---

**Q: Build fails on Vercel/Render with "Property 'X' does not exist on type '{}'"**

This means `generate` ran but found no value for `X` anywhere. Check:

1. Is `X` declared as a key in `.env.example`? Only declared keys fall back
   to `process.env` — undeclared keys are never picked up automatically.
2. Is `X` actually set in your hosting provider's dashboard (Production
   environment specifically, not just Preview/Development)?
3. Run `npx nomad-env generate -v` in your build to see exactly which keys
   resolved and from where.

---

**Q: My build now fails with "Missing required environment variable"**

This is the new required-key validation working as intended — a variable
marked `# required` in `.env.example` has no value anywhere. Either set it
in your `.env` file / hosting dashboard, or remove the `# required`
annotation if it's genuinely optional. You can also temporarily bypass this
with `--no-strict` while migrating.

---

## Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## License

MIT