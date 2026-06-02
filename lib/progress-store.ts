import type { ProgressEntry } from "./types";

const STORAGE_KEY = "dp-learn-progress";

export function getAllProgress(): Record<string, ProgressEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getProgress(slug: string): ProgressEntry | null {
  const all = getAllProgress();
  return all[slug] ?? null;
}

export function toggleProgress(slug: string): ProgressEntry {
  const all = getAllProgress();
  const existing = all[slug];

  if (existing?.completed) {
    delete all[slug];
  } else {
    all[slug] = {
      slug,
      completed: true,
      completedAt: new Date().toISOString(),
    };
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return all[slug] ?? { slug, completed: false };
}

export function markCompleted(slug: string): void {
  const all = getAllProgress();
  all[slug] = {
    slug,
    completed: true,
    completedAt: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function markUncompleted(slug: string): void {
  const all = getAllProgress();
  delete all[slug];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export function getCategoryProgress(
  slugs: string[]
): { completed: number; total: number; percent: number } {
  const all = getAllProgress();
  const total = slugs.length;
  const completed = slugs.filter((s) => all[s]?.completed).length;
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

export function resetAllProgress(): void {
  localStorage.removeItem(STORAGE_KEY);
}
