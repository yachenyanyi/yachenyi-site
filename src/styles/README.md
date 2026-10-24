# 样式目录

样式由 `index.css` 按明确顺序导入。修改规则见根目录的 `agent.md`。

| 目录 | 职责 |
| --- | --- |
| `foundation/` | 设计变量、文档默认值、基础重置、全站无障碍规则 |
| `shared/` | 明确启用的文字、区块标题、玻璃表面、渐变和出现动画 |
| `components/navigation/` | 页头、语言切换、导航菜单、连续变形及其响应式规则 |
| `components/glass-cube/` | 玻璃方块、文字层级、CSS 降级及其响应式规则 |
| `components/hero/` | 首页介绍区域及其 `proof.css` 信息栏 |
| `components/project-carousel/` | 首页轮播及其 `card.css` 项目卡片 |
| `components/studio-notes/` | 首页实验室卡片和网格 |
| `components/project-card/`、`service-card/`、`lab-card/` | 独立列表页的对应卡片 |
| `components/service-symbol/` | 服务详情页的图标插画 |
| `components/article/`、`about/`、`contact/`、`facts-list/` | 各内容组件 |
| `components/footer/`、`button/`、`page-intro/`、`skip-link/`、`page-loader/` | 对应的单一组件 |
| `pages/home/` | 首页背景及页面布局 |

每个组件目录包含自身的交互、媒体查询和降级规则。共享动画文件不能夹带导航、卡片或其他组件的布局补丁。
