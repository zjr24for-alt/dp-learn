import type { Article } from "./types";

const DB_NAME = "dp-learn-user-content";
const DB_VERSION = 1;
const STORE_NAME = "user-articles";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is not available on the server"));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "slug" });
        store.createIndex("category", "category", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function generateSlug(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `user-${ts}-${rand}`;
}

/** 获取全部用户文章 */
export async function getAllUserArticles(): Promise<Article[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const articles = (request.result as Article[]).sort(
          (a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")
        );
        resolve(articles);
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/** 按 slug 获取单篇用户文章 */
export async function getUserArticle(slug: string): Promise<Article | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(slug);
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

/** 保存用户文章（新建或更新） */
export async function saveUserArticle(
  article: Omit<Article, "slug" | "isUserArticle" | "createdAt" | "updatedAt"> & {
    slug?: string;
    createdAt?: string;
  }
): Promise<Article> {
  const now = new Date().toISOString();
  const fullArticle: Article = {
    ...article,
    slug: article.slug || generateSlug(),
    isUserArticle: true,
    createdAt: article.createdAt || now,
    updatedAt: now,
  };

  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(fullArticle);
    request.onsuccess = () => resolve(fullArticle);
    request.onerror = () => reject(request.error);
  });
}

/** 删除用户文章 */
export async function deleteUserArticle(slug: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(slug);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
