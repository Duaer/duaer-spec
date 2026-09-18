/**
 * Duaer-spec FED (live desk) i18n — zh-CN (default) + en.
 */

export const LOCALES = ["zh-CN", "en"];

const STORAGE_KEY = "duaer.live.locale";

const zhCN = {
  "doc.title": "Duaer-spec FED",
  "header.mark": "现场开发",
  "header.brand": "Duaer-spec FED",
  "header.brandProduct": "Duaer-spec",
  "header.brandFed": "FED",
  "header.beginner": "小白也能做FED",
  "header.tag": "规范需求 → 可检查验收 → 派工 → 满意成品 → 可继续改进",
  "lang.label": "语言",
  "history.toggle": "历史",
  "history.mark": "History",
  "history.title": "历史任务",
  "history.close": "关闭",
  "history.restore": "恢复到当前桌面",
  "history.empty": "还没有历史任务",
  "history.loadFail": "无法加载历史",
  "history.restored": "已恢复工单 {id}。右侧可看确认卡 / 进度 / 成品。",
  "history.meta": "{status} · {time}",
  "history.detailMeta": "{id} · {status} · {time}",
  "setup.mark": "Duaer-spec FED · model",
  "setup.title": "配置模型",
  "setup.hint": "先接好模型，再在台面说需求。写入 ~/.duaer/live/config.json",
  "setup.provider": "服务商",
  "setup.providerAria": "服务商预设",
  "setup.save": "保存并开始",
  "setup.saveFail": "保存失败",
  "setup.keySaved": "已保存（留空则不改）",
  "provider.custom": "自定义",
  "chat.aria": "对话",
  "chat.inputLabel": "你的话",
  "chat.placeholder": "想做什么…",
  "chat.revisePlaceholder": "说说哪里不满意、为什么…",
  "chat.send": "发送",
  "chat.emptyMark": "Duaer-spec FED",
  "chat.emptyTitle": "小白也能做FED",
  "chat.emptyHint": "用大白话说想要什么，不用学术语；确认后派工，数字员工按验收去做",
  "chat.emptyStep1": "用大白话说想要什么，不用学术语",
  "chat.emptyStep2": "确认后派工",
  "chat.emptyStep3": "数字员工按验收去做",
  "chat.emptyStepsAria": "怎么用",
  "chat.optFeature": "我要做一个新功能",
  "chat.optChange": "我要改现有功能",
  "chat.optBug": "我要修一个 bug",
  "chat.optScript": "我要写一个脚本/自动化",
  "card.mark": "Confirm card",
  "card.title": "需求",
  "card.aria": "需求",
  "card.goal": "要做什么",
  "card.out": "不做什么",
  "card.accept": "验收标准",
  "card.acceptHint": "写可核对结果：打开何处、看到什么、哪条命令通过（勿写「更好用」）",
  "card.assume": "假设",
  "card.placeholder": "待确认",
  "card.lockHint": "确认前自动校验；通过后才能发出",
  "card.lockHintLocked": "已确认。选择产品仓库派工，Brief 才会进入业务仓 worktree。",
  "card.lockHintReady": "校验已通过，可以确认发出。",
  "card.lockHintNeed": "至少填好「要做什么」和可检查的「验收标准」。",
  "card.lockHintNeedValidate": "填好后会自动校验；通过后才能确认。",
  "card.lockHintChecking": "正在校验需求是否可执行、验收是否可检查…",
  "card.lockHintFailed": "校验未通过；请改卡或点「自动处理」。",
  "card.autoHandle": "自动处理",
  "card.autoHandling": "自动处理中…",
  "card.lockHintRevise": "改进卡同样需可检查验收，校验通过后才能续派。",
  "card.confirm": "需求无误，开始干活",
  "card.confirmed": "已确认",
  "card.validating": "校验中…",
  "card.accepting": "锁定中…",
  "card.fixing": "自动修正中…",
  "validate.checking": "校验中：目标可执行、验收可检查、足以满意交付…",
  "validate.passed": "校验通过：{summary}",
  "validate.failed": "校验未通过：{summary}{detail}",
  "bot.needValidate": "请先等校验通过（或点「自动处理」）后再发出。交给数字员工的必须是可执行、可验收的需求。",
  "err.validate": "校验失败",
  "dispatch.mark": "Dispatch · product repo",
  "dispatch.title": "派工到产品仓库",
  "dispatch.browse": "浏览…",
  "dispatch.browsing": "选择中…",
  "dispatch.scan": "扫描本机",
  "dispatch.scanning": "扫描中…",
  "dispatch.filter": "筛选",
  "dispatch.filterPh": "按名称过滤…",
  "dispatch.path": "或粘贴路径 / 项目名",
  "dispatch.pathPh": "/Users/…/your-product 或 my-app",
  "dispatch.pathHint": "路径不存在会自动创建；填项目名时在父目录下新建",
  "dispatch.deployTarget": "计划托管平台",
  "dispatch.deployTargetHint":
    "选好后数字员工按该平台约束写代码（Cloudflare → Workers/Pages）",
  "dispatch.deploy.none": "暂不部署",
  "dispatch.deploy.cloudflare": "Cloudflare",
  "dispatch.deploy.aliyun": "阿里云",
  "dispatch.deploy.aws": "AWS",
  "dispatch.deploy.github-pages": "GitHub Pages",
  "dispatch.projectsRoot": "产品父目录",
  "dispatch.projectsRootPh": "/Users/…/Projects",
  "dispatch.saveProjectsRoot": "保存父目录",
  "dispatch.projectsRootSaved": "父目录已保存",
  "dispatch.projectsRootFail": "父目录保存失败",
  "dispatch.agentLabel": "用哪个 CLI 数字员工启动",
  "dispatch.agentHint": "检测本机 PATH 上的 Cursor Agent / Claude Code",
  "dispatch.redetect": "重新检测",
  "dispatch.redetecting": "检测中…",
  "dispatch.needCli": "需要安装 CLI",
  "dispatch.needCliNamed": "未安装 {label} — 复制下方命令安装",
  "dispatch.needInstall": "请先安装 CLI",
  "dispatch.copyInstall": "复制安装命令",
  "dispatch.copied": "已复制",
  "dispatch.startCmd": "启动命令（开头须为 Duaer）",
  "dispatch.startCmdPh": "Duaer\n\n在这里写要数字员工做的事…",
  "dispatch.do": "写入 Brief 并启动",
  "dispatch.doWithAgent": "派工并用 {label} 启动",
  "dispatch.done": "已派工",
  "dispatch.working": "派工中…",
  "preview.title": "结果",
  "preview.view": "查看结果",
  "preview.auto": "自动发现",
  "preview.link": "\n结果：{url}",
  "preview.missing":
    "\n（未找到 preview / index.html，可让数字员工在 delivery.json 写入 preview.url）",
  "preview.versions": "历史版本",
  "preview.versionInitial": "初版",
  "preview.versionRev": "r{revision}",
  "revise.mark": "Revise card",
  "revise.title": "改进卡",
  "revise.hint": "左侧对话说清改动；本卡在下方填写，确认后送入同一 Terminal。",
  "revise.goal": "要改什么",
  "revise.out": "不要动什么",
  "revise.accept": "怎么算改好",
  "revise.assume": "不满意原因",
  "revise.goalPh": "例如：主色改浅、标题加大",
  "revise.outPh": "例如：不动文案结构",
  "revise.acceptPh": "例如：打开首页看到主色按钮 #0d6e6e，无多余渐变",
  "revise.assumePh": "例如：主色太沉、看不清",
  "revise.again": "再改一版",
  "revise.dispatch": "改进方案确认，再派一版",
  "revise.dispatching": "续派中…",
  "revise.hintIdle": "结果可用后点「再改一版」；左侧对话，下方填写改进卡。",
  "revise.hintBusy": "正在左侧对话完善下方改进卡…",
  "revise.hintReady": "下方改进卡已就绪：点「再派一版」，任务送入原 Terminal。",
  "revise.hintNeed": "请在左侧说明哪里不满意；我会填下方改进卡。卡齐后可点再派。",
  "revise.hintEnqueue": "正在送入同一 Terminal（不新开窗口）…",
  "revise.hintLocked": "本轮改进卡（下方）已确认。改完验收后若仍不满意，再点「再改一版」。",
  "revise.hintRevising": "数字员工改写中。可继续「查看结果」；验收后再点「再改一版」。",
  "revise.hintStuck":
    "Terminal 仍忙且尚无任务进度。可结束旧任务后点「再改一版」重试续派。",
  "bot.ready":
    "模型已就绪。随便说你想做什么；我会多轮问清，右侧是确认卡。确认前不会改你的业务仓库。",
  "bot.cardReady": "右侧确认卡可再改。满意后点「需求无误，开始干活」。",
  "bot.reviseCardReady":
    "下方改进卡已更新。看「要改什么 / 怎么算改好」，满意就点「改进方案确认，再派一版」。",
  "bot.enterRevise":
    "已进入改进。上方确认卡仍是原需求；请在左侧对话，在下方改进卡填写改动。填齐后点「再派一版」。",
  "bot.continueRevise":
    "继续在左侧说哪里不满意；改动写在下方改进卡，再点「再派一版」。",
  "bot.accepted":
    "数字员工已验收通过。可点「查看结果」；不满意再点结果旁「再改一版」。",
  "bot.acceptFailed": "自动验收未通过：{summary}{detail}",
  "bot.acceptFailedDefault": "请修改确认卡",
  "bot.autoFix": "自动修正",
  "bot.autoHandleStart": "正在自动处理确认卡（按校验问题改写成可检查验收）…",
  "bot.validateFixed": "已自动处理并通过校验：{summary}。可以点确认发出。",
  "bot.fixing": "修正中…",
  "bot.fixStillFailed":
    "自动修正后仍未通过{note}，可再点自动修正或手改确认卡。",
  "bot.confirmFixed":
    "已自动修正并验收通过。隔离区 Brief 已就绪；请选择产品仓库派工。",
  "bot.confirmOk":
    "自动验收通过。隔离区 Brief 已就绪；请选择产品仓库派工（建 worktree + 写入 Brief）。",
  "bot.confirmFail": "确认失败：{msg}",
  "bot.autoFixFail": "自动修正失败：{msg}",
  "bot.repoPrepared": "已准备仓库 {name}（{prep}）并记住",
  "bot.repoSelected": "已选择并记住仓库 {name}",
  "bot.dispatchDone":
    "{duaer}{who}。进度看下方清单与日志；完成后可「查看结果」。\n{path}",
  "bot.reviseDispatched":
    "已确认改进方案并启动 Revision {revision}（{launch}）。{restated}\n下方保留本轮改进卡；上方确认卡仍是原需求；可继续查看结果。",
  "bot.reviseLaunchReuse": "已送入原 Terminal",
  "bot.reviseLaunchQueued":
    "已排入原 Terminal，当前任务结束后自动跑",
  "bot.reviseLaunchPreempt":
    "已中止上一轮残留会话，正在启动本轮改进",
  "bot.reviseLaunchContinue": "Terminal agent/claude --continue",
  "bot.reviseLaunchNew": "新会话",
  "bot.reviseRestate": "\n改：{change}\n验：{acceptance}",
  "bot.chatError": "出错：{msg}",
  "bot.chatNotReady": "模型尚未就绪，请先完成左侧配置并保存。",
  "bot.chatBusy": "上一条还在处理，请稍候再发；若卡住可再点一次发送。",
  "bot.chatReviseBusy": "正在续派改进，请稍候。",
  "bot.chatLockedHint":
    "需求卡已确认锁定，对话不会改卡内容。要改 Brief 请点「再改一版」。",
  "bot.reviseKickoffFail":
    "改进对话没启动起来：{msg}。你也可以直接在左侧输入哪里不满意。",
  "update.notice":
    "新版本 {latest}（当前 {current}）。终端执行：npm i -g duaer-spec@latest（或 duaer self-update）；业务仓再跑 npx duaer-spec@latest update",
  "update.noticeHtml":
    "新版本 <code>{latest}</code>（当前 <code>{current}</code>）。终端执行：<code>npm i -g duaer-spec@latest</code>（或 <code>duaer self-update</code>）；业务仓再跑 <code>npx duaer-spec@latest update</code>",
  "repo.recent": "最近",
  "repo.discovered": "发现",
  "repo.empty":
    "点「浏览…」或「扫描本机」，也可在产品仓执行 duaer live repo add",
  "repo.emptyFilter": "无匹配仓库",
  "meta.model": "模型 {model} · Brief → {jobs}",
  "progress.inProgress": "进行中",
  "progress.mark": "Progress",
  "progress.title": "任务进度",
  "progress.aria": "任务进度",
  "progress.emptyTitle": "还没有进度",
  "progress.empty": "派工后显示各轮任务与改动文件",
  "run.mark": "Run",
  "run.dispatch": "派工进度",
  "run.revision": "Revision {revision} 进度",
  "run.note.dispatch": "本轮首次派工",
  "run.note.revision": "要改：{goal}\n怎么算好：{acceptance}",
  "status.waiting": "等待数字员工 · 监听 tasks.md 进度…",
  "status.running": "数字员工已启动 · 监听 tasks.md 进度…",
  "status.poll": "状态：{st}{pct}{rev}{wt}",
  "status.worktreeGone": " · worktree 已移除",
  "status.acceptedRevise": "delivery accepted · 可继续改进{rev}",
  "status.revisingLine": "状态：revising · r{revision} · continue",
  "agent.notInstalled": "{label} · 未安装",
  "agent.clickInstall": "安装命令见下方（可复制）",
  "agent.installed": "已安装 · 可用",
  "agent.installedPath": "已安装 · {path}",
  "agent.missingHint": "未检测到：{list} — 见下方安装命令",
  "agent.partialHint": "可用：{ok}；未安装：{miss} — 点选未安装项查看命令",
  "agent.detected": "已检测本机可用启动器",
  "prep.baseBranch": "已创建 develop 分支",
  "prep.gitInit": "已 git init",
  "prep.duaerInit": "已在此目录安装 Duaer",
  "launch.none": "启动: 未启动",
  "launch.line": "启动: {label}{pid}{cli}{script}{log}",
  "launch.pid": " (pid {pid})",
  "launch.cli": "\nCLI: {cmd}",
  "launch.script": "\nTerminal脚本: {path}",
  "launch.log": "\n日志: {path}",
  "launch.reused": "已送入原 Terminal（{who}）",
  "launch.queuedWait": "已排入原 Terminal，当前任务结束后自动跑（{who}）",
  "launch.terminal": "已打开 Terminal，正在执行 CLI（{who}）",
  "launch.spawned": "已用 {who} 启动",
  "launch.duaerInstalled": "已在指定目录安装 Duaer；",
  "launch.duaerReady": "Duaer 已就绪；",
  "result.review": "自动验收：{summary}\n",
  "result.fix": "自动修正：{summary}\n",
  "result.confirmOk":
    "{review}Live Brief: {dir}\n分支建议: {branch}\n\n下一步：下方选择产品仓库派工。",
  "result.dispatchOk":
    "派工完成\n仓库: {repo}\nWorktree: {worktree}\nBrief: {brief}\n{launch}\n\n—— 启动命令 ——\n{cmd}",
  "result.revision":
    "Revision {revision} 已续派\n要改：{goal}\n怎么算好：{acceptance}",
  "startCmd.goalFallback": "（在此写清要做什么）",
  "startCmd.body":
    "按 Duaer 数字员工流程开工：只做 Brief 范围；边做边勾选 tasks.md；完成后 stamp delivery.json 为 accepted（有页面时写入 preview.url，如 index.html）；不要推远程除非明确要求。",
  "err.noRepo": "先点选仓库，或浏览 / 扫描",
  "err.noJob": "没有可改进的工单",
  "err.reviseFields": "先在下方改进卡补全「要改什么」和「怎么算改好」",
  "err.chat": "对话失败",
  "err.streamIncomplete": "流式响应不完整",
  "err.pick": "选择失败",
  "err.pickFromList": "请从下方列表点选具体仓库",
  "err.dispatch": "派工失败",
  "err.dispatchTimeout":
    "派工超时（60s）。请刷新重试；若 worktree 已存在需换分支名或删掉旧 worktree。",
  "err.revise": "继续改进失败",
  "err.reviseKickoff": "改进对话启动失败",
  "err.confirm": "确认失败",
  "err.timeout": "超时。请刷新重试；若 Agent 已打开可在 Terminal 里继续。",
  "err.reviseTimeout":
    "续派超时（约 3 分钟）。Brief 未写入本轮 Revision 时可直接再点「再派一版」；若 Terminal 已有任务请在窗口里继续。",
  "err.code.PREEMPT_FAILED":
    "无法抢占仍在运行的 Agent。请结束该 worktree 的 Terminal 任务后，再点「再派一版」。",
  "err.code.CHILD_TIMEOUT": "子进程超时被中止。请重试续派；若 git/init 卡住请检查仓库与钩子。",
  "err.code.LAUNCH_FAILED": "续派启动失败。可直接再点「再派一版」重试。",
  "err.code.NO_AGENT": "未检测到可用 CLI。请安装 Cursor Agent 或 Claude Code 后重试。见 docs/agent/worker-models.zh-CN.md",
  "err.code.AGENT_MISSING": "所选 CLI 未安装。请安装后重试。",
  "err.retryableHint": "可以再试一次。",
  "status.terminalLine": "Terminal：{state}",
  "status.terminalBusy": "忙碌中",
  "status.terminalIdle": "空闲",
  "status.terminalQueue": "队列 {n}",
  "status.terminalDown": "无 runner",
  "err.installAgent": "请先安装：{cmd}",
  "err.needAgent": "请先安装所选 CLI",
  "err.needAgentAlt": "请先安装对应 CLI",
  "err.agentsDetect": "无法检测本机 CLI",
  "err.copy": "复制失败",
  "err.autoFix": "自动修正失败",
};

const en = {
  "doc.title": "Duaer-spec FED",
  "header.mark": "Field Engineering Desk",
  "header.brand": "Duaer-spec FED",
  "header.brandProduct": "Duaer-spec",
  "header.brandFed": "FED",
  "header.beginner": "Beginners can do FED too",
  "header.tag": "Norms → checkable acceptance → dispatch → satisfactory preview → revise",
  "lang.label": "Language",
  "history.toggle": "History",
  "history.mark": "History",
  "history.title": "Past jobs",
  "history.close": "Close",
  "history.restore": "Restore to desk",
  "history.empty": "No past jobs yet",
  "history.loadFail": "Could not load history",
  "history.restored": "Restored job {id}. Confirm card / progress / preview are on the right.",
  "history.meta": "{status} · {time}",
  "history.detailMeta": "{id} · {status} · {time}",
  "setup.mark": "Duaer-spec FED · model",
  "setup.title": "Configure model",
  "setup.hint": "Connect a model first, then state the job. Saved to ~/.duaer/live/config.json",
  "setup.provider": "Provider",
  "setup.providerAria": "Provider presets",
  "setup.save": "Save and start",
  "setup.saveFail": "Save failed",
  "setup.keySaved": "Saved (leave blank to keep)",
  "provider.custom": "Custom",
  "chat.aria": "Chat",
  "chat.inputLabel": "Your message",
  "chat.placeholder": "What do you want to build…",
  "chat.revisePlaceholder": "What is wrong and why…",
  "chat.send": "Send",
  "chat.emptyMark": "Duaer-spec FED",
  "chat.emptyTitle": "Beginners can do FED too",
  "chat.emptyHint": "Say what you want in plain words — no jargon. Confirm, dispatch, and the digital employee delivers to acceptance",
  "chat.emptyStep1": "Say what you want in plain words — no jargon",
  "chat.emptyStep2": "Confirm, then dispatch",
  "chat.emptyStep3": "The digital employee delivers to acceptance",
  "chat.emptyStepsAria": "How to use",
  "chat.optFeature": "I want a new feature",
  "chat.optChange": "I want to change something",
  "chat.optBug": "I want to fix a bug",
  "chat.optScript": "I want a script / automation",
  "card.mark": "Confirm card",
  "card.title": "Requirements",
  "card.aria": "Requirements",
  "card.goal": "Goal",
  "card.out": "Out of scope",
  "card.accept": "Acceptance",
  "card.acceptHint":
    "Checkable outcome: open where / see what / which command passes (not “looks better”)",
  "card.assume": "Assumptions",
  "card.placeholder": "Pending",
  "card.lockHint": "Validated before confirm; only then can you send",
  "card.lockHintLocked":
    "Confirmed. Pick a product repo so the Brief enters that worktree.",
  "card.lockHintReady": "Validation passed — you can confirm and send.",
  "card.lockHintNeed": "Fill at least Goal and checkable Acceptance.",
  "card.lockHintNeedValidate": "Card auto-validates when filled; confirm unlocks after pass.",
  "card.lockHintChecking": "Checking executable goal and checkable acceptance…",
  "card.lockHintFailed": "Validation failed — edit the card or tap Auto-handle.",
  "card.autoHandle": "Auto-handle",
  "card.autoHandling": "Auto-handling…",
  "card.lockHintRevise": "Revise card needs checkable acceptance before dispatch.",
  "card.confirm": "Looks good — start work",
  "card.confirmed": "Confirmed",
  "card.validating": "Validating…",
  "card.accepting": "Locking…",
  "card.fixing": "Auto-fixing…",
  "validate.checking":
    "Validating: executable goal, checkable acceptance, satisfactory delivery…",
  "validate.passed": "Validation passed: {summary}",
  "validate.failed": "Validation failed: {summary}{detail}",
  "bot.needValidate":
    "Wait for validation (or Auto-handle) before sending. Digital employees only get executable, checkable briefs.",
  "bot.validateFixed": "Auto-handled and validated: {summary}. You can confirm.",
  "err.validate": "Validation failed",
  "dispatch.mark": "Dispatch · product repo",
  "dispatch.title": "Dispatch to product repo",
  "dispatch.browse": "Browse…",
  "dispatch.browsing": "Choosing…",
  "dispatch.scan": "Scan machine",
  "dispatch.scanning": "Scanning…",
  "dispatch.filter": "Filter",
  "dispatch.filterPh": "Filter by name…",
  "dispatch.path": "Or paste path / project name",
  "dispatch.pathPh": "/Users/…/your-product or my-app",
  "dispatch.pathHint": "Missing paths are created; bare names go under the parent folder",
  "dispatch.deployTarget": "Planned hosting",
  "dispatch.deployTargetHint":
    "Code follows the chosen platform (Cloudflare → Workers/Pages rules)",
  "dispatch.deploy.none": "No deploy yet",
  "dispatch.deploy.cloudflare": "Cloudflare",
  "dispatch.deploy.aliyun": "Alibaba Cloud",
  "dispatch.deploy.aws": "AWS",
  "dispatch.deploy.github-pages": "GitHub Pages",
  "dispatch.projectsRoot": "Projects parent folder",
  "dispatch.projectsRootPh": "/Users/…/Projects",
  "dispatch.saveProjectsRoot": "Save parent",
  "dispatch.projectsRootSaved": "Parent folder saved",
  "dispatch.projectsRootFail": "Could not save parent folder",
  "dispatch.agentLabel": "Which CLI digital employee to launch",
  "dispatch.agentHint": "Detects Cursor Agent / Claude Code on PATH",
  "dispatch.redetect": "Redetect",
  "dispatch.redetecting": "Detecting…",
  "dispatch.needCli": "CLI install required",
  "dispatch.needCliNamed": "{label} not installed — copy the command below",
  "dispatch.needInstall": "Install CLI first",
  "dispatch.copyInstall": "Copy install command",
  "dispatch.copied": "Copied",
  "dispatch.startCmd": "Start command (must begin with Duaer)",
  "dispatch.startCmdPh": "Duaer\n\nDescribe what the digital employee should do…",
  "dispatch.do": "Write Brief and launch",
  "dispatch.doWithAgent": "Dispatch and launch with {label}",
  "dispatch.done": "Dispatched",
  "dispatch.working": "Dispatching…",
  "preview.title": "Results",
  "preview.view": "View result",
  "preview.auto": "auto-detected",
  "preview.link": "\nResult: {url}",
  "preview.missing":
    "\n(No preview / index.html; ask the employee to set preview.url in delivery.json)",
  "preview.versions": "Versions",
  "preview.versionInitial": "Initial",
  "preview.versionRev": "r{revision}",
  "revise.mark": "Revise card",
  "revise.title": "Revise card",
  "revise.hint":
    "Clarify in left chat; fill this card below; confirm to enqueue the same Terminal.",
  "revise.goal": "What to change",
  "revise.out": "What not to touch",
  "revise.accept": "Done when",
  "revise.assume": "Why it is wrong",
  "revise.goalPh": "e.g. lighter primary color, larger title",
  "revise.outPh": "e.g. keep copy structure",
  "revise.acceptPh": "e.g. open home — primary button #0d6e6e, no extra gradients",
  "revise.assumePh": "e.g. primary too dark, hard to read",
  "revise.again": "Revise again",
  "revise.dispatch": "Confirm revise and dispatch",
  "revise.dispatching": "Dispatching revise…",
  "revise.hintIdle":
    "After the result is ready, tap Revise again; chat left, revise card below.",
  "revise.hintBusy": "Filling the revise card from left chat…",
  "revise.hintReady":
    "Revise card ready: tap dispatch to enqueue the same Terminal.",
  "revise.hintNeed": "Say what is wrong on the left; the revise card fills below.",
  "revise.hintEnqueue": "Enqueueing into the same Terminal…",
  "revise.hintLocked":
    "This revise card is locked. After accept, tap Revise again if needed.",
  "revise.hintRevising":
    "Employee is revising. You can View result; Revise again after accept.",
  "revise.hintStuck":
    "Terminal is still busy with no task progress. Stop the old job, then tap Revise again to retry.",
  "bot.ready":
    "Model ready. Tell me what you want; I will clarify in chat. The confirm card is on the right. Nothing touches your product repo until you confirm.",
  "bot.cardReady":
    "You can edit the confirm card. When ready, tap Looks good — start work.",
  "bot.reviseCardReady":
    "Revise card updated below. Check What to change / Done when, then confirm dispatch.",
  "bot.enterRevise":
    "Revise mode. Top card stays the original brief; fill the revise card below after left chat.",
  "bot.continueRevise":
    "Keep clarifying on the left; edits go in the revise card below.",
  "bot.accepted":
    "Delivery accepted. View result; or tap Revise again beside it.",
  "bot.acceptFailed": "Auto-accept failed: {summary}{detail}",
  "bot.acceptFailedDefault": "Edit the confirm card",
  "bot.autoFix": "Auto-fix",
  "bot.autoHandleStart": "Auto-handling the card from validation issues…",
  "bot.fixing": "Fixing…",
  "bot.fixStillFailed":
    "Still failed after auto-fix{note}. Try again or edit the card.",
  "bot.confirmFixed":
    "Auto-fixed and accepted. Live Brief ready; pick a product repo to dispatch.",
  "bot.confirmOk":
    "Accepted. Live Brief ready; pick a product repo (worktree + Brief).",
  "bot.confirmFail": "Confirm failed: {msg}",
  "bot.autoFixFail": "Auto-fix failed: {msg}",
  "bot.repoPrepared": "Prepared repo {name} ({prep}) and remembered",
  "bot.repoSelected": "Selected and remembered repo {name}",
  "bot.dispatchDone":
    "{duaer}{who}. Watch the checklist and log below; then View result.\n{path}",
  "bot.reviseDispatched":
    "Revise confirmed; started Revision {revision} ({launch}).{restated}\nRevise card kept below; top card stays the original brief; you can still View result.",
  "bot.reviseLaunchReuse": "enqueued in existing Terminal",
  "bot.reviseLaunchQueued":
    "Queued in the same Terminal; runs after the current task finishes",
  "bot.reviseLaunchPreempt":
    "Stopped the leftover session; starting this revision now",
  "bot.reviseLaunchContinue": "Terminal agent/claude --continue",
  "bot.reviseLaunchNew": "new session",
  "bot.reviseRestate": "\nChange: {change}\nAccept: {acceptance}",
  "bot.chatError": "Error: {msg}",
  "bot.chatNotReady": "Model is not ready yet — finish setup and save first.",
  "bot.chatBusy": "Still handling the last message — wait a moment, or tap Send again if it is stuck.",
  "bot.chatReviseBusy": "Revise dispatch is in progress — please wait.",
  "bot.chatLockedHint":
    "The requirements card is locked. Chat will not change it — tap Revise again to edit the Brief.",
  "bot.reviseKickoffFail":
    "Revise chat failed to start: {msg}. You can type what is wrong on the left.",
  "update.notice":
    "Update {latest} (current {current}). Run: npm i -g duaer-spec@latest (or duaer self-update); in product repos: npx duaer-spec@latest update",
  "update.noticeHtml":
    "Update <code>{latest}</code> (current <code>{current}</code>). Run <code>npm i -g duaer-spec@latest</code> (or <code>duaer self-update</code>); in product repos: <code>npx duaer-spec@latest update</code>",
  "repo.recent": "recent",
  "repo.discovered": "found",
  "repo.empty": "Browse / scan, or run duaer live repo add in a product repo",
  "repo.emptyFilter": "No matching repos",
  "meta.model": "Model {model} · Brief → {jobs}",
  "progress.inProgress": "in progress",
  "progress.mark": "Progress",
  "progress.title": "Task progress",
  "progress.aria": "Task progress",
  "progress.emptyTitle": "No progress yet",
  "progress.empty": "Task steps and changed files appear here after dispatch",
  "run.mark": "Run",
  "run.dispatch": "Dispatch progress",
  "run.revision": "Revision {revision} progress",
  "run.note.dispatch": "First dispatch for this job",
  "run.note.revision": "Change: {goal}\nDone when: {acceptance}",
  "status.waiting": "Waiting for employee · watching tasks.md…",
  "status.running": "Employee started · watching tasks.md…",
  "status.poll": "Status: {st}{pct}{rev}{wt}",
  "status.worktreeGone": " · worktree removed",
  "status.acceptedRevise": "delivery accepted · can revise{rev}",
  "status.revisingLine": "Status: revising · r{revision} · continue",
  "agent.notInstalled": "{label} · not installed",
  "agent.clickInstall": "Install command below (copyable)",
  "agent.installed": "Installed · ready",
  "agent.installedPath": "Installed · {path}",
  "agent.missingHint": "Not found: {list} — see install below",
  "agent.partialHint": "Ready: {ok}; missing: {miss} — select a missing chip for the command",
  "agent.detected": "Local launchers detected",
  "prep.baseBranch": "Created develop branch",
  "prep.gitInit": "Ran git init",
  "prep.duaerInit": "Installed Duaer in this directory",
  "launch.none": "Launch: not started",
  "launch.line": "Launch: {label}{pid}{cli}{script}{log}",
  "launch.pid": " (pid {pid})",
  "launch.cli": "\nCLI: {cmd}",
  "launch.script": "\nTerminal script: {path}",
  "launch.log": "\nLog: {path}",
  "launch.reused": "Enqueued in existing Terminal ({who})",
  "launch.queuedWait":
    "Queued in the same Terminal; runs after the current task finishes ({who})",
  "launch.terminal": "Opened Terminal running CLI ({who})",
  "launch.spawned": "Launched with {who}",
  "launch.duaerInstalled": "Installed Duaer in the chosen directory; ",
  "launch.duaerReady": "Duaer ready; ",
  "result.review": "Auto-accept: {summary}\n",
  "result.fix": "Auto-fix: {summary}\n",
  "result.confirmOk":
    "{review}Live Brief: {dir}\nSuggested branch: {branch}\n\nNext: pick a product repo below to dispatch.",
  "result.dispatchOk":
    "Dispatched\nRepo: {repo}\nWorktree: {worktree}\nBrief: {brief}\n{launch}\n\n—— Start command ——\n{cmd}",
  "result.revision":
    "Revision {revision} enqueued\nChange: {goal}\nDone when: {acceptance}",
  "startCmd.goalFallback": "(describe the goal here)",
  "startCmd.body":
    "Follow the Duaer digital-employee flow: stay in Brief scope; check off tasks.md as you go; stamp delivery.json accepted when done (set preview.url for pages, e.g. index.html); do not push remote unless asked.",
  "err.noRepo": "Pick a repo via browse / scan first",
  "err.noJob": "No job to revise",
  "err.reviseFields": "Fill What to change and Done when on the revise card below",
  "err.chat": "Chat failed",
  "err.streamIncomplete": "Incomplete stream response",
  "err.pick": "Pick failed",
  "err.pickFromList": "Pick a repo from the list below",
  "err.dispatch": "Dispatch failed",
  "err.dispatchTimeout":
    "Dispatch timed out (60s). Refresh and retry; if the worktree exists, rename the branch or remove the old worktree.",
  "err.revise": "Revise failed",
  "err.reviseKickoff": "Could not start revise chat",
  "err.confirm": "Confirm failed",
  "err.timeout": "Timed out. Refresh; if the Agent is open, continue in Terminal.",
  "err.reviseTimeout":
    "Revise timed out (~3 min). If this Revision was not written, tap Confirm revise again; if Terminal already has a job, continue there.",
  "err.code.PREEMPT_FAILED":
    "Could not preempt a running Agent. Stop that worktree Terminal job, then tap Confirm revise again.",
  "err.code.CHILD_TIMEOUT":
    "A child process timed out. Retry revise; check git hooks if checkout/init stalls.",
  "err.code.LAUNCH_FAILED": "Revise launch failed. Tap Confirm revise to retry.",
  "err.code.NO_AGENT":
    "No CLI found. Install Cursor Agent or Claude Code, then retry. See docs/agent/worker-models.md.",
  "err.code.AGENT_MISSING": "Selected CLI is not installed. Install it, then retry.",
  "err.retryableHint": "You can retry.",
  "status.terminalLine": "Terminal: {state}",
  "status.terminalBusy": "busy",
  "status.terminalIdle": "idle",
  "status.terminalQueue": "queue {n}",
  "status.terminalDown": "no runner",
  "err.installAgent": "Install first: {cmd}",
  "err.needAgent": "Install the selected CLI first",
  "err.needAgentAlt": "Install the matching CLI first",
  "err.agentsDetect": "Could not detect local CLI",
  "err.copy": "Copy failed",
  "err.autoFix": "Auto-fix failed",
};

const catalogs = { "zh-CN": zhCN, en };

let locale = "zh-CN";
const listeners = new Set();

export function getLocale() {
  return locale;
}

export function detectLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LOCALES.includes(saved)) return saved;
  } catch {
    // ignore
  }
  const nav = String(navigator.language || navigator.userLanguage || "").toLowerCase();
  if (nav.startsWith("zh")) return "zh-CN";
  return "en";
}

export function setLocale(next, { persist = true } = {}) {
  const loc = LOCALES.includes(next) ? next : "zh-CN";
  locale = loc;
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, loc);
    } catch {
      // ignore
    }
  }
  document.documentElement.lang = loc;
  applyDomI18n();
  for (const fn of listeners) {
    try {
      fn(loc);
    } catch {
      // ignore
    }
  }
  return loc;
}

export function onLocaleChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function t(key, vars = {}) {
  const table = catalogs[locale] || zhCN;
  let s = table[key] ?? zhCN[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replaceAll(`{${k}}`, String(v ?? ""));
  }
  return s;
}

export function applyDomI18n(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.getAttribute("data-i18n");
    if (!key) return;
    const attr = node.getAttribute("data-i18n-attr");
    if (attr) node.setAttribute(attr, t(key));
    else node.textContent = t(key);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    const key = node.getAttribute("data-i18n-placeholder");
    if (key) node.setAttribute("placeholder", t(key));
  });
  root.querySelectorAll("[data-i18n-aria]").forEach((node) => {
    const key = node.getAttribute("data-i18n-aria");
    if (key) node.setAttribute("aria-label", t(key));
  });
  const title = t("doc.title");
  if (title) document.title = title;
}

export function initI18n(preferred) {
  const loc =
    preferred && LOCALES.includes(preferred) ? preferred : detectLocale();
  return setLocale(loc, { persist: Boolean(preferred) || true });
}
