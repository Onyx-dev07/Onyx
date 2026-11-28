// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

module.exports = {
    name: 'transcript',
    description: 'Send the current ticket transcript',
    async execute(message, args) {
        const subcommand = require('../../hybrid/ticket/subcommands/transcript');
        return subcommand.execute(message, args);
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