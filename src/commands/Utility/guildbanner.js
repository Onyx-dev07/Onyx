// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        MediaGalleryBuilder,
        MediaGalleryItemBuilder,
} from 'discord.js';

class GuildBannerCommand extends Command {
        constructor() {
                super({
                        name: 'guildbanner',
                        description: "Displays a guild's banner",
                        usage: 'guildbanner',
                        aliases: ['serverbanner', 'gbanner'],
                        cooldown: 5,
                        enabledSlash: true,
                        slashData: {
                                name: 'guildbanner',
                                description: "Displays a guild's banner",
                        },
                });
        }

        async execute({ ctx }) {
                const guild = ctx.guild;

                if (!guild.banner) {
                        return ctx.reply({
                                content: 'The server has no banner.',
                                flags: MessageFlags.Ephemeral,
                        });
                }

                const bannerURL = guild.bannerURL({ size: 1024, extension: 'png' });
                const downloadURL = guild.bannerURL({ size: 1024, extension: guild.banner.startsWith('a_') ? 'gif' : 'png' });

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**${guild.name}'s banner**
[Download](${downloadURL})`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                container.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                                new MediaGalleryItemBuilder().setURL(bannerURL),
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new GuildBannerCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */