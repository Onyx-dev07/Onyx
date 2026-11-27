// Onyx Discord Bot
// Author: Onyx
import { config } from '#config';
import { cacheGuildInvites } from '../clientReady.js';
import {
        ContainerBuilder,
        TextDisplayBuilder,
        SectionBuilder,
        ThumbnailBuilder,
        MessageFlags,
} from 'discord.js';

export default {
        name: 'guildCreate',
        async execute({ eventArgs, client }) {
                const [guild] = eventArgs;

                await cacheGuildInvites(guild, client).catch(() => {});

                let owner = null;
                try {
                        owner = await guild.fetchOwner();
                } catch {
                        return;
                }

                const botName = client.user.username;
                const supportLink = config.links.supportServer;
                const iconURL = guild.iconURL({ size: 256, extension: 'png', forceStatic: false });

                const content = [
                        `**Hello ${owner.user.username}**`,
                        `Thanks for adding me in ${guild.name}`,
                        `**Get Started**`,
                        `Get started with the bot by joining our [support server](${supportLink}). For detailed information about the features please visit the [commands page](${supportLink})!`,
                        `**Support**`,
                        `Need help? Join our [support server](${supportLink}), we are always happy to assist you!`,
                        `**Premium**`,
                        `Want no restrictions? Get more out of ${botName}, visit [Premium Page](${supportLink}) for more information!`,
                ].join('\n');

                const container = new ContainerBuilder();
                container.setAccentColor(0x000000);

                const section = new SectionBuilder()
                        .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(content),
                        );

                if (iconURL) {
                        section.setThumbnailAccessory(new ThumbnailBuilder().setURL(iconURL));
                }

                container.addSectionComponents(section);

                await owner.user
                        .send({ components: [container], flags: MessageFlags.IsComponentsV2 })
                        .catch(() => {});
        },
};

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */
