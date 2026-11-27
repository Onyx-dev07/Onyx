// Onyx Discord Bot
// Author: Onyx
import { giveawayStore, GWAY_EMOJI_RAW_ID } from '#giveawayUtils';

export default {
        name: 'messageReactionRemove',
        async execute({ eventArgs }) {
                const [reaction, user] = eventArgs;

                if (reaction.emoji.id !== GWAY_EMOJI_RAW_ID) return;

                if (user.partial) {
                        await user.fetch().catch(() => null);
                }

                if (user.bot) return;

                const messageId = reaction.message.id;
                const giveaway = giveawayStore.get(messageId);

                if (!giveaway || giveaway.status !== 'active') return;

                giveaway.participants.delete(user.id);
                giveawayStore.set(messageId, giveaway);
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