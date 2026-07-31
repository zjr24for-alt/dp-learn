import type { IncarEntry } from "./incar-schema";
import { parseIncar } from "./incar-schema";
import { INCAR_SCHEMA } from "./incar-schema";
import type { MachineSegment } from "./machine-schema";

export type CheckSeverity = "error" | "warning" | "info";

export interface CheckIssue {
  severity: CheckSeverity;
  message: string;
  path?: string;
  hint?: string;
}

export interface ValidationResult {
  valid: boolean; // errorCount === 0
  issues: CheckIssue[];
  errorCount: number;
  warningCount: number;
}

/* ---------------------------------- 帮助函数 ---------------------------------- */

/** 兼容 number / 数字字符串 / 科学计数法（"1E-6"、"0.4"） */
function toNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v.trim());
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** 归一化布尔：.TRUE./.FALSE./true/false/1/0/yes/no */
function toBool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toUpperCase();
    if (s === ".TRUE." || s === "TRUE" || s === "T" || s === "1" || s === "YES") return true;
    if (s === ".FALSE." || s === "FALSE" || s === "F" || s === "0" || s === "NO") return false;
  }
  return null;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isArr(v: unknown): v is unknown[] {
  return Array.isArray(v);
}

function createCtx() {
  const issues: CheckIssue[] = [];
  let errorCount = 0;
  let warningCount = 0;
  const add = (severity: CheckSeverity, message: string, path?: string, hint?: string) => {
    issues.push({ severity, message, path, hint });
    if (severity === "error") errorCount++;
    else if (severity === "warning") warningCount++;
  };
  const result = (): ValidationResult => ({ valid: errorCount === 0, issues, errorCount, warningCount });
  return { add, result };
}

/* ---------------------------------- param.json ---------------------------------- */

export function validateParamJson(jsonText: string): ValidationResult {
  const ctx = createCtx();

  let root: unknown;
  try {
    root = JSON.parse(jsonText);
  } catch (e) {
    ctx.add("error", `JSON 语法错误: ${e instanceof Error ? e.message : String(e)}`);
    return ctx.result();
  }
  if (!isObj(root)) {
    ctx.add("error", "param.json 必须是一个 JSON 对象");
    return ctx.result();
  }

  const p = root;
  const typeMap = isArr(p.type_map) ? p.type_map : [];
  const typeMapLen = typeMap.length;
  if (typeMapLen === 0) {
    ctx.add("error", "缺少必需的 type_map（原子类型列表）", "type_map");
  }

  // mass_map 与 type_map 顺序/长度一致
  if (p.mass_map !== undefined) {
    if (isArr(p.mass_map)) {
      if (p.mass_map.length !== typeMapLen) {
        ctx.add(
          "error",
          `mass_map 长度 (${p.mass_map.length}) 与 type_map 长度 (${typeMapLen}) 不一致`,
          "mass_map"
        );
      }
    } else if (typeof p.mass_map !== "string") {
      ctx.add("warning", "mass_map 应为数组或 'auto' 字符串", "mass_map");
    }
  }

  // default_training_param.model.type_map 与顶层 type_map 一致
  const dtn = isObj(p.default_training_param) ? p.default_training_param : null;
  const model = dtn && isObj(dtn.model) ? dtn.model : null;
  if (model) {
    const modelTypeMap = isArr(model.type_map) ? model.type_map : null;
    if (modelTypeMap && (modelTypeMap.length !== typeMapLen || modelTypeMap.some((t, i) => t !== typeMap[i]))) {
      ctx.add(
        "error",
        "default_training_param.model.type_map 与顶层 type_map 不一致（长度或顺序）",
        "default_training_param.model.type_map"
      );
    }
  }

  // descriptor: sel / rcut
  const descriptor = model && isObj(model.descriptor) ? model.descriptor : null;
  if (descriptor) {
    const descType = typeof descriptor.type === "string" ? descriptor.type : "";
    const sel = descriptor.sel;
    if (descType.startsWith("se_e2")) {
      if (isArr(sel)) {
        if (typeMapLen > 0 && sel.length !== typeMapLen) {
          ctx.add("error", `descriptor.sel 长度 (${sel.length}) 与原子种类数 (${typeMapLen}) 不一致`, "model.descriptor.sel");
        }
        if (sel.some((s) => toNum(s) !== null && toNum(s)! % 2 !== 0)) {
          ctx.add("info", "se_e2_a 的 sel 建议取偶数（留余量给 MD 极端构型）", "model.descriptor.sel");
        }
      } else if (sel !== undefined) {
        ctx.add("warning", "descriptor.sel 应为数组", "model.descriptor.sel");
      }
    } else if (descType.startsWith("se_e3") && isArr(sel) && sel.length !== 3) {
      ctx.add("warning", "se_e3 描述符的 sel 应为长度 3 的数组", "model.descriptor.sel");
    }
    const rcut = toNum(descriptor.rcut);
    const rcutSmth = toNum(descriptor.rcut_smth);
    if (rcut !== null && rcutSmth !== null && rcutSmth >= rcut) {
      ctx.add("error", `rcut_smth (${rcutSmth}) 必须小于 rcut (${rcut})`, "model.descriptor");
    }
  }

  // fp_style=vasp 时必需项
  const fpStyle = typeof p.fp_style === "string" ? p.fp_style : "";
  if (fpStyle === "vasp") {
    if (typeof p.fp_incar !== "string" || p.fp_incar.trim() === "") {
      ctx.add("error", "fp_style=vasp 时必须提供 fp_incar（INCAR 模板路径）", "fp_incar");
    }
    if (typeof p.fp_pp_path !== "string" || p.fp_pp_path.trim() === "") {
      ctx.add("error", "fp_style=vasp 时必须提供 fp_pp_path（赝势目录）", "fp_pp_path");
    }
    if (isArr(p.fp_pp_files)) {
      if (typeMapLen > 0 && p.fp_pp_files.length !== typeMapLen) {
        ctx.add(
          "error",
          `fp_pp_files 长度 (${p.fp_pp_files.length}) 与 type_map 长度 (${typeMapLen}) 不一致（顺序需对应元素）`,
          "fp_pp_files"
        );
      }
    } else {
      ctx.add("error", "fp_style=vasp 时必须提供 fp_pp_files（赝势文件列表）", "fp_pp_files");
    }
  }

  // init_data_sys 一维 / sys_configs 二维
  if (p.init_data_sys !== undefined && !(isArr(p.init_data_sys) && p.init_data_sys.every((x) => typeof x === "string"))) {
    ctx.add("error", "init_data_sys 必须是一维字符串数组", "init_data_sys");
  }
  if (p.sys_configs !== undefined) {
    if (!isArr(p.sys_configs) || !p.sys_configs.every((x) => isArr(x))) {
      ctx.add("error", "sys_configs 必须是二维数组（每组一个结构路径列表）", "sys_configs");
    }
  }

  // init_bulk（可选，存在时才检查）
  if (p.init_bulk !== undefined) {
    if (!isObj(p.init_bulk)) {
      ctx.add("error", "init_bulk 必须是一个对象", "init_bulk");
    } else {
      const ib = p.init_bulk;
      const ibPath = "init_bulk";
      if (!isArr(ib.stages) || ib.stages.length === 0) {
        ctx.add("error", "init_bulk 缺少必需的 stages（运行阶段）", `${ibPath}.stages`);
      }
      if (!isArr(ib.super_cell) || ib.super_cell.length !== 3) {
        ctx.add("error", "init_bulk 缺少必需的 super_cell（3 元素超胞倍数，如 [2,2,2]）", `${ibPath}.super_cell`);
      }
      if (!isArr(ib.scale) || ib.scale.length === 0) {
        ctx.add("error", "init_bulk 缺少必需的 scale（缩放因子列表）", `${ibPath}.scale`);
      }
      if (isArr(ib.elements)) {
        if (typeMapLen > 0 && ib.elements.length !== typeMapLen) {
          ctx.add("error", `init_bulk.elements 长度 (${ib.elements.length}) 与 type_map (${typeMapLen}) 不一致`, `${ibPath}.elements`);
        }
      } else {
        ctx.add("error", "init_bulk 缺少必需的 elements", `${ibPath}.elements`);
      }
      // from_poscar 互斥逻辑
      const fromPoscar = toBool(ib.from_poscar);
      if (fromPoscar === true) {
        if (typeof ib.from_poscar_path !== "string" || ib.from_poscar_path.trim() === "") {
          ctx.add("error", "init_bulk.from_poscar=true 时必须提供 from_poscar_path", `${ibPath}.from_poscar_path`);
        }
      } else {
        if (ib.cell_type === undefined) {
          ctx.add("warning", "init_bulk 未设 from_poscar=true，建议提供 cell_type（初始晶型）", `${ibPath}.cell_type`);
        }
        if (ib.latt === undefined) {
          ctx.add("warning", "init_bulk 未设 from_poscar=true，建议提供 latt（晶格常数 Å）", `${ibPath}.latt`);
        }
      }
      // stages 依赖的 INCAR
      const stages = isArr(ib.stages) ? ib.stages.map((s) => toNum(s)).filter((s): s is number => s !== null) : [];
      if (stages.includes(1) && (typeof ib.relax_incar !== "string" || ib.relax_incar.trim() === "")) {
        ctx.add("warning", "init_bulk stages 含 1（弛豫）但缺少 relax_incar（需独立弛豫 INCAR，与 INCAR_fp 不同）", `${ibPath}.relax_incar`);
      }
      if (stages.includes(3) && (typeof ib.md_incar !== "string" || ib.md_incar.trim() === "")) {
        ctx.add("warning", "init_bulk stages 含 3（AIMD）但缺少 md_incar（需独立 AIMD INCAR，NSW>0）", `${ibPath}.md_incar`);
      }
      // 建议显式设置的数值字段
      for (const f of ["skip_relax", "pert_numb", "pert_box", "pert_atom", "md_nstep", "coll_ndata"] as const) {
        if (ib[f] === undefined) {
          ctx.add("warning", `init_bulk 缺少 ${f}（建议显式设置）`, `${ibPath}.${f}`);
        }
      }
      // type_map 与顶层一致
      if (isArr(ib.type_map) && ib.type_map.length > 0 && (ib.type_map.length !== typeMapLen || ib.type_map.some((t, i) => t !== typeMap[i]))) {
        ctx.add("error", "init_bulk.type_map 与顶层 type_map 不一致（长度或顺序）", `${ibPath}.type_map`);
      }
    }
  }

  // init_fp_style
  if (p.init_fp_style !== undefined && typeof p.init_fp_style === "string" && !["vasp", "abacus"].includes(p.init_fp_style.toLowerCase())) {
    ctx.add("warning", `init_fp_style 非法: "${p.init_fp_style}"（合法值: vasp/abacus）`, "init_fp_style");
  }

  // model_devi_f_trust_lo / hi
  const trustLo = p.model_devi_f_trust_lo;
  const trustHi = p.model_devi_f_trust_hi;
  if (isArr(trustLo) || isArr(trustHi)) {
    const loArr = isArr(trustLo) ? trustLo : [trustLo];
    const hiArr = isArr(trustHi) ? trustHi : [trustHi];
    if (loArr.length === hiArr.length) {
      loArr.forEach((lo, i) => {
        const l = toNum(lo);
        const h = toNum(hiArr[i]);
        if (l !== null && h !== null && l >= h) {
          ctx.add("error", `model_devi_f_trust_lo (${l}) 必须小于 trust_hi (${h})`, `model_devi_f_trust_lo[${i}]`);
        }
      });
    } else {
      ctx.add("warning", "model_devi_f_trust_lo/hi 数组长度不一致，跳过逐元素比较", "model_devi_f_trust_lo");
    }
  } else {
    const l = toNum(trustLo);
    const h = toNum(trustHi);
    if (l !== null && h !== null) {
      if (l >= h) ctx.add("error", `model_devi_f_trust_lo (${l}) 必须小于 trust_hi (${h})`, "model_devi_f_trust_lo");
      if (l < 0.05 || l > 0.15) ctx.add("warning", "model_devi_f_trust_lo 建议取值 0.05~0.15 eV/Å", "model_devi_f_trust_lo");
      if (h < 0.30 || h > 0.50) ctx.add("warning", "model_devi_f_trust_hi 建议取值 0.30~0.50 eV/Å", "model_devi_f_trust_hi");
    }
  }

  // learning_rate.decay_steps 与 training.numb_steps
  const lr = dtn && isObj(dtn.learning_rate) ? dtn.learning_rate : null;
  const tr = dtn && isObj(dtn.training) ? dtn.training : null;
  if (lr && tr) {
    const decay = toNum(lr.decay_steps);
    const steps = toNum(tr.numb_steps);
    if (decay !== null && steps !== null && decay >= steps) {
      ctx.add("error", `learning_rate.decay_steps (${decay}) 应远小于 training.numb_steps (${steps})`, "learning_rate.decay_steps");
    }
  }

  // model_devi_jobs
  if (isArr(p.model_devi_jobs)) {
    p.model_devi_jobs.forEach((job, jobIdx) => {
      if (!isObj(job)) return;
      const j = job;
      const temps = isArr(j.temps) ? j.temps : [];
      const press = isArr(j.press) ? j.press : [];
      const ensemble = typeof j.ensemble === "string" ? j.ensemble : "";
      if (ensemble === "npt" && press.length === 0) {
        ctx.add("error", `model_devi_jobs[${jobIdx}] ensemble=npt 时必须提供 press（控压）`, `model_devi_jobs[${jobIdx}].press`);
      }
      if (press.length > 0 && temps.length > 0 && press.length !== temps.length) {
        ctx.add(
          "warning",
          `model_devi_jobs[${jobIdx}] press 长度 (${press.length}) 与 temps 长度 (${temps.length}) 不一致`,
          `model_devi_jobs[${jobIdx}]`
        );
      }
      const tempNums = temps.map((t) => toNum(t)).filter((t): t is number => t !== null);
      for (let i = 1; i < tempNums.length; i++) {
        const a = tempNums[i - 1];
        const b = tempNums[i];
        if (a > 0 && b > a * 3) {
          ctx.add(
            "warning",
            `model_devi_jobs[${jobIdx}] 相邻温度跨度较大 (${a}→${b})，建议控制在 2~3 倍以内避免外推崩溃`,
            `model_devi_jobs[${jobIdx}].temps`
          );
        }
      }
    });
  } else if (p.model_devi_jobs !== undefined) {
    ctx.add("error", "model_devi_jobs 必须是数组", "model_devi_jobs");
  }

  // model_devi_dt
  const dt = toNum(p.model_devi_dt);
  if (dt !== null && (dt < 0.001 || dt > 0.005)) {
    ctx.add("warning", `model_devi_dt (${dt}) 建议取值 0.001~0.005 ps`, "model_devi_dt");
  }

  // fp_task_max / fp_task_min
  const taskMax = toNum(p.fp_task_max);
  const taskMin = toNum(p.fp_task_min);
  if (taskMax !== null && taskMin !== null && taskMax < taskMin) {
    ctx.add("error", `fp_task_max (${taskMax}) 不能小于 fp_task_min (${taskMin})`, "fp_task_max");
  }

  // training.training_data.systems 应留空
  if (tr) {
    const td = isObj(tr.training_data) ? tr.training_data : null;
    if (td && isArr(td.systems) && td.systems.length > 0) {
      ctx.add(
        "warning",
        "DP-GEN 场景下 training.training_data.systems 应留空（由 init_data_sys + 各轮迭代数据动态合并）",
        "training.training_data.systems"
      );
    }
  }

  // sys_batch_size 与 sys_configs 长度
  if (isArr(p.sys_batch_size) && isArr(p.sys_configs) && p.sys_batch_size.length !== p.sys_configs.length) {
    ctx.add("info", "sys_batch_size 长度与 sys_configs 不一致，建议逐系统设置", "sys_batch_size");
  }

  // model_devi_engine=lammps -> command 含 lmp
  if (p.model_devi_engine === "lammps" && typeof p.model_devi_command === "string" && !p.model_devi_command.includes("lmp")) {
    ctx.add("warning", "model_devi_engine=lammps 但 model_devi_command 未包含 lmp", "model_devi_command");
  }

  return ctx.result();
}

/* ---------------------------------- machine.json ---------------------------------- */

const BATCH_TYPES = ["shell", "slurm", "torque", "pbs", "lsf", "bohrium"];
const CONTEXT_TYPES = ["local", "sshcontext", "lazylocalcontext", "bohriumcontext"];

function normalizeContext(v: unknown): string {
  if (typeof v !== "string") return "";
  const s = v.trim();
  return s.toLowerCase() === "ssh" ? "SSHContext" : s;
}

export function validateMachineSegment(jsonText: string, segment: MachineSegment): ValidationResult {
  const ctx = createCtx();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch (e) {
    ctx.add("error", `JSON 语法错误: ${e instanceof Error ? e.message : String(e)}`);
    return ctx.result();
  }

  let entries: unknown[];
  if (isArr(parsed)) {
    entries = parsed;
  } else if (isObj(parsed) && ("machine" in parsed || "resources" in parsed)) {
    entries = [parsed]; // 容忍少包一层数组的粘贴
  } else {
    ctx.add("error", "machine.json 应为 DPDispatcher 数组格式 [{machine, resources, command}, ...]");
    return ctx.result();
  }
  if (entries.length === 0) {
    ctx.add("warning", "空配置：无任何任务条目", "");
    return ctx.result();
  }

  entries.forEach((entry, idx) => {
    if (!isObj(entry)) {
      ctx.add("error", `第 ${idx} 条不是对象`, `[${idx}]`);
      return;
    }
    const e = entry;
    const path = `[${idx}]`;
    const machine = isObj(e.machine) ? e.machine : null;
    // 兼容嵌套（新格式）与平铺（旧格式）两种 batch_type/context_type 位置
    const batchRaw = machine?.batch_type ?? e.batch_type;
    const contextRaw = machine?.context_type ?? e.context_type;
    const batchType = typeof batchRaw === "string" ? batchRaw.trim() : "";
    const contextType = normalizeContext(contextRaw);

    if (!machine && batchType === "" && contextType === "") {
      ctx.add("error", `${path} 缺少 machine 配置对象`, `${path}.machine`);
      return;
    }

    // batch_type
    if (batchType === "") {
      ctx.add("error", `${path} 缺少 batch_type`, `${path}.batch_type`);
    } else if (!BATCH_TYPES.includes(batchType.toLowerCase())) {
      ctx.add("error", `batch_type 非法: "${batchType}"（合法值: shell/Slurm/Torque/PBS/LSF/Bohrium）`, `${path}.batch_type`);
    }

    // context_type
    if (contextType === "") {
      ctx.add("error", `${path} 缺少 context_type`, `${path}.context_type`);
    } else if (!CONTEXT_TYPES.includes(contextType.toLowerCase())) {
      ctx.add("error", `context_type 非法: "${contextRaw}"（合法值: local/SSHContext/LazyLocalContext/BohriumContext）`, `${path}.context_type`);
    }

    const isSsh = contextType.toLowerCase() === "sshcontext";

    // SSH: remote_root + remote_profile
    const remoteRoot = machine?.remote_root ?? e.remote_root;
    if (isSsh && (typeof remoteRoot !== "string" || remoteRoot.trim() === "")) {
      ctx.add("error", "context_type=SSH 时必须提供 remote_root（远程根目录）", `${path}.remote_root`);
    }
    const remoteProfile = machine?.remote_profile ?? e.remote_profile;
    if (isSsh) {
      if (!isObj(remoteProfile)) {
        ctx.add("error", "context_type=SSH 时必须提供 remote_profile（含 hostname/username）", `${path}.remote_profile`);
      } else {
        if (typeof remoteProfile.hostname !== "string" || remoteProfile.hostname.trim() === "") {
          ctx.add("error", "remote_profile 缺少 hostname（远程主机地址）", `${path}.remote_profile.hostname`);
        }
        if (typeof remoteProfile.username !== "string" || remoteProfile.username.trim() === "") {
          ctx.add("error", "remote_profile 缺少 username（远程账号）", `${path}.remote_profile.username`);
        }
        if (
          remoteProfile.key_filename === undefined ||
          (typeof remoteProfile.key_filename === "string" && remoteProfile.key_filename.trim() === "")
        ) {
          ctx.add("info", "建议在 remote_profile 中配置 key_filename（SSH 私钥路径）", `${path}.remote_profile.key_filename`);
        }
      }
    }

    // resources
    const resources = e.resources;
    if (!isObj(resources)) {
      ctx.add("error", `${path} 缺少 resources 配置对象`, `${path}.resources`);
      return;
    }
    const res = resources;
    const rPath = `${path}.resources`;

    for (const f of ["number_node", "cpu_per_node", "gpu_per_node", "group_size"] as const) {
      const v = res[f];
      if (v === undefined || v === null) continue;
      if (toNum(v) === null) {
        ctx.add("warning", `resources.${f} 应为数值（当前: ${JSON.stringify(v)}）`, `${rPath}.${f}`);
      }
    }

    const isScheduler = BATCH_TYPES.slice(1).includes(batchType.toLowerCase()); // 排除 shell
    if (isScheduler && (typeof res.queue_name !== "string" || res.queue_name.trim() === "")) {
      ctx.add("warning", `batch_type=${batchType} 建议提供 resources.queue_name（队列/分区名）`, `${rPath}.queue_name`);
    }

    // command
    const command = e.command;
    if (typeof command !== "string" || command.trim() === "") {
      ctx.add("error", `${path} 缺少 command`, `${path}.command`);
      return;
    }
    const cmd = command;

    // 段特定命令检查
    if (segment === "train") {
      const hasDp = cmd.includes("dp_wrapper") || /(^|\s)dp(\s|$)/.test(cmd);
      if (!hasDp) {
        ctx.add("warning", "train 段 command 应调用 dp / dp_wrapper 进行训练", `${path}.command`);
      }
      const gpu = toNum(res.gpu_per_node);
      if (gpu !== null && gpu < 1) {
        ctx.add("warning", "train 段建议配置 gpu_per_node>=1（DeePMD 训练需要 GPU）", `${rPath}.gpu_per_node`);
      }
    } else if (segment === "model_devi") {
      if (!cmd.includes("lmp")) {
        ctx.add("warning", "model_devi 段 command 应调用 lmp（LAMMPS）", `${path}.command`);
      }
    } else if (segment === "fp") {
      if (!cmd.includes("vasp")) {
        ctx.add("error", "fp 段 command 应调用 vasp 执行 DFT 标注", `${path}.command`);
      }
      const cpu = toNum(res.cpu_per_node);
      if (cpu !== null && cpu > 1 && !cmd.includes("mpirun") && !cmd.includes("srun")) {
        ctx.add("warning", `fp 段 cpu_per_node=${cpu}>1，command 应包含 mpirun/srun 并行运行 vasp`, `${path}.command`);
      }
      const envLines: string[] = [cmd];
      if (isArr(res.prepend_script)) envLines.push(...(res.prepend_script as string[]));
      if (isArr(res.append_script)) envLines.push(...(res.append_script as string[]));
      if (isObj(res.envs)) envLines.push(...Object.values(res.envs) as string[]);
      const envText = envLines.join("\n");
      if (!envText.includes("unset LD_LIBRARY_PATH")) {
        ctx.add(
          "warning",
          "fp 段 vasp 命令前建议 unset LD_LIBRARY_PATH，避免继承 conda 动态库导致 SIGSEGV",
          `${path}.command`,
          "在 command 或 prepend_script 中加入 unset LD_LIBRARY_PATH"
        );
      }
    }

    // custom_flags 前缀与 batch_type 匹配
    if (isArr(res.custom_flags)) {
      for (const f of res.custom_flags) {
        if (typeof f !== "string") continue;
        const line = f.trim();
        const bt = batchType.toLowerCase();
        if (bt === "torque" || bt === "pbs") {
          if (line.startsWith("#SBATCH")) {
            ctx.add("warning", `custom_flags 含 #SBATCH，但 batch_type=${batchType} 应用 #PBS 头`, `${rPath}.custom_flags`);
          } else if (!line.startsWith("#PBS")) {
            ctx.add("info", `custom_flags 行不以 #PBS 开头: ${line}`, `${rPath}.custom_flags`);
          }
        } else if (bt === "slurm" && line.startsWith("#PBS")) {
          ctx.add("warning", `custom_flags 含 #PBS，但 batch_type=Slurm 应用 #SBATCH 头`, `${rPath}.custom_flags`);
        }
      }
    }

    // 列表字段
    for (const f of ["prepend_script", "append_script", "source_list", "module_list"] as const) {
      const v = res[f];
      if (v === undefined) continue;
      if (!isArr(v)) {
        ctx.add("warning", `resources.${f} 应为字符串数组`, `${rPath}.${f}`);
      } else {
        (v as unknown[]).forEach((line, li) => {
          if (typeof line === "string" && line.trim() === "") {
            ctx.add("info", `resources.${f}[${li}] 为空行`, `${rPath}.${f}[${li}]`);
          }
        });
      }
    }

    // envs
    if (res.envs !== undefined && !(isObj(res.envs) && Object.values(res.envs).every((v) => typeof v === "string"))) {
      ctx.add("warning", "resources.envs 应为 string→string 对象", `${rPath}.envs`);
    }
  });

  return ctx.result();
}

