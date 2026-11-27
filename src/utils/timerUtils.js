// Onyx Discord Bot
// Author: Onyx
import {
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
} from 'discord.js';
import { emoji } from '#emoji';

export const timerStore = new Map();

export const formatTime = (date) =>
        date.toLocaleTimeString('en-IN', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata',
        });

export const buildStartComponents = (title, endTimestamp, endTimeStr) => {
        const header = new TextDisplayBuilder().setContent(
                `${emoji.timer_clock} **Timer** ${emoji.timer_clock}`,
        );

        const container = new ContainerBuilder();
        container.setAccentColor(0xffffff);
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`));
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                        `${emoji.timer_animated} Ends : <t:${endTimestamp}:R> (<t:${endTimestamp}:f>) ${emoji.timer_animated}`,
                ),
        );
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Timer ends | Today at ${endTimeStr}`),
        );

        return [header, container];
};

export const buildPausedComponents = (title, pauseTimeStr) => {
        const header = new TextDisplayBuilder().setContent(
                `${emoji.timer_roll} ** Timer paused ** ${emoji.timer_roll}`,
        );

        const container = new ContainerBuilder();
        container.setAccentColor(0xffffff);
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`));
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                        `${emoji.timer_play_pause} **TIMER PAUSED** ${emoji.timer_play_pause}`,
                ),
        );
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Timer paused | Today at ${pauseTimeStr}`),
        );

        return [header, container];
};

export const buildEndComponents = (title, endTimestamp, endTimeStr) => {
        const header = new TextDisplayBuilder().setContent(
                `${emoji.timer_ringing} **Timer Ended** ${emoji.timer_ringing}`,
        );

        const container = new ContainerBuilder();
        container.setAccentColor(0xffffff);
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`**${title}**`));
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(
                        `${emoji.timer_alarm} Timer ended at <t:${endTimestamp}:f> ${emoji.timer_alarm}`,
                ),
        );
        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(SeparatorSpacingSize.Small));
        container.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`-# Timer Ended | Today at ${endTimeStr}`),
        );

        return [header, container];
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