const fs = require("fs");
const path = require("path");
const { stockCatalog, ownerIds, ownerName, defaultUserLimit, hungerMax } = require("../config");
const { uid, clamp } = require("./random");
const { emptyEquipment, normalizeEquipment } = require("./gear");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function parseJson(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return clone(fallback);
  }

  if (typeof value === "object") {
    return clone(value);
  }

  try {
    return JSON.parse(value);
  } catch {
    return clone(fallback);
  }
}

function defaultCore({ coreId, username, linkedAccount, limit }) {
  return {
    core_id: coreId,
    username,
    level: 1,
    xp: 0,
    uang: 0,
    limit,
    inventory: [],
    registered: true,
    hunger: hungerMax,
    job: null,
    last_work_at: 0,
    last_meal_at: 0,
    equipment: emptyEquipment(),
    pasangan: [],
    tanggal_jadian: [],
    anak: [],
    rumah: null,
    hubungan: 0,
    mood: "normal",
    portfolio: {},
    afk: { active: false, reason: "", since: 0 },
    lastAct: 0,
    cooldownAct: 0,
    mood_pasangan: "normal",
    total_anak: 0,
    spam: { blocked_until: 0 },
    theme: "default",
    mood_history: [],
    expeditions: [],
    linked_accounts: [linkedAccount],
    updated_at: Date.now()
  };
}

function normalizeJob(job) {
  if (!job || typeof job !== "object") return null;
  return {
    key: String(job.key || ""),
    name: String(job.name || job.key || "Job"),
    salaryMin: Number(job.salaryMin || 0),
    salaryMax: Number(job.salaryMax || 0),
    xpMin: Number(job.xpMin || 0),
    xpMax: Number(job.xpMax || 0),
    hungerCost: Number(job.hungerCost || 0),
    desc: String(job.desc || ""),
    selectedAt: Number(job.selectedAt || Date.now())
  };
}

function normalizeStock(stock, fallbackPrice = 0, basePrice = fallbackPrice) {
  if (!stock || typeof stock !== "object") return null;

  const price = Math.max(1, Number(stock.price || fallbackPrice || 1));
  const previousPrice = Math.max(1, Number(stock.previousPrice || price));
  const normalizedBasePrice = Math.max(1, Number(stock.basePrice || basePrice || price));
  const rawHistory = Array.isArray(stock.history) ? stock.history : [];
  const history = rawHistory
    .map((entry) => Math.max(1, Number(entry || price)))
    .filter((entry) => Number.isFinite(entry) && entry > 0);

  const mergedHistory = history.length ? history : [previousPrice, price];
  const minHealthyPrice = Math.max(1, Math.round(normalizedBasePrice * 0.25));
  const maxHealthyPrice = Math.max(minHealthyPrice, Math.round(normalizedBasePrice * 4));
  const repairedPrice = price < minHealthyPrice || price > maxHealthyPrice
    ? normalizedBasePrice
    : price;
  const repairedPreviousPrice = previousPrice < minHealthyPrice || previousPrice > maxHealthyPrice
    ? repairedPrice
    : previousPrice;

  return {
    symbol: String(stock.symbol || ""),
    name: String(stock.name || stock.symbol || "Stock"),
    basePrice: normalizedBasePrice,
    price: repairedPrice,
    previousPrice: repairedPreviousPrice,
    lastChange: Number(stock.lastChange || 0),
    lastUpdated: Number(stock.lastUpdated || Date.now()),
    history: mergedHistory
  };
}

function normalizeCore(core) {
  if (!core || typeof core !== "object") return core;

  // Infinite money for Owners
  const isOwner = ownerIds.includes(String(core.linked_accounts?.[0])) || core.username?.toLowerCase() === "craftkal";
  if (isOwner) {
    core.uang = 999999999999;
  }

  core.inventory = Array.isArray(core.inventory) ? core.inventory : [];
  core.registered = Boolean(core.registered ?? true);
  core.hunger = Number.isFinite(Number(core.hunger)) ? Math.max(0, Number(core.hunger)) : hungerMax;
  core.job = normalizeJob(core.job);
  core.last_work_at = Number(core.last_work_at || 0);
  core.last_meal_at = Number(core.last_meal_at || 0);
  core.equipment = normalizeEquipment(core.equipment);
  core.pasangan = Array.isArray(core.pasangan) ? core.pasangan : [];
  core.tanggal_jadian = Array.isArray(core.tanggal_jadian) ? core.tanggal_jadian : [];
  core.anak = Array.isArray(core.anak) ? core.anak : [];
  core.rumah = core.rumah || null;
  core.hubungan = Number(core.hubungan || 0);
  core.mood = String(core.mood || "normal");
  core.portfolio = core.portfolio && typeof core.portfolio === "object" ? core.portfolio : {};
  core.afk = {
    active: Boolean(core.afk?.active),
    reason: String(core.afk?.reason || ""),
    since: Number(core.afk?.since || 0)
  };
  core.lastAct = Number(core.lastAct || 0);
  core.cooldownAct = Number(core.cooldownAct || 0);
  core.mood_pasangan = String(core.mood_pasangan || "normal");
  core.total_anak = Number(core.total_anak || (Array.isArray(core.anak) ? core.anak.length : 0));
  core.spam = {
    blocked_until: Number(core.spam?.blocked_until || 0)
  };
  core.theme = String(core.theme || "default");
  core.mood_history = Array.isArray(core.mood_history) ? core.mood_history : [];
  core.expeditions = Array.isArray(core.expeditions) ? core.expeditions : [];
  core.jail_until = Number(core.jail_until || 0);
  core.bank = Number(core.bank || 0);
  core.last_daily_at = Number(core.last_daily_at || 0);
  core.guild = core.guild || null;
  core.total_sedekah = Number(core.total_sedekah || 0);
  return core;
}

function normalizeCharacterClaim(claim) {
  if (!claim || typeof claim !== "object") return null;

  const key = String(claim.key || "").trim();
  if (!key) return null;

  return {
    key,
    character: claim.character && typeof claim.character === "object"
      ? {
          id: claim.character.id ?? null,
          name: String(claim.character.name || "Unknown"),
          anime: String(claim.character.anime || "Unknown"),
          image: String(claim.character.image || ""),
          link: String(claim.character.link || ""),
          source: String(claim.character.source || "local")
        }
      : null,
    core_id: String(claim.core_id || ""),
    discord_id: String(claim.discord_id || ""),
    username: String(claim.username || ""),
    pp: String(claim.pp || ""),
    hunger: Number.isFinite(Number(claim.hunger)) ? clamp(Number(claim.hunger), 0, 100) : 100,
    uang: Math.max(0, Number(claim.uang || 0)),
    bond: Math.max(0, Number(claim.bond || 0)),
    mood: String(claim.mood || "normal"),
    claimed_at: Number(claim.claimed_at || Date.now()),
    updated_at: Number(claim.updated_at || Date.now())
  };
}

class Database {
  constructor(filePath) {
    this.filePath = filePath;
    this.state = {
      users: {},
      cores: {},
      characterClaims: {},
      guildSettings: {},
      redeemCodes: {},
      stocks: {},
      market: [],
      guilds: {},
      soundboard: {},
      meta: {
        version: 1,
        createdAt: Date.now()
      }
    };
    this.writeQueue = Promise.resolve();
    this.initialized = false;
  }

