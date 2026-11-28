// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { botInfoCard } = require('../../../lib/infoCards');

module.exports = {
    name: 'botinfo',
    description: "Shows the bot's info",
    aliases: ['bi'],

    async execute(message) {
        const { client } = message;

        return message.reply(botInfoCard({
            client,
            avatarURL: client.user.displayAvatarURL({ size: 256 }),
        }));
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
