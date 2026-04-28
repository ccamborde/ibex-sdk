import type { IbexSdkStorage } from "./types";
declare class LocalStorageAdapter implements IbexSdkStorage {
    get(key: string): string | null;
    set(key: string, value: string): void;
    remove(key: string): void;
    keys(): string[];
}
export declare const browserStorage: LocalStorageAdapter;
export {};
