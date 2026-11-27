// Onyx Discord Bot
// Author: Onyx
import { Command } from '#command';
import {
        MessageFlags,
        ButtonStyle,
        ActionRowBuilder,
        ButtonBuilder,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        StringSelectMenuBuilder,
        StringSelectMenuOptionBuilder,
        ModalBuilder,
        TextInputBuilder,
        TextInputStyle,
        PermissionFlagsBits,
} from 'discord.js';
import { disableComponents, logger } from '#utils';

const ACCENT = 0xffffff;
const MAX_OPTIONS = 10;
const COLLECTOR_TIMEOUT = 5 * 60 * 1000;

class CreatePollCommand extends Command {
        #sessions = new Map();

        constructor() {
                super({
                        name: 'createpoll',
                        description: 'Build and launch a  Discord poll',
                        usage: 'createpoll',
                        cooldown: 5,
                        userPermissions: [PermissionFlagsBits.ManageGuild],
                        permissions: [PermissionFlagsBits.ManageGuild],
                        enabledSlash: true,
                        slashData: {
                                name: 'createpoll',
                                description: 'Build and launch a Discord poll',
                                defaultMemberPermissions: PermissionFlagsBits.ManageGuild,
                        },
                });
        }

        async execute({ ctx }) {
                const session = { question: null, options: [] };

                const message = await ctx.reply({
                        components: [this._buildContainer(session)],
                        flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral],
                        fetchReply: true,
                });

                this.#sessions.set(message.id, session);

                const collector = message.createMessageComponentCollector({
                        time: COLLECTOR_TIMEOUT,
                        filter: (i) => i.user.id === ctx.user.id,
                });

                collector.on('collect', async (interaction) => {
                        try {
                                const session = this.#sessions.get(message.id) ?? { question: null, options: [] };

                                if (interaction.customId === 'poll_set_question') {
                                        const modal = new ModalBuilder()
                                                .setCustomId('poll_question_modal')
                                                .setTitle('Set Poll Question')
                                                .addComponents(
                                                        new ActionRowBuilder().addComponents(
                                                                new TextInputBuilder()
                                                                        .setCustomId('poll_question_input')
                                                                        .setLabel('Question')
                                                                        .setStyle(TextInputStyle.Short)
                                                                        .setPlaceholder('What do you want to ask?')
                                                                        .setMaxLength(300)
                                                                        .setRequired(true)
                                                                        .setValue(session.question ?? ''),
                                                        ),
                                                );

                                        await interaction.showModal(modal);

                                        const submit = await interaction
                                                .awaitModalSubmit({
                                                        time: 60_000,
                                                        filter: (i) =>
                                                                i.user.id === ctx.user.id &&
                                                                i.customId === 'poll_question_modal',
                                                })
                                                .catch(() => null);

                                        if (!submit) return;

                                        session.question = submit.fields
                                                .getTextInputValue('poll_question_input')
                                                .trim();

                                        await submit.deferUpdate();
                                        await message.edit({ components: [this._buildContainer(session)] });

                                } else if (interaction.customId === 'poll_add_option') {
                                        if (session.options.length >= MAX_OPTIONS) {
                                                return interaction.reply({
                                                        content: `Maximum of ${MAX_OPTIONS} options reached.`,
                                                        flags: [MessageFlags.Ephemeral],
                                                });
                                        }

                                        const modal = new ModalBuilder()
                                                .setCustomId('poll_option_modal')
                                                .setTitle('Add Option')
                                                .addComponents(
                                                        new ActionRowBuilder().addComponents(
                                                                new TextInputBuilder()
                                                                        .setCustomId('poll_option_input')
                                                                        .setLabel('Option Text')
                                                                        .setStyle(TextInputStyle.Short)
                                                                        .setPlaceholder('Enter an answer option...')
                                                                        .setMaxLength(55)
                                                                        .setRequired(true),
                                                        ),
                                                );

                                        await interaction.showModal(modal);

                                        const submit = await interaction
                                                .awaitModalSubmit({
                                                        time: 60_000,
                                                        filter: (i) =>
                                                                i.user.id === ctx.user.id &&
                                                                i.customId === 'poll_option_modal',
                                                })
                                                .catch(() => null);

                                        if (!submit) return;

                                        session.options.push(
                                                submit.fields.getTextInputValue('poll_option_input').trim(),
                                        );

                                        await submit.deferUpdate();
                                        await message.edit({ components: [this._buildContainer(session)] });

                                } else if (interaction.customId === 'poll_remove_option') {
                                        session.options.splice(parseInt(interaction.values[0]), 1);

                                        await interaction.deferUpdate();
                                        await message.edit({ components: [this._buildContainer(session)] });

                                } else if (interaction.customId === 'poll_launch') {
                                        if (!session.question || session.options.length < 2) {
                                                return interaction.reply({
                                                        content: 'A question and at least 2 options are required to launch.',
                                                        flags: [MessageFlags.Ephemeral],
                                                });
                                        }

                                        await interaction.deferUpdate();

                                        await ctx.channel.send({
                                                poll: {
                                                        question: { text: session.question },
                                                        answers: session.options.map((text) => ({ text })),
                                                        duration: 24,
                                                        allowMultiselect: false,
                                                },
                                        });

                                        collector.stop('launched');

                                        const done = new ContainerBuilder().setAccentColor(ACCENT);
                                        done.addTextDisplayComponents(
                                                new TextDisplayBuilder().setContent(
                                                        `### Poll Launched
Your poll has been posted in this channel.`,
                                                ),
                                        );
                                        await message.edit({ components: [done] });

                                } else if (interaction.customId === 'poll_cancel') {
                                        await interaction.deferUpdate();
                                        collector.stop('cancelled');

                                        const done = new ContainerBuilder().setAccentColor(ACCENT);
                                        done.addTextDisplayComponents(
                                                new TextDisplayBuilder().setContent(
                                                        `### Cancelled
Your poll session has been discarded.`,
                                                ),
                                        );
                                        await message.edit({ components: [done] });
                                }
                        } catch (err) {
                                logger.error('CreatePoll', 'Interaction error', err);
                        }
                });

                collector.on('end', async (_, reason) => {
                        this.#sessions.delete(message.id);
                        if (reason === 'launched' || reason === 'cancelled') return;
                        try {
                                await disableComponents(message);
                        } catch {}
                });
        }

        _buildContainer(session) {
                const container = new ContainerBuilder().setAccentColor(ACCENT);

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent('### Poll Builder'),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                const questionLine = session.question
                        ? `**Question**
> ${session.question}`
                        : `**Question**
> Not set — click Set Question to begin`;

                const optionsLine =
                        session.options.length > 0
                                ? `

**Options**
` +
                                  session.options.map((o, i) => `> ${i + 1}. ${o}`).join('\n')
                                : `

**Options**
> No options added yet`;

                container.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                                `${questionLine}${optionsLine}

-# ${session.options.length} / ${MAX_OPTIONS} options`,
                        ),
                );

                container.addSeparatorComponents(
                        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true),
                );

                container.addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                                new ButtonBuilder()
                                        .setCustomId('poll_set_question')
                                        .setLabel(session.question ? 'Edit Question' : 'Set Question')
                                        .setStyle(ButtonStyle.Secondary),
                                new ButtonBuilder()
                                        .setCustomId('poll_add_option')
                                        .setLabel('Add Option')
                                        .setStyle(ButtonStyle.Secondary)
                                        .setDisabled(session.options.length >= MAX_OPTIONS),
                                new ButtonBuilder()
                                        .setCustomId('poll_launch')
                                        .setLabel('Launch Poll')
                                        .setStyle(ButtonStyle.Success)
                                        .setDisabled(!session.question || session.options.length < 2),
                                new ButtonBuilder()
                                        .setCustomId('poll_cancel')
                                        .setLabel('Cancel')
                                        .setStyle(ButtonStyle.Danger),
                        ),
                );

                if (session.options.length > 0) {
                        container.addActionRowComponents(
                                new ActionRowBuilder().addComponents(
                                        new StringSelectMenuBuilder()
                                                .setCustomId('poll_remove_option')
                                                .setPlaceholder('Remove an option...')
                                                .addOptions(
                                                        session.options.map((opt, i) =>
                                                                new StringSelectMenuOptionBuilder()
                                                                        .setLabel(
                                                                                opt.length > 100
                                                                                        ? opt.slice(0, 97) + '...'
                                                                                        : opt,
                                                                        )
                                                                        .setDescription(`Remove option ${i + 1}`)
                                                                        .setValue(String(i)),
                                                        ),
                                                ),
                                ),
                        );
                }

                return container;
        }
}

export default new CreatePollCommand();

/**
 * Project: Onyx
 * Author: Onyx 
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 *
 * © 2026 Onyx. All rights reserved.
 */