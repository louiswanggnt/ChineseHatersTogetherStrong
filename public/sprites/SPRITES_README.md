# 圖片資源與角色動畫系統 - Phase 10

## 資料夾結構

```
public/sprites/
├── hero/          ← 主角圖檔
│   └── (見下方命名規範)
├── enemies/       ← 怪物圖檔
│   └── (見下方命名規範)
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

**建議規格：** 單張 PNG，可為多格 sprite sheet（橫向排列）。預設解析度建議 64×64 或 96×96 px。

---

### 二、怪物 (Enemies)

**路徑：** `public/sprites/enemies/`

檔名格式：`{怪物類型}_{動作}.png`

**目前遊戲內的怪物類型：**
- `slime` — 一般史萊姆
- `elite_slime` — 精英史萊姆
- `boss_slime` — 首領史萊姆

| 檔名範例 | 說明 |
|----------|------|
| `slime_idle.png` | 史萊姆待機 |
| `slime_attack.png` | 史萊姆攻擊 |
| `slime_hit.png` | 史萊姆受擊（可選） |
| `elite_slime_idle.png` | 精英史萊姆待機 |
| `elite_slime_attack.png` | 精英史萊姆攻擊 |
| `boss_slime_idle.png` | 首領史萊姆待機 |
| `boss_slime_attack.png` | 首領史萊姆攻擊 |

**建議規格：** 單張 PNG，可為 sprite sheet。史萊姆建議 64×64～128×128 px，Boss 可稍大。

---

## 通用規則

1. **副檔名：** 一律使用 `.png`（支援透明背景）
2. **檔名：** 英文小寫、底線分隔，無空格
3. **Sprite sheet：** 若為多格動畫，橫向由左到右排列
4. **若缺少某張圖：** 遊戲會自動使用預設 CSS 像素風格，不會報錯

---

## 路徑對應範例

放入 `public/sprites/hero/idle.png` 後，遊戲內會以 `/sprites/hero/idle.png` 載入。