/* ---------------------------------- INCAR_fp ---------------------------------- */

export function validateIncarDeep(text: string): ValidationResult {
  const ctx = createCtx();

  if (text.trim() === "") {
    ctx.add("error", "INCAR 内容为空");
    return ctx.result();
  }
  const entries = parseIncar(text);
  const byKey = new Map<string, IncarEntry[]>();
  for (const en of entries) {
    const arr = byKey.get(en.key) || [];
    arr.push(en);
    byKey.set(en.key, arr);
  }
  const get = (k: string) => (byKey.get(k) || [])[0];
  const has = (k: string) => byKey.has(k);

  // 重复 key
  for (const [k, arr] of byKey) {
    if (arr.length > 1) {
      ctx.add("warning", `重复参数 ${k}（出现 ${arr.length} 次），后值可能覆盖前值`, k);
    }
  }

  // 必填
  for (const k of ["PREC", "ENCUT", "EDIFF"]) {
    if (!has(k)) ctx.add("error", `缺少必需参数: ${k}`, k);
  }

  // KSPACING（dpgen 强制）
  if (!has("KSPACING")) {
    ctx.add("error", "缺少 KSPACING（DP-GEN v0.13.x 强制要求，缺失会报 RuntimeError）", "KSPACING");
  }
  // KGAMMA
  if (has("KGAMMA")) {
    if (toBool(get("KGAMMA").value) === false) {
      ctx.add("warning", "KGAMMA 建议 .TRUE.（Gamma 中心网格）", "KGAMMA");
    }
  } else {
    ctx.add("info", "缺少 KGAMMA，建议 .TRUE.（配合 KSPACING 使用）", "KGAMMA");
  }

  // NSW / IBRION（DP-GEN 静态单点）
  if (has("NSW")) {
    const nsw = toNum(get("NSW").value);
    if (nsw !== null && nsw !== 0) ctx.add("error", "DP-GEN FP 标注需 NSW = 0（静态单点）", "NSW");
  }
  if (has("IBRION")) {
    const ib = toNum(get("IBRION").value);
    if (ib !== null && ib !== -1) ctx.add("error", "DP-GEN FP 标注需 IBRION = -1（静态单点）", "IBRION");
  }

  // ISIF >= 2（保证 virial 输出）
  if (has("ISIF")) {
    const isif = toNum(get("ISIF").value);
    if (isif !== null && isif < 2) ctx.add("warning", `ISIF = ${isif} 建议 ≥2，以保证输出应力/virial`, "ISIF");
  }

  // ENCUT
  if (has("ENCUT")) {
    const encut = toNum(get("ENCUT").value);
    if (encut !== null && encut < 520) {
      ctx.add("warning", `ENCUT = ${encut} eV 建议 ≥520 eV（TiC 体系 ≥1.3×ENMAX）`, "ENCUT");
    }
  } else {
    ctx.add("error", "缺少必需参数: ENCUT", "ENCUT");
  }

  // EDIFF
  if (has("EDIFF")) {
    const ediff = toNum(get("EDIFF").value);
    if (ediff !== null && ediff > 1e-5) ctx.add("warning", `EDIFF = ${ediff} 建议 ≤1E-6（DP-GEN 标注精度）`, "EDIFF");
  }

  // ISMEAR
  if (!has("ISMEAR")) {
    ctx.add("warning", "缺少 ISMEAR（金属体系建议 1，半导体 0）", "ISMEAR");
  }
  // SIGMA
  if (has("SIGMA")) {
    const sigma = toNum(get("SIGMA").value);
    if (sigma !== null && sigma > 0.2) ctx.add("info", `SIGMA = ${sigma} 偏大，建议 0.05~0.2`, "SIGMA");
  }

  // DOS 标签（DP-GEN 不需要）
  for (const k of ["LORBIT", "NEDOS"]) {
    if (has(k)) ctx.add("info", `${k} 存在：DP-GEN 标注不需要 DOS，建议移除以提速`, k);
  }

  // 未知参数（弱拼写检查）
  const knownKeys = new Set(INCAR_SCHEMA.map((f) => f.key));
  for (const k of byKey.keys()) {
    if (!knownKeys.has(k)) ctx.add("info", `未知参数 "${k}"（请检查拼写）`, k);
  }

  return ctx.result();
}

/* ---------------------------------- LAMMPS 输入脚本 ---------------------------------- */

export function validateLammps(text: string): ValidationResult {
  const ctx = createCtx();

  const cmds: { cmd: string; args: string }[] = [];
  for (const line of text.split("\n")) {
    const noComment = line.split("#")[0].trim();
    if (noComment === "") continue;
    const parts = noComment.split(/\s+/);
    cmds.push({ cmd: parts[0], args: parts.slice(1).join(" ") });
  }
  if (cmds.length === 0) {
    ctx.add("error", "LAMMPS 输入为空或无法解析");
    return ctx.result();
  }

  const hasCmd = (c: string) => cmds.some((x) => x.cmd === c);
  const pairStyleDeepmd = cmds.find((x) => x.cmd === "pair_style" && x.args.includes("deepmd"));

  const units = cmds.find((x) => x.cmd === "units");
  if (!units) {
    ctx.add("error", "缺少 units 命令", "units", "DeePMD 必须使用 units metal");
  } else if (!units.args.includes("metal")) {
    ctx.add("error", `units 应为 metal（当前: ${units.args}）`, "units");
  }

  if (!pairStyleDeepmd) {
    ctx.add("error", "缺少 pair_style deepmd（DeePMD 势函数调用）", "pair_style");
  } else if (!/\.(pb|dp)\b/.test(pairStyleDeepmd.args)) {
    ctx.add("warning", "pair_style deepmd 未指定模型文件（.pb/.dp 路径）", "pair_style");
  }

  const ts = cmds.find((x) => x.cmd === "timestep");
  if (ts) {
    const t = toNum(ts.args.split(/\s+/)[0]);
    if (t !== null && t > 0.002) {
      ctx.add("error", `timestep = ${t} ps 过大，有失稳风险（建议 0.001~0.002）`, "timestep");
    } else if (t !== null && t < 0.001) {
      ctx.add("warning", `timestep = ${t} ps 过于保守，可考虑 0.001~0.002`, "timestep");
    }
  } else {
    ctx.add("warning", "缺少 timestep 命令", "timestep");
  }

  if (!hasCmd("atom_style")) ctx.add("warning", "缺少 atom_style 命令", "atom_style");
  if (!hasCmd("thermo")) ctx.add("warning", "缺少 thermo 命令", "thermo");
  if (!hasCmd("run")) ctx.add("warning", "缺少 run 命令（未定义 MD 步数）", "run");

  const hasFixNvtNpt = cmds.some((x) => x.cmd === "fix" && /nvt|npt/.test(x.args));
  const hasVelocitySeed = cmds.some((x) => x.cmd === "velocity" && x.args.includes("seed"));
  if (hasFixNvtNpt && !hasVelocitySeed) {
    ctx.add("warning", "存在 fix nvt/npt 但未设置 velocity ... seed（缺少随机种子）", "velocity");
  }

  if (!hasCmd("dump")) ctx.add("info", "缺少 dump 命令（若轨迹由 DP-GEN 外部处理可忽略）", "dump");
  if (!hasCmd("pair_coeff")) ctx.add("info", "缺少 pair_coeff 命令", "pair_coeff");
  if (!hasCmd("boundary")) ctx.add("info", "缺少 boundary 命令", "boundary");

  return ctx.result();
}

/* ---------------------------------- 作业提交脚本 ---------------------------------- */

export function validateSubmitScript(text: string): ValidationResult {
  const ctx = createCtx();

  if (!text.trim().startsWith("#!")) {
    ctx.add("error", "缺少 shebang（如 #!/bin/bash）", "", "脚本第一行应为 #!/bin/bash");
  }

  const hasPbs = /^#PBS/m.test(text);
  const hasSbatch = /^#SBATCH/m.test(text);
  if (!hasPbs && !hasSbatch) {
    ctx.add("warning", "未检测到 #PBS 或 #SBATCH 调度头（本地直接运行可忽略）", "");
  }

  if (!/(mpirun|mpiexec|srun)/.test(text)) {
    ctx.add("warning", "未检测到 mpirun/mpiexec/srun（并行计算作业通常需要）", "");
  }

  if (text.includes("vasp") && !text.includes("unset LD_LIBRARY_PATH")) {
    ctx.add("warning", "调用 vasp 前建议 unset LD_LIBRARY_PATH，避免动态库污染导致 SIGSEGV", "", "在 mpirun 前加 unset LD_LIBRARY_PATH");
  }

  if (hasPbs) {
    if (!/#PBS\s+-l\s+[^\n]*nodes=/.test(text)) {
      ctx.add("warning", "#PBS 头缺少 nodes=（如 #PBS -l nodes=1:ppn=52）", "");
    }
    const wallMatch = text.match(/#PBS\s+-l\s+[^\n]*walltime=(\d[\d:]+)/);
    if (!wallMatch) {
      ctx.add("warning", "#PBS 头缺少 walltime（如 #PBS -l walltime=85:00:00）", "");
    } else if (!/^\d+:\d{2}:\d{2}$/.test(wallMatch[1])) {
      ctx.add("warning", `walltime 格式应为 HH:MM:SS（当前: ${wallMatch[1]}）`, "");
    }
  }

  if (hasSbatch) {
    if (!/--(nodes|ntasks|ntasks-per-node)/.test(text)) {
      ctx.add("warning", "#SBATCH 头缺少节点/任务数（如 --nodes=1 或 --ntasks=52）", "");
    }
    const timeMatch = text.match(/--time=(\S+)/);
    if (timeMatch && !/^\d+:\d{2}:\d{2}$/.test(timeMatch[1])) {
      ctx.add("warning", `--time 格式应为 HH:MM:SS（当前: ${timeMatch[1]}）`, "");
    }
  }

  if (!/(module\s+load|source\s+)/.test(text)) {
    ctx.add("info", "未检测到 module load / source 环境加载命令", "");
  }
  if (text.includes("\r")) {
    ctx.add("info", "文本含 CRLF（\\r），提交前建议 dos2unix 转为 LF", "");
  }

  return ctx.result();
}

/* ---------------------------------- 跨配置一致性 ---------------------------------- */

export interface CrossCheckParams {
  paramJson: string;
  machineJsonBySegment: Partial<Record<MachineSegment, string>>;
  incarText: string;
}

export function runCrossChecks(params: CrossCheckParams): ValidationResult {
  const ctx = createCtx();

  let p: Record<string, unknown>;
  try {
    const parsed = JSON.parse(params.paramJson);
    if (!isObj(parsed)) return ctx.result();
    p = parsed;
  } catch {
    return ctx.result(); // param 解析失败 -> 跳过跨配置检查
  }

  const parseMachineEntry = (text?: string): Record<string, unknown> | null => {
    if (!text) return null;
    try {
      const parsed = JSON.parse(text);
      if (isArr(parsed) && isObj(parsed[0])) return parsed[0];
      if (isObj(parsed)) return parsed;
    } catch {
      /* ignore */
    }
    return null;
  };

  // train group_size vs numb_models
  const trainEntry = parseMachineEntry(params.machineJsonBySegment.train);
  if (trainEntry && isObj(trainEntry.resources)) {
    const groupSize = toNum(trainEntry.resources.group_size);
    const numb = toNum(p.numb_models);
    if (groupSize !== null && numb !== null && groupSize !== numb) {
      ctx.add("warning", `train 段 group_size (${groupSize}) 通常应等于 param.numb_models (${numb})`, "machine.train.resources.group_size");
    }
  }

  // model_devi_engine=lammps -> model_devi command 含 lmp
  const mdEntry = parseMachineEntry(params.machineJsonBySegment.model_devi);
  if (p.model_devi_engine === "lammps" && mdEntry) {
    const cmd = typeof mdEntry.command === "string" ? mdEntry.command : "";
    if (!cmd.includes("lmp")) {
      ctx.add("warning", "param.model_devi_engine=lammps 但 machine model_devi 段 command 未调用 lmp", "machine.model_devi.command");
    }
  }

  // fp_style=vasp -> fp command 含 vasp
  const fpEntry = parseMachineEntry(params.machineJsonBySegment.fp);
  if (p.fp_style === "vasp" && fpEntry) {
    const cmd = typeof fpEntry.command === "string" ? fpEntry.command : "";
    if (!cmd.includes("vasp")) {
      ctx.add("error", "param.fp_style=vasp 但 machine fp 段 command 未调用 vasp", "machine.fp.command");
    }
  }

  // INCAR KGAMMA vs param.fp_kgamma
  const incarEntries = parseIncar(params.incarText);
  const incarKg = incarEntries.find((en) => en.key === "KGAMMA");
  if (incarKg && p.fp_kgamma !== undefined) {
    const incarBool = toBool(incarKg.value);
    const paramBool = toBool(p.fp_kgamma);
    if (incarBool !== null && paramBool !== null && incarBool !== paramBool) {
      ctx.add("warning", `INCAR KGAMMA (${incarKg.value}) 与 param.fp_kgamma (${JSON.stringify(p.fp_kgamma)}) 不一致`, "fp_kgamma");
    }
  }

  // INCAR KSPACING vs param.fp_kspacing（info，两值语义不等价）
  const incarKs = incarEntries.find((en) => en.key === "KSPACING");
  if (incarKs && p.fp_kspacing !== undefined) {
    const incarNum = toNum(incarKs.value);
    const paramNum = toNum(p.fp_kspacing);
    if (incarNum !== null && paramNum !== null && Math.abs(incarNum - paramNum) > 1e-9) {
      ctx.add("info", `INCAR KSPACING (${incarKs.value}) 与 param.fp_kspacing (${JSON.stringify(p.fp_kspacing)}) 数值不一致（两者语义不同，请确认）`, "fp_kspacing");
    }
  }

  // fp_incar 命名
  if (typeof p.fp_incar === "string" && p.fp_incar.trim() !== "" && !p.fp_incar.endsWith("INCAR_fp")) {
    ctx.add("info", `param.fp_incar (${p.fp_incar}) 不是以 INCAR_fp 结尾，请确认与 INCAR 模板路径一致`, "fp_incar");
  }

  return ctx.result();
}
