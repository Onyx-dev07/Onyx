// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  ComponentType,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

const emojis = require('../../../emojis.json');
const {
  serverEmojisPageCard,
  serverInfoCard,
  serverRolesPageCard,
} = require('../../../lib/infoCards');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Shows detailed information about the server'),

  async execute(interaction) {
    const guild = interaction.guild;
    let currentPage = 'general';
    let rolesPage = 0;
    let emojisPage = 0;

    const textChannels = guild.channels.cache.filter(channel => channel.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(channel => channel.type === ChannelType.GuildVoice).size;

    const allRoles = Array.from(guild.roles.cache.values()).reverse();
    const allEmojis = Array.from(guild.emojis.cache.values());
    const rolesPerPage = 20;
    const emojisPerPage = 20;
    const totalRolePages = Math.ceil(allRoles.length / rolesPerPage) || 1;
    const totalEmojiPages = Math.ceil(allEmojis.length / emojisPerPage) || 1;

    const createDropdown = () => new StringSelectMenuBuilder()
      .setCustomId('serverinfo_select')
      .setPlaceholder('Choose information to view')
      .addOptions(
        new StringSelectMenuOptionBuilder()
          .setLabel('General Information')
          .setDescription('Basic server information and statistics')
          .setValue('general'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Server Roles')
          .setDescription(`View all ${allRoles.length} server roles with pagination`)
          .setValue('roles'),
        new StringSelectMenuOptionBuilder()
          .setLabel('Server Emojis')
          .setDescription(`View all ${allEmojis.length} server emojis with pagination`)
          .setValue('emojis')
      );

    const createPaginationButtons = () => {
      const row = new ActionRowBuilder();

      if (currentPage === 'roles') {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('roles_first')
            .setEmoji(emojis.firstPage)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(rolesPage === 0),
          new ButtonBuilder()
            .setCustomId('roles_prev')
            .setEmoji(emojis.prev)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(rolesPage === 0),
          new ButtonBuilder()
            .setCustomId('roles_next')
            .setEmoji(emojis.next)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(rolesPage >= totalRolePages - 1),
          new ButtonBuilder()
            .setCustomId('roles_last')
            .setEmoji(emojis.lastPage)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(rolesPage >= totalRolePages - 1)
        );
      } else if (currentPage === 'emojis') {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId('emojis_first')
            .setEmoji(emojis.firstPage)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(emojisPage === 0),
          new ButtonBuilder()
            .setCustomId('emojis_prev')
            .setEmoji(emojis.prev)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(emojisPage === 0),
          new ButtonBuilder()
            .setCustomId('emojis_next')
            .setEmoji(emojis.next)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(emojisPage >= totalEmojiPages - 1),
          new ButtonBuilder()
            .setCustomId('emojis_last')
            .setEmoji(emojis.lastPage)
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(emojisPage >= totalEmojiPages - 1)
        );
      }

      return row;
    };

    const addMenuToContainer = (container) => {
      container.addActionRowComponents(new ActionRowBuilder().addComponents(createDropdown()));

      const buttons = createPaginationButtons();
      if (buttons.components.length > 0) {
        container.addActionRowComponents(buttons);
      }

      return container;
    };

    const buildGeneralContainer = () => serverInfoCard({
      guild,
      textChannels,
      voiceChannels,
    });

    const buildRolesContainer = (page = 0) => {
      const startIndex = page * rolesPerPage;
      return serverRolesPageCard({
        roles: allRoles.slice(startIndex, startIndex + rolesPerPage),
        page,
        startIndex,
        totalPages: totalRolePages,
        totalRoles: allRoles.length,
      });
    };

    const buildEmojisContainer = (page = 0) => {
      const startIndex = page * emojisPerPage;
      return serverEmojisPageCard({
        guildEmojis: allEmojis.slice(startIndex, startIndex + emojisPerPage),
        page,
        startIndex,
        totalPages: totalEmojiPages,
        totalEmojis: allEmojis.length,
      });
    };

    const getCurrentContainer = () => {
      let container;

      if (currentPage === 'roles') {
        container = buildRolesContainer(rolesPage);
      } else if (currentPage === 'emojis') {
        container = buildEmojisContainer(emojisPage);
      } else {
        container = buildGeneralContainer();
      }

      return addMenuToContainer(container);
    };

    const response = await interaction.reply({
      components: [getCurrentContainer()],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { users: [] },
    });

    const message = await interaction.fetchReply();
    const collector = message.createMessageComponentCollector({
      time: 300000,
    });

    collector.on('collect', async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: 'You cannot interact with this message.',
          ephemeral: true,
        });
      }

      if (i.customId === 'serverinfo_select') {
        currentPage = i.values[0];
        rolesPage = 0;
        emojisPage = 0;
      } else if (i.customId.startsWith('roles_')) {
        const action = i.customId.split('_')[1];

        if (action === 'first') rolesPage = 0;
        else if (action === 'prev') rolesPage = Math.max(0, rolesPage - 1);
        else if (action === 'next') rolesPage = Math.min(totalRolePages - 1, rolesPage + 1);
        else if (action === 'last') rolesPage = totalRolePages - 1;
      } else if (i.customId.startsWith('emojis_')) {
        const action = i.customId.split('_')[1];

        if (action === 'first') emojisPage = 0;
        else if (action === 'prev') emojisPage = Math.max(0, emojisPage - 1);
        else if (action === 'next') emojisPage = Math.min(totalEmojiPages - 1, emojisPage + 1);
        else if (action === 'last') emojisPage = totalEmojiPages - 1;
      }

      return i.update({
        components: [getCurrentContainer()],
        flags: MessageFlags.IsComponentsV2,
      });
    });

    collector.on('end', async () => {
      try {
        await interaction.editReply({ components: [] });
      } catch (error) {
        console.error('[SERVERINFO] Failed to update message on timeout:', error.message);
      }
    });

    return response;
  },
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */
