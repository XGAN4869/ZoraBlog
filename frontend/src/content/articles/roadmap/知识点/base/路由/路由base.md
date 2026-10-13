### 路由传参
query 路径传参记得 encodeURIComponent 然后 decodeURIComponent,

### 路由模式
#### 前置知识
- 浏览器？
	**浏览器 = 一个运行平台 / 应用程序**
	它内置了一整套能力：
	1. HTTP/HTTPS 客户端（负责发请求、接收服务器响应）
	2. DOM、CSS 渲染引擎，执行 JS 虚拟机
	3. Web API：`location`、`history`、hash、localStorage、Fetch、WebSocket 这些
	4. 网络栈，遵循 HTTP 协议做网络传输
- 浏览器 + Router
	1. 第一层：网络传输（HTTP，浏览器 ↔ 后端服务器）
- 浏览器访问URL：
	`https://example.com/user?id=10#detail`
	服务器实际收到的内容类似：
	`GET /user?id=10 HTTP/1.1 Host: example.com`
	服务器看不到 `#detail`。
#### 两种模式
- hash 模式
	1. 路由信息保存在：浏览器 `location.hash`
	2. 地址栏显示：`#/user/list`，# 号会出现在地址栏
	3. 刷新页面，**不需要服务器特殊配合**。刷新浏览器，请求永远只请求根路径 `/`，后端直接返回 index.html，vue 接管 # 后面路由。
- history 模式
	1. 路由信息保存在：浏览器 History API
	2. 地址栏显示干净：/user/list，没有#
	3. 服务器能看到完整 URL /user/list
	4. 浏览器请求的时候把完整路径全部带给后端服务器。
	5. 刷新页面必须后端 /nginx 特殊配置配合，会发起 GET 请求
- 