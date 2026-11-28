// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



module.exports = {
    name: 'botprofile',
    description: 'Show bot profile commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('botprofile', message);
        }
        return require('../../lib/helpMenu').sendHelp('botprofile', message);
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