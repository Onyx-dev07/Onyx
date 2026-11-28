// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
        ContainerBuilder,
        MessageFlags,
        SeparatorBuilder,
        SeparatorSpacingSize,
        TextDisplayBuilder,
} = require('discord.js');

const emojis = require('../emojis.json');

const FOOTER = '-# Channel management • Onyx';

function divider(dividerLine = true) {
        return new SeparatorBuilder()
                .setSpacing(SeparatorSpacingSize.Small)
                .setDivider(dividerLine);
}

function channelMention(channel, fallback = 'Unknown') {
        return channel?.id ? `<#${channel.id}>` : fallback;
}

function moderatorMention(moderator, fallback = 'Unknown') {
        const id = moderator?.id || moderator?.user?.id;
        return id ? `<@${id}>` : fallback;
}

function withFlags(payload, ephemeral) {
        if (!ephemeral) return payload;
        return { ...payload, flags: payload.flags | MessageFlags.Ephemeral };
}

function card(title, icon, lines) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`### ${icon} ${title}`)
                )
                .addSeparatorComponents(divider())
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(lines.join('\n'))
                )
                .addSeparatorComponents(divider(false))
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(FOOTER)
                );

        return {
                components: [container],
                flags: MessageFlags.IsComponentsV2,
                allowedMentions: { parse: [] },
        };
}

function locked({ channel, moderator }) {
        return card('Channel Locked!', emojis.channelLocked, [
                `${emojis.nickSuccess} **Channel:** ${channelMention(channel)}`,
                `${emojis.nickUser} **Moderator:** ${moderatorMention(moderator)}`,
                `${emojis.nickRight} **Status:** Locked for @everyone`,
        ]);
}

function unlocked({ channel, moderator }) {
        return card('Channel Unlocked!', emojis.channelUnlocked, [
                `${emojis.nickSuccess} **Channel:** ${channelMention(channel)}`,
                `${emojis.nickUser} **Moderator:** ${moderatorMention(moderator)}`,
                `${emojis.nickRight} **Status:** Unlocked for @everyone`,
        ]);
}

function error(title, text) {
        return card(title, emojis.nickError, [text]);
}

module.exports = {
        locked,
        unlocked,
        error,
        withFlags,
};
