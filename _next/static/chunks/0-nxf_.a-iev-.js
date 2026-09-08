(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,3348,e=>{"use strict";var t=e.i(18050),n=e.i(71645);e.s(["CopyButton",0,function({text:e,className:r}){let[s,a]=(0,n.useState)(!1),i=async()=>{try{await navigator.clipboard.writeText(e),a(!0),setTimeout(()=>a(!1),1500)}catch{let t=document.createElement("textarea");t.value=e,document.body.appendChild(t),t.select(),document.execCommand("copy"),document.body.removeChild(t),a(!0),setTimeout(()=>a(!1),1500)}};return(0,t.jsx)("button",{onClick:i,className:`p-1.5 rounded-md transition-colors shrink-0 ${r??"text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"}`,title:"复制",children:s?(0,t.jsx)("svg",{className:"w-4 h-4 text-green-500",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M5 13l4 4L19 7"})}):(0,t.jsx)("svg",{className:"w-4 h-4",fill:"none",stroke:"currentColor",viewBox:"0 0 24 24",children:(0,t.jsx)("path",{strokeLinecap:"round",strokeLinejoin:"round",strokeWidth:2,d:"M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"})})})}])},67585,(e,t,n)=>{"use strict";Object.defineProperty(n,"__esModule",{value:!0}),Object.defineProperty(n,"BailoutToCSR",{enumerable:!0,get:function(){return s}});let r=e.r(32061);function s({reason:e,children:t}){if("u"<typeof window)throw Object.defineProperty(new r.BailoutToCSRError(e),"__NEXT_ERROR_CODE",{value:"E394",enumerable:!1,configurable:!0});return t}},9885,(e,t,n)=>{"use strict";function r(e){return e.split("/").map(e=>encodeURIComponent(e)).join("/")}Object.defineProperty(n,"__esModule",{value:!0}),Object.defineProperty(n,"encodeURIPath",{enumerable:!0,get:function(){return r}})},52157,(e,t,n)=>{"use strict";Object.defineProperty(n,"__esModule",{value:!0}),Object.defineProperty(n,"PreloadChunks",{enumerable:!0,get:function(){return o}});let r=e.r(18050),s=e.r(74080),a=e.r(63599),i=e.r(9885),l=e.r(43369);function o({moduleIds:e}){if("u">typeof window)return null;let t=a.workAsyncStorage.getStore();if(void 0===t)return null;let n=[];if(t.reactLoadableManifest&&e){let r=t.reactLoadableManifest;for(let t of e){if(!r[t])continue;let e=r[t].files;n.push(...e)}}if(0===n.length)return null;let c=(0,l.getAssetTokenQuery)();return(0,r.jsx)(r.Fragment,{children:n.map(e=>{let n=`${t.assetPrefix}/_next/${(0,i.encodeURIPath)(e)}${c}`;return e.endsWith(".css")?(0,r.jsx)("link",{precedence:"dynamic",href:n,rel:"stylesheet",as:"style",nonce:t.nonce},e):((0,s.preload)(n,{as:"script",fetchPriority:"low",nonce:t.nonce}),null)})})}},69093,(e,t,n)=>{"use strict";Object.defineProperty(n,"__esModule",{value:!0}),Object.defineProperty(n,"default",{enumerable:!0,get:function(){return c}});let r=e.r(18050),s=e.r(71645),a=e.r(67585),i=e.r(52157);function l(e){return{default:e&&"default"in e?e.default:e}}let o={loader:()=>Promise.resolve(l(()=>null)),loading:null,ssr:!0},c=function(e){let t={...o,...e},n=(0,s.lazy)(()=>t.loader().then(l)),c=t.loading;function d(e){let l=c?(0,r.jsx)(c,{isLoading:!0,pastDelay:!0,error:null}):null,o=!t.ssr||!!t.loading,d=o?s.Suspense:s.Fragment,u=t.ssr?(0,r.jsxs)(r.Fragment,{children:["u"<typeof window?(0,r.jsx)(i.PreloadChunks,{moduleIds:t.modules}):null,(0,r.jsx)(n,{...e})]}):(0,r.jsx)(a.BailoutToCSR,{reason:"next/dynamic",children:(0,r.jsx)(n,{...e})});return(0,r.jsx)(d,{...o?{fallback:l}:{},children:u})}return d.displayName="LoadableComponent",d}},70703,(e,t,n)=>{"use strict";Object.defineProperty(n,"__esModule",{value:!0}),Object.defineProperty(n,"default",{enumerable:!0,get:function(){return s}});let r=e.r(55682)._(e.r(69093));function s(e,t){let n={};"function"==typeof e&&(n.loader=e);let s={...n,...t};return(0,r.default)({...s,modules:s.loadableGenerated?.modules})}("function"==typeof n.default||"object"==typeof n.default&&null!==n.default)&&void 0===n.default.__esModule&&(Object.defineProperty(n.default,"__esModule",{value:!0}),Object.assign(n.default,n),t.exports=n.default)},62901,e=>{"use strict";var t=e.i(18050),n=e.i(71645),r=e.i(70703),s=e.i(18789),a=e.i(42531),i=e.i(7033),l=e.i(34096),o=e.i(84798);function c({content:e}){return(0,t.jsx)(s.default,{remarkPlugins:[a.default],rehypePlugins:[[i.default,o.markdownSchema]],components:l.markdownComponents,children:e})}let d=(0,r.default)(()=>e.A(38579).then(e=>e.MathMarkdown),{loadableGenerated:{modules:[51547]},loading:()=>null}),u=(0,n.memo)(function({content:e}){return(0,n.useMemo)(()=>{let t;return t=e.replace(/```[\s\S]*?```/g,"").replace(/`[^`\n]*`/g,""),/\$\$[\s\S]+?\$\$|\$[^$\n]+\$/.test(t)},[e])?(0,t.jsx)(d,{content:e}):(0,t.jsx)(c,{content:e})});e.s(["Markdown",0,u],62901)},19287,e=>{"use strict";let t="dp-learn-deepseek-key",n="dp_learn_deepseek_key";function r(){let e=localStorage.getItem(t);if(e)return e;let r=localStorage.getItem(n);if(r){let e=r.trim().replace(/[^\x20-\x7E]/g,"");if(e)return localStorage.setItem(t,e),localStorage.removeItem(n),e}return null}async function s(e,t,n=[]){let a=r();if(!a)return{answer:"",error:"未配置 API Key"};a=a.trim().replace(/[^\x20-\x7E]/g,"");let i=`知识库检索结果：
${t}


用户问题：${e}`,l=[{role:"system",content:`你是 DP Learn 的 AI 助教，专门为计算材料科学 / 计算物理方向的研究生提供 DP-GEN、DeePMD、VASP、LAMMPS、dpdata 的一线实战指导。

## 你的角色
- 你的知识覆盖：机器学习势函数（MLP）开发全流程、DFT 计算（VASP）、分子动力学模拟（LAMMPS）、主动学习框架（DP-GEN）、DeePMD 训练与调参、数据格式转换（dpdata）
- 你擅长把复杂概念拆成"能用一句话记住"的核心思想，再展开细节
- 你了解常见报错及排查路径（KPOINTS float bug、segmentation fault、VASP 不收敛、model_devi 异常、dpdata 解析失败等）

## 核心工具链知识

### dpdata 数据处理
- dpdata 是 DeepModeling 生态的数据枢纽，负责 DFT 输出 ↔ DeePMD 训练格式的转换
- 核心类：dpdata.LabeledSystem（带标签：能量/力/应力）、dpdata.System（仅结构）
- 最常用操作：OUTCAR → to_deepmd_npy()（生成 set.xxx/ 目录）
- 支持格式：vasp/outcar, vasp/xml, deepmd/npy, deepmd/raw, gaussian/log, cp2k/output, lammps/dump 等
- 数据合并用 append()，切分用 sub_system(indices)
- 数据回流流程：收集 iter.XXXXXX/02.fp/task.*/OUTCAR → LabeledSystem 读取 → append 合并 → to_deepmd_npy 导出

### DeePMD-kit 训练
- v2.x 默认 TensorFlow 后端，v3.x 推荐 PyTorch 后端（dp --pt train）
- input.json 核心段：model（descriptor + fitting_net）、learning_rate、loss、training、optimizer
- 描述符类型选择：
  - se_e2_a: 最常用，两体嵌入+角度信息（径向+角度），适合大多数体系
  - se_e2_r: 仅径向信息，计算更快但精度稍低，适合大体系快速筛选
  - se_e3: 三体嵌入+键角信息，精度最高但计算量最大，适合小体系高精度
- se_e2_a 关键参数：rcut(截断半径, 通常6\xc5), rcut_smth(平滑起点), sel(近邻数, 必须大于实际近邻), neuron(嵌入网络), axis_neuron(轴神经元, 通常16), type_one_side(推荐true)
- fitting_net: neuron(拟合网络层, 常用[240,240,240]), resnet_dt(推荐true), precision(float64高精度/float32混合精度)
- 学习率策略：
  - exp: 指数衰减（默认），start_lr→stop_lr，decay_steps 控制衰减速度
  - cosine: 余弦退火，通常比 exp 收敛更平滑
  - wsd: 预热-稳定-衰减，大部分时间保持 start_lr，最后 decay_phase_ratio 做衰减
  - 所有策略都支持 warmup_steps 预热阶段
- 损失权重：pref(t) = start_pref \xd7 (lr(t)/start_lr) + limit_pref \xd7 (1 - lr(t)/start_lr)
  - start_pref_f=1000（初期重力），limit_pref_f=1（最终平衡）
  - start_pref_e=0.02（初期轻能量），limit_pref_e=1
  - loss_func: "mse"(L2, 默认) 或 "mae"(L1, 抗异常值)
  - intensive_ener_virial: true 时按 N\xb2 归一化（多体系大小不一时推荐）
- 优化器：Adam(默认), AdamW(解耦权重衰减, PyTorch), LKF(大规模), AdaMuon(PyTorch)
- batch_size: "auto"(=auto:32), "auto:N"(batch\xd7原子数≥N), "max:N"(batch\xd7原子数≤N)
- 训练曲线看 lcurve.out：loss_f 应持续下降
- dp freeze 将 checkpoint 转为 .pb 文件用于推理
- dp --init-frz-model 可从已有模型初始化（调整 sel 等参数时用）

### DP-GEN 主动学习
- 核心闭环：训练 → LAMMPS 探索 → 模型偏差筛选 → VASP 标注 → 数据回流 → 再训练
- committee model：4 个模型不同种子训练，偏差大 = 不确定 = 需要标注
- param.json 关键参数：
  - basics: type_map(元素列表), mass_map(原子质量)
  - data: init_data_prefix, init_data_sys(初始数据), sys_configs(探索结构)
  - training: numb_models(通常4), default_training_param
  - exploration: model_devi_dt(时间步), model_devi_f_trust_lo/hi, model_devi_jobs(温度/压力/步数/系综)
  - labeling: fp_style, fp_task_max/min, fp_pp_path, fp_pp_files, fp_incar
- model_devi_jobs 中的关键字段：sys_idx(结构组), temps(温度K), press(压力bar), trj_freq(保存频率), nsteps(MD步数), ensemble(nvt/npt/nve)
- 健康指标：candidate 比例 5-20%，accurate > 80% 时接近收敛
- fp_incar 必须包含 KSPACING 和 KGAMMA（或使用 fp_kpoints）
- machine.json 关键字段：dispatcher_type(本地/远程), batch_type(PBS/Slurm/LSF), context_type(本地/SSH), local_root, remote_root, clean_asap
- 多元素体系（>2种）：type_map/mass_map/fp_pp_files 顺序必须一致，sel 需要为每种元素单独设定

### VASP 计算
- INCAR 关键标签：ENCUT（截断能，≥1.3\xd7ENMAX）、ISMEAR（半导体=0，金属=1）、EDIFF/EDIFFG
- KPOINTS：KSPACING 或显式 KPOINTS 文件，DP-GEN 有 KPOINTS float bug（需源码补丁）
- POTCAR：元素顺序必须与 POSCAR 一致
- 常见崩溃：SIGSEGV（conda LD_LIBRARY_PATH 污染）、SCF 不收敛（EDIFF 太严格/KPOINTS 太稀疏）

### LAMMPS + DeePMD
- 必须用 units metal（DeePMD 输出 eV/\xc5/fs）
- pair_style deepmd frozen_model.pb
- 常见错误：atom types mismatch、segfault（TF/PT 版本不一致）
- 性能优化：dp compress 压缩模型 2-4x 加速、GPU 推理 10-50x 加速

### HPC 调度系统
- PBS/Torque: qsub job.pbs, qstat, qdel
- Slurm: sbatch job.slurm, squeue, scancel, salloc
- machine.json 中 batch_type 需匹配集群调度器
- 提交脚本中必须 unset LD_LIBRARY_PATH 避免 conda 污染

### ASE / Phonopy / pymatgen
- ASE：Python 原子模拟环境，结构构建(bulk/surface/supercell)、计算器对接(VASP/GPAW)、弛豫(BFGS)
- Phonopy：声子谱计算（冻结声子法），force constants → 热力学性质
- pymatgen：材料分析库，能带结构、DOS、相图、缺陷分析

## 回答规范
### 知识来源标记
- 如果知识库提供了相关信息：引用 [来源 N] 标注，并在末尾列出参考
- 如果知识库信息不足：基于你自己的训练知识回答，但开头加上 ⚠️ **以下回答基于通用知识，建议与官方文档交叉验证**

### 格式要求
- 全程中文，专业术语保留英文原名（如"descriptor""fitting net""committee model""LabeledSystem"）
- 涉及命令、输入文件、参数配置时用代码块包裹，并标注文件类型（json / bash / python / text）
- 数值参数必须带单位（如 rcut: 6.5 \xc5、numb_steps: 400,000、force RMSE: 0.046 eV/\xc5）
- 关键概念首次出现时给出简短解释
- 代码示例添加行内注释说明每步的含义

### 回答结构（按优先级选择）
1. **操作/报错类问题**：原因 → 排查步骤 → 解决方案 → 预防措施
2. **概念理解类问题**：一句话核心思想 → 详细解释 → 与其他概念的关联 → 实例说明
3. **参数选择类问题**：推荐值/范围 → 选此值的原因 → 不同场景下的调整策略
4. **数据处理类问题**（dpdata 相关）：输入格式 → 转换代码 → 输出说明 → 常见陷阱

### 多轮对话
- 你会收到之前的对话历史，用户可能会追问"能再详细说说吗"、"PyTorch 版本怎么写"等
- 回答追问时，直接引用之前对话中的上下文，不要重复用户已知的信息
- 如果用户说"上面那个"、"刚才那个参数"等指代词，根据上下文推断所指

### 特别注意
- 区分 TensorFlow 版和 PyTorch 版 DeePMD（dp train vs dp --pt train）
- VASP INCAR 标签区分 5.x 和 6.x 版本差异
- LAMMPS units metal vs real 的数值换算（energy: eV vs kcal/mol, time: ps vs fs）
- 涉及超算集群的建议，区分 Slurm / PBS / LSF 调度系统
- 温度、压强、能量等物理量务必带单位
- dpdata 读取 OUTCAR 时建议用 try-except 包裹（VASP 崩溃时 OUTCAR 不完整）
- 合并多源数据时注意 type_map 一致性（元素顺序必须相同）`},...n.map(e=>({role:e.role,content:e.content})),{role:"user",content:i}];try{let e=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${a}`},body:JSON.stringify({model:"deepseek-chat",messages:l,temperature:.4,max_tokens:2048})});if(!e.ok){let t=await e.text();return{answer:"",error:`API 调用失败 (${e.status}): ${t.slice(0,300)}`}}let t=await e.json();return{answer:t.choices?.[0]?.message?.content||""}}catch(e){return{answer:"",error:`网络错误: ${e.message}`}}}e.s(["askAI",0,s,"clearApiKey",0,function(){localStorage.removeItem(t)},"getApiKey",0,r,"hasApiKey",0,function(){return!!r()},"setApiKey",0,function(e){let n=e.trim().replace(/[^\x20-\x7E]/g,"");return!!n&&(localStorage.setItem(t,n),!0)}])},89710,e=>{"use strict";var t=e.i(18050),n=e.i(71645),r=e.i(61534);let s=null,a=0;var i=e.i(19287),l=e.i(33001),o=e.i(62901),c=e.i(86749);e.s(["QAChat",0,function({indexItems:e}){let[d,u]=(0,n.useState)([{role:"system",content:"你好！我是 DP 学习助教。你可以问我关于 DP-GEN、DeePMD、VASP、LAMMPS 的任何问题。\n\n我会先在知识库（你的笔记 + 官方文档）中检索相关内容，然后给你回答。\n\n💡 配置 DeepSeek API Key 可以获得更智能的整合回答。"}]),[p,m]=(0,n.useState)(""),[f,x]=(0,n.useState)(!1),[h,y]=(0,n.useState)(!1),[g,_]=(0,n.useState)(""),[b,P]=(0,n.useState)(!1),j=(0,n.useRef)(null),[S,A]=(0,n.useState)([]);(0,n.useEffect)(()=>{P((0,i.hasApiKey)()),(0,l.getAllUserArticles)().then(A)},[]),(0,n.useEffect)(()=>{j.current?.scrollIntoView({behavior:"smooth"})},[d]);let v=async t=>{if(t.preventDefault(),!p.trim()||f)return;let n=p.trim();m(""),x(!0);let l={role:"user",content:n};u(e=>[...e,l]);let o=function(e,t,n=5){if(!e.trim()||0===t.length)return[];if(s&&a===t.length)return s.search(e.trim()).slice(0,n).map(e=>({title:e.item.title,snippet:e.item.snippet,url:e.item.url,isOfficial:e.item.isOfficial,source:e.item.source}));let i=t.map(e=>{let t="doc"===e.type,n=e.title;if(t){let t=e.category.replace("official-","").toUpperCase();n=`[${t}] ${e.title}`}else"cheatsheet"===e.type&&(n=`📋 ${e.title}`);return{title:n,snippet:e.content.slice(0,200),url:e.url,isOfficial:t,source:e.category,searchText:e.content}});return s=new r.default(i,{keys:[{name:"title",weight:3},{name:"searchText",weight:1}],threshold:.45,distance:200,includeScore:!0,minMatchCharLength:1,ignoreLocation:!0}),a=t.length,s.search(e.trim()).slice(0,n).map(e=>({title:e.item.title,snippet:e.item.snippet,url:e.item.url,isOfficial:e.item.isOfficial,source:e.item.source}))}(n,[...e,...S.map(c.articleToSearchIndexItem)],5);if(0===o.length&&!(0,i.hasApiKey)()){u(e=>[...e,{role:"assistant",content:"抱歉，我在知识库中没有找到与您问题相关的内容。\n\n💡 配置 DeepSeek API Key 后，即使知识库没有相关内容，AI 也可以基于自身知识回答。点击上方「⚙️ 配置 API Key」即可设置。",sources:[],mode:"search-only"}]),x(!1);return}if((0,i.hasApiKey)()){let e=o.length>0?function(e,t=4e3){let n=[],r=0;for(let s=0;s<e.length;s++){let a=e[s],i=`[来源 ${s+1}] ${a.title}
${a.isOfficial?`官方链接: ${a.url}
`:""}${a.snippet}`;if(r+i.length>t&&n.length>0)break;n.push(i),r+=i.length}return n.join("\n\n---\n\n")}(o):"（知识库中未找到相关内容，请基于你的训练知识回答）",t=d.filter(e=>"user"===e.role||"assistant"===e.role).slice(-10).map(e=>({role:e.role,content:e.content.replace(/\n\n---\n📚[\s\S]*$/,"").trim()})),r=await (0,i.askAI)(n,e,t);if(r.error)u(e=>[...e,{role:"assistant",content:`AI 调用失败: ${r.error}${o.length>0?`

以下为知识库检索结果：

${o.map((e,t)=>`**${t+1}. ${e.title}**
${e.snippet}
${e.url?`🔗 ${e.url}`:""}`).join("\n\n")}`:""}`,sources:o,mode:"search-only"}]);else{let e=o.length>0?`

---
📚 **参考来源：**
${o.map((e,t)=>`- [${e.title}](${e.url||"#"}${e.isOfficial?" (官方文档)":""})`).join("\n")}`:"\n\n---\n⚠️ *知识库中未找到相关内容，以上回答来自 AI 自身知识，请注意核实。*";u(t=>[...t,{role:"assistant",content:r.answer+e,sources:o,mode:"ai-enhanced"}])}}else{let e=o.map((e,t)=>`**${t+1}. ${e.title}**
${e.snippet}
${e.url?`🔗 [查看详情](${e.url})`:""}`).join("\n\n---\n\n");u(t=>[...t,{role:"assistant",content:`以下是知识库中与您问题相关的内容（按相关度排序）：

${e}

---
💡 *配置 DeepSeek API Key 可获得 AI 整合回答*`,sources:o,mode:"search-only"}])}x(!1)};return(0,t.jsxs)("div",{className:"flex flex-col h-[600px] max-h-[80vh] border border-zinc-200 rounded-xl bg-white",children:[(0,t.jsxs)("div",{className:"flex items-center justify-between px-4 py-3 border-b border-zinc-100",children:[(0,t.jsxs)("div",{className:"flex items-center gap-2",children:[(0,t.jsx)("span",{className:"font-medium text-sm",children:"🤖 DP 学习助教"}),b?(0,t.jsxs)("span",{className:"text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1",children:["🟢 AI 已启用",(0,t.jsx)("button",{onClick:()=>{(0,i.clearApiKey)(),P(!1)},className:"ml-1 hover:text-red-500",title:"清除 API Key",children:"×"})]}):(0,t.jsx)("button",{onClick:()=>y(!h),className:"text-xs bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full hover:bg-zinc-200",children:"⚙️ 配置 API Key"})]}),(0,t.jsxs)("div",{className:"flex items-center gap-2",children:[d.length>1&&(0,t.jsxs)("span",{className:"text-xs text-zinc-400",children:[Math.floor(d.filter(e=>"user"===e.role).length)," 轮对话"]}),d.length>2&&(0,t.jsx)("button",{onClick:()=>{u([{role:"system",content:"你好！我是 DP 学习助教。你可以问我关于 DP-GEN、DeePMD、VASP、LAMMPS 的任何问题。\n\n我会先在知识库（你的笔记 + 官方文档）中检索相关内容，然后给你回答。\n\n💡 配置 DeepSeek API Key 可以获得更智能的整合回答。"}])},className:"text-xs text-zinc-400 hover:text-zinc-600 px-2 py-0.5 rounded hover:bg-zinc-100",title:"清空对话历史",children:"🗑️ 清空"})]})]}),h&&(0,t.jsxs)("div",{className:"px-4 py-3 border-b border-zinc-100 bg-zinc-50",children:[(0,t.jsxs)("div",{className:"flex gap-2",children:[(0,t.jsx)("input",{id:"api-key-input",name:"apiKey",type:"password",value:g,onChange:e=>_(e.target.value),placeholder:"输入 DeepSeek API Key (sk-...)",autoComplete:"off",className:"flex-1 px-3 py-1.5 text-sm border border-zinc-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white",style:{backgroundColor:"#fff",color:"#18181b"}}),(0,t.jsx)("button",{onClick:()=>{g.trim()&&((0,i.setApiKey)(g.trim())&&(P(!0),y(!1)),_(""))},className:"px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-500",children:"保存"})]}),(0,t.jsx)("p",{className:"text-xs text-zinc-400 mt-1",children:"API Key 仅存储在浏览器本地，不会上传到任何服务器"})]}),(0,t.jsxs)("div",{className:"flex-1 overflow-y-auto px-4 py-4 space-y-4",children:[d.map((e,n)=>(0,t.jsx)("div",{className:`flex ${"user"===e.role?"justify-end":"justify-start"}`,children:(0,t.jsxs)("div",{className:`max-w-[85%] rounded-xl px-4 py-3 text-sm ${"user"===e.role?"bg-indigo-100 text-indigo-900":"system"===e.role?"bg-indigo-50 text-indigo-800 border border-indigo-100":"bg-zinc-100 text-zinc-800"}`,children:[(0,t.jsx)("div",{className:"prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-a:text-indigo-600",children:(0,t.jsx)(o.Markdown,{content:e.content})}),"ai-enhanced"===e.mode&&(0,t.jsx)("span",{className:"inline-block mt-2 text-xs text-zinc-400",children:"✨ AI 生成"})]})},n)),f&&(0,t.jsx)("div",{className:"flex justify-start",children:(0,t.jsx)("div",{className:"bg-zinc-100 rounded-xl px-4 py-3 text-sm text-zinc-500",children:(0,t.jsxs)("span",{className:"inline-flex gap-1",children:[(0,t.jsx)("span",{className:"animate-bounce",children:"●"}),(0,t.jsx)("span",{className:"animate-bounce",style:{animationDelay:"0.1s"},children:"●"}),(0,t.jsx)("span",{className:"animate-bounce",style:{animationDelay:"0.2s"},children:"●"})]})})}),(0,t.jsx)("div",{ref:j})]}),(0,t.jsxs)("form",{onSubmit:v,className:"border-t border-zinc-100 p-4",children:[(0,t.jsxs)("div",{className:"flex gap-2",children:[(0,t.jsx)("input",{id:"qa-chat-input",name:"question",type:"text",value:p,onChange:e=>m(e.target.value),placeholder:"提问... 支持追问，AI 会记住上下文",autoComplete:"on",className:"flex-1 px-4 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white",style:{backgroundColor:"#fff",color:"#18181b"},disabled:f}),(0,t.jsx)("button",{type:"submit",disabled:f||!p.trim(),className:"px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",children:"发送"})]}),(0,t.jsxs)("p",{className:"text-xs text-zinc-400 mt-2",children:["💡 支持多轮对话，AI 会记住最近 ",5,' 轮上下文。试试追问："能再详细说说吗？" 或 "PyTorch 版本怎么写？"']})]})]})}],89710)},38579,e=>{e.v(t=>Promise.all(["static/chunks/0uu9x_.ql_3u3.css","static/chunks/0c.q_ydm7z8im.js"].map(t=>e.l(t))).then(()=>t(51547)))}]);