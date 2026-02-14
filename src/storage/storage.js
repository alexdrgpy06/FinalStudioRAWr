/**
 * IndexedDB Storage Layer
 * Replaces SQLAlchemy/SQLite backend with in-browser storage.
 * Uses the 'idb' library for a clean Promise-based API.
 */

import { openDB } from 'idb';

const DB_NAME = 'autostudio';
const DB_VERSION = 1;

let dbPromise = null;

function getDB() {
    if (!dbPromise) {
        dbPromise = openDB(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Presets store
                if (!db.objectStoreNames.contains('presets')) {
                    db.createObjectStore('presets', { keyPath: 'id' });
                }
                // Events/history store
                if (!db.objectStoreNames.contains('events')) {
                    const evStore = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
                    evStore.createIndex('active', 'active');
                    evStore.createIndex('saved', 'saved');
                }
                // Assets store (logos, LUTs as Blobs)
                if (!db.objectStoreNames.contains('assets')) {
                    db.createObjectStore('assets', { keyPath: 'id' });
                }
            },
        });
    }
    return dbPromise;
}

// ─────────────────────────────────────────────────────────
// Presets
// ─────────────────────────────────────────────────────────

export async function getPresetStore() {
    const db = await getDB();
    return {
        async put(preset) {
            return db.put('presets', preset);
        },
        async get(id) {
            return db.get('presets', id);
        },
        async delete(id) {
            return db.delete('presets', id);
        },
        async getAll() {
            return db.getAll('presets');
        },
    };
}

export async function getAllPresets() {
    const db = await getDB();
    return db.getAll('presets');
}

// ─────────────────────────────────────────────────────────
// Events
// ─────────────────────────────────────────────────────────

export async function createEvent(event) {
    const db = await getDB();

    // If active, deactivate all others
    if (event.active) {
        const tx = db.transaction('events', 'readwrite');
        const store = tx.objectStore('events');
        const all = await store.getAll();
        for (const ev of all) {
            if (ev.active) {
                ev.active = false;
                await store.put(ev);
            }
        }
        await tx.done;
    }

    const id = await db.add('events', {
        ...event,
        created_at: new Date().toISOString(),
    });

    return { ...event, id };
}

export async function getActiveEvent() {
    const db = await getDB();
    const all = await db.getAll('events');
    return all.find(e => e.active) || null;
}

export async function getSavedEvents() {
    const db = await getDB();
    const all = await db.getAll('events');
    return all.filter(e => e.saved);
}

export async function activateEvent(id) {
    const db = await getDB();
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');
    const all = await store.getAll();

    for (const ev of all) {
        const shouldBeActive = ev.id === id;
        if (ev.active !== shouldBeActive) {
            ev.active = shouldBeActive;
            await store.put(ev);
        }
    }
    await tx.done;
}

export async function deleteEvent(id) {
    const db = await getDB();
    return db.delete('events', id);
}

// ─────────────────────────────────────────────────────────
// Assets (logos, LUTs)
// ─────────────────────────────────────────────────────────

export async function saveAsset(id, blob, metadata = {}) {
    const db = await getDB();
    return db.put('assets', { id, blob, ...metadata, saved_at: Date.now() });
}

export async function getAsset(id) {
    const db = await getDB();
    return db.get('assets', id);
}

export async function deleteAsset(id) {
    const db = await getDB();
    return db.delete('assets', id);
}

export async function listAssets() {
    const db = await getDB();
    return db.getAll('assets');
}
