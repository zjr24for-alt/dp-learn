import type { Article } from "@/lib/types";

export const linuxTipsArticles: Article[] = [
  {
    slug: "grep-find-cheatsheet",
    title: "grep 和 find 用法速查",
    category: "linux-tips",
    summary: "最常用的文件内容搜索和文件名查找命令合集，含 ripgrep 和 pdfgrep",
    content: `# grep 和 find 用法速查

## 一、在文件内容中查找关键词

| 场景 | 命令 | 说明 |
|------|------|------|
| 在单个文件中搜索 | \`grep "关键词" 文件名\` | 最基础用法 |
| 忽略大小写 | \`grep -i "关键词" 文件名\` | Error 匹配 error |
| 显示行号 | \`grep -n "关键词" 文件名\` | 方便定位 |
| 递归搜索整个目录 | \`grep -r "关键词" 目录/\` | 搜索所有子目录 |
| 只列出文件名 | \`grep -l "关键词" *.txt\` | 不显示匹配内容 |
| 极速搜索 | \`rg "关键词"\` | ripgrep：默认递归、自动忽略 .gitignore |
| 面向代码搜索 | \`ag "关键词"\` 或 \`ack "关键词"\` | 跳过备份文件、二进制文件 |
| 搜索 PDF | \`pdfgrep "关键词" 文档.pdf\` | 需安装 pdfgrep |
| 搜索 Word | 先转文本再 grep | \`libreoffice --headless --convert-to txt 文档.docx\` |

## 二、按文件名称查找文件

| 场景 | 命令 | 说明 |
|------|------|------|
| 精确查找 | \`find /路径 -name "文件名"\` | 递归查找 |
| 通配符模糊查找 | \`find . -name "*.conf"\` | 所有 .conf 结尾 |
| 忽略大小写 | \`find . -iname "readme.txt"\` | 匹配 README.txt 等 |
| 只查找普通文件 | \`find . -type f -name "*.log"\` | -type f 排除目录 |
| 查找并搜索内容 | \`find . -name "*.html" -exec grep -l "关键词" {} \\;\` | 组合使用 |
`,
    tags: ["linux", "grep", "find", "搜索", "ripgrep"],
    sourceFiles: ["grep和find的用法.md"],
  },
  {
    slug: "tar-cheatsheet",
    title: "tar 打包解压速查",
    category: "linux-tips",
    summary: "tar 最常用命令：创建/解压/查看 .tar/.tar.gz/.tar.bz2/.tar.xz",
    content: `# tar 打包解压速查

## 最简记忆法

| 字母 | 含义 |
|------|------|
| c | 压包 (create) |
| x | 解包 (extract) |
| t | 看内容 |
| v | 显示过程 (verbose) |
| f | 后面跟文件名 (file) |
| z | gzip 压缩 |
| j | bzip2 压缩 |
| J | xz 压缩（大写） |

## 最该记住的 6 条

\`\`\`bash
tar -cvf a.tar dir/           # 创建 .tar
tar -xvf a.tar                # 解压 .tar
tar -czvf a.tar.gz dir/       # 创建 .tar.gz
tar -xzvf a.tar.gz            # 解压 .tar.gz
tar -cJvf a.tar.xz dir/       # 创建 .tar.xz
tar -xJvf a.tar.xz            # 解压 .tar.xz
\`\`\`

## 查看内容（不解压）

\`\`\`bash
tar -tvf a.tar                # 查看 .tar
tar -tzvf a.tar.gz            # 查看 .tar.gz
tar -tjvf a.tar.bz2           # 查看 .tar.bz2
tar -tJvf a.tar.xz            # 查看 .tar.xz
\`\`\`

## 常用补充

\`\`\`bash
tar -xvf a.tar -C /path/to/dir    # 解压到指定目录
tar -czvf a.tar.gz dir/ --exclude="*.log"  # 排除某些文件
tar -xvf a.tar --strip-components=1        # 去掉最外层目录
\`\`\`
`,
    tags: ["linux", "tar", "压缩", "解压"],
    sourceFiles: ["tar速查.txt"],
  },
];
