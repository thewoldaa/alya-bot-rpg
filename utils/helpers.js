const { money, formatDate } = require("./format");
const { clamp } = require("./random");
const { characters, shopItems, houseCatalog } = require("../config");
const { formatEquipment } = require("./gear");

function findShopItem(query) {
  const input = String(query || "").trim().toLowerCase();
  if (!input) return null;
  return shopItems.find((item) => item.key === input || item.name.toLowerCase() === input) || null;
}

function resolveShopItem(query) {
  const input = String(query || "").trim().toLowerCase();
  if (!input) return null;

  if (/^\d+$/.test(input)) {
    const index = Number(input);
    if (index >= 1 && index <= shopItems.length) {
      return shopItems[index - 1];
    }
  }

  return shopItems.find((item) =>
    item.key === input ||
    item.name.toLowerCase() === input ||
    item.key.includes(input) ||
    item.name.toLowerCase().includes(input)
  ) || null;
}

function findHouse(query) {
  const input = String(query || "").trim().toLowerCase();
  if (!input) return null;
  return houseCatalog.find((item) => item.key === input || item.name.toLowerCase() === input) || null;
}

function findCharacter(query) {
  const input = String(query || "").trim().toLowerCase();
  if (!input) return null;
  if (/^\d+$/.test(input)) {
    const byId = characters.find((character) => String(character.id) === input);
    if (byId) return byId;
  }

  return characters.find((character) =>
    character.name.toLowerCase().includes(input) ||
    character.anime.toLowerCase().includes(input)
  ) || null;
}

function getInventoryMap(profile) {
  const map = new Map();
  for (const item of profile?.inventory || []) {
    map.set(item.key, Number(item.qty || 0));
  }
  return map;
}

function hasInventoryItem(profile, key, amount = 1) {
  return Number(getInventoryMap(profile).get(String(key))) >= Number(amount || 1);
}

function formatInventory(profile) {
  const items = Array.isArray(profile?.inventory) ? profile.inventory : [];
  if (!items.length) return "Kosong.";
  return items.map((item) => {
    const qty = Number(item.qty || 1);
    const enchant = item.gear?.enchant !== undefined ? ` | enchant +${Number(item.gear.enchant || 0)}` : "";
    return `- ${item.key}: x${qty}${enchant}`;
  }).join("\n");
}

function formatPartnerList(profile) {
  const partners = Array.isArray(profile?.pasangan) ? profile.pasangan : [];
  const dates = Array.isArray(profile?.tanggal_jadian) ? profile.tanggal_jadian : [];
  if (!partners.length) return "Belum punya pasangan.";
  return partners.map((partnerId, index) => {
    const date = dates[index] ? formatDate(dates[index]) : "-";
    return `- ${partnerId} | sejak ${date}`;
  }).join("\n");
}

function formatChildren(profile) {
  const children = Array.isArray(profile?.anak) ? profile.anak : [];
  if (!children.length) return "Belum punya anak.";
  return children.map((child, index) => {
    const born = child.bornAt ? formatDate(child.bornAt) : "-";
    return `${index + 1}. ${child.name || "Anak"} | ${born}`;
  }).join("\n");
}

function relationshipLabel(value) {
  const relation = Number(value || 0);
  if (relation <= -50_000) return "Bermusuhan";
  if (relation <= -1_000) return "Tegang";
  if (relation < 0) return "Kurang baik";
  if (relation < 100) return "Biasa";
  if (relation < 300) return "Akrab";
  return "Sangat dekat";
}

function clampRelationship(value) {
  return clamp(Number(value || 0), -100000, 500);
}

function canHaveMorePartners(profile, isOwner) {
  const count = Array.isArray(profile?.pasangan) ? profile.pasangan.length : 0;
  return count < (isOwner ? 4 : 1);
}

function hasHouse(profile) {
  return Boolean(profile?.rumah);
}

module.exports = {
  findShopItem,
  resolveShopItem,
  findHouse,
  findCharacter,
  formatInventory,
  formatPartnerList,
  formatChildren,
  formatEquipment,
  relationshipLabel,
  clampRelationship,
  canHaveMorePartners,
  hasHouse,
  getInventoryMap,
  hasInventoryItem
};
