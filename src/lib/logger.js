// © Author: Onyx
// https://discord.gg/QnWNz2dKCE



const config = require('../config');
const emojis = require('../emojis.json');

class Logger {
    constructor() {
        this.logChannel = null;
    }

        setLogChannel(channel) {
        this.logChannel = channel;
    }

        async sendLog(logMessage) {
        if (!this.logChannel) return;

        try {
            await this.logChannel.send(logMessage);
        } catch (error) {
            console.error('Failed to send log to Discord channel:', error);
        }
    }

        consoleLog(type, message) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${type}] ${message}`);
    }
}

const logger = new Logger();
module.exports = logger;

/**
 * Project: Onyx
 * Author: Onyx
 * Organization: Onyx
 * GitHub: https://github.com/Onyx-dev07
 * License: Custom
 * © 2026 Onyx. All rights reserved.
 */