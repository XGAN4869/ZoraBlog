# Zora's Room Typography

复用已经安装的 `@fontsource-variable/inter`。英文使用 Inter Variable，中文沿用项目 `Microsoft YaHei` 字体回退；通过 `--font-heading`、`--font-body` 引用，不额外加载字体。JetBrains Mono 保留给代码内容，不用于模块文字。

| 角色 | 桌面字号 / 行高 | 手机字号 / 行高 | 字重 | 字距 |
| --- | --- | --- | --- | --- |
| Section 标题 | 48px / 56px | 36px / 44px | 600 | -0.03em |
| 模块标题 | 32px / 40px | 28px / 36px | 600 | -0.02em |
| 说明正文 | 16px / 24px | 14px / 22px | 400 | 默认 |
| 详情辅助文字 | 14px / 20px | 14px / 20px | 400 | 默认 |

紧凑适配：桌面视口高度不超过 760px 时，Section 标题为 40px / 48px，模块标题为 28px / 36px，正文为 14px / 22px；手机视口高度不超过 740px 时，Section 标题为 32px / 40px；视口宽度不超过 360px 时，模块标题为 24px / 32px。

所有模块使用同一套标题与正文规格，不随卡片面积改变字号。模块文字水平、垂直居中，标题与说明间距 12px。模块组在内容区域左上方有序排列，保留大圆角和粗外框；模块内不包含图片、图标、插画或渐变背景。

实现位于 `src/pages/Home.css` 的 `--studio-*` 字体变量和 `.studio-module-*` 类；默认规格复用项目已有的 `--text-heading`、`--line-heading`、`--text-body`、`--line-body`、`--text-small`、`--line-caption`。模块标题通过 `role="heading" aria-level="3"` 保持标题层级，同时让按钮内的文本结构符合 HTML 内容约束。
