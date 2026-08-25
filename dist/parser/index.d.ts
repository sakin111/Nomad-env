export type KeyInfo = {
    raw: string;
    type: "string" | "number" | "boolean";
};
export type EnvSpec = {
    keys: Record<string, KeyInfo>;
};
export declare function parseEnvFiles(opts?: {
    cwd?: string;
    files?: string[];
    schemaFiles?: string[];
}): Promise<EnvSpec>;
