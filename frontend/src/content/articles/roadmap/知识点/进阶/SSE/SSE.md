没打字效果的版本👇
https://blog.csdn.net/meilindehuzi_a/article/details/163000680?fromshare=blogdetail&sharetype=blogdetail&sharerId=163000680&sharerefer=PC&sharesource=&sharefrom=from_link
## SSE 使用场景
**大模型流式输出**（如 ChatGPT 的逐字生成）首选 SSE ；
# 理解 SSE
 `axios.post`，是**“等外卖全部做好再一起吃”**浏览器缓存完所有数据，一次性返回给你**。
数据还在网络上传输，浏览器收到一口（**一个 chunk**），就立刻给你一口
## 对比axios.get/post 写法

| 对比维度       | 第一种写法（可行）                                          | 第二种写法（不可行）                                          |
| ---------- | -------------------------------------------------- | --------------------------------------------------- |
| **数据读取方式** | 使用 `response.body.getReader()` 读取 `ReadableStream` | 如果 `apiChat` 内部用了 `.json()` 或 `axios`，它会等待整个响应体完全下载 |
| **数据到达时机** | 每收到一个 chunk（网络包）就立即触发回调                            | 必须等后端所有数据包传输完毕，才返回最终结果                              |
| **打字机触发**  | 每收到一个 `result` 片段，立即追加并触发打字机                       | 只能在 `res` 拿到完整字符串后，一次性传给打字机                         |
|            |                                                    |                                                     |
## SSE 固定规则针对的是**响应头**
- response header 中的 Content-Type
	规则 1：`Content-Type: text/event-stream`  
	规则 2：`Cache-Control: no-cache`  
	规则 3：`Connection: keep-alive`

## fetch

[使用可读流 - Web API | MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/Streams_API/Using_readable_streams)
原生 `fetch` vs  `axios`
- 差异点
	- **`axios` 默认会自动处理 JSON 响应，它会等着接收完整数据；而 `fetch` 允许我们直接操作底层的“数据流管道”（ReadableStream）**。
	- fetch 的 body 需要手动JSON.stringify() 打包给后端，并且也要提示后端请求头是 application/json。而 axios 是自动包给后端的
```js
  fetch(url, {
    method: 'post',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'   // 👈 告诉后端：我要流式数据，别一次性给我
    },
    body: JSON.stringify(MessageList.value) // 把整个对话历史发给后端
    signal:controller.value.signal
  })
```
- 补充: 请求头Content-type：
	- 如果你发 `Content‑Type: application/json`，后端拿到原始字节，会执行 `JSON.parse()` 把字符串还原成对象。
- 浏览器原生暴露底层流接口：
	```js
	fetch(...).then(res=>{
	  // res.body 就是 ReadableStream，数据流管道
	  const reader = res.body.getReader()
	})
	```
	`res.body` 在**HTTP 响应头回来之后就立刻可用，不需要等待全部响应下载完毕**。
	你可以一点点读字节流，就是你 SSE 代码里的 `reader.read()` 循环。

- 读取方式[Fetch API 教程 - 阮一峰的网络日志](https://www.ruanyifeng.com/blog/2020/12/fetch-tutorial.html)
	1. .json() 异步，一次性读完
	2. `await res.text()` → 把全部响应读完拿大字符串，流关闭
	3. `res.body.getReader()` → 一点点分片读（SSE 流式聊天就用这个）
- abort 一旦用了就不能再用来发请求了
	https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal
## SSE 的基本思路
![[Pasted image 20260808202853.png]]**Note**：这是通过 `fetch POST` 读取 SSE 格式响应，不是浏览器原生 `EventSource`。`EventSource` 主要用于 GET，也不方便携带 JSON 请求体，因此 AI 对话一般用 `fetch + ReadableStream`。



