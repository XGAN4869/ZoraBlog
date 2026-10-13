# TS9：Class、继承与简单的 Vue/Ref 模拟
### 补充 extends 和 implement
```js
// extends：继承父类（拿父类真实的方法/属性，运行时生效）
class Son extends Father {}

// implements：接口约束（只做TS类型检查，编译后直接消失，JS运行时没有）
class Son implements SomeInterface {}
```
||`extends 父类`|`implements 接口`|
|---|---|---|
|属于|JS 原生语法|TS 独有，编译消失|
|作用|**拿到父类真实的属性 / 方法，复用逻辑**|**做类型约束，强制类要具备哪些成员，不给实现**|
|数量限制|只能 extends **1 个父类**|可以 implements **N 个接口**|
|super|需要 super ()|完全不需要 super|


## 一、Vue 基

### 1. `el` 的含义

- el = mount 挂载目标，告诉 Vue：把你的模板、数据、指令，渲染到页面哪一个 DOM 盒子里面去。

### 2. 简易 Vue el 挂载？

```js
//1. class 的基本用法 继承 和 类型约束 implements
//2. class 的修饰符 readonly只能给属性用  private  protected public 
//3. super 原理
//4. 静态方法
//5. get set
//private 只能在内部使用
//protected 给子类和内部去使用
//public 哪里都能用
```

## 二、定义配置接口与类接口

### 1. `Options` 接口：约束构造配置

```js
/**
 * Options接口：约束new Vue({ ... })传入的配置对象有哪些字段、什么类型
 * el: '#app' | el: document.getElementById('app')!
*/
interface Options {
    el:string | HTMLElement
}
```

`el` 支持两种值：CSS 选择器字符串，或已经获取到的 `HTMLElement`。

> [!NOTE] 编译期约束与运行时对象
> `Options` 和 `VueClass` 是 TypeScript 接口，主要用于编译期检查；接口本身不会在运行时生成一个可以 `new` 的对象。真正运行的是 `Vue`、`Dom` 和浏览器的 `document`。

### 2. `VueClass` 接口：约束类的形状

```js
// VueClass接口：用来约束 class Vue 这个类必须具备哪些属性、哪些方法
interface VueClass {
    options:Options;
    init():void;
}
```

实现 `VueClass` 的类必须有 `options` 属性和 `init` 方法。

## 三、定义虚拟 DOM 的数据结构

### 1. “递归类型”，适合描述树形数据

```js
// TODO extends: 继承
interface Vnode {
    tag:string //div section header
    text?:string //输入的文字
    children?:Vnode[] //子集？这里有递归的意味
}
```

`children?: Vnode[]` 表示一个节点可以拥有多个同样结构的子节点，因此这里体现了递归类型。

### 2. Vnode 是一棵树

可以把这段数据结构读成：一个节点包含标签名、可选文本和可选子节点；子节点仍然是 `Vnode`，所以可以继续嵌套。

```text
Vnode(div)
├─ Vnode(section, text)
└─ Vnode(section, text)
```

这也是递归渲染能够工作的前提：数据的形状和函数的调用方式彼此对应。

## 四、编写 `Dom` 父类

### 1. 创建真实 DOM 节点

```js
//虚拟 DOM 简单版
class Dom {
    //创建节点方法
    createElement(el:string){
        return document.createElement(el)
    }
```

`createElement` 对浏览器的 `document.createElement` 做了一层封装。

### 2. 填充节点文本

```js
    //填充文本方法
    setText(el:HTMLElement,text:string | null){
        el.textContent = text
    }
```

`textContent` 可以把文本写入真实的 HTML 元素。

### 3. 递归渲染虚拟节点

```js
    //渲染函数：为了让子类能够调取父类的 render 方法
    render(data:Vnode){
        let root = this.createElement(data.tag)
        if(data.children && Array.isArray(data.children)){
            data.children.forEach(item=>{
                //递归不停地渲染有child 的节点
                let child = this.render(item)
                // 把递归render返回出来的真实dom，挂到父root上
                root.appendChild(child)
            })
        }else{
            //无 child,填充文本
            if(data.text !== undefined){
                this.setText(root, data.text)
            }
        }

        return root // 返回当前构建好的真实DOM节点
    }
}
```

**有子节点时：**

先创建当前节点，再对每个 `children` 调用 `this.render(item)`，最后把子节点追加到父节点。

**没有子节点时：**

如果存在 `text`，就调用 `setText` 填入文本。

### 4. `render` 的递归调用链

```text
render(div)
  ├─ render(section 1) → 创建 section → 填充文本 → 返回 section
  ├─ render(section 2) → 创建 section → 填充文本 → 返回 section
  └─ appendChild 两个 section 到 div
```

递归函数的关键不是“调用自己”四个字，而是每一次调用都要有更小的子问题，并且最终返回当前层构建好的节点。

## 五、编写 `Vue` 子类

### 1. 继承父类并实现接口

```js
// class Vue implements VueCls
// TODO implements：用于约束 class 类的 || 虽然我记得在 java 中是实现
class Vue extends Dom implements VueClass{
    options:Options;
```

`extends Dom` 表示继承 `Dom` 的方法；`implements VueClass` 表示必须满足 `VueClass` 接口的结构。

| 写法 | 解决的问题 | 运行时是否有直接效果 |
|---|---|---|
| `extends Dom` | 复用父类实例方法、建立原型继承 | 有，`Vue` 可以调用继承来的方法 |
| `implements VueClass` | 检查类是否具备指定成员 | 接口本身会被擦除，不负责创建方法 |

### 2. 构造函数与 `super`

```js
    constructor(options:Options) {
        //FIXME ? 好像如果写了 extends 就要写 super？
        super()
        this.options = options;
    }
```

子类构造函数中调用 `super()`，用于先完成父类部分的初始化，然后才能使用子类自己的 `this`。

> [!IMPORTANT]
> 派生类构造函数在使用 `this` 前必须调用 `super()`。`super()` 会调用父类构造函数；本例中的 `Dom` 没有显式构造函数，因此使用默认构造过程。

### 3. 准备虚拟 DOM 数据

```js
    init():void {
        //虚拟 dom 就是通过 js 去渲染真实 Dom
        let data:Vnode = {
            tag:'div',
            children:[
                {
                    tag:'section',
                    text:'我是子节点1'
                },
                {
                    tag:'section',
                    text:'我是子节点2'
                }
             ]
        }
```

这个对象表示一个 `div`，里面有两个 `section` 子节点。

### 4. 根据 `el` 类型找到挂载元素

```js
        //由于联合类型？所以要判断一下，不然会滥用
        let app = typeof this.options.el === 'string' ? document.querySelector(this.options.el) : (this.options.el)
```

这里使用 `typeof` 做类型收窄：字符串走选择器查询，元素对象则直接使用。

另外，`document.querySelector` 的返回值可能是 `null`，所以后面的 `if (!app)` 既是运行时保护，也帮助 TypeScript 在后续代码中确认 `app` 已经存在。

### 5. 校验并挂载渲染结果

```js
        //把真实的 Dom 节点塞进去即可
        // 如果选择器没有找到元素，提前给出明确错误
        if (!app) {
            throw new Error(`没有找到挂载元素：${this.options.el}`)
        }
        app.appendChild(this.render(data))
    }
}
```

先检查 `app` 是否存在，再调用继承来的 `render` 将虚拟 DOM 转为真实节点，最后追加到挂载元素中。

### 6. 这一版“Vue”与真实 Vue 的差别

当前代码演示的是一个教学用的最小模型：手动调用 `init`、把静态 `Vnode` 转成 DOM，并直接 `appendChild`。真实 Vue 还涉及模板编译、组件更新、响应式依赖追踪、生命周期和调度系统，因此不要把这段代码理解成 Vue 源码的完整实现。

## 六、创建并初始化 Vue 实例

```js
// new Vue，传入配置对象，el:"#app"( 就是告诉Vue挂载到id=app的div )
//TODO 然后底下的这个 el:xxx 就是 options
const vm = new Vue({
    el:'#app',
});
vm.init();

// 手动调用初始化，模拟Vue内部自动执行init
```

### 执行链路

```text
new Vue({ el: '#app' })
  ↓
保存 options
  ↓
vm.init()
  ↓
创建 Vnode 数据
  ↓
render 递归创建真实 DOM
  ↓
appendChild 挂载到 #app
```

## 七、Class 修饰符速查

### 1. `private`

只能在声明它的类内部访问。

### 2. `protected`

可以在当前类和子类中访问。

### 3. `public`

可以在任何地方访问。未显式写修饰符时，类成员默认是 `public`。

### 4. 修饰符的访问范围

| 修饰符 | 当前类 | 子类 | 类外部 |
|---|---:|---:|---:|
| `private` | ✅ | ❌ | ❌ |
| `protected` | ✅ | ✅ | ❌ |
| `public` | ✅ | ✅ | ✅ |
| `readonly` | 可读 | 可读 | 可读，但不能重新赋值 |

`readonly` 约束的是赋值行为，不等于深层冻结；如果属性保存的是对象，嵌套对象是否可改还要单独判断。

### 5. 其他知识点

```text
readonly：属性初始化后不能重新赋值
静态方法：属于类本身，而不是某个实例
```

## 八、简易 Ref？

这个例子主要用来观察 `get` / `set` 访问器如何工作。

### 1. 定义内部值

```js
class Ref {
    _value:any //还没学泛型，按理说有多种类型都可以
    constructor(value:any) {
        this._value=value;
    }
```

`_value` 保存真正的数据，构造函数接收初始值。

### 2. 定义 `get` 访问器

```js
    //✅ 行为完全就是 get /set 访问器设计出来的效果，不是 bug。👇🔗
    //https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/get
    get value() {
        return this._value + '拦截get'
    }
```

读取 `ref.value` 时，会自动执行 `get value()`，而不是直接读取 `_value`。

### 3. 定义 `set` 访问器

```js
    set value(newValue:any) {
        this._value = newValue + '拦截set\n'
    }
}
```

给 `ref.value` 赋值时，会自动执行 `set value(newValue)`，这里把新值加工后保存到 `_value`。

> [!NOTE] 访问器不是普通方法调用
> 代码写的是 `ref.value` 和 `ref.value = ...`，但 JavaScript 会分别自动进入 getter 和 setter。调用者不需要手动写 `get value()` 或 `set value(...)`。

### 4. 读取与修改 Ref

```js
const ref = new Ref('666\n')

//读取值操作被 get 方法拦截了
console.log(ref.value) //✅ 调用 get value()

ref.value = '我要改了\n'
console.log(ref.value)
```

**读取流程：**

`console.log(ref.value)` 触发 `get value()`，返回带有“拦截get”的字符串。

**赋值流程：**

`ref.value = ...` 触发 `set value(...)`，新值会先经过 setter，再写入 `_value`。

### 5. 访问器与真实响应式的差别

这个 `Ref` 只是在读取和赋值时拼接字符串，并没有记录依赖、通知订阅者或触发组件更新。它适合用来学习 JavaScript 的 getter/setter 语法；真实 Vue `ref` 还需要响应式系统配合。

## 九、两个例子的对应关系

| Vue 示例 | Ref 示例 |
|---|---|
| 类封装 DOM 操作 | 类封装内部值 |
| `extends` 复用父类方法 | `get` / `set` 拦截访问 |
| `implements` 约束类结构 | 构造函数初始化数据 |

## 复习练习

1. 如果删除 `super()`，为什么在构造函数中使用 `this` 会出错？
2. `Vnode` 为什么能用 `children?: Vnode[]` 描述任意层级的树？
3. `implements VueClass` 为什么不会自动把 `init` 方法添加到 `Vue` 类中？
4. 读取 `ref.value` 和直接读取 `ref._value` 有什么区别？

## 参考资料

- [TypeScript Handbook：Classes](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [TypeScript Handbook：Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [MDN：getter](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/get)
- [MDN：setter](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Functions/set)
- [Vue：TypeScript 相关支持](https://vuejs.org/guide/typescript/overview.html)

## 一句话总结

> `class` 把数据和方法封装在一起，`extends` 用于继承，`implements` 用于结构约束，`get` / `set` 用于控制属性读取和赋值。
