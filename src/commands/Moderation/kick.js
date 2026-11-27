// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        PermissionFlagsBits,
        ApplicationCommandOptionType,
} from 'discord.js';
import { cross } from '../../utils/moderation.js';

const resolveMember = async (ctx) => {
        if (ctx.isSlash) {
                return ctx.options.getMember('user') ?? null;
        }

        const arg = ctx.args[0];
        if (!arg) return null;

        const idMatch = arg.match(/^<@!?(\d+)>$/) || arg.match(/^(\d{17,20})$/);
        if (idMatch) {
                return ctx.guild.members.fetch(idMatch[1]).catch(() => null);
        }

        await ctx.guild.members.fetch().catch(() => {});
        const query = arg.toLowerCase();
        return ctx.guild.members.cache.find(
                (m) =>
                        m.user.username.toLowerCase() === query ||
                        m.displayName.toLowerCase() === query ||
                        m.user.globalName?.toLowerCase() === query,
        ) ?? null;
};

class KickCommand extends Command {
        constructor() {
                super({
                        name: 'kick',
                        description: 'Kicks a user from a guild',
                        usage: 'kick <@user | userID | username> [reason]',
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['kick @user Spam'],
                        userPermissions: [PermissionFlagsBits.KickMembers],
                        permissions: [PermissionFlagsBits.KickMembers],
                        enabledSlash: true,
                        slashData: {
                                name: 'kick',
                                description: 'Kicks a user from a guild',
                                defaultMemberPermissions: PermissionFlagsBits.KickMembers,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.User,
                                                name: 'user',
                                                description: 'The member to kick',
                                                required: true,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                if (!ctx.guild) {
                        return ctx.reply({ content: 'This command can only be used in a server.', flags: MessageFlags.Ephemeral });
                }

                const member = await resolveMember(ctx);

                if (!member) {
                        return ctx.reply({ content: `${cross()} Could not find that member.`, flags: MessageFlags.Ephemeral });
                }

                if (member.id === ctx.author.id) {
                        return ctx.reply({ content: `${cross()} You cannot kick yourself.`, flags: MessageFlags.Ephemeral });
                }

                if (member.id === ctx.client.user.id) {
                        return ctx.reply({ content: `${cross()} I cannot kick myself.`, flags: MessageFlags.Ephemeral });
                }

                const botMember = ctx.guild.members.cache.get(ctx.client.user.id);
                if (botMember.roles.highest.position <= member.roles.highest.position) {
                        return ctx.reply({ content: `${cross()} I don't have a high enough role to kick this member.`, flags: MessageFlags.Ephemeral });
                }

                if (ctx.member.roles.highest.position <= member.roles.highest.position && ctx.guild.ownerId !== ctx.author.id) {
                        return ctx.reply({ content: `${cross()} You don't have a high enough role to kick this member.`, flags: MessageFlags.Ephemeral });
                }

                await member.kick().catch(() => null);

                await ctx.reply({ content: `**${member.displayName}** has been kicked` });
        }
}

export default new KickCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */