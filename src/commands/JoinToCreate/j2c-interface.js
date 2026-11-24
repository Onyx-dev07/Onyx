import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } from 'discord.js';
import { OnyxError, ErrorTypes, replyUserError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import { hasManageGuildPermission } from '../../services/joinToCreateService.js';
import { handleInterface } from '../../handlers/joinToCreateCommandHandlers.js';

export default {
    data: new SlashCommandBuilder()
        .setName('j2c-interface')
        .setDescription('Create or select the text channel for Join to Create voice control panels.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false)
        .addChannelOption((option) =>
            option
                .setName('channel')
                .setDescription('Existing text channel to use for voice interfaces.')
                .addChannelTypes(ChannelType.GuildText)
        ),
    category: 'utility',

    async execute(interaction, config, client) {
        try {
            if (!hasManageGuildPermission(interaction.member)) {
                throw new OnyxError(
                    'User lacks ManageGuild permission',
                    ErrorTypes.PERMISSION,
                    'You need **Manage Server** permission to use this command.'
                );
            }

            await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
            await handleInterface(interaction, client);
        } catch (error) {
            try {
                let errorMessage = 'An error occurred while executing this command.';

                if (error instanceof OnyxError) {
                    errorMessage = error.userMessage || 'An error occurred. Please try again.';
                    logger.debug(`OnyxError [${error.type}]: ${error.message}`, error.context || {});
                } else {
                    logger.error('Unexpected error in j2c-interface command:', error);
                    errorMessage = 'An unexpected error occurred. Please try again or contact support.';
                }

                return replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: errorMessage });
            } catch (replyError) {
                logger.error('Failed to send error message:', replyError);
            }
        }
    }
};
