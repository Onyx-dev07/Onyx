// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const path = require('path');
const fs = require('fs');

module.exports = {
    name: 'pfps',
    description: 'Show profile pictures commands',
    aliases: ['profilepictures'],
    async execute(message, args) {
        if (!args || !args.length) {
            return require('../../lib/helpMenu').sendHelp('pfps', message);
        }
        const sub = args[0].toLowerCase();
        const subPath = path.join(__dirname, 'pfps', `${sub}.js`);
        if (fs.existsSync(subPath)) {
            return require(subPath).execute(message, args.slice(1));
        }
        return require('../../lib/helpMenu').sendHelp('pfps', message);
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