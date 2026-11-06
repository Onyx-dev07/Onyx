const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ActionRowBuilder,
  UserSelectMenuBuilder,
  StringSelectMenuBuilder
} = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const { securityEmbed, errorEmbed, muted, UI } = require('../../utils/embeds');

function isOwner(interaction) {
  return interaction.user.id === interaction.guild.ownerId;
}

function panelEmbed(guild) {
  const owners = db.getExtraOwners(guild.id);
  const active = owners.length > 0;

  return securityEmbed({
    title: 'Extra owners',
    description: [
      `${mark(active)} **Appointed owners** ${UI.separator} ${owners.length}`,
      '',
      owners.length
        ? owners.map(id => `${mark(true)} <@${id}>`).join('\n')
        : `${mark(false)} No extra owners are appointed.`,
      muted('Extra owners can configure AntiNuke, whitelist, limits, and Anti-Betray.')
    ].join('\n'),
    color: active ? config.colors.crimson : config.colors.info,
    footer: { text: `Extra owners ${UI.separator} ${owners.length}` }
  });
}

function panelPayload(guild) {
  const owners = db.getExtraOwners(guild.id);
  const rows = [
    new ActionRowBuilder().addComponents(
      new UserSelectMenuBuilder()
        .setCustomId('extraowner_add')
        .setPlaceholder('Appoint an extra owner')
        .setMinValues(1)
        .setMaxValues(1)
    )
  ];

  if (owners.length) {
    rows.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('extraowner_remove')
        .setPlaceholder('Revoke an extra owner')
        .addOptions(owners.slice(0, 25).map(id => ({
          label: `User ${id.slice(-4)}`,
          description: id,
          value: id
        })))
    ));
  }

  return { embeds: [panelEmbed(guild)], components: rows };
}

const builder = new SlashCommandBuilder()
  .setName('extraowner')
  .setDescription('Manages extra trusted owners who have permission to configure Onyx AntiNuke.')
  .addSubcommand(sub =>
    sub.setName('add')
      .setDescription('Add an extra owner')
      .addUserOption(opt => opt.setName('target').setDescription('User to appoint as extra owner').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('remove')
      .setDescription('Remove an extra owner')
      .addUserOption(opt => opt.setName('target').setDescription('User to remove').setRequired(true))
  )
  .addSubcommand(sub =>
    sub.setName('list')
      .setDescription('View all appointed extra owners')
  );

module.exports = {
  name: 'extraowner',
  aliases: ['eo', 'extraowners'],
  description: 'Manages extra trusted owners who have permission to configure Onyx AntiNuke.',
  userPermissions: [PermissionFlagsBits.Administrator],
  data: builder,

  async executeSlash(interaction) {
    if (!isOwner(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('Only the server owner can manage extra owners.')],
        flags: MessageFlags.Ephemeral
      });
    }

    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('target');

    if (sub === 'add') {
      db.addExtraOwner(interaction.guild.id, target.id);
    } else if (sub === 'remove') {
      db.removeExtraOwner(interaction.guild.id, target.id);
    }

    return interaction.reply({
      ...panelPayload(interaction.guild),
      flags: MessageFlags.Ephemeral
    });
  },

  async executePrefix(message, args) {
    if (message.author.id !== message.guild.ownerId) {
      return message.reply({
        embeds: [errorEmbed('Only the server owner can manage extra owners.')]
      });
    }

    const sub = args[0]?.toLowerCase();
    const target = message.mentions.users.first()
      || (args[1] ? await message.client.users.fetch(args[1]).catch(() => null) : null);

    if (sub === 'add') {
      if (!target) {
        return message.reply({ embeds: [errorEmbed('Specify a user: `!extraowner add @user`')] });
      }
      db.addExtraOwner(message.guild.id, target.id);
    } else if (sub === 'remove' || sub === 'del') {
      if (!target) {
        return message.reply({ embeds: [errorEmbed('Specify a user: `!extraowner remove @user`')] });
      }
      db.removeExtraOwner(message.guild.id, target.id);
    }

    return message.reply(panelPayload(message.guild));
  },

  async handleSelect(interaction) {
    if (!isOwner(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('Only the server owner can manage extra owners.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId === 'extraowner_add') {
      db.addExtraOwner(interaction.guild.id, interaction.values[0]);
    } else if (interaction.customId === 'extraowner_remove') {
      db.removeExtraOwner(interaction.guild.id, interaction.values[0]);
    } else {
      return false;
    }

    return interaction.update(panelPayload(interaction.guild));
  }
};
