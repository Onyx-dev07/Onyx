// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        PermissionFlagsBits,
        ApplicationCommandOptionType,
} from 'discord.js';
import { emoji } from '#emoji';

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

class BanCommand extends Command {
        constructor() {
                super({
                        name: 'ban',
                        description: 'Bans a user from a guild',
                        usage: 'ban <@user | userID | username> [reason]',
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['ban @user Spam'],
                        userPermissions: [PermissionFlagsBits.BanMembers],
                        permissions: [PermissionFlagsBits.BanMembers],
                        enabledSlash: true,
                        slashData: {
                                name: 'ban',
                                description: 'Bans a user from a guild',
                                defaultMemberPermissions: PermissionFlagsBits.BanMembers,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.User,
                                                name: 'user',
                                                description: 'The member to ban',
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
                        return ctx.reply({ content: `${emoji.cross} Could not find that member.`, flags: MessageFlags.Ephemeral });
                }

                if (member.id === ctx.author.id) {
                        return ctx.reply({ content: `${emoji.cross} You cannot ban yourself.`, flags: MessageFlags.Ephemeral });
                }

                if (member.id === ctx.client.user.id) {
                        return ctx.reply({ content: `${emoji.cross} I cannot ban myself.`, flags: MessageFlags.Ephemeral });
                }

                const botMember = ctx.guild.members.cache.get(ctx.client.user.id);
                if (botMember.roles.highest.position <= member.roles.highest.position) {
                        return ctx.reply({ content: `${emoji.cross} I don't have a high enough role to ban this member.`, flags: MessageFlags.Ephemeral });
                }

                if (ctx.member.roles.highest.position <= member.roles.highest.position && ctx.guild.ownerId !== ctx.author.id) {
                        return ctx.reply({ content: `${emoji.cross} You don't have a high enough role to ban this member.`, flags: MessageFlags.Ephemeral });
                }

                await member.ban().catch(() => null);

                await ctx.reply({ content: `**${member.displayName}** has been banned` });
        }
}

export default new BanCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */