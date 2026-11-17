const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const db = require('../../database');
const config = require('../../../config.json');
const { createEmbed, UI } = require('../../utils/embeds');
const emojiConfig = require('../../utils/emojiConfig');

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
  if (role.id === guild.id) return 'The **@everyone** role cannot be assigned.';
  if (role.managed) return `${role} is managed by an integration and cannot be assigned manually.`;
  if (member.id === guild.ownerId) return 'You cannot change the roles of the server owner.';
  if (role.position >= guild.members.me.roles.highest.position) {
    return `${role} sits above my highest role, so I cannot manage it.`;
  }
  if (moderator && moderator.id !== guild.ownerId && member.roles.highest.position >= moderator.roles.highest.position) {
    return `⚠️ <@${moderator.id}>: You can't moderate <@${member.id}> — their highest role is above or equal to yours.`;
  }
  return null;
}

function plainPayload(description, color = config.colors.success) {
  return {
    embeds: [createEmbed({
      description,
      color,
      footer: false,
      timestamp: false
    })]
  };
}

async function changeRole({ guild, member, role, action, moderator }) {
  const problem = hierarchyError(guild, member, role, moderator);
  if (problem) return { ok: false, problem };

  const hasRole = member.roles.cache.has(role.id);
  const shouldAdd = action === 'toggle' ? !hasRole : action === 'add';

  if (action !== 'toggle' && hasRole === shouldAdd) {
    return {
      ok: false,
      warning: true,
      problem: `<@${member.id}> ${shouldAdd ? 'already has' : 'does not have'} ${role}.`
    };
  }

  const label = shouldAdd ? 'Added' : 'Removed';

  try {
    await member.roles[shouldAdd ? 'add' : 'remove'](role, `[Onyx] ${label} by ${moderator.tag}`);
  } catch (err) {
    return { ok: false, problem: `Could not update ${role} ${UI.separator} ${err.message}` };
  }

  return { ok: true, role, added: shouldAdd };
}

// One plain sentence per outcome, matching !nick. Multiple mentioned roles are
// grouped so a bulk change still reads as a single compact reply.
function rolePayload(member, results) {
  const changed = results.filter((result) => result.ok);
  const failed = results.filter((result) => !result.ok);
  const blocked = failed.some((result) => !result.warning);
  const problems = [...new Set(failed.map((result) => result.problem))];

  if (changed.length === 0) {
    return plainPayload(
      problems.join('\n'),
      blocked ? config.colors.error : config.colors.warning
    );
  }

  const added = changed.filter((result) => result.added).map((result) => `${result.role}`);
  const removed = changed.filter((result) => !result.added).map((result) => `${result.role}`);
  const lines = [];

  const addMark = emojiConfig.resolveEmoji('roleAdd', '➕');
  const removeMark = emojiConfig.resolveEmoji('roleRemove', '➖');
  if (added.length) lines.push(`${addMark} ${added.join(', ')} added to <@${member.id}>.`);
  if (removed.length) lines.push(`${removeMark} ${removed.join(', ')} removed from <@${member.id}>.`);
  for (const problem of problems) lines.push(problem);

  return plainPayload(
    lines.join('\n'),
    blocked ? config.colors.error : failed.length ? config.colors.warning : config.colors.success
  );
}

function usageEmbed(prefix) {
  return createEmbed({
    title: 'Usage',
    description: [
      'Add, remove, or toggle a role. Mention one or more roles, or write a role name.',
      UI.divider,
      `\`${prefix}role @member @Role\``,
      `\`${prefix}role @member @Role1 @Role2\``,
      `\`${prefix}role add @member RoleName\``,
      `\`${prefix}role remove @member @Role\``
    ].join('\n'),
    footer: false,
    timestamp: false
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

    if (!role) return interaction.reply({ ...plainPayload('That role could not be found.', config.colors.error), flags: MessageFlags.Ephemeral });

    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    if (!member) return interaction.reply({ ...plainPayload('That member is not in this server.', config.colors.error), flags: MessageFlags.Ephemeral });

    const result = await changeRole({
      guild: interaction.guild,
      member,
      role,
      action,
      moderator: interaction.member
    });

    await interaction.reply(rolePayload(member, [result]));
  },

  async executePrefix(message, args) {
    const prefix = db.getPrefix(message.guild.id, process.env.DEFAULT_PREFIX || config.defaultPrefix || '!');
    const words = [...args];
    const action = ACTION_WORDS[words[0]?.toLowerCase()] || 'toggle';
    if (ACTION_WORDS[words[0]?.toLowerCase()]) words.shift();

    if (!words.length) return message.reply({ embeds: [usageEmbed(prefix)] });

    const member = message.mentions.members.first() || await fetchMember(message.guild, words[0]);
    if (!member) return message.reply({ embeds: [usageEmbed(prefix)] });

    let roles = [...message.mentions.roles.values()];

    if (!roles.length) {
      const query = words
        .filter(token => !/^<@!?\d+>$/.test(token) && token !== member.id)
        .join(' ')
        .trim();

      const role = findRole(message.guild, null, query);
      if (!role) return message.reply({ embeds: [usageEmbed(prefix)] });
      roles = [role];
    }

    const results = [];
    for (const role of roles) {
      results.push(await changeRole({
        guild: message.guild,
        member,
        role,
        action,
        moderator: message.member
      }));
    }

    await message.reply(rolePayload(member, results));
  }
};
