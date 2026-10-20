# 学习代码示例

本目录的 `.go.txt` 文件仅用于阅读和学习，不参与后端编译。

- `jwt.go.txt`：已有的 JWT 学习示例。
- `jwt-local-draft.go.txt`：整理本地仓库时保留的旧版 JWT 草稿，内容原样保存。

本地草稿尚未完成：`Claims` 的复合字面量不能直接初始化嵌入结构体的 `ExpiresAt`、`IssuedAt`、`Issuer`，需要使用 `RegisteredClaims: jwt.RegisteredClaims{...}`。其中的密钥也是占位示例。

当前应用使用 GitHub OAuth 和 Session，运行中的认证实现与配置见 [认证说明](../../AUTH.md)。这些历史 JWT 示例不接入当前服务。
