import chalk from "chalk";

export const logger = {
  info: (msg: string) => console.log(chalk.cyan("[env-auto]"), msg),
  success: (msg: string) => console.log(chalk.green("[env-auto]"), msg),
  warn: (msg: string) => console.warn(chalk.yellow("[env-auto]"), msg),
  error: (msg: string) => console.error(chalk.red("[env-auto]"), msg),
};
