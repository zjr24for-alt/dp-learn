"use client";

import { useMemo, useState } from "react";
import {
  parseElements,
  elementMass,
  applyMaterialToParam,
  extractPathsFromParam,
  extractTypeMap,
  type MaterialPathInputs,
  type ApplyMaterialResult,
} from "@/lib/dpgen-config";

interface MaterialSwitchProps {
  open: boolean;
  onClose: () => void;
  currentParam: string;
  onApply: (newParam: string, compoundLabel: string) => void;
}

export function MaterialSwitch({ open, onClose, currentParam, onApply }: MaterialSwitchProps) {
  const initPaths = useMemo(() => extractPathsFromParam(currentParam), [currentParam]);
  const initElements = useMemo(() => extractTypeMap(currentParam), [currentParam]);

  const [elementsText, setElementsText] = useState(initElements.join(", "));
  const [paths, setPaths] = useState<MaterialPathInputs>({
    initDataPrefix: initPaths.initDataPrefix,
    initDataSys: initPaths.initDataSys,
    sysConfigsPrefix: initPaths.sysConfigsPrefix,
    sysConfigs: initPaths.sysConfigs,
    fpPpPath: initPaths.fpPpPath,
    fpPpFiles: initPaths.fpPpFiles,
    fromPoscarPath: initPaths.fromPoscarPath,
    relaxIncar: initPaths.relaxIncar,
    mdIncar: initPaths.mdIncar,
  });
  const [error, setError] = useState<string | null>(null);

  const elements = useMemo(() => parseElements(elementsText), [elementsText]);
  const unknownSymbols = useMemo(
    () => elementsText.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean).filter((s) => elementMass(s) === undefined),
    [elementsText]
  );

  // 元素变化时自动联动 fp_pp_files（保持顺序）
  const handleElementsChange = (text: string) => {
    setElementsText(text);
    const parsed = parseElements(text);
    if (parsed.length > 0) {
      setPaths((prev) => ({
        ...prev,
        fpPpFiles: parsed.map((el) => (el ? `POTCAR_${el}` : "")).join(", "),
      }));
    }
  };

  const handleApply = () => {
    setError(null);
    if (elements.length === 0) {
      setError("请至少填写一种元素（逗号分隔，如 Ti, C）");
      return;
    }
    if (!paths.initDataPrefix || !paths.sysConfigsPrefix || !paths.fpPpPath) {
      setError("请填写 init_data_prefix / sys_configs_prefix / fp_pp_path");
      return;
    }
    const result: ApplyMaterialResult = applyMaterialToParam(currentParam, elements, paths);
    if (result.error) {
      setError(result.error);
      return;
    }
    onApply(result.json, result.compoundLabel);
  };

  if (!open) return null;

  const setPath = (key: keyof MaterialPathInputs) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPaths((prev) => ({ ...prev, [key]: e.target.value }));

  const inputCls =
    "w-full px-3 py-1.5 text-xs font-mono border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-300";
  const labelCls = "block text-[11px] font-medium text-slate-500 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 shrink-0">
          <h3 className="text-sm font-semibold text-slate-800">🔄 切换材料</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none px-1"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-500">
            填写新材料元素与常用路径，自动更新 param.json 的{" "}
            <code className="bg-slate-100 px-1 rounded">type_map / mass_map / init_bulk / fp_pp_files / model.type_map</code>。
          </p>

          {/* 元素 */}
          <div>
            <label className={labelCls}>
              元素（逗号分隔）<span className="text-red-400">*</span>
            </label>
            <input
              value={elementsText}
              onChange={(e) => handleElementsChange(e.target.value)}
              placeholder="如：Al, Co, Cr, Fe, Ni"
              className={inputCls}
              spellCheck={false}
            />
            {elements.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {elements.map((el) => (
                  <span key={el} className="text-[11px] font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                    {el} {elementMass(el)}
                  </span>
                ))}
              </div>
            )}
            {unknownSymbols.length > 0 && (
              <p className="mt-1 text-[11px] text-red-500">无法识别：{unknownSymbols.join(", ")}（元素符号拼写检查）</p>
            )}
          </div>

          {/* 赝势 */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className={labelCls}>fp_pp_path（赝势目录）</label>
              <input value={paths.fpPpPath} onChange={setPath("fpPpPath")} className={inputCls} spellCheck={false} />
            </div>
            <div>
              <label className={labelCls}>fp_pp_files（按元素顺序）</label>
              <input value={paths.fpPpFiles} onChange={setPath("fpPpFiles")} className={inputCls} spellCheck={false} />
            </div>
          </div>

          {/* 初始数据 */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className={labelCls}>init_data_prefix</label>
              <input value={paths.initDataPrefix} onChange={setPath("initDataPrefix")} className={inputCls} spellCheck={false} />
            </div>
            <div>
              <label className={labelCls}>init_data_sys（逗号分隔）</label>
              <input value={paths.initDataSys} onChange={setPath("initDataSys")} className={inputCls} spellCheck={false} />
            </div>
          </div>

          {/* 探索结构 */}
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className={labelCls}>sys_configs_prefix</label>
              <input value={paths.sysConfigsPrefix} onChange={setPath("sysConfigsPrefix")} className={inputCls} spellCheck={false} />
            </div>
            <div>
              <label className={labelCls}>sys_configs（POSCAR 路径）</label>
              <input value={paths.sysConfigs} onChange={setPath("sysConfigs")} className={inputCls} spellCheck={false} />
            </div>
          </div>

          {/* init_bulk（可选） */}
          <details className="border border-slate-200 rounded-lg p-3 bg-slate-50">
            <summary className="cursor-pointer text-xs font-medium text-slate-600 select-none">
              init_bulk 相关路径（可选，含 init_bulk 时才需要）
            </summary>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <div>
                <label className={labelCls}>from_poscar_path</label>
                <input value={paths.fromPoscarPath ?? ""} onChange={setPath("fromPoscarPath")} className={inputCls} spellCheck={false} />
              </div>
              <div>
                <label className={labelCls}>relax_incar</label>
                <input value={paths.relaxIncar ?? ""} onChange={setPath("relaxIncar")} className={inputCls} spellCheck={false} />
              </div>
              <div>
                <label className={labelCls}>md_incar</label>
                <input value={paths.mdIncar ?? ""} onChange={setPath("mdIncar")} className={inputCls} spellCheck={false} />
              </div>
            </div>
          </details>

          {error && <p className="text-xs text-red-500">{error}</p>}

          {/* 预览：将改动的字段 */}
          {elements.length > 0 && (
            <div className="text-[11px] text-slate-400 bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-0.5">
              <div className="font-medium text-slate-500 mb-1">将写入 param.json：</div>
              <div><code>type_map = [{elements.join(", ")}]</code></div>
              <div><code>mass_map = [{elements.map((el) => elementMass(el)).join(", ")}]</code></div>
              <div><code>fp_pp_files = [{paths.fpPpFiles.split(/[,，\s]+/).filter(Boolean).join(", ")}]</code></div>
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ✓ 应用并更新 param.json
          </button>
        </div>
      </div>
    </div>
  );
}
