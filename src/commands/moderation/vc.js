const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
  ModalBuilder
} = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const { securityEmbed, errorEmbed, successEmbed, infoEmbed, UI } = require('../../utils/embeds');

function canManageChannels(interaction) {
  return interaction.member?.permissions?.has(PermissionFlagsBits.ManageChannels);
}

function isChannelOwner(guild, member, channelId) {
  const ownerId = db.getVoiceOwner(guild.id, channelId);
  if (!ownerId) return false;
  return ownerId === member.id || member.permissions.has(PermissionFlagsBits.Administrator);
}

function voicePanelEmbed(channel) {
  const owner = channel.guild.members.cache.get(db.getVoiceOwner(channel.guild.id, channel.id)) || null;
  const memberCount = channel.members.size;
  const userLimit = channel.userLimit || 0;
  const bitrate = Math.floor(channel.bitrate / 1000);
  const locked = channel.permissionOverwrites.cache.some(o =>
    o.id === channel.guild.roles.everyone.id && o.deny.has(PermissionFlagsBits.Connect)
  );
  const hidden = channel.permissionOverwrites.cache.some(o =>
    o.id === channel.guild.roles.everyone.id && o.deny.has(PermissionFlagsBits.ViewChannel)
  );

  return securityEmbed({
    title: 'Onyx Interface',
    description: [
      'You can use this interface to manage your voice channel.',
      'You can also use `/vc` slash commands!',
      '',
      `**Channel:** <#${channel.id}>`,
      `**Owner:** ${owner ? `<@${owner.id}>` : 'Unowned'}`,
      `**Members:** ${memberCount}`,
      `**User Limit:** ${userLimit || 'None'}`,
      `**Bitrate:** ${bitrate}kbps`,
      `**Locked:** ${locked ? 'Yes' : 'No'}`,
      `**Hidden:** ${hidden ? 'Yes' : 'No'}`,
      '',
      muted('All changes apply instantly to this voice channel.')
    ].join('\n'),
    color: config.colors.dark,
    footer: { text: `Onyx Interface ${UI.separator} ${channel.guild.name}` }
  });
}

function muted(text) {
  return `-# ${text}`;
}

function panelRows(channelId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`vc_lock:${channelId}`).setLabel('🔒 Lock').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`vc_unlock:${channelId}`).setLabel('🔓 Unlock').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`vc_hide:${channelId}`).setLabel('🪐 Hide').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`vc_unhide:${channelId}`).setLabel('👁️ Unhide').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`vc_limit:${channelId}`).setLabel('👥 Limit').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`vc_invite:${channelId}`).setLabel('👤 Invite').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`vc_ban:${channelId}`).setLabel('👤 Ban').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`vc_permit:${channelId}`).setLabel('👤 Permit').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`vc_rename:${channelId}`).setLabel('✏️ Rename').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`vc_bitrate:${channelId}`).setLabel('🎧 Bitrate').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`vc_region:${channelId}`).setLabel('🗄️ Region').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`vc_template:${channelId}`).setLabel('📑 Template').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`vc_chat:${channelId}`).setLabel('💬 Chat').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`vc_waiting:${channelId}`).setLabel('🕒 Waiting').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`vc_claim:${channelId}`).setLabel('👑 Claim').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`vc_transfer:${channelId}`).setLabel('🪄 Transfer').setStyle(ButtonStyle.Secondary)
    )
  ];
}

