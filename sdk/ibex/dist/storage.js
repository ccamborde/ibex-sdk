class LocalStorageAdapter {
    get(key) {
        if (typeof window === "undefined")
            return null;
        return window.localStorage.getItem(key);
    }
    set(key, value) {
        if (typeof window === "undefined")
            return;
        window.localStorage.setItem(key, value);
    }
    remove(key) {
        if (typeof window === "undefined")
            return;
        window.localStorage.removeItem(key);
    }
    keys() {
        if (typeof window === "undefined")
            return [];
        const out = [];
        for (let i = 0; i < window.localStorage.length; i += 1) {
            const key = window.localStorage.key(i);
            if (key)
                out.push(key);
        }
        return out;
    }
}
export const browserStorage = new LocalStorageAdapter();
