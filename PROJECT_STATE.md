# PROJECT_STATE.md
> 项目交接状态文档 | 最后更新:T2.5 case 选择页 + per-case 存档 namespace 完成,已合并 main

---

## 0. 使用方法

新对话开场白模板:

"我在做侦探推理游戏 detective-mini。T0 地基 + T1 对质系统 + T1.5 多 case 架构 + T2 证据解读 + T2.5 case 选择页与 per-case 存档 已完成并合并 main。下面是完整项目状态文档,请先读完复述核心信息,然后我给你下一个任务。"

---

## 1. 项目基本信息

- **项目名**:detective-mini
- **类型**:浏览器端侦探推理游戏
- **技术栈**:TypeScript + Vite,原生 innerHTML 渲染,无框架
- **主入口**:src/main.ts → CaseSelector → src/stage1/app.ts(StageOneApp class,~1200 行)
- **当前分支**:main(T2.5 已合并)
- **Bundle**:JS gzip ~19.2 kB,CSS gzip ~5.7 kB

---

## 2. 项目定位

- **目标**:轻量侦探推理游戏(Ace Attorney Lite 风格)
- **对标**:Ace Attorney / Return of the Obra Dinn / Her Story
- **核心哲学**:承诺机制 - 玩家推理必须被结构化输入系统

---

## 3. 游戏流程(六阶段 + overlay 系统)

selector → archive → intro → investigation → confrontation → deduction → result

Overlay(非 screen):dialogue / inspect / hint / interpret

---

## 4. 已完成的阶段

### ✅ T0 地基
- T0-1 清理死代码
- T0-2 数据-资源对齐
- T0-3 存档版本号(SAVE_VERSION 起始 2)
- T0-4 UI 容器响应式

### ✅ T1 对质系统重构
- T1-A schema 升级:TestimonySentence / Emotion 类型
- T1-B 对质逻辑重写:先选句再出证据
- T1-C UI 完全重写:证词列表、证据栏、回合徽章、立绘情绪
- T1-D 文案打磨
- T1-E 三轮补丁

### ✅ T1.5 数据层多 case 化
- 新建 `src/cases/` 作为 case 内容入口
- CaseMeta / CaseDefinition 类型(difficulty / tutorialMode / order / unlocked)
- CASE_REGISTRY + getCaseById API
- StageOneApp 构造函数改为 options 对象
- caseLoader 委托模式,app.ts 零改动
- SAVE_VERSION 2→3 + v2→v3 migration

### ✅ T2 证据解读阶段

**T2-数据层**
- ClueInterpretation / ClueInterpretations / ClueRole / InterpretationState 类型引入
- ClueConfig 扩展:role / interpretations / discoveryLayers (T5 预留) / unlockRequirement (T6 预留)
- StageRuntimeState 和 StageSaveData 加 `interpretations: InterpretationState`
- SAVE_VERSION 3→4 + v3→v4 migration(interpretations 默认空数组)
- case-001 数据填二档(canonical + misread,因 tutorialMode=true)
- 4 条 clue 的 attacksTestimonyIds 反推自 T1 的 counterEvidenceId

**T2-UI 层**
- interpret overlay 实装(从证据 tab 进入,顶部 clue 标题 + 描述,中部解读选项,底部确认)
- 选项排序:用 clueId 字符串哈希对档数取模,跨 session 稳定
- 选项**不显示档位名称**,玩家不知道哪个是 canonical
- investigation 证据 tab 改造为 clue card 卡片 + 已解读/未解读 徽章
- confrontation 证据栏只显示已解读的 clue
- 攻击判定改用 attacksTestimonyIds(canonical / misread 等价档位独立判定)
- canEnterConfrontation 前置检查:所有 isKey clue 必须**已收集且已解读**(P0 修复)
- 进对质按钮根据 canEnterConfrontation 动态 disabled + 灰显
- deduction 加"返回调查"按钮(P0 备用逃生口)
- handleConfrontationEnd 失败分支完整重置 confrontation runtime 状态(Bug 2 修复)
- bindEvents 行 1213 SFX 判定改用 attacksTestimonyIds(双轨判定 bug 修复)
- preResults 死代码加 TODO(T3 清理)

