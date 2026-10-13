# TS12：`enum` 枚举类型

## 一、枚举是什么

枚举用于给一组有名字的常量建立集合。枚举成员既可以出现在**类型位置**，也可以在运行时作为**值**使用。

> [!NOTE]
> `interface`、`type` 等类型会在编译后消失；普通 `enum` 通常会生成 JavaScript 对象，因此它和纯类型别名不是一回事。

## 二、数字枚举

数字枚举不写初始值时，默认从 `0` 开始递增；也可以手动指定起始值，后面的成员会继续递增。

```ts
enum ColorNumType {
  red = 1,
  green = 4,
  blue = 3,
}

console.log(ColorNumType.red)   // 1
console.log(ColorNumType.green) // 4
console.log(ColorNumType.blue)  // 3

enum Direction {
  Up,   // 0
  Down, // 1
  Left = 4,
  Right, // 5
}
```

## 三、字符串枚举

字符串枚举的每个成员都需要写明确的字符串值。它的日志、接口传参通常比数字枚举更直观。

```ts
enum ColorStrType {
  red = 'red',
  green = 'green',
  blue = 'blue',
}

console.log(ColorStrType.red) // red
```

数字和字符串成员可以混用，但通常不建议这样做，因为可读性和维护性较差：

```ts
enum Mixed {
  count = 1,
  label = 'mixed',
}
```

## 四、枚举成员作为类型

枚举成员可以限制属性只能取指定成员：

```ts
enum Color {
  yes,
  no,
}

interface Answer {
  result: Color.yes
}

const answer: Answer = {
  result: Color.yes,
}
```

`result` 只能是 `Color.yes`，写成 `Color.no` 会报错。

如果只是想表达固定字符串集合，也可以使用字面量联合类型：

```ts
type Status = 'success' | 'fail'
```

## 五、普通枚举的反向映射

数字枚举在编译后通常会生成正向和反向映射：

```ts
enum Types {
  success,
  fail,
}

console.log(Types.success) // 0
console.log(Types[0])      // success
```

可以把它近似理解为：

```ts
{
  success: 0,
  0: 'success',
  fail: 1,
  1: 'fail',
}
```

字符串枚举没有这种数字反向映射。

## 六、常量枚举 `const enum`

`const enum` 主要用于编译期内联，通常不会生成同名的运行时对象：

```ts
const enum ConstTypes {
  success,
  fail,
}

interface Result {
  status: ConstTypes.success // 类型位置：表示该成员类型
}

const code: number = 0

// 运行时比较：这里使用的是枚举成员的值
if (code === ConstTypes.success) {
  console.log('success')
}
```

### 类型位置与值位置

```ts
interface Res {
  status: Types.success // 冒号后面是类型位置
}

if (code === Types.success) {
  // 比较表达式是运行时值位置
}
```

因此，“枚举成员是类型”与“枚举成员是值”并不矛盾，关键要看它出现的位置。

> [!WARNING]
> `const enum` 依赖编译器配置，某些 Babel、isolatedModules 或第三方工具链不建议使用它。需要运行时遍历枚举时，使用普通 `enum` 或字面量对象会更稳妥。

## 七、枚举的选择建议

1. 需要运行时对象、反向映射或跨模块共享时，可以使用普通 `enum`。
2. 只需要限制一组固定字符串时，优先考虑字面量联合类型。
3. 接口传输状态码时，字符串枚举或字符串联合类型通常比数字更容易调试。
4. 不要为了“有多个选项”就滥用枚举，先判断是否只需要一个类型约束。
