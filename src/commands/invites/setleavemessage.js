// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        PermissionFlagsBits,
        ApplicationCommandOptionType,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
} from 'discord.js';
import { db } from '#dbManager';
import { emoji } from '#emoji';

class SetLeaveMessageCommand extends Command {
        constructor() {
                super({
                        name: 'setleavemessage',
                        description: 'Set a custom leave message for the invite logger',
                        usage: 'setleavemessage <message>',
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['setleavemessage Goodbye {user}!'],
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'setleavemessage',
                                description: 'Set a custom leave message for the invite logger',
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.String,
                                                name: 'message',
                                                description: 'The leave message template (use $variables)',
                                                required: true,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                const message = ctx.isSlash
                        ? ctx.options.getString('message')
                        : ctx.message.content
                                .slice(ctx.prefix.length)
                                .trimStart()
                                .replace(/^\S+[ \t]*/, '');

                await db.guild?.setLeaveMessage(ctx.guild.id, message.trim());

                const container = new ContainerBuilder().setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('**Invite message configured**'),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `${emoji.tick} **| Your invite leave message has been configured.**`,
                        ),
                );

                await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
}

export default new SetLeaveMessageCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */