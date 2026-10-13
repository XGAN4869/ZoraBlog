# TS14：never 类型

## 一、never 是什么

never 表示**永远不会正常产生值**的类型。常见于：

- 总是抛出异常的函数；
- 永远不会结束的循环；
- 联合类型被完全收窄后的“不可能分支”。

它不是 undefined 或 void：void 表示函数没有返回有用的值，而 never 表示函数根本不会正常返回。

## 二、常见用法：穷尽检查（exhaustiveness check）

当一个联合类型的所有成员都被 switch 处理后，default 分支中的值应该是 never：

~~~ts
type Action = '唱' | '跳' | 'rap'

function kun(value: Action): void {
  switch (value) {
    case '唱':
      break
    case '跳':
      break
    case 'rap':
      break
    default: {
      // 如果 Action 新增成员而这里忘记处理，编译器会在此处报错
      const error: never = value
      throw new Error(`未处理的动作：${error}`)
    }
  }
}
~~~

如果以后把类型改成：

~~~ts
type Action = '唱' | '跳' | 'rap' | '篮球'
~~~

而 switch 没有增加 case '篮球'，那么 value 在 default 分支会被推断为 '篮球'，无法赋值给 never，从而提醒开发者补全逻辑。

## 三、其他示例

### 1. 总是抛出异常

~~~ts
function fail(message: string): never {
  throw new Error(message)
}
~~~

### 2. 永不结束的循环

~~~ts
function runForever(): never {
  while (true) {
    // 持续执行
  }
}
~~~

## 四、never 在联合类型中的行为

never 是所有类型的子类型，因此放进联合类型后不会增加新的可用值：

~~~ts
type Result = string | never // 等价于 string
~~~

这也是条件类型、泛型过滤和穷尽检查中经常出现 never 的原因。

## 五、never、void、unknown 对比

| 类型 | 含义 | 能否正常返回/使用 |
|---|---|---|
| void | 函数没有返回有用结果 | 函数可以正常结束 |
| never | 函数不会正常结束 | 不能产生任何值 |
| unknown | 当前不知道具体类型 | 需要判断后才能使用 |

## 六、复习要点

1. never 描述“不可能发生”或“不会正常返回”的情况。
2. 给 default 分支的值标注 never，可以发现联合类型新增成员后遗漏的处理。
3. never 在联合类型中会被忽略，但在类型检查中具有重要的兜底作用。
