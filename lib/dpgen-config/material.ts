/**
 * 切换材料时，把新元素与常用路径一次性地传播到 param.json 的所有相关字段。
 * 覆盖「必改参数」：type_map / mass_map / init_bulk.* / fp_pp_files / model.type_map / 初始数据路径。
 */

import { elementMass } from "./periodic-table";

export interface MaterialPathInputs {
  initDataPrefix: string;
  initDataSys: string; // 逗号分隔
  sysConfigsPrefix: string;
  sysConfigs: string; // 单个 POSCAR 路径 → [[path]]
  fpPpPath: string;
  fpPpFiles: string; // 逗号分隔，顺序对应元素
  fromPoscarPath?: string;
  relaxIncar?: string;
  mdIncar?: string;
}

export interface ApplyMaterialResult {
  json: string;
  error?: string;
  massMap: number[];
  compoundLabel: string;
}

/** 从逗号/空格文本解析字符串数组 */
function splitList(text: string): string[] {
  return text
    .split(/[,，\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function applyMaterialToParam(
  jsonText: string,
  elements: string[],
  paths: MaterialPathInputs
): ApplyMaterialResult {
  const compoundLabel = elements.length > 0 ? `${elements.join("-")} ${elements.length} 组元` : "";

  let obj: Record<string, unknown>;
  try {
    const v = JSON.parse(jsonText);
    if (typeof v !== "object" || v === null || Array.isArray(v)) {
      return { json: "", error: "param.json 必须是 JSON 对象", massMap: [], compoundLabel };
    }
    obj = v as Record<string, unknown>;
  } catch {
    return { json: "", error: "param.json 语法错误，无法自动更新", massMap: [], compoundLabel };
  }

  // 元素 → 质量
  const massMap: number[] = [];
  for (const el of elements) {
    const m = elementMass(el);
    if (m === undefined) {
      return { json: "", error: `未知元素：${el}，请检查拼写`, massMap: [], compoundLabel };
    }
    massMap.push(m);
  }

  const typeMap = [...elements];
  const fpFiles = splitList(paths.fpPpFiles);

  // 顶层
  obj.type_map = typeMap;
  obj.mass_map = massMap;
  obj.init_data_prefix = paths.initDataPrefix.trim();
  obj.init_data_sys = splitList(paths.initDataSys);
  obj.sys_configs_prefix = paths.sysConfigsPrefix.trim();
  obj.sys_configs = [splitList(paths.sysConfigs)];
  obj.fp_pp_path = paths.fpPpPath.trim();
  if (fpFiles.length > 0) obj.fp_pp_files = fpFiles;

  // init_bulk
  if (obj.init_bulk && typeof obj.init_bulk === "object" && !Array.isArray(obj.init_bulk)) {
    const ib = obj.init_bulk as Record<string, unknown>;
    ib.elements = typeMap;
    ib.type_map = typeMap;
    if (fpFiles.length > 0 && paths.fpPpPath.trim()) {
      // potcars 使用 fp_pp_path 前缀拼接，与 fp_pp_files 一致
      ib.potcars = fpFiles.map((f) => {
        const base = paths.fpPpPath.trim().replace(/\/+$/, "");
        return f.startsWith("/") ? f : `${base}/${f}`;
      });
    }
    if (paths.fromPoscarPath && paths.fromPoscarPath.trim()) ib.from_poscar_path = paths.fromPoscarPath.trim();
    if (paths.relaxIncar && paths.relaxIncar.trim()) ib.relax_incar = paths.relaxIncar.trim();
    if (paths.mdIncar && paths.mdIncar.trim()) ib.md_incar = paths.mdIncar.trim();
  }

  // default_training_param.model.type_map
  const dtp = obj.default_training_param;
  if (dtp && typeof dtp === "object" && !Array.isArray(dtp)) {
    const model = (dtp as Record<string, unknown>).model;
    if (model && typeof model === "object" && !Array.isArray(model)) {
      (model as Record<string, unknown>).type_map = typeMap;
    }
  }

  return { json: JSON.stringify(obj, null, 2), massMap, compoundLabel };
}

/** 从现有 param.json 提取常用路径，预填换材料表单 */
export interface ExtractedPaths {
  initDataPrefix: string;
  initDataSys: string;
  sysConfigsPrefix: string;
  sysConfigs: string;
  fpPpPath: string;
  fpPpFiles: string;
  fromPoscarPath?: string;
  relaxIncar?: string;
  mdIncar?: string;
}

export function extractPathsFromParam(jsonText: string): ExtractedPaths {
  const empty: ExtractedPaths = {
    initDataPrefix: "",
    initDataSys: "",
    sysConfigsPrefix: "",
    sysConfigs: "",
    fpPpPath: "",
    fpPpFiles: "",
  };
  let obj: Record<string, unknown>;
  try {
    const v = JSON.parse(jsonText);
    if (typeof v !== "object" || v === null || Array.isArray(v)) return empty;
    obj = v as Record<string, unknown>;
  } catch {
    return empty;
  }

  const str = (x: unknown): string => (typeof x === "string" ? x : "");
  const arr = (x: unknown): string =>
    Array.isArray(x) ? x.filter((i): i is string => typeof i === "string").join(", ") : "";

  const paths: ExtractedPaths = {
    initDataPrefix: str(obj.init_data_prefix),
    initDataSys: arr(obj.init_data_sys),
    sysConfigsPrefix: str(obj.sys_configs_prefix),
    sysConfigs: Array.isArray(obj.sys_configs) && Array.isArray(obj.sys_configs[0])
      ? arr(obj.sys_configs[0])
      : "",
    fpPpPath: str(obj.fp_pp_path),
    fpPpFiles: arr(obj.fp_pp_files),
  };

  if (obj.init_bulk && typeof obj.init_bulk === "object" && !Array.isArray(obj.init_bulk)) {
    const ib = obj.init_bulk as Record<string, unknown>;
    paths.fromPoscarPath = str(ib.from_poscar_path) || undefined;
    paths.relaxIncar = str(ib.relax_incar) || undefined;
    paths.mdIncar = str(ib.md_incar) || undefined;
  }

  return paths;
}

/** 从现有 param.json 提取 type_map，作为元素输入框的初始值 */
export function extractTypeMap(jsonText: string): string[] {
  try {
    const v = JSON.parse(jsonText) as Record<string, unknown>;
    if (Array.isArray(v.type_map)) return v.type_map.filter((x): x is string => typeof x === "string");
  } catch {
    // 忽略
  }
  return [];
}
