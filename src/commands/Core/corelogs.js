import {
  SlashCommandBuilder,
  ChannelType,
  MessageFlags,
  OverwriteType,
  PermissionFlagsBits,
} from 'discord.js';
import { getGuildConfig, patchGuildConfig } from '../../services/config/guildConfig.js';
import { sendSystemLog } from '../../services/systemLogService.js';
import { isBotExtraOwner } from '../../config/bot.js';
import { compactEmbed } from '../../utils/embeds.js';
import { logger } from '../../utils/logger.js';

const CHANNEL_NAME = 'system-logs';

export default {
  data: new SlashCommandBuilder()
    .setName('core-logs')
    .setDescription('Create or select the private #system-logs channel for core diagnostics.')
    .setDMPermission(false),
  category: 'core',
  guildCommand: true,
  slashOnly: true,

  async execute(interaction, guildConfig, client) {
    try {
      if (!interaction.guild || !interaction.guildId) {
        return interaction.reply({
          embeds: [compactEmbed('This command can only be used in a server.', 'error')],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!isBotExtraOwner(interaction.user.id)) {
        return interaction.reply({
          embeds: [compactEmbed('Only the bot extra owner can use this command.', 'error')],
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const config = guildConfig ?? await getGuildConfig(client, interaction.guildId);
      const configuredId = config?.logging?.channels?.system;
      const guild = interaction.guild;

      let channel = configuredId
        ? await guild.channels.fetch(configuredId).catch(() => null)
        : null;
      let created = false;

      if (!channel || channel.type !== ChannelType.GuildText) {
        channel = guild.channels.cache.find(
          (candidate) => candidate.type === ChannelType.GuildText && candidate.name === CHANNEL_NAME,
        ) ?? null;
      }

      if (!channel) {
        const perms = PermissionFlagsBits;
        channel = await guild.channels.create({
          name: CHANNEL_NAME,
          type: ChannelType.GuildText,
          topic: 'Onyx core diagnostics — visible only to Onyx and the bot extra owner.',
          reason: '[Onyx] Core system log setup',
          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              type: OverwriteType.Role,
              deny: [perms.ViewChannel],
            },
            {
              id: client.user.id,
              type: OverwriteType.Member,
              allow: [
                perms.ViewChannel,
                perms.SendMessages,
                perms.EmbedLinks,
                perms.AttachFiles,
                perms.ReadMessageHistory,
                perms.ManageMessages,
              ],
            },
            {
              id: interaction.user.id,
              type: OverwriteType.Member,
              allow: [perms.ViewChannel, perms.ReadMessageHistory],
            },
          ],
        });
        created = true;
      }

      // Make sure the channel stays private even if it was found by name.
      const perms = PermissionFlagsBits;
      const botMember = guild.members.me
        ?? await guild.members.fetchMe?.().catch(() => null);
      const ownerMember = await guild.members.fetch(interaction.user.id).catch(() => null);

      await channel.permissionOverwrites.edit(guild.roles.everyone, {
        ViewChannel: false,
      }).catch(() => {});
      if (botMember) {
        await channel.permissionOverwrites.edit(botMember, {
          ViewChannel: true,
          SendMessages: true,
          EmbedLinks: true,
          AttachFiles: true,
          ReadMessageHistory: true,
          ManageMessages: true,
        }).catch(() => {});
      }
      if (ownerMember) {
        await channel.permissionOverwrites.edit(ownerMember, {
          ViewChannel: true,
          ReadMessageHistory: true,
        }).catch(() => {});
      }

      const savedConfig = await patchGuildConfig(
        client,
        guild.id,
        { logging: { channels: { ...(config?.logging?.channels ?? {}), system: channel.id } } },
        { command: 'core-logs', userId: interaction.user.id },
      );

      await sendSystemLog(client, guild.id, {
        title: 'Core logs ready',
        description: `${created ? 'Created' : 'Selected'} ${channel.toString()} for core diagnostics.`,
        fields: [
          { name: 'Channel', value: `\`${channel.id}\`` },
          { name: 'Access', value: `\`Onyx\` + <@${interaction.user.id}>` },
        ],
      }, savedConfig ?? config);

      logger.info('Core system log channel configured', {
        guildId: guild.id,
        channelId: channel.id,
        userId: interaction.user.id,
        created,
      });

      return interaction.editReply({
        embeds: [compactEmbed([
          `${created ? 'Created' : 'Using'} ${channel.toString()} for core logs.`,
          `Only you and Onyx can view it.`,
        ].join('\n'), 'success')],
      });
    } catch (error) {
      logger.error('Core logs command error:', error);

      const message = compactEmbed('Could not set up system logs. Check my channel permissions.', 'error');
      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ embeds: [message] }).catch(() => {});
      }
      return interaction.reply({ embeds: [message], flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  },
};
