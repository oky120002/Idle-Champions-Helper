# 护送占位槽位锁定

**优先级**：劣后

## 是什么

护送任务（`slot_escort` / `slot_escort_by_area` / `slot_escort_wandering` mechanic）中，非英雄单位（鸡 / 小鬼 / VIP / Drizzt 等）占据一个阵型槽位。完整建模需：锁定该槽不放入英雄、并纳入护送目标（若为英雄）的能力贡献。

## 为何暂缓

游戏官方导出数据**未标注护送目标占据的具体槽位**——`formations.json` 的槽位只有位置字段（`row` / `column` / `x` / `y` / `adjacentSlotIds`），无「护送槽」标记；`variant.mechanics` 只给 `slot_escort` 布尔标志，不给槽位 id。无可靠数据源推断具体占位，所有阵型按全槽可用处理。

要精确实现，需补一张「护送关卡 → 护送目标占哪个槽」的映射。游戏客户端运行时知道（玩家可见），但未进入导出的 JSON。两条路：翻 `data:fetch` 拉下的完整原始 dump 逐字段找是否有未提取的字段；或人工校准各护送关。

## 关联

- `scripts/data/build-models.test.ts`（护送占位全槽可用处理的测试注释）
