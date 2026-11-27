// Onyx Discord Bot
// Author: Onyx
import {
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        SectionBuilder,
        ThumbnailBuilder,
        ActionRowBuilder,
        ButtonBuilder,
        ButtonStyle,
        StringSelectMenuBuilder,
        StringSelectMenuOptionBuilder,
} from 'discord.js';

const SL_PER_PAGE = 5;

const LB_EMOJIS = {
        back:    { id: '1489565899852615911', name: 'lb_back'    },
        prev:    { id: '1489565903720026152', name: 'lb_prev'    },
        stop:    { id: '1489565907364741304', name: 'lb_stop'    },
        next:    { id: '1489565910628044981', name: 'lb_next'    },
        forward: { id: '1489565914360971356', name: 'lb_forward' },
};

/**
 * Builds the server list container with pagination buttons and sort select menu.
 * @param {import('discord.js').Guild[]} guilds  - Sorted guild objects.
 * @param {number}   page        - Current page (1-indexed).
 * @param {number}   totalPages
 * @param {string}   userId      - ID of the user who invoked the command.
 * @param {'htl'|'lth'} [sort='htl'] - Sort order: high-to-low or low-to-high by member count.
 * @returns {{ components: import('discord.js').BaseComponent[] }}
 */
export function buildServerList(guilds, page, totalPages, userId, sort = 'htl') {
        const start     = (page - 1) * SL_PER_PAGE;
        const pageItems = guilds.slice(start, start + SL_PER_PAGE);
        const sortLabel = sort === 'htl' ? 'High → Low' : 'Low → High';

        const container = new ContainerBuilder();
        container.setAccentColor(0xffffff);

        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                        `**Server List** • ${guilds.length.toLocaleString('en-US')} server${guilds.length !== 1 ? 's' : ''} | Sorted by members: ${sortLabel}`,
                ),
        );

        container.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );

        if (pageItems.length === 0) {
                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('No servers found.'),
                );
        } else {
                for (const guild of pageItems) {
                        const iconURL     = guild.iconURL({ size: 128, extension: 'png' });
                        const memberCount = (guild.memberCount ?? 0).toLocaleString('en-US');

                        const text = new TextDisplayBuilder().setContent(
                                `**${guild.name}**\n` +
                                `**Server ID:** \`${guild.id}\`\n` +
                                `**Owner ID:** \`${guild.ownerId}\`\n` +
                                `**Members:** ${memberCount}`,
                        );

                        if (iconURL) {
                                container.addSectionComponents(
                                        new SectionBuilder()
                                                .addTextDisplayComponents(text)
                                                .setThumbnailAccessory(new ThumbnailBuilder().setURL(iconURL)),
                                );
                        } else {
                                container.addTextDisplayComponents(text);
                        }

                        container.addSeparatorComponents(
                                new SeparatorBuilder().setDivider(false).setSpacing(SeparatorSpacingSize.Small),
                        );
                }
        }

        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Page ${page}/${totalPages}`),
        );

        container.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );

        container.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                                .setCustomId(`slsort:${page}:${userId}:${sort}`)
                                .setPlaceholder(sort === 'htl' ? 'High → Low (Members)' : 'Low → High (Members)')
                                .addOptions(
                                        new StringSelectMenuOptionBuilder()
                                                .setLabel('High → Low (Members)')
                                                .setValue('htl')
                                                .setDefault(sort === 'htl'),
                                        new StringSelectMenuOptionBuilder()
                                                .setLabel('Low → High (Members)')
                                                .setValue('lth')
                                                .setDefault(sort === 'lth'),
                                ),
                ),
        );

        const isFirst = page <= 1;
        const isLast  = page >= totalPages;

        container.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                                .setCustomId(`sl:first:${page}:${userId}:${sort}`)
                                .setEmoji(LB_EMOJIS.prev)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(isFirst),
                        new ButtonBuilder()
                                .setCustomId(`sl:prev:${page}:${userId}:${sort}`)
                                .setEmoji(LB_EMOJIS.back)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(isFirst),
                        new ButtonBuilder()
                                .setCustomId(`sl:stop:${page}:${userId}:${sort}`)
                                .setEmoji(LB_EMOJIS.stop)
                                .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                                .setCustomId(`sl:next:${page}:${userId}:${sort}`)
                                .setEmoji(LB_EMOJIS.forward)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(isLast),
                        new ButtonBuilder()
                                .setCustomId(`sl:last:${page}:${userId}:${sort}`)
                                .setEmoji(LB_EMOJIS.next)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(isLast),
                ),
        );

        return { components: [container] };
}

export { SL_PER_PAGE };

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */
