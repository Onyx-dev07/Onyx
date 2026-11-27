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
        PermissionFlagsBits,
} from 'discord.js';
import { addUserMessageCount } from '#utils';

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

class AddMessagesCommand extends Command {
        constructor() {
                super({
                        name: 'addmessages',
                        description: 'Manually add messages to a user\'s server count',
                        usage: 'addmessages <@user | userID> <amount>',
                        aliases: ['addmsg'],
                        cooldown: 5,
                        minArgs: 2,
                        examples: ['addmessages @user 50'],
                        userPermissions: [PermissionFlagsBits.Administrator],
                        permissions: [PermissionFlagsBits.Administrator],
                        enabledSlash: true,
                        slashData: {
                                name: 'addmessages',
                                description: 'Manually add messages to a user\'s server count',
                                defaultMemberPermissions: PermissionFlagsBits.Administrator,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.User,
                                                name: 'user',
                                                description: 'The user to add messages to',
                                                required: true,
                                        },
                                        {
                                                type: ApplicationCommandOptionType.Integer,
                                                name: 'amount',
                                                description: 'Number of messages to add',
                                                required: true,
                                                min_value: 1,
                                                max_value: 5000,
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

                const amount = ctx.isSlash
                        ? ctx.options.getInteger('amount')
                        : parseInt(ctx.args[1], 10);

                if (!amount || isNaN(amount) || amount < 1 || amount > 5000) {
                        return ctx.reply({ content: 'You can only submit count in the range of 1 to 5000' });
                }

                await addUserMessageCount(ctx.guild.id, target.id, amount);

                const botName = ctx.client.user.displayName;

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**Success**`),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                [
                                        `Successfully added **${amount}** messages to **${target.displayName}**`,
                                        ``,
                                        `Add daily, weekly messages using **[${botName} Premium](https://discord.gg/QnWNz2dKCE)**`,
                                ].join('\n'),
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `-# Requested by ${ctx.member.displayName}`,
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new AddMessagesCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */