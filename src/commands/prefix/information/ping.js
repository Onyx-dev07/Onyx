// © Author: Onyx
// https://discord.gg/QnWNz2dKCE

const { buildPingCard } = require('../../../lib/pingCard');

module.exports = {
    name: 'ping',
    description: 'Check the bot\'s latency and service health',

    async execute(message) {
        const sent = await message.reply({ content: 'Pinging...', fetchReply: true });

        const roundtripMs = Date.now() - sent.createdTimestamp;
        const reply = await buildPingCard(message.client, roundtripMs);

        await sent.edit({ content: null, ...reply });
    },
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */
