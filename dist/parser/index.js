import fs from "fs";
import path from "path";
function inferType(value) {
    const v = value.trim();
    if (/^\d+$/.test(v))
        return "number";
    const lv = v.toLowerCase();
    if (lv === "true" || lv === "false")
        return "boolean";
    return "string";
}
function parseDotenvContent(content) {
    const out = {};
    const lines = content.split(/\r?\n/);
    for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith("#"))
            continue;
        const eq = line.indexOf("=");
        if (eq === -1)
            continue;
        const key = line.slice(0, eq).trim();
        let val = line.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        out[key] = val;
    }
    return out;
}
/**
 * Returns just the set of key NAMES declared in a dotenv-style file,
 * ignoring whatever values are present (used for schema files like .env.example
 * where values are often placeholders or blank).
 */
function parseDotenvKeys(content) {
    return Object.keys(parseDotenvContent(content));
}
export async function parseEnvFiles(opts) {
    const cwd = opts?.cwd || process.cwd();
    const files = opts?.files || [".env", ".env.local", ".env.development", ".env.production"];
    // Schema files declare which keys the app expects. Values here are ignored;
    // they only establish the key NAMES to look up (in .env files, then process.env).
    const schemaFiles = opts?.schemaFiles || [".env.example", ".env.sample", ".env.schema"];
    const aggregate = {};
    // 1. Load real .env files (highest priority — local dev values win).
    for (const f of files) {
        const p = path.resolve(cwd, f);
        try {
            if (fs.existsSync(p)) {
                const content = await fs.promises.readFile(p, "utf8");
                const parsed = parseDotenvContent(content);
                for (const [k, v] of Object.entries(parsed)) {
                    // later files override earlier ones
                    aggregate[k] = v;
                }
            }
        }
        catch (e) {
            // ignore read errors
        }
    }
    // 2. Determine the declared key set from schema files, if any exist.
    const declaredKeys = new Set(Object.keys(aggregate));
    for (const f of schemaFiles) {
        const p = path.resolve(cwd, f);
        try {
            if (fs.existsSync(p)) {
                const content = await fs.promises.readFile(p, "utf8");
                for (const k of parseDotenvKeys(content)) {
                    declaredKeys.add(k);
                }
            }
        }
        catch (e) {
            // ignore read errors
        }
    }
    // 3. For any declared key not already resolved from a real .env file,
    //    fall back to process.env. This is what makes hosts like Vercel/Render
    //    work, since they inject vars directly into process.env rather than
    //    writing a physical .env file.
    for (const k of declaredKeys) {
        if (aggregate[k] === undefined && process.env[k] !== undefined) {
            aggregate[k] = process.env[k];
        }
    }
    const keys = {};
    for (const [k, v] of Object.entries(aggregate)) {
        keys[k] = { raw: v, type: inferType(v) };
    }
    return { keys };
}
