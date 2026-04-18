# detective-mini (MVP)

一个基于 **Vite + TypeScript + Phaser** 的网页推理小游戏原型。

## 本地运行

```bash
npm install
npm run dev
```

默认访问地址：<http://localhost:5173/>（若端口被占用，以终端输出为准）。

## 当前 MVP 流程

1. 进入 `MenuScene` 选择案件（`tutorial-001` / `case-001`）
2. 进入 `CaseScene` 查看案件简介、嫌疑人、线索
3. 点击“请求额外线索”解锁更多线索
4. 点击“使用提示”按层级获取提示
5. 选择嫌疑人与关键谎言，并输入作案方式后提交
6. 进入 `ResultScene` 查看评分、评级、判定与真相复盘
