const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const {
  actionPayload,
  failurePayload,
  moderationBlock,
  moderationFailure
} = require('../../utils/moderation');

module.exports = {
  name: 'voicemod',
  aliases: ['vm', 'voice'],
  description: 'Voice channel moderation: kick, mute, unmute, deafen, undeafen, moveall.',
  userPermissions: [PermissionFlagsBits.MuteMembers, PermissionFlagsBits.MoveMembers],
  botPermissions: [PermissionFlagsBits.MuteMembers, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.DeafenMembers],
  data: new SlashCommandBuilder()
    .setName('voicemod')
    .setDescription('Voice channel moderation commands.')
    .addSubcommand(sub =>
      sub.setName('kick')
        .setDescription('Disconnect a member from their current voice channel')
        .addUserOption(opt => opt.setName('target').setDescription('Member to disconnect').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('mute')
        .setDescription('Server-mute a member in voice')
        .addUserOption(opt => opt.setName('target').setDescription('Member to voice-mute').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('unmute')
        .setDescription('Remove server voice-mute from a member')
        .addUserOption(opt => opt.setName('target').setDescription('Member to voice-unmute').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('deafen')
        .setDescription('Server-deafen a member in voice')
        .addUserOption(opt => opt.setName('target').setDescription('Member to deafen').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('undeafen')
        .setDescription('Server-undeafen a member in voice')
        .addUserOption(opt => opt.setName('target').setDescription('Member to undeafen').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('moveall')
        .setDescription('Move all members from one voice channel to another')
        .addChannelOption(opt => opt.setName('from').setDescription('Source voice channel').addChannelTypes(ChannelType.GuildVoice).setRequired(true))
        .addChannelOption(opt => opt.setName('to').setDescription('Target voice channel').addChannelTypes(ChannelType.GuildVoice).setRequired(true))
    ),

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'moveall') {
      const fromCh = interaction.options.getChannel('from');
      const toCh = interaction.options.getChannel('to');

      // Moving many members can exceed the three-second response window.
      await interaction.deferReply();

      let moved = 0;
      for (const [, member] of fromCh.members) {
        try {
          await member.voice.setChannel(toCh);
          moved++;
        } catch {}
      }

      return interaction.editReply(actionPayload({
        title: 'Members Moved',
        moderator: `<@${interaction.user.id}>`,
        reason: `Moved from <#${fromCh.id}> to <#${toCh.id}>`,
        fields: [{ name: 'Members Moved', value: `${moved}`, inline: true }]
      }));
    }

    const target = interaction.options.getUser('target');
    const member = await interaction.guild.members.fetch(target.id).catch(() => null);

    if (!member || !member.voice.channel) {
      return interaction.reply({
        ...failurePayload('Voice Action Blocked', 'That member is not in a voice channel.'),
        flags: MessageFlags.Ephemeral
      });
    }

    const problem = moderationBlock(interaction.guild, member, `${sub} in voice`);
    if (problem) {
      return interaction.reply({
        ...failurePayload('Voice Action Blocked', problem),
        flags: MessageFlags.Ephemeral
      });
    }

    try {
      if (sub === 'kick') {
        await member.voice.disconnect('[Onyx VoiceMod] Disconnected by mod');
        return interaction.reply(actionPayload({
          title: 'Voice Disconnect',
          icon: 'disconnect',
          target: `<@${target.id}>`,
          moderator: `<@${interaction.user.id}>`,
          reason: 'Disconnected from voice channel'
        }));
      } else if (sub === 'mute') {
        await member.voice.setMute(true, '[Onyx VoiceMod] Server muted');
        return interaction.reply(actionPayload({
          title: 'Voice Muted',
          icon: 'lock',
          target: `<@${target.id}>`,
          moderator: `<@${interaction.user.id}>`,
          reason: 'Server-muted in voice channel'
        }));
      } else if (sub === 'unmute') {
        await member.voice.setMute(false, '[Onyx VoiceMod] Server unmuted');
        return interaction.reply(actionPayload({
          title: 'Voice Unmuted',
          icon: 'check',
          target: `<@${target.id}>`,
          moderator: `<@${interaction.user.id}>`,
          reason: 'Server-unmuted in voice channel'
        }));
      } else if (sub === 'deafen') {
        await member.voice.setDeaf(true, '[Onyx VoiceMod] Server deafened');
        return interaction.reply(actionPayload({
          title: 'Voice Deafened',
          icon: 'lock',
          target: `<@${target.id}>`,
          moderator: `<@${interaction.user.id}>`,
          reason: 'Server-deafened in voice channel'
        }));
      } else if (sub === 'undeafen') {
        await member.voice.setDeaf(false, '[Onyx VoiceMod] Server undeafened');
        return interaction.reply(actionPayload({
          title: 'Voice Undeafened',
          icon: 'check',
          target: `<@${target.id}>`,
          moderator: `<@${interaction.user.id}>`,
          reason: 'Server-undeafened in voice channel'
        }));
      }
    } catch (err) {
      return interaction.reply({
        ...failurePayload('Voice Action Blocked', moderationFailure(`${sub} in voice`, err)),
        flags: MessageFlags.Ephemeral
      });
    }
  },

  async executePrefix(message, args) {
    const action = args[0]?.toLowerCase();

    if (!action) {
      return message.reply(failurePayload(
        'Voice Action Blocked',
        'Usage: `!voicemod <kick|mute|unmute|deafen|undeafen> @user` or `!voicemod moveall #from #to`'
      ));
    }

    if (action === 'moveall' || action === 'vcmove') {
      const channels = [...message.mentions.channels.values()];
      if (channels.length < 2) {
        return message.reply(failurePayload('Voice Action Blocked', 'Usage: `!voicemod moveall #from #to`'));
      }

      const [fromCh, toCh] = channels;
      if (fromCh.type !== ChannelType.GuildVoice || toCh.type !== ChannelType.GuildVoice) {
        return message.reply(failurePayload('Voice Action Blocked', 'Both channels must be voice channels.'));
      }

      let moved = 0;
      for (const [, member] of fromCh.members) {
        try {
          await member.voice.setChannel(toCh);
          moved++;
        } catch {}
      }

      return message.reply(actionPayload({
        title: 'Members Moved',
        moderator: `<@${message.author.id}>`,
        reason: `Moved from <#${fromCh.id}> to <#${toCh.id}>`,
        fields: [{ name: 'Members Moved', value: `${moved}`, inline: true }]
      }));
    }

    const user = message.mentions.users.first();
    if (!user) {
      return message.reply(failurePayload(
        'Voice Action Blocked',
        'Usage: `!voicemod <kick|mute|unmute|deafen|undeafen> @user`'
      ));
    }

    const member = await message.guild.members.fetch(user.id).catch(() => null);
    if (!member || !member.voice.channel) {
      return message.reply(failurePayload('Voice Action Blocked', 'That member is not in a voice channel.'));
    }

    const problem = moderationBlock(message.guild, member, `${action} in voice`);
    if (problem) {
      return message.reply(failurePayload('Voice Action Blocked', problem));
    }

    try {
      if (action === 'kick' || action === 'vkick') {
        await member.voice.disconnect();
        return message.reply(actionPayload({
          title: 'Voice Disconnect',
          icon: 'disconnect',
          target: `<@${user.id}>`,
          moderator: `<@${message.author.id}>`,
          reason: 'Disconnected from voice channel'
        }));
      } else if (action === 'mute' || action === 'vmute') {
        await member.voice.setMute(true);
        return message.reply(actionPayload({
          title: 'Voice Muted',
          icon: 'lock',
          target: `<@${user.id}>`,
          moderator: `<@${message.author.id}>`,
          reason: 'Server-muted in voice channel'
        }));
      } else if (action === 'unmute' || action === 'vunmute') {
        await member.voice.setMute(false);
        return message.reply(actionPayload({
          title: 'Voice Unmuted',
          icon: 'check',
          target: `<@${user.id}>`,
          moderator: `<@${message.author.id}>`,
          reason: 'Server-unmuted in voice channel'
        }));
      } else if (action === 'deafen' || action === 'vdeafen') {
        await member.voice.setDeaf(true);
        return message.reply(actionPayload({
          title: 'Voice Deafened',
          icon: 'lock',
          target: `<@${user.id}>`,
          moderator: `<@${message.author.id}>`,
          reason: 'Server-deafened in voice channel'
        }));
      } else if (action === 'undeafen' || action === 'vundeafen') {
        await member.voice.setDeaf(false);
        return message.reply(actionPayload({
          title: 'Voice Undeafened',
          icon: 'check',
          target: `<@${user.id}>`,
          moderator: `<@${message.author.id}>`,
          reason: 'Server-undeafened in voice channel'
        }));
      }
    } catch (err) {
      return message.reply(failurePayload('Voice Action Blocked', moderationFailure(`${action} in voice`, err)));
    }

    return message.reply(failurePayload(
      'Voice Action Blocked',
      'Unknown voice action. Usage: `!voicemod <kick|mute|unmute|deafen|undeafen> @user`'
    ));
  }
};
