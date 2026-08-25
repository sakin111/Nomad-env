export type Platform = "vercel" | "render" | "netlify" | "github-actions" | "local";

/**
 * Detects which hosting/CI platform the current process is running on,
 * based on well-known environment variables each platform injects.
 * This lets the generator skip looking for .env files (which usually
 * don't exist on these platforms) and go straight to process.env.
 */
export function detectPlatform(): Platform {
  if (process.env.VERCEL) return "vercel";
  if (process.env.RENDER) return "render";
  if (process.env.NETLIFY) return "netlify";
  if (process.env.GITHUB_ACTIONS) return "github-actions";
  return "local";
}

export function platformLabel(p: Platform): string {
  switch (p) {
    case "vercel":
      return "Vercel";
    case "render":
      return "Render";
    case "netlify":
      return "Netlify";
    case "github-actions":
      return "GitHub Actions";
    default:
      return "local machine";
  }
}