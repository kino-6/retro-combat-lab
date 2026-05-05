# LLM Guide

このリポジトリをLLMが読む時の入口です。
まずこのファイルで責務を掴み、必要なファイルだけ開くと迷いにくくなります。

## まず読む順

1. `README.md`
   - ゲーム内容、操作、現在入っている要素。
2. `Improve2.md`
   - 次に伸ばしたい方向。キャラ画像差し替え、職業、武器、UI整理。
3. `src/gameTypes.ts`
   - 状態型と主要データ構造。まずここで `GameState` を見る。
4. `src/gameData.ts`
   - 職業、探索先、敵、箱、日替わり条件などのマスターデータ。
5. 必要な実装ファイル
   - UIなら `src/main.ts` と `src/sceneRenderer.ts`
   - 状態遷移なら `src/game.ts`
   - 戦闘計算なら `src/combat.ts`
   - 探索候補や距離なら `src/exploration.ts` / `src/route.ts`

## ファイル責務

### UI

- `src/main.ts`
  - DOM描画、ボタン、キーボード入力、フェーズ別パネル。
  - Canvasの中身はここでは描かない。
- `src/sceneRenderer.ts`
  - 中央スチル、戦闘Canvas、探索者ポートレート。
  - 細かいゲーム状態変更はしない。見た目だけ。
  - `assets/portraits/portrait-manifest.json` があれば経歴ごとの画像でポートレートを上書きする。
- `styles.css`
  - レイアウト、SFC風パネル、ピクセルアイコン。

### ゲーム状態

- `src/game.ts`
  - `GameState` の状態遷移の中心。
  - `chooseBackground`, `startExploration`, `stepCombat`, `returnToBase`, `endDay` など。
  - 現在まだ大きい。レリックやロケーション進行のような独立ルールは別ファイルへ逃がす方針。
- `src/gameTypes.ts`
  - 型定義のみ。
- `src/gameData.ts`
  - マスターデータのみ。数値調整や敵名変更はまずここ。

### ルール補助

- `src/combat.ts`
  - 命中率、期待ダメージ、ダメージロール。
- `src/exploration.ts`
  - エンカウント構築、日替わり条件、タグ、箱、初期距離。
- `src/eventMessages.ts`
  - 選択イベントのタイトル、説明、選択肢文言。
  - YAML化しやすいテーブル構造だが、現状はビルドを軽く保つためTSで管理する。
- `src/route.ts`
  - 脱出距離、夜間走行、進行距離による探索候補の変化。
- `src/siteProgress.ts`
  - ロケーション調査進行度、クリア報酬、クリア時の車両/武器/救護棚強化。
- `src/relics.ts`
  - レリック取得、レリック保有判定、候補地の先読み。
- `src/resources.ts`
  - 資源の加算、空リソース、報酬倍率、資源表示テキスト。
- `src/characterRules.ts`
  - 経歴や成長ランク由来の補正。
- `src/gameUtils.ts`
  - `roll`, `pick`, `clone`, `clamp`。

## 変更したい時の入口

- 職業を増やす
  - `src/gameTypes.ts` の `BackgroundId`
  - `src/gameData.ts` の `BACKGROUNDS`
  - `src/game.ts` の `chooseBackground`
  - `src/main.ts` の `backgroundKeys`
  - `assets/portraits/portrait-manifest.json` の画像キー

- 武器や戦闘行動を増やす
  - `src/gameTypes.ts` の `CombatAction`
  - `src/gameData.ts` の `CONFIG.combatCosts` と `combatLabels`
  - `src/combat.ts` の命中/ダメージ
  - `src/game.ts` の `canUseCombatAction`, `stepCombat`, `getCombatPreview`
  - `src/main.ts` の `combatButton`, `combatKey`

- 敵やゾンビ表現を変える
  - `src/gameData.ts` の `SITES[].enemies`
  - `src/gameData.ts` の `ENEMY_MODIFIERS`
  - `src/game.ts` の `createEnemy`, `maybeAttractEnemyByGunshot`

- 探索先候補を変える
  - `src/gameData.ts` の `SITES`
  - `src/exploration.ts`
  - `src/route.ts`

- ロケーションを漁り切った時の報酬を変える
  - `src/siteProgress.ts`

- レリックや先読みを変える
  - `src/gameData.ts` の `RELICS`
  - `src/relics.ts`

- 画面情報量を整理する
  - HTMLパネルは `src/main.ts`
  - Canvas描画は `src/sceneRenderer.ts`
  - 見た目は `styles.css`

## 設計ルール

- Canvas内に細かい文字を増やしすぎない。
- 数値判断はHTMLパネルに寄せる。
- 中央メッセージは直近の重要情報だけ。
- 主脅威はゾンビ。ただし生存者、略奪者、感染動物、環境トラブルも残す。
- リソース種類は安易に増やさない。
- 追加要素は「もう少し漁るか、帰るか」の判断につながることを優先する。

## 次の分割候補

`src/game.ts` はまだ大きい。
次に分けるなら、この順が安全です。

1. `src/eventRules.ts`
   - `createEvent`, `resolveBoxCarefulOpen`, `resolveStoryEvent`
2. `src/combatFlow.ts`
   - `enemyAct`, `winCombat`, `createEnemy`, `maybeAttractEnemyByGunshot`
3. `src/baseActions.ts`
   - `reinforceDefense`, `upgradeInfirmary`, `treatWounds`, `cookMeal`, `repairWeapon`

分割時は、先に関数を移動し、公開関数の名前と振る舞いを変えない。
その後に `npm test` の自動プレイで破綻がないか見る。
