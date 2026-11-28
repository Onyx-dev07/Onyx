// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
        displayName,
        errorCard,
        mediaCard,
        missingCard,
        resolveUser,
} = require('../../../lib/userMediaCard');

module.exports = {
        name: 'banner',
        description: "Get a user's banner",
        usage: 'banner [user]',
        category: 'general',

        async execute(message, args = []) {
                const user = await resolveUser(message.client, message, args);

                try {
                        const fetchedUser = await message.client.users.fetch(user.id, { force: true });

                        if (!fetchedUser.banner) {
                                return message.reply(missingCard(fetchedUser));
                        }

                        const name = displayName(fetchedUser);
                        const jpgUrl = fetchedUser.bannerURL({ extension: 'jpg', size: 4096 });
                        const pngUrl = fetchedUser.bannerURL({ extension: 'png', size: 4096 });

                        return message.reply(mediaCard({
                                title: `${name}'s Banner`,
                                subtitle: 'High-resolution profile banner',
                                jpgUrl,
                                pngUrl,
                                description: `${name}'s banner`,
                        }));
                } catch {
                        return message.reply(errorCard('Failed to fetch user banner.'));
                }
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
