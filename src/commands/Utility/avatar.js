import { SlashCommandBuilder } from 'discord.js';
import { createEmbed, compactEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import { userMention } from '../../utils/theme.js';

/**
 * Prefix invocations can hand back a lightweight stub when the member is not
 * cached, so make sure we always end up with a real User instance.
 */
async function resolveUser(interaction, target) {
  if (target && typeof target.displayAvatarURL === 'function') {
    return target;
  }

  const id = target?.id;
  if (!id) {
    return interaction.user;
  }

  return interaction.client.users.fetch(id).catch(() => null);
}

export default {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription("Display a member's avatar")
    .addUserOption((option) =>
      option
        .setName('target')
        .setDescription('The member whose avatar you want to see (defaults to you)'),
    ),

  async execute(interaction) {
    const target = interaction.options.getUser('target') || interaction.user;
    const user = (await resolveUser(interaction, target)) || interaction.user;

    if (!user) {
      return InteractionHelper.safeReply(interaction, {
        embeds: [compactEmbed("I couldn't load that member's avatar.", 'error')],
      });
    }

    const avatarUrl = user.displayAvatarURL({ size: 4096, dynamic: true });

    const embed = createEmbed({
      description: `${userMention(user)}'s avatar\n[Open full size](${avatarUrl})`,
      color: 'primary',
      image: avatarUrl,
      footer: false,
      timestamp: false,
    });

    await InteractionHelper.safeReply(interaction, { embeds: [embed] });
    logger.info('Avatar command executed', {
      userId: interaction.user.id,
      targetUserId: user.id,
      guildId: interaction.guildId,
    });
  },
};
