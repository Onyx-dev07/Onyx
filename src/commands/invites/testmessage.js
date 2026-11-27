// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import { ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { resolveInviteVariables } from '#utils';
import { db } from '#dbManager';

class TestMessageCommand extends Command {
        constructor() {
                super({
                        name: 'testmessage',
                        description: 'Preview a message template with your own data as an example',
                        usage: 'testmessage <message>',
                        cooldown: 5,
                        minArgs: 1,
                        examples: ['testmessage Welcome {user}!'],
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'testmessage',
                                description: 'Preview a message template with your own data as an example',
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.String,
                                                name: 'message',
                                                description: 'The message template to preview',
                                                required: true,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                const template = ctx.isSlash
                        ? ctx.options.getString('message')
                        : ctx.args.join(' ');

                const inviteData = await db.userInviteCounter?.getCount(ctx.guild.id, ctx.author.id) ?? {};

                const result = resolveInviteVariables(template.trim(), {
                        member: ctx.member,
                        inviter: ctx.author,
                        inviteData,
                        guild: ctx.guild,
                });

                await ctx.reply({ content: result });
        }
}

export default new TestMessageCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */