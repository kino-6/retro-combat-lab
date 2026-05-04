import type {
  Background,
  BoxType,
  CombatAction,
  DailyCondition,
  EnemyModifier,
  ExplorationSite,
  GrowthChoice,
  Relic,
  SiteTag
} from './gameTypes.js';

export const CONFIG = {
  maxDay: 12,
  escapeDistance: 260,
  maxDistance: 5,
  minDistance: 0,
  journalLimit: 12,
  combatLogLimit: 10,
  dayTime: 10,
  nightFoodCost: 2,
  nightMoralePressure: 4,
  staminaRegenPerTurn: 2,
  retreatHpLoss: 6,
  weaponRepairAmount: 8,
  fieldPatchMaterialCost: 2,
  fieldPatchTimeCost: 1,
  travelTimeCost: 2,
  travelFoodCost: 1,
  travelFuelCost: 1,
  nightDriveFuelCost: 1,
  visibleSiteChoices: 3,
  checkpointGateKm: 180,
  finalGateKm: 250,
  blockadeAssaultTimeCost: 2,
  checkpointDetourTimeCost: 3,
  checkpointDetourFuelCost: 2,
  checkpointDetourMoraleCost: 6,
  checkpointBreachMaterialCost: 4,
  combatCosts: {
    attack: 3,
    heavy: 6,
    shoot: 4,
    shotgun: 5,
    grenade: 4,
    throwStone: 2,
    guard: 2,
    stepBack: 2,
    rest: 0
  } satisfies Record<CombatAction, number>
};

export const BACKGROUNDS: Background[] = [
  {
    id: 'guard',
    name: '元警備員',
    description: '殴り合いと恐怖に少し慣れている。',
    perk: '最大HP+6、攻撃+1、初期士気+3'
  },
  {
    id: 'mechanic',
    name: '整備士',
    description: '壊れた道具をまだ使える形に戻せる。',
    perk: '初期資材+3、弾薬+2、グレネード+1、車体+1、資材系コスト-1、射撃+'
  },
  {
    id: 'medic',
    name: '野外救護員',
    description: '手当ての優先順位を間違えない。',
    perk: '初期薬品+2、救護棚+1、知性+1、治療量+4'
  },
  {
    id: 'courier',
    name: '元配達員',
    description: '崩れた道でも、使える抜け道を覚えている。',
    perk: '初期燃料+3、最大STA+2、初期時間+1、幸運+1、野外技術+1'
  },
  {
    id: 'hunter',
    name: '元猟師',
    description: '音を立てずに待ち、遠くの輪郭を読む。',
    perk: '攻撃+1、知性+1、幸運+1、弾薬+3、初期士気+2、銃器運用+1'
  },
  {
    id: 'teacher',
    name: '元教師',
    description: '紙片、標識、声の断片から意味を拾える。',
    perk: '知性+2、幸運+1、初期士気+2、薬品+1、イベント判断と予測に強い'
  }
];

