# 嘉立创 EDA 专业版工程修复脚本

板框和悬空脚两份 JavaScript 文件是官方 CLI 的异步函数体，参数由 `__CLI__.args` 读取。使用本机 4.1.105.0339a6cd 的大陆版客户端。从已保存的工程启动专用 CLI 会话，修复与读回期间只在此会话打开该工程。脚本会关闭并重开指定标签页。客户端关闭标签页时会丢弃其中未保存的编辑。

以下 Bash 示例使用本题工程及其 UUID。从该工程的 `_eval/patches` 目录执行，令 `CLI` 指向本机检测到的官方可执行文件。

```bash
PROJECT='C:\Zzkuang\workspace\lc_aihdw_plus\3-Zigbee学习板\Zigbee学习板.eprj3'
PATCH_DIR='C:\Zzkuang\workspace\lc_aihdw_plus\3-Zigbee学习板\_eval\patches'
SESSION=$("$CLI" open --path "$PROJECT" --headless false | python3 -c 'import json,sys; print(json.load(sys.stdin)["value"]["sessionId"])')
PROJECT_UUID=$("$CLI" invoke --session "$SESSION" --ext-uuid eda --code-file - <<< 'if (!(await eda.dmt_Project.waitForReady(undefined,30000))) throw Error("Project tree not ready"); return (await eda.dmt_Project.getCurrentProjectInfo()).uuid' | python3 -c 'import json,sys; print(json.load(sys.stdin)["value"])')
```

本机此例使用 Windows 反斜杠路径打开一个可见的专用窗口。工程树就绪后，从该次会话取工程 UUID。同一工程以斜杠或反斜杠路径打开时，客户端可能给出不同的运行期 UUID。

## 固定板框

适用于发生器重算了单个矩形板框的工程。给定板框图元 ID 可保留其他轮廓和板内开槽。未传 `outlineId` 时要求第 11 层恰有一个无网络的轮廓折线。默认保留原矩形左下角，可用 `leftBottomMm` 指定新锚点。仅支持水平矩形，已旋转的板框会报错。尺寸与圆角单位为 mm，线宽及可选画布偏移单位为 mil。`copperLayers` 和 `originMil` 可省略；省略后脚本只改轮廓属性。

```bash
BOARD_ARGS='{"projectUuid":"'"$PROJECT_UUID"'","pcbUuid":"0d423a3a93f1744c","outlineId":"06bf6d5071462681","widthMm":82,"heightMm":40,"radiusMm":3,"leftBottomMm":[0,0],"lineWidthMil":10,"locked":true,"originMil":[0,0],"copperLayers":2,"apply":false}'
"$CLI" invoke --session "$SESSION" --ext-uuid eda --args "$BOARD_ARGS" --code-file "$PATCH_DIR/patch-board-outline.js"
```

返回 `needs-repair` 时先看 `before` 与 `changes`。需要落盘时，将参数的 `apply` 改为 `true` 并重跑同一命令。脚本保存后重开 PCB，复核图元 ID、尺寸、半径、线宽、锁定、原点和铜层数。工程已满足参数时返回 `already-correct`，跳过写入与保存。

**移除条件**：上游按同一题目的固定尺寸生成工程，未经本脚本干预，官方客户端重开后能读回相同板框、圆角、线宽、锁定及所要求的原点和层数。

## 原图悬空脚

把题图中明确画了悬空标记的引脚列入 `openPins`，格式为“位号.引脚编号”，包含连接器的字母脚号。每次指定一张原理图图页及其配对的 PCB。示例包含首轮受影响的 13 脚和题图的 4 个机械孔引脚。可选 `stubNet` 为误生成的网名，默认值为 `NC`。

