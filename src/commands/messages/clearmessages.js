// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import { ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { emoji } from '#emoji';
import { db } from '#dbManager';

const resolveTarget = async (ctx) => {
        if (ctx.isSlash) {
                const user = ctx.options.getUser('user');
                return user ? ctx.guild.members.fetch(user.id).catch(() => null) : null;
        }

        const arg = ctx.args[0];
        if (arg) {
                const idMatch = arg.match(/^<@!?(\d+)>$/) || arg.match(/^(\d{17,20})$/);
                const userId = idMatch ? idMatch[1] : null;
                if (userId) {
                        return ctx.guild.members.fetch(userId).catch(() => null);
                }
        }

        return null;
};

class ClearMessagesCommand extends Command {
        constructor() {
                super({
                        name: 'clearmessages',
                        description: "Reset a user's message count in this server",
                        usage: 'clearmessages <@user | userID>',
                        aliases: ['clearmsg', 'resetmessages'],
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['clearmessages @user'],
                        userPermissions: [PermissionFlagsBits.Administrator],
                        permissions: [PermissionFlagsBits.Administrator],
                        enabledSlash: true,
                        slashData: {
                                name: 'clearmessages',
                                description: "Reset a user's message count in this server",
                                defaultMemberPermissions: PermissionFlagsBits.Administrator,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.User,
                                                name: 'user',
                                                description: 'The user whose messages to reset',
                                                required: true,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                const target = await resolveTarget(ctx);

                if (!target) {
                        return ctx.reply({ content: 'Please mention a valid user.' });
                }

                await db.userMessageCounter?.resetCount(ctx.guild.id, target.id);

                await ctx.reply({
                        content: `${emoji.tick} | **Successfully reset ${target.displayName}'s messages.**`,
                });
        }
}

export default new ClearMessagesCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */