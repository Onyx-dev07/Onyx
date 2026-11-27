// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        ButtonStyle,
        ButtonBuilder,
        ActionRowBuilder,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
} from 'discord.js';

class PremiumCommand extends Command {
        constructor() {
                super({
                        name: 'premium',
                        description: 'Shows information about Onyx Premium',
                        usage: 'premium',
                        cooldown: 10,
                        enabledSlash: true,
                        slashData: {
                                name: 'premium',
                                description: 'Shows information about Onyx Premium',
                        },
                });
        }

        async execute({ ctx }) {
                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('**Onyx Premium**'),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                'Onyx Premium is now available to purchase, you can purchase Onyx Premium by joining the official support server',
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                container.addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                        .setLabel('Get Premium')
                                        .setURL('https://discord.gg/QnWNz2dKCE')
                                        .setStyle(ButtonStyle.Link),
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new PremiumCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */