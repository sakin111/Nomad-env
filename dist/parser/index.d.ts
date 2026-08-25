export type KeyType = "string" | "number" | "boolean" | "url" | "enum";
export type KeyInfo = {
    raw: string;
    type: KeyType;
    required: boolean;
    enumValues?: string[];
    source: "env-file" | "process.env" | "missing";
};
export type EnvSpec = {
    keys: Record<string, KeyInfo>;
};
export declare class MissingRequiredEnvError extends Error {
    missing: string[];
    constructor(missing: string[]);
}
export declare function parseEnvFiles(opts?: {
    cwd?: string;
    files?: string[];
    schemaFiles?: string[];
    profile?: string;
    strict?: boolean;
}): Promise<EnvSpec>;
