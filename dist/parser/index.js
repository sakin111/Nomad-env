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
export async function parseEnvFiles(opts) {
    const cwd = opts?.cwd || process.cwd();
    const files = opts?.files || [".env", ".env.local", ".env.development", ".env.production"];
    const aggregate = {};
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
    const keys = {};
    for (const [k, v] of Object.entries(aggregate)) {
        keys[k] = { raw: v, type: inferType(v) };
    }
    return { keys };
}
