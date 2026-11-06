const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  ActionRowBuilder,
  RoleSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const { createEmbed, errorEmbed, stateLine, UI } = require('../../utils/embeds');

function canManage(interaction) {
  return interaction.member?.permissions?.has(PermissionFlagsBits.ManageRoles);
}

function panelEmbed(guild) {
  const current = db.getAutorole(guild.id);
  const active = Boolean(current.enabled && current.roleId);

  return createEmbed({
    title: 'Autorole',
    description: [
      stateLine(active, active ? 'New members receive a role automatically' : 'Autorole is disabled'),
      '',
      'The role must sit below the Onyx role for assignment to succeed.'
    ].join('\n'),
    fields: [
      { name: 'Status', value: active ? 'Active' : 'Inactive', inline: true },
      { name: 'Role', value: current.roleId ? `<@&${current.roleId}>` : 'None', inline: true }
    ],
    color: active ? config.colors.success : config.colors.primary,
    footer: { text: `Autorole ${UI.separator} ${active ? 'Active' : 'Inactive'}` }
  });
}

function panelPayload(guild) {
  const current = db.getAutorole(guild.id);

  return {
    embeds: [panelEmbed(guild)],
    components: [
      new ActionRowBuilder().addComponents(
        new RoleSelectMenuBuilder()
          .setCustomId('autorole_role')
          .setPlaceholder('Select the role for new members')
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('autorole_disable')
          .setLabel('Disable autorole')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(!current.enabled)
      )
    ]
  };
}

const builder = new SlashCommandBuilder()
  .setName('autorole')
  .setDescription('Configures automatic role assignment for newly joined members.')
  .addSubcommand(sub =>
    sub.setName('set')
      .setDescription('Set the role to automatically assign to new members')
      .addRoleOption(opt =>
        opt.setName('role')
          .setDescription('Role to assign')
          .setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub.setName('disable')
      .setDescription('Disables the autorole system')
  )
  .addSubcommand(sub =>
    sub.setName('status')
      .setDescription('Shows the current autorole configuration')
  );

module.exports = {
  name: 'autorole',
  aliases: ['arole'],
  description: 'Configures automatic role assignment for newly joined members.',
  userPermissions: [PermissionFlagsBits.ManageRoles],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  data: builder,

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'set') {
      const role = interaction.options.getRole('role');

      if (role.managed || role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({
          embeds: [errorEmbed('I cannot assign this role because it is managed or higher than my highest role.')],
          flags: MessageFlags.Ephemeral
        });
      }

      db.setAutorole(interaction.guild.id, { enabled: true, roleId: role.id });
    } else if (sub === 'disable') {
      db.setAutorole(interaction.guild.id, { enabled: false, roleId: null });
    }

    return interaction.reply({
      ...panelPayload(interaction.guild),
      flags: MessageFlags.Ephemeral
    });
  },

  async executePrefix(message, args) {
    const sub = args[0]?.toLowerCase();

    if (sub === 'disable') {
      db.setAutorole(message.guild.id, { enabled: false, roleId: null });
      return message.reply(panelPayload(message.guild));
    }

    const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);

    if (role) {
      if (role.position >= message.guild.members.me.roles.highest.position) {
        return message.reply({
          embeds: [errorEmbed('That role is higher than my highest role.')]
        });
      }

      db.setAutorole(message.guild.id, { enabled: true, roleId: role.id });
    }

    return message.reply(panelPayload(message.guild));
  },

  async handleSelect(interaction) {
    if (!canManage(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('You need Manage Roles to change autorole.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId !== 'autorole_role') return false;

    const role = interaction.guild.roles.cache.get(interaction.values[0]);
    if (!role) {
      return interaction.reply({
        embeds: [errorEmbed('That role no longer exists.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (role.managed || role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.reply({
        embeds: [errorEmbed('I cannot assign this role because it is managed or higher than my highest role.')],
        flags: MessageFlags.Ephemeral
      });
    }

    db.setAutorole(interaction.guild.id, { enabled: true, roleId: role.id });
    return interaction.update(panelPayload(interaction.guild));
  },

  async handleButton(interaction) {
    if (!canManage(interaction)) {
      return interaction.reply({
        embeds: [errorEmbed('You need Manage Roles to change autorole.')],
        flags: MessageFlags.Ephemeral
      });
    }

    if (interaction.customId !== 'autorole_disable') return false;

    db.setAutorole(interaction.guild.id, { enabled: false, roleId: null });
    return interaction.update(panelPayload(interaction.guild));
  }
};
