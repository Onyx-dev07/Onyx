// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



module.exports = {
    name: 'reactionroles',
    description: 'Show reaction roles commands',
    aliases: ['rr'],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('reactionroles', message);
        }
        const hybrid = require('../hybrid/reactionroles/reactionroles');
        if (hybrid && hybrid.execute) {
            return hybrid.execute(message, args);
        }
        return require('../../lib/helpMenu').sendHelp('reactionroles', message);
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