### ✅ T2.5 case 选择页 + per-case 存档 namespace

**主导流改造**
- main.ts 启动时 `migrateLegacySave()`(包 try/catch)→ 实例化 CaseSelector → 用户选 case 后 dispose CaseSelector → 实例化 StageOneApp({ root, caseId, onExit })
- StageOneApp 加 onExit 参数 + `dispose()` 方法(停音频 + clearInterval)
- archive 屏头部加"← 返回选择"按钮调用 onExit
- main.ts 修了一处 TS null-narrowing(`const root: HTMLElement = rootOrNull` 帮助 closure 内 narrowing)

**CaseSelector 实装**
- case-001 可点(有存档显"继续调查",无存档显"导入案件")
- case-002 灰显"即将上线",不可点
- 文件:`src/case-selector/case-selector.ts`

**存档 namespace 化**
- 删除 `SAVE_KEY` 常量,新增 `getSaveKey(caseId): string`,key 格式 `detective-mini.stage1.save.{caseId}`
- `loadStageSave` / `saveStageState` 签名加 caseId 参数
- app.ts:646 `restartCase` 中硬编码 key 改用 `getSaveKey(this.caseId)`
- 全仓库 grep 确认裸字符串字面量只剩 saveStore.ts 内 2 处(LEGACY_SAVE_KEY 常量 + getSaveKey 模板字符串)

**Migration 链**
- SAVE_VERSION 4→5
- `migrateLegacySave()`:启动一次性迁移。检测旧无 namespace key `detective-mini.stage1.save`,有则读出原始数据 → 写入 `getSaveKey('case-001')`,删旧 key。**新 key 已存在时不覆盖**,只删旧 key
- `migrateSaveV4toV5()`:数据结构 no-op,仅 bump saveVersion
- 链式派发:v5 直接用 / v4 跑 V4→V5 / v3 跑 V3→V4→V5 / v2 跑 V2→V3→V4→V5 / 其余丢弃

**Schema 微调**
- `CaseDefinition.config` 改为可选,locked case 仅带 meta 不带剧本数据
- 唯一访问点 `caseLoader.ts:49` 的 `getCaseById(caseId).config!` 只在 StageOneApp 内调用,而 StageOneApp 只在 unlocked case 被点击后实例化,断言安全

**Bundle 影响**
- JS gzip 14.05 → 19.24 kB(+5.19 kB)
- CSS gzip 4.69 → 5.68 kB(+0.99 kB)

---

## 5. 核心架构真相

### 数据驱动
- ✅ 图片路径、confrontation、emotionPortraits 数据驱动
- ✅ case 数据层完全可扩展(CASE_REGISTRY)
- ✅ 证据解读三档机制(T2)
- ✅ case 选择页主导流(T2.5,main.ts 不再硬编码 caseId)
- ✅ 存档 per-case namespace(T2.5)
- ❌ archive / intro 文案硬编码(T4 修)
- ❌ deduction submission 选项卡片化但字段名硬编码(T3 修)
- ❌ result 页部分写死(T3 修)
- ❌ status bar 地点时段硬编码(T4 修)
- ✅ tutorialMode 字段已接入(case-001 二档简化已生效)

### 关键已知机制
- SAVE_VERSION = 5,向下兼容 v2 / v3 / v4 存档(链式 migration)
- 存档 key:`detective-mini.stage1.save.{caseId}`,启动时一次性 legacy migration 把无 namespace 旧 key 迁到 case-001
- main.ts 由 CaseSelector 主导,case 切换通过 dispose/重新挂载完成
- confrontation 进入需:所有 key clue 已收集 + 已解读
- 解读支持重选(无锁定,T3+ 再考虑锁定)
- misread 解读的 clue 在 confrontation 中无法击中任何 sentence(attacksTestimonyIds=[])
- timeline 槽位 4 个,与 4 条 key clue 1:1 对应
- 滚动位置 across renders 保持

