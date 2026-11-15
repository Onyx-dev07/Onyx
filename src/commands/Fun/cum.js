import { createAnimeActionCommand } from '../../utils/animeActionCommand.js';

export default createAnimeActionCommand({
  name: 'cum',
  verb: 'came on',
  description: 'Random NSFW anime GIF. Age-restricted channels only.',
  nsfw: true,
  nsfwAction: 'cum',
});
