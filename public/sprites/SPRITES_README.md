# 圖片資源與角色動畫系統 - Phase 10

## 資料夾結構

```
public/sprites/
├── hero/          ← 主角圖檔（中央塔防模式中央角色）
│   └── (見下方命名規範)
├── gunner/        ← Gunner（砲塔）圖檔
│   └── idle.png
├── enemies/       ← 怪物圖檔
│   └── {type}_{action}.png（例：normal_idle.png）
├── baclground/    ← 戰鬥區背景（資料夾名為 baclground，相容用）
│   └── battle.png
└── SPRITES_README.md
```

---

## 命名規範

### 一、主角 (Hero)

**路徑：** `public/sprites/hero/`

| 檔名 | 說明 |
|------|------|
| `idle.png` | 待機（站立） |
| `walk.png` | 移動／行走 |
| `attack.png` | 攻擊動作 |
| `hit.png` | 受擊（可選） |
| `victory.png` | 勝利姿勢（可選） |

**建議規格：** 單張 PNG，可為多格 sprite sheet（橫向排列）。預設解析度建議 64×64 或 96×96 px。遊戲內會以 texture key `hero_idle` 等載入；若缺少圖檔則使用預設紅色方塊。

---

### 二、Gunner（砲塔）

**路徑：** `public/sprites/gunner/`

| 檔名 | 說明 |
|------|------|
| `idle.png` | 待機／顯示用圖 |

**建議規格：** 單張 PNG，遊戲內會縮放為約 50×40 px。若缺少則使用預設藍色方塊＋灰色槍管。

---

### 三、怪物 (Enemies)

**路徑：** `public/sprites/enemies/`

檔名格式：`{怪物類型}_{動作}.png`

**目前遊戲內的怪物類型（與 data/enemyTypes.ts 一致）：**
- `normal` — 一般敵人
- `bomb` — 高速一次性攻擊
- `doom` — 高攻慢速
- `small_boss` — 小 Boss（累計題數 10 的倍數時出現）
- `big_boss` — 大 Boss（累計題數 24 的倍數時出現）

| 檔名範例 | 說明 |
|----------|------|
| `normal_idle.png` | 一般敵人待機 |
| `normal_attack.png` | 一般敵人攻擊 |
| `normal_hit.png` | 一般敵人受擊（可選） |
| `bomb_idle.png` | bomb 待機 |
| `small_boss_idle.png` | 小 Boss 待機 |
| `big_boss_attack.png` | 大 Boss 攻擊 |

**建議規格：** 單張 PNG，可為 sprite sheet。若缺少某張圖，該敵人會使用預設色塊繪製（依 type 顏色）。

---

### 四、戰鬥區背景 (Background)

**路徑：** `public/sprites/baclground/`（資料夾名保留拼寫以相容既有檔案）

| 檔名 | 說明 |
|------|------|
| `battle.png` | PVZ／中央模式戰鬥區背景圖 |

**建議規格：** 單張 PNG，遊戲內會縮放填滿畫布（GAME_WIDTH × GAME_HEIGHT）。若缺少則使用預設色塊背景。

---

## 通用規則

1. **副檔名：** 一律使用 `.png`（支援透明背景）
2. **檔名：** 英文小寫、底線分隔，無空格
3. **Sprite sheet：** 若為多格動畫，橫向由左到右排列
4. **若缺少某張圖：** 遊戲會自動使用預設 Graphics 繪製，不會報錯

---

## 路徑對應範例

放入 `public/sprites/hero/idle.png` 後，遊戲內會以 `/sprites/hero/idle.png` 載入。  
放入 `public/sprites/enemies/normal_idle.png` 後，一般敵人會使用該圖（texture key: `enemy_normal_idle`）。  
放入 `public/sprites/baclground/battle.png` 後，戰鬥區會以該圖為背景（texture key: `bg_battle`）。  

PreloadScene 會依 [constants/spritePaths.ts](../../constants/spritePaths.ts) 載入主角、Gunner、敵人、背景圖檔；實體與場景會檢查 texture 是否存在後決定顯示圖檔或預設繪製。