export const SITES: ExplorationSite[] = [
  {
    id: 'store',
    name: '廃店舗',
    description: '倒れた棚、缶詰、見通しの悪いバックヤード。',
    danger: 2,
    timeCost: 2,
    distanceRange: [0, 2],
    rewardHint: '食料++ / 資材+ / 弾薬少',
    rewardMultiplier: 1.18,
    rareChance: 0.2,
    rareHint: '封の残った保存箱',
    reward: { food: 5, materials: 2, medicine: 0, ammo: 1, grenades: 0, fuel: 0 },
    enemies: [
      { id: 'feral', name: '棚裏のゾンビ', hp: 24, attack: 5, behavior: 'stalker' },
      { id: 'raider', name: '飢えた略奪者', hp: 18, attack: 6, behavior: 'skittish' }
    ]
  },
  {
    id: 'clinic',
    name: '廃診療所',
    description: '薬品ロッカーと、音を吸い込む静かな処置室。',
    danger: 3,
    timeCost: 3,
    distanceRange: [2, 3],
    rewardHint: '薬品++ / 食料+',
    rewardMultiplier: 1.45,
    rareChance: 0.38,
    rareHint: '抗生剤・上等な薬品',
    reward: { food: 1, materials: 1, medicine: 3, ammo: 0, grenades: 0, fuel: 0 },
    enemies: [
      { id: 'patient', name: '患者ゾンビ', hp: 28, attack: 6, behavior: 'stalker' },
      { id: 'orderly', name: '巨体の看護ゾンビ', hp: 34, attack: 7, behavior: 'brute' }
    ]
  },
  {
    id: 'road',
    name: '草に沈む道路',
    description: '放置車両とスクラップ。開けているが隠れ場は少ない。',
    danger: 1,
    timeCost: 2,
    distanceRange: [4, 5],
    rewardHint: '資材++ / 弾薬+ / 燃料+ / 低危険',
    rewardMultiplier: 1,
    rareChance: 0.1,
    rareHint: '工具箱',
    reward: { food: 1, materials: 5, medicine: 0, ammo: 2, grenades: 0, fuel: 2 },
    enemies: [
      { id: 'drifter', name: '腹を空かせた放浪者', hp: 20, attack: 4, behavior: 'skittish' },
      { id: 'crawler', name: '側溝の這うもの', hp: 26, attack: 5, behavior: 'stalker' }
    ]
  },
  {
    id: 'gas',
    name: '干上がった給油所',
    description: '地下タンク、割れたレジ、燃料の匂い。車を進めるには寄りたい。',
    danger: 2,
    timeCost: 2,
    distanceRange: [2, 4],
    rewardHint: '燃料++ / 資材+ / 弾薬少',
    rewardMultiplier: 1.12,
    rareChance: 0.22,
    rareHint: '使える携行缶',
    reward: { food: 1, materials: 2, medicine: 0, ammo: 1, grenades: 0, fuel: 5 },
    enemies: [
      { id: 'siphoner', name: '燃料抜きの男', hp: 24, attack: 5, behavior: 'skittish' },
      { id: 'pumpThing', name: '給油機そばの死者', hp: 30, attack: 6, behavior: 'stalker' }
    ]
  },
  {
    id: 'checkpoint',
    name: '封鎖検問',
    description: '土嚢、放置された弾薬箱、古いバリケード。見返りは大きい。',
    danger: 4,
    timeCost: 3,
    distanceRange: [1, 3],
    rewardHint: '弾薬++ / グレネード / 資材+ / 燃料少',
    rewardMultiplier: 1.65,
    rareChance: 0.42,
    rareHint: '未開封の弾薬箱',
    reward: { food: 0, materials: 3, medicine: 1, ammo: 4, grenades: 1, fuel: 1 },
    enemies: [
      { id: 'sentinel', name: '装備ゾンビ', hp: 34, attack: 8, behavior: 'brute' },
      { id: 'rifleman', name: '弾帯の略奪者', hp: 28, attack: 8, behavior: 'stalker' }
    ]
  }
];

export const combatLabels: Record<CombatAction, string> = {
  attack: '攻撃',
  heavy: '強攻撃',
  shoot: 'ハンドガン',
  shotgun: 'ショットガン',
  grenade: 'グレネード',
  throwStone: '投石',
  guard: 'ガード',
  stepBack: '後退',
  rest: '息を整える'
};

export const GROWTH_CHOICES: GrowthChoice[] = [
  {
    id: 'melee',
    name: '近接訓練',
    description: 'バールの間合い、踏み込み、倒し切りを磨く。',
    effect: '攻撃+1、最大HP+2。近接命中と近接ダメージが少し伸びる。'
  },
  {
    id: 'firearms',
    name: '銃器運用',
    description: '少ない弾を当てるための構えと射線を覚える。',
    effect: '知性+1、弾薬+1。銃撃命中と銃撃ダメージが少し伸びる。'
  },
  {
    id: 'fieldcraft',
    name: '野外技術',
    description: '危険の匂い、退路、荷物のまとめ方がうまくなる。',
    effect: '最大STA+1、士気+3。探索遭遇率が少し下がる。'
  }
];

export const RELICS: Relic[] = [
  {
    id: 'roadAtlas',
    name: '赤線だらけの道路地図',
    description: '数手先の候補地が見える。運転時に抜け道を拾いやすい。'
  },
  {
    id: 'triageManual',
    name: '血で汚れた救護手順書',
    description: '治療と探索中の応急手当が少し強くなる。'
  },
  {
    id: 'luckyBolt',
    name: '青く焼けたラグナット',
    description: '希少発見率が少し上がる。'
  },
  {
    id: 'ammoGauge',
    name: '真鍮の弾薬ゲージ',
    description: '銃器の見積もりが安定し、弾薬を見つけやすくなる。'
  }
];

export const DAILY_CONDITIONS: DailyCondition[] = [
  {
    id: 'clear',
    name: '澄んだ朝',
    description: '遠くまで見える。危険も報酬も読みやすい。',
    rewardScale: {},
    dangerShift: 0,
    rareBonus: 0,
    encounterShift: -0.03,
    timeShift: 0
  },
  {
    id: 'fog',
    name: '濃霧',
    description: '見通しは悪いが、普段見逃す物資に気づける。',
    rewardScale: {},
    dangerShift: 1,
    rareBonus: 0.12,
    encounterShift: 0.08,
    timeShift: 0
  },
  {
    id: 'rain',
    name: '冷たい雨',
    description: '足場が悪く時間を食う。道路のスクラップは拾いやすい。',
    siteId: 'road',
    rewardScale: { materials: 1.35, ammo: 1.15 },
    dangerShift: 0,
    rareBonus: 0.03,
    encounterShift: -0.02,
    timeShift: 1
  },
  {
    id: 'raiders',
    name: '略奪者の噂',
    description: '廃店舗に人影が集まる。食料は多いが衝突しやすい。',
    siteId: 'store',
    rewardScale: { food: 1.45, ammo: 1.15 },
    dangerShift: 1,
    rareBonus: 0.05,
    encounterShift: 0.12,
    timeShift: 0
  },
  {
    id: 'quiet',
    name: '不自然な静けさ',
    description: '廃診療所が静まり返る。薬品の匂いだけが残っている。',
    siteId: 'clinic',
    rewardScale: { medicine: 1.45 },
    dangerShift: -1,
    rareBonus: 0.08,
    encounterShift: -0.08,
    timeShift: 0
  }
];

export const SITE_TAGS: SiteTag[] = [
  {
    id: 'locked',
    name: '施錠区画',
    description: '開けるには手間がかかるが、まとまった物資が残っている。',
    rewardScale: { materials: 1.2, medicine: 1.15, ammo: 1.15 },
    dangerShift: 0,
    rareBonus: 0.08,
    encounterShift: -0.02,
    timeShift: 1,
    distanceShift: 0
  },
  {
    id: 'burned',
    name: '火災跡',
    description: '食料は焼けたが、金属片と薬品棚の残骸が拾える。',
    rewardScale: { food: 0.65, materials: 1.35, medicine: 1.15 },
    dangerShift: 0,
    rareBonus: 0.02,
    encounterShift: -0.04,
    timeShift: 0,
    distanceShift: 0
  },
  {
    id: 'freshTracks',
    name: '足跡多数',
    description: '最近の足跡が多い。危険だが、誰かの荷物も残っている。',
    rewardScale: { food: 1.1, materials: 1.1, ammo: 1.2 },
    dangerShift: 1,
    rareBonus: 0.1,
    encounterShift: 0.12,
    timeShift: 0,
    distanceShift: -1
  },
  {
    id: 'shortcut',
    name: '近道発見',
    description: '崩れた塀の抜け道を使える。早いが、出会い頭になりやすい。',
    rewardScale: {},
    dangerShift: 0,
    rareBonus: 0,
    encounterShift: 0.04,
    timeShift: -1,
    distanceShift: -1
  },
  {
    id: 'openGround',
    name: '開けた視界',
    description: '遠くから気配を掴める。銃撃と撤退判断が活きる。',
    allowedSites: ['road'],
    rewardScale: {},
    dangerShift: -1,
    rareBonus: 0,
    encounterShift: -0.06,
    timeShift: 0,
    distanceShift: 1
  },
  {
    id: 'tightAlleys',
    name: '狭い路地',
    description: '遮蔽物だらけで物資は隠れているが、接敵距離が近い。',
    allowedSites: ['store', 'clinic'],
    rewardScale: { food: 1.1, medicine: 1.1 },
    dangerShift: 1,
    rareBonus: 0.06,
    encounterShift: 0.08,
    timeShift: 0,
    distanceShift: -1
  }
];

