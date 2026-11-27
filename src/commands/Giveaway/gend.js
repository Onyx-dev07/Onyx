// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import { MessageFlags, PermissionFlagsBits } from 'discord.js';
import { emoji } from '#emoji';
import { giveawayStore, endGiveaway } from '#giveawayUtils';

class GEndCommand extends Command {
        constructor() {
                super({
                        name: 'gend',
                        description: 'Ends a giveaway early',
                        usage: 'gend <messageID>',
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['gend 1150000000000000000'],
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        permissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'gend',
                                description: 'Ends a giveaway early',
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                                options: [
                                        {
                                                type: 3,
                                                name: 'messageid',
                                                description: 'The giveaway message ID',
                                                required: true,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                const messageId = ctx.isSlash
                        ? ctx.options.getString('messageid')
                        : ctx.args[0];

                const giveaway = giveawayStore.get(messageId);
                if (!giveaway) {
                        return ctx.reply({
                                content: `${emoji.cross} No giveaway found with that message ID.`,
                                flags: MessageFlags.Ephemeral,
                        });
                }

                if (giveaway.status === 'ended') {
                        return ctx.reply({
                                content: `${emoji.cross} That giveaway has already ended.`,
                                flags: MessageFlags.Ephemeral,
                        });
                }

                await endGiveaway(messageId, giveaway);

                if (ctx.isSlash) {
                        await ctx.reply({ content: `${emoji.tick} Giveaway ended.`, flags: MessageFlags.Ephemeral });
                } else {
                        await ctx.message?.delete().catch(() => null);
                }
        }
}

export default new GEndCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */