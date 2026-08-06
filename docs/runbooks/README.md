# runbooks/ 操作手册入口

这里保存当前仍有效、需要照着执行的开发、验证、部署和排障流程。操作变化时原地更新；事故经过与一次性证据放入 `archives/investigations/`。

## 按任务读取

- 启动开发服务或校验 Pages 基线路径：`local-development.md`
- 选择测试范围、运行门禁或排查旧预览进程：`testing.md`
- 初始化、维护或排查 GitHub Pages：`github-pages.md`
- 在本机运行 Playwright：`playwright.md`
- 同步公共数据、局部重建动画或验证资源：`public-data.md`
- GitHub 远端连接异常：`github-connectivity.md`
- 维护文档导航、链接和类型边界：`documentation-maintenance.md`
- 校验阵型模拟器（引擎改动后必跑 `test:simulator`）：`verify-formation-simulator.md`
- 新增/修正英雄 DPS 机制参照（智能体维护工作流）：`add-champion-reference.md`

## 写作规则

- 写可复现的前提、命令、判断和验证，不写某次会话经过。
- 代码或配置是事实源时，只保留入口与操作顺序，不复制大段实现。
- 流程失效后直接重写；只有事故证据或考古价值的旧版本才归档。
