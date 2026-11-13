import { MessageFlags } from 'discord.js';
import { createEmbed } from '../../../utils/embeds.js';
import { getTicketData, saveTicketData } from '../../../utils/database.js';
import { logger } from '../../../utils/logger.js';
import { logTicketFeedback } from '../../../utils/ticket/ticketLogging.js';
import { InteractionHelper } from '../../../utils/interactionHelper.js';

function buildEmbed(title, description, color) {
    return createEmbed({ title, description, color });
}

export default {
    name: 'ticket_feedback_comment_modal',

    async execute(interaction, client, args) {
        const [guildId, channelId] = args;

        if (!guildId || !channelId) {
            await InteractionHelper.safeReply(interaction, {
                embeds: [buildEmbed(
                    '⚠️ Invalid Feedback Submission',
                    'This feedback form appears to be malformed.',
                    'error',
                )],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const comment = interaction.fields.getTextInputValue('feedback_comment')?.trim();
        if (!comment) {
            await InteractionHelper.safeReply(interaction, {
                embeds: [buildEmbed(
                    '⚠️ Empty Feedback',
                    'Please enter a comment before submitting your feedback.',
                    'warning',
                )],
                flags: MessageFlags.Ephemeral,
            });
            return;
        }

        const deferred = await InteractionHelper.safeDefer(interaction, { flags: MessageFlags.Ephemeral });
        if (!deferred) {
            return;
        }

        let ticketData;
        try {
            ticketData = await getTicketData(guildId, channelId);
        } catch (err) {
            logger.warn('ticketFeedbackComment: failed to load ticket data', { guildId, channelId, error: err.message });
        }

        if (!ticketData) {
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [buildEmbed(
                    '⚠️ Ticket Not Found',
                    'Could not find the ticket associated with this feedback.',
                    'error',
                )],
            });
            return;
        }

        if (interaction.user.id !== ticketData.userId) {
            await InteractionHelper.safeEditReply(interaction, {
                embeds: [buildEmbed(
                    '❌ Not Allowed',
                    'Only the ticket creator can submit feedback for this ticket.',
                    'error',
                )],
            });
            return;
        }

        ticketData.feedback = {
            ...ticketData.feedback,
            comment,
            commentSubmittedAt: new Date().toISOString(),
        };

        try {
            await saveTicketData(guildId, channelId, ticketData);
        } catch (err) {
            logger.error('ticketFeedbackComment: failed to save feedback', { guildId, channelId, error: err.message });
        }

        try {
            await logTicketFeedback({
                client: interaction.client,
                guildId,
                ticketNumber: ticketData.id,
                ticketChannelId: channelId,
                userId: interaction.user.id,
                rating: ticketData.feedback?.rating ?? null,
                comment,
            });
        } catch (err) {
            logger.warn('ticketFeedbackComment: failed to send log', { guildId, channelId, error: err.message });
        }

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [buildEmbed(
                '✅ Feedback Submitted',
                'Your written feedback has been recorded. Thank you for helping us improve!',
                'success',
            )],
        });

        logger.info('Ticket feedback comment submitted', {
            guildId,
            channelId,
            userId: interaction.user.id,
        });
    },
};
