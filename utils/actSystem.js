const { infoEmbed, successEmbed, errorEmbed } = require("./embeds");
const { randInt, chance, pickOne } = require("./random");
const { clampRelationship } = require("./helpers");
const { formatDate } = require("./format");
const { getRuntime } = require("./state");

const ACT_COOLDOWN_MS = 5 * 60 * 1000;

const mealSuccessTexts = [
  "Kalian makan bersama dengan bahagia 🍜",
  "Suasana meja makan hangat dan penuh tawa ✨",
  "Keluarga kalian menikmati hidangan dengan nyaman 🍱",
  "Makan malam berjalan manis dan bikin hati adem 💖",
  "Kalian saling suap makanan dan jadi makin dekat 😋",
  "Acara makan keluarga berlangsung seru dan menyenangkan 🥘",
  "Pasanganmu senang karena kamu ngajak makan bersama 🥢",
  "Kalian makan tanpa drama, suasana jadi lembut 🌷",
  "Hidangan habis, hati pun ikut hangat 🍲",
  "Makan bareng selesai dengan senyum yang lebar 😊"
];

const mealFailTexts = [
  "Makanan gosong dan suasana jadi canggung 😵",
  "Pasangan marah karena kamu telat datang 😠",
  "Menu berantakan, mood ikut turun 📉",
  "Rencana makan keluarga gagal total karena salah pesan 😭",
  "Kamu salah ngomong, suasana meja langsung hening 🥶",
  "Makan bareng berakhir ribut kecil karena hal sepele 💥",
  "Pasanganmu kesal karena makanan tidak sesuai selera 🙄",
  "Semua jadi awkward karena kamu lupa bawa uang 😬",
  "Piring jatuh, suasana langsung chaos 💢",
  "Makan keluarga gagal dan semua orang jadi bad mood 😞"
];

const sleepSuccessTexts = [
  "Kalian menghabiskan malam bersama ❤️",
  "Tidur bersama bikin hubungan kalian makin erat 🌙",
  "Malam yang tenang bikin kalian makin dekat 💫",
  "Kalian tertidur damai dan bangun dengan senyum 🌌",
  "Pelukan hangat sebelum tidur bikin suasana manis 🤍",
  "Malam itu terasa lembut dan penuh kenyamanan 🛏️",
  "Kalian tidur nyenyak dan mood pagi jadi bagus ☀️",
  "Rumah jadi hangat saat kalian tidur bersama 🕯️",
  "Istirahat bareng bikin hubungan naik signifikan 💞",
  "Malam romantis yang bikin hati tenang dan nyaman 🌷"
];

const sleepFailTexts = [
  "Anak masuk kamar dan bikin rencana tidur gagal 😭",
  "Diganggu tetangga, akhirnya kalian batal tidur bareng 🫠",
  "Suasana jadi canggung dan semuanya batal dilakukan 🙈",
  "Kalian malah debat kecil sebelum sempat tidur 😬",
  "Tidur tidak jadi karena keadaan lagi tidak mendukung 🌧️",
  "Salah paham bikin malam itu terasa hambar 😐",
  "Kalian capek, tapi akhirnya tidak ada yang terjadi 😴",
  "Pasanganmu tiba-tiba bad mood dan menjauh sedikit 😞",
  "Momen intim gagal karena ada gangguan mendadak 🚪",
  "Niatnya romantis, ujungnya cuma jadi tidur biasa 😓"
];

const cheatSuccessTexts = [
  "Kamu berhasil selingkuh tanpa ketahuan 😈",
  "Aksimu licin dan pasangan tidak curiga sedikit pun 🕶️",
  "Kamu lolos dari pantauan dan dapat keuntungan besar 💸",
  "Langkahmu mulus dan semuanya berjalan diam-diam 🪤",
  "Kamu sukses main belakang tanpa ketahuan siapa pun 😏",
  "Rencanamu rapi dan dompetmu jadi makin tebal 🤑",
  "Kamu benar-benar licin dan tidak meninggalkan jejak 👣",
  "Kamu selamat dari kecurigaan dan kantong ikut naik 📈",
  "Aksi nakalmu sukses besar, tapi risikonya tetap tinggi 🎭",
  "Kamu berhasil bermain api dan masih aman sementara 🔥"
];

const cheatFailTexts = [
  "Ketahuan pasangan 💀",
  "Langsung hampir putus karena aksimu terbongkar 😱",
  "Pasanganmu marah besar dan suasana hancur total 💥",
  "Kamu salah langkah, semua rahasia kebuka 😵‍💫",
  "Aksimu terbaca dan hubungan jatuh sangat drastis 📉",
  "Kamu gagal menutup jejak dan keadaan jadi kacau 😬",
  "Pasanganmu sadar dan langsung meledak emosi 😡",
  "Rencanamu gagal total dan kamu kena semprot habis-habisan 🧨",
  "Ketahuan di momen terburuk dan semuanya jadi runyam 🚨",
  "Kamu gagal total dan hampir tidak tersisa apa-apa 💔"
];

const bonusTexts = [
  "🎁 Kamu dapat uang bonus dari suasana hati yang bagus.",
  "💸 Ada biaya tambahan yang harus kamu keluarkan.",
  "🥰 Pasanganmu lagi happy, mood naik sedikit.",
  "😡 Pasanganmu bad mood dan suasana jadi dingin.",
  "👶 Ada kejutan kecil yang bisa jadi anak baru.",
  "🍀 Kamu dapat bonus keberuntungan dan suasana jadi cerah.",
  "📉 Kamu kehilangan sedikit uang karena situasi tak terduga.",
  "✨ Interaksi ini terasa lebih hangat dari biasanya.",
  "🔥 Ada percikan emosi yang bikin hasilnya makin liar.",
  "🌙 Malam ini terasa lebih intim dan tenang."
];

function normalizeChoice(choice) {
  return String(choice || "").toLowerCase().trim();
}

function formatCooldown(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} menit ${seconds} detik`;
}

function getRuntimeMap() {
  const runtime = getRuntime();
  if (!runtime.pendingActSessions) {
    runtime.pendingActSessions = new Map();
  }
  return runtime.pendingActSessions;
}

function clearActSession(coreId) {
  const map = getRuntimeMap();
  return map.delete(String(coreId));
}

function getClaimByTarget(db, profile, targetClaimKey = null, slotIndex = 0) {
  const claims = db.getCharacterClaimsByCore(profile.core_id);
  if (targetClaimKey) {
    return claims.find((claim) => String(claim.key) === String(targetClaimKey)) || null;
  }
  return claims[slotIndex] || null;
}

function buildActPromptEmbed(profile, targetClaim, slotIndex, showSlot = false) {
  const targetName = targetClaim?.character?.name || "Pasangan";
  const lines = [
    `${profile.username || "Player"}`,
    "",
    `Target: **${targetName}**`
  ];

  if (showSlot) {
    lines.push(`Slot: **${slotIndex + 1}**`);
  }

  lines.push(
    "",
    "1. 🍽 Ajak Makan Sekeluarga",
    "2. 🛏 Tidur Bersama (18+ implied)",
    "3. 💔 Selingkuh",
    "",
    "Balas dengan angka: **1 / 2 / 3**"
  );

  return infoEmbed(
    "💭 Action 💭",
    lines.join("\n")
  );
}

async function setActCooldown(profile, db) {
  const now = Date.now();
  await db.updateCore(profile.core_id, (core) => {
    core.lastAct = now;
    core.cooldownAct = now + ACT_COOLDOWN_MS;
    core.total_anak = Array.isArray(core.anak) ? core.anak.length : 0;
    core.mood_pasangan = String(core.mood_pasangan || "normal");
    return core;
  });
}

async function addChildIfNeeded({ profile, db, targetClaim, roll }) {
  if (roll > 30) return null;

  const childName = `Anak-${Date.now().toString(36).toUpperCase()}`;
  await db.updateCore(profile.core_id, (core) => {
    core.anak = Array.isArray(core.anak) ? core.anak : [];
    core.anak.push({
      name: childName,
      bornAt: Date.now(),
      from: targetClaim?.character?.name || "Unknown"
    });
    core.total_anak = core.anak.length;
    return core;
  });

  return childName;
}

async function maybeBreakup({ profile, db, targetClaim }) {
  const refreshed = db.getCore(profile.core_id);
  if (!refreshed) return false;

  if (Number(refreshed.hubungan || 0) > -500) {
    return false;
  }

  await db.releaseCharacterClaim(targetClaim.key);
  await db.updateCore(profile.core_id, (core) => {
    core.mood_pasangan = "putus";
    core.cooldownAct = Date.now() + ACT_COOLDOWN_MS;
    return core;
  });

  return true;
}

async function processActChoice({ choice, profile, db, targetClaim, slotIndex = 0, showSlot = false }) {
  const normalized = normalizeChoice(choice);
  if (!profile) {
    return { ok: false, embed: errorEmbed("Akun Belum Siap", "Kamu belum terdaftar.") };
  }

  const cooldownRemaining = Math.max(0, Number(profile.cooldownAct || 0) - Date.now());
  if (cooldownRemaining > 0) {
    return {
      ok: false,
      embed: errorEmbed("Cooldown Aktif", `Kamu masih cooldown selama **${formatCooldown(cooldownRemaining)}**.`)
    };
  }

  if (!targetClaim) {
    return {
      ok: false,
      embed: errorEmbed("Tidak Ada Pasangan", "Kamu belum punya pasangan/character yang bisa diajak act.")
    };
  }

  const now = Date.now();
  const targetName = targetClaim.character?.name || "Pasangan";
  let title = "Action";
  let body = "";
  let success = false;
  let childName = null;

  if (normalized === "1" || normalized.includes("makan")) {
    title = "🍽 Ajak Makan Sekeluarga";
    success = chance(80);
    const relationDelta = success ? randInt(10, 30) : -5;
    const moodDelta = success ? randInt(5, 20) : -10;
    const moneyDelta = success ? -randInt(150, 650) : 0;

    await setActCooldown(profile, db);
    await db.updateCore(profile.core_id, (core) => {
      core.hubungan = clampRelationship((core.hubungan || 0) + relationDelta);
      core.mood_pasangan = success ? pickOne(["bahagia", "kenyang", "hangat", "ceria"]) : pickOne(["kesal", "cemberut", "dingin"]);
      core.uang = Math.max(0, Number(core.uang || 0) + moneyDelta);
      return core;
    });

    await db.updateCharacterClaim(targetClaim.key, (claim) => {
      claim.hunger = success ? Math.max(0, Math.min(100, Number(claim.hunger || 0) + randInt(10, 25))) : Math.max(0, Number(claim.hunger || 0) - 5);
      claim.mood = success ? pickOne(["kenyang", "bahagia", "hangat"]) : pickOne(["lapar", "kesal"]);
      return claim;
    });

    const extra = chance(12) ? pickOne(bonusTexts) : null;
    body = [
      success ? pickOne(mealSuccessTexts) : pickOne(mealFailTexts),
      `Hubungan ${success ? "+" : ""}${relationDelta}`,
      `Mood ${success ? "+" : ""}${moodDelta}`,
      moneyDelta !== 0 ? `Uang ${moneyDelta < 0 ? "-" : "+"}${Math.abs(moneyDelta)}` : null,
      extra
    ].filter(Boolean).join("\n");
  } else if (normalized === "2" || normalized.includes("tidur")) {
    title = "🛏 Tidur Bersama";
    success = chance(60);
    const relationDelta = success ? randInt(20, 50) : -10;
    const moodDelta = success ? 20 : -10;

    await setActCooldown(profile, db);
    await db.updateCore(profile.core_id, (core) => {
      core.hubungan = clampRelationship((core.hubungan || 0) + relationDelta);
      core.mood_pasangan = success ? pickOne(["bahagia", "damai", "nyaman", "hangat"]) : pickOne(["capek", "kesal", "tidak fokus"]);
      return core;
    });

    await db.updateCharacterClaim(targetClaim.key, (claim) => {
      claim.hunger = success ? Math.max(0, Math.min(100, Number(claim.hunger || 0) + randInt(5, 15))) : Math.max(0, Number(claim.hunger || 0) - 5);
      claim.mood = success ? pickOne(["bahagia", "nyaman", "hangat"]) : pickOne(["capek", "kesal"]);
      return claim;
    });

    if (success && chance(30)) {
      childName = await addChildIfNeeded({ profile, db, targetClaim, roll: randInt(1, 100) });
    }

    const extra = chance(12) ? pickOne(bonusTexts) : null;
    body = [
      success ? pickOne(sleepSuccessTexts) : pickOne(sleepFailTexts),
      `Hubungan ${success ? "+" : ""}${relationDelta}`,
      `Mood ${success ? "+" : ""}${moodDelta}`,
      childName ? `👶 Anak baru lahir: **${childName}**` : null,
      extra
    ].filter(Boolean).join("\n");
  } else if (normalized === "3" || normalized.includes("selingkuh")) {
    title = "💔 Selingkuh";
    success = chance(30);
    const relationDelta = success ? -randInt(30, 80) : -100;
    const moodValue = success ? pickOne(["gelisah", "bingung", "nakal"]) : pickOne(["marah besar", "hancur", "sakit hati"]);
    const moneyDelta = success ? randInt(1500, 7000) : 0;

    await setActCooldown(profile, db);
    await db.updateCore(profile.core_id, (core) => {
      core.hubungan = clampRelationship((core.hubungan || 0) + relationDelta);
      core.mood_pasangan = moodValue;
      core.uang = Math.max(0, Number(core.uang || 0) + moneyDelta);
      return core;
    });

    await db.updateCharacterClaim(targetClaim.key, (claim) => {
      claim.mood = success ? pickOne(["gelisah", "curiga", "dingin"]) : pickOne(["marah", "sedih", "hancur"]);
      claim.hunger = Math.max(0, Number(claim.hunger || 0) - randInt(0, 5));
      return claim;
    });

    const extra = chance(12) ? pickOne(bonusTexts) : null;
    body = [
      success ? pickOne(cheatSuccessTexts) : pickOne(cheatFailTexts),
      `Hubungan ${relationDelta}`,
      moneyDelta > 0 ? `Uang +${moneyDelta}` : null,
      extra
    ].filter(Boolean).join("\n");
  } else {
    return {
      ok: false,
      embed: errorEmbed("Pilihan Tidak Dikenal", "Gunakan angka **1**, **2**, atau **3**.")
    };
  }

  const brokeUp = await maybeBreakup({ profile, db, targetClaim });
  const refreshedCore = db.getCore(profile.core_id);
  const topTitle = brokeUp ? "💔 Pasangan Putus" : title;
  const finalBody = brokeUp
    ? `${body}\n\nPasanganmu meninggalkanmu...`
    : `${body}\n\nTarget: **${targetName}**${showSlot ? `\nSlot: **${slotIndex + 1}**` : ""}`;

  return {
    ok: true,
    brokeUp,
    embed: success ? successEmbed(topTitle, finalBody) : errorEmbed(topTitle, finalBody),
    core: refreshedCore,
    targetClaim: brokeUp ? null : (db.getCharacterClaim(targetClaim.key) || targetClaim),
    childName
  };
}

async function startActPrompt({ channel, profile, userId, db, targetClaim, slotIndex = 0, showSlot = false }) {
  const cooldownRemaining = Math.max(0, Number(profile.cooldownAct || 0) - Date.now());
  if (cooldownRemaining > 0) {
    return {
      ok: false,
      embed: errorEmbed("Cooldown Aktif", `Kamu masih cooldown selama **${formatCooldown(cooldownRemaining)}**.`)
    };
  }

  if (!targetClaim) {
    return {
      ok: false,
      embed: errorEmbed("Tidak Ada Pasangan", "Kamu belum punya pasangan/character untuk diajak act.")
    };
  }

  const prompt = await channel.send({
    embeds: [buildActPromptEmbed(profile, targetClaim, slotIndex, showSlot)]
  });

  const map = getRuntimeMap();
  map.set(String(profile.core_id), {
    promptMessageId: prompt.id,
    channelId: channel.id,
    userId: String(userId || ""),
    targetClaimKey: targetClaim.key,
    slotIndex,
    showSlot: Boolean(showSlot),
    createdAt: Date.now()
  });

  return {
    ok: true,
    prompt
  };
}

async function consumeActReply({ message, profile, db }) {
  const map = getRuntimeMap();
  const session = map.get(String(profile.core_id));
  if (!session) return null;
  if (String(message.channel.id) !== String(session.channelId)) return null;
  if (session.userId && String(message.author.id) !== String(session.userId)) return null;

  const choice = normalizeChoice(message.content);
  if (!["1", "2", "3", "makan", "tidur", "selingkuh"].includes(choice)) {
    return null;
  }

  const claim = getClaimByTarget(db, profile, session.targetClaimKey, session.slotIndex);
  if (!claim) {
    map.delete(String(profile.core_id));
    await message.reply({
      embeds: [errorEmbed("Pasangan Tidak Ditemukan", "Target act kamu sudah tidak tersedia.")]
    }).catch(() => {});
    return { handled: true };
  }

  map.delete(String(profile.core_id));
  const result = await processActChoice({
    choice,
    profile,
    db,
    targetClaim: claim,
    slotIndex: session.slotIndex,
    showSlot: Boolean(session.showSlot)
  });

  await message.reply({
    embeds: [result.embed]
  }).catch(() => {});

  return {
    handled: true,
    result
  };
}

module.exports = {
  ACT_COOLDOWN_MS,
  normalizeChoice,
  getClaimByTarget,
  buildActPromptEmbed,
  startActPrompt,
  processActChoice,
  consumeActReply,
  clearActSession
};
