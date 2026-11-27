// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        SectionBuilder,
        ThumbnailBuilder,
        ApplicationCommandOptionType,
} from 'discord.js';

const resolveUserAndMember = async (ctx) => {
        let user = null;
        let member = null;

        if (ctx.isSlash) {
                user = ctx.options.getUser('user') ?? ctx.user;
                member = ctx.options.getMember('user') ?? ctx.member;
        } else {
                const arg = ctx.args[0];
                if (arg) {
                        const idMatch = arg.match(/^<@!?(\d+)>$/) || arg.match(/^(\d{17,20})$/);
                        const userId = idMatch ? idMatch[1] : null;
                        if (userId) {
                                user = await ctx.client.users.fetch(userId).catch(() => null);
                                member = await ctx.guild.members.fetch(userId).catch(() => null);
                        }
                }
                if (!user) {
                        user = ctx.user;
                        member = ctx.member;
                }
        }

        return { user, member };
};

class UserInfoCommand extends Command {
        constructor() {
                super({
                        name: 'userinfo',
                        description: 'Displays the information of a member',
                        usage: 'userinfo [@user | userID]',
                        aliases: ['ui', 'whois'],
                        cooldown: 5,
                        enabledSlash: true,
                        slashData: {
                                name: 'userinfo',
                                description: 'Displays the information of a member',
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.User,
                                                name: 'user',
                                                description: 'The user to look up (defaults to yourself)',
                                                required: false,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                const { user, member } = await resolveUserAndMember(ctx);

                if (!user) {
                        return ctx.reply({ content: 'Could not find that user.', flags: MessageFlags.Ephemeral });
                }

                const avatarURL = user.displayAvatarURL({ size: 256, extension: 'png' });
                const createdTs = Math.floor(user.createdTimestamp / 1000);
                const joinedTs = member?.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
                const boostSince = member?.premiumSince ? Math.floor(member.premiumSinceTimestamp / 1000) : null;

                const roles = member
                        ? member.roles.cache
                                .filter((r) => r.id !== ctx.guild.id)
                                .sort((a, b) => b.position - a.position)
                        : null;

                const roleCount = roles ? roles.size : 0;
                const roleMentions = roles && roleCount > 0
                        ? roles.map((r) => `<@&${r.id}>`).join(' ')
                        : 'No roles';

                const topRole = member?.roles?.highest?.id !== ctx.guild?.id
                        ? member?.roles?.highest
                        : null;

                const now = new Date().toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata',
                });

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                const headerText = new TextDisplayBuilder().setContent(
                        `**🔍 User Info: ${user.username}**
Details about <@${user.id}>`,
                );

                if (avatarURL) {
                        container.addSectionComponents(
                                new SectionBuilder()
                                        .addTextDisplayComponents(headerText)
                                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarURL)),
                        );
                } else {
                        container.addTextDisplayComponents(headerText);
                }

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**🧾 Basic Info**
` +
                                `**ID:** ${user.id}
` +
                                `**Username:** ${user.username}
` +
                                `**Display Name:** ${member?.displayName ?? user.globalName ?? user.username}
` +
                                `**Bot:** ${user.bot ? 'True' : 'False'}`,
                        ),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**📆 Timestamps**
` +
                                (joinedTs
                                        ? `**Joined:** <t:${joinedTs}:R> • <t:${joinedTs}:f>
`
                                        : `**Joined:** Unknown
`) +
                                `**Created:** <t:${createdTs}:R> • <t:${createdTs}:f>`,
                        ),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**⚡ Boosting**
` +
                                (boostSince ? `<t:${boostSince}:R>` : 'No'),
                        ),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**🎭 Roles [${roleCount}]**
${roleMentions}`,
                        ),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**🏆 Top Role**
${topRole ? `<@&${topRole.id}>` : 'None'}`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `-# Requested by ${ctx.author.username} | Today at ${now}`,
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new UserInfoCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */