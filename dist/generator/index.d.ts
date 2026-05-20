import { EnvSpec } from "../parser/index.js";
export type { EnvSpec };
export declare function generateTypesFromEnv(opts?: {
    cwd?: string;
    outDir?: string;
}): Promise<{
    dtsPath: string;
    tsPath: string;
}>;
