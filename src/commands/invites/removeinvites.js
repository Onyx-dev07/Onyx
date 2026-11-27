// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import { PermissionFlagsBits, ApplicationCommandOptionType } from 'discord.js';
import { db } from '#dbManager';
import { emoji } from '#emoji';

const resolveTarget = async (ctx, arg) => {
        const idMatch = arg?.match(/^<@!?(\d+)>$/) || arg?.match(/^(\d{17,20})$/);
        const userId = idMatch ? idMatch[1] : null;
        if (!userId) return null;
        return ctx.guild.members.fetch(userId).catch(() => null);
};

class RemoveInvitesCommand extends Command {
        constructor() {
                super({
                        name: 'removeinvites',
                        description: 'Remove invites from a user',
                        usage: 'removeinvites <@user | userID> <amount> <total | fake>',
                        cooldown: 5,
                        minArgs: 3,
                        examples: ['removeinvites @user 5 fake'],
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'removeinvites',
                                description: 'Remove invites from a user',
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.User,
                                                name: 'user',
                                                description: 'The user to remove invites from',
                                                required: true,
                                        },
                                        {
                                                type: ApplicationCommandOptionType.Integer,
                                                name: 'amount',
                                                description: 'Number of invites to remove',
                                                required: true,
                                                min_value: 1,
                                        },
                                        {
                                                type: ApplicationCommandOptionType.String,
                                                name: 'type',
                                                description: 'Type of invites to remove',
                                                required: true,
                                                choices: [
                                                        { name: 'total', value: 'total' },
                                                        { name: 'fake', value: 'fake' },
                                                ],
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                let target, amount, type;

                if (ctx.isSlash) {
                        const user = ctx.options.getUser('user');
                        target = user ? await ctx.guild.members.fetch(user.id).catch(() => null) : null;
                        amount = ctx.options.getInteger('amount');
                        type = ctx.options.getString('type');
                } else {
                        target = await resolveTarget(ctx, ctx.args[0]);
                        amount = parseInt(ctx.args[1], 10);
                        type = ctx.args[2]?.toLowerCase();
                }

                if (!target) {
                        return ctx.reply({ content: 'Please mention a valid user or provide a valid user ID.' });
                }

                if (!amount || isNaN(amount) || amount < 1) {
                        return ctx.reply({ content: 'Please provide a valid number of invites.' });
                }

                if (type !== 'total' && type !== 'fake') {
                        return ctx.reply({ content: 'Type must be either `total` or `fake`.' });
                }

                if (type === 'fake') {
                        await db.userInviteCounter?.removeFakeCount(ctx.guild.id, target.id, amount);
                } else {
                        await db.userInviteCounter?.removeCount(ctx.guild.id, target.id, amount);
                }

                await ctx.reply({
                        content: `${emoji.tick} **| I have removed ${amount} bonus invites successfully**`,
                });
        }
}

export default new RemoveInvitesCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */