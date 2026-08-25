import { EnvSpec } from "../parser/index.js";
export declare function generateTypesFromEnv(opts?: {
    cwd?: string;
    outDir?: string;
    profile?: string;
    strict?: boolean;
}): Promise<{
    dtsPath: string;
    tsPath: string;
    spec: EnvSpec;
}>;
