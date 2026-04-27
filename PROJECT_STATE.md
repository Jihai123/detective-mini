# PROJECT_STATE.md
> 项目交接状态文档 | 最后更新:T2.6 (机制铺垫 A+B) 完成,已合并 main

---

## 0. 使用方法

新对话开场白模板:

"我在做侦探推理游戏 detective-mini。T0 + T1 + T1.5 + T2 + T2.5 + T2.5.1 + T2.6 已完成并合并 main。下面是完整项目状态文档,请先读完复述核心信息,然后我给你下一个任务。"

---

## 1. 项目基本信息

- **项目名**:detective-mini
- **类型**:浏览器端侦探推理游戏
- **技术栈**:TypeScript + Vite,原生 innerHTML 渲染,无框架
- **主入口**:src/main.ts → CaseSelector → src/stage1/app.ts(StageOneApp class)
- **当前分支**:main(T2.6 已合)
- **Bundle**:JS gzip ~21.95 kB,CSS gzip ~6.61 kB

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
- 4 outcome:canonical(won) / partial(draw) / misread(lost+flag) / irrelevant(无 cost)
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

### 🟢 P2 技术债
- getCharacterVisual 函数已退化为透传
- emotion 字段在 dialogue overlay 未生效(T8 处理)
- hintCount / wrongSubmissionCount 累加但未评分使用
- dialogueState 字段在 loadStageSave 未校验
- preResults 计算用 counterEvidenceId 是 T1 遗留双轨判定,Bug 1 修复后已是死代码,T3 清理(已加 TODO)
- handleConfrontationEnd 失败分支已完整重置;架构上仍存在"未来不经 startConfrontation 入口会出 bug"的隐患(目前不存在该入口,记录待观察)

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
- ⏳ **T2.7** case 导入架构(JSON + 素材命名约定自动加载,case-001 回归)
- ⏳ **T2.8** case-002 数据化(三份剧本文档 → TS/JSON 数据)
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

---

## 9. 下一步:T2.7 case 导入架构

### 决策记录
- T2.6 已合 main,case-002 机制地基全部到位
- 下一步 T2.7:把 case 数据从 TS 文件外置为 JSON,建立素材命名约定让新 case 加载零代码改动
- T2.7 完成后 T2.8 把 case-002 三份剧本文档塞入 JSON

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
