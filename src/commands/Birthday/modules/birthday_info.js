import { createEmbed, warningEmbed } from '../../../utils/embeds.js';
import { avatarURL } from '../../../utils/theme.js';
import { getUserBirthday } from '../../../services/birthdayService.js';
import { logger } from '../../../utils/logger.js';

import { InteractionHelper } from '../../../utils/interactionHelper.js';
export default {
    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        const targetUser = interaction.options.getUser("user") || interaction.user;
        const userId = targetUser.id;
        const guildId = interaction.guildId;

        const birthdayData = await getUserBirthday(client, guildId, userId);

        if (!birthdayData) {
            const embed = warningEmbed(
                'No Birthday Found',
                targetUser.id === interaction.user.id
                    ? "You haven't set your birthday yet. Use `/birthday set` to add it!"
                    : `<@${targetUser.id}> hasn't set their birthday yet.`
            );
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
        }

        const embed = createEmbed({
            title: '🎂 Birthday Information',
            description: [
                `**User:** <@${targetUser.id}>`,
                `**Date:** ${birthdayData.monthName} ${birthdayData.day}`
            ].join('\n'),
            color: 'primary',
            thumbnail: avatarURL(targetUser)
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed]
        });

        logger.info('Birthday info retrieved successfully', {
            userId: interaction.user.id,
            targetUserId: targetUser.id,
            guildId,
            commandName: 'birthday_info'
        });
    }
};
