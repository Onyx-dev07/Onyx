// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const fs     = require('fs');
const path   = require('path');
const config = require('../config');

function rgb(r, g, b) {
  return (t) => `\x1b[38;2;${r};${g};${b}m${t}\x1b[0m`;
}

function badge(br, bg, bb, fr, fg, fb) {
  return (label) =>
    `\x1b[48;2;${br};${bg};${bb}m\x1b[38;2;${fr};${fg};${fb}m ${label} \x1b[0m`;
}

const p = {
  time:   rgb(80,  92, 115),
  msg:    rgb(205, 213, 228),
  dim:    rgb(65,  75,  95),
  muted:  rgb(120, 132, 155),
  white:  rgb(236, 239, 244),
  b1:     rgb(100, 160, 240),
  b2:     rgb(120, 145, 235),
  b3:     rgb(145, 130, 225),
  b4:     rgb(170, 115, 210),
  b5:     rgb(195, 100, 195),
};

const badges = {
  LOAD: badge( 45,  70, 155,  180, 205, 255),
  OK:   badge( 15, 120,  90,  180, 255, 220),
  ERR:  badge(155,  38,  38,  255, 205, 205),
  INFO: badge( 60,  65, 100,  190, 200, 235),
  WARN: badge(145,  95,   0,  255, 228, 170),
};

const LOG_DIR  = path.join(__dirname, '..', 'logs');
const LOG_FILE = path.join(LOG_DIR, 'bot.log');

if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

function writeLog(level, message) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  fs.appendFileSync(LOG_FILE, `[${ts}] [${level}] ${message}\n`, 'utf8');
}

function now() {
  return new Date().toLocaleTimeString('en-GB', { hour12: false });
}

function emit(badgeFn, label, message) {
  writeLog(label, message);
  process.stdout.write(
    `  ${p.time(now())}  ${badgeFn(label)}  ${p.msg(message)}\n`
  );
}

function printHeader() {
  const rule = p.dim('─'.repeat(62));
  const dot  = p.dim('▸');

  const name =
    p.b1('O') + p.b2('N') + p.b3('Y') + p.b4('X');

  const lines = [
    '',
    `  ${rule}`,
    `   ${name}`,
    `   ${p.muted('Multipurpose Discord Bot')}`,
    `  ${rule}`,
    `   ${dot}  ${p.muted(config.SUPPORT_SERVER.replace('https://', ''))}` +
      `          ${dot}  ${p.muted('Built by Onyx')}`,
    `  ${rule}`,
    '',
  ];

  for (const line of lines) process.stdout.write(line + '\n');
}

function printLoading(message) {
  emit(badges.LOAD, 'LOAD', message);
}

function printSuccess(message) {
  emit(badges.OK, 'OK  ', message);
}

function printError(message) {
  emit(badges.ERR, 'ERR ', message);
}

function printInfo(message) {
  emit(badges.INFO, 'INFO', message);
}

function printWarn(message) {
  emit(badges.WARN, 'WARN', message);
}

function printSystemReady() {
  const rule = p.dim('┄'.repeat(62));
  process.stdout.write('\n');
  process.stdout.write(`  ${rule}\n`);
  process.stdout.write(
    `  ${p.b1('◈')}  ${p.white('System online')}  ${p.dim('·')}  ${p.muted(`${config.BOT_NAME} is operational`)}\n`
  );
  process.stdout.write(`  ${rule}\n`);
  process.stdout.write('\n');
}

const colors = {
  PURPLE: '\x1b[38;2;170;115;210m',
  YELLOW: '\x1b[38;2;250;200;80m',
  RESET:  '\x1b[0m',
};

module.exports = {
  colors,
  printHeader,
  printLoading,
  printSuccess,
  printError,
  printInfo,
  printWarn,
  printSystemReady,
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */