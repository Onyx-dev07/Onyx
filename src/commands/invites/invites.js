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
import { emoji } from '#emoji';
import { getUserInviteCount } from '#utils';

const SERVER_LINK = 'https://discord.gg/QnWNz2dKCE';

const resolveTarget = async (ctx) => {
        if (ctx.isSlash) {
                const user = ctx.options.getUser('user');
                if (!user) return ctx.member;
                return ctx.guild.members.fetch(user.id).catch(() => null);
        }

        const arg = ctx.args[0];
        if (arg) {
                const idMatch = arg.match(/^<@!?(\d+)>$/) || arg.match(/^(\d{17,20})$/);
                const userId = idMatch ? idMatch[1] : null;
                if (userId) {
                        return ctx.guild.members.fetch(userId).catch(() => null);
                }
        }

        return ctx.member;
};

class InvitesCommand extends Command {
        constructor() {
                super({
                        name: 'invites',
                        description: 'Displays the invite count for a user in this server',
                        aliases: ['i'],
                        cooldown: 5,
                        enabledSlash: true,
                        slashData: {
                                name: 'invites',
                                description: 'Displays the invite count for a user in this server',
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.User,
                                                name: 'user',
                                                description: 'User to check (defaults to yourself)',
                                                required: false,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                const target = await resolveTarget(ctx);

                if (!target) {
                        return ctx.reply({ content: 'Could not find that user.' });
                }

                const { total, joins, left, fake, rejoins } = await getUserInviteCount(
                        ctx.guild.id,
                        target.id,
                );

                const avatarURL = target.user.displayAvatarURL({ size: 256, extension: 'png' });

                const now = new Date().toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                        timeZone: 'Asia/Kolkata',
                });

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### Invite log`),
                );

                container.addSectionComponents(
                        new SectionBuilder()
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                                [
                                                        `${emoji.invites} **${target.displayName} has ${total.toLocaleString('en-US')} invites**`,
                                                        ``,
                                                        `**Joins** : ${joins.toLocaleString('en-US')}`,
                                                        `**Left** : ${left.toLocaleString('en-US')}`,
                                                        `**Fake** : ${fake.toLocaleString('en-US')}`,
                                                        `**Rejoins** : ${rejoins.toLocaleString('en-US')} ([7d](${SERVER_LINK}))`,
                                                ].join('\n'),
                                        ),
                                )
                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarURL)),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `${emoji.arrow} Discover new events [here](${SERVER_LINK})!`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
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

export default new InvitesCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */