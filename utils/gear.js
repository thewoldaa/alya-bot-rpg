const { gearCatalog } = require("../config");
const { money } = require("./format");
const { clamp } = require("./random");

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function findGear(query) {
  const input = String(query || "").trim();
  if (!input) return null;
  const normalized = normalize(input);

  return gearCatalog.find((gear) =>
    normalize(gear.key) === normalized ||
    normalize(gear.name) === normalized ||
    normalize(gear.name).includes(normalized) ||
    normalized.includes(normalize(gear.key))
  ) || null;
}

function emptyEquipment() {
  return {
    weapon: null,
    armor: null,
    accessory: null
  };
}

function normalizeEquippedPiece(piece) {
  if (!piece || typeof piece !== "object") return null;
  return {
    key: String(piece.key || ""),
    name: String(piece.name || piece.key || ""),
    slot: String(piece.slot || ""),
    rarity: String(piece.rarity || "common"),
    enchant: clamp(Number(piece.enchant || 0), 0, 999),
    equippedAt: Number(piece.equippedAt || Date.now())
  };
}

function normalizeEquipment(equipment) {
  const base = emptyEquipment();
  const source = equipment && typeof equipment === "object" ? equipment : {};

  for (const slot of Object.keys(base)) {
    base[slot] = normalizeEquippedPiece(source[slot]);
  }

  return base;
}

function formatEquipment(profile) {
  const equipment = normalizeEquipment(profile?.equipment);
  const slots = Object.entries(equipment);
  if (!slots.length) return "Belum punya equipment.";

  return slots.map(([slot, piece]) => {
    if (!piece) return `- ${slot}: kosong`;
    return `- ${slot}: ${piece.name} +${piece.enchant}`;
  }).join("\n");
}

function getGearDataByKey(key) {
  return gearCatalog.find((gear) => gear.key === key) || null;
}

function getGearBonuses(profile) {
  const equipment = normalizeEquipment(profile?.equipment);
  const total = {
    moneyBonus: 0,
    xpBonus: 0,
    hungerReduction: 0,
    luckBonus: 0
  };

  for (const piece of Object.values(equipment)) {
    if (!piece) continue;
    const gear = getGearDataByKey(piece.key);
    if (!gear) continue;

    const enchant = Number(piece.enchant || 0);
    const bonus = gear.bonuses || {};

    total.moneyBonus += Number(bonus.money || 0) + (enchant * 0.01);
    total.xpBonus += Number(bonus.xp || 0) + (enchant * 0.008);
    total.hungerReduction += Number(bonus.hunger || 0) + Math.floor(enchant / 3);
    total.luckBonus += Number(bonus.luck || 0) + (enchant * 0.005);
  }

  total.hungerReduction = Math.max(0, Math.floor(total.hungerReduction));
  total.moneyBonus = clamp(total.moneyBonus, 0, 3);
  total.xpBonus = clamp(total.xpBonus, 0, 3);
  total.luckBonus = clamp(total.luckBonus, 0, 1);

  return total;
}

function formatGearList() {
  return gearCatalog.map((gear) => (
    `- **${gear.key}** (${gear.name}) [${gear.slot}] - ${money(gear.price || 0)}\n  ${gear.desc}`
  )).join("\n");
}

module.exports = {
  findGear,
  formatGearList,
  normalizeEquipment,
  emptyEquipment,
  formatEquipment,
  getGearBonuses,
  getGearDataByKey
};
