// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('support')
        .setDescription('Get the support server invite link'),

    name: 'support',
    aliases: [],
    description: 'Get the support server invite link',

    async execute(interactionOrMessage) {
        const config = require('../../config');
        return interactionOrMessage.reply(config.SUPPORT_SERVER);
    }
};

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */