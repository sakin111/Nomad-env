// At runtime we expose a Proxy that reads from process.env and parses basic types.
function parseValue(raw: string | undefined) {
  if (raw === undefined) return undefined;
  const lower = raw.toLowerCase();
  if (/^\d+$/.test(raw)) return Number(raw);
  if (lower === "true") return true;
  if (lower === "false") return false;
  return raw;
}

// Build nomad proxy using discovered spec (if available) to validate and parse values
async function buildEnv(cwd?: string): Promise<any> {
  const targetCwd = cwd || process.cwd();
  
  // Lazy load parser to avoid parsing/file I/O overhead on production start
  const { parseEnvFiles } = await import("./parser/index.js");
  const spec = await parseEnvFiles({ cwd: targetCwd });

  // Populate process.env with parsed values if not already present
  for (const [key, info] of Object.entries(spec.keys)) {
    if (process.env[key] === undefined && info.raw !== undefined) {
      process.env[key] = info.raw;
    }
  }

  // Lazy load logger to avoid loading chalk on start
  const { logger } = await import("./utils/logger.js");

  const missing: string[] = [];
  for (const key of Object.keys(spec.keys)) {
    if (process.env[key] === undefined) missing.push(key);
  }

  if (missing.length > 0) {
    logger.warn(`Missing environment variables: ${missing.join(", ")}`);
  }

  const envObj: Record<string, any> = {};
  for (const [k, info] of Object.entries(spec.keys)) {
    envObj[k] = parseValue(process.env[k]);
  }

  return new Proxy(envObj, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (process.env[prop] !== undefined) {
        return parseValue(process.env[prop]);
      }
      return undefined;
    }
  });
}

// Default export: a lazy proxy that awaits the built nomad proxy.
let cached: any = null;

// Only auto-load files if not in production to optimize performance/cold starts.
export const envPromise = (process.env.NODE_ENV !== "production")
  ? buildEnv().then((val) => {
      cached = val;
      return val;
    })
  : Promise.resolve({});

export const nomad = new Proxy({}, {
  get(_t, prop: string) {
    if (cached) {
      return cached[prop];
    }
    // Fallback to reading directly from process.env (so it works instantly in production)
    if (process.env[prop] !== undefined) {
      return parseValue(process.env[prop]);
    }
    return undefined;
  }
});

export async function init(cwd?: string) {
  if (!cached) {
    cached = await buildEnv(cwd);
  }
  // Lazy load generator to generate types in development
  const { generateTypesFromEnv } = await import("./generator/index.js");
  await generateTypesFromEnv({ cwd });
  return cached;
}
