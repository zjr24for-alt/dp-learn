import type { ParamField } from "./param-schema";

export const MACHINE_SCHEMA: Record<string, ParamField[]> = {
  train: [
    {
      key: "batch_type",
      label: "调度类型",
      type: "string",
      default: "shell",
      description: "任务调度后端：shell（本地直接执行）、Slurm、Torque/PBS 等",
      required: true,
      enum: ["shell", "Slurm", "Torque", "PBS", "LSF", "Bohrium"],
    },
    {
      key: "context_type",
      label: "上下文类型",
      type: "string",
      default: "local",
      description: "任务执行上下文：local（本地）、SSH（远程）、Bohrium 等",
      required: true,
      enum: ["local", "SSHContext", "LazyLocalContext", "BohriumContext"],
    },
    {
      key: "local_root",
      label: "本地根目录",
      type: "string",
      default: "./",
      description: "DPDispatcher 查找任务目录和本地文件的根路径",
      required: true,
    },
    {
      key: "remote_root",
      label: "远程根目录",
      type: "string",
      default: "-",
      description: "远程机器的工作根目录，SSH 模式下需为绝对路径",
      required: false,
    },
    {
      key: "remote_profile",
      label: "远程连接配置",
      type: "object",
      default: "-",
      description: "远程机器的连接信息（SSHContext 下需提供 hostname, username, key_filename 等）",
      required: false,
      children: [
        { key: "remote_profile.hostname", label: "主机地址", type: "string", default: "-", description: "远程机器的 IP 或主机名", required: false },
        { key: "remote_profile.port", label: "端口", type: "number", default: "22", description: "SSH 端口，默认 22", required: false },
        { key: "remote_profile.username", label: "用户名", type: "string", default: "-", description: "登录远程机器的用户名", required: false },
        { key: "remote_profile.key_filename", label: "SSH 密钥路径", type: "string", default: "-", description: "SSH 私钥文件路径", required: false },
        { key: "remote_profile.execute_command", label: "连接后执行命令", type: "string", default: "-", description: "SSH 连接建立后立即执行的初始化命令（如加载环境变量）", required: false },
      ],
    },
    {
      key: "resources",
      label: "计算资源",
      type: "object",
      default: "-",
      description: "任务计算资源配置",
      required: true,
      children: [
        { key: "resources.number_node", label: "节点数", type: "number", default: "1", description: "每个调度任务申请的节点数", required: true },
        { key: "resources.cpu_per_node", label: "每节点 CPU 核数", type: "number", default: "4", description: "每个节点申请的 CPU 核数", required: true },
        { key: "resources.gpu_per_node", label: "每节点 GPU 数", type: "number", default: "0", description: "每个节点申请的 GPU 数量", required: true },
        { key: "resources.queue_name", label: "队列名", type: "string", default: "", description: "批处理系统的队列或分区名", required: true },
        { key: "resources.group_size", label: "组大小", type: "number", default: "1 (train:4, fp:17)", description: "每个调度任务打包的子任务数。train 段通常=numb_models，fp 段视资源定", required: true },
        { key: "resources.custom_flags", label: "自定义调度头", type: "string[]", default: "-", description: "额外插入的调度系统头行（如 walltime 等，仅远程场景需要）", required: false },
        { key: "resources.source_list", label: "Source 脚本", type: "string[]", default: "[]", description: "任务执行前 source 的环境脚本列表", required: false },
        { key: "resources.module_list", label: "Module 列表", type: "string[]", default: "[]", description: "任务前加载的 module 列表", required: false },
        { key: "resources.envs", label: "环境变量", type: "object", default: "{}", description: "任务前导出的环境变量键值对", required: false },
        { key: "resources.prepend_script", label: "前置脚本", type: "string[]", default: "[]", description: "任务命令前插入的 shell 行", required: false },
        { key: "resources.append_script", label: "后置脚本", type: "string[]", default: "[]", description: "任务命令后插入的 shell 行", required: false },
      ],
    },
    {
      key: "command",
      label: "执行命令",
      type: "string",
      default: "-",
      description: "运行计算的命令行。train 段: dp_wrapper；model_devi 段: lmp；fp 段: mpirun vasp 等",
      required: true,
    },
  ],
  model_devi: [
    {
      key: "batch_type",
      label: "调度类型",
      type: "string", default: "shell", description: "task 调度后端", required: true, enum: ["shell", "Slurm", "Torque"],
    },
    {
      key: "context_type",
      label: "上下文类型", type: "string", default: "local", description: "执行上下文", required: true, enum: ["local", "SSHContext"],
    },
    {
      key: "local_root", label: "本地根目录", type: "string", default: "./", description: "本地工作根目录", required: true,
    },
    {
      key: "remote_root", label: "远程根目录", type: "string", default: "/home/kobe/dpgen_work", description: "远程工作目录", required: false,
    },
    {
      key: "resources",
      label: "计算资源",
      type: "object", default: "-", description: "model_devi 资源需求",
      required: true,
      children: [
        { key: "resources.number_node", label: "节点数", type: "number", default: "1", description: "节点数", required: true },
        { key: "resources.cpu_per_node", label: "每节点 CPU", type: "number", default: "8", description: "model_devi 用 CPU 跑，通常 4~8 核", required: true },
        { key: "resources.gpu_per_node", label: "每节点 GPU", type: "number", default: "0", description: "model_devi 不用 GPU", required: true },
        { key: "resources.queue_name", label: "队列名", type: "string", default: "local", description: "队列名", required: true },
        { key: "resources.group_size", label: "组大小", type: "number", default: "4", description: "每组并行任务数", required: true },
      ],
    },
    {
      key: "command", label: "LAMMPS 命令", type: "string", default: "/home/kobe/miniconda3/envs/deepmd/bin/lmp", description: "LAMMPS 可执行文件路径", required: true,
    },
  ],
  fp: [
    {
      key: "batch_type",
      label: "调度类型",
      type: "string", default: "Torque", description: "超算调度系统类型", required: true, enum: ["Torque", "PBS", "Slurm", "shell"],
    },
    {
      key: "context_type",
      label: "上下文类型", type: "string", default: "SSHContext", description: "SSH 或本地执行", required: true, enum: ["SSHContext", "local", "LazyLocalContext"],
    },
    {
      key: "local_root", label: "本地根目录", type: "string", default: "./", description: "本地工作根目录", required: true,
    },
    {
      key: "remote_root", label: "远程根目录", type: "string", default: "-", description: "超算上的远程工作根目录", required: true,
    },
    {
      key: "remote_profile",
      label: "远程连接配置",
      type: "object", default: "-", description: "SSH 连接超算的信息",
      required: true,
      children: [
        { key: "remote_profile.hostname", label: "主机地址", type: "string", default: "10.157.197.40", description: "超算登录节点 IP", required: true },
        { key: "remote_profile.port", label: "端口", type: "number", default: "22", description: "SSH 端口", required: false },
        { key: "remote_profile.username", label: "用户名", type: "string", default: "student2025", description: "超算账号", required: true },
        { key: "remote_profile.key_filename", label: "密钥路径", type: "string", default: "/home/kobe/.ssh/id_rsa", description: "SSH 私钥路径", required: false },
        { key: "remote_profile.execute_command", label: "初始化命令", type: "string", default: "-", description: "SSH 连接后执行的初始化命令（加载环境变量等）", required: false },
      ],
    },
    {
      key: "resources",
      label: "FP 计算资源",
      type: "object", default: "-", description: "VASP 计算资源配置",
      required: true,
      children: [
        { key: "resources.number_node", label: "节点数", type: "number", default: "1", description: "节点数", required: true },
        { key: "resources.cpu_per_node", label: "每节点 CPU", type: "number", default: "52", description: "超算单节点 CPU 核数", required: true },
        { key: "resources.gpu_per_node", label: "每节点 GPU", type: "number", default: "0", description: "VASP 不用 GPU", required: true },
        { key: "resources.queue_name", label: "队列名", type: "string", default: "batch", description: "PBS 队列名", required: true },
        { key: "resources.group_size", label: "组大小", type: "number", default: "17", description: "每个 PBS 作业包多少个 VASP 任务", required: true },
        { key: "resources.custom_flags", label: "自定义调度头", type: "string[]", default: '["#PBS -l walltime=85:00:00"]', description: "PBS 额外头行（walltime, -V 等）", required: false },
      ],
    },
    {
      key: "command", label: "VASP 执行命令", type: "string", default: "mpirun vasp_std > vasp.out", description: "VASP 执行命令，含 mpirun 参数", required: true,
    },
  ],
};

export function getMachineDefaults(segment: string): string {
  if (segment === "train") {
    return JSON.stringify([{
      machine: {
        batch_type: "shell",
        context_type: "local",
        local_root: "./",
        remote_root: "/home/kobe/dpgen_work",
      },
      resources: {
        number_node: 1,
        cpu_per_node: 4,
        gpu_per_node: 1,
        queue_name: "local",
        group_size: 4,
      },
      command: "/home/kobe/miniconda3/envs/deepmd3/bin/dp_wrapper",
    }], null, 2);
  }
  if (segment === "model_devi") {
    return JSON.stringify([{
      machine: {
        batch_type: "shell",
        context_type: "local",
        local_root: "./",
        remote_root: "/home/kobe/dpgen_work",
      },
      resources: {
        number_node: 1,
        cpu_per_node: 8,
        gpu_per_node: 0,
        queue_name: "local",
        group_size: 4,
      },
      command: "/home/kobe/miniconda3/envs/deepmd/bin/lmp",
    }], null, 2);
  }
  if (segment === "fp") {
    return JSON.stringify([{
      machine: {
        batch_type: "Torque",
        context_type: "SSHContext",
        local_root: "./",
        remote_root: "/public/home/student2025/zhuangjingrun/TiC_aimd_64/dpgen",
        remote_profile: {
          hostname: "10.157.197.40",
          port: 22,
          username: "student2025",
          key_filename: "/home/kobe/.ssh/id_rsa",
        },
      },
      resources: {
        number_node: 1,
        cpu_per_node: 52,
        gpu_per_node: 0,
        queue_name: "batch",
        group_size: 17,
        custom_flags: [
          "#PBS -l nodes=1:ppn=52",
          "#PBS -l walltime=85:00:00",
          "#PBS -V",
          "#PBS -S /bin/bash",
        ],
      },
      command: 'NP=$(wc -l < $PBS_NODEFILE) && source /public/software/intel2020u2/intel2020u2_env.sh && mpirun -machinefile $PBS_NODEFILE -np $NP /public/software/vasp.5.4.4/bin/vasp_std > vasp.out',
    }], null, 2);
  }
  return "[]";
}