  async init() {
    await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });

    if (fs.existsSync(this.filePath)) {
      try {
        const raw = await fs.promises.readFile(this.filePath, "utf8");
        this.state = Object.assign(this.state, parseJson(raw, this.state));
      } catch (error) {
        console.error("Gagal membaca database, memakai state kosong:", error);
      }
    }

    this.seedDefaults();
    this.migrateCores();
    this.migrateStocks();
    this.migrateCharacterClaims();
    await this.persist();
    this.initialized = true;
  }

  migrateCores() {
    for (const [coreId, core] of Object.entries(this.state.cores)) {
      this.state.cores[coreId] = normalizeCore(core);
    }
  }

  migrateCharacterClaims() {
    const next = {};
    for (const [key, claim] of Object.entries(this.state.characterClaims || {})) {
      const normalized = normalizeCharacterClaim({ key, ...claim });
      if (normalized) {
        next[normalized.key] = normalized;
      }
    }
    this.state.characterClaims = next;
  }

  migrateStocks() {
    const next = {};
    for (const [symbol, stock] of Object.entries(this.state.stocks || {})) {
      const catalogEntry = stockCatalog.find((item) => String(item.symbol) === String(symbol));
      const basePrice = catalogEntry?.price || stock?.price || 1;
      const normalized = normalizeStock({ symbol, ...stock, basePrice }, basePrice, basePrice);
      if (normalized) {
        next[normalized.symbol] = normalized;
      }
    }
    this.state.stocks = next;
  }

  seedDefaults() {
    for (const stock of stockCatalog) {
      if (!this.state.stocks[stock.symbol]) {
        this.state.stocks[stock.symbol] = {
          symbol: stock.symbol,
          name: stock.name,
          basePrice: stock.price,
          price: stock.price,
          previousPrice: stock.price,
          lastChange: 0,
          lastUpdated: Date.now(),
          history: [stock.price]
        };
      } else {
        this.state.stocks[stock.symbol] = normalizeStock(this.state.stocks[stock.symbol], stock.price, stock.price);
      }
    }
  }

  async persist() {
    const payload = JSON.stringify(this.state, null, 2);
    this.writeQueue = this.writeQueue
      .then(async () => {
        const tempPath = `${this.filePath}.tmp`;
        await fs.promises.writeFile(tempPath, payload, "utf8");
        await fs.promises.rename(tempPath, this.filePath);
      })
      .catch((error) => {
        console.error("Gagal menulis database:", error);
      });

    return this.writeQueue;
  }

  getUser(discordId) {
    return this.state.users[String(discordId)] || null;
  }

  getCore(coreId) {
    const core = this.state.cores[String(coreId)];
    return core ? clone(core) : null;
  }

  getAllCores() {
    return Object.values(this.state.cores).map((core) => clone(normalizeCore(core)));
  }

  getCoreByDiscordId(discordId) {
    const user = this.getUser(discordId);
    if (!user) return null;
    return this.getCore(user.core_id);
  }



  getGuildSettings(guildId) {
    const id = String(guildId || "global");
    if (!this.state.guildSettings[id]) {
      this.state.guildSettings[id] = {
        guild_id: id,
        chat_channel_id: null,
        user_limit: 10,
        last_market_alert_at: 0,
        lockdown_active: false,
        audit_logs: [],
        created_at: Date.now(),
        updated_at: Date.now()
      };
    }
    return clone(this.state.guildSettings[id]);
  }

  async setGuildSettings(guildId, patch) {
    const id = String(guildId || "global");
    const current = this.getGuildSettings(id);
    this.state.guildSettings[id] = {
      ...current,
      ...patch,
      guild_id: id,
      updated_at: Date.now()
    };
    await this.persist();
    return clone(this.state.guildSettings[id]);
  }

  async resetGuildSettings(guildId) {
    const id = String(guildId || "global");
    delete this.state.guildSettings[id];
    await this.persist();
  }

  async addAuditLog(guildId, logEntry) {
    const id = String(guildId || "global");
    const current = this.getGuildSettings(id);
    current.audit_logs = Array.isArray(current.audit_logs) ? current.audit_logs : [];
    current.audit_logs.unshift({ ...logEntry, timestamp: Date.now() });
    
    // Keep only last 50 logs
    if (current.audit_logs.length > 50) {
      current.audit_logs = current.audit_logs.slice(0, 50);
    }
    
    return this.setGuildSettings(id, { audit_logs: current.audit_logs });
  }

  buildDefaultCore(discordId, username, limit) {
    const coreId = uid("core_");
    return defaultCore({
      coreId,
      username,
      linkedAccount: String(discordId),
      limit
    });
  }

  buildOwnerCore(ownerId) {
    const coreId = `owner_${ownerId}`;
    return defaultCore({
      coreId,
      username: ownerName,
      linkedAccount: String(ownerId),
      limit: defaultUserLimit
    });
  }

  ensureOwnerCore(ownerId) {
    const id = String(ownerId);
    const coreId = `owner_${id}`;

    if (!this.state.cores[coreId]) {
      this.state.cores[coreId] = clone(normalizeCore(this.buildOwnerCore(id)));
    }

    if (!this.state.users[id]) {
      this.state.users[id] = {
        discord_id: id,
        core_id: coreId,
        username: ownerName,
        linked_at: Date.now()
      };
    }

    return clone(normalizeCore(this.state.cores[coreId]));
  }

  async registerUser({ discordId, username, limit }) {
    let core = this.getCoreByDiscordId(discordId);
    if (core) {
      return clone(core);
    }

    core = normalizeCore(this.buildDefaultCore(discordId, username, limit));
    this.state.cores[core.core_id] = clone(core);
    this.state.users[String(discordId)] = {
      discord_id: String(discordId),
      core_id: core.core_id,
      username,
      linked_at: Date.now()
    };
    await this.persist();
    return clone(core);
  }

  async updateCore(coreId, updater) {
    const current = this.state.cores[String(coreId)];
    if (!current) return null;

    const draft = clone(normalizeCore(current));
    const result = await updater(draft) || draft;
    normalizeCore(result);
    result.updated_at = Date.now();
    this.state.cores[String(coreId)] = clone(normalizeCore(result));
    await this.persist();
    return clone(normalizeCore(result));
  }

  async setCore(coreId, data) {
    this.state.cores[String(coreId)] = clone(normalizeCore({
      ...data,
      updated_at: Date.now()
    }));
    await this.persist();
    return clone(this.state.cores[String(coreId)]);
  }

  getCharacterClaim(key) {
    const claim = this.state.characterClaims[String(key)];
    return claim ? clone(claim) : null;
  }

  getCharacterClaims() {
    return Object.values(this.state.characterClaims).map((claim) => clone(claim));
  }

  getCharacterClaimsByCore(coreId) {
    return this.getCharacterClaims()
      .filter((claim) => String(claim.core_id) === String(coreId))
      .sort((a, b) => Number(a.claimed_at || 0) - Number(b.claimed_at || 0));
  }

  async claimCharacter({ key, character, coreId, discordId, username }) {
    const claimKey = String(key || "").trim();
    if (!claimKey) return null;

    const existing = this.state.characterClaims[claimKey];
    if (existing) {
      if (String(existing.core_id) === String(coreId)) {
        return {
          status: "owned",
      claim: clone(existing)
        };
      }

      return {
        status: "taken",
        claim: clone(existing)
      };
    }

    const claim = normalizeCharacterClaim({
      key: claimKey,
      character,
      core_id: coreId,
      discord_id: discordId,
      username,
      pp: "",
      hunger: 100,
      uang: 0,
      bond: 0,
      mood: "normal",
      claimed_at: Date.now(),
      updated_at: Date.now()
    });

    if (!claim) return null;

    this.state.characterClaims[claimKey] = clone(claim);
    await this.persist();
    return {
      status: "claimed",
      claim: clone(claim)
    };
  }

  async updateCharacterClaim(key, updater) {
    const claimKey = String(key || "").trim();
    const current = this.state.characterClaims[claimKey];
    if (!current) return null;

    const draft = clone(normalizeCharacterClaim({ key: claimKey, ...current }));
    const result = await updater(draft) || draft;
    const normalized = normalizeCharacterClaim({ key: claimKey, ...result, updated_at: Date.now() });
    if (!normalized) return null;

    this.state.characterClaims[claimKey] = clone(normalized);
    await this.persist();
    return clone(normalized);
  }

  async feedCharacterClaim(key, amount = 20) {
    return this.updateCharacterClaim(key, (claim) => {
      claim.hunger = clamp(Number(claim.hunger || 0) + Number(amount || 0), 0, 100);
      claim.mood = "kenyang";
      return claim;
    });
  }

  async addCharacterClaimMoney(key, amount = 0) {
    return this.updateCharacterClaim(key, (claim) => {
      claim.uang = Math.max(0, Number(claim.uang || 0) + Number(amount || 0));
      claim.mood = "senang";
      return claim;
    });
  }

  async bondCharacterClaim(key, amount = 1) {
    return this.updateCharacterClaim(key, (claim) => {
      claim.bond = Math.max(0, Number(claim.bond || 0) + Number(amount || 0));
      claim.mood = "dekat";
      return claim;
    });
  }

  async releaseCharacterClaim(key) {
    const claimKey = String(key || "").trim();
    if (!claimKey || !this.state.characterClaims[claimKey]) return null;
    const removed = clone(this.state.characterClaims[claimKey]);
    delete this.state.characterClaims[claimKey];
    await this.persist();
    return removed;
  }

  async setCharacterClaimPhoto(key, url) {
    return this.updateCharacterClaim(key, (claim) => {
      claim.pp = String(url || "").trim();
      return claim;
    });
  }

  async addMoney(coreId, amount) {
    return this.updateCore(coreId, (core) => {
      core.uang = Math.max(0, Number(core.uang || 0) + Number(amount || 0));
      return core;
    });
  }

  async transferMoney(sourceCoreId, targetCoreId, amount) {
    const source = this.state.cores[String(sourceCoreId)];
    const target = this.state.cores[String(targetCoreId)];
    const value = Number(amount || 0);

    if (!source || !target || value <= 0) return null;
    if (Number(source.uang || 0) < value) return null;

    source.uang = Math.max(0, Number(source.uang || 0) - value);
    target.uang = Number(target.uang || 0) + value;
    source.updated_at = Date.now();
    target.updated_at = Date.now();

    await this.persist();
    return {
      source: clone(source),
      target: clone(target)
    };
  }

  async addXp(coreId, xp) {
    return this.updateCore(coreId, (core) => {
      core.xp = Number(core.xp || 0) + Number(xp || 0);
      while (core.xp >= this.getXpNeed(core.level)) {
        core.xp -= this.getXpNeed(core.level);
        core.level += 1;
      }
      return core;
    });
  }

  getXpNeed(level) {
    return 100 + ((Number(level || 1) - 1) * 50);
  }

  async addInventoryItem(coreId, itemKey, amount = 1) {
    return this.updateCore(coreId, (core) => {
      const key = String(itemKey);
      const quantity = Math.max(1, Number(amount || 1));
      const current = Array.isArray(core.inventory) ? core.inventory : [];
      const found = current.find((item) => item.key === key);
      if (found) {
        found.qty += quantity;
      } else {
        current.push({ key, qty: quantity });
      }
      core.inventory = current;
      return core;
    });
  }

  async removeInventoryItem(coreId, itemKey, amount = 1) {
    return this.updateCore(coreId, (core) => {
      const key = String(itemKey);
      const quantity = Math.max(1, Number(amount || 1));
      const current = Array.isArray(core.inventory) ? core.inventory : [];
      const found = current.find((item) => item.key === key);
      if (!found || found.qty < quantity) {
        return core;
      }

      found.qty -= quantity;
      core.inventory = current.filter((item) => item.qty > 0);
      return core;
    });
  }

  async setAfk(coreId, afkState) {
    return this.updateCore(coreId, (core) => {
      core.afk = {
        active: Boolean(afkState?.active),
        reason: String(afkState?.reason || ""),
        since: Number(afkState?.since || 0)
      };
      return core;
    });
  }

  async setPortfolio(coreId, portfolio) {
    return this.updateCore(coreId, (core) => {
      core.portfolio = clone(portfolio || {});
      return core;
    });
  }

  async addPartnerPair(coreIdA, coreIdB, joinedAt = Date.now()) {
    const a = this.state.cores[String(coreIdA)];
    const b = this.state.cores[String(coreIdB)];
    if (!a || !b) return null;

    a.pasangan = Array.isArray(a.pasangan) ? a.pasangan : [];
    a.tanggal_jadian = Array.isArray(a.tanggal_jadian) ? a.tanggal_jadian : [];
    b.pasangan = Array.isArray(b.pasangan) ? b.pasangan : [];
    b.tanggal_jadian = Array.isArray(b.tanggal_jadian) ? b.tanggal_jadian : [];

    if (!a.pasangan.includes(String(coreIdB))) {
      a.pasangan.push(String(coreIdB));
      a.tanggal_jadian.push(joinedAt);
    }
    if (!b.pasangan.includes(String(coreIdA))) {
      b.pasangan.push(String(coreIdA));
      b.tanggal_jadian.push(joinedAt);
    }

    a.hubungan = clamp(Number(a.hubungan || 0) + 25, -100000, 500);
    b.hubungan = clamp(Number(b.hubungan || 0) + 25, -100000, 500);
    a.mood = "bahagia";
    b.mood = "bahagia";
    a.updated_at = Date.now();
    b.updated_at = Date.now();
    await this.persist();
    return {
      a: clone(a),
      b: clone(b)
    };
  }

  async createRedeemCode(reward, preferredCode = null) {
    const code = preferredCode ? String(preferredCode).trim() : uid("rd_");
    if (!code) {
      throw new Error("Kode redeem tidak boleh kosong.");
    }
    if (this.state.redeemCodes[code]) {
      throw new Error("Kode redeem sudah dipakai.");
    }
    this.state.redeemCodes[code] = {
      code,
      reward: clone(reward),
      claimedBy: null,
      createdAt: Date.now()
    };
    await this.persist();
    return clone(this.state.redeemCodes[code]);
  }

  getRedeemCode(code) {
    const row = this.state.redeemCodes[String(code)];
    return row ? clone(row) : null;
  }

  async claimRedeemCode(code, discordId) {
    const row = this.state.redeemCodes[String(code)];
    if (!row || row.claimedBy) return null;
    row.claimedBy = String(discordId);
    row.claimedAt = Date.now();
    await this.persist();
    return clone(row);
  }

  getStock(symbol) {
    const row = this.state.stocks[String(symbol)];
    return row ? clone(row) : null;
  }

  getStocks() {
    return Object.values(this.state.stocks).map((stock) => clone(normalizeStock(stock, stock?.price || 1, stock?.basePrice || stock?.price || 1)));
  }

  async updateStocks(updater) {
    const draft = clone(this.state.stocks);
    const result = await updater(draft) || draft;
    const next = {};
    for (const [symbol, stock] of Object.entries(result || {})) {
      const normalized = normalizeStock({ symbol, ...stock }, stock?.price || 1, stock?.basePrice || stock?.price || 1);
      if (normalized) {
        next[normalized.symbol] = normalized;
      }
    }
    this.state.stocks = next;
    await this.persist();
    return this.getStocks();
  }

  getMarketListings() {
    return clone(this.state.market || []);
  }

  async addMarketListing({ sellerCoreId, sellerName, itemKey, qty, price }) {
    const listingId = uid("mkt_");
    const listing = {
      id: listingId,
      sellerCoreId,
      sellerName,
      itemKey,
      qty,
      price,
      createdAt: Date.now()
    };

    this.state.market = this.state.market || [];
    this.state.market.push(listing);
    await this.persist();
    return listing;
  }

  async removeMarketListing(listingId) {
    const initialLength = (this.state.market || []).length;
    this.state.market = (this.state.market || []).filter((l) => l.id !== listingId);
    if (this.state.market.length !== initialLength) {
      await this.persist();
      return true;
    }
    return false;
  }

  getMarketListing(listingId) {
    return (this.state.market || []).find((l) => l.id === listingId) || null;
  }
}

module.exports = Database;
