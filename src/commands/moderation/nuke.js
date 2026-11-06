const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { errorEmbed, actionEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'nuke',
  description: 'Clones and deletes the current channel to wipe all messages.',
  userPermissions: [PermissionFlagsBits.ManageChannels],
  botPermissions: [PermissionFlagsBits.ManageChannels],
  data: new SlashCommandBuilder()
    .setName('nuke')
    .setDescription('Clones and deletes the current channel to wipe all messages.'),

  async executeSlash(interaction) {
    const channel = interaction.channel;

    // Threads have no permission overwrites of their own and cannot be cloned.
    if (channel.isThread?.()) {
      return interaction.reply({
        embeds: [errorEmbed('Nuke cannot run inside a thread. Use it in the parent channel.')],
        flags: MessageFlags.Ephemeral
      });
    }

    // Acknowledge before cloning/deleting: once the channel is gone the
    // interaction webhook goes with it, so a late reply would fail.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const position = channel.position;
      const newChannel = await channel.clone({
        name: channel.name,
        permissionOverwrites: channel.permissionOverwrites.cache,
        topic: channel.topic,
        nsfw: channel.nsfw,
        rateLimitPerUser: channel.rateLimitPerUser,
        reason: `[Onyx Mod] Nuked by ${interaction.user.tag}`
      });

      await newChannel.setPosition(position);
      await channel.delete();

      const embed = actionEmbed({
        title: 'Channel Cleared',
        icon: 'trash',
        moderator: `<@${interaction.user.id}>`,
        reason: 'Channel messages wiped',
        fields: [{ name: 'New Channel', value: `<#${newChannel.id}>`, inline: true }]
      });
      await newChannel.send({ embeds: [embed] });
    } catch (err) {
      // If deletion succeeded this edit fails silently, which is expected —
      // there is no original channel left to report into.
      await interaction.editReply({
        embeds: [errorEmbed(`Failed to nuke channel: ${err.message}`)]
      }).catch(() => {});
    }
  },

  async executePrefix(message) {
    const channel = message.channel;

    if (channel.isThread?.()) {
      return message.reply({ embeds: [errorEmbed('Nuke cannot run inside a thread. Use it in the parent channel.')] });
    }

    try {
      const position = channel.position;
      const newChannel = await channel.clone({
        name: channel.name,
        permissionOverwrites: channel.permissionOverwrites.cache,
        topic: channel.topic,
        nsfw: channel.nsfw,
        rateLimitPerUser: channel.rateLimitPerUser,
        reason: `[Onyx Mod] Nuked by ${message.author.tag}`
      });

      await newChannel.setPosition(position);
      await channel.delete();

      const embed = actionEmbed({
        title: 'Channel Cleared',
        icon: 'trash',
        moderator: `<@${message.author.id}>`,
        reason: 'Channel messages wiped',
        fields: [{ name: 'New Channel', value: `<#${newChannel.id}>`, inline: true }]
      });
      await newChannel.send({ embeds: [embed] });
    } catch (err) {
      await message.reply({ embeds: [errorEmbed(`Failed to nuke channel: ${err.message}`)] });
    }
  }
};
