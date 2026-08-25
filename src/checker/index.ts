import fs from "fs";
import path from "path";
import { logger, isPubliclyExposedKey, looksLikeSecret } from "../utils/logger.js";

function readKeys(p: string): string[] {
  if (!fs.existsSync(p)) return [];
  const content = fs.readFileSync(p, "utf8");
  const keys: string[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    keys.push(line.slice(0, eq).trim());
  }
  return keys;
}

export type CheckResult = {
  undocumented: string[]; // in .env but not in .env.example
  unset: string[]; // in .env.example but not in .env or process.env
  exposedSecrets: string[]; // public-prefixed keys that look like secrets
  ok: boolean;
};

export async function checkEnvFiles(opts?: { cwd?: string }): Promise<CheckResult> {
  const cwd = opts?.cwd || process.cwd();

  const envKeys = new Set(readKeys(path.resolve(cwd, ".env")));
  const exampleKeys = new Set(readKeys(path.resolve(cwd, ".env.example")));

  const undocumented = [...envKeys].filter((k) => !exampleKeys.has(k));
  const unset = [...exampleKeys].filter((k) => !envKeys.has(k) && process.env[k] === undefined);
  const exposedSecrets = [...new Set([...envKeys, ...exampleKeys])].filter(
    (k) => isPubliclyExposedKey(k) && looksLikeSecret(k)
  );

  const ok = undocumented.length === 0 && unset.length === 0 && exposedSecrets.length === 0;

  return { undocumented, unset, exposedSecrets, ok };
}

export function printCheckResult(result: CheckResult) {
  if (result.undocumented.length > 0) {
    logger.warn(
      `Keys in .env but missing from .env.example (undocumented): ${result.undocumented.join(", ")}`
    );
  }
  if (result.unset.length > 0) {
    logger.warn(
      `Keys in .env.example but not set anywhere (.env or process.env): ${result.unset.join(", ")}`
    );
  }
  if (result.exposedSecrets.length > 0) {
    logger.error(
      `Publicly-exposed keys that look like secrets (double check these aren't leaking to the client bundle): ${result.exposedSecrets.join(", ")}`
    );
  }
  if (result.ok) {
    logger.success("Env files are in sync. No issues found.");
  }
}