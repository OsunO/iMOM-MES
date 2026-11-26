# MOM MES 连接器

卡奥斯 COSMOPlat 工业互联网平台旗下产品，深度对接卡奥斯 COSMO-iMOM 孪生制造一体化平台生产执行能力，打通车间生产、设备、质检全链路核心数据，构筑生产现场数字化可视底座，支撑制造业务精益管控与智能研判。

## 配置入口

1. 左侧栏打开 **Plugins（插件）**
2. **Installed plugins** 里打开 **MOM MES 连接器**
3. 填写 **API Key**（`MOM_MES_API_KEY`），点 **保存**
4. 全部保存后，工具以 `mcp__mvpMes__<工具名>` 出现在智能体工具表中

表单显示「已配置 / 未配置」和掩码预览，**不回显明文**；点 **清除** 会删除该引用。

## 参数

| 凭据引用 | 用途 | 展示 | 写入方式 |
|---|---|---|---|
| `MOM_MES_API_KEY` | API Key | 掩码，不回显 | 插件页表单 |

请求头：

| 头 | 值 |
|---|---|
| `Authorization` | `Bearer ${credential:MOM_MES_API_KEY}` |

MCP 端点：`https://mom-mes-connector-t.hdt.cosmoplat.com/mcp`（服务名 `mvpMes`）

## 值存放在哪里

| 优先级 | 位置 | 谁能写 |
|---|---|---|
| 1 | `~/.dsh/.credentials.yaml` 的 `refs:` 段 | 插件页表单（`credentials.set/unset`） |
| 2 | 启动时的进程环境变量 | 启动 DSH 的人 |
| 3 | 项目目录 `.env`，然后是 `~/.dsh/.env` | 手工编辑文件 |

保存过的值优先级最高，因此旧的 `.env` 配置会被表单里的值覆盖；想让环境变量重新生效，用表单 **清除** 该引用。

## 没有配置时

`expandTemplates` + 缺失引用会让这个 MCP 实例停在 `waiting-credentials`：不注册任何工具，
也不消耗重连次数。填好值后立即恢复，无需重启。

## 目录结构

```
dsh-plugin-imom-mes/
├── package.json          # 包清单 + dsh.bundle.patch + dsh.client（浏览器半侧）
├── cordis.patch.yml      # 两行：mcp-client 连接 + 本包自己的行
├── lib/index.mjs         # Host 半侧：空 apply，只为让包拥有一行 Loader 条目
├── client.js             # 浏览器半侧：插件页上的连接配置表单
├── locale/en.json        # 插件页标题/描述（英文）
├── locale/zh.json        # 插件页标题/描述（中文）
├── icon.svg              # 插件图标
└── README.md             # 本文件（插件页的详情文档回退到它）
```

## 自测清单

- ✅ 表单写入 `MOM_MES_API_KEY` 后，`describe` 返回 `configured: true`
- ✅ 保存后连接重建，`mcp__mvpMes__*` 工具出现
- ✅ 清除引用后回到 `waiting-credentials`，工具消失但不影响其它插件
- ✅ 诊断信息中不出现明文密钥

## License

MIT
