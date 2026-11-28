// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
        displayName,
        mediaCard,
        resolveUser,
} = require('../../../lib/userMediaCard');

module.exports = {
        name: 'avatar',
        aliases: ['av'],
        description: "Get a user's avatar",
        usage: 'avatar [user]',
        category: 'general',

        async execute(message, args = []) {
                const user = await resolveUser(message.client, message, args);
                const name = displayName(user);

                const jpgUrl = user.displayAvatarURL({ extension: 'jpg', size: 4096 });
                const pngUrl = user.displayAvatarURL({ extension: 'png', size: 4096 });

                return message.reply(mediaCard({
                        title: `${name}'s Avatar`,
                        jpgUrl,
                        pngUrl,
                        description: `${name}'s avatar`,
                }));
        },
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */
