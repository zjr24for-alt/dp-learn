"use client";

import { useState, useCallback } from "react";
import { CodeEditor } from "@/components/config-builder/code-editor";
import { PARAM_SCHEMA } from "@/lib/dpgen-config/param-schema";
import { MACHINE_SCHEMA, getMachineDefaults } from "@/lib/dpgen-config/machine-schema";
import { INCAR_SCHEMA, getIncarDefaults, validateIncar } from "@/lib/dpgen-config/incar-schema";
import type { ParamField } from "@/lib/dpgen-config";

type ConfigTab = "param" | "machine" | "incar";
type MachineSegment = "train" | "model_devi" | "fp";

const TABS: { id: ConfigTab; label: string; desc: string }[] = [
  { id: "param", label: "param.json", desc: "DP-GEN 工作流参数" },
  { id: "machine", label: "machine.json", desc: "DPDispatcher 机器配置" },
  { id: "incar", label: "INCAR_fp", desc: "VASP 第一性原理标注参数" },
];

const MACHINE_SEGMENTS: { id: MachineSegment; label: string }[] = [
  { id: "train", label: "train" },
  { id: "model_devi", label: "model_devi" },
  { id: "fp", label: "fp" },
];

// Default param.json from their actual project
const DEFAULT_PARAM = `{
  "type_map": ["Ti", "C"],
  "mass_map": [47.867, 12.011],
  "init_data_prefix": "/home/kobe/TiC_aimd_64/dpgen/init_data_B",
  "init_data_sys": ["bulk_300k", "bulk_600k", "bulk_1000k"],
  "sys_configs_prefix": "/home/kobe/TiC_aimd_64/dpgen/sys_configs",
  "sys_configs": [["bulk_64/POSCAR"]],
  "numb_models": 4,
  "dp_train_skip_neighbor_stat": true,
  "default_training_param": {
    "model": {
      "type_map": ["Ti", "C"],
      "descriptor": {
        "type": "se_e2_a",
        "sel": [25, 25],
        "rcut_smth": 2.5,
        "rcut": 4.0,
        "neuron": [25, 50, 100],
        "resnet_dt": false,
        "axis_neuron": 16
      },
      "fitting_net": {
        "neuron": [160, 128, 96],
        "resnet_dt": true
      }
    },
    "learning_rate": {
      "type": "exp",
      "start_lr": 0.001,
      "stop_lr": 1e-08,
      "decay_steps": 5000
    },
    "loss": {
      "start_pref_e": 0.02,
      "limit_pref_e": 2.0,
      "start_pref_f": 2000,
      "limit_pref_f": 100,
      "start_pref_v": 0,
      "limit_pref_v": 0
    },
    "training": {
      "training_data": { "systems": [], "batch_size": "auto" },
      "numb_steps": 600000,
      "disp_file": "lcurve.out",
      "disp_freq": 800,
      "save_freq": 8000
    }
  },
  "model_devi_engine": "lammps",
  "model_devi_command": "lmp",
  "model_devi_dt": 0.001,
  "model_devi_skip": 0,
  "model_devi_f_trust_lo": 0.10,
  "model_devi_f_trust_hi": 0.35,
  "model_devi_clean_traj": true,
  "model_devi_group_size": 1,
  "model_devi_numb_models": 4,
  "model_devi_jobs": [
    {
      "sys_idx": [0],
      "temps": [300, 600, 1000],
      "press": [1, 1, 1],
      "trj_freq": 10,
      "nsteps": 3000,
      "ensemble": "nvt"
    },
    {
      "sys_idx": [0],
      "temps": [600, 1000],
      "press": [1, 1],
      "trj_freq": 10,
      "nsteps": 3000,
      "ensemble": "nvt"
    }
  ],
  "fp_style": "vasp",
  "shuffle_poscar": false,
  "fp_task_max": 50,
  "fp_task_min": 1,
  "fp_fail_count": 100,
  "fp_pp_path": "/home/kobe/TiC_aimd_64/dpgen",
  "fp_pp_files": ["POTCAR_Ti", "POTCAR_C"],
  "fp_incar": "/home/kobe/TiC_aimd_64/dpgen/INCAR_fp",
  "fp_kspacing": 0.2,
  "fp_kgamma": true
}`;

export default function ConfigBuilderPage() {
  const [activeTab, setActiveTab] = useState<ConfigTab>("param");
  const [machineSegment, setMachineSegment] = useState<MachineSegment>("train");

  // Config content
  const [paramJson, setParamJson] = useState(DEFAULT_PARAM);
  const [machineJson, setMachineJson] = useState(getMachineDefaults("train"));
  const [incarText, setIncarText] = useState(getIncarDefaults());

  // Validation results
  const [validation, setValidation] = useState<{ valid: boolean; message: string } | null>(null);

  // Switch machine segment
  const switchMachineSegment = useCallback((seg: MachineSegment) => {
    setMachineSegment(seg);
    setMachineJson(getMachineDefaults(seg));
    setValidation(null);
  }, []);

  // Validate current tab
  const handleValidate = useCallback(() => {
    if (activeTab === "incar") {
      const result = validateIncar(incarText);
      setValidation({
        valid: result.valid,
        message: result.valid ? "✅ 所有必填参数齐全" : `❌ ${result.errors.join("；")}`,
      });
    } else {
      const json = activeTab === "param" ? paramJson : machineJson;
      try {
        JSON.parse(json);
        setValidation({ valid: true, message: "✅ JSON 格式正确" });
      } catch (e: any) {
        setValidation({ valid: false, message: `❌ JSON 解析错误: ${e.message}` });
      }
    }
  }, [activeTab, paramJson, machineJson, incarText]);

  // Download config
  const handleDownload = useCallback(() => {
    const content = activeTab === "param" ? paramJson : activeTab === "machine" ? machineJson : incarText;
    const filename = activeTab === "param" ? "param.json" : activeTab === "machine" ? "machine.json" : "INCAR_fp";
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeTab, paramJson, machineJson, incarText]);

  // Get schema for current tab
  const getSchema = (): ParamField[] => {
    if (activeTab === "param") return PARAM_SCHEMA;
    if (activeTab === "machine") return MACHINE_SCHEMA[machineSegment] || [];
    if (activeTab === "incar") return INCAR_SCHEMA;
    return [];
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-slate-900">🔧 DP-GEN 配置构建器</h1>
            <p className="mt-1 text-sm text-slate-500">
              编辑 / 校验 / 导出 DP-GEN 工作流配置（适配 v0.13.2 · DeePMD v3.1.3）
            </p>
          </div>

          {/* Tabs */}
          <nav className="-mb-px flex space-x-6">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setValidation(null);
                }}
                className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
                }`}
              >
                <span className="font-mono">{tab.label}</span>
                <span className="ml-2 text-xs text-slate-400">{tab.desc}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Machine segment tabs (only visible when machine tab is active) */}
      {activeTab === "machine" && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-4 py-3">
              <span className="text-xs text-slate-400 self-center">选择段:</span>
              {MACHINE_SEGMENTS.map((seg) => (
                <button
                  key={seg.id}
                  onClick={() => switchMachineSegment(seg.id)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    machineSegment === seg.id
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  <code>{seg.label}</code>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Editor */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6">
          {activeTab === "param" && (
            <CodeEditor
              value={paramJson}
              onChange={setParamJson}
              schema={PARAM_SCHEMA}
              language="json"
              title="param.json — DP-GEN 工作流参数"
            />
          )}
          {activeTab === "machine" && (
            <CodeEditor
              value={machineJson}
              onChange={setMachineJson}
              schema={MACHINE_SCHEMA[machineSegment] || []}
              language="json"
              title={`machine.json — ${machineSegment} 段配置`}
            />
          )}
          {activeTab === "incar" && (
            <CodeEditor
              value={incarText}
              onChange={setIncarText}
              schema={INCAR_SCHEMA}
              language="incar"
              title="INCAR_fp — VASP 第一性原理标注"
            />
          )}
        </div>

        {/* Bottom bar: Validate + Download */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={handleValidate}
              className="px-4 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
            >
              ✓ 校验
            </button>
            {validation && (
              <span
                className={`text-sm ${validation.valid ? "text-green-600" : "text-red-500"}`}
              >
                {validation.message}
              </span>
            )}
          </div>
          <button
            onClick={handleDownload}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ⬇ 导出{" "}
            {activeTab === "param"
              ? "param.json"
              : activeTab === "machine"
              ? "machine.json"
              : "INCAR_fp"}
          </button>
        </div>

        {/* Tips */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <h4 className="text-xs font-semibold text-blue-700 mb-1">💡 使用提示</h4>
          <ul className="text-xs text-blue-600 space-y-0.5">
            <li>• 选中左侧 JSON 中的参数名称 → 右侧自动显示其文档说明</li>
            <li>• 右侧搜索框可直接搜索参数名或关键词</li>
            <li>• 编辑后点击"校验"检查格式，确认无误后点"导出"下载</li>
            <li>• 导出的配置文件直接覆盖到 <code className="bg-blue-100 px-1 rounded">~/TiC_aimd_64/dpgen/</code> 即可使用</li>
            {activeTab === "machine" && (
              <li>• machine.json 有三个段（train / model_devi / fp），需分别编辑</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
