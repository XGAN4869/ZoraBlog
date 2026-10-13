# Zora's Room Typography

复用已经安装的 `@fontsource-variable/inter`。英文使用 Inter Variable，中文沿用项目 `Microsoft YaHei` 字体回退；通过 `--font-heading`、`--font-body` 引用，不额外加载字体。JetBrains Mono 保留给代码内容，不用于模块文字。

| 角色 | 桌面字号 / 行高 | 手机字号 / 行高 | 字重 | 字距 |
| --- | --- | --- | --- | --- |
| Section 标题 | 48px / 56px | 36px / 44px | 600 | -0.03em |
| 模块标题 | 32px / 40px | 28px / 36px | 600 | -0.02em |
| 详情正文 | 16px / 24px | 14px / 22px | 400 | 默认 |
| 详情辅助文字 | 14px / 20px | 14px / 20px | 400 | 默认 |

紧凑适配：桌面视口高度不超过 760px 时，Section 标题为 40px / 48px，模块标题为 28px / 36px，正文为 14px / 22px；手机视口高度不超过 740px 时，Section 标题为 32px / 40px；视口宽度不超过 360px 时，模块标题为 24px / 32px。

所有模块使用同一套标题规格，不随卡片面积改变字号。主模块只显示水平、垂直居中的标题，不显示副标题或提示小字；正文与辅助文字规格用于详情弹窗。模块组在内容区域左上方有序排列，保留大圆角和粗外框；模块内不包含图片、图标、插画或渐变背景。

实现位于 `src/pages/Home.css` 的 `--studio-*` 字体变量和 `.studio-module-*` 类；默认规格复用项目已有的 `--text-heading`、`--line-heading`、`--text-body`、`--line-body`、`--text-small`、`--line-caption`。模块标题通过 `role="heading" aria-level="3"` 保持标题层级，同时让按钮内的文本结构符合 HTML 内容约束。

## 首页 Terminal

首屏使用 Magic UI Terminal 的本地适配组件，标题和输出均沿用 `--mono` 的 JetBrains Mono Variable。`Hi, Zora.` 复用标题规格：桌面 32px / 40px，手机 28px / 36px，字重 600，字距 -0.02em。第二行输出 `Here to explore your world, one moment at a time.`，复用正文规格 16px / 24px，字重 400，以颜色和字号区分主次。标题完成后，第二行按每字符 35ms 逐字打印；手机预留三行高度以避免打字时布局跳动。终端标题保持完整的可访问名称；减少动态效果模式下直接显示全部内容并停用光标闪烁。

## 首页圆角

首页共用 `--home-radius-*` 档位：48、40、32、24、16、12、8px。房间卡片以实际短边选择档位，相同尺寸保持一致；阴影容器与外框使用同一个圆角值，不把小模块做成胶囊形。

| 卡片短边 | 圆角 |
| --- | --- |
| ≥ 640px | 48px |
| ≥ 520px | 40px |
| ≥ 400px | 32px |
| ≥ 300px | 24px |
| ≥ 200px | 16px |
| ≥ 128px | 12px |
| < 128px | 8px |

终端使用 12px，手机和紧凑高度视口为 8px；两个首屏入口按钮统一为直角。详情弹窗使用 16px。卡片尺寸变化由 CSS Container Query 自动选择档位，保持同一套比例规则。
