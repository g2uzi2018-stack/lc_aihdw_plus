# 嘉立创 EDA 电路实验

这个仓库保存嘉立创 EDA 专业版的本地电路工程。首次实验建议从 5 V LED 指示灯原理图开始；元件参数、极性和封装以数据手册为准。

## 当前采用的官方 AI 接口（2026-11-19）

| 组件 | 本机状态 | 用途 |
| --- | --- | --- |
| [嘉立创 EDA 专业版客户端](https://lceda.cn/page/download) | `4.1.105.0339a6cd`，与官方下载页当前 `4.1.105` 一致 | 编辑原理图和 PCB；内置 `lceda-pro` CLI 与 MCP 服务 |
| [官方 `easyeda-cli` Skill](https://github.com/easyeda/easyeda-cli-skill) | 已装在 `C:\Users\kuang\.codex\skills\easyeda-cli\` | 指导 AI 检测客户端，并按本机 `--help` 与 `doc` 查询接口 |
| Codex MCP 配置 | 已写入 `C:\Users\kuang\.codex\config.toml` | 通过客户端内置的 `--mcp stdio` 连接 EDA |

这条路径是 **Codex → 客户端内置 MCP/CLI → 编辑器扩展 API → 本地工程**。客户端还内置 API 与工程格式查询命令；无需单独部署服务。先前安装的 `easyeda-api` Skill 已移至 `C:\Users\kuang\.codex\skills-disabled\easyeda-api\`，不会再引导当前设计流程。重启 Codex 后加载 Skill 和 MCP 配置。

## 安装或重装

1. 从[官方下载页](https://lceda.cn/page/download)安装专业版客户端；确认版本不低于官方 [`easyeda-cli` Skill](https://github.com/easyeda/easyeda-cli-skill)要求的 `4.1.70`。
2. 将 [`easyeda-cli-skill`](https://github.com/easyeda/easyeda-cli-skill) 的仓库内容放进 `C:\Users\<用户名>\.codex\skills\easyeda-cli\`，使 `SKILL.md` 直接位于该目录下。
3. Codex 若运行在 WSL，在 `~/.codex/config.toml` 中加入以下配置，并按实际安装路径修改用户名：

   ```toml
   [mcp_servers.lceda_pro]
   command = "/mnt/c/Users/<用户名>/AppData/Local/Programs/lceda-pro/lceda-pro.exe"
   args = ["--mcp", "stdio"]
   ```

4. 重启 Codex，打开 EDA 专业版后开始设计。每次客户端升级，都以安装目录中 `lceda-pro.exe --help` 和 `lceda-pro.exe doc api` 的输出为准。

## SDK 与专用工具

[`easyeda-api-sdk`](https://github.com/easyeda/easyeda-api-sdk) 是**开发 `.eext` 扩展**的工程模板，不是画普通电路或使用内置 MCP 的运行依赖。其当前默认分支 `package.json` 为 `1.6.31`；旧地址 `easyeda/pro-api-sdk` 指向同一仓库。[`@jlceda/pro-api-types`](https://prodocs.lceda.cn/cn/api/guide/ancillary-projects/pro-api-types.html) 是扩展开发的 TypeScript 类型包，npm 当前版本为 `0.4.30`。将来开发扩展时，在 Windows PowerShell 中单独创建工程；本机已装 Node.js 24，满足 SDK 的 Node.js ≥20.17 要求：

```powershell
git clone --depth 1 https://github.com/easyeda/easyeda-api-sdk.git my-extension
cd my-extension
npm install
```

官方另有 [`easyeda-eprj3-skill`](https://github.com/easyeda/easyeda-eprj3-skill)，适合按结构化设计数据批量生成 `.eprj3` 工程；当前源码为 `2.2.7`，最新 GitHub Release 是 `v2.2.4`。它是后续复杂工程的可选工作流。底层文件格式生成可参考 [`easyeda-format-skill`](https://github.com/easyeda/easyeda-format-skill)。当前首次实验先使用客户端内置 CLI/MCP，避免叠加多套生成流程。

## 第一次画电路

1. 打开 EDA 专业版，在本仓库内新建本地工程，保留完整的工程目录和 `.eprj3` 文件。
2. 可以对 Codex 说：`请用嘉立创 EDA 设计一个 5 V LED 指示灯原理图。先确认 LED 型号、限流电阻和封装，再在当前仓库保存工程。`
3. 核对数据手册、连线、极性与设计规则；完成 PCB 后再考虑导出制造文件。

本次仅核对安装文件、版本与配置，未运行冒烟测试或实际绘图。
