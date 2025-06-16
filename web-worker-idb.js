// worker-idb.js

// Respond to messages from main thread
self.onmessage = async (event) => {
  const { id, action, data } = event.data;

  try {
    let result;

    switch (action) {
      case 'legiKomponentojn':
        result = await legiKomponentojn();
        break;
      case 'aldoniKomponenton':
        result = await aldoniKomponenton(data);
        break;
      case 'aldoniKomponentojn':
        result = await aldoniKomponentojn(data);
        break;
      case 'ĝisdatigiKomponenton':
        result = await ĝisdatigiKomponenton(data);
        break;
      case 'forigiKomponenton':
        result = await forigiKomponenton(data);
        break;
      case 'forigiĈiujKomponentoj':
        result = await forigiĈiujKomponentoj();
        break;
      default:
        throw new Error(`Nekonata ago: ${action}`);
    }

    postMessage({ id, result });
  } catch (error) {
    postMessage({ id, error: error.message });
  }
};

function legiKomponentojn() {
  return new Promise(async (resolve) => {
    try {
      const peto = await ŝargiĈiujnKomponentoj();

      peto.onsuccess = function(event) {
        if (!event.target.result) {
          resolve([]);
        } else if (!Array.isArray(event.target.result)) {
          console.error('Nevalida formato de komponentoj:', event.target.result);
          resolve([]);
        } else {
          resolve(event.target.result);
        }
      };

      peto.onerror = function(eraro) {
        console.error('Eraro dum legado de komponentoj:', eraro);
        resolve([]);
      };
    } catch (eraro) {
      console.error('Eraro dum ŝargo de komponentoj:', eraro);
      resolve([]);
    }
  });
}

function malfermiDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VortkomponentojDB', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('komponentoj')) {
        db.createObjectStore('komponentoj', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function ŝargiĈiujnKomponentoj() {
  const db = await malfermiDB();
  const tx = db.transaction('komponentoj', 'readonly');
  const store = tx.objectStore('komponentoj');
  const all = await store.getAll();
  return all;
}
async function aldoniKomponenton(komponento) {
  const db = await malfermiDB();
  const tx = db.transaction('komponentoj', 'readwrite');
  const store = tx.objectStore('komponentoj');
  const request = store.add(komponento);
  return new Promise((resolve, reject) => {
    request.onsuccess =  () => resolve(request.result)
    request.onerror = () => reject(request.error);
  });
}
async function aldoniKomponentojn(komponentoj) {
  const db = await malfermiDB();
  const tx = db.transaction('komponentoj', 'readwrite');
  const store = tx.objectStore('komponentoj');
  const results = [];
  for (const kp of komponentoj) {
    const req = store.add(kp);
    await new Promise((resolve, reject) => {
      req.onsuccess = () => {
        results.push(req.result);
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  }
  return results;
}
async function ĝisdatigiKomponenton(komponento) {
  const db = await malfermiDB();
  const tx = db.transaction('komponentoj', 'readwrite');
  const store = tx.objectStore('komponentoj');
  const request = store.put(komponento);
  return new Promise((resolve, reject) => {
    request.onsuccess = async () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function forigiKomponenton(id) {
  const db = await malfermiDB();
  const tx = db.transaction('komponentoj', 'readwrite');
  const store = tx.objectStore('komponentoj');
  const request = store.delete(id);
  return new Promise((resolve, reject) => {
    request.onsuccess = async () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function forigiĈiujKomponentoj() {
  const db = await malfermiDB();
  const tx = db.transaction('komponentoj', 'readwrite');
  const store = tx.objectStore('komponentoj');
  const request = store.clear();
  return new Promise((resolve, reject) => {
    request.onsuccess = async () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}