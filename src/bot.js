// Onyx Discord Bot
// Author: Onyx

import 'dotenv/config';
import { Bot } from '#classes/client';
import { logger } from '#utils';

const _emitWarning = process.emitWarning.bind(process);
process.emitWarning = (warning, ...args) => {
    if (typeof warning === 'string' && warning.includes('ready event has been renamed to clientReady')) return;
    return _emitWarning(warning, ...args);
};

const c = (r, g, b) => (t) => `\x1b[38;2;${r};${g};${b}m${t}\x1b[0m`;
const bold = (t) => `\x1b[1m${t}\x1b[0m`;
const dim = (t) => `\x1b[2m${t}\x1b[0m`;

const banner = [
        c(99,179,237) (`  ██████╗ ██╗   ██╗███╗   ██╗██╗  ██╗`),
        c(118,169,250)(`  ██╔══██╗╚██╗ ██╔╝████╗  ██║╚██╗██╔╝`),
        c(139,158,255)(`  ██████╔╝ ╚████╔╝ ██╔██╗ ██║ ╚███╔╝ `),
        c(167,139,250)(`  ██╔══██╗  ╚██╔╝  ██║╚██╗██║ ██╔██╗ `),
        c(192,132,252)(`  ██║  ██║   ██║   ██║ ╚████║██╔╝ ██╗`),
        c(216,118,249)(`  ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═══╝╚═╝  ╚═╝`),
        ``,
        `  ${dim('Developer')}  ${bold(c(192,132,252)('Onyx'))}     ${dim('Organization')}  ${bold(c(99,179,237)('Onyx'))}`,
        ``,
].join('\n');

console.log(banner);

const client = new Bot();
let isShuttingDown = false;

const shutdown = async (signal) => {
        if (isShuttingDown) return;
        isShuttingDown = true;
        logger.info('Shutdown', `Received ${signal}, shutting down gracefully`);
        try {
                await client.cleanup();
                logger.success('Shutdown', 'Bot shut down successfully');
                process.exit(0);
        } catch (error) {
                logger.error('Shutdown', 'Shutdown error:', error);
                process.exit(1);
        }
};

process.on('unhandledRejection', (reason) => {
        logger.error('Process', 'Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error, origin) => {
        logger.error('Process', `Uncaught Exception at ${origin}:`, error);
        // don't shutdown on uncaught exceptions
});

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

const main = async () => {
        try {
                await client.init();
        } catch (error) {
                logger.error('Main', 'Initialization failed:', error);
                await shutdown('initFailure');
        }
};

main();

export { client };

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */
