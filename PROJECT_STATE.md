# PROJECT_STATE.md
> 项目交接状态文档 | 最后更新：T1.5 多 case 架构完成，已合并 main，即将进入 T2

---

## 0. 使用方法

新对话开场白模板：

"我在做侦探推理游戏 detective-mini。T0 地基 + T1 对质系统 + T1.5 多 case 架构已完成并合并 main。下面是完整项目状态文档，请先读完复述核心信息，然后我给你 T2 的任务。"

---

## 1. 项目基本信息

- **项目名**：detective-mini
- **类型**：浏览器端侦探推理游戏
- **技术栈**：TypeScript + Vite,原生 innerHTML 渲染,无框架
- **主入口**:src/main.ts → src/stage1/app.ts(StageOneApp class,约 1000 行)
- **当前分支**:main(T1.5 已合并)
- **Bundle**:约 50 kB JS

---

## 2. 项目定位

- **目标**:轻量侦探推理游戏(Ace Attorney Lite 风格)
- **对标**:Ace Attorney / Return of the Obra Dinn / Her Story
- **核心哲学**:承诺机制 - 玩家推理必须被结构化输入系统

---

## 3. 游戏流程(六阶段 + dialogue overlay)

archive → intro → investigation → confrontation → deduction → result

dialogue 是 overlay 不是 screen。其他 overlay:inspect、hint。

---

## 4. 已完成的阶段

### ✅ T0 地基(2024 完成)
- T0-1 清理死代码(删 Phaser 层 / domain 层 / Vite 脚手架)
- T0-2 数据-资源对齐(图片路径真数据驱动)
- T0-3 存档版本号(SAVE_VERSION=2)
- T0-4 UI 容器响应式(scroll + 滚动位置保持)

### ✅ T1 对质系统重构
- T1-A schema 升级:TestimonySentence / Emotion 类型,ConfrontationRound 改为 sentences 数组
- T1-B 对质逻辑重写:先选句再出证据,handleConfrontationEnd 分三种结果
- T1-C UI 完全重写:证词列表、证据栏状态、回合徽章、立绘情绪切换
- T1-D 文案打磨:周岚心理曲线(嘴硬→防御→崩溃),悬念结尾
- T1-E 三轮补丁:前置检查、陈序引导、timeline 清理、滚动容器、选中反馈

### ✅ T1.5 数据层多 case 化(刚完成)
- 新建 `src/cases/` 目录作为 case 内容入口,case 数据从 `src/data/cases/` 迁移
- 引入 CaseMeta / CaseDefinition 类型(difficulty / tutorialMode / order / unlocked)
- CASE_REGISTRY + getCaseById(caseId) API,未知 id 抛错(不 fallback)
- StageOneApp 构造函数改为 options 对象 `{ root, caseId }`
- caseLoader.ts 保留旧 API 作为委托层,app.ts 内部零改动
- SAVE_VERSION 从 2 升到 3,加 v2→v3 migration(caseId fallback 到 'case-001')
- migration 不写回 localStorage,由 persistState 自然写入(代码有注释说明)
- gameplay 类型保留在 src/stage1/types.ts(移动会引发大规模 import 变更,不值得)
- 全部改动 5 个文件内完成,游戏行为与 T1.5 前完全一致

---

## 5. 核心架构真相

### 数据驱动
- ✅ 图片路径、confrontation 对质机制、character emotionPortraits 已数据驱动
- ✅ case 数据层完全可扩展(T1.5 后 CASE_REGISTRY 支持多 case)
- ❌ archive / intro 文案仍硬编码(T4 修)
- ❌ deduction submission 选项是卡片式但字段名硬编码(T3 修)
- ❌ result 页部分写死(T3 修)
- ❌ status bar 地点时段硬编码(T4 修)
- ❌ tutorialMode 字段已定义但 runtime 行为未接入(T2 接入)

### 关键已知机制
- SAVE_VERSION=3,向下兼容 v2 存档(自动升级 + caseId fallback)
- confrontation 支持方案 C 混合模式(缺证据 round 自动 lost)
- timeline 槽位已裁剪到 4 个(与 4 条 key clue 1:1 对应)
- 对质证据栏同时显示 inventory 和 testimonies
- 滚动位置 across renders 保持(scrollTop 保存/恢复)
- main.ts 硬编码 caseId: 'case-001',T2.5 前单 case 入口

---

## 6. KNOWN_ISSUES 清单

### 🔴 P0 阻塞
- **confrontation → deduction 死路径**:玩家未收集完 key clue 就进入 confrontation,方案 C 混合模式允许走完对质,但进入 deduction 后因 inventory 缺证据无法完成时间线,同时无返回入口、无投降入口,流程卡死。
  - 触发条件:inventory 缺 key clue + 强行进入 confrontation + 走完对质到 deduction
  - 修复方案:T2 附带任务处理。主防线是 confrontation 入口前置检查(缺 key clue 阻止进入),备用是 deduction 加"返回调查"按钮
  - 暂解:告知测试者先完成 investigation 再进 confrontation

### 🟡 P1 UX
- submission 4 个分组仍然是表单感,T3 会重做
- archive 页仍然系统化,T4 处理
- 扣分明细不透明(80 分不知道扣哪里)— 可作为 T3 附带任务

### 🟢 P2 技术债
- getCharacterVisual 函数已退化为透传
- emotion 字段在 dialogue overlay 里未生效(T8 处理)
- hintCount / wrongSubmissionCount 累加但未评分使用
- dialogueState 字段在 loadStageSave 中未校验

---

## 7. 改造路线剩余(视角:case 难度驱动)

### 路线视角

不再按 T 序号线性执行,改为按 case 难度解锁需求:

- **tutorial 难度(case-001)**:✅ 当前机制已满足
- **normal 难度(case-002 目标)**:需要 T2 + T2.5,T3/T6 视剧本需求决定
- **hard 难度(case-003+)**:需要 T7 + T11 + T12

T3-T15 是"为 case 解锁的素材库",不是必须按顺序执行的清单。

### P0 级(核心玩法,normal 难度门槛)
- 🔄 **T2:证据解读阶段(下一步)**
- ⏳ T2.5:主界面 case 选择页(T2 完成后做,半天)
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
- 分支命名规范:`feat/t{N}-*` 或 `feat/t{N}.{M}-*`,Claude Code 自动生成的 `claude/*` 分支要手动改名

### 验收强度分层(T2 起启用加速流程)
| 任务类型 | 审查强度 |
|---|---|
| 持久化 / 存档 / migration | 必须代码预审 |
| 新增机制核心逻辑 | 汇报时看代码摘要,不预审 |
| UI / 渲染 / 样式 | 只看跑完效果,不看代码 |
| 类型定义 / 数据 schema | 汇报时看字段,不看实现 |
| 重构 / 搬移 | 只看 git diff 文件数,不看内容 |

### 分支流程
- 每 T 任务在独立分支完成,验收通过才合 main
- 合并使用 `--no-ff` 保留分支历史
- 合并后可删除 feature 分支

### T2 机制决策
- **schema 三档 + runtime 按 tutorialMode 降级**:
  - schema 永久支持 canonical / partial / misread 三档
  - case-001 填二档(canonical + misread),运行时自动按 tutorialMode 简化
  - case-002+ 填三档
- **路线图 case 难度驱动**:
  - T3-T15 是"为 case 解锁的素材库",非线性清单
  - 优先级由下一个要发布的 case 的难度决定

### 测试纪律
- 每个 T 的验收必须有一次"玩家不按剧本走"的实测
- Code 的静态验证 + tsc 全绿 + 正常路径覆盖不到异常流程
- P0 bug 通常在异常路径被发现

---

## 9. 下一步:T2 证据解读

### 设计目标

让"证据"不只是被动收集物,而是玩家必须**主动解读其含义**才能真正获得效力的东西。

让系统第一次真正"知道"玩家推理对不对,而不只是"知道玩家打对了时机"。

### 愿景(schema 永久版)

- 证据收集时只显示标题和描述(如"封套二次开启痕迹")
- 玩家必须主动"解读"这条证据
- 从预定义选项里选含义,分三档:
  - **canonical**(主解读):推理上最锐利,满分,对质时触发证人破防
  - **partial**(次解读):部分对,错过要害,打折计分,对质时证人含混带过
  - **misread**(误读):事实错误或南辕北辙,扣分,对质时反被嘲讽
- 只有解读过的证据才能在对质中使用
- 未解读的证据在证据栏不显示或灰掉

### case-001 运行时行为(因 tutorialMode=true 自动简化)

- 每条 clue 只配 canonical + misread 二档
- confrontation 反应不分叉(对/错二态,贴合 T1 现有逻辑)
- 评分简单版:canonical 满分,misread 零分,不扣惩罚分
- 锁定即终局(不提供 hint 改解读,留给 T3+)
- 理由:教学 case 一次只教一件事,解读机制本身已是新概念,不要同时压上光谱复杂度

### 影响面

- **types.ts**:ClueConfig 加 interpretations 字段(三档结构,partial 可选)
- **case-001 数据**:每条 clue 加二档解读数据
- **app.ts**:新增 interpret 方法 + 状态,根据 tutorialMode 读取不同档数
- **UI**:interpret screen(独立 screen,从证据 tab 点进)
- **confrontation**:evidence 取用前检查是否已解读,未解读则不可选

### 子任务拆分(初步)

- **T2-A**:数据 schema + interpret 逻辑
- **T2-B**:interpret UI(独立 screen 从证据 tab 进入)
- **T2-C**:和 confrontation 集成 + case-001 二档数据填充
- **T2-附带**:修 KNOWN_ISSUES P0(confrontation 前置检查 + deduction 返回按钮)

### 范围预估

- 工作量估计:2-3 天(加速流程)
- 改动文件预估:每个子任务 3-5 个文件

### T2 之后

- **T2.5 主界面 case 选择页**(半天):把入口从硬编码 archive 改为 case 选择页,显示 case-001 卡片,为 case-002 留位置
- 然后决策点:启动 case-002,还是先补 T3/T6 给 normal 难度铺机制

---

## 10. case-001 现有不足

- 案件难度简单(用户已明确认同,作为教学 case 可接受)
- 证据 4 条太少(T2 解读改造后更明显)
- timeline 4 个槽是 1:1 太机械(未来 case 应该 5-8 条证据 + 6-10 个时间节点)
- submission 选项偏表单化
- 结案反馈不够戏剧化

---

## 11. case-002 筹备状态

### 进行中
- 📝 剧本创作:已完稿(由独立剧本对话打磨)
- 📝 文案素材清单:由剧本对话整理中(证据 / 证词 / 场景 / 结局)
- 🎨 美术素材:未开始(策略:立绘 AI 生成,场景 AI 生成,音乐网上找)

### 待启动
- 📦 数据结构化(塞进 TypeScript):等 T2 schema 确定后由 Claude Code 执行
- 🎮 上线集成:等 T2.5 主界面做完后可选择入口启动

### 设计目标
- 难度:normal
- 证据:8-12 条,三档解读全填
- 嫌疑人:3-5 人,2 人以上可对质
- 结局:2-3 个分支
- 新机制首次亮相:三档解读的 partial 价值差异、多结局触发

### 未来 case 规模参考
case-002 及之后,应在 T2-T5 完成的工具链上,用 **8-12 条证据 / 5-7 个角色 / 3-4 条动机线索** 的尺度来设计。