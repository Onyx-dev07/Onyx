const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const { createEmbed, errorEmbed, UI, cardAuthor, quote, muted } = require('../../utils/embeds');

const ACTION_WORDS = {
  add: 'add',
  give: 'add',
  remove: 'remove',
  take: 'remove',
  toggle: 'toggle'
};

async function fetchMember(guild, token) {
  if (!token) return null;
  const match = token.match(/^<@!?(\d+)>$/);
  const id = match ? match[1] : (/^\d{17,20}$/.test(token) ? token : null);
  if (!id) return null;
  return guild.members.fetch(id).catch(() => null);
}

function findRole(guild, mentioned, query) {
  if (mentioned) return mentioned;
  if (!query) return null;

  const id = query.match(/^<@&(\d+)>$/)?.[1] || (/^\d{17,20}$/.test(query) ? query : null);
  if (id) return guild.roles.cache.get(id) || null;

  const name = query.toLowerCase();
  return guild.roles.cache.find(role => role.name.toLowerCase() === name)
    || guild.roles.cache.find(role => role.name.toLowerCase().startsWith(name))
    || guild.roles.cache.find(role => role.name.toLowerCase().includes(name))
    || null;
}

function hierarchyError(guild, member, role, moderator) {
  if (role.id === guild.id) return errorEmbed('The **@everyone** role cannot be assigned.');
  if (role.managed) return errorEmbed(`${role} is managed by an integration and cannot be assigned manually.`);
  if (member.id === guild.ownerId) return errorEmbed('You cannot change the roles of the server owner.');
  if (role.position >= guild.members.me.roles.highest.position) {
    return errorEmbed(`${role} sits above my highest role, so I cannot manage it.`);
  }
  if (moderator && moderator.id !== guild.ownerId && member.roles.highest.position >= moderator.roles.highest.position) {
    return errorEmbed(`${member.user.username} has a role equal to or above yours.`);
  }
  return null;
}

async function changeRole({ guild, member, role, action, moderator, client }) {
  const problem = hierarchyError(guild, member, role, moderator);
  if (problem) return { embed: problem };

  const hasRole = member.roles.cache.has(role.id);
  const shouldAdd = action === 'toggle' ? !hasRole : action === 'add';
  const label = shouldAdd ? 'Added' : 'Removed';

  if (action !== 'toggle' && hasRole === shouldAdd) {
    return {
      embed: createEmbed({
        author: cardAuthor('Role', client.user.displayAvatarURL({ size: 128 })),
        description: quote(`**${member.user.username}** ${shouldAdd ? 'already has' : 'does not have'} ${role}`),
        color: config.colors.warning
      })
    };
  }

  try {
    await member.roles[shouldAdd ? 'add' : 'remove'](role, `[Onyx] ${label} by ${moderator.tag}`);
  } catch (err) {
    return { embed: errorEmbed(`Could not update the role ${UI.separator} ${err.message}`) };
  }

  const roleCount = member.roles.cache.filter(entry => entry.id !== guild.id).size;

  return {
    embed: createEmbed({
      author: cardAuthor('Role', client.user.displayAvatarURL({ size: 128 })),
      title: shouldAdd ? 'Role added' : 'Role removed',
      description: [
        quote(`${shouldAdd ? UI.active : UI.inactive} **${label}** ${role} ${shouldAdd ? 'to' : 'from'} **${member.user.username}**`),
        muted(`Member now holds ${roleCount} ${roleCount === 1 ? 'role' : 'roles'}`)
      ].join('\n'),
      color: config.colors.success
    })
  };
}

function usageEmbed(prefix) {
  return createEmbed({
    author: cardAuthor('Role'),
    title: 'Usage',
    description: [
      'Add, remove, or toggle a role. The role can be mentioned or written by name.',
      UI.divider,
      `\`${prefix}role @member @Role\``,
      `\`${prefix}role add @member RoleName\``,
      `\`${prefix}role remove @member @Role\``
    ].join('\n')
  });
}

module.exports = {
  name: 'role',
  description: 'Adds, removes, or toggles a role for a member.',
  userPermissions: [PermissionFlagsBits.ManageRoles],
  botPermissions: [PermissionFlagsBits.ManageRoles],
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Adds, removes, or toggles a role for a member.')
    .addUserOption(option =>
      option.setName('member')
        .setDescription('Member to update')
        .setRequired(true)
    )
    .addRoleOption(option =>
      option.setName('role')
        .setDescription('Role to add, remove, or toggle')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('action')
        .setDescription('What to do with the role (default: toggle)')
        .setRequired(false)
        .addChoices(
          { name: 'Add', value: 'add' },
          { name: 'Remove', value: 'remove' },
          { name: 'Toggle', value: 'toggle' }
        )
    ),

  async executeSlash(interaction) {
    const user = interaction.options.getUser('member');
    const selected = interaction.options.getRole('role');
    const role = interaction.guild.roles.cache.get(selected?.id);
    const action = interaction.options.getString('action') || 'toggle';

    if (!role) return interaction.reply({ embeds: [errorEmbed('That role could not be found.')], flags: MessageFlags.Ephemeral });

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ embeds: [errorEmbed('That member is not in this server.')], flags: MessageFlags.Ephemeral });

    const result = await changeRole({
      guild: interaction.guild,
      member,
      role,
      action,
      moderator: interaction.member,
      client: interaction.client
    });

    await interaction.reply({ embeds: [result.embed] });
  },

  async executePrefix(message, args) {
    const prefix = db.getPrefix(message.guild.id, process.env.DEFAULT_PREFIX || config.defaultPrefix || '!');
    const words = [...args];
    const action = ACTION_WORDS[words[0]?.toLowerCase()] || 'toggle';
    if (ACTION_WORDS[words[0]?.toLowerCase()]) words.shift();

    if (!words.length) return message.reply({ embeds: [usageEmbed(prefix)] });

    const member = message.mentions.members.first() || await fetchMember(message.guild, words[0]);
    if (!member) return message.reply({ embeds: [usageEmbed(prefix)] });

    const query = words
      .filter(token => !/^<@!?\d+>$/.test(token) && token !== member.id)
      .join(' ')
      .trim();

    const role = findRole(message.guild, message.mentions.roles.first(), query);
    if (!role) return message.reply({ embeds: [usageEmbed(prefix)] });

    const result = await changeRole({
      guild: message.guild,
      member,
      role,
      action,
      moderator: message.member,
      client: message.client
    });

    await message.reply({ embeds: [result.embed] });
  }
};
