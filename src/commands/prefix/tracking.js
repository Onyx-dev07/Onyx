// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



module.exports = {
    name: 'tracking',
    description: 'Show tracking commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('tracking', message);
        }
        return require('../../lib/helpMenu').sendHelp('tracking', message);
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