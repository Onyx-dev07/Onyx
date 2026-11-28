// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



module.exports = {
    name: 'vanity',
    description: 'Show vanity roles commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('vanity', message);
        }
        const hybrid = require('../hybrid/vanityroles/vanityroles');
        if (hybrid && hybrid.execute) {
            return hybrid.execute(message, args);
        }
        return require('../../lib/helpMenu').sendHelp('vanity', message);
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