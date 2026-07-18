<!-- auto-todo:begin -->
<!--
auto-todo:policy v1
read: allowed
write: canonical-only
preferred-write-path: auto-todo skill
repair: rebuild
-->
## Auto Todo

- planner scenarioSelection 组件测试失败：组件与测试的详情文案不一致 <!-- auto-todo:id=atd_8019e19b24 -->
  - 记录时间: `2026-07-18T16:51:22+08:00`
  - 类型: issue
  - 备注: tests/component/plannerPage.scenarioSelection.test.tsx:127 期望详情面板出现 /目标区域：175/，但组件 PlannerScenarioSelection.tsx:359 实际渲染的是 "175 区完成"（t({zh:`{area} 区完成`})），不含 "目标区域：" 前缀。
    - 性质：pre-existing 文案不一致（改了组件文案未同步测试，或反之），与本次 lint 清债、依赖升级均无关（stash 验证：无 lint 改动也失败）
    - 影响：test:regression 的 test 阶段仍有 1 个失败（lint/typecheck/build/e2e 均绿）
    - 处置：需 planner 特性作者确认详情面板应展示 "目标区域：{area}" 还是 "{area} 区完成"，再对齐组件或测试

<!-- auto-todo:end -->
