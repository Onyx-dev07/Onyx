// Onyx Discord Bot
// Author: Onyx
export default {
        name: 'inviteDelete',
        async execute({ eventArgs, client }) {
                const [invite] = eventArgs;
                if (!invite.guild) return;

                const guildCache = client.inviteCache?.get(invite.guild.id);
                if (guildCache) guildCache.delete(invite.code);
        },
};

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */