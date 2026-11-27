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

class MemberCountCommand extends Command {
        constructor() {
                super({
                        name: 'membercount',
                        description: 'Displays the member count of the server',
                        usage: 'membercount',
                        aliases: ['mc'],
                        cooldown: 5,
                        enabledSlash: true,
                        slashData: {
                                name: 'membercount',
                                description: 'Displays the member count of the server',
                        },
                });
        }

        async execute({ ctx }) {
                const guild = ctx.guild;
                const count = guild.memberCount.toLocaleString('en-US');

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`**${guild.name}**`),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**__Total members__** : **${count}**`,
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new MemberCountCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */