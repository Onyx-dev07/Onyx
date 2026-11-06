const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const { createEmbed, errorEmbed, successEmbed, infoEmbed, UI } = require('../../utils/embeds');

function canManage(interaction) {
  return interaction.member?.permissions?.has(PermissionFlagsBits.ManageChannels);
}

function voicePanelEmbed(guild, channels) {
  const list = channels.length
    ? channels.map(id => {
        const ch = guild.channels.cache.get(id);
        return ch ? `<#${id}>` : `\`${id}\` (deleted)`;
      }).join('\n')
    : 'No voice channels created yet.';

  return createEmbed({
    title: 'Voice Channels',
    description: [
      `**${channels.length}** voice channel(s) managed by Onyx.`,
      '',
      list
    ].join('\n'),
    color: config.colors.accent,
    footer: { text: `Voice ${UI.separator} ${guild.name}` }
  });
}

function voiceControlRow(channelId, locked, hidden) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`vc_lock:${channelId}`)
      .setLabel(locked ? 'Unlock' : 'Lock')
      .setStyle(locked ? ButtonStyle.Success : ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(`vc_hide:${channelId}`)
      .setLabel(hidden ? 'Unhide' : 'Hide')
      .setStyle(hidden ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`vc_delete:${channelId}`)
      .setLabel('Delete')
      .setStyle(ButtonStyle.Danger)
  );
}

function vcSelectRow(guild, channels) {
  const options = channels.map(id => {
    const ch = guild.channels.cache.get(id);
    return {
      label: ch ? ch.name : `Voice ${id.slice(-4)}`,
      description: ch ? `ID: ${id}` : 'Deleted channel',
      value: id
    };
  });

  return new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('vc_select')
      .setPlaceholder('Select a voice channel to manage')
      .setMinValues(1)
      .setMaxValues(1)
      .addOptions(options.length ? options : [{ label: 'None', value: 'none', disabled: true }])
  );
}

const builder = new SlashCommandBuilder()
  .setName('voice')
  .setDescription('Create and manage voice channels with lock/hide controls.')
  .addSubcommand(sub =>
    sub.setName('create')
      .setDescription('Create a new voice channel')
      .addStringOption(opt =>
        opt.setName('name')
          .setDescription('Voice channel name')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('panel')
      .setDescription('Open the voice channel management panel')
  );

module.exports = {
  name: 'voice',
  description: 'Create and manage voice channels (create, lock, hide, unhide, delete).',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  data: builder,

  async executeSlash(interaction) {
    if (!canManage(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('You need Manage Channels to use voice controls.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const name = interaction.options.getString('name').trim();
      if (!name) {
        return interaction.reply({
          embeds: [errorEmbed('Please provide a voice channel name.')],
          flags: MessageFlags.Ephemeral
        });
      }

      try {
        const channel = await interaction.guild.channels.create({
          name,
          type: ChannelType.GuildVoice,
          reason: '[Onyx Voice] Created by voice command'
        });
        db.addVoiceChannel(interaction.guild.id, channel.id);

        return interaction.reply({
          embeds: [successEmbed(`Created voice channel <#${channel.id}>.`)]
        });
      } catch (err) {
        return interaction.reply({
          embeds: [errorEmbed(`Failed to create voice channel: ${err.message}`)],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (sub === 'panel') {
      const channels = db.getVoiceChannels(interaction.guild.id);
      return interaction.reply({
        ...{
          embeds: [voicePanelEmbed(interaction.guild, channels)],
          components: channels.length ? [vcSelectRow(interaction.guild, channels)] : []
        },
        flags: MessageFlags.Ephemeral
      });
    }
  },

  async executePrefix(message, args) {
    if (!canManage({ member: message.member, guild: message.guild })) {
      return message.reply({
        embeds: [errorEmbed('You need Manage Channels to use voice controls.')]
      });
    }

    const sub = args[0]?.toLowerCase();

    if (sub === 'create') {
      const name = args.slice(1).join(' ').trim();
      if (!name) {
        return message.reply({
          embeds: [errorEmbed('Usage: `!voice create <name>`')]
        });
      }

      try {
        const channel = await message.guild.channels.create({
          name,
          type: ChannelType.GuildVoice,
          reason: '[Onyx Voice] Created by voice command'
        });
        db.addVoiceChannel(message.guild.id, channel.id);
        return message.reply({
          embeds: [successEmbed(`Created voice channel <#${channel.id}>.`)]
        });
      } catch (err) {
        return message.reply({
          embeds: [errorEmbed(`Failed to create voice channel: ${err.message}`)]
        });
      }
    }

    if (sub === 'panel' || !sub) {
      const channels = db.getVoiceChannels(message.guild.id);
      return message.reply({
        embeds: [voicePanelEmbed(message.guild, channels)],
        components: channels.length ? [vcSelectRow(message.guild, channels)] : []
      });
    }
  },

  async handleSelect(interaction) {
    if (!canManage(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('You need Manage Channels to manage voice channels.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId !== 'vc_select') return false;

    const channelId = interaction.values[0];
    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) {
      return interaction.reply({
        embeds: [errorEmbed('That voice channel no longer exists.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const locked = channel.permissionOverwrites.cache.some(o =>
      o.id === interaction.guild.roles.everyone.id &&
      o.deny.has(PermissionFlagsBits.Connect)
    );
    const hidden = channel.permissionOverwrites.cache.some(o =>
      o.id === interaction.guild.roles.everyone.id &&
      o.deny.has(PermissionFlagsBits.ViewChannel)
    );

    return interaction.update({
      embeds: [createEmbed({
        title: `Voice: ${channel.name}`,
        description: `<#${channel.id}>`,
        fields: [
          { name: 'Locked', value: locked ? 'Yes' : 'No', inline: true },
          { name: 'Hidden', value: hidden ? 'Yes' : 'No', inline: true }
        ],
        color: config.colors.accent
      })],
      components: [voiceControlRow(channelId, locked, hidden)]
    });
  },

  async handleButton(interaction) {
    if (!canManage(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('You need Manage Channels to manage voice channels.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const { customId } = interaction;
    const [action, channelId] = customId.split(':');

    if (!['vc_lock', 'vc_hide', 'vc_delete'].includes(action)) return false;

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return interaction.reply({
        embeds: [errorEmbed('That voice channel no longer exists.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const everyone = interaction.guild.roles.everyone.id;

    if (action === 'vc_lock') {
      try {
        await channel.permissionOverwrites.edit(everyone, {
          Connect: null
        });
        return interaction.update({
          embeds: [successEmbed(`<#${channel.id}> is now **unlocked**.`)],
          components: [voiceControlRow(channelId, false, false)]
        });
      } catch (err) {
        return interaction.reply({
          embeds: [errorEmbed(`Failed to unlock: ${err.message}`)],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (action === 'vc_hide') {
      try {
        const currentlyHidden = channel.permissionOverwrites.cache.some(o =>
          o.id === everyone && o.deny.has(PermissionFlagsBits.ViewChannel)
        );
        await channel.permissionOverwrites.edit(everyone, {
          ViewChannel: currentlyHidden ? null : true
        });
        return interaction.update({
          embeds: [successEmbed(`<#${channel.id}> is now ${currentlyHidden ? 'unhidden' : 'hidden'}.`)],
          components: [voiceControlRow(channelId, false, !currentlyHidden)]
        });
      } catch (err) {
        return interaction.reply({
          embeds: [errorEmbed(`Failed to hide/unhide: ${err.message}`)],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    if (action === 'vc_delete') {
      try {
        await channel.delete('[Onyx Voice] Deleted via panel');
        db.removeVoiceChannel(interaction.guild.id, channelId);
        return interaction.update({
          embeds: [successEmbed(`Voice channel deleted.`)],
          components: []
        });
      } catch (err) {
        return interaction.reply({
          embeds: [errorEmbed(`Failed to delete: ${err.message}`)],
          flags: MessageFlags.Ephemeral
        });
      }
    }

    return false;
  }
};
