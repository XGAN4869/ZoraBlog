<template>
  <div class="h-screen overflow-y-auto overflow-x-hidden flex flex-col relative">
    <!-- 顶部配置区域 -->
    <div>
      <t-row :gutter="[8, 8]" class="min-w-3xl">
        <!-- API Key -->
        <t-col :lg="3" :xs="6">
          <select-api
            :key="`api-${selectVersion}`"
            @chat="getParams"
          />
        </t-col>

        <!-- 模型 -->
        <t-col :lg="3" :xs="6">
          <select-model
            :key="`model-${selectVersion}`"
            @chat="getParams"
          />
        </t-col>

        <!-- 实际模型地址，仅用于展示 -->
        <t-col :lg="3" :xs="12">
          <t-input
            value="https://model-router-console.edu-aliyun.com/v1/chat/completions"
            readonly
          />
        </t-col>

        <!-- 操作按钮 -->
        <t-col :lg="3" :xs="12">
          <div class="flex flex-row gap-2">
            <div class="flex-1">
              <t-button
                class="w-full"
                variant="outline"
                theme="default"
                :disabled="isTyping"
                @click="refreshOptions"
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
    <div
      class="mt-4 p-4 flex-1 overflow-hidden rounded-md border border-gray-300 min-w-3xl"
    >
      <div class="h-full flex flex-col overflow-hidden">
        <!-- 消息列表 -->
        <div
          ref="chatBody"
          class="flex-1 overflow-y-auto overflow-x-hidden pb-4"
        >
          <!-- 暂无消息 -->
          <div
            v-if="messageList.length === 0"
            class="h-full flex items-center justify-center text-gray-400"
          >
            请选择 API Key 和模型，然后发送消息
          </div>

          <!-- 对话消息 -->
          <div
            v-for="(item, index) in messageList"
            :key="index"
            class="mb-5"
          >
            <!-- 用户消息 -->
            <div
              v-if="item.role === 'user'"
              class="flex justify-end"
            >
              <div
                class="max-w-[80%] rounded-lg bg-blue-500 px-4 py-3 text-white whitespace-pre-wrap break-words"
              >
                {{ item.content }}
              </div>
            </div>

            <!-- AI 消息 -->
            <div
              v-else
              class="flex justify-start"
            >
              <div
                class="max-w-[90%] w-full rounded-lg border border-gray-200 bg-white px-4 py-3"
              >
                <!-- 思考过程 -->
                <details
                  v-if="item.reasoning"
                  class="mb-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2"
                  :open="item.status === 'streaming'"
                >
                  <summary class="cursor-pointer text-sm text-gray-500">
                    思考过程
                  </summary>

                  <div
                    class="mt-2 text-sm leading-6 text-gray-500 whitespace-pre-wrap break-words"
                  >
                    {{ item.reasoning }}
                  </div>
                </details>

                <!-- 最终 Markdown 回答 -->
                <MdPreview
                  v-if="item.content"
                  :editor-id="`assistant-preview-${index}`"
                  :model-value="item.content"
                />

                <!-- 还没收到正文时显示加载状态 -->
                <div
                  v-if="item.status === 'streaming' && !item.content"
                  class="py-2"
                >
                  <t-skeleton
                    theme="paragraph"
                    animation="gradient"
                  />
                </div>

                <!-- 请求失败 -->
                <div
                  v-if="item.status === 'error'"
                  class="mt-2 text-sm text-red-500"
                >
                  请求失败：{{ item.error }}
                </div>

                <!-- 主动停止 -->
                <div
                  v-if="item.status === 'aborted'"
                  class="mt-2 text-sm text-orange-500"
                >
                  已停止生成
                </div>

                <!-- Token 用量 -->
                <div
                  v-if="item.usage"
                  class="mt-3 border-t border-gray-100 pt-2 text-xs text-gray-400"
                >
                  输入 Token：{{ item.usage.prompt_tokens ?? 0 }}
                  · 输出 Token：{{ item.usage.completion_tokens ?? 0 }}
                  · 总 Token：{{ item.usage.total_tokens ?? 0 }}

                  <template
                    v-if="
                      item.usage.completion_tokens_details?.reasoning_tokens !==
                      undefined
                    "
                  >
                    · 推理 Token：
                    {{
                      item.usage.completion_tokens_details.reasoning_tokens
                    }}
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="relative shrink-0 pt-3">
          <t-textarea
            v-model="chatMessage"
            class="fix"
            name="description"
            placeholder="给大模型发送信息，Ctrl + Enter 可以发送"
            :autosize="{ minRows: 3, maxRows: 10 }"
            @keydown.ctrl.enter.prevent="handle_message"
          />

          <div class="absolute right-4 bottom-4 z-10">
            <t-button
              size="large"
              :theme="isTyping ? 'danger' : 'primary'"
              @click="isTyping ? stopGenerate() : handle_message()"
            >
              {{ isTyping ? '停止' : '发送' }}
            </t-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  nextTick,
  onBeforeUnmount,
  reactive,
  ref,
  shallowRef,
} from 'vue'

import SelectApi from '@/pages/modelDialogue/components/selectApi.vue'
import SelectModel from '@/pages/modelDialogue/components/selectModel.vue'

import { DeleteIcon, RefreshIcon } from 'tdesign-icons-vue-next'
import { MessagePlugin } from 'tdesign-vue-next'

import { getToken, removeToken } from '@/utils/auth/auth.js'

import { MdPreview } from 'md-editor-v3'
import 'md-editor-v3/lib/style.css'

// 发送给后端的请求参数。
// API Key 和模型由两个子组件传入。
const chatData = reactive({})

// 保存完整会话历史。
const messageList = ref([])

// 输入框内容必须是字符串。
const chatMessage = ref('')

// 聊天区域 DOM。
const chatBody = ref(null)

// 是否正在生成回答。
const isTyping = ref(false)

// 当前请求的取消控制器。
const controller = shallowRef(null)

// 用于重新挂载 API Key 和模型选择组件。
const selectVersion = ref(0)

/**
 * 接收选择组件传来的参数。
 *
 * selectApi.vue 传入：
 * { apiKeyId: 33252 }
 *
 * selectModel.vue 传入：
 * { model: 'qwen/deepseek-v4-pro' }
 */
const getParams = (item) => {
  Object.assign(chatData, item)
}

/**
 * 等待页面更新后，自动滚动到底部。
 */
const scrollAuto = async () => {
  await nextTick()

  if (!chatBody.value) return

  chatBody.value.scrollTop = chatBody.value.scrollHeight
}

/**
 * 从一条完整的 SSE 事件中获取 data 内容。
 *
 * 标准 SSE：
 * data: {"choices":[]}
 *
 * 当前后端：
 * data:data: {"choices":[]}
 *
 * 所以这里需要兼容第二层 data:。
 */
const getSseData = (frame) => {
  const dataText = frame
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n')

  let result = dataText

  // 兼容后端当前返回的 data:data:。
  if (result.startsWith('data:')) {
    result = result.slice(5).trimStart()
  }

  return result
}

/**
 * 处理一条完整的 SSE 事件。
 *
 * 返回 true 表示已经收到 [DONE]。
 */
const handleSseFrame = (frame, assistantMessage) => {
  const dataText = getSseData(frame)

  // 空事件或心跳事件直接忽略。
  if (!dataText) return false

  // 后端通知整条回答结束。
  if (dataText === '[DONE]') {
    assistantMessage.status = 'done'
    return true
  }

  let chunkData

  try {
    chunkData = JSON.parse(dataText)
  } catch {
    throw new Error('后端返回的 SSE 数据格式不正确')
  }

  // usage 通常位于 choices 为空的独立数据包中。
  if (chunkData.usage) {
    assistantMessage.usage = chunkData.usage
  }

  const choice = chunkData.choices?.[0]

  // usage 数据包可能没有 choice。
  if (!choice) return false

  const delta = choice.delta || {}

  let contentChanged = false

  // 追加思考内容。
  if (
    typeof delta.reasoning_content === 'string' &&
    delta.reasoning_content
  ) {
    assistantMessage.reasoning += delta.reasoning_content
    contentChanged = true
  }

  // 追加最终正文。
  if (typeof delta.content === 'string' && delta.content) {
    assistantMessage.content += delta.content
    contentChanged = true
  }

  // 保存模型停止原因。
  // 注意：收到 stop 后不能立刻停止读取，
  // 因为后面还有 usage 和 [DONE]。
  if (
    choice.finish_reason !== null &&
    choice.finish_reason !== undefined
  ) {
    assistantMessage.finishReason = choice.finish_reason
  }

  if (contentChanged) {
    scrollAuto()
  }

  return false
}

/**
 * 循环读取并解析 SSE 响应流。
 */
const readSseStream = async (response, assistantMessage) => {
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')

  // 保存尚未组成完整 SSE 事件的内容。
  let buffer = ''

  // 是否收到 [DONE]。
  let receivedDone = false

  try {
    while (!receivedDone) {
      const { value, done } = await reader.read()

      if (value) {
        // stream: true 可以防止中文、emoji 被网络分片截断。
        buffer += decoder.decode(value, {
          stream: true,
        })
      }

      if (done) {
        // 冲出 TextDecoder 内部剩余的字符。
        buffer += decoder.decode()
      }

      // 统一 Windows、Linux 换行。
      buffer = buffer.replace(/\r\n?/g, '\n')

      let frameEnd

      // SSE 事件之间使用空行分隔。
      // 一次 reader.read() 可能包含多条事件。
      while ((frameEnd = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, frameEnd)

        // 留下还没有组成完整事件的部分。
        buffer = buffer.slice(frameEnd + 2)

        if (!frame.trim()) continue

        receivedDone = handleSseFrame(
          frame,
          assistantMessage,
        )

        if (receivedDone) break
      }

      if (done) break
    }

    // 兼容最后一条数据后面没有空行的情况。
    if (!receivedDone && buffer.trim()) {
      receivedDone = handleSseFrame(
        buffer,
        assistantMessage,
      )
    }

    // 后端正常协议应该发送 [DONE]。
    if (!receivedDone) {
      throw new Error('响应流意外结束，未收到 [DONE]')
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * 用户发送消息。
 */
const handle_message = async () => {
  const question = chatMessage.value.trim()

  if (!question) {
    MessagePlugin.warning('请输入消息内容')
    return
  }

  if (isTyping.value) return

  if (!chatData.apiKeyId) {
    MessagePlugin.warning('请先选择 API Key')
    return
  }

  if (!chatData.model || chatData.model === 'qwen/undefined') {
    MessagePlugin.warning('请先选择模型')
    return
  }

  // 添加用户消息。
  messageList.value.push({
    role: 'user',
    content: question,
    status: 'done',
  })

  /**
   * 生成后端需要的聊天上下文。
   *
   * 排除失败、停止和正在生成的 assistant 消息，
   * 后端只接收 role 与 content。
   */
  const requestMessages = messageList.value
    .filter((item) => item.status === 'done')
    .map((item) => ({
      role: item.role,
      content: item.content,
    }))

  // 创建一条空的 assistant 消息。
  messageList.value.push({
    role: 'assistant',
    content: '',
    reasoning: '',
    status: 'streaming',
    finishReason: null,
    usage: null,
    error: '',
  })

  /**
   * 必须从响应式数组中重新取出这条消息。
   * 后面不断修改它时，Vue 才能实时更新页面。
   */
  const assistantMessage =
    messageList.value[messageList.value.length - 1]

  // 先保存问题，再清空输入框。
  chatMessage.value = ''

  isTyping.value = true
  controller.value = new AbortController()

  scrollAuto()

  const baseURL = import.meta.env.VITE_BASE_URL || ''
  const url = `${baseURL.replace(/\/$/, '')}/user/modeldialogue`

  // 原生 fetch 不会执行 Axios 请求拦截器，
  // 因此需要手动携带登录 Token。
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  }

  const token = getToken()

  if (token) {
    headers.Authorization = token
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,

      body: JSON.stringify({
        // 保留 API Key 和模型参数。
        apiKeyId: chatData.apiKeyId,
        model: chatData.model,

        // 开启流式响应。
        stream: true,

        // 完整聊天上下文。
        messages: requestMessages,
      }),

      signal: controller.value.signal,
    })

    // 登录状态失效。
    if (response.status === 401) {
      removeToken()
      window.location.href = '/login'
      throw new Error('登录已失效，请重新登录')
    }

    // HTTP 状态不是 2xx。
    if (!response.ok) {
      throw new Error(`请求失败：HTTP ${response.status}`)
    }

    // 浏览器没有提供流式响应体。
    if (!response.body) {
      throw new Error('响应体不支持流式读取')
    }

    await readSseStream(response, assistantMessage)
  } catch (error) {
    if (error?.name === 'AbortError') {
      assistantMessage.status = 'aborted'
      assistantMessage.error = ''
    } else {
      assistantMessage.status = 'error'
      assistantMessage.error =
        error?.message || '模型请求失败'

      MessagePlugin.error(assistantMessage.error)
    }
  } finally {
    isTyping.value = false
    controller.value = null

    scrollAuto()
  }
}

/**
 * 主动停止当前回答。
 */
const stopGenerate = () => {
  controller.value?.abort()
}

/**
 * 清空聊天记录。
 */
const clearMessages = () => {
  if (isTyping.value) {
    MessagePlugin.warning('请先停止当前回答')
    return
  }

  messageList.value = []
  chatMessage.value = ''

  MessagePlugin.success('聊天记录已清空')
}

/**
 * 重新获取 API Key 和模型列表。
 *
 * 修改 key 会让两个选择组件重新挂载，
 * 组件的 onMounted 会重新调用接口。
 */
const refreshOptions = () => {
  if (isTyping.value) return

  selectVersion.value += 1

  // 清除之前选择的 API Key 和模型。
  Object.keys(chatData).forEach((key) => {
    delete chatData[key]
  })

  MessagePlugin.success('API Key 和模型列表已刷新')
}

/**
 * 离开页面时取消未完成的流式请求。
 */
onBeforeUnmount(() => {
  controller.value?.abort()
})
</script>

<style lang="less">
.t-textarea {
  textarea {
    min-height: 150px !important;
  }
}
</style>
