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

class PingCommand extends Command {
        constructor() {
                super({
                        name: 'ping',
                        description: 'Displays the api latency',
                        aliases: ['latency', 'ms', 'pong'],
                        cooldown: 30,
                        enabledSlash: true,
                        slashData: {
                                name: 'ping',
                                description: 'Displays the api latency',
                        },
                });
        }

        async execute({ ctx }) {
                const start = Date.now();
                await ctx.reply({ content: 'Pinging...' });
                const latency = Date.now() - start;

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**${ctx.client.user.username} Ping**`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**Ping**\n${ctx.client.ws.ping}ms`,
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

                await ctx.editReply({
                        content: '',
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new PingCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */