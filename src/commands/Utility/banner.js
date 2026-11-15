import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, compactEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import { userMention } from '../../utils/theme.js';

/**
 * Banners are not included in message payloads, so fetch the user to make sure
 * `banner` is populated even when the member is already cached.
 */
async function resolveBannerUser(interaction, target) {
  const id = target?.id || interaction.user.id;

  const fetched = await interaction.client.users
    .fetch(id, { force: true })
    .catch(() => null);

  return fetched || target || interaction.user;
}

function resolveBannerUrl(user) {
  if (typeof user?.displayBannerURL === 'function') {
    const url = user.displayBannerURL({ size: 4096, dynamic: true });
    if (url) return url;
  }

  if (typeof user?.bannerURL === 'function') {
    return user.bannerURL({ size: 4096, dynamic: true }) || null;
  }

  return null;
}

export default {
  data: new SlashCommandBuilder()
    .setName('banner')
    .setDescription("Display a member's profile banner")
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('The member whose banner you want to see (defaults to you)'),
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('target') || interaction.user;
    const user = await resolveBannerUser(interaction, target);
    const bannerUrl = resolveBannerUrl(user);

    if (!bannerUrl) {
      return InteractionHelper.safeReply(interaction, {
        embeds: [
          compactEmbed(
            `**${userMention(user)}** doesn't have a profile banner set.`,
            'warning',
          ),
        ],
      });
    }

    const embed = createEmbed({
      description: `${userMention(user)}'s banner\n[Open full size](${bannerUrl})`,
      color: 'primary',
      image: bannerUrl,
      footer: false,
      timestamp: false,
    });

    await InteractionHelper.safeReply(interaction, { embeds: [embed] });
    logger.info('Banner command executed', {
      userId: interaction.user.id,
      targetUserId: user.id,
      guildId: interaction.guildId,
    });
  },
};