export const BOX_TYPES: BoxType[] = [
  {
    id: 'foodCrate',
    name: '保存食コンテナ',
    description: '缶詰と乾パンが詰まっている。重いが価値は明快だ。',
    allowedSites: ['store', 'road'],
    rewardScale: { food: 1.8, materials: 0.6, medicine: 0.4 },
    safeScale: 0.4,
    toolsScale: 0.8,
    boldScale: 1.05,
    toolsCost: 1,
    boldWeaponDamage: 1,
    rareOnBold: false,
    specialLabel: '中身を選別',
    specialDetail: '食料を多めに確保し、士気も少し回復。STA-2。'
  },
  {
    id: 'medCase',
    name: '医療ケース',
    description: '中身は壊れやすい。丁寧に開けるほど薬品を守れる。',
    allowedSites: ['clinic', 'store'],
    rewardScale: { food: 0.4, materials: 0.5, medicine: 2 },
    safeScale: 0.5,
    toolsScale: 0.95,
    boldScale: 0.8,
    toolsCost: 1,
    boldWeaponDamage: 2,
    rareOnBold: true,
    specialLabel: '滅菌して回収',
    specialDetail: '薬品を丁寧に確保。救護員なら追加回復。STA-2。'
  },
  {
    id: 'ammoCan',
    name: '弾薬缶',
    description: '錆びた留め具の奥に、使える弾や古い破片手榴弾が残っているかもしれない。',
    allowedSites: ['road', 'store', 'checkpoint'],
    rewardScale: { food: 0.3, materials: 0.7, ammo: 2, grenades: 1.5 },
    safeScale: 0.35,
    toolsScale: 0.75,
    boldScale: 1,
    toolsCost: 1,
    boldWeaponDamage: 2,
    rareOnBold: true,
    specialLabel: '弾を選別',
    specialDetail: '使える弾薬を多めに確保。銃器運用でさらに+。STA-2。'
  },
  {
    id: 'toolLocker',
    name: '工具ロッカー',
    description: '資材と補修具が期待できる。こじ開ければ武器は傷む。',
    allowedSites: ['road', 'clinic'],
    rewardScale: { materials: 1.8, ammo: 0.8, medicine: 0.5 },
    safeScale: 0.45,
    toolsScale: 0.85,
    boldScale: 1.1,
    toolsCost: 1,
    boldWeaponDamage: 3,
    rareOnBold: false,
    specialLabel: '蝶番を外す',
    specialDetail: '資材を多めに確保。整備士なら武器状態も回復。STA-2。'
  },
  {
    id: 'survivorStash',
    name: '生存者の隠し箱',
    description: '中身は読めない。時間をかけるほど、取りこぼしが減る。',
    rewardScale: { food: 1.15, materials: 1.15, medicine: 1.15, ammo: 1.15 },
    safeScale: 0.55,
    toolsScale: 0.9,
    boldScale: 1.2,
    toolsCost: 2,
    boldWeaponDamage: 2,
    rareOnBold: true,
    specialLabel: '痕跡を読む',
    specialDetail: 'バランスよく回収し、希少発見も狙う。知性が高いほど有効。'
  }
];

export const ENEMY_MODIFIERS: EnemyModifier[] = [
  {
    id: 'none',
    name: '',
    description: '通常個体。',
    hpScale: 1,
    attackShift: 0,
    ammoDrop: 0,
    distanceShift: 0
  },
  {
    id: 'wounded',
    name: '負傷した',
    description: 'HPは低いが、血の匂いで興奮している。',
    hpScale: 0.72,
    attackShift: 1,
    ammoDrop: 0,
    distanceShift: 0
  },
  {
    id: 'armed',
    name: '武装した',
    description: '危険だが、倒せば弾薬を拾える可能性がある。',
    hpScale: 1.08,
    attackShift: 2,
    ammoDrop: 1,
    distanceShift: 0
  },
  {
    id: 'frenzied',
    name: '興奮した',
    description: '距離を詰めやすく、攻撃も重い。',
    hpScale: 1,
    attackShift: 2,
    behavior: 'brute',
    ammoDrop: 0,
    distanceShift: -1
  },
  {
    id: 'lurker',
    name: '潜んでいた',
    description: '出会い頭になりやすいが、体力は低め。',
    hpScale: 0.9,
    attackShift: 0,
    behavior: 'stalker',
    ammoDrop: 0,
    distanceShift: -1
  }
];
