# 嘉立创 EDA 电路实验

这个仓库用于保存嘉立创 EDA 专业版的本地电路工程。先从简单的 5 V LED 指示灯原理图开始，再逐步尝试 PCB。实际元件、阻值和封装应以所选器件的数据手册为准。

## 本机已安装

截至 2026-11-19，已核对：

- 嘉立创 EDA 专业版 `4.1.105.0339a6cd`，位于 `C:\Users\kuang\AppData\Local\Programs\lceda-pro\`；内置 `lceda-pro` 命令行及 MCP 服务。
- 官方 [`easyeda-api` Skill](https://github.com/easyeda/easyeda-api-skill)，位于 `C:\Users\kuang\.codex\skills\easyeda-api\`，供 AI 查阅 EDA API 和文件格式。
- Codex 的 `lceda_pro` MCP 配置，位于 `C:\Users\kuang\.codex\config.toml`。**重启 Codex 后**加载新配置和 Skill。

当前采用 EDA 客户端内置的 MCP 接口。`easyeda-api` Skill 中另有基于 Run API Gateway 的桥接流程；使用内置 CLI/MCP 时无需额外安装该扩展或 Node.js 服务。

## 从零安装或重装

1. 从[嘉立创 EDA 官方下载页](https://lceda.cn/page/download)安装 **专业版 Windows 客户端**。首次使用时按客户端提示登录。
2. 在 Codex 中安装官方 Skill：将 [`easyeda/easyeda-api-skill`](https://github.com/easyeda/easyeda-api-skill) 仓库内容放到 `C:\Users\<用户名>\.codex\skills\easyeda-api\`，确认该目录下直接存在 `SKILL.md`。
3. 若 Codex 在 WSL 中运行，把下面的配置加入 `~/.codex/config.toml`，并将用户名和安装路径改为实际值：

   ```toml
   [mcp_servers.lceda_pro]
   command = "/mnt/c/Users/<用户名>/AppData/Local/Programs/lceda-pro/lceda-pro.exe"
   args = ["--mcp", "stdio"]
   ```

4. 重启 Codex。EDA 客户端运行时，AI 可通过 `lceda_pro` 操作编辑器。若客户端升级或路径改变，重新查看 `lceda-pro --mcp --help` 并更新配置。

## 第一次画电路

1. 打开嘉立创 EDA 专业版，在本仓库内新建本地工程，保留完整的工程目录和 `.eprj3` 文件。
2. 可以向 Codex 描述：`请用嘉立创 EDA 为 5 V LED 指示灯画一张原理图，先确认所选 LED、限流电阻和封装，再保存到当前仓库。`
3. 核对元件数据手册、连接和极性；完成 PCB 后检查设计规则，再考虑导出制造文件。

命令与 API 会随客户端版本变化。让 AI 优先查阅已安装客户端自带的 `--help`、`doc` 和 `docs/cli-for-ai.md`，不要照搬旧版本命令。
