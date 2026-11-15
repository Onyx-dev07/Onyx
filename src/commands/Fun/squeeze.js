import { createAnimeActionCommand } from '../../utils/animeActionCommand.js';

export default createAnimeActionCommand({
  name: 'squeeze',
  verb: 'squeezed',
  description: 'Random NSFW anime GIF. Age-restricted channels only.',
  nsfw: true,
  nsfwAction: 'squeeze',
});
