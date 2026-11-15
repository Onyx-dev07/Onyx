// animeActions.js — resolves anime reaction GIFs for fun commands.
//
// nekos.best returns a small batch of GIF URLs per request, so we keep a pool
// and hand out one per command. The pool is warmed at startup, which makes
// `!slap` and `!kiss` feel instant after the first fetch.
//
// NSFW actions use Purrbot's image API (and Nekobot for actions Purrbot does
// not expose). Those commands are gated to age-restricted channels by the
// command wrapper before a GIF is requested.

const API_BASE = 'https://nekos.best/api/v2';
const PURRBOT_BASE = 'https://api.purrbot.site/v2/img/nsfw';
const NEKOBOT_BASE = 'https://nekobot.xyz/api/image';
const BATCH_SIZE = 10;
const REQUEST_TIMEOUT_MS = 4000;

const pools = new Map();
const inflight = new Map();

const NSFW_SOURCES = {
  fuck: { api: 'purrbot', path: 'fuck' },
  lick: { api: 'purrbot', path: 'pussylick' },
  suck: { api: 'purrbot', path: 'blowjob' },
  cum: { api: 'purrbot', path: 'cum' },
  squeeze: { api: 'nekobot', type: 'paizuri' },
};

function normalizeResults(payload) {
  return (payload?.results || [])
    .filter((entry) => entry && typeof entry.url === 'string' && entry.url)
    .map((entry) => ({
      url: entry.url,
      anime: typeof entry.anime_name === 'string' ? entry.anime_name : null,
    }));
}

async function fetchPool(action) {
  const response = await fetch(`${API_BASE}/${action}?amount=${BATCH_SIZE}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Anime GIF request failed (${response.status})`);
  }

  return normalizeResults(await response.json());
}

/**
 * Returns one random { url, anime } GIF for the given action.
 * @param {string} action - nekos.best endpoint, e.g. "slap" or "kiss".
 */
export async function getAnimeGif(action) {
  const cached = pools.get(action);
  if (cached?.length) {
    return cached.splice(Math.floor(Math.random() * cached.length), 1)[0];
  }

  let request = inflight.get(action);
  if (!request) {
    request = fetchPool(action).finally(() => inflight.delete(action));
    inflight.set(action, request);
  }

  const results = await request;
  if (!results.length) {
    throw new Error(`No anime GIFs available for ${action}`);
  }

  const index = Math.floor(Math.random() * results.length);
  const [chosen] = results.splice(index, 1);
  if (results.length) {
    pools.set(action, results);
  }

  return chosen;
}

async function fetchNsfwGif(action) {
  const source = NSFW_SOURCES[action];
  if (!source) {
    throw new Error(`No NSFW source configured for ${action}`);
  }

  if (source.api === 'nekobot') {
    const response = await fetch(`${NEKOBOT_BASE}?type=${encodeURIComponent(source.type)}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`NSFW image request failed (${response.status})`);
    }

    const payload = await response.json();
    if (!payload?.message) {
      throw new Error(`No NSFW image available for ${action}`);
    }

    return { url: payload.message, anime: null };
  }

  const response = await fetch(`${PURRBOT_BASE}/${encodeURIComponent(source.path)}/gif`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`NSFW GIF request failed (${response.status})`);
  }

  const payload = await response.json();
  if (payload?.error || !payload?.link) {
    throw new Error(`No NSFW GIF available for ${action}`);
  }

  return { url: payload.link, anime: null };
}

/**
 * Returns one random NSFW { url, anime } image for the given action.
 * Only call this after confirming the channel is age-restricted.
 * @param {string} action - logical action name, e.g. "fuck" or "squeeze".
 */
export async function getNsfwGif(action) {
  return fetchNsfwGif(action);
}

export function warmAnimeActions(actions = ['slap', 'kiss', 'punch']) {
  for (const action of actions) {
    getAnimeGif(action).catch(() => {});
  }
}

warmAnimeActions();
