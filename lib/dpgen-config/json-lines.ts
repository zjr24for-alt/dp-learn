/**
 * JSON 路径 → 行号 索引。
 *
 * 用法：`createJsonLineIndex(jsonText)` 返回一个 `(path) => line?` 解析器，
 * 把形如 `model_devi_jobs[0].sys_idx` / `[0].machine.local_root` 的 JSON 路径
 * 映射到源文本的 1-based 行号（首次出现的位置）。
 *
 * 实现是递归下降解析（镜像 JSON 结构）：遇到对象键/数组元素时登记其完整路径。
 * 因为调用前 `JSON.parse` 已成功，可假设语法合法；任何异常都兜底为
 * `() => undefined`（问题退化为无行号）。
 *
 * 注意：重复键 JSON.parse 取最后一个值、这里记录首次出现的行（跳转可能略偏）；
 * minified 单行 JSON 全部映射到第 1 行——均为可接受的退化。
 */

export type JsonLineResolver = (path: string) => number | undefined;

export function createJsonLineIndex(jsonText: string): JsonLineResolver {
  const lineOf = new Map<string, number>();
  try {
    const n = jsonText.length;
    let i = 0;
    let line = 1;

    const record = (path: string) => {
      if (path && !lineOf.has(path)) lineOf.set(path, line);
    };

    /** 跳过空白/换行，推进 i 与 line，停在下一个结构字符 */
    const skipWs = () => {
      while (i < n) {
        const c = jsonText[i];
        if (c === "\n") {
          line++;
          i++;
        } else if (c === " " || c === "\t" || c === "\r") {
          i++;
        } else {
          break;
        }
      }
    };

    /** 读取一个 JSON 字符串字面量，返回内容（含转义；跨行字符串容错计数） */
    const readString = (): string => {
      i++; // 跳过开引号
      let s = "";
      while (i < n) {
        const c = jsonText[i];
        if (c === "\\") {
          s += c;
          s += jsonText[i + 1] ?? "";
          if (jsonText[i + 1] === "\n") line++;
          i += 2;
        } else if (c === "\n") {
          // 容错：非法但出现的跨行字符串
          line++;
          s += c;
          i++;
        } else if (c === '"') {
          i++;
          break;
        } else {
          s += c;
          i++;
        }
      }
      return s;
    };

    /** 跳过数字 / true / false / null 等标量字面量（不含空白与结构分隔符） */
    const skipScalar = () => {
      while (i < n) {
        const c = jsonText[i];
        if (c === " " || c === "\t" || c === "\r" || c === "\n" || c === "," || c === "}" || c === "]") break;
        i++;
      }
    };

    const parseValue = (path: string) => {
      skipWs();
      if (i >= n) return;
      const ch = jsonText[i];
      if (ch === '"') readString();
      else if (ch === "{") parseObject(path);
      else if (ch === "[") parseArray(path);
      else skipScalar();
    };

    const parseObject = (path: string) => {
      i++; // 跳过 {
      skipWs();
      if (jsonText[i] === "}") {
        i++;
        return;
      }
      while (i < n) {
        skipWs();
        if (jsonText[i] === "}") {
          i++;
          break;
        }
        const key = readString();
        skipWs();
        if (jsonText[i] === ":") i++;
        const childPath = path ? `${path}.${key}` : key;
        record(childPath);
        parseValue(childPath);
        skipWs();
        if (jsonText[i] === ",") {
          i++;
          continue;
        }
        if (jsonText[i] === "}") {
          i++;
          break;
        }
      }
    };

    const parseArray = (path: string) => {
      i++; // 跳过 [
      skipWs();
      if (jsonText[i] === "]") {
        i++;
        return;
      }
      let idx = 0;
      while (i < n) {
        const elemPath = `${path}[${idx}]`;
        record(elemPath);
        parseValue(elemPath);
        skipWs();
        if (jsonText[i] === ",") {
          i++;
          idx++;
          continue;
        }
        if (jsonText[i] === "]") {
          i++;
          break;
        }
      }
    };

    skipWs();
    parseValue(""); // 根：param 为对象、machine 为数组
  } catch {
    /* 解析异常：返回空索引，问题退化为无行号 */
  }
  return (path: string) => lineOf.get(path);
}
