# PROJECT_STATE.md
> 项目交接状态文档 | 最后更新:T2 证据解读阶段完成,已合并 main

---

## 0. 使用方法

新对话开场白模板:

"我在做侦探推理游戏 detective-mini。T0 地基 + T1 对质系统 + T1.5 多 case 架构 + T2 证据解读已完成并合并 main。下面是完整项目状态文档,请先读完复述核心信息,然后我给你下一个任务。"

---

## 1. 项目基本信息

- **项目名**:detective-mini
- **类型**:浏览器端侦探推理游戏
- **技术栈**:TypeScript + Vite,原生 innerHTML 渲染,无框架
- **主入口**:src/main.ts → src/stage1/app.ts(StageOneApp class,~1200 行)
- **当前分支**:main(T2 已合并)
- **Bundle**:约 50 kB JS

---

## 2. 项目定位

- **目标**:轻量侦探推理游戏(Ace Attorney Lite 风格)
- **对标**:Ace Attorney / Return of the Obra Dinn / Her Story
- **核心哲学**:承诺机制 - 玩家推理必须被结构化输入系统

---

## 3. 游戏流程(六阶段 + overlay 系统)

archive → intro → investigation → confrontation → deduction → result

Overlay(非 screen):dialogue / inspect / hint / **interpret**(T2 新增)

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

### ✅ T2 证据解读阶段(刚完成)

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

---

## 5. 核心架构真相

### 数据驱动
- ✅ 图片路径、confrontation、emotionPortraits 数据驱动
- ✅ case 数据层完全可扩展(CASE_REGISTRY)
- ✅ **证据解读三档机制**(T2 后)
- ❌ archive / intro 文案硬编码(T4 修)
- ❌ deduction submission 选项卡片化但字段名硬编码(T3 修)
- ❌ result 页部分写死(T3 修)
- ❌ status bar 地点时段硬编码(T4 修)
- ✅ tutorialMode 字段已接入(case-001 二档简化已生效)

### 关键已知机制
- SAVE_VERSION = 4,向下兼容 v2 / v3 存档(链式 migration)
- confrontation 进入需:所有 key clue 已收集 + 已解读
- 解读支持重选(无锁定,T3+ 再考虑锁定)
- misread 解读的 clue 在 confrontation 中无法击中任何 sentence(attacksTestimonyIds=[])
- timeline 槽位 4 个,与 4 条 key clue 1:1 对应
- 滚动位置 across renders 保持
- main.ts 硬编码 caseId='case-001'(T2.5 前单 case 入口)

---

## 6. KNOWN_ISSUES 清单

### 🔴 P0 阻塞
(已清空,T2 修了 P0 死路径 bug + 双轨判定 bug)

### 🟡 P1 UX
- **dialogue overlay 长文本无滚动条**:对话内容超出可视区时显示不全(T1 遗留,未在 T2 修)。修复方向:CSS 加 max-height + overflow-y。最迟在 T2.5 一并修,或下个 fix-up commit。
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

- **tutorial 难度(case-001)**:✅ T0+T1+T1.5+T2 已满足
- **normal 难度(case-002 目标)**:可能需要 T2.5 + 部分 T3/T6
- **hard 难度(case-003+)**:需要 T7 + T11 + T12

T3-T15 是"为 case 解锁的素材库",非线性清单。

### P0 级(核心玩法,normal 难度门槛)
- ⏳ T2.5:主界面 case 选择页(从硬编码入口改为 case 选择)
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

### 测试纪律
- 每个 T 的验收必须有一次"玩家不按剧本走"的实测
- Code 的静态验证 + tsc 全绿 + 正常路径覆盖不到异常流程
- P0 bug 通常在异常路径被发现
- **状态机 bug** 必须做 mental simulation 而不是只看代码片段

### T2 期间形成的新经验
- **本地拉远程分支**:用 `git checkout feat/xxx`(分支同名时会自动追踪),或 `git checkout -b feat/xxx origin/claude/xxx-XXX`(改名一步到位)
- **浏览器验收必备步骤**:Ctrl+Shift+R 硬刷新 + F12 console `localStorage.clear()` + 重启 dev server
- **Code 诊断含"如果"两字时**:它没真的验证,要求做 mental simulation
- **双轨判定隐患**:当新机制(attacksTestimonyIds)上线时,要排查所有引用旧机制(counterEvidenceId)的地方,否则会出"行为对但音效/反馈错"的细微 bug

---

## 9. 下一步:决策点

### 选项 A:T2.5 主界面 case 选择页
- 工作量:半天
- 内容:把入口从硬编码 archive 改为 case 选择页,显示 case-001 卡片 + case-002 占位
- 顺手:修 P1 dialogue overlay 滚动 bug
- 价值:为 case-002 上线铺路

### 选项 B:case-002 数据化(直接铺剧本)
- 工作量:1-2 天
- 前提:case-002 剧本已完稿,evidence.md 文案已生成(剧本对话产出)
- 内容:把剧本三档解读文案塞进 TypeScript 数据
- 风险:case-002 剧本暴露的"前置解锁"(C003)、"发现深度"(C009)、"情感证据"(医院缴费单)等机制,T2 schema 留了字段但 runtime 未实装,需要决定:砍剧本 / 推 T5/T6 优先实装机制
- 价值:让 case-002 真正可玩

### 选项 C:补 P1 + 局部技术债
- 修 dialogue overlay 滚动
- preResults 清理(虽然有 TODO 留给 T3)
- emotion 字段在 dialogue overlay 接入
- 价值:体验抛光,但不解锁新内容

**推荐顺序**:A → 决策 B 还是先做 T3/T6 给 case-002 铺机制 → 然后 case-002 数据化 → 上线

---

## 10. case-001 现有不足

- 难度简单(教学 case 接受)
- 证据 4 条偏少
- timeline 4 槽 1:1 太机械
- submission 偏表单化
- 结案反馈不够戏剧化
- camera-gap-0731 在 T2 之后两个解读选项体感上无差(因为它本身不参与对质,无论选哪个都不影响 confrontation 行为)——case 内容缺陷,不是机制 bug

---

## 11. case-002 筹备状态

### 已完成
- 📝 剧本完稿(独立剧本对话打磨)
- 📝 文案素材清单部分产出:evidence.md(10 条证据三档解读)、testimony-and-scene.md(嫌疑人证词 + 场景)、ending.md(陈昊独白)

### 待启动
- 📦 数据结构化(塞进 TypeScript):等启动 case-002 任务时由 Claude Code 执行
- 🎮 上线集成:等 T2.5 主界面做完后可选择入口启动

### 设计目标
- 难度:normal
- 证据:8-12 条,三档解读(canonical + partial + misread)
- 嫌疑人:3-5 人(陈昊、王凯、李婷),其中陈昊是真凶
- 结局:2-3 个分支
- 新机制首次亮相:partial 解读价值差异、多结局触发、情感证据(医院缴费单)

### 剧本暴露的机制依赖(需评估)
- **证据前置解锁**(如 C003 需要 C006+C002 才能发现):T2 schema 已预留 `unlockRequirement` 字段但 runtime 未实装。需在 T6 或单独 T 实装,或在数据化时砍掉这层依赖。
- **证据发现深度**(如 C009 需要"送检指纹"才得到完整信息):T2 schema 已预留 `discoveryLayers` 字段但 runtime 未实装。需 T5 实装,或砍成单层。
- **情感证据**(医院缴费单不参与对质,只影响 result):T2 schema 已支持 `role: 'emotional'`,但 result 页对该字段的响应逻辑未实装,需要 T3 deduction/result 重做时一并处理。

### 未来 case 规模参考
case-002 及之后,在 T2-T5 完成的工具链上,用 8-12 条证据 / 5-7 个角色 / 3-4 条动机线索 的尺度设计。