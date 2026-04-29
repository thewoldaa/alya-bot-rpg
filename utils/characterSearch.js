const { characters: localCharacters } = require("../config");
const { pickOne } = require("./random");

const apiCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000;
const DIRECT_TTL_MS = 60 * 60 * 1000;
const SEARCH_PAGES = [1, 2, 3];
const MIN_LOCAL_SCORE = 20;
const MIN_REMOTE_SCORE = 10;
const RANDOM_API_ATTEMPTS = 4;

function compact(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function scoreText(field, token) {
  const target = compact(field);
  const query = compact(token);
  if (!target || !query) return 0;

  if (target === query) return 80;
  if (target.includes(query)) return 35 + Math.min(15, query.length);
  if (query.includes(target)) return 18 + Math.min(10, target.length);
  return 0;
}

function scoreCharacter(character, query) {
  const q = compact(query);
  if (!q) return 0;

  const name = compact(character.name);
  const anime = compact(character.anime);
  const alias = compact(character.name_kanji || "");
  const nicknames = Array.isArray(character.nicknames) ? character.nicknames.map(compact) : [];
  const tokens = tokenize(query);

  let score = 0;

  if (name === q) score += 140;
  if (alias && alias === q) score += 120;
  if (nicknames.includes(q)) score += 100;
  if (name.includes(q)) score += 85;
  if (anime.includes(q)) score += 45;
  if (q.includes(name) && name) score += 30;
  if (q.includes(anime) && anime) score += 20;

  for (const token of tokens) {
    score += scoreText(character.name, token) * 2;
    score += scoreText(character.anime, token);
    score += scoreText(character.name_kanji || "", token) * 2;
    for (const nickname of nicknames) {
      score += scoreText(nickname, token);
    }
  }

  if (tokens.length > 1) {
    const tokenMatches = tokens.filter((token) => name.includes(compact(token)) || anime.includes(compact(token)));
    if (tokenMatches.length >= 2) {
      score += 25 + (tokenMatches.length * 5);
    }
  }

  return score;
}

function extractCharacterId(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;

  if (/^\d+$/.test(raw)) {
    return raw;
  }

  try {
    const url = new URL(raw);
    const pathnameMatch = url.pathname.match(/\/character\/(\d+)/i);
    if (pathnameMatch) {
      return pathnameMatch[1];
    }
  } catch {
    // fall through to regex parsing
  }

  const regexMatch = raw.match(/myanimelist\.net\/character\/(\d+)/i);
  if (regexMatch) {
    return regexMatch[1];
  }

  return null;
}

function pickBest(list, query, minimumScore = 1) {
  if (!Array.isArray(list) || !list.length) return null;
  let best = null;
  let bestScore = -1;

  for (const item of list) {
    const score = scoreCharacter(item, query);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (!best || bestScore < minimumScore) {
    return null;
  }

  return best;
}

function pickBestWithScore(list, query, minimumScore = 1) {
  if (!Array.isArray(list) || !list.length) return null;

  let best = null;
  let bestScore = -1;

  for (const item of list) {
    const score = scoreCharacter(item, query);
    if (score > bestScore) {
      bestScore = score;
      best = item;
    }
  }

  if (!best || bestScore < minimumScore) {
    return null;
  }

  return { item: best, score: bestScore };
}

function searchLocalCharacter(query) {
  const input = String(query || "").trim();
  if (!input) return null;

  if (/^\d+$/.test(input)) {
    const byId = localCharacters.find((character) => String(character.id) === input);
    if (byId) return {
      ...byId,
      key: `local:${byId.id}`,
      source: "local"
    };
  }

  const exact = localCharacters.find((character) =>
    compact(character.name) === compact(input) ||
    compact(character.anime) === compact(input)
  );
  if (exact) {
    return {
      ...exact,
      key: `local:${exact.id}`,
      source: "local"
    };
  }

  const best = pickBest(localCharacters, input, MIN_LOCAL_SCORE);
  if (!best) return null;

  return {
    ...best,
    key: `local:${best.id}`,
    source: "local"
  };
}

function mapLocalCharacter(character) {
  if (!character) return null;
  return {
    ...character,
    key: `local:${character.id}`,
    source: "local"
  };
}

function getRandomLocalCharacter(excludeKey = null) {
  const pool = localCharacters
    .map(mapLocalCharacter)
    .filter((character) => character && character.key !== excludeKey);

  if (!pool.length) return null;
  return pickOne(pool);
}

async function searchJikanCharacters(query) {
  const input = String(query || "").trim();
  if (!input) return null;

  const key = compact(input);
  const cached = apiCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const variants = buildQueryVariants(input);
  let best = null;
  let bestScore = -1;
  const q = compact(input);

  for (const variant of variants) {
    for (const page of SEARCH_PAGES) {
      const results = await fetchJikanCharacterSearch(variant, page);
      if (!Array.isArray(results) || !results.length) {
        continue;
      }

      const exact = results.find((character) => {
        const name = compact(character.name);
        const alias = compact(character.name_kanji || "");
        const nicknames = Array.isArray(character.nicknames) ? character.nicknames.map(compact) : [];
        return name === q || alias === q || nicknames.includes(q);
      });

      if (exact) {
        const detail = await fetchJikanCharacterDetail(exact.id).catch(() => null);
        const resolved = detail || exact;
        apiCache.set(key, {
          expiresAt: Date.now() + CACHE_TTL_MS,
          value: resolved
        });
        return resolved;
      }

      const match = pickBestWithScore(results, input, MIN_REMOTE_SCORE);
      if (match && match.score > bestScore) {
        best = match.item;
        bestScore = match.score;
      }

      if (match && match.score >= 80) {
        const detail = await fetchJikanCharacterDetail(match.item.id).catch(() => null);
        const resolved = detail || match.item;
        apiCache.set(key, {
          expiresAt: Date.now() + CACHE_TTL_MS,
          value: resolved
        });
        return resolved;
      }
    }
  }

  if (!best) {
    apiCache.set(key, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      value: null
    });
    return null;
  }

  const detail = await fetchJikanCharacterDetail(best.id).catch(() => null);
  const resolved = detail || best;
  apiCache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    value: resolved
  });

  return resolved;
}

function isSameCharacterReference(left, right) {
  if (!left || !right) return false;

  if (String(left.key || "") && String(right.key || "") && String(left.key) === String(right.key)) {
    return true;
  }

  if (String(left.id || "") && String(right.id || "") && String(left.id) === String(right.id)) {
    return true;
  }

  if (compact(left.name) && compact(right.name) && compact(left.name) === compact(right.name)) {
    return true;
  }

  if (compact(left.link) && compact(right.link) && compact(left.link) === compact(right.link)) {
    return true;
  }

  return false;
}

async function resolveCharacterById(id) {
  const key = `id:${String(id)}`;
  const cached = apiCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const detail = await fetchJikanCharacterDetail(id).catch(() => null);
  if (!detail) {
    apiCache.set(key, {
      expiresAt: Date.now() + DIRECT_TTL_MS,
      value: null
    });
    return null;
  }

  apiCache.set(key, {
    expiresAt: Date.now() + DIRECT_TTL_MS,
    value: detail
  });

  return detail;
}

async function fetchJikanRandomCharacter() {
  try {
    const response = await fetch("https://api.jikan.moe/v4/random/characters", {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const item = payload?.data;
    if (!item?.mal_id) {
      return null;
    }

    return {
      id: item.mal_id,
      name: item.name || "Unknown",
      anime: "Unknown",
      image: item?.images?.jpg?.image_url || item?.images?.webp?.image_url || "",
      link: item.url || `https://myanimelist.net/character/${item.mal_id}`,
      nicknames: item.nicknames || [],
      name_kanji: item.name_kanji || "",
      key: `jikan:${item.mal_id}`,
      source: "jikan"
    };
  } catch {
    return null;
  }
}

function buildQueryVariants(input) {
  const tokens = tokenize(input);
  const variants = new Set([String(input || "").trim()]);

  if (tokens.length) {
    variants.add(tokens.join(" "));
    variants.add(tokens[0]);
  }

  for (const token of tokens) {
    if (token.length >= 3) {
      variants.add(token);
    }
  }

  return Array.from(variants).filter(Boolean);
}

async function fetchJikanCharacterSearch(query, page = 1) {
  try {
    const url = `https://api.jikan.moe/v4/characters?q=${encodeURIComponent(query)}&page=${encodeURIComponent(page)}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return [];
    }

    const payload = await response.json();
    const results = Array.isArray(payload?.data) ? payload.data : [];
    return results.map((item) => ({
      id: item.mal_id,
      name: item.name,
      anime: "Unknown",
      image: item?.images?.jpg?.image_url || item?.images?.webp?.image_url || "",
      link: item.url || `https://myanimelist.net/character/${item.mal_id}`,
      nicknames: item.nicknames || [],
      name_kanji: item.name_kanji || "",
      key: `jikan:${item.mal_id}`,
      source: "jikan"
    }));
  } catch {
    return [];
  }
}

