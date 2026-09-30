package config

type Config struct {
	Environment string
	Port        string
	DatabaseDSN string //包含协议、账号、密码、地址、库名和连接参数，因此属于敏感信息。
}
