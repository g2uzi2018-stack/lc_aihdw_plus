# 嘉立创 EDA 电路实验

这个仓库用于保存嘉立创 EDA 专业版的本地电路工程。先从简单的 5 V LED 指示灯原理图开始，再逐步尝试 PCB。实际元件、阻值和封装应以所选器件的数据手册为准。

## 本机已安装

截至 2026-11-19，已核对：

- 嘉立创 EDA 专业版 `4.1.105.0339a6cd`，位于 `C:\Users\kuang\AppData\Local\Programs\lceda-pro\`；内置 `lceda-pro` 命令行及 MCP 服务。
- 官方 [`easyeda-cli` Skill](https://github.com/easyeda/easyeda-cli-skill)，位于 `C:\Users\kuang\.codex\skills\easyeda-cli\`，用于让 AI 按本机客户端版本发现和使用 CLI。
- 官方 [`easyeda-api` Skill](https://github.com/easyeda/easyeda-api-skill)，位于 `C:\Users\kuang\.codex\skills\easyeda-api\`，供 AI 查阅 EDA API 和文件格式。
- Codex 的 `lceda_pro` MCP 配置，位于 `C:\Users\kuang\.codex\config.toml`。**重启 Codex 后**加载新配置和 Skill。

当前采用 EDA 客户端内置的 MCP 接口。`easyeda-api` Skill 中另有基于 Run API Gateway 的桥接流程；使用内置 CLI/MCP 时无需额外安装该扩展或 Node.js 服务。

## 从零安装或重装

1. 从[嘉立创 EDA 官方下载页](https://lceda.cn/page/download)安装 **专业版 Windows 客户端**。首次使用时按客户端提示登录。
2. 在 Codex 中安装官方 Skill：分别将 [`easyeda-cli-skill`](https://github.com/easyeda/easyeda-cli-skill) 与 [`easyeda-api-skill`](https://github.com/easyeda/easyeda-api-skill) 仓库内容放到 `C:\Users\<用户名>\.codex\skills\easyeda-cli\` 和 `...\easyeda-api\`，确认各目录下直接存在 `SKILL.md`。
3. 若 Codex 在 WSL 中运行，把下面的配置加入 `~/.codex/config.toml`，并将用户名和安装路径改为实际值：

   ```toml
   [mcp_servers.lceda_pro]
   command = "/mnt/c/Users/<用户名>/AppData/Local/Programs/lceda-pro/lceda-pro.exe"
   args = ["--mcp", "stdio"]
   ```

4. 重启 Codex。EDA 客户端运行时，AI 可通过 `lceda_pro` 操作编辑器。若客户端升级或路径改变，重新查看 `lceda-pro --mcp --help` 并更新配置。

## 官方 AI / API 工具清单

2026-11-19 对照[官方辅助项目](https://prodocs.lceda.cn/cn/api/guide/ancillary-projects.html)、[客户端 CLI](https://prodocs.lceda.cn/cn/api/guide/cli.html)、官方 GitHub 仓库及扩展广场核对：

| 组件 | 用途与本机状态 |
| --- | --- |
| EDA 专业版 CLI / MCP | 本机 `4.1.105`，已安装并配置 Codex；画电路的主要通道。 |
| [`easyeda-cli` Skill](https://github.com/easyeda/easyeda-cli-skill) | 按本机版本使用 CLI；已安装。 |
| [`easyeda-api` Skill](https://github.com/easyeda/easyeda-api-skill) | API 文档、格式说明及另一套 Bridge；本机 `1.1.84`，已安装，Bridge 未启用。 |
| [`easyeda-api-sdk`](https://github.com/easyeda/easyeda-api-sdk) | **开发 EDA 扩展**的工程模板；当前源码 `package.json` 为 `1.6.31`。旧地址 `easyeda/pro-api-sdk` 指向同一仓库。画普通电路无需安装。 |
| [`@jlceda/pro-api-types`](https://prodocs.lceda.cn/cn/api/guide/ancillary-projects/pro-api-types.html) | 扩展开发的 TypeScript 类型包；npm 当前 `0.4.30`，新建 SDK 工程运行 `npm install` 时作为依赖安装。 |
| [`Run API Gateway`](https://github.com/easyeda/eext-run-api-gateway) | `easyeda-api` Skill 的 WebSocket Bridge 所需扩展；[扩展广场](https://ext.lceda.cn/)显示 `1.0.8`。内置 CLI/MCP 路线不需要它。本机有名为 `Run-API-Gateway-AIHDW-1.0.8.eext` 的文件，但未确认来源或 EDA 内是否启用。 |

官方还提供按用途选择的工具：[`easyeda-eprj3-skill`](https://github.com/easyeda/easyeda-eprj3-skill) 用于从设计数据生成本地 `.eprj3` 工程；[`easyeda-format-skill`](https://github.com/easyeda/easyeda-format-skill) 用于生成底层格式数据；[`easyeda-enhanced-schematic-skill`](https://github.com/easyeda/easyeda-enhanced-schematic-skill) 增强原理图操作，但要求 Gateway 路线；[`extension-dev-skill`](https://github.com/easyeda/extension-dev-skill) 与 [`extension-dev-mcp-tools`](https://github.com/easyeda/extension-dev-mcp-tools) 用于开发、调试扩展；[`eext-easyeda-api-agent`](https://github.com/easyeda/eext-easyeda-api-agent) 是编辑器内的 AI 助手；[`spice-model-skill`](https://github.com/easyeda/spice-model-skill) 用于从数据手册制作仿真模型。这些都不是当前简单电路实验的必装依赖。

如将来要**自己开发 `.eext` 扩展**，再在 Windows PowerShell 中单独创建 SDK 工程并安装依赖（本机已有满足其要求的 Node.js 24）：

```bash
git clone --depth 1 https://github.com/easyeda/easyeda-api-sdk.git my-extension
cd my-extension
npm install
```

`easyeda-api-sdk` 与 `easyeda-api-skill` 仓库当前没有可对照的 GitHub Release；上面的版本分别来自仓库当前文件和 npm 发布包，不应把仓库版本号误当作客户端版本。

## 第一次画电路

1. 打开嘉立创 EDA 专业版，在本仓库内新建本地工程，保留完整的工程目录和 `.eprj3` 文件。
2. 可以向 Codex 描述：`请用嘉立创 EDA 为 5 V LED 指示灯画一张原理图，先确认所选 LED、限流电阻和封装，再保存到当前仓库。`
3. 核对元件数据手册、连接和极性；完成 PCB 后检查设计规则，再考虑导出制造文件。

命令与 API 会随客户端版本变化。让 AI 优先查阅已安装客户端自带的 `--help`、`doc` 和 `docs/cli-for-ai.md`，不要照搬旧版本命令。