async function fetchJikanCharacterDetail(id) {
  try {
    const url = `https://api.jikan.moe/v4/characters/${encodeURIComponent(id)}/full`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const item = payload?.data;
    if (!item) return null;

    const animeEntry = Array.isArray(item.anime) ? item.anime[0] : null;
    const animeTitle = animeEntry?.anime?.title || animeEntry?.title || "Unknown";
    const image = item?.images?.jpg?.image_url || item?.images?.webp?.image_url || await fetchJikanCharacterPicture(id).catch(() => "");

    return {
      id: item.mal_id,
      name: item.name,
      anime: animeTitle,
      image,
      link: item.url || `https://myanimelist.net/character/${item.mal_id}`,
      nicknames: item.nicknames || [],
      name_kanji: item.name_kanji || "",
      key: `jikan:${item.mal_id}`,
      source: "jikan"
    };
  } catch {
    return null;
  }
}

async function fetchJikanCharacterPicture(id) {
  try {
    const url = `https://api.jikan.moe/v4/characters/${encodeURIComponent(id)}/pictures`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return "";
    }

    const payload = await response.json();
    const pictures = Array.isArray(payload?.data) ? payload.data : [];
    const first = pictures[0];
    return first?.jpg?.image_url || first?.webp?.image_url || "";
  } catch {
    return "";
  }
}

async function resolveCharacter(query) {
  const input = String(query || "").trim();
  if (!input) {
    return { source: null, character: null };
  }

  const local = searchLocalCharacter(input);
  if (local) {
    if ((local.preferApiImage || local.malId) && local.malId) {
      const remote = await resolveCharacterById(local.malId);
      if (remote) {
        return {
          source: "jikan",
          character: {
            ...local,
            ...remote,
            key: local.key || remote.key,
            source: "jikan"
          }
        };
      }
    }

    return { source: "local", character: local };
  }

  const directId = extractCharacterId(input);
  if (directId) {
    const direct = await resolveCharacterById(directId);
    if (direct) {
      return { source: "jikan", character: direct };
    }
  }

  try {
    const online = await searchJikanCharacters(input);
    if (online) {
      return { source: "jikan", character: online };
    }
  } catch {
    // fall back silently to local-only result handling
  }

  return { source: null, character: null };
}

async function getRandomApiCharacter(excludeCharacter = null) {
  for (let attempt = 0; attempt < RANDOM_API_ATTEMPTS; attempt += 1) {
    const random = await fetchJikanRandomCharacter();
    if (!random) {
      continue;
    }

    const detail = await resolveCharacterById(random.id).catch(() => null);
    const resolved = detail
      ? {
          ...random,
          ...detail,
          key: detail.key || random.key,
          source: "jikan"
        }
      : random;

    if (excludeCharacter && isSameCharacterReference(excludeCharacter, resolved)) {
      continue;
    }

    return resolved;
  }

  return null;
}

module.exports = {
  resolveCharacter,
  getRandomLocalCharacter,
  getRandomApiCharacter,
  extractCharacterId
};
