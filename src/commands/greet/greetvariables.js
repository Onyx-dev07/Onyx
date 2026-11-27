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

const VARIABLES = [
        ['$member_count', 'Server member count'],
        ['$ordinal_member_count', 'Ordinal server member count'],
        ['$member_name', "Member's name"],
        ['$member', "Member's name and tag"],
        ['$member_mention', 'Mention the member'],
        ['$guild_name', 'Server name'],
        ['$join_time', 'Member joined at'],
];

class GreetVariablesCommand extends Command {
        constructor() {
                super({
                        name: 'greetvariables',
                        description: 'List all available greet message variables',
                        usage: 'greetvariables',
                        cooldown: 5,
                        enabledSlash: true,
                        slashData: {
                                name: 'greetvariables',
                                description: 'List all available greet message variables',
                        },
                });
        }

        async execute({ ctx }) {
                const lines = VARIABLES.map(([v, desc]) => `\`${v}\` : ${desc}`).join('\n');

                const container = new ContainerBuilder().setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('**Greet variables**'),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(lines),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new GreetVariablesCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */