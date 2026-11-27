// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        ApplicationCommandOptionType,
} from 'discord.js';
import { emoji } from '#emoji';
import { getUserMessageCounts } from '#utils';

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

class MessagesCommand extends Command {
        constructor() {
                super({
                        name: 'messages',
                        description: 'Displays the message count for a user in this server',
                        aliases: ['m'],
                        cooldown: 5,
                        enabledSlash: true,
                        slashData: {
                                name: 'messages',
                                description: 'Displays the message count for a user in this server',
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

                const { total, todayCount } = await getUserMessageCounts(ctx.guild.id, target.id);

                const totalFormatted = total.toLocaleString('en-US');
                const todayFormatted = todayCount.toLocaleString('en-US');

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**${target.displayName}'s Messages**`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                [
                                        `**All time** • **${totalFormatted}** messages in this server !`,
                                        `**Today** • **${todayFormatted}** messages in this server`,
                                        ``,
                                        `${emoji.arrow} Discover new events [here](https://discord.gg/onyx)!`,
                                ].join('\n'),
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `-# Messages are being updated in real-time`,
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new MessagesCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */