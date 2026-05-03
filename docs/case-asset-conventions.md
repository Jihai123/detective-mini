# case 素材命名约定

## 目录结构

```
public/assets/cases/{caseId}/
├── audio/        BGM 文件用 _loop 后缀（如 hallway_loop.mp3）；SFX 用连字符命名（如 ui-click.mp3）
├── characters/   {name}-{emotion}.png + {name}-avatar.png + portrait-fallback.png
├── clues/        clue-{semantic}.jpg
└── scenes/       {name}.jpg / {name}_{descriptor}.jpg + scene-fallback.jpg
```

## 数据中如何写路径

- JSON 字段值只写**文件名**（例：`"clue-envelope-opened.jpg"`）
- 不写完整路径前缀（不允许 `/assets/cases/{caseId}/...`）

适用字段：`clues[].image`、`scenes[].background`、`characters[].avatar`、`characters[].portrait`、`characters[].emotionPortraits.*`

## 代码中如何拼路径

- 消费方调用 `getCaseAssetPath(caseId, category, filename)` 拼出完整路径
- **不允许**直接将数据字段值用作 `src` 或 `preloadImage`（必须经 helper）
- fallback 链：图片加载失败时 `onerror` 触发 `FALLBACK_PATHS.scene` 或 `FALLBACK_PATHS.portrait`

```ts
// ✅ 正确
getCaseAssetPath(this.state.caseId, 'clues', clue.image)
getCaseAssetPath(this.state.caseId, 'characters', character.avatar)
getCaseAssetPath(this.state.caseId, 'scenes', scene.background)

// ❌ 禁止
clue.image           // 直接作为 src（是裸文件名）
scene.background     // 直接作为 src（是裸文件名）
```

## `getCaseAssetPath` 签名

```ts
// src/cases/case-paths.ts
getCaseAssetPath(caseId: string, category: 'scenes' | 'characters' | 'clues' | 'audio', filename: string): string
// → /assets/cases/{caseId}/{category}/{filename}
```

## 新 case 接入步骤

1. 在 `public/assets/cases/{newCaseId}/` 下按上述目录结构放置素材
2. 创建 `src/cases/{newCaseId}/data.json`，路径字段值只写文件名
3. 在 `src/stage1/caseLoader.ts` 的 `JSON_CASE_REGISTRY` 中注册：
   ```ts
   import newCaseData from '../cases/{newCaseId}/data.json';
   const JSON_CASE_REGISTRY = {
     'case-001': ...,
     '{newCaseId}': newCaseData as unknown as StageCaseConfig,
   };
   ```
4. 启动期 `validateCaseConfig` 自动校验 schema，失败时抛出明确错误

## fallback 触发场景

- 图片文件 404 → `onerror` 触发 → `FALLBACK_PATHS.scene` 或 `FALLBACK_PATHS.portrait`
- 当前 `FALLBACK_PATHS` 全局指向 case-001 素材（已知遗留，T8+ 处理）：
  ```ts
  scene:   '/assets/cases/case-001/scenes/scene-fallback.jpg'
  portrait: '/assets/cases/case-001/characters/portrait-fallback.png'
  ```
