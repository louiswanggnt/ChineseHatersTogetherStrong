# WORD WARRIOR（射擊版 v0.2）

<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

---

## 給接手此專案的 Agent

- **請先完整閱讀本 README**，再開始規劃或修改。
- **每次新增／實作功能後**，請在此更新「開發進度說明」與相關章節，維持本檔案為專案總索引。
- 本檔案目的：讓新 Agent 能依此快速掌握目錄、遊戲設計、玩法、操作與當前功能狀態。

---

## 一、其他文件指引

| 文件 | 路徑 | 說明 |
|------|------|------|
| 圖片與角色動畫 | [public/sprites/SPRITES_README.md](public/sprites/SPRITES_README.md) | 主角／怪物圖檔命名、資料夾結構、sprite sheet 規格 |
| 型別定義 | [types.ts](types.ts) | 題型、Gunner、敵人、遊戲狀態等 TypeScript 型別 |
| 遊戲常數 | [constants.ts](constants.ts) | 畫布尺寸、難度參數、Phaser 座標、升級與敵人相關常數 |

---

## 二、遊戲設計摘要

### 2.1 遊戲模式

- **植物大戰僵屍式 (PVZ)**：橫向雙軌道，Gunner 放在網格格子上，敵人從右側出現沿軌道前進。
- **中央塔防式 (CENTRAL)**：主角在畫面中央，左右兩側各有 6 格（2×3）放置 Gunner，敵人從左右兩側朝向主角前進。

### 2.2 遊戲階段 (GamePhase)

- `START`：主選單，選擇 PVZ 或 CENTRAL。
- `BATTLE`：上為 Phaser 戰鬥區（1440×480），下為答題區；同屏進行。
- `GAMEOVER`：主角 HP 歸零時顯示，可返回主選單。

### 2.3 戰鬥區版面（BATTLE 時）

- **左欄（玩家參數區）**：LV、HP 條、EXP 條（往下次升級的擊殺進度）。
- **中欄**：Phaser 畫布，比例 1440:480，內含主角、Gunner、敵人、子彈。
- **右欄（參照／操作區）**：暫停按鈕、SCORE/WAVE、NEXT（下一隻 Gunner 的 ATK/SPD/PEN 預覽）。

### 2.4 Roguelite 升級系統

- **觸發**：累計擊殺數達 10, 20, 30, 50, 80, 130, 210...（Fibonacci 序列）時觸發一次升級。
- **行為**：暫停遊戲，彈出三選一升級選單；選完後 LV+1、關閉選單、繼續遊戲。
- **選項來源**：[data/upgradeOptions.ts](data/upgradeOptions.ts)，包含：隨機三隻 ATK/SPD/PEN 加成、全體 ATK/SPD/PEN、額外一發機率、雷電／火／爆炸子彈機率等。
- **狀態**：`gameStore` 的 `gunnerBonuses`（單體）、`globalGunnerBonuses`（全體）與 `level`、`lastUpgradeKillMilestone`；EXP 條由 [data/upgradeMilestones.ts](data/upgradeMilestones.ts) 的 `getNextUpgradeMilestone` 計算進度。

### 2.5 敵人類別

- 定義於 [data/enemyTypes.ts](data/enemyTypes.ts)。
- **5 種**：normal、bomb、doom、small_boss、big_boss；各有顏色、HP/速度/尺寸/攻擊倍率與 `ATK_TYPE`（`SUSTAINED` 持續攻擊 / `ONE_SHOT` 一次性攻擊）。
- **出現規則**：累計題數為 10 的倍數時出現 small_boss；24 的倍數時出現 big_boss；bomb/doom 基礎機率各 5%，累計題數每 5 的倍數時各加 0.5%。

### 2.6 子彈特效（Roguelite 加成)

- **雷電子彈**：擊中時對最近一隻額外敵人造成子彈攻擊力 20% 傷害。
- **火子彈**：擊中時附加燃燒狀態（疊層最多 5，每秒 10×層數傷害）。
- **爆炸子彈**：擊中時範圍內敵人受到子彈攻擊力 50% 額外傷害（半徑見 `constants.EXPLOSION_RADIUS`）。

---

## 三、目錄結構（源碼與資料）

