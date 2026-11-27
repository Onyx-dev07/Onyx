// Onyx Discord Bot
// Author: Onyx
import {
        MessageFlags,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        ChannelType,
        ActionRowBuilder,
        ChannelSelectMenuBuilder,
        SectionBuilder,
        ThumbnailBuilder,
        ModalBuilder,
        TextInputBuilder,
        TextInputStyle,
        MediaGalleryBuilder,
        MediaGalleryItemBuilder,
        ButtonBuilder,
        ButtonStyle,
        StringSelectMenuBuilder,
        StringSelectMenuOptionBuilder,
} from 'discord.js';
import { db } from '#dbManager';

const isValidUrl = (url) => url && (url.startsWith('http://') || url.startsWith('https://'));

function userError(interaction) {
        const c = new ContainerBuilder().setAccentColor(0xffffff)
                .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('Only the command user can use this menu!'),
                );
        return interaction.reply({ components: [c], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
}

function buildContainerPreview(config) {
        const preview = new ContainerBuilder();
        if (config.color) preview.setAccentColor(config.color);

        preview.addTextDisplayComponents(
                new TextDisplayBuilder().setContent(`### ${config.title || 'Welcome'}`),
        );
        preview.addSeparatorComponents(
                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
        );

        if (isValidUrl(config.thumbnailUrl)) {
                const section = new SectionBuilder()
                        .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(config.description || 'No description set.'),
                        )
                        .setThumbnailAccessory(new ThumbnailBuilder().setURL(config.thumbnailUrl));
                preview.addSectionComponents(section);
        } else {
                preview.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(config.description || 'No description set.'),
                );
        }

        if (isValidUrl(config.imageUrl)) {
                preview.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );
                preview.addMediaGalleryComponents(
                        new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(config.imageUrl)),
                );
        }

        return preview;
}

function buildContainerEditor(config, originalUserId) {
        const preview = buildContainerPreview(config);

        const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`greet_field_select_${originalUserId}`)
                .setPlaceholder('Select a field to customise')
                .addOptions(
                        new StringSelectMenuOptionBuilder().setLabel('Title').setDescription('Set the container title').setValue('title'),
                        new StringSelectMenuOptionBuilder().setLabel('Description').setDescription('Set the container description').setValue('description'),
                        new StringSelectMenuOptionBuilder().setLabel('Color').setDescription('Set the accent colour (hex code)').setValue('color'),
                        new StringSelectMenuOptionBuilder().setLabel('Thumbnail').setDescription('Set the thumbnail image URL').setValue('thumbnail'),
                        new StringSelectMenuOptionBuilder().setLabel('Image').setDescription('Set the main image URL').setValue('image'),
                        new StringSelectMenuOptionBuilder().setLabel('Delete After').setDescription('Auto-delete the greet message after N seconds').setValue('deleteafter'),
                );

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);

        const buttonRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                        .setCustomId(`greet_submit_${originalUserId}`)
                        .setLabel('Submit')
                        .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                        .setCustomId('greet_variables')
                        .setLabel('Variables')
                        .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                        .setCustomId(`greet_cancel_${originalUserId}`)
                        .setLabel('Cancel')
                        .setStyle(ButtonStyle.Danger),
        );

        return [preview, selectRow, buttonRow];
}

