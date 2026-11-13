import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from './embeds.js';
import { InteractionHelper } from './interactionHelper.js';
import { logger } from './logger.js';
import { userMention } from './theme.js';
import { getAnimeGif } from './animeActions.js';

function pickRandomTarget(guild, excludeId) {
  const pool = guild?.members?.cache?.filter((member) => !member.user.bot && member.id !== excludeId);
  return pool?.size ? pool.random().user : null;
}

function actionText(author, target, verb) {
  if (author.id === target.id) {
    return `**${userMention(author)}** ${verb} themselves!`;
  }

  return `**${userMention(author)}** ${verb} **${userMention(target)}**!`;
}

/**
 * Builds a compact fun command that replies with a themed embed and a random
 * anime GIF for the action.
 * @param {{ name: string, verb: string, description: string }} options
 */
export function createAnimeActionCommand({ name, verb, description }) {
  return {
    data: new SlashCommandBuilder()
      .setName(name)
      .setDescription(description)
      .setDMPermission(false)
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription('The member to target (defaults to a random member)')
          .setRequired(false),
      ),

    async execute(interaction) {
      const target = interaction.options.getUser('user')
        || pickRandomTarget(interaction.guild, interaction.user.id)
        || interaction.user;

      const deferSuccess = await InteractionHelper.safeDefer(interaction);
      if (!deferSuccess) {
        return;
      }

      try {
        const gif = await getAnimeGif(name);
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [
            createEmbed({
              description: [actionText(interaction.user, target, verb), gif.anime ? `-# ${gif.anime}` : '']
                .filter(Boolean)
                .join('\n'),
              color: 'primary',
              image: gif.url,
              footer: false,
              timestamp: false,
            }),
          ],
        });
      } catch (error) {
        logger.warn(`Anime ${name} GIF failed, replying without it:`, error.message);
        return InteractionHelper.safeEditReply(interaction, {
          embeds: [
            createEmbed({
              description: `${actionText(interaction.user, target, verb)}\nThe anime GIF didn't load — try again in a moment.`,
              color: 'warning',
              footer: false,
              timestamp: false,
            }),
          ],
        });
      }
    },
  };
}
