import { createEmbed, warningEmbed } from '../../../utils/embeds.js';
import { getUpcomingBirthdays } from '../../../services/birthdayService.js';
import { deleteBirthday } from '../../../utils/database.js';
import { logger } from '../../../utils/logger.js';

import { InteractionHelper } from '../../../utils/interactionHelper.js';
export default {
    async execute(interaction, config, client) {
        await InteractionHelper.safeDefer(interaction);

        const next5 = await getUpcomingBirthdays(client, interaction.guildId, 5);

        if (next5.length === 0) {
            const embed = warningEmbed(
                'No Birthdays Found',
                'No birthdays have been set up in this server yet. Use `/birthday set` to add birthdays!'
            );
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
        }

        let displayIndex = 0;
        for (const birthday of next5) {
            const member = await interaction.guild.members.fetch(birthday.userId).catch(() => null);
            if (!member) {
                deleteBirthday(client, interaction.guildId, birthday.userId).catch(() => null);
                continue;
            }
            displayIndex++;
        }

        if (displayIndex === 0) {
            const embed = warningEmbed(
                'No Upcoming Birthdays',
                'No upcoming birthdays found for current server members.'
            );
            return await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed]
            });
        }

        let birthdayList = `Here are the next 5 birthdays in **${interaction.guild.name}**:\n\n`;
        displayIndex = 0;
        for (const birthday of next5) {
            const member = await interaction.guild.members.fetch(birthday.userId).catch(() => null);
            if (!member) {
                continue;
            }
            displayIndex++;

            let timeUntil = '';
            if (birthday.daysUntil === 0) {
                timeUntil = '🎉 **Today!**';
            } else if (birthday.daysUntil === 1) {
                timeUntil = '📅 **Tomorrow!**';
            } else {
                timeUntil = `In ${birthday.daysUntil} day${birthday.daysUntil > 1 ? 's' : ''}`;
            }

            birthdayList += `${displayIndex}. <@${birthday.userId}> · ${birthday.monthName} ${birthday.day} · ${timeUntil}\n`;
        }

        birthdayList += '\n-# Use `/birthday set` to add your birthday.';

        const embed = createEmbed({
            title: '🎂 Next 5 Upcoming Birthdays',
            description: birthdayList,
            color: 'primary'
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed]
        });

        logger.info('Next birthdays retrieved successfully', {
            userId: interaction.user.id,
            guildId: interaction.guildId,
            upcomingCount: displayIndex,
            commandName: 'next_birthdays'
        });
    }
};
