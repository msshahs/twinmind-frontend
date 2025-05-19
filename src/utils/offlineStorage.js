
const { openDB } = require('idb');

const DB_NAME = "twinmind-audio-db";
const STORE_NAME = "audioChunks";

export const getDB = () =>
    openDB(DB_NAME, 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
            }
        },
    });

export const saveAudioChunk = async (blob, meetingId) => {
    const db = await getDB();
    await db.add(STORE_NAME, {
        timestamp: Date.now(),
        blob,
        meetingId,
    });
};

export const getAllChunks = async () => {
    const db = await getDB();
    return await db.getAll(STORE_NAME);
};

export const deleteChunk = async (id) => {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
};
