"use client";

import { useState, useCallback } from "react";
import { CodeEditor } from "@/components/config-builder/code-editor";
import { ValidationPanel, type ValidationGroup } from "@/components/config-builder/validation-panel";
import { AiAssist, type AiAssistMode, type ExtractKind } from "@/components/config-builder/ai-assist";
import {
  PARAM_SCHEMA,
  MACHINE_SCHEMA,
  getMachineDefaults,
  INCAR_SCHEMA,
  getIncarDefaults,
  validateParamJson,
  validateMachineSegment,
  validateIncarDeep,
  validateLammps,
  validateSubmitScript,
  runCrossChecks,
  buildParamPrompt,
  buildMachinePrompt,
  buildIncarPrompt,
  buildLammpsPrompt,
  buildSubmitPrompt,
} from "@/lib/dpgen-config";
import type { MachineSegment } from "@/lib/dpgen-config";

type ConfigTab = "param" | "machine" | "incar" | "scripts";
type ScriptTab = "lammps" | "submit";

const TABS: { id: ConfigTab; label: string; desc: string }[] = [
  { id: "param", label: "param.json", desc: "DP-GEN 工作流参数" },
  { id: "machine", label: "machine.json", desc: "DPDispatcher 机器配置" },
  { id: "incar", label: "INCAR_fp", desc: "VASP 第一性原理标注参数" },
  { id: "scripts", label: "其他脚本", desc: "LAMMPS / 提交脚本检查" },
];

const MACHINE_SEGMENTS: { id: MachineSegment; label: string }[] = [
  { id: "train", label: "train" },
  { id: "model_devi", label: "model_devi" },
  { id: "fp", label: "fp" },
];

const SCRIPT_TABS: { id: ScriptTab; label: string; desc: string }[] = [
  { id: "lammps", label: "in.lammps", desc: "LAMMPS 输入脚本" },
  { id: "submit", label: "job.pbs", desc: "作业提交脚本" },
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
  const [scriptTab, setScriptTab] = useState<ScriptTab>("lammps");

  // Config content（machine 三段分别保存，避免切段丢内容）
  const [paramJson, setParamJson] = useState(DEFAULT_PARAM);
  const [machineJsons, setMachineJsons] = useState<Record<MachineSegment, string>>({
    train: getMachineDefaults("train"),
    model_devi: getMachineDefaults("model_devi"),
    fp: getMachineDefaults("fp"),
  });
  const [incarText, setIncarText] = useState(getIncarDefaults());
  const [lammpsText, setLammpsText] = useState("");
  const [submitText, setSubmitText] = useState("");

  // Validation report
  const [report, setReport] = useState<ValidationGroup[] | null>(null);

  // AI assist modal
  const [assistOpen, setAssistOpen] = useState(false);
  const [assistMode, setAssistMode] = useState<AiAssistMode>("prompt");
  const [toast, setToast] = useState<{ ok: boolean; msg: string } | null>(null);

  // Switch machine segment（不重置内容）
  const switchMachineSegment = useCallback((seg: MachineSegment) => {
    setMachineSegment(seg);
    setReport(null);
  }, []);

  // 校验当前 Tab
  const handleValidate = useCallback(() => {
    let group: ValidationGroup;
    if (activeTab === "param") {
      group = { id: "param", file: "param.json", result: validateParamJson(paramJson) };
    } else if (activeTab === "machine") {
      group = {
        id: "machine",
        file: "machine.json",
        label: machineSegment,
        result: validateMachineSegment(machineJsons[machineSegment], machineSegment),
      };
    } else if (activeTab === "incar") {
      group = { id: "incar", file: "INCAR_fp", result: validateIncarDeep(incarText) };
    } else if (scriptTab === "lammps") {
      group = { id: "lammps", file: "in.lammps", result: validateLammps(lammpsText) };
    } else {
      group = { id: "submit", file: "job.pbs", result: validateSubmitScript(submitText) };
    }
    setReport([group]);
  }, [activeTab, paramJson, machineJsons, machineSegment, incarText, lammpsText, submitText, scriptTab]);

  // 一键检查全部配置
  const handleValidateAll = useCallback(() => {
    const groups: ValidationGroup[] = [
      { id: "param", file: "param.json", result: validateParamJson(paramJson) },
      { id: "train", file: "machine.json", label: "train", result: validateMachineSegment(machineJsons.train, "train") },
      { id: "model_devi", file: "machine.json", label: "model_devi", result: validateMachineSegment(machineJsons.model_devi, "model_devi") },
      { id: "fp", file: "machine.json", label: "fp", result: validateMachineSegment(machineJsons.fp, "fp") },
      { id: "incar", file: "INCAR_fp", result: validateIncarDeep(incarText) },
      lammpsText.trim() === ""
        ? { id: "lammps", file: "in.lammps", skipped: true }
        : { id: "lammps", file: "in.lammps", result: validateLammps(lammpsText) },
      submitText.trim() === ""
        ? { id: "submit", file: "作业提交脚本", skipped: true }
        : { id: "submit", file: "作业提交脚本", result: validateSubmitScript(submitText) },
      {
        id: "cross",
        file: "跨配置一致性",
        result: runCrossChecks({ paramJson, machineJsonBySegment: machineJsons, incarText }),
      },
    ];
    setReport(groups);
  }, [paramJson, machineJsons, incarText, lammpsText, submitText]);

  // 导出当前配置
  const handleDownload = useCallback(() => {
    let content: string;
    let filename: string;
    if (activeTab === "param") {
      content = paramJson;
      filename = "param.json";
    } else if (activeTab === "machine") {
      content = machineJsons[machineSegment];
      filename = "machine.json";
    } else if (activeTab === "incar") {
      content = incarText;
      filename = "INCAR_fp";
    } else if (scriptTab === "lammps") {
      content = lammpsText;
      filename = "in.lammps";
    } else {
      content = submitText;
      filename = "job.pbs";
    }
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeTab, paramJson, machineJsons, machineSegment, incarText, lammpsText, submitText, scriptTab]);

  const getExtractKind = (): ExtractKind => {
    if (activeTab === "incar") return "incar";
    if (activeTab === "scripts") return "text";
    return "json";
  };

  const getAssistTitle = () => {
    const base =
      activeTab === "param"
        ? "param.json"
        : activeTab === "machine"
        ? `machine.json · ${machineSegment}`
        : activeTab === "incar"
        ? "INCAR_fp"
        : scriptTab === "lammps"
        ? "in.lammps"
        : "job.pbs";
    return `${base} — ${assistMode === "prompt" ? "AI 提示词" : "回贴答案解析"}`;
  };

  const buildPrompt = useCallback((): string => {
    if (activeTab === "param") return buildParamPrompt(paramJson);
    if (activeTab === "machine") return buildMachinePrompt(machineSegment, machineJsons[machineSegment]);
    if (activeTab === "incar") return buildIncarPrompt(incarText);
    return scriptTab === "lammps" ? buildLammpsPrompt(lammpsText) : buildSubmitPrompt(submitText);
  }, [activeTab, paramJson, machineJsons, machineSegment, incarText, lammpsText, submitText, scriptTab]);

  const openAssist = useCallback((mode: AiAssistMode) => {
    setAssistMode(mode);
    setAssistOpen(true);
  }, []);

  const handleAssistFill = useCallback(
    (value: string, ok: boolean, message: string) => {
      if (!ok) return; // 失败时留在模态里显示错误
      if (activeTab === "param") setParamJson(value);
      else if (activeTab === "machine") {
        setMachineJsons((prev) => ({ ...prev, [machineSegment]: value }));
      } else if (activeTab === "incar") setIncarText(value);
      else if (scriptTab === "lammps") setLammpsText(value);
      else setSubmitText(value);
      setAssistOpen(false);
      setToast({ ok: true, msg: message });
      window.setTimeout(() => setToast(null), 3000);
    },
    [activeTab, machineSegment, scriptTab]
  );

  const downloadFilename =
    activeTab === "param"
      ? "param.json"
      : activeTab === "machine"
      ? "machine.json"
      : activeTab === "incar"
      ? "INCAR_fp"
      : scriptTab === "lammps"
      ? "in.lammps"
      : "job.pbs";

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
                  setReport(null);
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

      {/* Scripts subtabs */}
      {activeTab === "scripts" && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-4 py-3">
              <span className="text-xs text-slate-400 self-center">脚本类型:</span>
              {SCRIPT_TABS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    setScriptTab(s.id);
                    setReport(null);
                  }}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    scriptTab === s.id
                      ? "bg-blue-100 text-blue-700"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  <code>{s.label}</code>
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
              value={machineJsons[machineSegment]}
              onChange={(v) => setMachineJsons((prev) => ({ ...prev, [machineSegment]: v }))}
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
          {activeTab === "scripts" && scriptTab === "lammps" && (
            <CodeEditor
              value={lammpsText}
              onChange={setLammpsText}
              schema={[]}
              language="text"
              title="in.lammps — LAMMPS 输入脚本"
            />
          )}
          {activeTab === "scripts" && scriptTab === "submit" && (
            <CodeEditor
              value={submitText}
              onChange={setSubmitText}
              schema={[]}
              language="text"
              title="job.pbs — 作业提交脚本"
            />
          )}
        </div>

        {/* Bottom bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleValidate}
              className="px-4 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
            >
              ✓ 校验
            </button>
            <button
              onClick={handleValidateAll}
              className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              ⚡ 一键检查全部
            </button>
            <button
              onClick={() => openAssist("prompt")}
              className="px-4 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
            >
              🤖 AI 提示词
            </button>
            <button
              onClick={() => openAssist("paste")}
              className="px-4 py-2 text-sm font-medium bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 transition-colors"
            >
              📥 回贴答案
            </button>
            {toast && <span className={`text-sm ${toast.ok ? "text-green-600" : "text-red-500"}`}>{toast.msg}</span>}
          </div>
          <button
            onClick={handleDownload}
            className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            ⬇ 导出 {downloadFilename}
          </button>
        </div>

        {/* Validation report */}
        {report && <ValidationPanel groups={report} />}

        {/* Tips */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <h4 className="text-xs font-semibold text-blue-700 mb-1">💡 使用提示</h4>
          <ul className="text-xs text-blue-600 space-y-0.5">
            <li>• 选中左侧 JSON 中的参数名称 → 右侧自动显示其文档说明</li>
            <li>• 「✓ 校验」深度检查当前配置的语义问题；「⚡ 一键检查全部」检查 param + machine 三段 + INCAR + 跨配置一致性</li>
            <li>
              • 「🤖 AI 提示词」生成提问提示词，复制到 matchat 问标准参数（文献/官方文档）；AI 返回后「📥 回贴答案」
              粘贴回来自动解析填入
            </li>
            <li>• 确认无误后点「⬇ 导出」下载，直接覆盖到 <code className="bg-blue-100 px-1 rounded">~/TiC_aimd_64/dpgen/</code> 即可使用</li>
            {activeTab === "machine" && <li>• machine.json 有三个段（train / model_devi / fp），需分别编辑，切段不会丢内容</li>}
            {activeTab === "scripts" && <li>• 两个脚本框默认为空，「一键检查全部」会自动跳过未填写项</li>}
          </ul>
        </div>
      </div>

      {/* AI Assist modal */}
      <AiAssist
        open={assistOpen}
        onClose={() => setAssistOpen(false)}
        mode={assistMode}
        title={getAssistTitle()}
        prompt={buildPrompt()}
        extractKind={getExtractKind()}
        onFill={handleAssistFill}
      />
    </div>
  );
}