```
├── App.tsx                 # 根元件：主選單、BATTLE 三欄版面、GAMEOVER、升級/暫停/放置 Modal
├── index.html
├── constants.ts            # 遊戲常數（畫布、難度、Phaser 格線、升級/敵人參數）
├── types.ts                # 題型、Gunner、敵人、GameState 等型別
├── components/             # React UI 元件
│   ├── QuestionPhase.tsx       # 答題流程：抽題、計時、評分、送出/生成、底欄選項
│   ├── CircleQuestionUI.tsx    # 現代/古典圈選題（主詞、重點 或 主/動/虛）
│   ├── ConjunctionQuestionUI.tsx  # 連接詞填空
│   ├── TitleMatchQuestionUI.tsx   # 標題配對（sentence–title）
│   ├── ReadingQuestionUI.tsx      # 閱讀測驗（左文章、右問題與 A/B/C）
│   ├── CorrectAnswerOverlay.tsx    # 答題後正確答案與所得顯示
│   ├── UpgradeModal.tsx           # 擊殺里程碑三選一升級彈窗
│   ├── GunnerPlacement.tsx        # 生成 Gunner 後選擇放置位置（網格或 slot）
│   └── RollingNumber.tsx          # 數字翻動動畫（NEXT 三圍）
├── stores/
│   └── gameStore.ts        # Zustand 全域狀態：phase、gunners、累積三圍、擊殺/升級里程碑、升級選項等
├── hooks/
│   └── usePhaserGame.ts    # Phaser 實例、addGunnerAtCell/addGunnerAtSlot、enemyKilled、升級觸發、暫停/恢復
├── services/
│   ├── questionService.ts  # 抽題、閱讀組題、CIRCLE_MODERN 字串答案正規化
│   ├── gunnerService.ts    # 累積三圍 → Gunner 數值、generateGunnerId
│   ├── sentenceService.ts  # 舊版句子分析（若仍被引用）
│   ├── conjunctionSynonyms.ts    # 連接詞同義詞
│   └── statsService.ts     # 題目統計（updateQuestionStats）
├── data/
│   ├── upgradeMilestones.ts   # 升級擊殺里程碑序列、getNextUpgradeMilestone
│   ├── upgradeOptions.ts      # 三選一升級選項定義與 apply 邏輯
│   ├── enemyTypes.ts          # 敵人類別與出現規則（getEnemyTypeForSpawn）
│   ├── conjunctionSynonymGroups.json
│   └── questions/             # 題庫 JSON
│       ├── modern.json        # CIRCLE_MODERN（主詞/重點，支援字串或索引答案）
│       ├── classical.json     # CIRCLE_CLASSICAL
│       ├── conjunction.json   # FILL_CONJUNCTION
│       ├── titleMatch.json    # TITLE_MATCH（一題多組 sentence–title，出題時抽 3 組不同 title）
│       └── reading.json       # 閱讀測驗文章與子題（每篇多子題，每次抽 3 題連續出）
├── phaser/                  # Phaser 3 遊戲邏輯
│   ├── config.ts            # 畫布 1440×480、Scale.FIT
│   ├── scenes/
│   │   ├── PreloadScene.ts
│   │   ├── GameScenePvZ.ts      # PVZ 模式場景、波次、碰撞
│   │   └── GameSceneCentral.ts  # 中央模式場景、slot 位置、碰撞
│   ├── entities/
│   │   ├── Gunner.ts / GunnerCentral.ts
│   │   ├── Bullet.ts / BulletCentral.ts   # 子彈類型：normal/lightning/fire/explosion
│   │   └── Enemy.ts / EnemyCentral.ts     # 燃燒狀態、takeDamage
│   └── managers/
│       ├── WaveManager.ts
│       └── WaveManagerCentral.ts
└── public/
    └── sprites/            # 見 SPRITES_README.md
        ├── hero/
        └── enemies/
```

---

## 四、玩法與流程

