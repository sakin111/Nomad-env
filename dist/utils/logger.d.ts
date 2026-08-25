export declare const logger: {
    info: (msg: string) => void;
    success: (msg: string) => void;
    warn: (msg: string) => void;
    error: (msg: string) => void;
};
/**
 * Returns true if a key looks like it's exposed to client-side bundles
 * under common framework conventions (Next.js, Vite, CRA).
 */
export declare function isPubliclyExposedKey(key: string): boolean;
/**
 * Heuristic check: does this key name suggest it holds a secret
 * (token, password, private key, etc.) despite being publicly exposed?
 */
export declare function looksLikeSecret(key: string): boolean;
/**
 * Masks a value for safe logging. Public keys are shown in full since
 * they're intended to be visible client-side; everything else is masked.
 */
export declare function maskValue(key: string, value: string): string;
