import type { BoxType, EventKind, EventState, ExplorationSite, SiteId } from './gameTypes.js';
import { pick } from './gameUtils.js';

const storyTitles: Record<EventKind, string> = {
  box: '物資箱',
  road: '詰まった道',
  signal: '無線のノイズ',
  vehicle: '避難車の異音',
  survivor: '生存者の痕跡'
};

const storyDescriptions: Record<EventKind, string[]> = {
  box: [''],
  road: [
    '放置車両が道をふさいでいる。荷台には使える物がありそうだ。',
    '草に埋もれた脇道がある。足跡は新しい。'
  ],
  signal: [
    '車載無線に途切れた声が混じる。',
    '検問所の無線機が短い符号を吐いた。'
  ],
  vehicle: [
    '避難車の床下から嫌な金属音がした。',
    '燃料の匂いが少し濃い。'
  ],
  survivor: [
    'ドアに新しい爪痕と、子どもの字のメモがある。',
    '棚の裏に、小さな備蓄と短い謝罪文が隠されている。'
  ]
};

const siteVignettes: Record<SiteId, string[]> = {
  store: [
    '非常灯の赤だけが点滅している。',
    '奥の倉庫から缶が転がる音がした。'
  ],
  clinic: [
    '処置室のカーテンが揺れている。',
    '割れた端末に最後の患者名簿が残る。'
  ],
  road: [
    '横転した配送車の荷台が半開きだ。',
    '道路脇の標識に新しい布切れが結ばれている。'
  ],
  gas: [
    '給油機の下に新しい油染みがある。',
    '割れた事務所から携行缶の音がした。'
  ],
  checkpoint: [
    '土嚢の間に薬莢が散っている。',
    '検問所の無線機が砂嵐のような音を吐いた。'
  ]
};

export function createBoxEvent(site: ExplorationSite, box: BoxType, rng: () => number): EventState {
  const scene = pick(siteVignettes[site.id], rng);
  const toolsDetail = `${box.toolsCost > 0 ? `資材${box.toolsCost}。` : ''}${box.carefulLabel}: ${box.carefulDetail}`;
  return {
    kind: 'box',
    siteId: site.id,
    boxId: box.id,
    title: `${site.name}の${box.name}`,
    description: `${scene} ${box.description}`,
    choices: [
      { id: 'safe', label: '静かに少し取る', detail: '少量。STA-1。脅威なし。' },
      { id: 'tools', label: '開錠を試みる', detail: toolsDetail },
      { id: 'bold', label: 'こじ開ける', detail: `多め${box.rareOnBold ? '、希少あり' : ''}。武器-${box.boldWeaponDamage}、脅威+1。` }
    ]
  };
}

export function createStoryEvent(site: ExplorationSite, rng: () => number): EventState {
  const kind = pick(storyEventKinds(site.id), rng);
  return {
    kind,
    siteId: site.id,
    title: `${site.name} / ${storyTitles[kind]}`,
    description: pick(storyDescriptions[kind], rng),
    choices: storyEventChoices(kind)
  };
}

function storyEventKinds(siteId: SiteId): EventKind[] {
  if (siteId === 'road') return ['road', 'vehicle', 'survivor'];
  if (siteId === 'gas') return ['vehicle', 'road', 'signal'];
  if (siteId === 'checkpoint') return ['signal', 'survivor', 'road'];
  if (siteId === 'clinic') return ['survivor', 'signal', 'vehicle'];
  return ['survivor', 'road', 'signal'];
}

function storyEventChoices(kind: EventKind): EventState['choices'] {
  if (kind === 'road') {
    return [
      { id: 'safe', label: '遠巻きに確認', detail: 'STA-1。少量の資材。' },
      { id: 'tools', label: '車列を動かす', detail: '資材1。進行と資材。' },
      { id: 'bold', label: '荷台まで踏み込む', detail: '報酬多め。時間-1h、脅威+1。' }
    ];
  }
  if (kind === 'signal') {
    return [
      { id: 'safe', label: '短く聞く', detail: '士気+2。' },
      { id: 'tools', label: 'アンテナを直す', detail: '資材1。候補更新。' },
      { id: 'bold', label: 'こちらから呼ぶ', detail: '士気と希少発見。脅威+2。' }
    ];
  }
  if (kind === 'vehicle') {
    return [
      { id: 'safe', label: '音を聞く', detail: '時間-1h。士気+1。' },
      { id: 'tools', label: 'その場で補修', detail: '資材1。車を守る。' },
      { id: 'bold', label: '押して走る', detail: '進行。車体に負担。' }
    ];
  }
  return [
    { id: 'safe', label: '印だけ残す', detail: '士気+2。' },
    { id: 'tools', label: '食料を分ける', detail: '食料1。薬品や情報。' },
    { id: 'bold', label: '備蓄を持ち出す', detail: '物資多め。士気-3、脅威+1。' }
  ];
}
