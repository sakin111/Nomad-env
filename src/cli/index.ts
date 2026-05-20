#!/usr/bin/env node
import { Command } from "commander";
import { generateTypesFromEnv } from "../generator/index.js";
import { logger } from "../utils/logger.js";
import fs from "fs";
import path from "path";

const program = new Command();
program.name("env-auto").description("Generate TypeScript typings and runtime helper for .env files").version("0.1.0");

program
  .command("generate")
  .description("Generate env.auto.d.ts and env.auto.ts from .env files")
  .option("-o, --out <folder>", "Output folder (default project root)")
  .action(async (opts) => {
    try {
      const cwd = process.cwd();
      const out = opts.out ? path.resolve(opts.out) : undefined;
      await generateTypesFromEnv({ cwd, outDir: out });
      logger.info("Generation complete.");
    } catch (e: any) {
      logger.error(e.message || String(e));
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
    const watchFiles = [".env", ".env.local", ".env.development", ".env.production"].map((f) => path.join(cwd, f));

    for (const f of watchFiles) {
      try {
        fs.watch(f, { persistent: true }, async () => {
          try {
            await generateTypesFromEnv({ cwd, outDir: out });
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

program.parse(process.argv);
