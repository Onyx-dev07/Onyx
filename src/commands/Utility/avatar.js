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
                return ctx.options.getUser('user') ?? ctx.user;
        }

        const arg = ctx.args[0];
        if (arg) {
                const idMatch = arg.match(/^<@!?(\d+)>$/) || arg.match(/^(\d{17,20})$/);
                const userId = idMatch ? idMatch[1] : null;
                if (userId) {
                        return ctx.client.users.fetch(userId).catch(() => null);
                }
        }

        return ctx.user;
};

class AvatarCommand extends Command {
        constructor() {
                super({
                        name: 'avatar',
                        description: 'Displays the avatar of a user',
                        usage: 'avatar [@user | userID]',
                        aliases: ['av', 'pfp'],
                        cooldown: 5,
                        enabledSlash: true,
                        slashData: {
                                name: 'avatar',
                                description: 'Displays the avatar of a user',
                                options: [
                                        {
                                                type: ApplicationCommandOptionType.User,
                                                name: 'user',
                                                description: 'The user whose avatar to show (defaults to yourself)',
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

                if (!user.avatar) {
                        return ctx.reply({
                                content: 'The user has no avatar.',
                                flags: MessageFlags.Ephemeral,
                        });
                }

                const member = ctx.guild?.members.cache.get(user.id);
                const displayName = member?.displayName ?? user.globalName ?? user.username;

                const avatarURL = user.displayAvatarURL({ size: 1024, extension: 'png' });
                const downloadURL = user.displayAvatarURL({ size: 1024, extension: user.avatar.startsWith('a_') ? 'gif' : 'png' });

                const container = new ContainerBuilder();
                container.setAccentColor(0xffffff);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `**${displayName}'s avatar**
[Download](${downloadURL})`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                container.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(
                                new MediaGalleryItemBuilder().setURL(avatarURL),
                        ),
                );

                await ctx.reply({
                        components: [container],
                        flags: MessageFlags.IsComponentsV2,
                });
        }
}

export default new AvatarCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */