# 首页 Typography

复用已安装的 Inter Variable 和 JetBrains Mono Variable，不额外加载字体。站点导航和文章入口使用正文字体，终端使用 `--mono`。当前首页仅保留一个全屏 Terminal Hero。

## 首页 Terminal

首屏使用 Magic UI Terminal 的本地适配组件，字体沿用 `--mono` 的 JetBrains Mono Variable。所有终端行统一为 `--text-small`（14px）/ 22px，字重 400；`Hi, Zora.` 保持 h1 语义，字号同样为 14px，仅以字重 500 和蓝色区分。高度不超过 580px 的紧凑视口使用 20px 行高，手机不放大字号。

入场顺序为逐字输入 `> link start` → 两条绿色状态行弹入 → 蓝色 `Hi, Zora.` → 灰色欢迎语逐字打印。命令和标题每字符 55ms，欢迎语每字符 35ms；状态行各用 300ms。播放结束后隐藏光标，边框呈现轻微蓝色光晕，文章入口始终可点击。状态文案是入场动画，不表示真实服务器连接或身份验证结果。

深色模式：成功状态 `#4ade80`、欢迎标题 `#60a5fa`；亮色模式采用对比度更高的 `#15803d`、`#2563eb`。命令使用正文前景色，结尾使用 `--muted-foreground`。手机为结尾预留三行高度，避免打字过程中布局跳动。减少动态效果模式下直接显示全部内容、停用光标闪烁和边框过渡；终端标题保持完整的可访问名称。

## 首页圆角

终端使用 `--home-radius-12`（12px），手机和紧凑高度视口使用 `--home-radius-8`（8px）；文章入口按钮为直角。样式集中在 `src/pages/Home.css`。
