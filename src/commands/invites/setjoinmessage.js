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

class SetJoinMessageCommand extends Command {
        constructor() {
                super({
                        name: 'setjoinmessage',
                        description: 'Set a custom join message for the invite logger',
                        usage: 'setjoinmessage <message>',
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['setjoinmessage Welcome {user} to {server}!'],
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'setjoinmessage',
                                description: 'Set a custom join message for the invite logger',
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.String,
                                                name: 'message',
                                                description: 'The join message template (use $variables)',
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

                await db.guild?.setJoinMessage(ctx.guild.id, message.trim());

                const container = new ContainerBuilder().setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('**Invite message configured**'),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `${emoji.tick} **| Your invite join message has been configured.**`,
                        ),
                );

                await ctx.reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
        }
}

export default new SetJoinMessageCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */