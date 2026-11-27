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
        ApplicationCommandOptionType,
} from 'discord.js';

const resolveUser = async (ctx) => {
        if (ctx.isSlash) {
                const picked = ctx.options.getUser('user') ?? ctx.user;
                return ctx.client.users.fetch(picked.id, { force: true }).catch(() => null);
        }

        const arg = ctx.args[0];
        if (arg) {
                const idMatch = arg.match(/^<@!?(\d+)>$/) || arg.match(/^(\d{17,20})$/);
                const userId = idMatch ? idMatch[1] : null;
                if (userId) {
                        return ctx.client.users.fetch(userId, { force: true }).catch(() => null);
                }
        }

        return ctx.client.users.fetch(ctx.user.id, { force: true }).catch(() => null);
};

class BannerCommand extends Command {
        constructor() {
                super({
                        name: 'banner',
                        description: 'Displays the banner of a user',
                        usage: 'banner [@user | userID]',
                        aliases: ['userbanner'],
                        cooldown: 5,
                        enabledSlash: true,
                        slashData: {
                                name: 'banner',
                                description: 'Displays the banner of a user',
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.User,
                                                name: 'user',
                                                description: 'The user whose banner to show (defaults to yourself)',
                                                required: false,
                                        },
                                ],
                        },
                });
        }

        async execute({ ctx }) {
                const user = await resolveUser(ctx);

                if (!user) {
                        return ctx.reply({
                                content: 'Could not find that user.',
                                flags: MessageFlags.Ephemeral,
                        });
                }

                if (!user.banner) {
                        return ctx.reply({
                                content: 'The user has no banner.',
                                flags: MessageFlags.Ephemeral,
                        });
                }

                const member = ctx.guild?.members.cache.get(user.id);
                const displayName = member?.displayName ?? user.globalName ?? user.username;

                const bannerURL = user.bannerURL({ size: 1024, extension: 'png' });
                const downloadURL = user.bannerURL({ size: 1024, extension: user.banner.startsWith('a_') ? 'gif' : 'png' });

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**${displayName}'s banner**
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

export default new BannerCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */