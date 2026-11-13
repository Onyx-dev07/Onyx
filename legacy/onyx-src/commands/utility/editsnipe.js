const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { createEmbed, errorEmbed } = require('../../utils/embeds');

module.exports = {
  name: 'editsnipe',
  aliases: ['es'],
  description: 'Reveals the before and after of the most recently edited message in this channel.',
  data: new SlashCommandBuilder()
    .setName('editsnipe')
    .setDescription('Reveals the before and after of the most recently edited message in this channel.'),

  async executeSlash(interaction, client) {
    const editSnipe = client.editSnipes?.get(interaction.channel.id);
    if (!editSnipe) {
      return interaction.reply({ embeds: [errorEmbed('There are no recently edited messages in this channel.')], flags: MessageFlags.Ephemeral });
    }

    const embed = createEmbed({
      title: 'Edit Snipe',
      fields: [
        { name: 'Before', value: editSnipe.oldContent },
        { name: 'After', value: editSnipe.newContent }
      ],
      author: { name: editSnipe.author.tag, iconURL: editSnipe.author.displayAvatarURL({ dynamic: true }) },
      footer: { text: `Edited • ${Math.floor((Date.now() - editSnipe.timestamp) / 1000)}s ago` }
    });

    await interaction.reply({ embeds: [embed] });
  },

  async executePrefix(message, args, client) {
    const editSnipe = client.editSnipes?.get(message.channel.id);
    if (!editSnipe) {
      return message.reply({ embeds: [errorEmbed('There are no recently edited messages in this channel.')] });
    }

    const embed = createEmbed({
      title: 'Edit Snipe',
      fields: [
        { name: 'Before', value: editSnipe.oldContent },
        { name: 'After', value: editSnipe.newContent }
      ],
      author: { name: editSnipe.author.tag, iconURL: editSnipe.author.displayAvatarURL({ dynamic: true }) },
      footer: { text: `Edited • ${Math.floor((Date.now() - editSnipe.timestamp) / 1000)}s ago` }
    });

    await message.reply({ embeds: [embed] });
  }
};

