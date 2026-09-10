function hasKanji(ja) {
  return /[\u4e00-\u9fff]/.test(ja);
}

const IME_ITEMS = [];
const imeSeen = new Set();
[DAILY_ITEMS, KEIGO_ITEMS, MAIL_ITEMS, FEELING_ITEMS].forEach((list) => {
  list.forEach((item) => {
    if (!hasKanji(item.ja) || imeSeen.has(item.ja)) return;
    imeSeen.add(item.ja);
    IME_ITEMS.push(item);
  });
});

CATEGORIES.push({
  id: "ime-live",
  icon: "✍️",
  titleKo: "실전 연습",
  titleJa: "漢字変換",
  mode: "ime",
  items: IME_ITEMS,
  highlight: true,
});
