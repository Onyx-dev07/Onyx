// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const {
  ActionRowBuilder,
  ChannelType,
  ComponentType,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

const { createPaginationSession } = require('../../../lib/pagination');
const {
  serverEmojisPageCard,
  serverInfoCard,
  serverRolesPageCard,
} = require('../../../lib/infoCards');

module.exports = {
  name: 'serverinfo',
  description: 'Shows detailed information about the server',
  aliases: ['sinfo', 'si'],

  async execute(message, args) {
    const guild = message.guild;
    let activeSession = null;

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

    const addMenuToContainer = (container) => container.addActionRowComponents(
      new ActionRowBuilder().addComponents(createDropdown())
    );

    const buildGeneralContainer = () => serverInfoCard({
      guild,
      textChannels,
      voiceChannels,
    });

    const renderRolesPage = async (pageIndex) => {
      const startIndex = pageIndex * rolesPerPage;
      const pageRoles = allRoles.slice(startIndex, startIndex + rolesPerPage);

      return addMenuToContainer(serverRolesPageCard({
        roles: pageRoles,
        pageIndex,
        startIndex,
        totalPages: totalRolePages,
        totalRoles: allRoles.length,
      }));
    };

    const renderEmojisPage = async (pageIndex) => {
      const startIndex = pageIndex * emojisPerPage;
      const pageEmojis = allEmojis.slice(startIndex, startIndex + emojisPerPage);

      return addMenuToContainer(serverEmojisPageCard({
        guildEmojis: pageEmojis,
        pageIndex,
        startIndex,
        totalPages: totalEmojiPages,
        totalEmojis: allEmojis.length,
      }));
    };

    const response = await message.reply({
      components: [addMenuToContainer(buildGeneralContainer())],
      flags: MessageFlags.IsComponentsV2,
      allowedMentions: { users: [] },
    });

    const dropdownCollector = response.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 300000,
    });

    dropdownCollector.on('collect', async (interaction) => {
      if (interaction.user.id !== message.author.id) {
        return interaction.reply({
          content: 'You cannot interact with this message.',
          ephemeral: true,
        });
      }

      const selectedView = interaction.values[0];

      if (activeSession) {
        activeSession.stop();
        activeSession = null;
      }

      if (selectedView === 'general') {
        return interaction.update({
          components: [addMenuToContainer(buildGeneralContainer())],
          flags: MessageFlags.IsComponentsV2,
        });
      }

      await interaction.deferUpdate();

      const isRoles = selectedView === 'roles';
      const totalPages = isRoles ? totalRolePages : totalEmojiPages;

      activeSession = createPaginationSession({
        interactionOrMessage: response,
        pages: async (pageIndex) => pageIndex,
        renderPage: isRoles ? renderRolesPage : renderEmojisPage,
        userId: message.author.id,
        totalPages,
        initialPage: 0,
        timeout: 300000,
        useEdit: true,
      });

      await activeSession.renderInitial();
    });

    dropdownCollector.on('end', () => {
      if (activeSession) activeSession.stop();
      response.edit({ components: [] }).catch(() => {});
    });
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
