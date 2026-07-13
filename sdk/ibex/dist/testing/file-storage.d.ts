import type { IbexSdkStorage } from "../types";
export declare class FileStorage implements IbexSdkStorage {
    private data;
    private readonly filePath;
    constructor(filePath?: string);
    get(key: string): string | null;
    set(key: string, value: string): void;
    remove(key: string): void;
    keys(): string[];
    private load;
    private persist;
}
