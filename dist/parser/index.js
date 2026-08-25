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
 * Parses a schema file (e.g. .env.example) with support for annotation
 * comments directly above a key:
 *
 *   # required
 *   # type: url
 *   NEXT_PUBLIC_API_URL=
 *
 *   # type: enum(development,staging,production)
 *   NODE_ENV=
 *
 * Keys with no annotations are treated as optional strings, same as before.
 */
function parseSchemaContent(content) {
    const lines = content.split(/\r?\n/);
    const results = [];
    let pendingRequired = false;
    let pendingType;
    let pendingEnumValues;
    for (const raw of lines) {
        const line = raw.trim();
        if (!line) {
            // blank line resets any pending annotations (they only apply to the
            // very next key)
            pendingRequired = false;
            pendingType = undefined;
            pendingEnumValues = undefined;
            continue;
        }
        if (line.startsWith("#")) {
            const comment = line.slice(1).trim();
            if (/^required$/i.test(comment)) {
                pendingRequired = true;
                continue;
            }
            const typeMatch = comment.match(/^type:\s*(\w+)(\((.*)\))?$/i);
            if (typeMatch) {
                const t = typeMatch[1].toLowerCase();
                if (t === "enum" && typeMatch[3]) {
                    pendingType = "enum";
                    pendingEnumValues = typeMatch[3].split(",").map((s) => s.trim()).filter(Boolean);
                }
                else if (["string", "number", "boolean", "url"].includes(t)) {
                    pendingType = t;
                }
                continue;
            }
            // unrecognized comment — ignore, don't reset pending state
            continue;
        }
        const eq = line.indexOf("=");
        if (eq === -1)
            continue;
        const key = line.slice(0, eq).trim();
        if (!key)
            continue;
        results.push({
            key,
            required: pendingRequired,
            type: pendingType,
            enumValues: pendingEnumValues,
        });
        pendingRequired = false;
        pendingType = undefined;
        pendingEnumValues = undefined;
    }
    return results;
}
export class MissingRequiredEnvError extends Error {
    constructor(missing) {
        super(`Missing required environment variable${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`);
        this.name = "MissingRequiredEnvError";
        this.missing = missing;
    }
}
export async function parseEnvFiles(opts) {
    const cwd = opts?.cwd || process.cwd();
    const strict = opts?.strict !== false;
    // If a profile is given (e.g. --env production), prioritize its files
    // ahead of the generic defaults.
    const profileFiles = opts?.profile
        ? [`.env.${opts.profile}.local`, `.env.${opts.profile}`]
        : [];
    const files = opts?.files || [
        ...profileFiles,
        ".env",
        ".env.local",
        ".env.development",
        ".env.production",
    ];
    const schemaFiles = opts?.schemaFiles || [".env.example", ".env.sample", ".env.schema"];
    const aggregate = {};
    const sourceMap = {};
    // 1. Load real .env files (highest priority — local/profile values win).
    //    Later files in the list override earlier ones.
    for (const f of files) {
        const p = path.resolve(cwd, f);
        try {
            if (fs.existsSync(p)) {
                const content = await fs.promises.readFile(p, "utf8");
                const parsed = parseDotenvContent(content);
                for (const [k, v] of Object.entries(parsed)) {
                    aggregate[k] = v;
                    sourceMap[k] = "env-file";
                }
            }
        }
        catch (e) {
            // ignore read errors
        }
    }
    // 2. Load schema annotations (required/type/enum) from .env.example etc.
    const annotations = new Map();
    for (const f of schemaFiles) {
        const p = path.resolve(cwd, f);
        try {
            if (fs.existsSync(p)) {
                const content = await fs.promises.readFile(p, "utf8");
                for (const ann of parseSchemaContent(content)) {
                    annotations.set(ann.key, ann);
                }
            }
        }
        catch (e) {
            // ignore read errors
        }
    }
    // Declared key set = anything found in real .env files, plus anything
    // declared in a schema file (even if it has no value yet).
    const declaredKeys = new Set([...Object.keys(aggregate), ...annotations.keys()]);
    // 3. Fall back to process.env for any declared key not already resolved
    //    from a real .env file. This is what makes hosts like Vercel/Render
    //    work, since they inject vars directly into process.env rather than
    //    writing a physical .env file.
    for (const k of declaredKeys) {
        if (aggregate[k] === undefined && process.env[k] !== undefined) {
            aggregate[k] = process.env[k];
            sourceMap[k] = "process.env";
        }
    }
    // 4. Validate required keys.
    const missing = [];
    for (const [key, ann] of annotations) {
        if (ann.required && aggregate[key] === undefined) {
            missing.push(key);
        }
    }
    if (missing.length > 0 && strict) {
        throw new MissingRequiredEnvError(missing);
    }
    // 5. Assemble final key info, respecting schema type/enum overrides.
    const keys = {};
    for (const k of declaredKeys) {
        const value = aggregate[k];
        const ann = annotations.get(k);
        const required = ann?.required ?? false;
        const source = value === undefined ? "missing" : sourceMap[k] || "env-file";
        let type;
        let enumValues;
        if (ann?.type === "enum" && ann.enumValues) {
            type = "enum";
            enumValues = ann.enumValues;
        }
        else if (ann?.type) {
            type = ann.type;
        }
        else {
            type = value !== undefined ? inferType(value) : "string";
        }
        keys[k] = {
            raw: value ?? "",
            type,
            required,
            enumValues,
            source,
        };
    }
    return { keys };
}
