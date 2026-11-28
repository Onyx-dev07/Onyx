// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const { Events } = require('discord.js');
const { getReactionRoleConfig, getPairs, findMatchingPair } = require('../lib/reactionRoleHelper');

module.exports = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    if (user.bot) return;

    try {
      await reaction.fetch();

      const config = await getReactionRoleConfig(reaction.message.id, reaction.message.guild.id);
      if (!config) return;

      const pairs = getPairs(config);
      if (pairs.length === 0) return;

      const pair = findMatchingPair(pairs, reaction.emoji);
      if (!pair) return;

      const member = reaction.message.guild.members.cache.get(user.id)
        || await reaction.message.guild.members.fetch(user.id);
      const role = reaction.message.guild.roles.cache.get(pair.roleId);

      if (role) {
        await member.roles.remove(role);
      }
    } catch (error) {
      console.error('Error handling reaction remove:', error);
    }
  }
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */