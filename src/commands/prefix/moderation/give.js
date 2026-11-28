// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { PermissionFlagsBits } = require('discord.js');

const roleCards = require('../../../lib/roleActionCard');

module.exports = {
  name: 'rolegive',
  description: 'Give a role to a user',
  aliases: ['giverole', 'addrole'],

  async execute(message, args) {
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.reply(roleCards.error('Permission Denied', 'You need the **Manage Roles** permission.'));

    if (!message.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles))
      return message.reply(roleCards.error('Missing Permissions', 'I need the **Manage Roles** permission.'));

    let targetMember = message.mentions.members.first();
    if (!targetMember && args[0]) {
      const userQuery = args[0];
      const userIdMatch = userQuery.match(/^<?@?!?(\d{17,20})>?$/);
      if (userIdMatch) {
        targetMember = await message.guild.members.fetch(userIdMatch[1]).catch(() => null);
      } else {
        targetMember = message.guild.members.cache.find(m =>
          m.user.username.toLowerCase() === userQuery.toLowerCase() ||
          m.displayName.toLowerCase() === userQuery.toLowerCase()
        );
      }
    }
    if (!targetMember)
      return message.reply(roleCards.error('User Not Found', 'Please provide a valid user mention, ID, or username.'));

    let role = message.mentions.roles.first();
    if (!role && args[1]) {
      const roleQuery = args[1];
      const roleIdMatch = roleQuery.match(/^<?@?&?(\d{17,20})>?$/);
      if (roleIdMatch) {
        role = message.guild.roles.cache.get(roleIdMatch[1]);
      } else {
        role = message.guild.roles.cache.find(r =>
          r.name.toLowerCase() === roleQuery.toLowerCase() ||
          r.name.toLowerCase().includes(roleQuery.toLowerCase())
        );
      }
    }
    if (!role)
      return message.reply(roleCards.error('Role Not Found', 'Please provide a valid role mention, ID, or name.'));

    if (role.position >= message.guild.members.me.roles.highest.position)
      return message.reply(roleCards.error('Role Too High', 'I cannot manage this role as it is higher than or equal to my highest role.'));

    if (message.author.id !== message.guild.ownerId && role.position >= message.member.roles.highest.position)
      return message.reply(roleCards.error('Role Too High', 'You cannot manage a role higher than or equal to your highest role.'));

    if (targetMember.roles.cache.has(role.id))
      return message.reply(roleCards.alreadyHas({ member: targetMember, role }));

    try {
      await targetMember.roles.add(role, `[ROLEGIVE] By ${message.author.tag}`);
      return message.reply(roleCards.given({
        member: targetMember,
        role,
        actor: message.author,
      }));
    } catch (error) {
      const text = error.code === 50013
        ? 'I lack the permissions to manage this role.'
        : 'Failed to give role.';
      return message.reply(roleCards.error('Error', text));
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