---

## 6. KNOWN_ISSUES 清单

### 🔴 P0 阻塞
(已清空)

### 🟡 P1 UX
- **音乐播放有错误情况**(T2.5 验收发现):具体场景待复现。可能涉及 case 切换 / dispose 音频清理 / archive→investigation 音轨衔接。需要复现步骤后定位。T2.5.2 单独处理。
- **selector 页视觉抛光**(T2.5 验收发现):
  - "档案室"标题与 selector 语义重叠("返回选择"指向自身,但当前页就是选择页)
  - 三栏等宽但内容密度严重失衡(左卡重,右两卡空)
  - selector 与 archive 视觉几乎相同,玩家分不清在哪一层
  - **历史遗留**:selector 中间存在第三张卡("评审室失页事件/教学档案"),T2.5 前就存在,实际行为与 case-001 完全相同。t2.5.1 一并清理或明确身份。
  - 修复任务:T2.5.1
- **dialogue overlay 滚动**(P1 描述与事实不符):T2.5 盘点显示 `article` + `.dialogue-options` 已有 overflow:auto。原 P1 描述可能过期或仅在某分辨率/内容长度组合下复现。需具体复现步骤后定位真问题。延后处理,不阻塞主线。
- submission 4 个分组仍是表单感,T3 重做
- archive 页系统化,T4 处理
- 扣分明细不透明,T3 附带任务

### 🟢 P2 技术债
- getCharacterVisual 函数已退化为透传
- emotion 字段在 dialogue overlay 未生效(T8 处理)
- hintCount / wrongSubmissionCount 累加但未评分使用
- dialogueState 字段在 loadStageSave 未校验
- preResults 计算用 counterEvidenceId 是 T1 遗留双轨判定,Bug 1 修复后已是死代码,T3 清理(已加 TODO 注释)
- handleConfrontationEnd 失败分支已完整重置,但**架构上**仍存在"如果未来有不经 startConfrontation 的对质入口会出 bug"的隐患——目前不存在此入口,记录待观察

---

## 7. 改造路线剩余(case 难度驱动)

### 路线视角

按 case 难度解锁需求执行,不按 T 序号线性:

- **tutorial 难度(case-001)**:✅ T0+T1+T1.5+T2+T2.5 已满足
- **normal 难度(case-002 目标)**:可能需要部分 T3/T6,以及视情况的 T2.5.1 / T2.5.2 抛光
- **hard 难度(case-003+)**:需要 T7 + T11 + T12

T3-T15 是"为 case 解锁的素材库",非线性清单。

### 抛光小任务(可穿插主线)
- ⏳ T2.5.1:selector 视觉抛光 + 历史遗留中卡处理 + selector/archive 视觉区分
- ⏳ T2.5.2:音乐 bug 排查(待复现步骤)

### P0 级(核心玩法,normal 难度门槛)
- ⏳ T3:deduction 结构化重做(Obra Dinn 模式)
- ⏳ T4:清除系统语言
- ⏳ T5:热点二段式 + 三态视觉 + 音效

### P1 级(达标,hard 难度素材)
- ⏳ T6:对话 Press/Present 双动词
- ⏳ T7:证词污染 / 证人警觉度
- ⏳ T8:情绪曲线演出分层
- ⏳ T9:笔记本
- ⏳ T10:多结局

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
- 一次任务不改超过 5 个文件
- 执行前必须确认分支
- 分支命名规范:`feat/t{N}-*` 或 `feat/t{N}.{M}-*`,Code 自动生成的 `claude/*` 分支要手动改名(可用 `git checkout -b feat/... origin/claude/...` 一步到位)

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

### T2 机制决策(已实施)
- **schema 三档 + runtime 按 tutorialMode 降级**:case-001 走二档,case-002+ 走三档
- **路线图 case 难度驱动**:T3-T15 是"为 case 解锁的素材库",非线性清单
- **解读不锁定**:T2 阶段允许重选,锁定机制留给 T3+

### T2.5 机制决策(已实施)
- **存档 per-case namespace**:`detective-mini.stage1.save.{caseId}`,而非单一 key 带 currentCaseId,以支持未来"边玩 case-002 边回顾 case-001"
- **CaseDefinition.config 改为可选**:locked case 只携带 meta,无空壳数据
- **case-002 锁定显示**:"即将上线"灰显,玩家有"还有内容"预期
- **CaseSelector 与 StageOneApp 通过 dispose / 重新挂载切换**:不在 DOM 上叠层,避免 listener 泄漏

### 测试纪律
- 每个 T 的验收必须有一次"玩家不按剧本走"的实测
- Code 的静态验证 + tsc 全绿 + 正常路径覆盖不到异常流程
- P0 bug 通常在异常路径被发现
- **状态机 bug** 必须做 mental simulation 而不是只看代码片段

### 跨阶段经验
- **本地拉远程分支**:用 `git checkout feat/xxx`(分支同名时自动追踪),或 `git checkout -b feat/xxx origin/claude/xxx-XXX`(改名一步到位)
- **浏览器验收必备步骤**:Ctrl+Shift+R 硬刷新 + F12 console `localStorage.clear()` + 重启 dev server
- **Code 诊断含"如果"两字时**:它没真的验证,要求做 mental simulation
- **双轨判定隐患**:当新机制(attacksTestimonyIds)上线时,要排查所有引用旧机制(counterEvidenceId)的地方,否则会出"行为对但音效/反馈错"的细微 bug
- **盘点报告暴露过期假设**:T2.5 盘点显示 dialogue overlay 已有滚动,P1 描述与事实不符,顺手把任务摘出避免盲改 CSS
- **Code 越权疑似实为遗留**:T2.5 验收时怀疑 Code 加了第三张卡,实际是 T2.5 之前就存在的历史遗留,先问再判,不要先骂

---

## 9. 下一步:case-002 数据化(已选定)

### 决策记录
T2.5 之后跳过 T2.5.1 / T2.5.2 抛光,直接推进 case-002 数据化。

### 启动前必决三件事(剧本机制依赖评估)
case-002 剧本暴露三个 runtime 缺口,T2 schema 都预留了字段但 runtime 未实装:

1. **证据前置解锁**(C003 需 C006+C002 才能发现):`unlockRequirement` 字段已存在,runtime 未读
2. **证据发现深度**(C009 需"送检指纹"才得完整信息):`discoveryLayers` 字段已存在,runtime 未读
3. **情感证据**(医院缴费单不参与对质,只影响 result):`role: 'emotional'` 已支持,result 页响应逻辑未实装

每条都要决策:**实装机制 / 砍剧本依赖到 MVP / 推迟到后续补丁**。

### 已完成
- 📝 剧本完稿
- 📝 文案素材清单部分产出:evidence.md(10 条证据三档解读)、testimony-and-scene.md(嫌疑人证词 + 场景)、ending.md(陈昊独白)

### 待启动
- 📦 数据结构化(塞进 TypeScript)
- 🎮 上线集成(case-002 unlocked: false → true)

### 设计目标
- 难度:normal
- 证据:8-12 条,三档解读(canonical + partial + misread)
- 嫌疑人:3-5 人(陈昊、王凯、李婷),其中陈昊是真凶
- 结局:2-3 个分支
- 新机制首次亮相:partial 解读价值差异、多结局触发、情感证据

### 未来 case 规模参考
case-002 及之后,在 T2-T5 完成的工具链上,用 8-12 条证据 / 5-7 个角色 / 3-4 条动机线索 的尺度设计。

---

## 10. case-001 现有不足

- 难度简单(教学 case 接受)
- 证据 4 条偏少
- timeline 4 槽 1:1 太机械
- submission 偏表单化
- 结案反馈不够戏剧化
- camera-gap-0731 在 T2 之后两个解读选项体感上无差(因为它本身不参与对质,无论选哪个都不影响 confrontation 行为)——case 内容缺陷,不是机制 bug