import { createAnimeActionCommand } from '../../utils/animeActionCommand.js';

export default createAnimeActionCommand({
  name: 'lick',
  verb: 'licked',
  description: 'Random NSFW anime GIF. Age-restricted channels only.',
  nsfw: true,
  nsfwAction: 'lick',
});
