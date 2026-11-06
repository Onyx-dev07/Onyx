const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database');
const { successEmbed, errorEmbed, createEmbed, muted, code, UI } = require('../../utils/embeds');

const PRESETS = ['staff', 'girl', 'vip', 'guest', 'friend'];
const MAX_CUSTOM_ROLES = 56;
const NAME_REGEX = /^[a-z0-9_-]{1,32}$/;

function presetLabels() {
  return { staff: 'Staff', girl: 'Girl', vip: 'VIP', guest: 'Guest', friend: 'Friend' };
}

function findPresetKey(input) {
  if (!input) return null;
  const value = input.toLowerCase();
  if (value === 'reqrole') return 'reqrole';
  return PRESETS.includes(value) ? value : null;
}

function configEmbed(guild, prefix = '/') {
  const data = db.getCustomRoles(guild.id);
  const presetRoles = data.presets || {};
  const labels = presetLabels();

  const fields = PRESETS.map(preset => ({
    name: `${labels[preset]} Role`,
    value: presetRoles[preset] ? `<@&${presetRoles[preset]}>` : 'Not configured',
    inline: true
  }));

  fields.push({
    name: 'Required Role',
    value: data.reqRoleId ? `<@&${data.reqRoleId}>` : 'Not configured (falls back to Manage Roles)',
    inline: true
  });

  const customNames = Object.keys(data.commands || {});
  fields.push({
    name: `Custom Role Commands (${customNames.length}/${MAX_CUSTOM_ROLES})`,
    value: customNames.length ? customNames.map(name => `\`${name}\``).join(', ') : 'None'
  });

  return createEmbed({
    title: 'Custom roles',
    description: [
      `Configure a preset with ${code(`${prefix}customrole setup <type> @role`)}.`,
      `Add a named command with ${code(`${prefix}customrole create <name> @role`)}.`,
      muted('Run a custom command as <name> @member to add or remove the role.')
    ].join('\n'),
    fields,
    footer: { text: `Custom roles ${UI.separator} ${customNames.length} commands` }
  });
}

function validateName(name, client) {
  if (!name) return 'Please provide a command name.';
  const value = name.toLowerCase();
  if (!NAME_REGEX.test(value)) return 'Command names may only contain letters, numbers, `_` and `-` (max 32 characters).';
  if (PRESETS.includes(value) || value === 'reqrole') return `\`${value}\` is a reserved custom role name.`;
  if (client.commands.has(value) || client.aliases.has(value)) return `\`${value}\` is already used by a bot command.`;
  return null;
}

function roleHierarchyError(guild, role) {
  if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return errorEmbed('I need the **Manage Roles** permission to do that.');
  }
  if (role.position >= guild.members.me.roles.highest.position) {
    return errorEmbed(`I cannot manage ${role} because it is higher than my highest role.`);
  }
  return null;
}

