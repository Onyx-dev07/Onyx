const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database');
const { errorEmbed, actionEmbed, code } = require('../../utils/embeds');

module.exports = {
  name: 'purge',
  aliases: ['clearall', 'c'],
  description: 'Advanced Greed-style message purge with filters (bots, humans, links, images, contains).',
  userPermissions: [PermissionFlagsBits.ManageMessages],
  botPermissions: [PermissionFlagsBits.ManageMessages],
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Advanced Greed-style message purge with filters.')
    .addIntegerOption(opt =>
      opt.setName('amount')
        .setDescription('Number of messages to search/purge (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('filter')
        .setDescription('Filter type to apply')
        .addChoices(
          { name: 'Bots Only', value: 'bots' },
          { name: 'Humans Only', value: 'humans' },
          { name: 'Links Only', value: 'links' },
          { name: 'Images & Attachments Only', value: 'images' }
        )
        .setRequired(false)
    )
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('Purge messages from a specific user')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('contains')
        .setDescription('Purge messages containing a specific text string')
        .setRequired(false)
    ),

  async executeSlash(interaction) {
    const amount = interaction.options.getInteger('amount');
    const filter = interaction.options.getString('filter');
    const targetUser = interaction.options.getUser('user');
    const containsText = interaction.options.getString('contains');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const messages = await interaction.channel.messages.fetch({ limit: amount });
      let filtered = messages;

      if (targetUser) {
        filtered = filtered.filter(m => m.author.id === targetUser.id);
      } else if (filter === 'bots') {
        filtered = filtered.filter(m => m.author.bot);
      } else if (filter === 'humans') {
        filtered = filtered.filter(m => !m.author.bot);
      } else if (filter === 'links') {
        filtered = filtered.filter(m => /https?:\/\/[^\s]+/gi.test(m.content));
      } else if (filter === 'images') {
        filtered = filtered.filter(m => m.attachments.size > 0 || m.embeds.some(e => e.image || e.thumbnail));
      } else if (containsText) {
        filtered = filtered.filter(m => m.content.toLowerCase().includes(containsText.toLowerCase()));
      }

      const deleted = await interaction.channel.bulkDelete(filtered, true);
      await interaction.editReply({
        embeds: [actionEmbed({
          title: 'Messages Purged',
          icon: 'trash',
          moderator: `<@${interaction.user.id}>`,
          reason: 'Purged messages matching your filter',
          fields: [
            { name: 'Messages Purged', value: `${deleted.size}`, inline: true },
            { name: 'Filter', value: filter || targetUser ? 'User filter' : containsText ? 'Text filter' : 'All messages', inline: true }
          ]
        })]
      });
    } catch (err) {
      await interaction.editReply({ embeds: [errorEmbed(`Failed to purge messages: ${err.message}`)] });
    }
  },

  async executePrefix(message, args) {
    // Syntax options:
    // !purge 50
    // !purge bots 50
    // !purge humans 50
    // !purge links 50
    // !purge @user 50
    // !purge contains <word> 50
    let filterType = 'all';
    let targetUser = null;
    let containsWord = null;
    let amount = 50;

    if (args.length === 1 && !isNaN(parseInt(args[0]))) {
      amount = parseInt(args[0]);
    } else if (['bots', 'humans', 'links', 'images'].includes(args[0]?.toLowerCase())) {
      filterType = args[0].toLowerCase();
      amount = parseInt(args[1]) || 50;
    } else if (args[0]?.toLowerCase() === 'contains' && args[1]) {
      filterType = 'contains';
      containsWord = args[1];
      amount = parseInt(args[2]) || 50;
    } else if (message.mentions.users.first()) {
      filterType = 'user';
      targetUser = message.mentions.users.first();
      amount = parseInt(args[1]) || 50;
    } else if (args.length > 0) {
      const prefix = db.getPrefix(message.guild.id, process.env.DEFAULT_PREFIX || '!');
      return message.reply({
        embeds: [errorEmbed(`Usage: ${code(`${prefix}purge [bots|humans|links|images|contains <word>|@user] <1-100>`)}`)]
      });
    }

    if (amount > 100) amount = 100;
    if (amount < 1) amount = 1;

    try {
      await message.delete().catch(() => {});
      const messages = await message.channel.messages.fetch({ limit: amount });
      let filtered = messages;

      if (filterType === 'bots') {
        filtered = filtered.filter(m => m.author.bot);
      } else if (filterType === 'humans') {
        filtered = filtered.filter(m => !m.author.bot);
      } else if (filterType === 'links') {
        filtered = filtered.filter(m => /https?:\/\/[^\s]+/gi.test(m.content));
      } else if (filterType === 'images') {
        filtered = filtered.filter(m => m.attachments.size > 0 || m.embeds.some(e => e.image || e.thumbnail));
      } else if (filterType === 'contains' && containsWord) {
        filtered = filtered.filter(m => m.content.toLowerCase().includes(containsWord.toLowerCase()));
      } else if (filterType === 'user' && targetUser) {
        filtered = filtered.filter(m => m.author.id === targetUser.id);
      }

      const deleted = await message.channel.bulkDelete(filtered, true);
      const reply = await message.channel.send({
        embeds: [actionEmbed({
          title: 'Messages Purged',
          icon: 'trash',
          moderator: `<@${message.author.id}>`,
          reason: 'Purged messages matching your filter',
          fields: [{ name: 'Messages Purged', value: `${deleted.size}`, inline: true }]
        })]
      });
      setTimeout(() => reply.delete().catch(() => {}), 4000);
    } catch (err) {
      message.channel.send({ embeds: [errorEmbed(`Failed to purge messages: ${err.message}`)] }).catch(() => {});
    }
  }
};
