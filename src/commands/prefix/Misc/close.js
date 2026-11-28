// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

module.exports = {
    name: 'close',
    description: 'Close the current ticket',
    async execute(message, args) {
        const subcommand = require('../../hybrid/ticket/subcommands/close');
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