## interface 接口

```go
// 写法1
type Sayer interface {
    Say()
}

type Cat struct{}

func (c Cat) Say() {
    fmt.Println("喵喵喵")
}
/**
    Sayer 接口类型，给前端一个类型提示的作用，表实现该接口
*/
var s Sayer = Cat{}
s.Say()

//写法2
type Token struct {
    ...
	Claims    Claims         // Claims is the second segment of the token in decoded 
    ...
}
type Claims interface {
	GetExpirationTime() (*NumericDate, error)
	GetIssuedAt() (*NumericDate, error)
	GetNotBefore() (*NumericDate, error)
	GetIssuer() (string, error)
	GetSubject() (string, error)
	GetAudience() (ClaimStrings, error)
}
```

```plainText
接口值（interface）
       |
       v
+--------------------+
|   动态类型 (type)   |
|--------------------|
|   动态值 (value)   |
+--------------------+
```