// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
} from 'discord.js';
import { db } from '#dbManager';

class ResetMyInvitesCommand extends Command {
        constructor() {
                super({
                        name: 'resetmyinvites',
                        description: 'Reset your own invite count in this server',
                        cooldown: 10,
                        enabledSlash: true,
                        slashData: {
                                name: 'resetmyinvites',
                                description: 'Reset your own invite count in this server',
                        },
                });
        }

        async execute({ ctx }) {
                await db.userInviteCounter?.resetAll(ctx.guild.id, ctx.member.id);

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('**Success**'),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `${ctx.member.displayName}, I have successfully reset your invites in this guild`,
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new ResetMyInvitesCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */