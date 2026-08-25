#!/usr/bin/env node
import { Command } from "commander";
import { generateTypesFromEnv } from "../generator/index.js";
import { checkEnvFiles, printCheckResult } from "../checker/index.js";
import { logger, maskValue } from "../utils/logger.js";
import { MissingRequiredEnvError, parseEnvFiles } from "../parser/index.js";
import fs from "fs";
import path from "path";

const program = new Command();
program
  .name("env-auto")
  .description("Generate TypeScript typings and runtime helper for .env files")
  .version("0.2.0");

program
  .command("generate")
  .description("Generate env.auto.d.ts and env.auto.ts from .env files")
  .option("-o, --out <folder>", "Output folder (default project root)")
  .option("-e, --env <profile>", "Environment profile, e.g. production (reads .env.<profile>)")
  .option("-v, --verbose", "Print resolved keys (secrets masked)")
  .option("--no-strict", "Do not fail the build when required keys are missing")
  .action(async (opts) => {
    try {
      const cwd = process.cwd();
      const out = opts.out ? path.resolve(opts.out) : undefined;

      const { spec } = await generateTypesFromEnv({
        cwd,
        outDir: out,
        profile: opts.env,
        strict: opts.strict,
      });

      if (opts.verbose) {
        logger.info("Resolved keys:");
        for (const [k, v] of Object.entries(spec.keys)) {
          console.log(`  ${k} = ${maskValue(k, v.raw)}  (${v.source}${v.required ? ", required" : ""})`);
        }
      }

      logger.info("Generation complete.");
    } catch (e: any) {
      if (e instanceof MissingRequiredEnvError) {
        logger.error(e.message);
        logger.error("Add these to your .env file, or set them in your hosting provider's environment variables.");
      } else {
        logger.error(e.message || String(e));
      }
      process.exit(1);
    }
  });

program
  .command("watch")
  .description("Watch .env files and regenerate on change")
  .option("-o, --out <folder>", "Output folder (default project root)")
  .action((opts) => {
    const cwd = process.cwd();
    const out = opts.out ? path.resolve(opts.out) : undefined;
    const watchFiles = [".env", ".env.local", ".env.development", ".env.production"].map((f) =>
      path.join(cwd, f)
    );
    for (const f of watchFiles) {
      try {
        fs.watch(f, { persistent: true }, async () => {
          try {
            await generateTypesFromEnv({ cwd, outDir: out, strict: false });
            logger.info(`Regenerated on change: ${f}`);
          } catch (e: any) {
            logger.error(e.message || String(e));
          }
        });
      } catch (e) {
        // can't watch if file doesn't exist — that's fine
      }
    }
    logger.info("Watching .env files for changes...");
  });

program
  .command("check")
  .description("Check .env against .env.example for drift and exposed secrets")
  .action(async () => {
    try {
      const cwd = process.cwd();
      const result = await checkEnvFiles({ cwd });
      printCheckResult(result);
      if (!result.ok) process.exit(1);
    } catch (e: any) {
      logger.error(e.message || String(e));
      process.exit(1);
    }
  });

program.parse(process.argv);