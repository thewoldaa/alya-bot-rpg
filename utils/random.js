function randInt(min, max) {
  const low = Math.ceil(min);
  const high = Math.floor(max);
  return Math.floor(Math.random() * (high - low + 1)) + low;
}

function pickOne(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function chance(percent) {
  return Math.random() * 100 < percent;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function uid(prefix = "") {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`.toUpperCase();
}

module.exports = {
  randInt,
  pickOne,
  chance,
  clamp,
  uid
};