1. **主選單**：選擇「植物大戰僵屍」或「中央塔防式」後進入 BATTLE。
2. **戰鬥區**：敵人依波次與題數生成；Gunner 自動射擊，子彈可穿透、觸發雷電/火/爆炸；主角被敵人接觸會扣 HP，歸零則 GAMEOVER。
3. **答題區**：上方為題目與計時條，下方為選項（依題型為圈選工具、連接詞輸入、標題配對或 A/B/C）。答題可累積 ATK/SPD/PEN。
4. **送出／生成**：  
   - **送出**：結算當前題目分數、累積三圍，並換下一題。  
   - **生成**：當累積三圍任一不為 0 時，可結算並生成一隻 Gunner，再於戰鬥區選擇放置位置（PVZ 為網格、CENTRAL 為左右 slot）；生成後三圍歸零。
5. **擊殺達里程碑**：觸發升級選單，三選一強化（見 upgradeOptions.ts），選完後繼續戰鬥。
6. **暫停**：右欄「暫停」可開啟暫停選單，繼續或返回主選單。

---

## 五、操作說明（快捷鍵）

- **送出**：W 或 Enter。
- **生成 Gunner**：E（需有累積答題）。
- **多選題選項**：  
  - 現代題（主/重）：A、D。  
  - 古典題（主/動/虛）：A、S、D。  
  - 閱讀題：底欄 A/B/C 對應 A、S、D。  
- **連接詞題**：無選項快捷鍵，鍵盤輸入後送出。

---

## 六、題型與題庫

| 題型 | 說明 | 資料檔 | 備註 |
|------|------|--------|------|
| CIRCLE_MODERN | 句子圈選「主詞」「重點」 | modern.json | 答案可為字串或索引；正規化在 questionService |
| CIRCLE_CLASSICAL | 句子圈選「主」「動」「虛」 | classical.json | |
| FILL_CONJUNCTION | 連接詞填空，同義詞可接受 | conjunction.json + conjunctionSynonyms | |
| TITLE_MATCH | 句子–標題配對；一題多組時隨機抽 3 組（不同 title） | titleMatch.json | |
| READING_COMPREHENSION | 左文章、右問題與 A/B/C；僅當 Gunner≥2 時有機會出現；同一文章連續 3 題 | reading.json | 子題格式含 question、options、answer(A/B/C) |

抽題入口：`questionService.fetchAnyQuestion(count, excludeIds, { gunnerCount })`；閱讀組題與排除邏輯在該模組內。

---

## 七、開發進度說明（當前功能）

- **已完成**
  - 雙模式（PVZ / CENTRAL）與三欄戰鬥區版面（左參數、中 Phaser、右操作）。
  - 玩家 LV、HP 條、EXP 條（擊殺里程碑進度）；升級時 LV+1。
  - 五種題型（現代/古典/連接詞/標題配對/閱讀測驗）與抽題、計時、評分、正確答案 overlay。
  - 送出(W/Enter)／生成(E) 與累積三圍→Gunner 轉換；放置 Modal（網格/slot）。
  - Roguelite：擊殺里程碑、三選一升級、gunnerBonuses / globalGunnerBonuses；子彈類型（雷電/火/爆炸）、燃燒狀態。
  - 五種敵人類別與出現規則（normal/bomb/doom/small_boss/big_boss）。
  - 閱讀題：左 70% 文章、右 30% 問題與純文字選項；底欄固定 A/B/C；同文章 3 題連續。
  - Modern 題：僅主詞與重點兩種選項；字串答案正規化（stringToIndices）；CorrectAnswerOverlay 無形容詞時不顯示「形」。
  - TitleMatch：一題多組時僅抽 3 組不同 title 出題。
- **可擴充／備註**
  - 地圖選關（MapState）、關卡 Stage 型別已存在，關卡流程未接上。
  - 圖片資源依 SPRITES_README.md；缺少圖時使用預設風格。

**維護約定**：新增功能或大改流程後，請更新本節與相關章節（目錄、玩法、操作），使 README 維持為可依賴的專案索引。

---

## 八、Run Locally

**Prerequisites:** Node.js

1. 安裝依賴：`npm install`
2. 設定環境變數：於 [.env.local](.env.local) 設定 `GEMINI_API_KEY`（若專案有使用 Gemini API）
3. 啟動開發伺服器：`npm run dev`

（原 AI Studio 連結可保留於專案說明中：  
View your app in AI Studio: https://ai.studio/apps/drive/1rP6hlS2fSHbDZzHP2VZEYgqla7GwuIn9）
