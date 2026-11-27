// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        PermissionFlagsBits,
        ApplicationCommandOptionType,
} from 'discord.js';
import { panelPayload, tick } from '../../utils/moderation.js';

class EraseCommand extends Command {
        constructor() {
                super({
                        name: 'erase',
                        description: 'Delete a number of messages from a channel',
                        usage: 'erase <1-99>',
                        aliases: ['purge'],
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['erase 10'],
                        userPermissions: [PermissionFlagsBits.ManageMessages],
                        permissions: [PermissionFlagsBits.ManageMessages],
                        enabledSlash: true,
                        slashData: {
                                name: 'erase',
                                description: 'Delete a number of messages from a channel',
                                defaultMemberPermissions: PermissionFlagsBits.ManageMessages,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.Integer,
                                                name: 'amount',
                                                description: 'Number of messages to delete (1-99)',
                                                required: true,
                                                min_value: 1,
                                                max_value: 99,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                const amount = ctx.isSlash
                        ? ctx.options.getInteger('amount')
                        : parseInt(ctx.args[0]);

                if (!amount || isNaN(amount) || amount < 1 || amount > 99) {
                        return ctx.reply({
                                content: 'The limit provided is not within acceptable bounds.',
                                flags: MessageFlags.Ephemeral,
                        });
                }

                await ctx.channel.bulkDelete(amount, true).catch(() => null);

                const msg = await ctx.channel.send(
                        panelPayload({
                                title: 'Erase',
                                lines: [`${tick()} Deleted **${amount}** messages.`],
                                author: ctx.author,
                        }),
                );

                setTimeout(() => msg?.delete?.().catch(() => null), 3000);
        }
}

export default new EraseCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */