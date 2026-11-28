// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



module.exports = {
    name: 'giveaway',
    description: 'Show giveaway commands',
    aliases: ['gw'],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('giveaway', message);
        }
        const hybrid = require('../hybrid/giveaway/giveaway');
        if (hybrid && hybrid.execute) {
            return hybrid.execute(message, args);
        }
        return require('../../lib/helpMenu').sendHelp('giveaway', message);
    }
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */