### 口令
但如果只是为了复用几个方法，使用继承往往会造成耦合
mixin：多个类都需要同一组横向能力；
### 简记
组合式
```js
class Mixed {
  private a = new A();
  private b = new B();

  methodA() {
    this.a.methodA();
  }

  methodB() {
    this.b.methodB();
  }
}
```
继承式
```js

```


### 组合式结构：
```js
// 刹车行为接口
interface BrakeBehavior {
  brake(): void;
}

// A 风格刹车
class AStyleBrake implements BrakeBehavior {
  brake(): void {
    console.log("A 风格刹车");
  }
}

// B 风格刹车
class BStyleBrake implements BrakeBehavior {
  brake(): void {
    console.log("B 风格刹车");
  }
}

class Car {
  // 汽车内部保存一个刹车行为对象
  private brakeBehavior: BrakeBehavior;

  constructor(brakeBehavior: BrakeBehavior) {
    this.brakeBehavior = brakeBehavior;
  }

  brake(): void {
    // 把刹车动作交给具体的行为对象执行
    this.brakeBehavior.brake();
  }

  // 运行时更换刹车行为
  setBrakeBehavior(behavior: BrakeBehavior): void {
    this.brakeBehavior = behavior;
  }
}
const car = new Car(new AStyleBrake());
car.brake(); // A 风格刹车
car.setBrakeBehavior(new BStyleBrake());// 不换汽车，只更换刹车行为
car.brake(); // B 风格刹车
```
典型的 has-a：Car 拥有一种(has-a) BreakeBehavior
```js
Car ──拥有──> BrakeBehavior
                 ├── AStyleBrake
                 └── BStyleBrake
```

### 继承式结构：
```js
// 父类：定义所有汽车共有的能力
abstract class Car {
  // abstract 表示：子类必须自己实现刹车
  abstract brake(): void;
}

// A 型汽车
class CarModelA extends Car {
  brake(): void {
    console.log("A 型汽车刹车");
  }
}

// B 型汽车
class CarModelB extends Car {
  brake(): void {
    console.log("B 型汽车刹车");
  }
}

let car: Car = new CarModelA();
// 如果想使用 B 型刹车，只能换成一个新的 B 型汽车对象
car = new CarModelB();

```
继承关系 is-a：CarModelA **是一种(is-a)**  Car