module.exports = {
  name: 'customrole',
  aliases: ['cr', 'customroles'],
  description: 'Configures Olympus-style custom role commands (staff, girl, VIP, guest, friend and named role commands).',
  userPermissions: [PermissionFlagsBits.Administrator],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  data: new SlashCommandBuilder()
    .setName('customrole')
    .setDescription('Configures Olympus-style custom role commands.')
    .addSubcommand(sub =>
      sub.setName('create')
        .setDescription('Create a named custom role command')
        .addStringOption(opt => opt.setName('name').setDescription('Command name (e.g. gamer)').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role assigned by the command').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('delete')
        .setDescription('Delete a named custom role command')
        .addStringOption(opt => opt.setName('name').setDescription('Command name to delete').setRequired(true))
    )
    .addSubcommand(sub =>
      sub.setName('setup')
        .setDescription('Configure a preset role or the required role')
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('Which role to configure')
            .setRequired(true)
            .addChoices(
              { name: 'Required Role', value: 'reqrole' },
              { name: 'Staff', value: 'staff' },
              { name: 'Girl', value: 'girl' },
              { name: 'VIP', value: 'vip' },
              { name: 'Guest', value: 'guest' },
              { name: 'Friend', value: 'friend' }
            )
        )
        .addRoleOption(opt => opt.setName('role').setDescription('Role to configure').setRequired(true))
    )
    .addSubcommand(sub => sub.setName('list').setDescription('View the current custom role configuration'))
    .addSubcommand(sub => sub.setName('reset').setDescription('Reset all custom role configuration for this server')),

  async executeSlash(interaction) {
    const sub = interaction.options.getSubcommand();
    const client = interaction.client;
    const guild = interaction.guild;

    if (sub === 'create') {
      const name = interaction.options.getString('name').toLowerCase();
      const role = interaction.options.getRole('role');

      const nameError = validateName(name, client);
      if (nameError) return interaction.reply({ embeds: [errorEmbed(nameError)], flags: MessageFlags.Ephemeral });

      const hierarchyError = roleHierarchyError(guild, role);
      if (hierarchyError) return interaction.reply({ embeds: [hierarchyError], flags: MessageFlags.Ephemeral });

      const data = db.getCustomRoles(guild.id);
      if (Object.keys(data.commands || {}).length >= MAX_CUSTOM_ROLES) {
        return interaction.reply({ embeds: [errorEmbed(`This server has reached the maximum of **${MAX_CUSTOM_ROLES}** custom role commands.`)] });
      }

      db.setCustomRole(guild.id, name, role.id);
      return interaction.reply({
        embeds: [successEmbed(`Created custom role command \`${name}\` for ${role}.\n\nUse \`${name} @member\` to add or remove the role.`)]
      });
    }

    if (sub === 'delete') {
      const name = interaction.options.getString('name').toLowerCase();
      const data = db.getCustomRoles(guild.id);
      if (!data.commands?.[name]) {
        return interaction.reply({ embeds: [errorEmbed(`No custom role command named \`${name}\` exists.`)], flags: MessageFlags.Ephemeral });
      }
      db.removeCustomRole(guild.id, name);
      return interaction.reply({ embeds: [successEmbed(`Deleted custom role command \`${name}\`.`)] });
    }

    if (sub === 'setup') {
      const type = interaction.options.getString('type');
      const role = interaction.options.getRole('role');

      const hierarchyError = roleHierarchyError(guild, role);
      if (hierarchyError) return interaction.reply({ embeds: [hierarchyError], flags: MessageFlags.Ephemeral });

      if (type === 'reqrole') {
        db.setReqRole(guild.id, role.id);
        return interaction.reply({ embeds: [successEmbed(`Members now need ${role} to use custom role commands.`)] });
      }

      db.setPresetRole(guild.id, type, role.id);
      return interaction.reply({
        embeds: [successEmbed(`**${presetLabels()[type]} preset** ${UI.separator} ${role}`)]
      });
    }

    if (sub === 'list') {
      return interaction.reply({ embeds: [configEmbed(guild, '/')] });
    }

    if (sub === 'reset') {
      db.resetCustomRoles(guild.id);
      return interaction.reply({ embeds: [successEmbed('Reset all custom role configuration and deleted every named custom role command.')] });
    }
  },

  async executePrefix(message, args) {
    const sub = args[0]?.toLowerCase();
    const client = message.client;
    const guild = message.guild;
    const prefix = db.getPrefix(guild.id, process.env.DEFAULT_PREFIX || '!');
    const role = message.mentions.roles.first() || (args[2] ? guild.roles.cache.get(args[2]) : null);

    if (!sub || sub === 'list' || sub === 'config') {
      return message.reply({ embeds: [configEmbed(guild, prefix)] });
    }

    if (sub === 'create') {
      const name = args[1]?.toLowerCase();
      const nameError = validateName(name, client);
      if (nameError) return message.reply({ embeds: [errorEmbed(nameError)] });
      if (!role) return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}customrole create <name> @role\``)] });

      const hierarchyError = roleHierarchyError(guild, role);
      if (hierarchyError) return message.reply({ embeds: [hierarchyError] });

      const data = db.getCustomRoles(guild.id);
      if (Object.keys(data.commands || {}).length >= MAX_CUSTOM_ROLES) {
        return message.reply({ embeds: [errorEmbed(`This server has reached the maximum of **${MAX_CUSTOM_ROLES}** custom role commands.`)] });
      }

      db.setCustomRole(guild.id, name, role.id);
      return message.reply({
        embeds: [successEmbed(`Created custom role command \`${name}\` for ${role}.\n\nUse \`${name} @member\` to add or remove the role.`)]
      });
    }

    if (sub === 'delete' || sub === 'remove') {
      const name = args[1]?.toLowerCase();
      const data = db.getCustomRoles(guild.id);
      if (!name || !data.commands?.[name]) {
        return message.reply({ embeds: [errorEmbed(`Usage: \`${prefix}customrole delete <name>\``)] });
      }
      db.removeCustomRole(guild.id, name);
      return message.reply({ embeds: [successEmbed(`Deleted custom role command \`${name}\`.`)] });
    }

    if (sub === 'setup') {
      const type = findPresetKey(args[1]);
      if (!type || !role) {
        return message.reply({
          embeds: [errorEmbed(`Usage: \`${prefix}customrole setup <reqrole|staff|girl|vip|guest|friend> @role\``)]
        });
      }

      const hierarchyError = roleHierarchyError(guild, role);
      if (hierarchyError) return message.reply({ embeds: [hierarchyError] });

      if (type === 'reqrole') {
        db.setReqRole(guild.id, role.id);
        return message.reply({ embeds: [successEmbed(`Members now need ${role} to use custom role commands.`)] });
      }

      db.setPresetRole(guild.id, type, role.id);
      return message.reply({
        embeds: [successEmbed(`**${presetLabels()[type]} preset** ${UI.separator} ${role}`)]
      });
    }

    if (sub === 'reset') {
      db.resetCustomRoles(guild.id);
      return message.reply({ embeds: [successEmbed('Reset all custom role configuration and deleted every named custom role command.')] });
    }

    return message.reply({
      embeds: [createEmbed({
        title: 'Custom Role Usage',
        description: `\`${prefix}customrole create <name> @role\`\n\`${prefix}customrole delete <name>\`\n\`${prefix}customrole setup <reqrole|staff|girl|vip|guest|friend> @role\`\n\`${prefix}customrole list\`\n\`${prefix}customrole reset\``
      })]
    });
  }
};
