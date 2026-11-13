const chalk = require('chalk');

function timestamp() {
  const now = new Date();
  return chalk.gray(`[${now.toLocaleTimeString()}]`);
}

const logger = {
  info: (...args) => {
    console.log(timestamp(), chalk.cyan('[INFO]'), ...args);
  },
  success: (...args) => {
    console.log(timestamp(), chalk.green('[SUCCESS]'), ...args);
  },
  warn: (...args) => {
    console.warn(timestamp(), chalk.yellow('[WARN]'), ...args);
  },
  error: (...args) => {
    console.error(timestamp(), chalk.red('[ERROR]'), ...args);
  },
  command: (...args) => {
    console.log(timestamp(), chalk.magenta('[COMMAND]'), ...args);
  },
  event: (...args) => {
    console.log(timestamp(), chalk.blue('[EVENT]'), ...args);
  },
  onyx: (...args) => {
    console.log(timestamp(), chalk.hex('#ff8fb1').bold('[ONYX]'), ...args);
  }
};

module.exports = logger;

