// Onyx Discord Bot
// Author: Onyx

require('dotenv').config();

const runEmojiSync = require('../src/lib/emojiSync');

runEmojiSync()
        .then((summary) => {
                if (summary.failed > 0) process.exitCode = 1;
        })
        .catch((error) => {
                console.error(`[EmojiSync] ${error.message}`);
                process.exitCode = 1;
        });
