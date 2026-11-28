// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
    PermissionsBitField, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    SeparatorSpacingSize, ActionRowBuilder, StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder, MessageFlags
} = require('discord.js');
const { TicketConfig, TicketCategory } = require('../../../data/models');
const { logTicketEvent, refreshPanel } = require('../../../lib/ticketUtils');

function reply(ctx, text) {
    const container = new ContainerBuilder().setAccentColor(0x2B2D31)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
    const opts = { components: [container], flags: MessageFlags.IsComponentsV2 };
    return ctx.deferred ? ctx.editReply(opts) : ctx.reply(opts);
}

module.exports = {
    async execute(interactionOrMessage) {
        const guild = interactionOrMessage.guild;
        const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
        const member = guild.members.cache.get(userId);

        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return reply(interactionOrMessage, 'You need **Administrator** permission to use this command.');
        }

        const config = await TicketConfig.findOne({ where: { guildId: guild.id } });
        if (!config) return reply(interactionOrMessage, 'Ticket system is not configured. Use `ticket setup` first.');

        const categories = await TicketCategory.findAll({ where: { guildId: guild.id }, order: [['id', 'ASC']] });
        if (categories.length === 0) return reply(interactionOrMessage, 'No categories to remove.');

        const options = categories.map(cat =>
            new StringSelectMenuOptionBuilder()
                .setLabel(cat.categoryName.substring(0, 25))
                .setValue(String(cat.id))
                .setDescription(`ID: ${cat.id}`)
        );

        const selectContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Remove Category'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Select a category to remove.'))
            .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
            .addActionRowComponents(new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder().setCustomId('ticket_removecat_select').setPlaceholder('Select category...').setMaxValues(1).addOptions(options)
            ));

        const msg = await (interactionOrMessage.isCommand?.()
            ? interactionOrMessage.reply({ components: [selectContainer], flags: MessageFlags.IsComponentsV2 })
            : interactionOrMessage.reply({ components: [selectContainer], flags: MessageFlags.IsComponentsV2 }));
        const sentMsg = msg || await interactionOrMessage.fetchReply?.() || await interactionOrMessage.channel.messages.fetch({ limit: 1 }).then(m => m.first());

        try {
            const selectInteraction = await sentMsg.awaitMessageComponent({
                filter: i => i.customId === 'ticket_removecat_select' && i.user.id === userId,
                time: 60000
            });

            const catId = selectInteraction.values[0];
            const category = categories.find(c => String(c.id) === catId);
            if (!category) {
                return selectInteraction.update({ components: [new ContainerBuilder().setAccentColor(0x2B2D31)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('Category not found.'))] });
            }

            const catName = category.categoryName;
            await category.destroy();
            await logTicketEvent(guild, config, 'Category Removed', `**Category:** ${catName}\n**Removed by:** <@${userId}>`);
            refreshPanel(guild, config).catch(() => {});

            const doneContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Category Removed'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`> **${catName}** has been removed.`));
            await selectInteraction.update({ components: [doneContainer] });
        } catch {
            const expiredContainer = new ContainerBuilder().setAccentColor(0x2B2D31)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Remove Category'))
                .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('> Timed out.'));
            await sentMsg.edit({ components: [expiredContainer] }).catch(() => {});
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