export async function handleGreetInteraction(interaction) {
        const id = interaction.customId;

        if (!id?.startsWith('greet_')) return false;

        if (interaction.isButton()) {
                if (id.startsWith('greet_setup_simple_')) {
                        const originalUserId = id.split('_').pop();
                        if (interaction.user.id !== originalUserId) return userError(interaction);

                        const container = new ContainerBuilder().setAccentColor(0xffffff)
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent('### Greet Setup — Simple'),
                                )
                                .addSeparatorComponents(
                                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                                )
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent('Select the channel where greet messages will be sent:'),
                                )
                                .addActionRowComponents(
                                        new ActionRowBuilder().addComponents(
                                                new ChannelSelectMenuBuilder()
                                                        .setCustomId(`greet_channel_simple_${originalUserId}`)
                                                        .setPlaceholder('Select greet channel')
                                                        .setChannelTypes(ChannelType.GuildText),
                                        ),
                                );

                        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
                }

                if (id.startsWith('greet_setup_container_')) {
                        const originalUserId = id.split('_').pop();
                        if (interaction.user.id !== originalUserId) return userError(interaction);

                        const container = new ContainerBuilder().setAccentColor(0xffffff)
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent('### Greet Setup — Container'),
                                )
                                .addSeparatorComponents(
                                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                                )
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent('Select the channel where greet messages will be sent:'),
                                )
                                .addActionRowComponents(
                                        new ActionRowBuilder().addComponents(
                                                new ChannelSelectMenuBuilder()
                                                        .setCustomId(`greet_channel_container_${originalUserId}`)
                                                        .setPlaceholder('Select greet channel')
                                                        .setChannelTypes(ChannelType.GuildText),
                                        ),
                                );

                        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
                }

                if (id.startsWith('greet_submit_')) {
                        const originalUserId = id.split('_').pop();
                        if (interaction.user.id !== originalUserId) return userError(interaction);

                        await interaction.deferUpdate();
                        try {
                                const config = await db.guild?.finalizeGreetConfig(interaction.guild.id);

                                if (!config) {
                                        const errContainer = new ContainerBuilder().setAccentColor(0xffffff)
                                                .addTextDisplayComponents(
                                                        new TextDisplayBuilder().setContent('### Error'),
                                                )
                                                .addSeparatorComponents(
                                                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                                                )
                                                .addTextDisplayComponents(
                                                        new TextDisplayBuilder().setContent('Could not save the greet configuration. You may have already reached the 3-channel limit.'),
                                                );
                                        return interaction.editReply({ components: [errContainer], flags: MessageFlags.IsComponentsV2 });
                                }

                                const deleteAfterLine = config.deleteAfter ? `**Delete After:** ${config.deleteAfter} second${config.deleteAfter === 1 ? '' : 's'}` : '**Delete After:** Never';

                                const container = new ContainerBuilder().setAccentColor(0xffffff)
                                        .addTextDisplayComponents(
                                                new TextDisplayBuilder().setContent('### Greet Setup Complete!'),
                                        )
                                        .addSeparatorComponents(
                                                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                                        )
                                        .addTextDisplayComponents(
                                                new TextDisplayBuilder().setContent(
                                                        `**Type:** ${config.type === 'container' ? 'Container' : 'Simple'}
` +
                                                        `**Channel:** <#${config.channelId}>
` +
                                                        `${deleteAfterLine}

` +
                                                        'Greet messages are now active!',
                                                ),
                                        );

                                return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
                        } catch (error) {
                                console.error('Greet submit error:', error);
                        }
                        return true;
                }

                if (id === 'greet_variables') {
                        const container = new ContainerBuilder().setAccentColor(0xffffff)
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent('### Available Variables'),
                                )
                                .addSeparatorComponents(
                                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                                )
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent(
                                                `-# Use these variables in your greet message:

` +
                                                `**$member_mention**
Mentions the member (e.g., @Username).

` +
                                                `**$member_name**
The member\'s username.

` +
                                                `**$member**
The member\'s name and tag.

` +
                                                `**$member_count**
The server\'s total member count.

` +
                                                `**$ordinal_member_count**
Ordinal server member count (e.g., 100th).

` +
                                                `**$guild_name**
The server\'s name.

` +
                                                `**$join_time**
The member\'s join timestamp.`,
                                        ),
                                )
                                .addSeparatorComponents(
                                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                                )
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent('-# Add variables directly in your greet message or container fields.'),
                                );

                        return interaction.reply({ components: [container], flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral });
                }

                if (id.startsWith('greet_cancel_')) {
                        const originalUserId = id.split('_').pop();
                        if (interaction.user.id !== originalUserId) return userError(interaction);

                        const container = new ContainerBuilder().setAccentColor(0xffffff)
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent('### Greet Setup Cancelled'),
                                )
                                .addSeparatorComponents(
                                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                                )
                                .addTextDisplayComponents(
                                        new TextDisplayBuilder().setContent('The greet setup has been cancelled. Your existing configuration (if any) has been preserved.'),
                                );

                        return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
                }
        }

        if (interaction.isChannelSelectMenu()) {
                if (id.startsWith('greet_channel_simple_')) {
                        const originalUserId = id.split('_').pop();
                        if (interaction.user.id !== originalUserId) return userError(interaction);

                        const channel = interaction.values[0];
                        await db.guild?.setGreetConfig(interaction.guild.id, {
                                greetChannelId: channel,
                                greetType: 'simple',
                                greetMessage: null,
                                greetTitle: null,
                                greetDescription: null,
                                greetColor: null,
                                greetThumbnailUrl: null,
                                greetImageUrl: null,
                                greetDeleteAfter: null,
                        });

                        const modal = new ModalBuilder()
                                .setCustomId('greet_simple_message')
                                .setTitle('Set Greet Message');
                        const input = new TextInputBuilder()
                                .setCustomId('greet_message')
                                .setLabel('Greet Message')
                                .setPlaceholder('Welcome $member_mention to $guild_name! You are member #$member_count.')
                                .setStyle(TextInputStyle.Paragraph)
                                .setMaxLength(2000)
                                .setRequired(true);
                        const deleteAfterInput = new TextInputBuilder()
                                .setCustomId('greet_delete_after')
                                .setLabel('Delete After (seconds, optional)')
                                .setPlaceholder('e.g. 5 — leave blank to never delete')
                                .setStyle(TextInputStyle.Short)
                                .setRequired(false);
                        modal.addComponents(
                                new ActionRowBuilder().addComponents(input),
                                new ActionRowBuilder().addComponents(deleteAfterInput),
                        );

                        return interaction.showModal(modal);
                }

                if (id.startsWith('greet_channel_container_')) {
                        const originalUserId = id.split('_').pop();
                        if (interaction.user.id !== originalUserId) return userError(interaction);

                        const channel = interaction.values[0];
                        await db.guild?.setGreetConfig(interaction.guild.id, {
                                greetChannelId: channel,
                                greetType: 'container',
                                greetMessage: null,
                                greetTitle: null,
                                greetDescription: null,
                                greetColor: null,
                                greetThumbnailUrl: null,
                                greetImageUrl: null,
                                greetDeleteAfter: null,
                        });

                        const config = await db.guild?.getGreetConfig(interaction.guild.id);
                        const [preview, selectRow, buttonRow] = buildContainerEditor(config, originalUserId);

                        return interaction.update({
                                components: [preview, selectRow, buttonRow],
                                flags: MessageFlags.IsComponentsV2,
                        });
                }
        }

        if (interaction.isStringSelectMenu()) {
                if (id.startsWith('greet_field_select_')) {
                        const originalUserId = id.split('_').pop();
                        if (interaction.user.id !== originalUserId) return userError(interaction);

                        const selectedField = interaction.values[0];
                        let modal;

                        if (selectedField === 'title') {
                                modal = new ModalBuilder().setCustomId(`greet_field_title_${originalUserId}`).setTitle('Set Title');
                                modal.addComponents(new ActionRowBuilder().addComponents(
                                        new TextInputBuilder()
                                                .setCustomId('greet_title')
                                                .setLabel('Container Title')
                                                .setPlaceholder('Welcome to $guild_name!')
                                                .setStyle(TextInputStyle.Short)
                                                .setMaxLength(256)
                                                .setRequired(true),
                                ));
                        } else if (selectedField === 'description') {
                                modal = new ModalBuilder().setCustomId(`greet_field_description_${originalUserId}`).setTitle('Set Description');
                                modal.addComponents(new ActionRowBuilder().addComponents(
                                        new TextInputBuilder()
                                                .setCustomId('greet_description')
                                                .setLabel('Container Description')
                                                .setPlaceholder('Hey $member_mention, welcome! You are our $ordinal_member_count member.')
                                                .setStyle(TextInputStyle.Paragraph)
                                                .setMaxLength(2000)
                                                .setRequired(true),
                                ));
                        } else if (selectedField === 'color') {
                                const colorMenu = new StringSelectMenuBuilder()
                                        .setCustomId(`greet_color_select_${originalUserId}`)
                                        .setPlaceholder('Choose colour option')
                                        .addOptions(
                                                new StringSelectMenuOptionBuilder().setLabel('Custom Colour').setDescription('Enter a custom hex colour code').setValue('custom'),
                                                new StringSelectMenuOptionBuilder().setLabel('None').setDescription('Remove accent colour').setValue('none'),
                                        );

                                const container = new ContainerBuilder().setAccentColor(0xffffff)
                                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('### Set Accent Colour'))
                                        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
                                        .addTextDisplayComponents(new TextDisplayBuilder().setContent('Choose an option:'))
                                        .addActionRowComponents(new ActionRowBuilder().addComponents(colorMenu));

                                return interaction.update({ components: [container], flags: MessageFlags.IsComponentsV2 });
                        } else if (selectedField === 'thumbnail') {
                                modal = new ModalBuilder().setCustomId(`greet_field_thumbnail_${originalUserId}`).setTitle('Set Thumbnail');
                                modal.addComponents(new ActionRowBuilder().addComponents(
                                        new TextInputBuilder()
                                                .setCustomId('greet_thumbnail')
                                                .setLabel('Thumbnail URL')
                                                .setPlaceholder('https://example.com/image.png')
                                                .setStyle(TextInputStyle.Short)
                                                .setRequired(true),
                                ));
                        } else if (selectedField === 'image') {
                                modal = new ModalBuilder().setCustomId(`greet_field_image_${originalUserId}`).setTitle('Set Image');
                                modal.addComponents(new ActionRowBuilder().addComponents(
                                        new TextInputBuilder()
                                                .setCustomId('greet_image')
                                                .setLabel('Image URL')
                                                .setPlaceholder('https://example.com/banner.png')
                                                .setStyle(TextInputStyle.Short)
                                                .setRequired(true),
                                ));
                        } else if (selectedField === 'deleteafter') {
                                modal = new ModalBuilder().setCustomId(`greet_field_deleteafter_${originalUserId}`).setTitle('Set Delete After');
                                modal.addComponents(new ActionRowBuilder().addComponents(
                                        new TextInputBuilder()
                                                .setCustomId('greet_deleteafter')
                                                .setLabel('Delete After (seconds, 0 to disable)')
                                                .setPlaceholder('e.g. 5')
                                                .setStyle(TextInputStyle.Short)
                                                .setRequired(true),
                                ));
                        }

                        if (modal) return interaction.showModal(modal);
                        return true;
                }

                if (id.startsWith('greet_color_select_')) {
                        const originalUserId = id.split('_').pop();
                        if (interaction.user.id !== originalUserId) return userError(interaction);

                        const selectedValue = interaction.values[0];

                        if (selectedValue === 'none') {
                                await interaction.deferUpdate();
                                await db.guild?.setGreetConfig(interaction.guild.id, { greetColor: null });
                                const config = await db.guild?.getGreetConfig(interaction.guild.id);
                                const [preview, selectRow, buttonRow] = buildContainerEditor(config, originalUserId);
                                return interaction.editReply({ components: [preview, selectRow, buttonRow], flags: MessageFlags.IsComponentsV2 });
                        }

                        const modal = new ModalBuilder().setCustomId(`greet_field_color_${originalUserId}`).setTitle('Set Colour');
                        modal.addComponents(new ActionRowBuilder().addComponents(
                                new TextInputBuilder()
                                        .setCustomId('greet_color')
                                        .setLabel('Hex Colour Code')
                                        .setPlaceholder('#5865F2 or 5865F2')
                                        .setStyle(TextInputStyle.Short)
                                        .setMinLength(6)
                                        .setMaxLength(7)
                                        .setRequired(true),
                        ));
                        return interaction.showModal(modal);
                }
        }

        if (interaction.isModalSubmit()) {
                if (id === 'greet_simple_message') {
                        await interaction.deferUpdate();
                        try {
                                const message = interaction.fields.getTextInputValue('greet_message');
                                const deleteAfterRaw = interaction.fields.getTextInputValue('greet_delete_after')?.trim();
                                const deleteAfter = deleteAfterRaw ? parseInt(deleteAfterRaw, 10) : null;

                                const updateData = { greetMessage: message };
                                if (deleteAfter && deleteAfter > 0) updateData.greetDeleteAfter = deleteAfter;

                                await db.guild?.setGreetConfig(interaction.guild.id, updateData);

                                const finalConfig = await db.guild?.finalizeGreetConfig(interaction.guild.id);
                                const deleteAfterLine = finalConfig?.deleteAfter
                                        ? `**Delete After:** ${finalConfig.deleteAfter} second${finalConfig.deleteAfter === 1 ? '' : 's'}`
                                        : '**Delete After:** Never';

                                const container = new ContainerBuilder().setAccentColor(0xffffff)
                                        .addTextDisplayComponents(
                                                new TextDisplayBuilder().setContent('### Greet Setup Complete!'),
                                        )
                                        .addSeparatorComponents(
                                                new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                                        )
                                        .addTextDisplayComponents(
                                                new TextDisplayBuilder().setContent(
                                                        `**Type:** Simple
` +
                                                        `**Channel:** <#${finalConfig?.channelId}>
` +
                                                        `**Message:**
${message}
` +
                                                        `${deleteAfterLine}

` +
                                                        'Greet messages are now active!',
                                                ),
                                        );

                                return interaction.editReply({ components: [container], flags: MessageFlags.IsComponentsV2 });
                        } catch (error) {
                                console.error('Greet simple message error:', error);
                        }
                        return true;
                }

                if (id.startsWith('greet_field_')) {
                        const originalUserId = id.split('_').pop();
                        await interaction.deferUpdate();
                        try {
                                const field = id.replace('greet_field_', '').replace(`_${originalUserId}`, '');
                                let updateData = {};

                                if (field === 'title') {
                                        updateData.greetTitle = interaction.fields.getTextInputValue('greet_title');
                                } else if (field === 'description') {
                                        updateData.greetDescription = interaction.fields.getTextInputValue('greet_description');
                                } else if (field === 'color') {
                                        const colorValue = interaction.fields.getTextInputValue('greet_color');
                                        const hexMatch = colorValue.match(/^#?([0-9A-Fa-f]{6})$/);
                                        if (hexMatch) updateData.greetColor = parseInt(hexMatch[1], 16);
                                } else if (field === 'thumbnail') {
                                        const val = interaction.fields.getTextInputValue('greet_thumbnail');
                                        if (isValidUrl(val)) updateData.greetThumbnailUrl = val;
                                } else if (field === 'image') {
                                        const val = interaction.fields.getTextInputValue('greet_image');
                                        if (isValidUrl(val)) updateData.greetImageUrl = val;
                                } else if (field === 'deleteafter') {
                                        const val = parseInt(interaction.fields.getTextInputValue('greet_deleteafter'), 10);
                                        updateData.greetDeleteAfter = (!isNaN(val) && val > 0) ? val : null;
                                }

                                await db.guild?.setGreetConfig(interaction.guild.id, updateData);
                                const config = await db.guild?.getGreetConfig(interaction.guild.id);
                                const [preview, selectRow, buttonRow] = buildContainerEditor(config, originalUserId);

                                return interaction.editReply({ components: [preview, selectRow, buttonRow], flags: MessageFlags.IsComponentsV2 });
                        } catch (error) {
                                console.error('Greet field update error:', error);
                        }
                        return true;
                }
        }

        return false;
}

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */