const sleepState = new Map();

const responses = {
  sapaan: [
    "hai",
    "halo",
    "hai juga! 😆",
    "halo halo... ada apa nih manggil-manggil? hmmm"
  ],
  ajakan: [
    "ih ayo! kemana? aku ikut 😆",
    "ayo ayo! jajan ya tapi? hehe",
    "main apa nih? seru ga?"
  ],
  perintah_makan: [
    "aku mau jajan aja boleh ga? 🥺",
    "makan apa? jangan sayur ya!",
    "nyam nyam... tapi temenin ya"
  ],
  perintah_belajar: [
    "ih males belajar... mending main aja deh 😜",
    "belajar apa sih? pusing tau",
    "nanti aja deh belajarnya, sekarang waktunya santai~"
  ],
  sayur: [
    "gaaa mau 😖 aku ga suka sayur",
    "ih apaan sih, sayur kan ga enak...",
    "males ah, mending jajan cokelat"
  ],
  pertanyaan: [
    "hmm kenapa ya? aku juga bingung...",
    "apa sih? jangan bikin pusing deh",
    "gimana ya... rahasia dong! hwhw"
  ]
};

function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getAlyaResponse(userId, text) {
  const content = text.toLowerCase();

  // Special logic: Sayur
  if (content.includes("sayur")) {
    return getRandom(responses.sayur);
  }

  // Intent: Perintah Tidur (Special Logic)
  if (content.includes("tidur")) {
    const count = (sleepState.get(userId) || 0) + 1;
    if (count === 1) {
      sleepState.set(userId, count);
      return "ih males ah... belum ngantuk tauu 😴";
    } else {
      sleepState.delete(userId);
      return "yaudah iya... bentar lagi aku tidur ya, tapi temenin 🥺";
    }
  }

  // Intent: Sapaan
  if (content.includes("hai") || content.includes("halo") || content.includes("pagi") || content.includes("siang") || content.includes("malam")) {
    return getRandom(responses.sapaan);
  }

  // Intent: Ajakan
  if (content.includes("ayo") || content.includes("jalan") || content.includes("main")) {
    return getRandom(responses.ajakan);
  }

  // Intent: Perintah Makan
  if (content.includes("makan")) {
    return getRandom(responses.perintah_makan);
  }

  // Intent: Perintah Belajar
  if (content.includes("belajar")) {
    return getRandom(responses.perintah_belajar);
  }

  // Intent: Pertanyaan Umum
  if (content.includes("kenapa") || content.includes("apa") || content.includes("gimana")) {
    return getRandom(responses.pertanyaan);
  }

  // Fallback
  return "hmm maksud kamu apa sih? aku agak ga ngerti deh";
}

module.exports = {
  getAlyaResponse
};
