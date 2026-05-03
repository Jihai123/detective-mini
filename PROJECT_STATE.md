# PROJECT_STATE.md
> 项目交接状态文档 | 最后更新:T2.7.1(路径文件名化 + helper 化 + 命名约定)完成,已合并 main

---

## 0. 使用方法

新对话开场白模板:

"我在做侦探推理游戏 detective-mini。T0 + T1 + T1.5 + T2 + T2.5 + T2.5.1 + T2.6 + T2.7-A + T2.7-B + T2.7.1 已完成并合并 main。下面是完整项目状态文档,请先读完复述核心信息,然后我给你下一个任务。"

---

## 1. 项目基本信息

- **项目名**:detective-mini
- **类型**:浏览器端侦探推理游戏
- **技术栈**:TypeScript + Vite,原生 innerHTML 渲染,无框架
- **主入口**:src/main.ts → CaseSelector → src/stage1/app.ts(StageOneApp class)
- **当前分支**:main(T2.7.1 已合)
- **Bundle**:JS gzip ~22.32 kB(T2.7 系列累计 +0.37,21.95 → 22.32),CSS gzip ~6.61 kB

---

## 2. 项目定位

- **目标**:轻量侦探推理游戏(Ace Attorney Lite 风格)
- **对标**:Ace Attorney / Return of the Obra Dinn / Her Story
- **核心哲学**:承诺机制 - 玩家推理必须被结构化输入系统

---

## 3. 游戏流程(六阶段 + overlay 系统)

selector → archive → intro → investigation → confrontation → deduction → result

Overlay(非 screen):dialogue / inspect / hint / interpret / accuseDialog (T2.6-B 新增)

---

## 4. 已完成的阶段

### ✅ T0 地基
- T0-1 清理死代码 / T0-2 数据-资源对齐 / T0-3 存档版本号(SAVE_VERSION 起始 2)/ T0-4 UI 容器响应式

### ✅ T1 对质系统重构
- T1-A schema 升级:TestimonySentence / Emotion 类型
- T1-B 对质逻辑重写:先选句再出证据
- T1-C UI 完全重写:证词列表、证据栏、回合徽章、立绘情绪
- T1-D 文案打磨 / T1-E 三轮补丁

### ✅ T1.5 数据层多 case 化
- 新建 `src/cases/` 作为 case 内容入口
- CaseMeta / CaseDefinition 类型(difficulty / tutorialMode / order / unlocked)
- CASE_REGISTRY + getCaseById API
- StageOneApp 构造函数改为 options 对象
- caseLoader 委托模式
- SAVE_VERSION 2→3 + v2→v3 migration

### ✅ T2 证据解读阶段
- ClueInterpretation / ClueInterpretations / ClueRole / InterpretationState 类型引入
- ClueConfig 扩展:role / interpretations / discoveryLayers (T5 预留) / unlockRequirement (T6 预留)
- StageRuntimeState 和 StageSaveData 加 `interpretations: InterpretationState`
- SAVE_VERSION 3→4
- case-001 数据填二档(canonical + misread,因 tutorialMode=true)
- 4 条 clue 的 attacksTestimonyIds 反推自 T1 的 counterEvidenceId
- interpret overlay 实装,confrontation 证据栏只显示已解读 clue
- canEnterConfrontation 前置:所有 isKey clue 已收集且已解读

### ✅ T2.5 case 选择页 + per-case 存档 namespace
- main.ts 启动时 `migrateLegacySave()` → 实例化 CaseSelector → 用户选 case 后实例化 StageOneApp
- StageOneApp 加 onExit 参数 + dispose() 方法
- 存档 key 格式 `detective-mini.stage1.save.{caseId}`
- SAVE_VERSION 4→5 + v4→v5 migration(no-op,仅 bump)
- migrateLegacySave 一次性把无 namespace 旧 key 迁到 case-001

### ✅ T2.5.1 selector 视觉抛光 + 历史中卡处理
- selector class 解耦:directory-* 独立(脱离 archive-*)
- 标题改"案件目录 / CASE DIRECTORY"
- layout 改 `auto-fit minmax(280px, 1fr)`,自适应未来 N 卡
- 删除 stage1/app.ts 第三张教学卡(StageOneApp 一次性例外授权,TODO T3 处理 archive 屏整体)
- selector 用单色灰(克制)/ archive 维持深冷蓝+金色(丰富),视觉层级清晰
- bundle: JS +0.02 kB / CSS 6.00 kB(首次单独计量)

### ✅ T2.6-A 机制铺垫数据层(4 文件)

**Schema 扩展(types.ts)**
- ClueRole 三值枚举:`'confrontation' | 'context' | 'emotional'`
- TestimonySentenceResponses 4 层 fallback 链:
  - sentence × interpretation 组合(canonical 按 clueId map / partial / misread / irrelevant)
  - sentence-level 通用 partial / misread 模板
  - round-level onCorrectFeedback / onWrongFeedback / onAllLost(case-001 现有)
  - 全局兜底默认文本
- SuspectConfig:多嫌疑人结构 `{ id, name, characterId, sentences, emotionPortraits }`
- ConfrontationConfig:`suspects?: SuspectConfig[]` 与 `rounds` 旧字段并存(双格式兼容)
- EndingTextBlock / EndingMatrixRule / EndingMatrix:数据驱动结局引擎
- ClueConfig 增 `isKey?: boolean`
- ClueRuntimeState 新增 `discoverable: boolean` + `currentLayer: number`
- RoundResult 新增 `'draw'` 值
- StageSaveData 加 `confrontationBySuspect?` + `clueRuntimeStates?`

**Migration(saveStore.ts)**
- SAVE_VERSION 5→6
- migrateSaveV5toV6:旧 confrontation 平铺对象 → confrontationBySuspect 字典(key=旧 target id)
- ClueRuntimeState 自动初始化 discoverable=true / currentLayer=0
- 链式 v2→v3→v4→v5→v6 派发更新
- 验证:38 断言 / 6 路径(全新 / v5 / v4 / v3 / v2 / 未知 caseId fallback)

**case-001 数据迁移(data.ts)**
- confrontation 顶层数据搬入 suspects[0],target='zhoulan'
- 4 条 clue 显式 role='confrontation' + isKey=true
- endings.success / endings.failure 显式锁定为 T2.5.1 实测文本
  ```
  title: '案件归档'
  body: '你已锁定真相核心:周岚在会前拆封并转移结论页。'
  ```
- TODO(T3):success 与 failure 文本相同是 T2.5.1 历史 bug,result 重做时分离
- endingMatrix:`rules: [{ when: { submissionCorrect: true }, endingKey: 'success' }], fallback: 'failure'`

**caseLoader.ts**
- validateCaseConfig 双格式兼容(rounds 旧 / suspects 新)

### ✅ T2.6-B 机制铺垫运行时层(3 文件)

**types.ts**
- StageRuntimeState 加 `confrontationBySuspect / currentSuspectId / clueRuntimeStates`

**app.ts(StageOneApp 全部 5 大功能落地)**

(1) Unlock runtime
- `initClueRuntimeStates()`:启动时给 case 全部 clue 创建 runtime state(case-001 全部 discoverable=true,无 unlockRequirement)
- `recomputeUnlockStates()`:每次收集 clue 后扫所有未发现 clue,通过 unlockRequirement 检查则 discoverable=true
- 锁定 clue UI:锁图标 + tooltip + 灰显

(2) Layer runtime
- `advanceLayer()`:玩家点"深入交互"按钮,currentLayer +1
- 拾取描述按 currentLayer 取 discoveryLayers[layer].description
- L{n}/{total} 进度 badge
- interpret overlay 选项始终全开放(layer 与 interpretation 解耦,T6 再考虑锁定)

(3) 多嫌疑人 confrontation 切换
- `switchSuspect()`:flat state → dict 同步 → 切换 sentence/立绘/round
- `syncSuspectState()`:dict 与 flat state 全程同步
- 嫌疑人 tab UI(顶部 tab,纯切换状态不重建 DOM)
- 每嫌疑人独立 ConfrontationState(roundIndex / mistakesInCurrentRound / roundResults / lastFeedback / 立绘情绪)
- interpretations 字段为 case-level,跨 suspect 切换保留

(4) 4 outcome dispatch + 4 层 fallback feedback
- `resolveOutcome()`:canonical / partial / misread / irrelevant 四值
- `getFeedback()`:sentence.responses → sentence-level 模板 → round-level → 全局兜底
- outcome → RoundResult 映射:
  - canonical → won
  - partial → draw
  - misread → lost(带 lostByMisread flag)
  - irrelevant → 不计 round,不消耗 mistake quota,显示反馈

(5) 准备指认按钮 + Dialog
- handleConfrontationEnd success 路径不再自动跳 deduction,改设 status='success'
- canAccuse():检查任一 suspect 击破过 sentence
- 准备指认按钮 status='success' 后高亮 + pulse 动画 + 顶部提示"证据似乎已经足够,你可以指认凶手了"
- 点击弹 accuseDialog overlay,列出全部 suspects(单嫌疑人也弹,保持代码路径单一)
- confirmAccuse() → deduction 屏,传入选定 suspectId
- 取消 dialog 返回 confrontation,状态完全保留

(6) Emotional → result
- `resolveEnding(state, endingMatrix)`:从上到下扫规则,第一个完全命中赢,无命中走 fallback
- renderResultBody 按 endingKey 渲染 endings[endingKey]
- endings 字段双重保底:`endings?.[endingKey]?.title ?? '案件归档'` 防 case 数据缺失

**hasMajorityWin 公式**(决策落地)
```typescript
const hasMajorityWin =
  wonCount >= 1 &&                          // 至少 1 个 canonical 命中(防全 partial 通关)
  (wonCount + drawCount) > lostCount        // partial 计入 success 侧
```
case-001 实战 drawCount 永远=0,公式退化等价旧 `wonCount > lostCount`,行为不变。

**style.css**
- draw badge / suspect tabs / accuse button (pulse) / accuse dialog overlay
- success notice / layer progress badge / locked clue card

**测试**
- 6 mental simulation 路径全部 console 验证
- 4 mock fixtures(f709a53 add → 083e500 revert)无污染
- case-001 行为不变实证:submissionCorrect=true/false 两条路径文本逐字与 T2.5.1 一致

**Bundle**
- JS gzip 19.26 → 21.95 (+2.69 kB)
- CSS gzip 6.00 → 6.61 (+0.61 kB)
- T2.6 累计 +3.30 kB,远低于 +7 kB 预算
  
### ✅ T2.7-A case 导入架构基础设施(3 文件)

**新建 src/cases/case-paths.ts(13 行)**
- getCaseAssetPath(caseId, category, filename) → /assets/cases/{id}/{cat}/{file}
- FALLBACK_PATHS.scene / portrait 全局兜底常量(暂指向 case-001)

**扩展 src/stage1/caseLoader.ts**
- 新增空 JSON_CASE_REGISTRY: Record<string, StageCaseConfig> = {}
- loadCaseConfig 优先查 JSON 表,空时 fallback 走 TS 路径
- T2.7-B 时填 case-001 进 JSON_CASE_REGISTRY,完成迁移

**改 src/stage1/app.ts(21 处路径替换)**
- 删除 7 条模块级音频常量
- syncAmbienceForScene / preloadCriticalAssets / bindEvents SFX 6 处 / 
  HTML 模板 8 处全部改用 getCaseAssetPath(this.state.caseId, ...)
- grep /assets/cases/case-001/ app.ts → 零输出
- FALLBACK_PATHS 用于 onerror 兜底

**Bundle**:JS gzip 21.95 → 22.30(+0.35 kB),CSS 不变 6.61

**T2.7-A 跳过真人实测直接合 main**(用户决策),T2.7-B 实测时承担合并归因风险,
Network 404 检查作为强制补偿项。

### ✅ T2.7-B case-001 数据 JSON 化(4 文件)

**新建 src/cases/case-001/data.json(22,183 bytes / gzip 5,178)**
- 从 data.ts 机械 1:1 翻译,JSON.stringify 严格相等验证通过
- ConfrontationConfig 双格式(rounds + suspects)双保留
- TestimonySentenceResponses 等零填充字段省略(JSON 中省略即 undefined)
- 16 处素材路径字段保留完整路径字符串(决策 D4,T2.7.1 整理)

**改造 src/stage1/caseLoader.ts**
- `import case001Data from '../cases/case-001/data.json'`
- `JSON_CASE_REGISTRY['case-001'] = case001Data as unknown as StageCaseConfig`
- module-load 时一次性跑 `validateCaseConfig`(启动期暴露 schema 错误)
- `loadCaseConfig` API 签名同步不变

**改造 src/cases/case-001/index.ts**
- 删除对 `./data`(data.ts)的 import
- 改为直接 `import case001Data from './data.json'`,避免 caseLoader 循环依赖
- `config: case001Data as unknown as StageCaseConfig`

**删除 src/cases/case-001/data.ts**
- 全仓库零 `import … from './data'` 残留(grep 已验证)

**Bundle**:JS gzip 22.30 → 22.32(+0.02 kB)/ CSS 6.61(±0);data.json 内联 JS bundle,dist/ 无独立 JSON emit

**真人实测 6 路径全过**:happy path / misread 扣容错 / irrelevant 不扣容错 /
全 misread → failure 屏 / 硬刷经 selector 中转后状态恢复 / 跨 case 保留 /
F12 Network 无 4xx / Console 无 error。result 屏文本逐字与 T2.6-A 锁定值一致:
- 标题:案件归档
- body:你已锁定真相核心:周岚在会前拆封并转移结论页。

### ✅ T2.7.1 路径文件名化 + 消费方 helper 化(3 文件)

**改 src/cases/case-001/data.json**
- 16 处路径字段值从完整路径改为只写文件名
  (clues[].image / scenes[].background / characters[].avatar/portrait/emotionPortraits)

**改 src/stage1/app.ts**
- `getSceneBackground` 修复假参数:利用 `this.state.caseId`,函数体改为
  `return getCaseAssetPath(this.state.caseId, 'scenes', filename)`,4 处调用方零改动
- `getCharacterVisual` 从透传升级为 helper 化封装,return 字段经
  `getCaseAssetPath` 转换,4 处下游调用方零改动
- 12 处消费方完成 helper 化,`grep '/assets/cases/' src/stage1/app.ts` 零命中

**新建 docs/case-asset-conventions.md(66 行)**
- 目录结构 / 文件命名规则 / JSON 字段值约定 / 消费方 helper 化要求 /
  fallback 触发场景 / 新 case 接入步骤

**Bundle**:JS gzip 22.32(±0)/ CSS 6.61(±0)
**真人实测 6 路径全过 + F12 Network/Console 全程清洁**

---

## 5. 核心架构真相

### 数据驱动
- ✅ 图片路径、confrontation、emotionPortraits 数据驱动
- ✅ case 数据层完全可扩展(CASE_REGISTRY)
- ✅ 证据解读三档机制(T2)
- ✅ case 选择页主导流(T2.5)
- ✅ 存档 per-case namespace(T2.5)
- ✅ 多嫌疑人 schema + runtime(T2.6)
- ✅ unlock / layer runtime(T2.6,T6 字段终于接入)
- ✅ 数据驱动 endingMatrix(T2.6)
- ✅ case 数据 JSON 外置(T2.7-B,case-001 已迁,case-002 起直接 JSON)
- ✅ 素材路径 helper 化在 data 字段层面落地(T2.7.1)
- ❌ archive / intro 文案硬编码(T4 修)
- ❌ deduction submission 选项卡片化但字段名硬编码(T3 修)
- ❌ result 页 hardcoded 单文本(T2.6-A 显式锁定 = T3 时分离 success/failure 文案)
- ❌ status bar 地点时段硬编码(T4 修)
- ✅ tutorialMode 字段已接入

### 关键已知机制

**存档**
- SAVE_VERSION = 6
- 存档 key:`detective-mini.stage1.save.{caseId}`
- 链式 migration v2→v3→v4→v5→v6 全兼容
- 启动时 migrateLegacySave 把无 namespace 旧 key 迁到 case-001

**Confrontation**
- 多嫌疑人平行切换,confrontationBySuspect 字典
- 进入需:所有 isKey clue 已收集 + 已解读
- - 4 outcome 真实语义(T2.6 hotfix 后明确):
  - canonical + hits=true → roundResult=won,推进下一 round,mistakes 重置 0
  - misread + hits=true → mistakes+1,达到 maxMistakes 才 round=lost(带 lostByMisread)
  - misread + hits=false / canonical + hits=false → irrelevant,**不扣 quota,设计意图**
  - partial → draw(case-001 二档解读不会触发)
- "选错证据"在玩家心智 ≠ 代码 misread。玩家拿"无关 clue"攻击走 irrelevant 路径不扣。
- handleConfrontationEnd:hasMajorityWin=false 直接跳 failure result 屏(hotfix 修复 allLost 不可达)
- hasMajorityWin = wonCount>=1 && (won+draw)>lost
- 终止由玩家手动"准备指认",不再自动跳 deduction

**Interpret**
- 三档解读:canonical / partial / misread(case 数据决定档位数)
- 选项排序:clueId 字符串哈希对档数取模,跨 session 稳定
- 选项不显示档位名称,玩家不知道哪个是 canonical
- 支持重选(无锁定,T3+ 再考虑)
- misread 解读的 clue 在 confrontation 中:有 sentence-level misread 反应文本则用,否则全局兜底

**Unlock & Layer**
- unlockRequirement:收集瞬间触发 recompute,通过则 discoverable=true 持久化
- discoveryLayers:玩家点"深入交互"按钮 advanceLayer,描述按 currentLayer 取
- layer 与 interpretation 解耦,interpretation 选项始终全开

**Result**
- resolveEnding 按 endingMatrix 规则匹配 → endingKey → endings[endingKey] 渲染
- case-001 endingMatrix 仅 success rule + failure fallback
- emotional clue 通过 endingMatrix.rules 的 emotionalState 条件影响结局变体
  
**素材路径**
- 全部走 getCaseAssetPath(caseId, category, filename) helper
- caseId 从 this.state.caseId 取(StageOneApp 已接收)
- FALLBACK_PATHS.scene / portrait 全局兜底,onerror 触发
- T2.7-A 后 app.ts 内零硬编码 /assets/cases/case-001/ 路径
- ✅ 16 处路径字段在 data.json 中只写文件名,12 处消费方经 getCaseAssetPath 拼接,
  getSceneBackground 与 getCharacterVisual 封装完整(T2.7.1)
---

## 6. KNOWN_ISSUES 清单

### 🔴 P0 阻塞
(已清空)

### 🟡 P1 UX
- **音乐播放有错误情况**(T2.5 验收发现):具体场景待复现。可能涉及 case 切换 / dispose 音频清理。T2.9 处理。
- **dialogue overlay 滚动**(P1 描述与事实不符):盘点显示已有 overflow:auto。需具体复现步骤后定位。T2.9 处理。
- submission 4 个分组仍是表单感,T3 重做
- archive 页系统化(T4)
- 扣分明细不透明(T3 附带任务)
- result 屏 success / failure 文本相同(T2.6-A 显式标记的 T3 任务)
- case-001 confrontation UX 缺口:irrelevant 不扣容错符合 4-outcome 设计,
  但玩家心智上"选错 = 应被惩罚"。tutorial case 内容简单(4 clue 中 1 条死、
  3 条 1:1 对应 sentence)放大该体感。case-002 复杂数据下问题会消解。
  case-001 不补提示(决策:tutorial 简单接受)。

### 🟢 P2 技术债
- `getSceneBackground` 签名中 `_sceneId` 参数仍未真正使用(零侵入妥协,接受)
- emotion 字段在 dialogue overlay 未生效(T8 处理)
- hintCount / wrongSubmissionCount 累加但未评分使用
- dialogueState 字段在 loadStageSave 未校验
- preResults 计算用 counterEvidenceId 是 T1 遗留双轨判定,Bug 1 修复后已是死代码,T3 清理(已加 TODO)
- handleConfrontationEnd 失败分支已完整重置;架构上仍存在"未来不经 startConfrontation 入口会出 bug"的隐患(目前不存在该入口,记录待观察)
- T2.7-A 21 处路径替换无真人实测,T2.7-B 实测时若出现素材问题需双层归因
  (T2.7-A 拼接 bug vs T2.7-B JSON 翻译 bug)
---

## 7. 改造路线剩余(case 难度驱动)

### 路线视角
按 case 难度解锁需求执行,不按 T 序号线性。

- **tutorial 难度(case-001)**:✅ T0+T1+T1.5+T2+T2.5+T2.5.1+T2.6 已满足
- **normal 难度(case-002 目标)**:需要 T2.7 + T2.8 + T2.9
- **hard 难度(case-003+)**:需要 T6 + T7 + T11 + T12

T3-T15 是"为 case 解锁的素材库",非线性清单。

### case-002 整体路径(A 方案 4 阶段)

- ✅ **T2.6** 机制铺垫(A 数据层 + B 运行时层)
- ✅ **T2.7** case 导入架构(T2.7-A + T2.7-B + T2.7.1 全部完成)
  - ✅ T2.7-A case 导入架构基础设施(case-paths helper + JSON_CASE_REGISTRY 骨架)
  - ✅ T2.7-B case-001 数据 JSON 化
  - ✅ T2.7.1 路径字段文件名化 + 消费方 helper 化 + case-asset-conventions 文档
- ⏳ **T2.8** case-002 数据化(三份剧本文档 → JSON 数据,直接走文件名约定)
- ⏳ **T2.9** 抛光(T2.5.2 音乐 bug 现场复现 + dialogue 滚动复核 + 立绘情绪切换 + 多结局判定细节)

### P0 级(核心玩法,normal 难度门槛)
- ⏳ T3:deduction 结构化重做(Obra Dinn 模式)+ result UI 重做
- ⏳ T4:清除系统语言
- ⏳ T5:热点二段式 + 三态视觉 + 音效

### P1 级(达标,hard 难度素材)
- ⏳ T6:对话 Press/Present 双动词 + interpret 锁定机制
- ⏳ T7:证词污染 / 证人警觉度
- ⏳ T8:情绪曲线演出分层
- ⏳ T9:笔记本
- ⏳ T10:多结局(T2.6 已铺设 endingMatrix 数据层)

### P2 级(差异化)
- ⏳ T11:时间线拖拽
- ⏳ T12:证据连线板
- ⏳ T13:Case 编辑器
- ⏳ T14:存档/分享/成就
- ⏳ T15:音效 / BGM 体系化

---

## 8. 关键决策记录

### 技术原则
- 不引入 React/Vue
- Sonnet 4.5 执行主力,Opus 架构决策
- 保留:AMBIENCE_TRACKS、音效常量、onerror 兜底、preloadCriticalAssets

### Claude Code 纪律
- 每次执行前重新读文件
- 盘点阶段只列事实
- 一次任务不改超过 5 个文件(T2.6 例外:跨 8 文件,内部拆 A/B 两个子阶段各 4 文件)
- 执行前必须确认分支
- 分支命名规范:`feat/t{N}-*` 或 `feat/t{N}.{M}-*`

