# LiquidGlass

共用组件：`src/components/LiquidGlass.astro`。效果按 iOS Liquid Glass 的透明透镜、边缘折射、轻微色散及镜面高光设计，不是彩色渐变面板。

## 使用

```astro
<LiquidGlass class="hero-proof">内容</LiquidGlass>
<LiquidGlass as="section" class="home-contact">内容</LiquidGlass>
```

图片上的文字面板：祖先增加 `data-liquid-scene`，原图增加 `data-liquid-source`；向组件传入同一图片的 `image` 地址并使用 `variant="strip"`。文字保留为真实 DOM，不复制、不折射。轮播克隆的实例通过观察新增节点自动注册。

## 统一修改

- `src/styles/components/liquid-glass/index.css`：默认圆角、透镜边缘宽度、折射强度、RGB 色散、透明度、明暗、CSS 高光及降级。
- `renderer.ts`：共享 WebGL 圆角透镜着色器；只创建一个 GPU 上下文，分别绘制各实例的装饰画布。
- `backdrop.ts`：对齐的背景照片或卡片原图、缓存及纹理采样坐标。
- `index.ts`：可见性、尺寸变化、指针高光及动态实例生命周期。

所有调用都使用这套实现，页面/卡片 CSS 只负责布局与文字。运行中更新 CSS 材质变量后，可发送 `window.dispatchEvent(new Event('liquid-glass:refresh'))` 刷新所有可见实例。

渲染在滚动、尺寸或光照改变时更新，不为静止面板持续绘制。不可见实例不渲染；缓存及画布像素数有上限。手指事件不拦截滚动；减少动态效果时光照保持静止；减少透明度时使用实色。无 WebGL 时回退到 CSS 透明、模糊和高光，回退路径不宣称拥有真实折射。

首页接入范围：信息栏、项目卡片文字面板、工程笔记文字面板、合作区。页脚沿用原材质，首页正方体沿用独立实现。

## 实现资料

- [Liquid Glass in the Browser: Refraction with CSS and SVG](https://kube.io/blog/liquid-glass-css-svg/)：折射、表面轮廓与边缘高光；其 SVG backdrop 示例有浏览器限制。本组件独立使用 WebGL 装饰层实现透镜，不依赖该 SVG 支持。
- [MDN backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter)：CSS 背景模糊与降级。
