const { ChannelType } = require('discord.js');
const db = require('../../database');
const logger = require('../../utils/logger');

const activeCreations = new Set(); // channelId -> prevents duplicate creation races

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    const { guild, member, channelId, id: userId } = newState;

    if (!guild || !member || member.user.bot) return;

    const voiceConfig = db.getVoiceConfig(guild.id);
    if (!voiceConfig || !voiceConfig.enabled || !voiceConfig.joinToCreateChannelId) return;

    // Member joined the join-to-create channel
    if (channelId === voiceConfig.joinToCreateChannelId && !oldState.channelId) {
      try {
        if (activeCreations.has(userId)) return;
        activeCreations.add(userId);

        const joinChannel = guild.channels.cache.get(voiceConfig.joinToCreateChannelId);
        if (!joinChannel) return;

        const category = joinChannel.parentId
          ? guild.channels.cache.get(joinChannel.parentId)
          : null;

        const voiceChannel = await guild.channels.create({
          name: `${member.user.displayName || member.user.username}'s Channel`,
          type: ChannelType.GuildVoice,
          parent: category ? category.id : null,
          reason: '[Onyx VC] Join-to-Create channel',
          permissionOverwrites: [
            {
              id: member.id,
              allow: [
                'Connect',
                'Speak',
                'ViewChannel',
                'UseVAD',
                'PrioritySpeaker',
                'MuteMembers',
                'DeafenMembers',
                'MoveMembers',
                'UseExternalSounds'
              ]
            },
            {
              id: guild.roles.everyone.id,
              deny: ['Connect'],
              allow: ['ViewChannel']
            }
          ]
        });

        db.addVoiceChannel(guild.id, voiceChannel.id);
        db.setVoiceOwner(guild.id, voiceChannel.id, member.id);

        await member.voice.setChannel(voiceChannel, '[Onyx VC] Join-to-Create move').catch(() => {});

        logger.info(`[Onyx VC] Created join-to-create channel ${voiceChannel.id} for ${member.user.tag} in ${guild.name}`);
      } catch (err) {
        logger.error(`[Onyx VC] Failed to create join-to-create channel:`, err);
      } finally {
        activeCreations.delete(userId);
      }
      return;
    }

    // Member left or switched channels — check if a temp voice channel is now empty
    if (oldState.channelId && oldState.channelId !== voiceConfig.joinToCreateChannelId) {
      const oldChannel = guild.channels.cache.get(oldState.channelId);
      if (!oldChannel || oldChannel.type !== ChannelType.GuildVoice) return;

      const ownerId = db.getVoiceOwner(guild.id, oldChannel.id);
      if (!ownerId) return; // not a temp channel we own

      // Check if channel is empty
      if (oldChannel.members.size === 0) {
        try {
          await oldChannel.delete('[Onyx VC] Empty temp channel cleanup');
          db.removeVoiceChannel(guild.id, oldChannel.id);
          db.removeVoiceOwner(guild.id, oldChannel.id);
          logger.info(`[Onyx VC] Deleted empty temp channel ${oldChannel.id} in ${guild.name}`);
        } catch (err) {
          logger.error(`[Onyx VC] Failed to delete empty temp channel:`, err);
        }
      }
    }
  }
};
