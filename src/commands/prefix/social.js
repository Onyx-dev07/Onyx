// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



module.exports = {
    name: 'social',
    description: 'Show social commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('social', message);
        }
        return require('../../lib/helpMenu').sendHelp('social', message);
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