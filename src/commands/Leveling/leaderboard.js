import { SlashCommandBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { OnyxError, ErrorTypes } from '../../utils/errorHandler.js';
import { getLeaderboard, getLevelingConfig, getXpForLevel } from '../../services/leveling/leveling.js';
import { createEmbed, warningEmbed } from '../../utils/embeds.js';
import { userMention } from '../../utils/theme.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription("Shows the server's level leaderboard")
    .setDMPermission(false),
  category: 'Leveling',

  async execute(interaction, config, client) {
    await InteractionHelper.safeDefer(interaction);

    const levelingConfig = await getLevelingConfig(client, interaction.guildId);

    if (!levelingConfig?.enabled) {
      await InteractionHelper.safeEditReply(interaction, {
        embeds: [
          warningEmbed('Leveling Disabled', 'The leveling system is currently disabled on this server.')
        ]
      });
      return;
    }

    const leaderboard = await getLeaderboard(client, interaction.guildId, 10);

    if (leaderboard.length === 0) {
      throw new OnyxError(
        'No leaderboard data found',
        ErrorTypes.DATABASE,
        'No level data found yet. Start chatting to gain XP!'
      );
    }

    const leaderboardText = await Promise.all(
      leaderboard.map(async (user, index) => {
        try {
          const member = await interaction.guild.members.fetch(user.userId).catch(() => null);
          const mention = member?.user.toString() || userMention(user.userId);
          const xpForNextLevel = getXpForLevel(user.level + 1);

          let rankPrefix = `${index + 1}.`;
          if (index === 0) rankPrefix = '🥇';
          else if (index === 1) rankPrefix = '🥈';
          else if (index === 2) rankPrefix = '🥉';
          else rankPrefix = `**${index + 1}.**`;

          return `${rankPrefix} ${mention} · Level **${user.level}** · ${user.xp}/${xpForNextLevel} XP`;
        } catch {
          return `**${index + 1}.** Error loading user ${user.userId}`;
        }
      })
    );

    const embed = createEmbed({
      title: 'Level Leaderboard',
      description: `Top 10 most active members in this server.\n\n${leaderboardText.join('\n')}`,
      color: 'primary'
    });

    await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    logger.debug(`Leaderboard displayed for guild ${interaction.guildId}`);
  }
};
