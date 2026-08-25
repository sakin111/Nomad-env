import chalk from "chalk";
export const logger = {
    info: (msg) => console.log(chalk.cyan("[env-auto]"), msg),
    success: (msg) => console.log(chalk.green("[env-auto]"), msg),
    warn: (msg) => console.warn(chalk.yellow("[env-auto] warn:"), msg),
    error: (msg) => console.error(chalk.red("[env-auto] error:"), msg),
};
/**
 * Returns true if a key looks like it's exposed to client-side bundles
 * under common framework conventions (Next.js, Vite, CRA).
 */
export function isPubliclyExposedKey(key) {
    return (key.startsWith("NEXT_PUBLIC_") ||
        key.startsWith("VITE_") ||
        key.startsWith("PUBLIC_") ||
        key.startsWith("REACT_APP_"));
}
/**
 * Heuristic check: does this key name suggest it holds a secret
 * (token, password, private key, etc.) despite being publicly exposed?
 */
export function looksLikeSecret(key) {
    const suspicious = /(SECRET|PRIVATE|PASSWORD|TOKEN|CREDENTIAL)/i;
    return suspicious.test(key);
}
/**
 * Masks a value for safe logging. Public keys are shown in full since
 * they're intended to be visible client-side; everything else is masked.
 */
export function maskValue(key, value) {
    if (isPubliclyExposedKey(key) && !looksLikeSecret(key)) {
        return value;
    }
    if (!value)
        return "(empty)";
    if (value.length <= 4)
        return "****";
    return `${value.slice(0, 2)}${"*".repeat(Math.min(value.length - 4, 12))}${value.slice(-2)}`;
}
