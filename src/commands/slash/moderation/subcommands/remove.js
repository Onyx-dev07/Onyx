// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { PermissionFlagsBits } = require('discord.js');

const roleCards = require('../../../../lib/roleActionCard');

function send(interaction, payload, ephemeral = false) {
  return interaction.reply(roleCards.withFlags(payload, ephemeral));
}

module.exports = {
  name: 'roleremove',
  description: 'Remove a role from a user',

  async execute(interaction) {
    const targetMember = interaction.options.getMember('user');
    const role = interaction.options.getRole('role');

    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return send(interaction, roleCards.error('Permission Denied', 'You need the **Manage Roles** permission.'), true);

    if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles))
      return send(interaction, roleCards.error('Missing Permissions', 'I need the **Manage Roles** permission.'), true);

    if (!targetMember)
      return send(interaction, roleCards.error('User Not Found', 'User is not in this server.'), true);

    if (role.position >= interaction.guild.members.me.roles.highest.position)
      return send(interaction, roleCards.error('Role Too High', 'I cannot manage this role as it is higher than or equal to my highest role.'), true);

    if (interaction.member.id !== interaction.guild.ownerId && role.position >= interaction.member.roles.highest.position)
      return send(interaction, roleCards.error('Role Too High', 'You cannot manage a role higher than or equal to your highest role.'), true);

    if (!targetMember.roles.cache.has(role.id))
      return send(interaction, roleCards.doesNotHave({ member: targetMember, role }), true);

    try {
      await targetMember.roles.remove(role, `[ROLEREMOVE] By ${interaction.user.tag}`);
      return send(interaction, roleCards.taken({
        member: targetMember,
        role,
        actor: interaction.user,
      }));
    } catch (error) {
      const text = error.code === 50013
        ? 'I lack the permissions to manage this role.'
        : 'Failed to remove role.';
      return send(interaction, roleCards.error('Error', text), true);
    }
  },
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */
