// Onyx Discord Bot
// Author: Onyx
import {
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        ActionRowBuilder,
        ButtonBuilder,
        ButtonStyle,
} from 'discord.js';

const PER_PAGE = 10;

const LB_EMOJIS = {
        back:    { id: '1489565899852615911', name: 'lb_back'    },
        prev:    { id: '1489565903720026152', name: 'lb_prev'    },
        stop:    { id: '1489565907364741304', name: 'lb_stop'    },
        next:    { id: '1489565910628044981', name: 'lb_next'    },
        forward: { id: '1489565914360971356', name: 'lb_forward' },
};

/**
 * Builds the leaderboard container and navigation buttons.
 * @param {Object[]} allCounts - Sorted (desc) user count records.
 * @param {number}   page       - Current page (1-indexed).
 * @param {number}   totalPages
 * @param {string}   guildId
 * @param {string}   userId     - ID of the user who invoked the command.
 * @param {string}   botName    - Bot's display name for the Premium footer.
 * @param {'alltime'|'daily'} [mode='alltime'] - Which count to display.
 * @returns {{ components: import('discord.js').BaseComponent[] }}
 */
export function buildLeaderboard(allCounts, page, totalPages, guildId, userId, botName, mode = 'alltime') {
        const isDaily   = mode === 'daily';
        const prefix    = isDaily ? 'dlb' : 'lb';
        const countKey  = isDaily ? 'todayCount' : 'total';
        const title     = isDaily
                ? `**Daily Messages Leaderboard**
The messages are being updated in real-time!`
                : `**Messages Leaderboard**
The messages are being updated in real-time!`;

        const start = (page - 1) * PER_PAGE;
        const pageItems = allCounts.slice(start, start + PER_PAGE);

        const lines = pageItems.length > 0
                ? pageItems.map((item, i) =>
                        `\`#${start + i + 1}\` <@!${item.userId}> • **${(item[countKey] || 0).toLocaleString('en-US')}** messages`,
                )
                : ['No messages recorded yet.'];

        const container = new ContainerBuilder();
        container.setAccentColor(0xffffff);

        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(title),
        );

        container.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );

        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(lines.join('\n')),
        );

        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                        `-# Page ${page}/${totalPages} | Create live lbs using **${botName} Premium**`,
                ),
        );

        container.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );

        const isFirst = page <= 1;
        const isLast  = page >= totalPages;

        container.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                                .setCustomId(`${prefix}:first:${guildId}:${page}:${userId}`)
                                .setEmoji(LB_EMOJIS.prev)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(isFirst),
                        new ButtonBuilder()
                                .setCustomId(`${prefix}:prev:${guildId}:${page}:${userId}`)
                                .setEmoji(LB_EMOJIS.back)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(isFirst),
                        new ButtonBuilder()
                                .setCustomId(`${prefix}:stop:${guildId}:${page}:${userId}`)
                                .setEmoji(LB_EMOJIS.stop)
                                .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                                .setCustomId(`${prefix}:next:${guildId}:${page}:${userId}`)
                                .setEmoji(LB_EMOJIS.forward)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(isLast),
                        new ButtonBuilder()
                                .setCustomId(`${prefix}:last:${guildId}:${page}:${userId}`)
                                .setEmoji(LB_EMOJIS.next)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(isLast),
                ),
        );

        return { components: [container] };
}

/**
 * Builds the invite leaderboard container and navigation buttons.
 * @param {Object[]} allCounts - Sorted (desc) invite count records.
 * @param {number}   page
 * @param {number}   totalPages
 * @param {string}   guildId
 * @param {string}   userId
 * @returns {{ components: import('discord.js').BaseComponent[] }}
 */
export function buildInviteLeaderboard(allCounts, page, totalPages, guildId, userId) {
        const start = (page - 1) * PER_PAGE;
        const pageItems = allCounts.slice(start, start + PER_PAGE);

        const lines = pageItems.length > 0
                ? pageItems.map((item, i) =>
                        `\`#${start + i + 1}\` <@!${item.userId}> • **${(item.total || 0).toLocaleString('en-US')}** Invites (**${item.joins || 0}** Joins, **${item.left || 0}** Leaves, **${item.fake || 0}** Fakes, **${item.rejoins || 0}** Rejoins)`,
                )
                : ['No invites recorded yet.'];

        const container = new ContainerBuilder();
        container.setAccentColor(0xffffff);

        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                        `**Invites Leaderboard**
The invites are being updated in real-time!`,
                ),
        );

        container.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );

        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(lines.join('\n')),
        );

        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Page ${page}/${totalPages}`),
        );

        container.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );

        const isFirst = page <= 1;
        const isLast  = page >= totalPages;

        container.addActionRowComponents(
                new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                                .setCustomId(`ilb:first:${guildId}:${page}:${userId}`)
                                .setEmoji(LB_EMOJIS.prev)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(isFirst),
                        new ButtonBuilder()
                                .setCustomId(`ilb:prev:${guildId}:${page}:${userId}`)
                                .setEmoji(LB_EMOJIS.back)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(isFirst),
                        new ButtonBuilder()
                                .setCustomId(`ilb:stop:${guildId}:${page}:${userId}`)
                                .setEmoji(LB_EMOJIS.stop)
                                .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                                .setCustomId(`ilb:next:${guildId}:${page}:${userId}`)
                                .setEmoji(LB_EMOJIS.forward)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(isLast),
                        new ButtonBuilder()
                                .setCustomId(`ilb:last:${guildId}:${page}:${userId}`)
                                .setEmoji(LB_EMOJIS.next)
                                .setStyle(ButtonStyle.Secondary)
                                .setDisabled(isLast),
                ),
        );

        return { components: [container] };
}

export { PER_PAGE };

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */