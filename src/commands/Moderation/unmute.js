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

class UnmuteCommand extends Command {
        constructor() {
                super({
                        name: 'unmute',
                        description: 'Unmutes a server member',
                        usage: 'unmute <@user | userID | username>',
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['unmute @user'],
                        userPermissions: [PermissionFlagsBits.ModerateMembers],
                        permissions: [PermissionFlagsBits.ModerateMembers],
                        enabledSlash: true,
                        slashData: {
                                name: 'unmute',
                                description: 'Unmutes a server member',
                                defaultMemberPermissions: PermissionFlagsBits.ModerateMembers,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.User,
                                                name: 'user',
                                                description: 'The member to unmute',
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
                        return ctx.reply({ content: `${emoji.cross} You cannot unmute yourself.`, flags: MessageFlags.Ephemeral });
                }

                if (!member.isCommunicationDisabled()) {
                        return ctx.reply({ content: `${emoji.cross} That member is not muted.`, flags: MessageFlags.Ephemeral });
                }

                const botMember = ctx.guild.members.cache.get(ctx.client.user.id);
                if (botMember.roles.highest.position <= member.roles.highest.position) {
                        return ctx.reply({ content: `${emoji.cross} I don't have a high enough role to unmute this member.`, flags: MessageFlags.Ephemeral });
                }

                if (ctx.member.roles.highest.position <= member.roles.highest.position && ctx.guild.ownerId !== ctx.author.id) {
                        return ctx.reply({ content: `${emoji.cross} You don't have a high enough role to unmute this member.`, flags: MessageFlags.Ephemeral });
                }

                await member.timeout(null);

                const dmSent = await member.send({
                        content: `You have been unmuted in **${ctx.guild.name}**`,
                }).then(() => true).catch(() => false);

                await ctx.reply({
                        content: `${emoji.tick} | **${member.displayName}** has been unmuted${dmSent ? ', notified the member' : ''}`,
                });
        }
}

export default new UnmuteCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */