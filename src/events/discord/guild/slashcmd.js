// Onyx Discord Bot
// Author: Onyx
import {
        InteractionType,
        ContainerBuilder,
        TextDisplayBuilder,
        SeparatorBuilder,
        SeparatorSpacingSize,
        MessageFlags,
} from 'discord.js';
import { config } from '#config';
import { validateCommand, canBotSendMessages, logger, buildLeaderboard, buildInviteLeaderboard, PER_PAGE, buildInvitedList, buildServerList, SL_PER_PAGE } from '#utils';
import { CommandContext } from '#context';
import { db } from '#dbManager';
import { emoji } from '#emoji';
import { handleGreetInteraction } from './handlers/greetHandler.js';

const errorContainer = new ContainerBuilder();
const errorTitle = new TextDisplayBuilder();
const errorSeparator = new SeparatorBuilder()
        .setSpacing(SeparatorSpacingSize.Small)
        .setDivider(true);
const errorDescription = new TextDisplayBuilder();

const sendError = async (interaction, title, description, forceEphemeral = false) => {
        if (!interaction || !title || !description) return;

        errorContainer.components.length = 0;
        errorContainer.setAccentColor(config.colors?.error || 0xed4245);
        errorTitle.data.content = `## ${emoji?.cross || '❌'} ${title}`;
        errorDescription.data.content = description;
        errorContainer
                .addTextDisplayComponents(errorTitle)
                .addSeparatorComponents(errorSeparator)
                .addTextDisplayComponents(errorDescription);

        try {
                const canSend = interaction.channel ? canBotSendMessages(interaction.channel) : false;
                const flags =
                        !canSend || forceEphemeral
                                ? MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
                                : MessageFlags.IsComponentsV2;

                const reply = { components: [errorContainer], flags };

                if (interaction.deferred || interaction.replied) {
                        await interaction.followUp(reply).catch(() => {});
                } else {
                        await interaction.reply(reply).catch(() => {});
                }
        } catch (error) {
                logger.error('InteractionCreate', `Failed to send error: ${error.message}`);
        }
};

const sendCooldown = async (interaction, cooldown) => {
        if (!interaction || !cooldown) return;

        try {
                const timestamp = Math.floor((Date.now() + cooldown) / 1000);

                let content = `**Cooldown** - Ends <t:${timestamp}:R>`;

                const cooldownContainer = new ContainerBuilder();
                cooldownContainer.setAccentColor(config.colors?.warn || 0xfee75c);
                cooldownContainer.addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(content),
                );
                await interaction
                        .reply({
                                components: [cooldownContainer],
                                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral,
                        })
                        .catch(() => {});
        } catch (error) {
                logger.error('InteractionCreate', `Failed to send cooldown: ${error.message}`);
        }
};

const getCommandFile = (interaction, client) => {
        if (!interaction || !client || !client.commandHandler) return null;

        try {
                const { commandName } = interaction;
                const subCommandGroup = interaction.options?.getSubcommandGroup(false);
                const subCommandName = interaction.options?.getSubcommand(false);

                if (subCommandGroup && subCommandName) {
                        const cmd = client.commandHandler.slashCommandFiles.get(
                                `${commandName}:${subCommandGroup}:${subCommandName}`,
                        );
                        if (cmd) return cmd;
                }
                if (subCommandName) {
                        const cmd = client.commandHandler.slashCommandFiles.get(
                                `${commandName}:${subCommandName}`,
                        );
                        if (cmd) return cmd;
                }
                return client.commandHandler.slashCommandFiles.get(commandName);
        } catch (error) {
                logger.error('InteractionCreate', `Error getting command file: ${error.message}`);
                return null;
        }
};

const handleChatInputCommand = async (interaction, client) => {
        if (!interaction || !client) return;

        try {
                if (!interaction.inGuild()) {
                        return sendError(
                                interaction,
                                'Server Only',
                                'Commands can only be used in a server.',
                                true,
                        );
                }

                if (!interaction.guild || !interaction.user || !interaction.channel) {
                        return sendError(
                                interaction,
                                'Invalid Context',
                                'Unable to process this interaction.',
                                true,
                        );
                }

                if (!canBotSendMessages(interaction.channel)) {
                        return sendError(
                                interaction,
                                'Missing Bot Permissions',
                                "I don't have permission to send messages in this channel. Please grant me the **Send Messages** and **View Channel** permissions before using commands.",
                                true,
                        );
                }

                const userId = interaction.user.id;
                const guildId = interaction.guild.id;
                const channelId = interaction.channel.id;

                let isUserBlacklisted = false;
                let isGuildBlacklisted = false;
                let isChannelIgnored = false;

                try {
                        [isUserBlacklisted, isGuildBlacklisted, isChannelIgnored] = await Promise.all([
                                db.blacklist?.checkBlacklist(userId).catch(() => false),
                                db.blacklist?.checkBlacklist(guildId).catch(() => false),
                                db.guild?.isChannelIgnored(guildId, channelId).catch(() => false),
                        ]);
                } catch (error) {
                        logger.error('InteractionCreate', `Database check failed: ${error.message}`);
                }

                if (isUserBlacklisted || isGuildBlacklisted) {
                        return interaction
                                .reply({
                                        content: 'You or this server is blacklisted.',
                                        flags: MessageFlags.Ephemeral,
                                })
                                .catch(() => {});
                }

                if (config.ownerOnly && !config.ownerIds.includes(userId)) {
                        await interaction
                                .reply({ content: `${emoji?.lock || '🔒'} Owner only mode is enabled.` })
                                .catch(() => {});
                        setTimeout(() => interaction.deleteReply().catch(() => {}), 3000);
                        return;
                }

                if (isChannelIgnored) {
                        return interaction
                                .reply({
                                        content: '**Ignored Channel** Commands are disabled in this channel.',
                                        flags: MessageFlags.Ephemeral,
                                })
                                .catch(() => {});
                }

                const commandToExecute = getCommandFile(interaction, client);
                if (!commandToExecute) {
                        logger.warn(
                                'InteractionCreate',
                                `No command file found for: /${interaction.commandName}`,
                        );
                        return sendError(
                                interaction,
                                'Command Error',
                                'This command seems to be outdated or improperly configured.',
                                true,
                        );
                }

                if (commandToExecute.cooldown && client.commandHandler) {
                        try {
                                const cooldown = await client.commandHandler.isOnCooldown(
                                        commandToExecute,
                                        userId,
                                        guildId,
                                );
                                if (cooldown) {
                                        return await sendCooldown(interaction, cooldown);
                                }
                                await client.commandHandler.setCooldown(commandToExecute, userId, guildId);
                        } catch (error) {
                                logger.error('InteractionCreate', `Cooldown check failed: ${error.message}`);
                        }
                }

                try {
                        const ctx = new CommandContext({ client, interaction });
                        const permissionValidation = await validateCommand(ctx, commandToExecute);
                        if (!permissionValidation.valid) {
                                return sendError(
                                        interaction,
                                        permissionValidation.error?.title || 'Permission Error',
                                        permissionValidation.error?.description || 'You cannot use this command.',
                                        true,
                                );
                        }
                        if (commandToExecute.shouldNotDefer) {
                                await commandToExecute.execute({ ctx });
                        } else {
                                await interaction.deferReply();
                                await commandToExecute.execute({ ctx });
                        }
                } catch (error) {
                        logger.error(
                                'InteractionCreate',
                                `Error executing: ${commandToExecute.slashData?.name || 'unknown'}`,
                                error,
                        );
                        await sendError(
                                interaction,
                                'Command Error',
                                'An unexpected error occurred while running the command.',
                                true,
                        );
                }
        } catch (error) {
                logger.error(
                        'InteractionCreate',
                        `Fatal error in command handler: ${error.message}`,
                        error,
                );
        }
};

const handleAutocomplete = async (interaction, client) => {
        if (!interaction || !client) return;

        try {
                const commandToExecute = getCommandFile(interaction, client);
                if (!commandToExecute?.autocomplete) return;
                await commandToExecute.autocomplete({ interaction, client });
        } catch (error) {
                logger.error(
                        'InteractionCreate',
                        `Autocomplete error for '${interaction.commandName}': ${error.message}`,
                );
        }
};

const handleInvitedComponent = async (interaction) => {
        const { customId } = interaction;
        if (!customId?.startsWith('invited:')) return false;

        try {
                const parts       = customId.split(':');
                const action      = parts[1];
                const guildId     = parts[2];
                const targetUserId = parts[3];
                const page        = parseInt(parts[4]) || 1;
                const requesterId = parts[5];

                if (interaction.user.id !== requesterId) {
                        return interaction.reply({
                                content: 'This list belongs to someone else.',
                                flags: MessageFlags.Ephemeral,
                        }).catch(() => {});
                }

                if (action === 'stop') {
                        return interaction.message.delete().catch(() => {
                                interaction.update({ components: [] }).catch(() => {});
                        });
                }

                const invited = await db.memberInviter?.getAllByInviter(guildId, targetUserId) ?? [];
                const totalPages = Math.max(1, Math.ceil(invited.length / 10));

                let newPage;
                if (action === 'first')     newPage = 1;
                else if (action === 'last') newPage = totalPages;
                else if (action === 'prev') newPage = Math.max(1, page - 1);
                else if (action === 'next') newPage = Math.min(totalPages, page + 1);
                else                        newPage = page;

                let displayName = targetUserId;
                try {
                        const guild = await interaction.client.guilds.fetch(guildId).catch(() => null);
                        const member = guild ? await guild.members.fetch(targetUserId).catch(() => null) : null;
                        if (member) displayName = member.displayName;
                } catch {}

                const { components } = buildInvitedList(invited, newPage, totalPages, guildId, targetUserId, displayName, requesterId);

                await interaction.update({ components, flags: MessageFlags.IsComponentsV2 }).catch(() => {});
        } catch (error) {
                logger.error('InteractionCreate', `Invited list button error: ${error.message}`, error);
        }

        return true;
};

const handleModalSubmit = async (interaction) => {
        const { customId } = interaction;
        if (customId?.startsWith('greet_')) {
                await handleGreetInteraction(interaction);
        }
};

const handleMessageComponent = async (interaction, client) => {
        const { customId } = interaction;

        if (customId?.startsWith('greet_')) {
                await handleGreetInteraction(interaction);
                return;
        }

        if (await handleInvitedComponent(interaction)) return;

        if (customId?.startsWith('slsort:')) {
                try {
                        const parts   = customId.split(':');
                        const page    = parseInt(parts[1]) || 1;
                        const userId  = parts[2];

                        if (interaction.user.id !== userId) {
                                return interaction.reply({
                                        content: 'This server list belongs to someone else.',
                                        flags: MessageFlags.Ephemeral,
                                }).catch(() => {});
                        }

                        const newSort = interaction.values?.[0] === 'lth' ? 'lth' : 'htl';
                        const guilds  = [...interaction.client.guilds.cache.values()];

                        if (newSort === 'lth') {
                                guilds.sort((a, b) => (a.memberCount ?? 0) - (b.memberCount ?? 0));
                        } else {
                                guilds.sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0));
                        }

                        const totalPages = Math.max(1, Math.ceil(guilds.length / SL_PER_PAGE));
                        const newPage    = Math.min(page, totalPages);
                        const { components } = buildServerList(guilds, newPage, totalPages, userId, newSort);

                        await interaction.update({ components, flags: MessageFlags.IsComponentsV2 }).catch(() => {});
                } catch (error) {
                        logger.error('InteractionCreate', `Server list sort error: ${error.message}`, error);
                }
                return;
        }

        if (customId?.startsWith('sl:')) {
                try {
                        const parts  = customId.split(':');
                        const action = parts[1];
                        const page   = parseInt(parts[2]) || 1;
                        const userId = parts[3];
                        const sort   = parts[4] === 'lth' ? 'lth' : 'htl';

                        if (interaction.user.id !== userId) {
                                return interaction.reply({
                                        content: 'This server list belongs to someone else.',
                                        flags: MessageFlags.Ephemeral,
                                }).catch(() => {});
                        }

                        if (action === 'stop') {
                                return interaction.message.delete().catch(() => {
                                        interaction.update({ components: [] }).catch(() => {});
                                });
                        }

                        const guilds = [...interaction.client.guilds.cache.values()];

                        if (sort === 'lth') {
                                guilds.sort((a, b) => (a.memberCount ?? 0) - (b.memberCount ?? 0));
                        } else {
                                guilds.sort((a, b) => (b.memberCount ?? 0) - (a.memberCount ?? 0));
                        }

                        const totalPages = Math.max(1, Math.ceil(guilds.length / SL_PER_PAGE));

                        let newPage;
                        if (action === 'first')     newPage = 1;
                        else if (action === 'last') newPage = totalPages;
                        else if (action === 'prev') newPage = Math.max(1, page - 1);
                        else if (action === 'next') newPage = Math.min(totalPages, page + 1);
                        else                        newPage = page;

                        const { components } = buildServerList(guilds, newPage, totalPages, userId, sort);

                        await interaction.update({ components, flags: MessageFlags.IsComponentsV2 }).catch(() => {});
                } catch (error) {
                        logger.error('InteractionCreate', `Server list button error: ${error.message}`, error);
                }
                return;
        }

        if (customId?.startsWith('ilb:')) {
                try {
                        const parts   = customId.split(':');
                        const action  = parts[1];
                        const guildId = parts[2];
                        const page    = parseInt(parts[3]) || 1;
                        const userId  = parts[4];

                        if (interaction.user.id !== userId) {
                                return interaction.reply({
                                        content: 'This leaderboard belongs to someone else.',
                                        flags: MessageFlags.Ephemeral,
                                }).catch(() => {});
                        }

                        if (action === 'stop') {
                                return interaction.message.delete().catch(() => {
                                        interaction.update({ components: [] }).catch(() => {});
                                });
                        }

                        // Defer immediately so the 3s interaction window doesn't expire
                        // while we hit MongoDB on large guilds.
                        if (!interaction.deferred && !interaction.replied) {
                                await interaction.deferUpdate().catch(() => {});
                        }

                        const allCounts = await db.userInviteCounter?.getAllByGuild(guildId) ?? [];
                        allCounts.sort((a, b) => (b.total || 0) - (a.total || 0));

                        const totalPages = Math.max(1, Math.ceil(allCounts.length / PER_PAGE));

                        let newPage;
                        if (action === 'first')     newPage = 1;
                        else if (action === 'last') newPage = totalPages;
                        else if (action === 'prev') newPage = Math.max(1, page - 1);
                        else if (action === 'next') newPage = Math.min(totalPages, page + 1);
                        else                        newPage = page;

                        const { components } = buildInviteLeaderboard(allCounts, newPage, totalPages, guildId, userId);

                        await interaction.editReply({
                                components,
                                flags: MessageFlags.IsComponentsV2,
                        }).catch(() => {});
                } catch (error) {
                        logger.error('InteractionCreate', `Invite leaderboard button error: ${error.message}`, error);
                }
                return;
        }

        const isDaily = customId?.startsWith('dlb:');
        if (!customId?.startsWith('lb:') && !isDaily) return;

        try {
                const parts   = customId.split(':');
                const action  = parts[1];
                const guildId = parts[2];
                const page    = parseInt(parts[3]) || 1;
                const userId  = parts[4];

                if (interaction.user.id !== userId) {
                        return interaction.reply({
                                content: 'This leaderboard belongs to someone else.',
                                flags: MessageFlags.Ephemeral,
                        }).catch(() => {});
                }

                if (action === 'stop') {
                        return interaction.message.delete().catch(() => {
                                interaction.update({ components: [] }).catch(() => {});
                        });
                }

                // Defer immediately so the 3s interaction window doesn't expire
                // while we hit MongoDB on large guilds.
                if (!interaction.deferred && !interaction.replied) {
                        await interaction.deferUpdate().catch(() => {});
                }

                const today = new Date().toISOString().slice(0, 10);
                const allCounts = await db.userMessageCounter?.getAllByGuild(guildId) ?? [];

                if (isDaily) {
                        allCounts.forEach((item) => {
                                if (item.lastResetDate !== today) item.todayCount = 0;
                        });
                        allCounts.sort((a, b) => (b.todayCount || 0) - (a.todayCount || 0));
                } else {
                        allCounts.sort((a, b) => (b.total || 0) - (a.total || 0));
                }

                const totalPages = Math.max(1, Math.ceil(allCounts.length / PER_PAGE));

                let newPage;
                if (action === 'first')     newPage = 1;
                else if (action === 'last') newPage = totalPages;
                else if (action === 'prev') newPage = Math.max(1, page - 1);
                else if (action === 'next') newPage = Math.min(totalPages, page + 1);
                else                        newPage = page;

                const botName = client.user.displayName;
                const mode = isDaily ? 'daily' : 'alltime';
                const { components } = buildLeaderboard(allCounts, newPage, totalPages, guildId, userId, botName, mode);

                await interaction.editReply({
                        components,
                        flags: MessageFlags.IsComponentsV2,
                }).catch(() => {});
        } catch (error) {
                logger.error('InteractionCreate', `Leaderboard button error: ${error.message}`, error);
        }
};

export default {
        name: 'interactionCreate',
        async execute({ eventArgs, client }) {
                if (!eventArgs || !eventArgs[0] || !client) return;

                const [interaction] = eventArgs;

                try {
                        if (interaction.type === InteractionType.ApplicationCommand) {
                                await handleChatInputCommand(interaction, client);
                        } else if (interaction.type === InteractionType.ApplicationCommandAutocomplete) {
                                await handleAutocomplete(interaction, client);
                        } else if (interaction.type === InteractionType.MessageComponent) {
                                await handleMessageComponent(interaction, client);
                        } else if (interaction.type === InteractionType.ModalSubmit) {
                                await handleModalSubmit(interaction);
                        }
                } catch (error) {
                        logger.error('InteractionCreate', `Fatal error: ${error.message}`, error);
                }
        },
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