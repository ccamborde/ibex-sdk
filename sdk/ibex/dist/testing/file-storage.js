/**
 * File-based IbexSdkStorage for Node.js environments.
 * Persists session data (tokens, externalUserId) to a JSON file
 * instead of relying on window.localStorage.
 */
import * as fs from "node:fs";
import * as path from "node:path";
export class FileStorage {
    data;
    filePath;
    constructor(filePath) {
        this.filePath =
            filePath ?? path.resolve(process.cwd(), "tmp", "ibex_session.json");
        this.data = this.load();
    }
    get(key) {
        return this.data[key] ?? null;
    }
    set(key, value) {
        this.data[key] = value;
        this.persist();
    }
    remove(key) {
        delete this.data[key];
        this.persist();
    }
    keys() {
        return Object.keys(this.data);
    }
    load() {
        try {
            if (fs.existsSync(this.filePath)) {
                return JSON.parse(fs.readFileSync(this.filePath, "utf-8"));
            }
        }
        catch {
            /* start fresh */
        }
        return {};
    }
    persist() {
        const dir = path.dirname(this.filePath);
        if (!fs.existsSync(dir))
            fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
    }
}
