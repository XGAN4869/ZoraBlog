```js
<template>
  <div class="h-screen overflow-y-auto overflow-x-hidden flex flex-col">
    <div>
      <t-row :gutter="[8, 8]" class="min-w-2xl">
        <!-- APIKey -->
        <t-col :xl="3" :xs="6">
          <div>
            <select-api ref="apiRef" @chat="getParams"></select-api>
          </div>
        </t-col>
        <!-- modelList -->
        <t-col :xl="3" :xs="6">
          <select-model ref="modelRef" @chat="getParams"></select-model>
        </t-col>

        <!-- 展示模型地址 -->
        <t-col :xl="3" :xs="12">
          <div>
            <!-- TODO:readonly 只读状态 -->
            <t-input value="https://model-router-console.edu-aliyun.com/v1/chat/completions" readonly />
          </div>
        </t-col>

        <!-- 俩按钮 -->
        <t-col :xl="3" :xs="12">
          <div class="flex flex-row gap-2">
            <div class="flex-1">
              <t-button
                class="w-full"
                variant="outline"
                theme="default"
                :disabled="isTyping"
                @click="clearSelectContent"
              >
                <template #icon>
                  <refresh-icon />
                </template>
                <span>刷新</span>
              </t-button>
            </div>
            <div class="flex-1">
              <t-button
                class="w-full"
                variant="outline"
                theme="default"
                :disabled="isTyping || messageList.length === 0"
                @click="clearMessages"
              >
                <template #icon>
                  <delete-icon />
                </template>
                <span>清空</span>
              </t-button>
            </div>
          </div>
        </t-col>
      </t-row>
    </div>

    <!-- 聊天区域 -->
    <div class="mt-4 p-4 flex-1 overflow-y-auto rounded-md border border-gray-300 min-w-2xl">
      <!-- 内层 -->
      <!--TODO: h-screen 改 h-full  -->
      <div class="h-full flex flex-col relative overflow-y-auto z-0">
        <div ref="chatBody" class="flex-1 px-[10px] overflow-y-auto overflow-x-hidden mb-41">
          <!-- 发送前 -->
          <div v-if="messageList.length === 0" class="h-full flex items-center justify-center">
            请选择 ApiKey 和 模型, 开始新的对话吧╰(￣ω￣ｏ)
          </div>
          <!-- 对话部分 -->

          <div v-for="(item, index) in messageList" :key="index" class="mb-5">
            <!-- user -->
            <div class="flex justify-end">
              <div
                v-if="item.role === 'user'"
                class="max-w-[80%] rounded-lg bg-blue-500 px-4 py-3 text-white whitespace-pre-wrap break-words"
              >
                {{ item.content }}
              </div>
            </div>
            <!-- assistant -->
            <div class="flex justify-start">
              <div
                v-if="item.role === 'assistant' && (item.reasoning || item.content || item.error)"
                class="max-w-[80%] rounded-lg border border-gray-300 px-4 py-3 break-words"
              >
                <!-- 思考过程 -->

                <details
                  v-if="item.reasoning"
                  class="text-gray-500 mb-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                  :open="item.status === 'streaming'"
                >
                  <summary class="cursor-pointer">思考总结</summary>
                  <div class="mt-2 text-sm">{{ item.reasoning }}</div>
                </details>
                <!-- 最终 Markdown 回答 -->

                <MdPreview v-if="item.content || item.error" :modelValue="item.content || item.error" />
                <!-- 加载态: 骨架屏 -->
                <div v-if="item.status === 'streaming' && !item.content && isTyping">
                  <t-skeleton theme="paragraph" />
                </div>
              </div>
            </div>
            <!-- 请求失败 -->
          </div>
        </div>
        <div class="absolute left-0 right-0 bottom-4 z-10 px-[10px] min-w-2xl">
          <t-textarea
            v-model="chatMessage"
            class="fix"
            name="description"
            placeholder="输入消息，Enter发送，Shift+Enter换行( ⓛ ω ⓛ *)"
            :autosize="{ minRows: 3, maxRows: 10 }"
            @keydown="handleSubmit"
          ></t-textarea>
          <div class="absolute right-6 bottom-4 z-10">
            <t-button
              :disabled="!chatMessage.trim() && !isTyping"
              :theme="!isTyping ? 'primary' : 'danger'"
              shape="circle"
              class="p-2"
              size="large"
              @click="!isTyping ? handle_message() : stopGenerate()"
            >
              <template #icon>
                <send-icon v-if="!isTyping" />
                <stop-icon v-else />
              </template>
            </t-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import SelectApi from '@/pages/modelDialogue/components/selectApi.vue'
import SelectModel from '@/pages/modelDialogue/components/selectModel.vue'
import { reactive, ref, nextTick, shallowRef } from 'vue'
import { DeleteIcon, SendIcon, StopIcon } from 'tdesign-icons-vue-next'
import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'
import { MessagePlugin } from 'tdesign-vue-next'
import { getToken } from '@/utils/auth/auth.js'

const apiRef = ref(null)
const modelRef = ref(null)

//SSE
//其实 messageList 就是把每次我们要给后端的 messages:[{role:"user",content:chatMessage.value}] 保存成一个永久的会话历史
//发送给后端的消息
const chatData = reactive({})

//保存全部对话(user + assistant)
const messageList = ref([])

//assist 助手发过来的信息显示,前端响应式，处理流式数据( type 打字效果
let assistantMessage = {}

//文本框内容
const chatMessage = ref('')

//聊天区域DOM
const chatBody = ref(null)

//是否正在打字
const isTyping = ref(false)

//用户主动停止 fetch, abort 中断
const controller = shallowRef(null)

const createEmptyChatData = {
  apiKeyId: '',
  model: '',
}

const handleSubmit = (_, context) => {
  const event = context.e
  console.log(event)
  if (event.shiftKey && event.key === 'Enter') {
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault() // 阻止 textarea 换行
    if (isTyping.value) {
      stopGenerate()
    } else {
      handle_message()
    }
  }
}

const getParams = (item) => {
  Object.assign(chatData, item)
}

//刷新select, 用子组件传来的 defineExpose 的 reset 和 refresh
const clearSelectContent = async () => {
  await apiRef.value.resetAndRefresh()
  await modelRef.value.resetAndRefresh()

}

//清空框内内容
const clearMessages = () => {
  if (isTyping.value) {
    MessagePlugin.warning('请先停止当前回答')
    return
  }

  messageList.value = []
  chatMessage.value = ''

  MessagePlugin.success('聊天记录已清空')
}

//自动滚到新消息
const scrollAuto = () => {
  //nextTick 等本轮 DOM 全部渲染完再执行滚动逻辑
  nextTick(() => {
    if (chatBody.value) {
      chatBody.value.scrollTop = chatBody.value.scrollHeight
    }
  })
}

//从SSE中取出data内容
const handle_message = async () => {
  const baseURL = import.meta.env.VITE_BASE_URL
  const url = `${baseURL}/user/modeldialogue`

  //MessagePlugins 提示内容
  if (!chatMessage.value) return MessagePlugin.warning('请输入提问内容')
  if (isTyping.value) return
  if (!chatData.apiKeyId) return MessagePlugin.warning('请选择 ApiKey')
  if (!chatData.model || chatData.model === 'undefined/undefined') return MessagePlugin.warning('请选择模型')

  //user消息: 把对话气泡加到界面上，不用等后端响应
  messageList.value.push({
    role: 'user',
    content: chatMessage.value.trim(),
    // TODO: 判断assistant 成功发送且加载完done, 打字中typing, 错误没发出去error, 用户刚发送 pending
    // TODO: 目的是判断 done 状态, 存放有效字段传递给后端
    status: 'done',
  })
  //1. role 为 user 的部分，用户消息，过滤 done
  const validMessageList = messageList.value
    .filter((item) => item.status === 'done')
    .map((item) => ({
      role: item.role,
      content: item.content,
    }))

  //2. 加入空的 assistant 消息, 目的是专门用于处理流式数据，所以需要获得 messageList 中的 messages 部分的 role 为 assistant 的 **指针**，方便前端直接修改。
  messageList.value.push({
    role: 'assistant',
    content: '',
    reasoning: '',
    status: 'streaming',
    finishReason: null,
    usage: {
      promptTokens: '',
      completionTokens: '',
      totalTokens: '',
    },
    error: '',
  })
  // //3. assistantMessage 是有指针的 MessageList 内的元素
  assistantMessage = messageList.value[messageList.value.length - 1]

  Object.assign(chatData, { messages: validMessageList })

  controller.value = new AbortController()

  try {
    chatMessage.value = ''
    isTyping.value = true
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: getToken(),
        'Content-Type': 'application/json',
        Accept: 'text/event-stream', //告诉后端：我要流式数据，别一次性给我
      },
      body: JSON.stringify(chatData),
      signal: controller.value.signal,
    })

    console.log('res', res)
    if (!res.ok) {
      MessagePlugin.error(res.message || '模型异常')
    }
    //TODO: 以下是方案二, 流式读取数据------------------------------------------------------------------------------------
    //TODO:res.body 只是原始数据流管道, 是readStream 状态, 不会直接打印出业务内容，必须调用 .getReader() + 循环 reader.read() 一点点拉取字节
    const body = res.body
    //1. 拿到响应体的流对象，而不是解析后的 JSON
    const reader = body.getReader() // 读取body:ReadableStream
    //2. 解析 JSON
    const decoder = new TextDecoder('utf-8')

    let textBuffer = '' //3. SSE 分片缓存, 存不完整的 data
    let dataLines = []
    let isFinish = false

    //渲染 AI 对话内容, payload 也会清空
    const onData = (payload) => {
      if (!('choices' in payload) || payload.error) {
        //报错信息👇payload.error.message
        console.log('error', payload.error)
        MessagePlugin.error('该模型不支持')
      }
      const delta = payload?.choices?.[0]?.delta
      const usage = payload?.usage

      //思考和内容
      const content = delta?.content ?? ''
      const reasoning = delta?.reasoning_content ?? ''
      //用量
      const promptTokens = usage?.prompt_tokens ?? ''
      const completionTokens = usage?.completion_tokens ?? ''
      const totalTokens = usage?.total_tokens ?? ''

      console.log('delta', content)
      assistantMessage.content += content
      // 关键：压缩多余换行，只保留最多一个空行
      assistantMessage.reasoning += reasoning
      assistantMessage.usage.promptTokens += promptTokens
      assistantMessage.usage.completionTokens += completionTokens
      assistantMessage.usage.totalTokens += totalTokens
      console.log('assistant', assistantMessage)
    }

    //4. 读循环流
    while (!isFinish) {
      //TODO: 一个TCP 包的大小 不等于后端返回的一条完整消息 我的理解是一个 chunk, 也就是UTF-8 编码
      const { value, done } = await reader.read()
      //TODO: read() 返回对象中的 done 和 SSE 的 [DONE] 不是同一件事：
      //ReadableStream / 传输层: HTTP 响应流已经关闭  || SSE 业务层: 服务端声明模型结果已经生成完毕

      // 中间块保留不完整的 UTF-8 字节，等待下一块补齐。
      textBuffer += decoder.decode(value, { stream: true }) // stream: true 可以防止中文、emoji 被网络分片截断。

      //TODO: HTTP层: TCP 把 body 传输完了
      if (done) {
        /*
            当 stream:true 模式运行期间：
            解码器内部可能缓存了最后一点残缺字节（比如最后一个中文只收到 2 字节，还差 1 字节），因为 stream=true，它憋着不吐出来。
            现在网络已经结束（done=true），不会再有下一包数据过来了。
            调用不带参数 decoder.decode() → 告诉解码器：流彻底结束，把你手里缓存的残留字节全部吐出来。
             */
        textBuffer += decoder.decode()
        break
      }

      //解析放在循环内部，立即解析刷新
      //TODO: 但是到目前为止， textBuffer 只是一个文本，没 axios 的助力, 没法自动 JSON.parse 解析出来------------------------------
      console.log('textBuffer', textBuffer) // 通常是 Uint8Array
      //匹配一个换行符 \n，它前面可能带一个回车符 \r，也可能不带
      // console.log(JSON.parse(textBuffer)); 这里还不能转义, 没去掉 data:
      //split 的时候，文本中的 \n 自动转义成了 \\n??, json 的原因，只是浏览器控制台打印不出来
      let textLines = textBuffer.split(/\r?\n/)
      //textLines 故意切出一个 '' 空行, 有这个空行说明, 是一个完整的 event
      console.log(textLines)
      // TODO: 这种情况比较罕见, 是只有在网络TCP出问题的情况下？或者直接给链接啥的，不是流式的数据。最后一项可能是半行，必须保留到下一轮。
      //TODO: 就是以 \n\n 作为一个临界点，如果一直没收到 \n\n，就不是完整的一行，那么都弹出
      //TODO: 如果是\n\n 就切完了,切完了就会空出来 ''
      textBuffer = textLines.pop() ?? ''

      //解析每一行
      for (const line of textLines) {
        console.log('lines', line)
        //1. 处理数据, 把 data: 部分清理掉
        if (line.startsWith('data:')) {
          if (
            line.startsWith('data:{"error"') ||
            line.startsWith('data:Unsupported') ||
            line.startsWith('data:[ERROR]')
          ) {
            console.log('lines', line)
            // dataLines.push(line.slice(12).trimStart())
            MessagePlugin.error('模型不可用')
            assistantMessage.error += '请求失败' + line
            scrollAuto()
            continue
          } else {
            //处理掉 data 以及 data 后面的空格
            dataLines.push(line.slice(5).trimStart())
            console.log('dataLines', dataLines)
            continue
          }
        }
        //TODO: 不支持的模型如下👇
        if (line.startsWith('data:[ERROR]')) {
          console.log('error with ERROR')
        }
        //处理报错信息
        //2. 心跳? 心跳不算进去
        if (line.startsWith(':')) continue
        //3. 空行提交一个完整的 SSE(也就是1 中已经清理完了的 SSE)
        if (line === '') {
          if (dataLines.length === 0) continue
          // SSE 允许一个事件拥有多条 data 行，按换行恢复事件正文。
          const payload = dataLines.join('\n')
          dataLines = []
          console.log('payload', payload)
          if (payload === '[DONE]') {
            console.log('payloadEND', payload)
            assistantMessage.status = 'done'
            isFinish = true
            return
          }
          onData(JSON.parse(payload))
          scrollAuto()
        }
      }
    }
  } catch (err) {
    console.log('err', err)
  } finally {
    isTyping.value = false
  }
}

// 主动停止
const stopGenerate = () => {
  controller.value?.abort()
  assistantMessage.status = 'done'
  isTyping.value = false
}
</script>

<style lang="less">
.t-textarea {
  textarea {
    min-height: 150px !important;
  }
}
</style>

```