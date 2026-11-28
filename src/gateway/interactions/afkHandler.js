// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { MessageFlags } = require('discord.js');

const {
        parseAfkDmCustomId,
        setAfk,
        successResponse,
        takePendingAfk,
} = require('../../lib/afkService');

function ephemeral(content) {
        return { content, flags: MessageFlags.Ephemeral };
}

module.exports = {
        async handle(interaction) {
                if (!interaction.isButton()) return false;

                const parsed = parseAfkDmCustomId(interaction.customId);
                if (!parsed) return false;

                const { dm, guildId, userId } = parsed;

                if (interaction.user.id !== userId) {
                        await interaction.reply(ephemeral('This AFK setup belongs to someone else.'));
                        return true;
                }

                const reason = takePendingAfk(guildId, userId);
                if (!reason) {
                        await interaction.reply(ephemeral('This AFK setup has expired. Run the AFK command again.'));
                        return true;
                }

                try {
                        await setAfk(guildId, userId, reason, dm);
                } catch (error) {
                        console.error('[AFK] Failed to save AFK:', error.message);
                        await interaction.reply(ephemeral('Failed to save your AFK status. Please try again.'));
                        return true;
                }

                await interaction.update(successResponse(reason, dm));
                return true;
        },
};