### 验收强度分层
| 任务类型 | 审查强度 |
|---|---|
| 持久化 / 存档 / migration | 必须代码预审 |
| 状态机 / 生命周期相关 | 必须诊断预审 + mental simulation |
| 新增机制核心逻辑 | 汇报时看代码摘要,不预审 |
| UI / 渲染 / 样式 | 只看跑完效果,不看代码 |
| 类型定义 / 数据 schema | 汇报时看字段,不看实现 |
| 重构 / 搬移 | 只看 git diff 文件数,不看内容 |
| 小修复(<2 处改动) | 直接修,只验收效果 |

### 分支流程
- 每 T 任务在独立分支完成,验收通过才合 main
- 合并使用 `--no-ff` 保留分支历史
- 合并后可删除 feature 分支

### T2 机制决策
- schema 三档 + runtime 按 tutorialMode 降级:case-001 走二档,case-002+ 走三档
- 路线图 case 难度驱动:T3-T15 是"为 case 解锁的素材库",非线性清单
- 解读不锁定:T2 阶段允许重选,锁定机制留给 T3+

### T2.5 机制决策
- 存档 per-case namespace:支持未来"边玩 case-002 边回顾 case-001"
- CaseDefinition.config 改为可选,locked case 仅带 meta
- CaseSelector 与 StageOneApp 通过 dispose / 重新挂载切换,避免 listener 泄漏

### T2.5.1 决策
- StageOneApp 一次性授权例外(为删历史遗留卡)
- selector / archive 用独立 class 集 directory-* / archive-*(防御性视觉解耦)
- layout 用 auto-fit 避免未来重写

### T2.6 决策(A + B 全套)

**T2.6-A 数据层**
- 4 层 fallback 反馈链:sentence×interpretation / sentence-level / round-level / 全局兜底
- 多嫌疑人平行切换,confrontationBySuspect 字典(非串行)
- ClueRole 三值(confrontation/context/emotional)
- 数据驱动 endingMatrix(非函数式 if-else)
- isKey 字段引入,case-001 标全部 4 条 isKey=true
- case-001 endings 显式锁定 T2.5.1 实测文本('案件归档' + 现有 body)作为"行为不变"的实证

**T2.6-B 运行时层**
- handleConfrontationEnd success 不再自动跳 deduction(决策点 D 真正落地)
- hasMajorityWin 公式:`wonCount>=1 && (won+draw)>lost`(全 partial 不许通关)
- 单嫌疑人也弹 dialog 保持代码路径单一
- endings 字段双重保底(`?? '案件归档'`)防 case 数据缺失
- unlock 收集瞬间触发(非按需 render)
- layer 与 interpretation 解耦
- "准备指认"按钮约束:至少击破 1 sentence 后才可点击,顶部提示"证据似乎已经足够"
### T2.6 hotfix 决策(实测发现 → 修复 → 数据缺口接受)

**修复落地**(3 commit + 1 inventory + 1 allLost,共 5 commit)
- Bug A:case-001 misread.attacksTestimonyIds 从 [] 改为 canonical 同值
- Bug B + C:misread 分支 mistake+1 累加,quota 用尽才 round=lost(语义重写)
- allLost 跳转:hasMajorityWin=false 直接进 failure 结果屏

**实测纪律新增三条**(必须执行)
- console 日志 ≠ 浏览器实测。Code 跑通的 path 日志只代表代码路径可达,
  不代表玩家实操路径触达。验收要求"操作描述 + 对应日志"对照。
- failure path 真人触达必须验证。T2.6 当时漏验,导致 allLost 路径长期不可达。
- "行为不变"实证以**玩家可操作触达的实测路径文本**为依据,不是单 path
  console 日志或 mental simulation。

**case-001 数据缺口接受决策**
- case-001 confrontation 4 outcome 演示不完整(camera-gap-0731 死 clue + 
  3 条 1:1 clue→sentence)
- 不为补全 case-001 引入 misread 跨 round 攻击或 irrelevant 扣 quota 改动
- case-002 复杂数据(10 clue × 3 档 × 多 sentence)是 4 outcome 真正首演场
- case-001 tutorial 难度接受"选对就赢/选错就漂"体感
### 测试纪律
- 每个 T 的验收必须有一次"玩家不按剧本走"的实测
- Code 静态验证 + tsc 全绿 + 正常路径覆盖不到异常流程
- P0 bug 通常在异常路径被发现
- 状态机 bug 必须做 mental simulation 而不是只看代码片段

### 跨阶段经验(关键的几条)