```bash
NC_ARGS='{"projectUuid":"'"$PROJECT_UUID"'","pageUuid":"710b8052ef26c189","pcbUuid":"0d423a3a93f1744c","openPins":["USB1.B8","USB1.A8","U2.4","BUZZER1.3","U3.14","U3.37","P1.5","P1.6","P1.8","P1.9","P1.10","U4.1","U4.6","SCREW1.1","SCREW2.1","SCREW3.1","SCREW4.1"],"apply":false}'
"$CLI" invoke --session "$SESSION" --ext-uuid eda --timeout 180000 --args "$NC_ARGS" --code-file "$PATCH_DIR/patch-nc-open-pins.js"
```

返回 `needs-repair` 时，检查 `stubs` 中的引脚与导线 ID、缺少的标记和是否需要同步 PCB。设置 `apply:true` 会补上缺少的悬空标记。脚本从当前图页源码读取 WIRE、导线 NET 属性及按 lineGroup 归属的 LINE 线段。只有从该引脚端点出发、具有指定网名、无任何其他引脚或导线接触的单段直线才会按图元 ID 删除。若候选导线有分支或存在功能网名，脚本报出位号或图元 ID。

脚本在重开图页后检查每个悬空标记、每个引脚的网名以及其余导线的 ID、几何和网络。如果目标 PCB 仍有旧焊盘网络，则从配对原理图同步并保存。重开 PCB 后逐焊盘复核，并比较既有走线、圆弧和过孔。全部正确时返回 `already-correct`，跳过图元写入、网表导入与保存。发生错误时可根据点名的引脚或图元检查当前状态；修正后用相同参数重跑。

**移除条件**：上游从题图独立生成的工程在官方客户端重开后，每个应悬空的引脚均有独立标记、原理图引脚网名与对应 PCB 焊盘网名均为空，原有功能网络的引脚归属完整。

```bash
"$CLI" session close --session "$SESSION" --destroy
```

## 工程内嵌符号和封装外观

`patch-lib-appearance.js` 在已关闭的原生工程上运行。它用 Windows Node.js 24 按配置更新现有符号、封装或图页内指定图元。配置中的 `files` 给出原生文件的相对路径、文档种类和 UUID，`sections` 给出图元 ID、原值和目标值。目标值已满足时跳过该图元；若现状与配置的原值及目标值都不同，脚本会指出文件、文档和图元并在写入前停止。换题或换库时应根据实际图元和连线重新填写配置。

从工作区根目录运行。本题配置将 U1 的 VIN 放左侧、两个输出放右侧、GND 放下侧，并同时调整关联的原理图导线和电源标号。OLED1 的八段外框移至顶层装配层，七个顶层丝印文本分别标明引脚。补丁范围及数量可先预览。

```bash
NODE='/mnt/c/Users/kuang/Apps/node/node-v24.20.0-win-x64/node.exe'
DIR='3-Zigbee学习板'
PATCH="$DIR/_eval/patches"
"$NODE" "$PATCH/patch-lib-appearance.js" "$DIR" "$PATCH/patch-lib-appearance.zigbee.json"
"$NODE" "$PATCH/patch-lib-appearance.js" "$DIR" "$PATCH/patch-lib-appearance.zigbee.json" --apply
```

写入后用官方客户端打开、保存、重开同一工程，读回符号及封装几何，导出原理图网表，与改前完整网表比对，再核对题图的图层与文字。个人库要有客户端返回的可写库 UUID，个人库探测结果独立记录于 `round2-appearance-identity.json` 和 `round2-appearance-workspace-settled.json`。

本题已在 4.1.105 的可见客户端保存、关闭和重开，补丁再次执行时两份文档的改动数均为 0。原生几何与网表覆盖 69 个位号，OLED 图层、文字和孔位取自客户端直接导出的 PCB 文档。见上级目录的 `round2-appearance-audit.json`、`round2-appearance-native-oled-export.json` 及两张局部图。

**移除条件**　官方新版本可在同一工程完成这两处外观和关联导线修改，经官方客户端保存重开后，符号方向、丝印与装配图层、物料及全板引脚网络仍正确，并通过对应的规则核对。
