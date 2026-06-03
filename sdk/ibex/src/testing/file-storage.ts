/**
 * File-based IbexSdkStorage for Node.js environments.
 * Persists session data (tokens, externalUserId) to a JSON file
 * instead of relying on window.localStorage.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import type { IbexSdkStorage } from "../types";

export class FileStorage implements IbexSdkStorage {
  private data: Record<string, string>;
  private readonly filePath: string;

  constructor(filePath?: string) {
    this.filePath =
      filePath ?? path.resolve(process.cwd(), "tmp", "ibex_session.json");
    this.data = this.load();
  }

  get(key: string): string | null {
    return this.data[key] ?? null;
  }

  set(key: string, value: string): void {
    this.data[key] = value;
    this.persist();
  }

  remove(key: string): void {
    delete this.data[key];
    this.persist();
  }

  keys(): string[] {
    return Object.keys(this.data);
  }

  private load(): Record<string, string> {
    try {
      if (fs.existsSync(this.filePath)) {
        return JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
      }
    } catch {
      /* start fresh */
    }
    return {};
  }

  private persist(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }
}
