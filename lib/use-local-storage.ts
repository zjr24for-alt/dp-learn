"use client";

import { useCallback, useSyncExternalStore } from "react";

interface Store<T> {
  value: T;
  listeners: Set<() => void>;
}

// 模块级缓存：每个 key 一个 store，getSnapshot 返回稳定引用，避免死循环
const stores = new Map<string, Store<unknown>>();

function getStore<T>(key: string, initial: T): Store<T> {
  let store = stores.get(key) as Store<T> | undefined;
  if (!store) {
    store = { value: initial, listeners: new Set() };
    stores.set(key, store as Store<unknown>);
    // 首次在客户端创建时从 localStorage 加载（SSR 阶段 window 不存在则跳过）
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw !== null) store.value = JSON.parse(raw) as T;
      } catch {
        /* ignore */
      }
    }
  }
  return store;
}

/**
 * 与 localStorage 同步的 React 状态。
 * - 水合安全：SSR / 水合首帧返回 initial，水合后自动读取持久化值
 * - 不触发 react-hooks/set-state-in-effect（写入发生在事件回调里）
 * - store 在闭包内获取，不把可变对象传给 hook（react-hooks/immutability 友好）
 */
export function useLocalStorage<T>(key: string, initial: T): [T, (value: T) => void] {
  const value = useSyncExternalStore(
    (cb) => {
      const store = getStore(key, initial);
      store.listeners.add(cb);
      return () => {
        store.listeners.delete(cb);
      };
    },
    () => getStore(key, initial).value,
    () => initial
  );

  const set = useCallback(
    (v: T) => {
      const store = getStore(key, initial);
      store.value = v;
      try {
        window.localStorage.setItem(key, JSON.stringify(v));
      } catch {
        /* ignore */
      }
      store.listeners.forEach((l) => l());
    },
    [key, initial]
  );

  return [value, set];
}
