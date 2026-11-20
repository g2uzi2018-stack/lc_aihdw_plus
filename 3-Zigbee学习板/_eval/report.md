# Zigbee 学习板 · 第二轮验收单

**还差 7 条飞线，当前板不能交付制板。** 原有 76 条飞线消掉了 69 条（90.8%），44 个网络中已有 39 个没有飞线。14 个限走顶层的网络全部守住。U1 和 OLED1 外观已改好。全量同步后，原来那条空的网表错误已消失。以下数字来自关闭客户端、重新打开同一工程后的检查。[打开工程](../Zigbee学习板.eprj3) · [本轮结果](result.json) · [首轮基线](round1-result.json)

## 结果与证据

A 为官方 Skill 现成功能，B 为编排官方 CLI/API，C 为直接修改原生文件或自行计算几何。本轮使用嘉立创 EDA 专业版 4.1.105.0339a6cd、easyeda-eprj3 2.2.7、Windows Node 24.20.0。沿用同一 P1、PCB1 和全部 69 个器件的位置。

| 环节 | 结果 | 完成方 | 打开工程应看到什么 |
|---|---|---|---|
| 原理图、网表、物料 | 通过 | A 生成，B 修正和核对 | 69 个位号、44 个网络、223 个逻辑引脚，其中 17 个有意悬空。原理图和 PCB 两份原生网表逐脚对题图基线均为 0 差异，物料号 0 差异，原理图 DRC 0 项。[最终网表](round2-final-netlist.json) · [BOM 基线](final-bom-net-audit.json) |
| 板框、工艺和布局保持 | 通过 | B | 板框 82 × 40 mm、R3、线宽 0.254 mm、已锁定，左下角为原点。双铜层，线间距 6 mil，普通线宽最小/默认 10/10 mil，电源 10/20 mil，过孔最小外径/孔径 24/12 mil。69 个器件位姿、225 个物理焊盘的网络分配、板框和规则与本轮开始时一致。[板框与规则](rules-result.json) · [逐项复核](round2-final-board-audit.json) |
| 14 个关键网络 | 通过 | B | USB、串口、晶振、RF 的原有 77 段线逐段比对一致，全部在顶层，过孔 0，飞线 0。全板原有 104 段均保留。[铜线比对](round2-routing-reopened-summary.json) |
| 其余 20 网双层布线 | 部分通过 | B 为主，C 计算两处局部引出坐标 | 76 → 12 → 9 → **7** 条飞线。最终 563 段线（顶层 469、底层 94），共 48 个过孔。两处新增的 U3 引出过孔均已连到底层走线。[两次官方作业与局部修复](round2-routing-validation.json) · [引出核对](round2-routing-final-escape-use.json) |
| GND 覆铜 | 通过 | B | 顶、底各一个 GND 覆铜区，重建后客户端读回填充数 150、29。GND 飞线 0。[重建及重开](round2-final-pcb.json) |
| PCB 原生 DRC | 部分通过 | B | **13 项全部为 No Connection**，分布在 5 个网络。间距违规 0，未报告短路，Netlist Error 0。板上 7 条飞线按端点间待连接关系计数，DRC 的 13 项按违规对象计数。[整工程重开后的原生明细](round2-final-pcb-reopened.json) |
| 同步原理图到 PCB1 | 通过 | B | 强制全量导入返回成功。导入前后及保存重开后，563 段线、48 个过孔、69 个器件位姿和 225 个焊盘网络逐项一致。原有 1 条空网表错误降为 0。旧错误没有对象或说明，不能追溯到某个具体引脚。[同步记录](round2-native-sync.json) · [同步前 DRC](round2-routing-reopened-drc.json) |
| U1 与 OLED1 外观 | 通过 | C 修改，B 保存重开验收 | U1 左侧 VIN.3 接 VBUS，右侧 VOUT.2 和 TAB.4 都接 +3V3，底部 GND.1 接 GND。OLED1 八段原外框都在顶层装配层，顶层丝印有七个功能标识，七个焊盘、四个孔保持原样。[U1 局部](round2-appearance-u1.png) · [OLED1 局部](round2-appearance-oled.png) · [官方导出图层核对](round2-appearance-native-oled-export.json) |

本机的内置网表文件对比函数报错，最终逐脚核对直接读取原理图和 PCB 各自导出的 JLCEDA 网表。独立的 PCB 原生 DRC 已在新窗口重跑。[逐脚结果和接口原始返回](round2-final-netlist.json)

## 剩下的 7 条在哪里

| 网络 | 飞线 | 客户端指向的两个端点 |
|---|---:|---|
| VBUS | 2 | C1.1 ↔ USB1.A4B9、USB1.A4B9 ↔ USB1.B4A9 |
| VDD | 2 | U3.24 ↔ 就近的 VDD 走线、U3.39 ↔ C18.1 |
| P0_4 | 1 | R6.1 ↔ U3.15 |
| P0_6 | 1 | U3.13 ↔ R12.2 |
| P2_2 | 1 | R10.2 ↔ U3.34 |

本轮已放开单信号最多 2 孔的限制。先对 20 网调用官方自动布线，保留原铜线，显式排除另 24 个已通网络。随后用 API 修正 U3 局部短接和窄引线，消掉第一轮新增的两项间距违规，并撤下带来违规的试探引出。最后只为剩余 5 网运行官方的完成率优先作业。这是当前布局与保留走线条件下实测到的结果，不能据此认定官方算法最多只能布到这里。[飞线端点及坐标](round2-final-endpoints.json) · [路由过程](round2-routing-validation.json)