const builder = new SlashCommandBuilder()
  .setName('vc')
  .setDescription('Join-to-Create voice channel system.')
  .addSubcommand(sub =>
    sub.setName('setup')
      .setDescription('Configure the Join-to-Create voice channel.')
      .addChannelOption(opt =>
        opt.setName('channel')
          .setDescription('The voice channel members join to create their own.')
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('panel')
      .setDescription('Open the voice channel interface control panel.')
  )
  .addSubcommand(sub =>
    sub.setName('interface')
      .setDescription('Create a text channel and post a persistent Onyx Interface panel.')
  )
  .addSubcommand(sub =>
    sub.setName('rename')
      .setDescription('Rename your voice channel.')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('New channel name')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('lock')
      .setDescription('Lock your voice channel.')
  )
  .addSubcommand(sub =>
    sub.setName('unlock')
      .setDescription('Unlock your voice channel.')
  )
  .addSubcommand(sub =>
    sub.setName('limit')
      .setDescription('Set the user limit for your voice channel.')
      .addIntegerOption(opt =>
        opt.setName('limit')
          .setDescription('Maximum users (0 = unlimited)')
          .setRequired(true)
          .setMinValue(0)
          .setMaxValue(99)
      )
  )
  .addSubcommand(sub =>
    sub.setName('claim')
      .setDescription('Claim an unowned voice channel.')
  )
  .addSubcommand(sub =>
    sub.setName('transfer')
      .setDescription('Transfer voice channel ownership to another member.')
      .addUserOption(opt =>
        opt.setName('member')
          .setDescription('Member to transfer ownership to')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('delete')
      .setDescription('Delete your voice channel.')
  );

function getMemberVoiceChannel(interaction) {
  return interaction.member?.voice?.channel || null;
}

module.exports = {
  name: 'vc',
  description: 'Join-to-Create voice channel system with interface panel.',
  userPermissions: [],
  botPermissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Connect, PermissionFlagsBits.MoveMembers],
  data: builder,

  async executeSlash(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const member = interaction.member;

    if (!guild || !member) {
      return interaction.editReply({
        embeds: [errorEmbed('This command can only be used in a server.')],
        flags: MessageFlags.Ephemeral
      });
    }

    // Defer immediately so slow operations (channel creation, etc.) don't
    // expire the interaction token (Discord allows 3 seconds).
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const voiceConfig = db.getVoiceConfig(guild.id);

    if (sub === 'setup') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.editReply({
          embeds: [errorEmbed('You need **Manage Channels** to configure Join-to-Create.')],
          flags: MessageFlags.Ephemeral
        });
      }

      const channel = interaction.options.getChannel('channel');
      db.setVoiceConfig(guild.id, {
        enabled: true,
        joinToCreateChannelId: channel.id
      });

      return interaction.editReply({
        embeds: [successEmbed(`Join-to-Create enabled for <#${channel.id}>. Members who join it will get their own private voice channel.`)],
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'panel') {
      const voiceChannel = getMemberVoiceChannel(interaction);
      if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
        return interaction.editReply({
          embeds: [errorEmbed('You need to be in a voice channel to open its panel.')],
          flags: MessageFlags.Ephemeral
        });
      }

      if (!isChannelOwner(guild, member, voiceChannel.id)) {
        return interaction.editReply({
          embeds: [errorEmbed('You do not own this voice channel and are not an administrator.')],
          flags: MessageFlags.Ephemeral
        });
      }

      return interaction.editReply({
        embeds: [voicePanelEmbed(voiceChannel)],
        components: panelRows(voiceChannel.id),
        flags: MessageFlags.Ephemeral
      });
    }

    if (sub === 'interface') {
      if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
        return interaction.editReply({
          embeds: [errorEmbed('You need **Manage Channels** to create the interface panel.')],
          flags: MessageFlags.Ephemeral
        });
      }

      try {
        let textChannel = [...guild.channels.cache.values()].find(c =>
          c.type === ChannelType.GuildText && c.name === 'onyx-voice-interface'
        );

        if (!textChannel) {
          textChannel = await guild.channels.create({
            name: 'onyx-voice-interface',
            type: ChannelType.GuildText,
            reason: '[Onyx VC] Interface panel channel'
          });
        }

        // Build VC select menu with all managed temp voice channels
        const voiceChannels = db.getVoiceChannels(guild.id);
        const validChannels = voiceChannels.map(id => guild.channels.cache.get(id)).filter(Boolean);

        const vcSelect = new StringSelectMenuBuilder()
          .setCustomId('vc_select_channel')
          .setPlaceholder('Select a voice channel to manage')
          .setMinValues(1)
          .setMaxValues(1);

        if (validChannels.length > 0) {
          vcSelect.addOptions(validChannels.map(ch => ({
            label: ch.name,
            description: `ID: ${ch.id}`,
            value: ch.id
          })));
        } else {
          vcSelect.addOptions([{ label: 'No voice channels', value: 'none', disabled: true }]);
        }

        const initialChannel = validChannels[0] || null;
        const embed = initialChannel ? voicePanelEmbed(initialChannel) : securityEmbed({
          title: 'Onyx Interface',
          description: [
            'You can use this interface to manage your voice channel.',
            'You can also use `/vc` slash commands!',
            '',
            muted('No voice channels available yet. Create one with `/vc setup` or join-to-create.')
          ].join('\n'),
          color: config.colors.dark,
          footer: { text: `Onyx Interface ${UI.separator} ${guild.name}` }
        });

        const components = [
          new ActionRowBuilder().addComponents(vcSelect)
        ];

        if (initialChannel) {
          components.push(...panelRows(initialChannel.id));
        }

        await textChannel.send({
          embeds: [embed],
          components: components
        });

        return interaction.editReply({
          embeds: [successEmbed(`Interface panel posted in <#${textChannel.id}>.`)],
          flags: MessageFlags.Ephemeral
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [errorEmbed(`Failed to create interface: ${err.message}`)],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (sub === 'rename') {
      const voiceChannel = getMemberVoiceChannel(interaction);
      if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
        return interaction.editReply({
          embeds: [errorEmbed('You need to be in a voice channel to rename it.')],
          flags: MessageFlags.Ephemeral
        });
      }

      if (!isChannelOwner(guild, member, voiceChannel.id)) {
        return interaction.editReply({
          embeds: [errorEmbed('You do not own this voice channel and are not an administrator.')],
          flags: MessageFlags.Ephemeral
        });
      }

      const name = interaction.options.getString('name').trim();
      if (!name) {
        return interaction.editReply({
          embeds: [errorEmbed('Please provide a channel name.')],
          flags: MessageFlags.Ephemeral
        });
      }

      try {
        await voiceChannel.setName(name, '[Onyx VC] Rename via /vc');
        return interaction.editReply({
          embeds: [successEmbed(`Renamed <#${voiceChannel.id}> to **${name}**.`)],
          flags: MessageFlags.Ephemeral
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [errorEmbed(`Failed to rename channel: ${err.message}`)],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (sub === 'lock') {
      const voiceChannel = getMemberVoiceChannel(interaction);
      if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
        return interaction.editReply({
          embeds: [errorEmbed('You need to be in a voice channel to lock it.')],
          flags: MessageFlags.Ephemeral
        });
      }

      if (!isChannelOwner(guild, member, voiceChannel.id)) {
        return interaction.editReply({
          embeds: [errorEmbed('You do not own this voice channel and are not an administrator.')],
          flags: MessageFlags.Ephemeral
        });
      }

      try {
        await voiceChannel.permissionOverwrites.edit(guild.roles.everyone.id, {
          Connect: false
        }, '[Onyx VC] Lock via /vc');
        return interaction.editReply({
          embeds: [successEmbed(`<#${voiceChannel.id}> is now **locked**.`)],
          flags: MessageFlags.Ephemeral
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [errorEmbed(`Failed to lock channel: ${err.message}`)],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (sub === 'unlock') {
      const voiceChannel = getMemberVoiceChannel(interaction);
      if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
        return interaction.editReply({
          embeds: [errorEmbed('You need to be in a voice channel to unlock it.')],
          flags: MessageFlags.Ephemeral
        });
      }

      if (!isChannelOwner(guild, member, voiceChannel.id)) {
        return interaction.editReply({
          embeds: [errorEmbed('You do not own this voice channel and are not an administrator.')],
          flags: MessageFlags.Ephemeral
        });
      }

      try {
        await voiceChannel.permissionOverwrites.edit(guild.roles.everyone.id, {
          Connect: null
        }, '[Onyx VC] Unlock via /vc');
        return interaction.editReply({
          embeds: [successEmbed(`<#${voiceChannel.id}> is now **unlocked**.`)],
          flags: MessageFlags.Ephemeral
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [errorEmbed(`Failed to unlock channel: ${err.message}`)],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (sub === 'limit') {
      const voiceChannel = getMemberVoiceChannel(interaction);
      if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
        return interaction.editReply({
          embeds: [errorEmbed('You need to be in a voice channel to set a limit.')],
          flags: MessageFlags.Ephemeral
        });
      }

      if (!isChannelOwner(guild, member, voiceChannel.id)) {
        return interaction.editReply({
          embeds: [errorEmbed('You do not own this voice channel and are not an administrator.')],
          flags: MessageFlags.Ephemeral
        });
      }

      const limit = interaction.options.getInteger('limit');
      try {
        await voiceChannel.setUserLimit(limit, '[Onyx VC] Limit via /vc');
        return interaction.editReply({
          embeds: [successEmbed(`User limit for <#${voiceChannel.id}> set to ${limit === 0 ? 'unlimited' : limit}.`)],
          flags: MessageFlags.Ephemeral
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [errorEmbed(`Failed to set limit: ${err.message}`)],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (sub === 'claim') {
      const voiceChannel = getMemberVoiceChannel(interaction);
      if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
        return interaction.editReply({
          embeds: [errorEmbed('You need to be in a voice channel to claim it.')],
          flags: MessageFlags.Ephemeral
        });
      }

      const existingOwner = db.getVoiceOwner(guild.id, voiceChannel.id);
      if (existingOwner) {
        return interaction.editReply({
          embeds: [errorEmbed(`This voice channel is already owned by <@${existingOwner}>.`)],
          flags: MessageFlags.Ephemeral
        });
      }

      try {
        db.setVoiceOwner(guild.id, voiceChannel.id, member.id);
        return interaction.editReply({
          embeds: [successEmbed(`You now own <#${voiceChannel.id}>. Use /vc panel to manage it.`)],
          flags: MessageFlags.Ephemeral
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [errorEmbed(`Failed to claim channel: ${err.message}`)],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (sub === 'transfer') {
      const voiceChannel = getMemberVoiceChannel(interaction);
      if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
        return interaction.editReply({
          embeds: [errorEmbed('You need to be in a voice channel to transfer it.')],
          flags: MessageFlags.Ephemeral
        });
      }

      if (!isChannelOwner(guild, member, voiceChannel.id)) {
        return interaction.editReply({
          embeds: [errorEmbed('You do not own this voice channel and are not an administrator.')],
          flags: MessageFlags.Ephemeral
        });
      }

      const target = interaction.options.getUser('member');
      if (target.id === member.id) {
        return interaction.editReply({
          embeds: [errorEmbed('You cannot transfer ownership to yourself.')],
          flags: MessageFlags.Ephemeral
        });
      }

      try {
        db.setVoiceOwner(guild.id, voiceChannel.id, target.id);
        return interaction.editReply({
          embeds: [successEmbed(`Ownership of <#${voiceChannel.id}> transferred to <@${target.id}>.`)],
          flags: MessageFlags.Ephemeral
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [errorEmbed(`Failed to transfer ownership: ${err.message}`)],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (sub === 'delete') {
      const voiceChannel = getMemberVoiceChannel(interaction);
      if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
        return interaction.editReply({
          embeds: [errorEmbed('You need to be in a voice channel to delete it.')],
          flags: MessageFlags.Ephemeral
        });
      }

      if (!isChannelOwner(guild, member, voiceChannel.id)) {
        return interaction.editReply({
          embeds: [errorEmbed('You do not own this voice channel and are not an administrator.')],
          flags: MessageFlags.Ephemeral
        });
      }

      try {
        await voiceChannel.delete('[Onyx VC] Delete via /vc');
        db.removeVoiceOwner(guild.id, voiceChannel.id);
        return interaction.editReply({
          embeds: [successEmbed(`Voice channel deleted.`)],
          flags: MessageFlags.Ephemeral
        });
      } catch (err) {
        return interaction.editReply({
          embeds: [errorEmbed(`Failed to delete channel: ${err.message}`)],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    return interaction.editReply({
      embeds: [errorEmbed('Unknown /vc subcommand.')],
      flags: MessageFlags.Ephemeral
    });
  },

  async executePrefix(message, args) {
    const sub = args[0]?.toLowerCase();
    const guild = message.guild;
    const member = message.member;

    if (!guild || !member) return;

    const voiceConfig = db.getVoiceConfig(guild.id);

    if (!sub || sub === 'setup') {
      const channel = message.mentions.channels.first();
      if (!channel) {
        return message.reply({
          embeds: [errorEmbed('Usage: `!vc setup <voice-channel>` or `!vc panel`')]
        });
      }
      db.setVoiceConfig(guild.id, { enabled: true, joinToCreateChannelId: channel.id });
      return message.reply({
        embeds: [successEmbed(`Join-to-Create enabled for <#${channel.id}>.`)],
      });
    }

    if (sub === 'panel') {
      const voiceChannel = member.voice?.channel || null;
      if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
        return message.reply({
          embeds: [errorEmbed('You need to be in a voice channel to open its panel.')]
        });
      }
      if (!isChannelOwner(guild, member, voiceChannel.id)) {
        return message.reply({
          embeds: [errorEmbed('You do not own this voice channel.')]
        });
      }
      return message.reply({
        embeds: [voicePanelEmbed(voiceChannel)],
        components: panelRows(voiceChannel.id)
      });
    }

    return message.reply({
      embeds: [errorEmbed('Usage: `!vc setup <voice-channel>` or `!vc panel`')]
    });
  },

  async handleButton(interaction, client) {
    const { customId } = interaction;
    const [action, channelId] = customId.split(':');

    if (!['vc_lock', 'vc_unlock', 'vc_hide', 'vc_unhide', 'vc_limit', 'vc_invite', 'vc_ban', 'vc_permit', 'vc_rename', 'vc_bitrate', 'vc_region', 'vc_template', 'vc_chat', 'vc_waiting', 'vc_claim', 'vc_transfer'].includes(action)) {
      return false;
    }

    const guild = interaction.guild;
    const member = interaction.member;
    const channel = guild.channels.cache.get(channelId);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return interaction.reply({
        embeds: [errorEmbed('That voice channel no longer exists.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (action !== 'vc_claim' && !isChannelOwner(guild, member, channel.id)) {
      return interaction.reply({
        embeds: [errorEmbed('You do not own this voice channel and are not an administrator.')],
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      if (action === 'vc_lock') {
        await channel.permissionOverwrites.edit(guild.roles.everyone.id, { Connect: false }, '[Onyx VC] Lock');
        return interaction.update({
          embeds: [voicePanelEmbed(channel)],
          components: panelRows(channel.id)
        });
      }

      if (action === 'vc_unlock') {
        await channel.permissionOverwrites.edit(guild.roles.everyone.id, { Connect: null }, '[Onyx VC] Unlock');
        return interaction.update({
          embeds: [voicePanelEmbed(channel)],
          components: panelRows(channel.id)
        });
      }

      if (action === 'vc_hide') {
        await channel.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: true }, '[Onyx VC] Hide');
        return interaction.update({
          embeds: [voicePanelEmbed(channel)],
          components: panelRows(channel.id)
        });
      }

      if (action === 'vc_unhide') {
        await channel.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: null }, '[Onyx VC] Unhide');
        return interaction.update({
          embeds: [voicePanelEmbed(channel)],
          components: panelRows(channel.id)
        });
      }

      if (action === 'vc_limit') {
        const modal = new ModalBuilder()
          .setCustomId(`vc_modal_limit:${channel.id}`)
          .setTitle('Set User Limit');
        const input = new TextInputBuilder()
          .setCustomId('vc_limit_input')
          .setLabel('Maximum users (0 = unlimited)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Enter a number between 0 and 99')
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }

      if (action === 'vc_invite') {
        const modal = new ModalBuilder()
          .setCustomId(`vc_modal_invite:${channel.id}`)
          .setTitle('Invite Member');
        const input = new TextInputBuilder()
          .setCustomId('vc_invite_input')
          .setLabel('Member @mention or ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('@username or user ID')
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }

      if (action === 'vc_ban') {
        const modal = new ModalBuilder()
          .setCustomId(`vc_modal_ban:${channel.id}`)
          .setTitle('Ban Member');
        const input = new TextInputBuilder()
          .setCustomId('vc_ban_input')
          .setLabel('Member @mention or ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('@username or user ID')
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }

      if (action === 'vc_permit') {
        const modal = new ModalBuilder()
          .setCustomId(`vc_modal_permit:${channel.id}`)
          .setTitle('Permit Member');
        const input = new TextInputBuilder()
          .setCustomId('vc_permit_input')
          .setLabel('Member @mention or ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('@username or user ID')
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }

      if (action === 'vc_rename') {
        const modal = new ModalBuilder()
          .setCustomId(`vc_modal_rename:${channel.id}`)
          .setTitle('Rename Channel');
        const input = new TextInputBuilder()
          .setCustomId('vc_rename_input')
          .setLabel('New channel name')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Enter new name')
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }

      if (action === 'vc_bitrate') {
        const modal = new ModalBuilder()
          .setCustomId(`vc_modal_bitrate:${channel.id}`)
          .setTitle('Set Bitrate');
        const input = new TextInputBuilder()
          .setCustomId('vc_bitrate_input')
          .setLabel('Bitrate in kbps (8000-96000)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. 64000')
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }

      if (action === 'vc_region') {
        const options = [
          { label: 'Default', value: 'default' },
          { label: 'US East', value: 'us-east' },
          { label: 'US West', value: 'us-west' },
          { label: 'US Central', value: 'us-central' },
          { label: 'EU West', value: 'eu-west' },
          { label: 'EU Central', value: 'eu-central' },
          { label: 'Singapore', value: 'singapore' },
          { label: 'Sydney', value: 'sydney' },
          { label: 'Japan', value: 'japan' },
          { label: 'South Africa', value: 'southafrica' }
        ];
        const select = new StringSelectMenuBuilder()
          .setCustomId(`vc_select_region:${channel.id}`)
          .setPlaceholder('Select RTC region')
          .addOptions(options);
        await interaction.update({
          components: [new ActionRowBuilder().addComponents(select)]
        });
        return;
      }

      if (action === 'vc_template') {
        const modal = new ModalBuilder()
          .setCustomId(`vc_modal_template:${channel.id}`)
          .setTitle('Channel Template');
        const input = new TextInputBuilder()
          .setCustomId('vc_template_input')
          .setLabel('Template name (save or load)')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('e.g. my-template')
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }

      if (action === 'vc_chat') {
        const modal = new ModalBuilder()
          .setCustomId(`vc_modal_chat:${channel.id}`)
          .setTitle('Chat Permissions');
        const input = new TextInputBuilder()
          .setCustomId('vc_chat_input')
          .setLabel('Allow or Deny chat messages')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('allow or deny')
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }

      if (action === 'vc_waiting') {
        return interaction.reply({
          embeds: [infoEmbed('Waiting room feature is not yet configured for this server.')],
          flags: MessageFlags.Ephemeral
        });
      }

      if (action === 'vc_claim') {
        const existingOwner = db.getVoiceOwner(guild.id, channel.id);
        if (existingOwner) {
          return interaction.reply({
            embeds: [errorEmbed(`This voice channel is already owned by <@${existingOwner}>.`)],
            flags: MessageFlags.Ephemeral
          });
        }
        db.setVoiceOwner(guild.id, channel.id, member.id);
        return interaction.update({
          embeds: [voicePanelEmbed(channel)],
          components: panelRows(channel.id)
        });
      }

      if (action === 'vc_transfer') {
        const modal = new ModalBuilder()
          .setCustomId(`vc_modal_transfer:${channel.id}`)
          .setTitle('Transfer Ownership');
        const input = new TextInputBuilder()
          .setCustomId('vc_transfer_input')
          .setLabel('Member @mention or ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('@username or user ID')
          .setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        await interaction.showModal(modal);
        return;
      }

      return false;
    } catch (err) {
      return interaction.reply({
        embeds: [errorEmbed(`Failed: ${err.message}`)],
        flags: MessageFlags.Ephemeral
      });
    }
  },

  async handleSelect(interaction, client) {
    const { customId } = interaction;

    if (customId === 'vc_select_channel') {
      const guild = interaction.guild;
      const member = interaction.member;
      const channelId = interaction.values[0];
      const channel = guild.channels.cache.get(channelId);

      if (!channel || channel.type !== ChannelType.GuildVoice) {
        return interaction.reply({
          embeds: [errorEmbed('That voice channel no longer exists.')],
          flags: MessageFlags.Ephemeral
        });
      }

      if (!isChannelOwner(guild, member, channel.id)) {
        return interaction.reply({
          embeds: [errorEmbed('You do not own this voice channel and are not an administrator.')],
          flags: MessageFlags.Ephemeral
        });
      }

      return interaction.update({
        embeds: [voicePanelEmbed(channel)],
        components: [new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId('vc_select_channel')
            .setPlaceholder('Select a voice channel to manage')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions([{
              label: channel.name,
              description: `ID: ${channel.id}`,
              value: channel.id,
              default: true
            }])
        )].concat(panelRows(channel.id))
      });
    }

    if (customId.startsWith('vc_select_region:')) {
      const channelId = customId.split(':')[1];
      const guild = interaction.guild;
      const member = interaction.member;
      const channel = guild.channels.cache.get(channelId);

      if (!channel || channel.type !== ChannelType.GuildVoice) {
        return interaction.reply({
          embeds: [errorEmbed('That voice channel no longer exists.')],
          flags: MessageFlags.Ephemeral
        });
      }

      if (!isChannelOwner(guild, member, channel.id)) {
        return interaction.reply({
          embeds: [errorEmbed('You do not own this voice channel.')],
          flags: MessageFlags.Ephemeral
        });
      }

      const region = interaction.values[0];
      try {
        await channel.setRTCRegion(region === 'default' ? null : region, '[Onyx VC] Region');
        await interaction.update({
          embeds: [voicePanelEmbed(channel)],
          components: panelRows(channel.id)
        });
      } catch (err) {
        return interaction.reply({
          embeds: [errorEmbed(`Failed to set region: ${err.message}`)],
          flags: MessageFlags.Ephemeral
        });
      }
      return;
    }

    return false;
  },

  async handleModal(interaction, client) {
    const { customId } = interaction;
    const parts = customId.split(':');
    const actionPart = parts[0]; // e.g. 'vc_modal_limit'
    const channelId = parts[1];
    const modalType = actionPart.replace('vc_modal_', ''); // e.g. 'limit'

    const guild = interaction.guild;
    const member = interaction.member;
    const channel = guild.channels.cache.get(channelId);

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return interaction.reply({
        embeds: [errorEmbed('That voice channel no longer exists.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (!isChannelOwner(guild, member, channel.id)) {
      return interaction.reply({
        embeds: [errorEmbed('You do not own this voice channel and are not an administrator.')],
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      if (modalType === 'limit') {
        const value = interaction.fields.getTextInputValue('vc_limit_input');
        const limit = parseInt(value, 10);
        if (isNaN(limit) || limit < 0 || limit > 99) {
          return interaction.reply({
            embeds: [errorEmbed('Please enter a valid number between 0 and 99.')],
            flags: MessageFlags.Ephemeral
          });
        }
        await channel.setUserLimit(limit, '[Onyx VC] Limit via panel');
        await interaction.reply({
          embeds: [successEmbed(`User limit set to ${limit === 0 ? 'unlimited' : limit}.`)],
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (modalType === 'invite') {
        const value = interaction.fields.getTextInputValue('vc_invite_input');
        const targetId = value.replace(/[<@!>]/g, '');
        const target = guild.members.cache.get(targetId) || await guild.members.fetch(targetId).catch(() => null);
        if (!target) {
          return interaction.reply({
            embeds: [errorEmbed('Member not found.')],
            flags: MessageFlags.Ephemeral
          });
        }
        await channel.permissionOverwrites.edit(target.id, { Connect: true, ViewChannel: true }, '[Onyx VC] Invite');
        await interaction.reply({
          embeds: [successEmbed(`Invited <@${target.id}> to <#${channel.id}>.`)],
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (modalType === 'ban') {
        const value = interaction.fields.getTextInputValue('vc_ban_input');
        const targetId = value.replace(/[<@!>]/g, '');
        const target = guild.members.cache.get(targetId) || await guild.members.fetch(targetId).catch(() => null);
        if (!target) {
          return interaction.reply({
            embeds: [errorEmbed('Member not found.')],
            flags: MessageFlags.Ephemeral
          });
        }
        await channel.permissionOverwrites.edit(target.id, { Connect: false, ViewChannel: false }, '[Onyx VC] Ban');
        if (target.voice.channelId === channel.id) {
          await target.voice.disconnect('[Onyx VC] Banned from channel').catch(() => {});
        }
        await interaction.reply({
          embeds: [successEmbed(`Banned <@${target.id}> from <#${channel.id}>.`)],
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (modalType === 'permit') {
        const value = interaction.fields.getTextInputValue('vc_permit_input');
        const targetId = value.replace(/[<@!>]/g, '');
        const target = guild.members.cache.get(targetId) || await guild.members.fetch(targetId).catch(() => null);
        if (!target) {
          return interaction.reply({
            embeds: [errorEmbed('Member not found.')],
            flags: MessageFlags.Ephemeral
          });
        }
        await channel.permissionOverwrites.edit(target.id, { Connect: true, ViewChannel: true }, '[Onyx VC] Permit');
        await interaction.reply({
          embeds: [successEmbed(`Permitted <@${target.id}> to <#${channel.id}>.`)],
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (modalType === 'rename') {
        const value = interaction.fields.getTextInputValue('vc_rename_input').trim();
        if (!value) {
          return interaction.reply({
            embeds: [errorEmbed('Please provide a channel name.')],
            flags: MessageFlags.Ephemeral
          });
        }
        await channel.setName(value, '[Onyx VC] Rename via panel');
        await interaction.reply({
          embeds: [successEmbed(`Renamed to **${value}**.`)],
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (modalType === 'bitrate') {
        const value = interaction.fields.getTextInputValue('vc_bitrate_input');
        const bitrate = parseInt(value, 10);
        if (isNaN(bitrate) || bitrate < 8000 || bitrate > 96000) {
          return interaction.reply({
            embeds: [errorEmbed('Bitrate must be between 8000 and 96000 kbps.')],
            flags: MessageFlags.Ephemeral
          });
        }
        await channel.setBitrate(bitrate * 1000, '[Onyx VC] Bitrate via panel');
        await interaction.reply({
          embeds: [successEmbed(`Bitrate set to ${bitrate}kbps.`)],
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (modalType === 'template') {
        await interaction.reply({
          embeds: [infoEmbed('Template save/load will be available in a future update.')],
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (modalType === 'chat') {
        const value = interaction.fields.getTextInputValue('vc_chat_input').toLowerCase();
        if (value === 'allow') {
          await channel.permissionOverwrites.edit(guild.roles.everyone.id, { SendMessages: null }, '[Onyx VC] Chat');
        } else if (value === 'deny') {
          await channel.permissionOverwrites.edit(guild.roles.everyone.id, { SendMessages: false }, '[Onyx VC] Chat');
        } else {
          return interaction.reply({
            embeds: [errorEmbed('Use "allow" or "deny".')],
            flags: MessageFlags.Ephemeral
          });
        }
        await interaction.reply({
          embeds: [successEmbed(`Chat ${value}ed for @everyone in <#${channel.id}>.`)],
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      if (modalType === 'transfer') {
        const value = interaction.fields.getTextInputValue('vc_transfer_input');
        const targetId = value.replace(/[<@!>]/g, '');
        if (targetId === member.id) {
          return interaction.reply({
            embeds: [errorEmbed('You cannot transfer ownership to yourself.')],
            flags: MessageFlags.Ephemeral
          });
        }
        const target = guild.members.cache.get(targetId) || await guild.members.fetch(targetId).catch(() => null);
        if (!target) {
          return interaction.reply({
            embeds: [errorEmbed('Member not found.')],
            flags: MessageFlags.Ephemeral
          });
        }
        db.setVoiceOwner(guild.id, channel.id, target.id);
        await interaction.reply({
          embeds: [successEmbed(`Ownership transferred to <@${target.id}>.`)],
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      return interaction.reply({
        embeds: [errorEmbed('Unknown form action.')],
        flags: MessageFlags.Ephemeral
      });
    } catch (err) {
      return interaction.reply({
        embeds: [errorEmbed(`Failed: ${err.message}`)],
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
