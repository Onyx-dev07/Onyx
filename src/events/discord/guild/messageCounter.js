// Onyx Discord Bot
// Author: Onyx
import { db } from '#dbManager';

export default {
        name: 'messageCreate',
        async execute({ eventArgs }) {
                if (!eventArgs?.[0]) return;

                const [message] = eventArgs;

                if (message.author?.bot || !message.guild) return;

                try {
                        const isBlacklisted = await db.guild?.isMessageChannelBlacklisted(
                                message.guild.id,
                                message.channel.id,
                        );
                        if (isBlacklisted) return;

                        await db.userMessageCounter?.increment(message.guild.id, message.author.id);
                } catch {
                }
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