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
                if (userId) return ctx.guild.members.fetch(userId).catch(() => null);
        }

        return null;
};

class ClearInvitesCommand extends Command {
        constructor() {
                super({
                        name: 'clearinvites',
                        description: "Reset a user's invite count in this server",
                        usage: 'clearinvites <@user | userID>',
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['clearinvites @user'],
                        userPermissions: [PermissionFlagsBits.Administrator],
                        permissions: [PermissionFlagsBits.Administrator],
                        enabledSlash: true,
                        slashData: {
                                name: 'clearinvites',
                                description: "Reset a user's invite count in this server",
                                defaultMemberPermissions: PermissionFlagsBits.Administrator,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.User,
                                                name: 'user',
                                                description: 'The user whose invites to reset',
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

                await db.userInviteCounter?.resetAll(ctx.guild.id, target.id);

                await ctx.reply({
                        content: `${emoji.tick} | **Successfully reset ${target.displayName}'s invites.**`,
                });
        }
}

export default new ClearInvitesCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */