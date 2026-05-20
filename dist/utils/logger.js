import chalk from "chalk";
export const logger = {
    info: (msg) => console.log(chalk.cyan("[env-auto]"), msg),
    success: (msg) => console.log(chalk.green("[env-auto]"), msg),
    warn: (msg) => console.warn(chalk.yellow("[env-auto]"), msg),
    error: (msg) => console.error(chalk.red("[env-auto]"), msg),
};
