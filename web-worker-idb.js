// worker-idb.js

// Respond to messages from main thread
self.onmessage = async (event) => {
  const { id, action, data } = event.data;

  try {
    let result;

    switch (action) {
      case 'legiKomponantojn':
        result = await legiKomponantojn();
        break;
      case 'aldoniKomponanton':
        result = await aldoniKomponanton(data);
        break;
      case 'aldoniKomponantojn':
        result = await aldoniKomponantojn(data);
        break;
      case 'ĝisdatigiKomponanton':
        result = await ĝisdatigiKomponanton(data);
        break;
      case 'forigiKomponanton':
        result = await forigiKomponanton(data);
        break;
      case 'forigiĈiujKomponantoj':
        result = await forigiĈiujKomponantoj();
        break;
      default:
        throw new Error(`Nekonata ago: ${action}`);
    }

    postMessage({ id, result });
  } catch (error) {
    postMessage({ id, error: error.message });
  }
};

function legiKomponantojn() {
  return new Promise(async (resolve) => {
    try {
      const peto = await ŝargiĈiujnKomponantoj();

      peto.onsuccess = function(event) {
        if (!event.target.result) {
          resolve([]);
        } else if (!Array.isArray(event.target.result)) {
          console.error('Nevalida formato de komponantoj:', event.target.result);
          resolve([]);
        } else {
          resolve(event.target.result);
        }
      };

      peto.onerror = function(eraro) {
        console.error('Eraro dum legado de komponantoj:', eraro);
        resolve([]);
      };
    } catch (eraro) {
      console.error('Eraro dum ŝargo de komponantoj:', eraro);
      resolve([]);
    }
  });
}

function malfermiDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VortkomponantojDB', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('komponantoj')) {
        db.createObjectStore('komponantoj', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function ŝargiĈiujnKomponantoj() {
  const db = await malfermiDB();
  const tx = db.transaction('komponantoj', 'readonly');
  const store = tx.objectStore('komponantoj');
  const all = await store.getAll();
  return all;
}
async function aldoniKomponanton(komponanto) {
  const db = await malfermiDB();
  const tx = db.transaction('komponantoj', 'readwrite');
  const store = tx.objectStore('komponantoj');
  const request = store.add(komponanto);
  return new Promise((resolve, reject) => {
    request.onsuccess =  () => resolve(request.result)
    request.onerror = () => reject(request.error);
  });
}
async function aldoniKomponantojn(komponantoj) {
  const db = await malfermiDB();
  const tx = db.transaction('komponantoj', 'readwrite');
  const store = tx.objectStore('komponantoj');
  const results = [];
  for (const kp of komponantoj) {
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
async function ĝisdatigiKomponanton(komponanto) {
  const db = await malfermiDB();
  const tx = db.transaction('komponantoj', 'readwrite');
  const store = tx.objectStore('komponantoj');
  const request = store.put(komponanto);
  return new Promise((resolve, reject) => {
    request.onsuccess = async () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function forigiKomponanton(id) {
  const db = await malfermiDB();
  const tx = db.transaction('komponantoj', 'readwrite');
  const store = tx.objectStore('komponantoj');
  const request = store.delete(id);
  return new Promise((resolve, reject) => {
    request.onsuccess = async () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function forigiĈiujKomponantoj() {
  const db = await malfermiDB();
  const tx = db.transaction('komponantoj', 'readwrite');
  const store = tx.objectStore('komponantoj');
  const request = store.clear();
  return new Promise((resolve, reject) => {
    request.onsuccess = async () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}