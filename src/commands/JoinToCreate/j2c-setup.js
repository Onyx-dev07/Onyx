import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags, ChannelType } from 'discord.js';
import { OnyxError, ErrorTypes, replyUserError } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { logger } from '../../utils/logger.js';
import { hasManageGuildPermission } from '../../services/joinToCreateService.js';
import { handleConfigure, handleSetup } from '../../handlers/joinToCreateCommandHandlers.js';

export default {
    data: new SlashCommandBuilder()
        .setName('j2c-setup')
        .setDescription('Set up or configure a Join to Create voice channel.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .setDMPermission(false)
        .addChannelOption((option) =>
            option
                .setName('trigger_channel')
                .setDescription('Existing trigger channel to configure instead of creating a new one.')
                .addChannelTypes(ChannelType.GuildVoice)
        )
        .addChannelOption((option) =>
            option
                .setName('category')
                .setDescription('Category to create the trigger channel in.')
                .addChannelTypes(ChannelType.GuildCategory)
        )
        .addStringOption((option) =>
            option
                .setName('channel_name')
                .setDescription('Template for naming temporary voice channels.')
                .addChoices(
                    { name: "{username}'s Room (Default)", value: "{username}'s Room" },
                    { name: "{username}'s Channel", value: "{username}'s Channel" },
                    { name: "{username}'s Lounge", value: "{username}'s Lounge" },
                    { name: "{username}'s Space", value: "{username}'s Space" },
                    { name: "{displayName}'s Room", value: "{displayName}'s Room" },
                    { name: "{username}'s VC", value: "{username}'s VC" },
                    { name: "{username}'s Music Room", value: "{username}'s Music Room" },
                    { name: "{username}'s Gaming Room", value: "{username}'s Gaming Room" },
                    { name: "{username}'s Chat Room", value: "{username}'s Chat Room" },
                    { name: "{username}'s Private Room", value: "{username}'s Private Room" }
                )
        )
        .addIntegerOption((option) =>
            option
                .setName('user_limit')
                .setDescription('Maximum users in temporary channels (0 = unlimited).')
        )
        .addIntegerOption((option) =>
            option
                .setName('bitrate')
                .setDescription('Bitrate for temporary channels in kbps (8-96).')
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

            const triggerChannel = interaction.options.getChannel('trigger_channel');
            await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });

            if (triggerChannel) {
                await handleConfigure(interaction, client);
            } else {
                await handleSetup(interaction, client);
            }
        } catch (error) {
            try {
                let errorMessage = 'An error occurred while executing this command.';

                if (error instanceof OnyxError) {
                    errorMessage = error.userMessage || 'An error occurred. Please try again.';
                    logger.debug(`OnyxError [${error.type}]: ${error.message}`, error.context || {});
                } else {
                    logger.error('Unexpected error in j2c-setup command:', error);
                    errorMessage = 'An unexpected error occurred. Please try again or contact support.';
                }

                return replyUserError(interaction, { type: ErrorTypes.UNKNOWN, message: errorMessage });
            } catch (replyError) {
                logger.error('Failed to send error message:', replyError);
            }
        }
    }
};
