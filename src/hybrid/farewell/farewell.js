// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('farewell')
        .setDescription('Manage server farewell message settings')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup farewell message for leaving members')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset all farewell settings')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('config')
                .setDescription('View current farewell configuration')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Preview the farewell message using your profile')
        ),

    name: 'farewell',
    aliases: ['goodbye', 'leave'],
    description: 'Manage server farewell message settings',

    async execute(interactionOrMessage, args = []) {
        const isSlash = interactionOrMessage.isCommand?.();
        let subcommand;

        if (isSlash) {
            subcommand = interactionOrMessage.options.getSubcommand();
        } else {
            subcommand = args[0]?.toLowerCase();
            args = args.slice(1);
        }

        if (!subcommand || !['setup', 'reset', 'config', 'test'].includes(subcommand)) {
            return require('../../lib/helpMenu').sendHelp('farewell', interactionOrMessage);
        }

        const subcommandFile = require(`./subcommands/${subcommand}`);
        return subcommandFile.execute(interactionOrMessage, args);
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