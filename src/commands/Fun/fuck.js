import { createAnimeActionCommand } from '../../utils/animeActionCommand.js';

export default createAnimeActionCommand({
  name: 'fuck',
  verb: 'fucked',
  description: 'Random NSFW anime GIF. Age-restricted channels only.',
  nsfw: true,
  nsfwAction: 'fuck',
});
