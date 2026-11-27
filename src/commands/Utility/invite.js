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
import { config } from '#config';

class InviteCommand extends Command {
        constructor() {
                super({
                        name: 'invite',
                        description: 'Displays the invite links of the bot from which you can invite me in your server',
                        usage: 'invite',
                        aliases: ['inv', 'add'],
                        cooldown: 120,
                        enabledSlash: true,
                        slashData: {
                                name: 'invite',
                                description: 'Displays the invite links of the bot from which you can invite me in your server',
                        },
                });
        }

        async execute({ ctx }) {
                const { clientId } = config;
                const botName = ctx.client.user.username;

                const suffLink = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=268823806&scope=bot%20applications.commands`;
                const adminLink = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**${botName} bot Invite**
` +
                                `**Invite ${botName} by clicking on this link:**
` +
                                `With sufficient permissions **[Click here to invite](${suffLink})**
` +
                                `**Invite ${botName} by clicking on this link:**
` +
                                `With admin permissions **[Click here to invite](${adminLink})**`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `-# Requested by - ${ctx.author.username}`,
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new InviteCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */