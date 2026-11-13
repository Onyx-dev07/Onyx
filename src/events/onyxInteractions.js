// Bridges the Onyx security suite's interaction handler into the ESM event
// loader. The handler itself ignores anything that is not Onyx-owned.

import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(pathToFileURL(__filename).href);

const handler = require(path.join(__dirname, '../onyx/events/client/interactionCreate.js'));

export default {
  name: handler.name,
  async execute(interaction, client) {
    return handler.execute(interaction, client);
  }
};