| 每网过孔数 | 网络 |
|---:|---|
| 12 | VDD |
| 5 | +3V3、GND |
| 4 | RESET |
| 2 | P0_0、P0_1、P0_7、P1_0、P1_1、P1_2、P1_5、P1_6、P2_0 |
| 1 | P1_3、P1_4、P2_1、P2_2 |
| 0 | 其他 27 网，包括全部 14 个关键网络 |

其中 46 孔的外径/孔径为 24.0157/12.0079 mil，另 2 孔为 24/12 mil。[按网络和尺寸回读](round2-final-board-audit.json)

## 在客户端快速验收

1. 打开 P1，放大底部的 AMS1117-3.3 电源块，对照 U1 四个脚的位置与网络。再看 USB1 的 A8、B8 和调试座 P1 的 5、6、8、9、10 脚，均应各自带悬空标记。全页 17 脚与 PCB 焊盘的复核结果可按位号查阅。[原理图全页](P1.png) · [U1 放大图](round2-appearance-u1.png) · [悬空脚读回](round2-patches.json)
2. 打开 PCB1，放大左上角 OLED1。切换顶层丝印和顶层装配层，检查七个文字和外框分别在哪一层。选板框，在右侧属性查看 82 × 40 mm、R3 和锁定。用 **设计 → 设计规则** 核对间距和线宽，按 **Shift+M** 可切换铺铜显示，便于看清双层走线。[PCB 全板](pcb.png) · [OLED1 放大图](round2-appearance-oled.png) · [官方显示操作](https://prodocs.lceda.cn/cn/faq/editor/)
3. 在 PCB1 点 **设计 → 检查 DRC**。底部展开连接性错误可见 5 组、13 项，网表错误 0。双击错误项会定位到画布，再用上表核对 7 条飞线。[本工程最终 DRC](round2-final-pcb-reopened.json) · [官方检查操作](https://prodocs.lceda.cn/cn/pcb/design-check-drc/)

## 三个临时补丁和 AIHDW 处置

**本题可以整体封存 AIHDW 旧流程，单独保留下面三个脚本。** 三者互不依赖，也不依赖 AIHDW 运行时。第一、二项补的是 eprj3 生成问题。第三项只在官方编辑路径受阻且有匹配配置时启用。官方提供了符号、封装编辑 API。本轮真实会话有账号身份、处于半离线模式，个人库 UUID 返回空值，因此复制入个人库、编辑并回写的整条路径标为**环境阻塞**。本轮通过的是同工程内嵌定义路径。[个人库实测](round2-routing-session-environment.json) · [外观保存重开](round2-appearance-audit.json)

| 补丁 | 适用缺口、AIHDW 关系 | 本轮可用性 | 何时移除 |
|---|---|---|---|
| [patch-board-outline](patches/patch-board-outline.js) | eprj3 重算固定板框。对原有板框图元调用官方 API，无需旧板框模块。 | B。首轮真实错板框已修正，本轮在成品运行返回 already-correct，重新打开复核成功。 | 新版官方从同题直接生成，保存重开后尺寸、圆角、线宽、锁定和板边检查均正确。 |
| [patch-nc-open-pins](patches/patch-nc-open-pins.js) | eprj3 把明确悬空脚挂到同名 NC。按题图脚号和线段识别错误导线，用官方 API 清理并在需要时同步 PCB，无需旧框架。 | B。首轮真故障修过 13 根错误导线，本轮独立脚本复核 17 个悬空脚均正确。两个 B 脚本再执行前后文件哈希一致。 | 新版官方从同题直接生成，保存重开后每个悬空脚独立，原理图与 PCB 逐脚网表均符合题图。 |
| [patch-lib-appearance](patches/patch-lib-appearance.js) | 参考 AIHDW 的 footprint_library.py、symbol_device_geometry.py 排查个人库。在半离线工程上，用独立 Node 脚本按配置修改内嵌图元和 U1 的关联导线。 | C。本题实写、再次运行零改动，官方客户端保存重开及完整同步通过。换库或换题须提供对应图元和原值。[本题配置](patches/patch-lib-appearance.zigbee.json) | 新版官方能在相同场景独立完成两处外观，保存重开及同步后，图层、焊盘、物料、引脚网表和原生检查均吻合。 |

板框和 NC 的缺口归于 Skill 包装。个人库是否可用取决于工作区和运行模式，本轮没有证明所有客户端均缺少编辑接口。余下 7 条反映固定布局下的物理布线困难，本轮没有证据说明必须引入外部布线器。旧项目的布线链和适配层均可留档。三个脚本的命令、入参和退出条件见[补丁用法](patches/README.md)。

外观写入前的第一次备份检查误把历史记录当成活动图元。已用原始图元重建回退副本，重放后两份文档与实写结果逐字节一致。随后又核验了完整同步前后的走线、孔、位姿及焊盘。[回退校验](round2-appearance-backup-proof.json) · [同步校验](round2-native-sync.json)

本轮验收范围为上述布线、覆铜、外观和检查。首轮遗留的 AHT20 隔热槽、RF 屏蔽、泪滴、其他接口丝印以及电源先过电容的拓扑没有在本轮逐项验收。
