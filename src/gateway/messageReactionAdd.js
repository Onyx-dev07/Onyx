// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const { Events } = require('discord.js');
const { getReactionRoleConfig, getPairs, findMatchingPair } = require('../lib/reactionRoleHelper');

module.exports = {
  name: Events.MessageReactionAdd,
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

      try {
        const member = reaction.message.guild.members.cache.get(user.id)
          || await reaction.message.guild.members.fetch(user.id);
        const role = reaction.message.guild.roles.cache.get(pair.roleId);

        if (role) {
          await member.roles.add(role);
        }
      } catch (memberError) {
        console.error(`Error adding role:`, memberError.message);
      }
    } catch (error) {
      console.error('Error handling reaction add:', error);
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