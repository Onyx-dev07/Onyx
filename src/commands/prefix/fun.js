// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'fun',
    description: 'Show fun commands',
    aliases: [],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('fun', message);
        }
        const sub = args[0].toLowerCase();
        const subPath = path.join(__dirname, 'fun', `${sub}.js`);
        if (fs.existsSync(subPath)) {
            return require(subPath).execute(message, args.slice(1));
        }
        return require('../../lib/helpMenu').sendHelp('fun', message);
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