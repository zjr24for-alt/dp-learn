"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/**
 * 是否已完成水合（SSR 时为 false，客户端挂载后为 true）。
 * 用于安全读取 localStorage / IndexedDB，避免 SSR 与客户端渲染不一致。
 * 替代 useEffect + setState 的挂载检测（不触发 react-hooks/set-state-in-effect）。
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