- **本地拉远程分支**:`git checkout feat/xxx`(分支同名时自动追踪)
- **浏览器验收必备步骤**:Ctrl+Shift+R 硬刷新 + F12 console `localStorage.clear()` + 重启 dev server
- **Code 诊断含"如果"两字时**:它没真的验证,要求做 mental simulation
- **双轨判定隐患**:新机制(attacksTestimonyIds)上线时排查所有引用旧机制(counterEvidenceId)的地方
- **盘点报告暴露过期假设**:T2.5 盘点显示 dialogue overlay 已有滚动,P1 描述与事实不符
- **Code 越权疑似实为遗留**:T2.5 验收时怀疑 Code 加了第三张卡,实际是历史遗留
- **盘点-决策-修正三步走的价值(T2.6 关键)**:T2.6-A 验收暴露 case-001 失败路径根本不存在(永远渲染单文本)。Code 第一次提交的 endings.success 标题 '案件告破' 与实测 '案件归档' 不符。如果按"看似合理"放行,T2.6-B 接入后会触发 100% 玩家可见但不会被报告为 bug 的视觉回归。"行为完全不变"作为最高标准必须以实测文本字符串为依据,不是看代码逻辑推断。
- **Bundle 对比基线必须明确(T2.6-B 关键)**:T2.6-B 报告中 Code 用 T2.5 之前 main(14.05 kB)作为对比基线,把 T2.5/T2.5.1 累积算到 T2.6 头上,误判超预算 0.9 kB。实际以 T2.5.1 合 main 后为基线,T2.6 累计 JS +2.69 kB 远低于 +7 kB 预算。后续验收 bundle 时,Code 必须明确说明对比基线是哪个 commit。
- **Stream timeout 防御**:T2.6-B app.ts 大重写在单次响应中触发 stream idle timeout。重型任务必须拆 3 个内部 commit,每段 LLM 响应短。这是工程性纪律而非偶发故障。
- **Code 主动暴露边界问题的协作形态**:T2.6-B 实施前 Code 主动问"准备指认 vs handleConfrontationEnd 关系"和"draw 是否计入 majority"。这种"问完再动"避免两个细微但严重的体感 bug。鼓励 Code 持续这种协作形态。
  
### T2.7.1 决策

**已落地**
- 一次性实施(用户决策"最快实现"):不拆 A/B 子阶段,但保留真人实测 + commit 拆代码/docs 两段 + Code 产出审阅环节,验收强度未降级
- `getSceneBackground` 第三方案(Code 主动找出):利用 `this.state.caseId` 实例属性,保留函数签名零侵入,4 处调用方零改动。优于指令预设的"接收 caseId 参数"或"删除 helper"两选项
- `getCharacterVisual` 升级为 helper 化封装(非透传):函数本身经 getCaseAssetPath 转换,而非每个调用方各自包 helper。理由:helper 化的关注点应集中在数据离开 case 数据层那一刻,避免未来新增调用方时遗漏 helper 化(防御性设计)
- `_sceneId` 参数保留下划线前缀:零侵入妥协,签名上的小遗憾接受
- KNOWN_ISSUES 中"getCharacterVisual 透传"被本任务自然消除(技术债的预期清理路径之一)

**T2.7.1 跨阶段经验**
- "最快实现"模式的纪律边界:用户决策"不拆"指的是省掉盘点 commit / 决策对话,不是省掉真人实测 / Code 产出审阅 / commit 拆段。把"省"和"不省"明确区分,避免 Code 误读"最快"为"全省"
- Code 主动找到指令未列方案:`getSceneBackground` 第三方案不在指令的"接收 caseId vs 删除 helper"二选一中。Code 主动找出更优解(this.state.caseId 实例属性)而非机械执行指令二选一,这种协作纪律继续鼓励
- 越权与连锁改动的判定:Code 改 `getCharacterVisual` 看起来超出 12 处消费方清单,实际是清单中 1019 行所在函数本身。汇报缺口时 Code 第一反应是"列在清单里",深层理由(防御性 helper 化)未主动说出。后续审阅指令应要求 Code 同时给出"表层归因"和"深层动机",避免审阅方反向推论

### T2.7-B 决策

**已落地**
- 机械 1:1 翻译,零业务修改:`JSON.stringify` 严格相等作为"行为不变"实证
- `ConfrontationConfig` 双格式 JSON 化时双保留(rounds + suspects 同存)
- 零填充字段 JSON 中省略,反序列化后 `undefined`,`validateCaseConfig` 已 support optional
- 路径字段策略 D4:维度 3 盘点暴露 16 字段仍完整路径,12 处消费方仍直接读;T2.7-B 严守"纯数据搬迁",路径文件名化拆为 T2.7.1
- 静态 import + module-load 一次性 `validateCaseConfig`:启动期暴露 schema 错误
- JSON 必须放 `src/`(静态 import 限制),不是 `public/`(动态 fetch 才用 public/)
- `docs/case-asset-conventions.md` 推迟到 T2.7.1 后写(约定不能与代码不一致)

**T2.7-B 跨阶段经验**
- 微盘点暴露 T2.7-A 决策 C 在 data 字段层未落地:T2.7-A 只在 app.ts 的 21 处硬编码路径上落地了 helper,data 字段未触及。"决策 C 落地不完整"被 T2.7-A 跳过实测掩盖了。T2.7-B 真人实测前的微盘点把这个隐患揪出来,避免归因复杂化。
- "字段名假设"风险:T2.7-B 阶段二指令里写 `imagePath` / `portraits`,Code 主动纠正实际字段是 `image` / `portrait` / `emotionPortraits`。架构指令在不看实际源代码字段名的情况下易写错假设,Code 主动暴露字段差异的协作纪律必须延续。

### T2.7-A 决策(盘点暴露隐性遗留 → 升级合并 + 实测策略调整)

**盘点暴露的关键事实**
- case-001 data.ts 序列化 ~4.8 kB gzip,远低于 8 kB 阈值
- app.ts 内 21 处硬编码 /assets/cases/case-001/ 路径(preload 8 / 音频 7 / fallback 3 / archive intro 3)
- 现有 validateCaseConfig 已覆盖双格式 + discriminated union,无需新加验证层
- case-001 path 在 data.ts 内已统一规则,但 app.ts 调用方写死 case-001

**最终决策**
- A:静态 import(JSON < 8 kB 触发条件分支)
- B:复用 validateCaseConfig,不引新验证层
- C:JSON 写文件名 + getCaseAssetPath helper(新增 case-paths.ts)+ app.ts 21 处替换
  并入 T2.7-A(原 5 文件红线妥协,合并避免推坑到 T2.8)
- D:T2.7-B 时 case-001 data.ts 完全删除
- E:case-level 独立
- F:不预留 T13 接口
- G:case-002 占位取消(T2.8 直接建真数据)

**T2.7-A 实测策略**
- 用户决策跳过真人实测直接合 main
- T2.7-B 实测承担两层归因风险,Network 404 检查作为强制补偿项
- 此决策记录为后续 T2 阶段验收强度的实例:验收强度可由用户按风险偏好调整,
  纪律是默认值不是绝对值
---

## 9. 下一步

**T2.8** case-002 数据化(三份剧本文档 → JSON 数据,直接走文件名约定)。

启动条件:T2.7.1 收尾的命名约定文档(`docs/case-asset-conventions.md`)可作为 case-002 数据填充的唯一参考。

### case-001 现网素材结构(T2.7 必须兼容)

```
public/assets/cases/case-001/
├── audio/          BGM 用 _loop 后缀(hallway_loop.mp3),SFX 用连字符(ui-click.mp3)
├── characters/     {name}-{emotion}.png + {name}-avatar.png + portrait-fallback.png
├── clues/          clue-{语义}.jpg
└── scenes/         {name}.jpg / {name}_{descriptor}.jpg + scene-fallback.jpg
```

### case-002 素材状态
- ✅ 立绘 10 张(陈昊 4 / 王凯 3 / 李婷 3)
- ✅ 场景 4 张(会议室 / 办公区 / 走廊 / 便利店)
- ✅ 证据图 10 张(.jpg 已对齐 case-001 风格)
- ✅ BGM 4 首(_loop 后缀对齐)
- ❌ avatar 头像 3 张待裁切
- ❌ SFX(留 T2.9)
- 命名已对齐 case-001 风格,本地放妥,**未 push git**(等 T2.7+T2.8 一起进)

### case-002 三份剧本文档已交付
- evidence.md(10 条证据三档解读)
- testimony-and-scene.md(嫌疑人证词 + 场景)
- ending.md(三结局,完美-A/B/C 变体)
- 部分 [DRAFT] / [TODO] 标记待 T2.8 前敲定

### case-002 设计目标
- 难度:normal
- 证据:10 条三档解读 + 关键证据(C003 / C006 / 王凯录音)
- 嫌疑人:3 人(陈昊真凶 / 王凯 alibi 反转枢纽 / 李婷配合证人)
- 结局:3 主分支 + 完美变体(A/B/C 由 emotional clue 状态决定)
- 新机制首演:partial 价值差异、misread 反用、多结局触发、情感证据、unlock(C003 需 C006+C002)、discoveryLayers(C001/C004/C009/C010)

---

## 10. case-001 现有不足(已知,T3+ 处理)

- 难度简单(教学 case 接受)
- 证据 4 条偏少
- timeline 4 槽 1:1 太机械
- submission 偏表单化
- 结案反馈不够戏剧化(success/failure 文本相同的 T3 任务)
- camera-gap-0731 在 T2 之后两个解读选项体感无差(case 内容缺陷,不是机制 bug)
