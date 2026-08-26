const SONG_SHUTTER = [
  I("終電までのホームに立つ", "syuudenmadenohomunitatsu", "막차 시간까지 승강장에 선다", "終電:しゅうでん|までのホームに|立:た|つ"),
  I("蛍光灯が少し揺れて", "keikoutougasukosiyurete", "형광등이 조금 흔들리고", "蛍光灯:けいこうとう|が|少:すこ|し|揺:ゆ|れて"),
  I("改札の向こう君が笑う", "kaisatsunemukoukimigawarau", "개찰구 너머로 네가 웃는다", "改札:かいさつ|の|向:む|こう|君:きみ|が|笑:わら|う"),
  I("今夜だけは降りないで", "konnyadakehaorinaide", "오늘 밤만은 내리지 말아 줘", "今夜:こんや|だけは|降:お|りないで"),
  I("雨に濡れたコートの裾", "ameninuretakou-tonosuso", "비에 젖은 코트의 자락", "雨:あめ|に|濡:ぬ|れたコートの|裾:すそ"),
  I("時計の針が急かすけど", "tokeinoharigasekasukedo", "시계 바늘이 재촉하지만", "時計:とけい|の|針:はり|が|急:せ|かすけど"),
  I("このままずっと走れたら", "konomamazuttohasiretara", "이대로 계속 달릴 수 있다면", "このままずっと|走:はし|れたら"),
  I("朝日が来るまで話そう", "asahigakurumadehanasou", "아침 해가 올 때까지 이야기하자", "朝日:あさひ|が|来:く|るまで|話:はな|そう"),
];

const SONG_BLUE_UMBRELLA = [
  I("青い傘をひとつ分けて", "aoikasawohitotsuwakete", "파란 우산을 하나 나눠 주고", "青:あお|い|傘:かさ|をひとつ|分:わ|けて"),
  I("水たまりを跳んでゆく", "mizutamariwohondeyuku", "물웅덩이를 뛰어 건너간다", "水:みず|たまりを|跳:は|んでゆく"),
  I("君の靴が少し濡れて", "kiminokutsugasukosinurete", "네 신발이 조금 젖어서", "君:きみ|の|靴:くつ|が|少:すこ|し|濡:ぬ|れて"),
  I("ごめんねと目が合う", "gomennetomegaau", "미안하다고 눈이 마주친다", "ごめんねと|目:め|が|合:あ|う"),
  I("信号が赤に変わる前", "singougaakanikawarumae", "신호가 빨강으로 바뀌기 전에", "信号:しんごう|が|赤:あか|に|変:か|わる|前:まえ"),
  I("横断歩道で立ち止まる", "oudanhodoudetachidomaru", "횡단보도에서 발걸음을 멈춘다", "横断歩道:おうだんほどう|で|立:た|ち|止:ど|まる"),
  I("この雨がやむころには", "konoamegayamukoroniha", "이 비가 그칠 무렵에는", "この|雨:あめ|がやむころには"),
  I("もう少し近くにいたい", "mousukosichikakuniitai", "조금만 더 가까이 있고 싶다", "もう|少:すこ|し|近:ちか|くにいたい"),
];

CATEGORIES.push({
  id: "songs",
  icon: "🎵",
  titleKo: "노래 가사",
  titleJa: "歌詞",
  kind: "picker",
  children: [
    {
      id: "song-shutter",
      icon: "🚃",
      titleKo: "막차 전",
      titleJa: "終電前",
      artist: "練習用",
      mode: "lyric",
      keepOrder: true,
      items: SONG_SHUTTER,
    },
    {
      id: "song-blue-umbrella",
      icon: "☂️",
      titleKo: "파란 우산",
      titleJa: "青い傘",
      artist: "練習用",
      mode: "lyric",
      keepOrder: true,
      items: SONG_BLUE_UMBRELLA,
    },
  ],
});
