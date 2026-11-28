// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

module.exports = {
    name: 'claim',
    description: 'Claim the current ticket',
    async execute(message, args) {
        const subcommand = require('../../hybrid/ticket/subcommands/claim');
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