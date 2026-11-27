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
        MessageFlags,
} from 'discord.js';
import { emoji } from '#emoji';
import { cross, panelPayload, tick } from './moderation.js';

export const GWAY_EMOJI_ID = emoji.giveaway_react;
export const GWAY_EMOJI_RAW_ID = emoji.giveaway_react.match(/:(\d+)>/)?.[1] ?? emoji.giveaway_react;

export const giveawayStore = new Map();

export const formatTime = (date) =>
        date.toLocaleTimeString('en-IN', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata',
        });

export const buildActiveComponents = (prize, winners, endTimestamp, hostId) => {
        const endTimeStr = formatTime(new Date(endTimestamp * 1000));

        const header = new TextDisplayBuilder().setContent(
                `${emoji.giveaway} **New Giveaway** ${emoji.giveaway}`,
        );

        const container = new ContainerBuilder();
        container.setAccentColor(0xffffff);
        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${emoji.giveaway_gift} **${prize}** ${emoji.giveaway_gift}`),
        );
        container.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );
        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                        `${emoji.giveaway_dot} Winners: ${winners}
` +
                        `${emoji.giveaway_dot} Ends: <t:${endTimestamp}:R> (<t:${endTimestamp}:f>)
` +
                        `${emoji.giveaway_dot} Hosted by: <@${hostId}>

` +
                        `${emoji.giveaway_dot} React with ${emoji.giveaway_react} to participate!`,
                ),
        );
        container.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );
        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Ends at | Today at ${endTimeStr}`),
        );

        return [header, container];
};

export const buildEndedComponents = (prize, totalParticipants, hostId, endTimeStr) => {
        const header = new TextDisplayBuilder().setContent(
                `${emoji.giveaway} **Giveaway Ended** ${emoji.giveaway}`,
        );

        const container = new ContainerBuilder();
        container.setAccentColor(0xffffff);
        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${emoji.giveaway_gift} **${prize}** ${emoji.giveaway_gift}`),
        );
        container.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );
        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                        `${emoji.giveaway_dot} Hosted by: <@!${hostId}>
` +
                        `${emoji.giveaway_dot} Total participant(s) : ${totalParticipants}`,
                ),
        );
        container.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );
        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Ended | Today at ${endTimeStr}`),
        );

        return [header, container];
};

export const buildNoEntriesComponents = (prize, hostId, endTimeStr) => {
        const header = new TextDisplayBuilder().setContent(
                `${emoji.giveaway} **Giveaway Ended** ${emoji.giveaway}`,
        );

        const container = new ContainerBuilder();
        container.setAccentColor(0xffffff);
        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`${emoji.giveaway_gift} **${prize}** ${emoji.giveaway_gift}`),
        );
        container.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );
        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                        `${emoji.giveaway_dot} Hosted by: <@!${hostId}>
` +
                        `**Winners :**
No entries detected therefore cannot declare the winner`,
                ),
        );
        container.addSeparatorComponents(
                new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small),
        );
        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Ended | Today at ${endTimeStr}`),
        );

        return [header, container];
};

export const endGiveaway = async (messageId, giveaway) => {
        const endedTimeStr = formatTime(new Date());
        const participantsList = [...giveaway.participants];
        const totalParticipants = participantsList.length;

        giveaway.status = 'ended';
        clearTimeout(giveaway.timerId);
        giveawayStore.set(messageId, giveaway);

        if (totalParticipants === 0) {
                const noEntriesComponents = buildNoEntriesComponents(giveaway.prize, giveaway.hostId, endedTimeStr);
                await giveaway.giveawayMsg.edit({
                        components: noEntriesComponents,
                        flags: MessageFlags.IsComponentsV2,
                }).catch(() => null);

                const noEntryLinkRow = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                                .setLabel('Giveaway Link')
                                .setStyle(ButtonStyle.Link)
                                .setURL(giveaway.giveawayMsg.url),
                );

                await giveaway.giveawayMsg.channel.send(
                        panelPayload({
                                title: 'Giveaway',
                                lines: [`${cross()} No entries detected therefore cannot declare the winner.`],
                                extraComponents: [noEntryLinkRow],
                        }),
                ).catch(() => null);
                return;
        }

        const winnerCount = Math.min(giveaway.winners, totalParticipants);
        const shuffled = [...participantsList].sort(() => Math.random() - 0.5);
        const winners = shuffled.slice(0, winnerCount);

        giveaway.lastWinners = winners;
        giveawayStore.set(messageId, giveaway);

        const endedComponents = buildEndedComponents(giveaway.prize, totalParticipants, giveaway.hostId, endedTimeStr);
        await giveaway.giveawayMsg.edit({
                components: endedComponents,
                flags: MessageFlags.IsComponentsV2,
        }).catch(() => null);

        const winnerMentions = winners.map((id) => `<@${id}>`).join(', ');
        const linkRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                        .setLabel('Giveaway Link')
                        .setStyle(ButtonStyle.Link)
                        .setURL(giveaway.giveawayMsg.url),
        );

        await giveaway.giveawayMsg.channel.send(
                panelPayload({
                        title: 'Giveaway Winners',
                        lines: [
                                `${tick()} Congrats, ${winnerMentions} you have won **${giveaway.prize}**, hosted by <@!${giveaway.hostId}>.`,
                        ],
                        extraComponents: [linkRow],
                        allowedMentions: { users: winners },
                }),
        ).catch(() => null);
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