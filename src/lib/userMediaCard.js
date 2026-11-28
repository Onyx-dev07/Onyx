// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
        ActionRowBuilder,
        ButtonBuilder,
        ButtonStyle,
        ContainerBuilder,
        MediaGalleryBuilder,
        MediaGalleryItemBuilder,
        MessageFlags,
        SeparatorBuilder,
        SeparatorSpacingSize,
        TextDisplayBuilder,
} = require('discord.js');

const emojis = require('../emojis.json');

function displayName(user) {
        return user?.displayName || user?.username || 'User';
}

async function resolveUser(client, message, args = []) {
        const mentioned = message.mentions?.users?.first();
        if (mentioned) return mentioned;

        const raw = String(args?.[0] || '').trim();
        if (raw) {
                const id = raw.replace(/^<@!?(\d+)>$/, '$1');
                try {
                        return await client.users.fetch(id);
                } catch {
                        return message.author;
                }
        }

        return message.author;
}

function divider() {
        return new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true);
}

function missingCard(user) {
        const name = displayName(user);

        const header = new TextDisplayBuilder().setContent(
                `## ${emojis.info} ${name} has no banner\nBanners are only visible on users who have one set.`
        );

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(header)
                .addSeparatorComponents(divider())
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`-# Try \`!banner @someone\` to check another user.`)
                );

        return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

function mediaCard({ title, subtitle, jpgUrl, pngUrl, description }) {
        const header = new TextDisplayBuilder().setContent(`## ${title}\n${subtitle}`);

        const gallery = new MediaGalleryBuilder()
                .addItems(
                        new MediaGalleryItemBuilder()
                                .setURL(jpgUrl)
                                .setDescription(description)
                );

        const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                        .setLabel('JPG')
                        .setStyle(ButtonStyle.Link)
                        .setURL(jpgUrl),
                new ButtonBuilder()
                        .setLabel('PNG')
                        .setStyle(ButtonStyle.Link)
                        .setURL(pngUrl)
        );

        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(header)
                .addSeparatorComponents(divider())
                .addMediaGalleryComponents(gallery)
                .addSeparatorComponents(divider())
                .addActionRowComponents(buttons);

        return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

function errorCard(message) {
        const container = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(`${emojis.error} **${message}**`)
                );

        return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

module.exports = {
        displayName,
        resolveUser,
        missingCard,
        mediaCard,
        errorCard,
};
