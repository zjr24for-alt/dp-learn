// 论文阅读列表（存 localStorage，纯函数，需在客户端调用）
const STORAGE_KEY = "dp-learn-reading-list";

export interface ReadingListItem {
  id: string;
  title: string;
  addedAt: string;
  read: boolean;
  notes?: string;
}

export function getReadingList(): ReadingListItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function addToReadingList(paper: { id: string; title: string }): void {
  const list = getReadingList();
  if (!list.find((p) => p.id === paper.id)) {
    list.push({
      id: paper.id,
      title: paper.title,
      addedAt: new Date().toISOString(),
      read: false,
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

export function removeFromReadingList(id: string): void {
  let list = getReadingList();
  list = list.filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function toggleRead(id: string): boolean {
  const list = getReadingList();
  const item = list.find((p) => p.id === id);
  if (item) {
    item.read = !item.read;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return item.read;
  }
  return false;
}

export function isInReadingList(id: string): boolean {
  return getReadingList().some((p) => p.id === id);
}
