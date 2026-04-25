# skelanim-player 入口

- 先读 `src/features/skelanim-player/SkelAnimCanvas.tsx`，看资源加载、绘制循环和 UI 壳层怎样衔接。
- 动画播放状态与序列选择读 `src/features/skelanim-player/skelanim-canvas-model.ts`。
- 立绘页用的 walk-like 预览挑选逻辑读 `src/features/skelanim-player/walk-selection.ts`。
- 减少动态效果偏好读 `src/features/skelanim-player/useReducedMotionPreference.ts`。
- 几何与帧选择算法读 `src/features/skelanim-player/model.ts`。
- 资源解码与缓存读 `src/features/skelanim-player/asset-loader.ts`、`src/features/skelanim-player/browser-codec.ts`。
- 类型和组件契约只看 `src/features/skelanim-player/types.ts`；不要先扫完整目录。
