import type { IbexSdkStorage } from "./types";

class LocalStorageAdapter implements IbexSdkStorage {
  get(key: string): string | null {
    if (typeof window === "undefined") return null;
    return window.localStorage.getItem(key);
  }

  set(key: string, value: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  }

  remove(key: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  }

  keys(): string[] {
    if (typeof window === "undefined") return [];
    const out: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key) out.push(key);
    }
    return out;
  }
}

export const browserStorage = new LocalStorageAdapter();
