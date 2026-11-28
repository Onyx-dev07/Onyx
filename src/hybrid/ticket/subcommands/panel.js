// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
    PermissionsBitField, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    SeparatorSpacingSize, ActionRowBuilder, StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder, SectionBuilder, ThumbnailBuilder,
    MessageFlags, MediaGalleryBuilder, MediaGalleryItemBuilder
} = require('discord.js');
const { TicketConfig, TicketCategory } = require('../../../data/models');

function reply(ctx, text) {
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    const opts = { components: [container], flags: MessageFlags.IsComponentsV2 };
    return ctx.deferred ? ctx.editReply(opts) : ctx.reply(opts);
}

module.exports = {
    async execute(interactionOrMessage) {
        const guild = interactionOrMessage.guild;
        const member = interactionOrMessage.member;

        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return reply(interactionOrMessage, 'You need **Administrator** permission.');
        }

        const config = await TicketConfig.findOne({ where: { guildId: guild.id } });
        if (!config) return reply(interactionOrMessage, 'Ticket system is not configured. Use `ticket setup` first.');

        const categories = await TicketCategory.findAll({ where: { guildId: guild.id }, order: [['id', 'ASC']] });
        if (categories.length === 0) return reply(interactionOrMessage, 'No ticket categories found. Please run setup again.');

        try {
            const panelChannel = guild.channels.cache.get(config.panelChannelId);
            if (!panelChannel) return reply(interactionOrMessage, 'Panel channel not found. Please reconfigure.');

            const panelContainer = new ContainerBuilder();
            if (config.panelColor) panelContainer.setAccentColor(config.panelColor);

            const title = config.panelTitle || 'Support Tickets';
            const titleContent = `**${title}**${config.panelDescription ? '\n' + config.panelDescription : ''}`;
            const thumbnailURL = config.panelThumbnail || guild.iconURL({ dynamic: true, size: 256 }) || null;

            if (thumbnailURL) {
                panelContainer.addSectionComponents(
                    new SectionBuilder()
                        .addTextDisplayComponents(new TextDisplayBuilder().setContent(titleContent))
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailURL))
                );
            } else {
                panelContainer.addTextDisplayComponents(new TextDisplayBuilder().setContent(titleContent));
            }

            panelContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));

            if (config.panelImage) {
                try {
                    panelContainer.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(config.panelImage).setDescription('Support System'))
                    );
                    panelContainer.addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true));
                } catch {}
            }

            const options = categories.map(cat => {
                const opt = new StringSelectMenuOptionBuilder()
                    .setLabel(cat.categoryName.substring(0, 25))
                    .setValue(cat.categoryName);
                if (cat.description) opt.setDescription(cat.description.substring(0, 50));
                if (cat.emoji) { try { opt.setEmoji(cat.emoji); } catch {} }
                return opt;
            });

            panelContainer.addActionRowComponents(new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('create_ticket').setPlaceholder('Select a category to create a ticket...').setMaxValues(1).addOptions(options)
            ));

            if (config.panelMessageId) {
                try {
                    const oldMsg = await panelChannel.messages.fetch(config.panelMessageId);
                    if (oldMsg) await oldMsg.delete();
                } catch {}
            }

            const panelMsg = await panelChannel.send({ components: [panelContainer], flags: MessageFlags.IsComponentsV2 });
            config.panelMessageId = panelMsg.id;
            await config.save();
            return reply(interactionOrMessage, 'Ticket panel sent successfully.');
        } catch (error) {
            console.error('Panel send error:', error);
            return reply(interactionOrMessage, `Failed to send ticket panel: ${error.message}`);
        }
    }
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */