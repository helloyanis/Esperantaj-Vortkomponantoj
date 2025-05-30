// =============================
// Fengŝu: “Esperanto Vortkomponentoj”
// Ĉi tiu dosiero enhavas la logikon por:
// - Stoki, legi, ĝisdatigi, forigi vortkomponentojn en indexedDB.
// - Montri liston de komponantoj.
// - Formojn por aldoni/redakti komponanton.
// - Serĉi aŭ malkonstrui tutan vorton.
// - Importi/eksporti JSON-dosieron.
// - PWA‐registron de service worker.
// =============================

'use strict';


// -----------------------------
// <1> Difino de ŝlosiloj kaj referencoj
// -----------------------------
const ŝlosiloKomponentoj = 'vortkomponentoj'; // Loka stokejo ŝlosilo

// Referencoj al HTML-elementoj
const menuListoKomponentoj = document.getElementById('menu-listo-komponentoj');
const menuAldonuNova = document.getElementById('menu-aldonu-nova');
const menuSerĉi = document.getElementById('menu-serĉi');
const menuFontkodo = document.getElementById('menu-fontkodo');

const paneloListo = document.getElementById('panelo-listo');
const paneloAldo = document.getElementById('panelo-aldo');
const paneloSerĉo = document.getElementById('panelo-serĉo');
const ladoTirilo = document.getElementById('lado-tirilo');

const listoKomponentojUi = document.getElementById('listo-komponentoj');
const formularoKomponento = document.getElementById('formularo-komponento');
const titoloAldo = document.getElementById('titolo-aldo');
const kompTeksto = document.getElementById('komp-teksto');
const kompTipo = document.getElementById('komp-tipo');
const kompAntaupovas = document.getElementById('komp-antaupovas');
const kompPostpovas = document.getElementById('komp-postpovas');
const kompDifino = document.getElementById('komp-difino');
const butonoSalvi = document.getElementById('butono-salvi');
const butonoNuligi = document.getElementById('butono-nuligi');

const serĉoVorto = document.getElementById('serĉo-vorto');
const rezultojSerĉo = document.getElementById('rezultoj-serĉo');

const butonoAlŝuti = document.getElementById('butono-alŝuti');
const butonoEkspremi = document.getElementById('butono-ekspremi');

// Variablo por teni la id de komponanto kiam oni redaktas
let aktivaRedaktadoId = null;

menuFontkodo.addEventListener('click', () => {
  window.open('https://github.com/helloyanis/Esperanto-Vortkomponentoj', '_blank');
});

// -----------------------------
// <2> Funkcioj por Manipuli LokaStokejo
// -----------------------------
/**
 * Legas ĉiujn vortkomponentojn el indexedDB kaj returnas kiel tablo.
 * Se ne ekzistas, returnas malplenan liston.
 */
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
  petiKonstantaStokado();
  const db = await malfermiDB();
  const tx = db.transaction('komponentoj', 'readwrite');
  const store = tx.objectStore('komponentoj');
  const request = store.add(komponento);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function ĝisdatigiKomponenton(komponento) {
  const db = await malfermiDB();
  const tx = db.transaction('komponentoj', 'readwrite');
  const store = tx.objectStore('komponentoj');
  const request = store.put(komponento);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function forigiKomponenton(id) {
  const db = await malfermiDB();
  const tx = db.transaction('komponentoj', 'readwrite');
  const store = tx.objectStore('komponentoj');
  const request = store.delete(id);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function petiKonstantaStokado() {
  if (navigator.storage && navigator.storage.persist && !sessionStorage.getItem('persistanta-stokejo-rifuzita')) {
    navigator.storage.persisted().then((persistent) => {
      if (persistent) {
        console.log("✅ La stokejo estas persista.");
      } else {
        mdui.confirm({
          headline: 'Ebligu Persistantan Stokejon',
          description: 'Ĉu vi volas ebligi persistan stokejon por konservi viajn komponantojn eĉ post fermo de la retumilo? Ĉi tio helpas konservi viajn komponantojn sen perdi ilin.',
          confirmText: '✅ Ebligi',
          cancelText: '❌ Nuligi',
          onConfirm: function () {
            navigator.storage.persist().then((persisted) => {
              if (persisted) {
                mdui.snackbar({ message: 'Persistanta stokejo ebligita.' });
              } else {
                mdui.confirm({
                  headline: 'Eraro',
                  description: 'Permeso estis rifuzita. Persistanta stokejo ne ebligita.',
                  confirmText: 'Komprenis',
                  cancelText: 'Ne voku min denove',
                  onCancel: function () {
                    sessionStorage.setItem('persistanta-stokejo-rifuzita', 'true');
                  }
                });
              }
            });
          },
          onCancel: function () {
            mdui.snackbar({ message: 'Persistanta stokejo ne ebligita.' });
          }
        });
      }
    });
  }else {
    mdui.alert({
      headline: 'Stokejo ne persista',
      description: 'Via retumilo ne subtenas persistan stokejon. La komponantoj eble estos forigitaj kiam la retumilo bezonas liberigi memoron aŭ estas fermita. Uzu Google Chrome, Firefox aŭ aliajn modernajn retumilojn por pli bonan subtenon.',
      confirmText: 'Komprenis',
      onConfirm: function () {
        sessionStorage.setItem('persistanta-stokejo-rifuzita', 'true');
      }
    });
  }

}

// -----------------------------
// <3> Funkcioj por UI: montri kaŝi panelojn
// -----------------------------
function kaŝiĈiujPaneloj() {
  paneloListo.setAttribute('hidden', '');
  paneloAldo.setAttribute('hidden', '');
  paneloSerĉo.setAttribute('hidden', '');
  ladoTirilo.removeAttribute('open');
}

function montriListon() {
  kaŝiĈiujPaneloj();
  paneloListo.removeAttribute('hidden');
  refreshListoKomponentoj();
  localStorage.setItem('paneloAktiva', 'panelo-listo');
}

function montriAldonPanelon() {
  kaŝiĈiujPaneloj();
  paneloAldo.removeAttribute('hidden');
  // resetu formon
  formularoKomponento.reset();
  aktivaRedaktadoId = null;
  titoloAldo.textContent = 'Aldoni Novan Komponenton';
  localStorage.setItem('paneloAktiva', 'panelo-aldo');
}

async function montriRedaktonPanelon() {
  kaŝiĈiujPaneloj();
  paneloAldo.removeAttribute('hidden');
  // resetu formon
  formularoKomponento.reset();
  // Plenigu la formon kun la redaktota komponanto
  if (aktivaRedaktadoId) {
    const listo = await legiKomponentojn();
    const komponanto = listo.find(kp => kp.id === aktivaRedaktadoId);
    if (komponanto) {
      titoloAldo.textContent = `Redakti Komponenton: ${komponanto.teksto}`;
      kompTeksto.value = komponanto.teksto;
      kompTipo.value = komponanto.tipo;
      kompAntaupovas.value = komponanto.antaŭpovas.join(',');
      kompPostpovas.value = komponanto.postpovas.join(',');
      kompDifino.value = komponanto.difino;
    }
  }
}

function montriSerĉPanelon() {
  kaŝiĈiujPaneloj();
  paneloSerĉo.removeAttribute('hidden');
  rezultojSerĉo.innerHTML = '';
  serĉoVorto.value = '';
  localStorage.setItem('paneloAktiva', 'panelo-serĉo');
}

function ŝargiPanelojn() {
  const antaŭaPanelo = localStorage.getItem('paneloAktiva');
  if (antaŭaPanelo === 'panelo-listo') {
    montriListon();
  } else if (antaŭaPanelo === 'panelo-aldo') {
    montriAldonPanelon();
  } else if (antaŭaPanelo === 'panelo-serĉo') {
    montriSerĉPanelon();
  } else {
    // defaŭlta al listo
    montriListon();
  }
}

// -----------------------------
// <4> Montri Liston de Komponentoj
// -----------------------------
async function refreshListoKomponentoj() {
  const listo = await legiKomponentojn();
  listoKomponentojUi.innerHTML = ''; // purigu antaŭe
  if (listo.length === 0) {
    const neEkzistas = document.createElement('mdui-list-item');
    neEkzistas.nonclickable = true;
    neEkzistas.textContent = 'Neniaj komponantoj trovitaj.';
    const aldoniButono = document.createElement('mdui-button');
    aldoniButono.slot='end-icon';
    aldoniButono.textContent = 'Aldoni';
    aldoniButono.addEventListener('click', montriAldonPanelon);
    neEkzistas.appendChild(aldoniButono);
    const importiButono = document.createElement('mdui-button');
    importiButono.slot='end-icon';
    importiButono.textContent = 'Importi';
    importiButono.addEventListener('click', importiKomponentojn);
    neEkzistas.appendChild(importiButono);
    listoKomponentojUi.appendChild(neEkzistas);
    return;
  }
  listo.forEach((komp) => {
    const linio = document.createElement('mdui-list-item');
    linio.textContent = `${komp.teksto}`;

    const difino = document.createElement('div');
    difino.slot = 'description';
    difino.textContent = komp.difino || 'Neniu difino disponebla.';

    // Butono Redakti
    const butonoRedakti = document.createElement('mdui-button-icon');
    butonoRedakti.slot='end-icon';
    butonoRedakti.innerHTML = `
      <mdui-icon>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
          <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
        </svg>
      </mdui-icon>`;
    butonoRedakti.addEventListener('click', () => redaktiKomponenton(komp.id));

    // Butono Forigi
    const butonoForigi = document.createElement('mdui-button-icon');
    butonoForigi.slot='end-icon'
    butonoForigi.innerHTML = `
      <mdui-icon>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
          <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
        </svg>
      </mdui-icon>`;
    butonoForigi.addEventListener('click', () => forigiKomponentonKonfirmo(komp.id));

    // Aldonu la piktogramojn al la linio
    const linioPiktogramoj = document.createElement('mdui-icon');
    switch (komp.tipo) {
      case 'radiko':
        linioPiktogramoj.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M40-199v-200h80v120h720v-120h80v200H40Zm342-161v-34h-3q-13 20-35 31.5T294-351q-49 0-77-25.5T189-446q0-42 32.5-68.5T305-541q23 0 42.5 3.5T381-526v-14q0-27-18.5-43T312-599q-21 0-39.5 9T241-564l-43-32q19-27 48-41t67-14q62 0 95 29.5t33 85.5v176h-59Zm-66-134q-32 0-49 12.5T250-446q0 20 15 32.5t39 12.5q32 0 54.5-22.5T381-478q-14-8-32-12t-33-4Zm185 134v-401h62v113l-3 40h3q3-5 24-25.5t66-20.5q64 0 101 46t37 106q0 60-36.5 105.5T653-351q-41 0-62.5-18T563-397h-3v37h-59Zm143-238q-40 0-62 29.5T560-503q0 37 22 66t62 29q40 0 62.5-29t22.5-66q0-37-22.5-66T644-598Z"/></svg>`
        break;
      case 'prefikso':
        linioPiktogramoj.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M160-240H80v-480h80v480Zm320 0L240-480l240-240 56 56-143 144h487v80H393l144 144-57 56Z"/></svg>`
        break;
      case 'sufikso':
        linioPiktogramoj.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M80-240v-480h80v480H80Zm560 0-57-56 144-144H240v-80h487L584-664l56-56 240 240-240 240Z"/></svg>`
        break;
    }
    const linioPiktogramoMesaĝo = document.createElement('mdui-tooltip');
    linioPiktogramoMesaĝo.content = komp.tipo.charAt(0).toUpperCase() + komp.tipo.slice(1);;
    linioPiktogramoMesaĝo.slot='icon';

    linio.appendChild(difino);
    linio.appendChild(butonoRedakti);
    linio.appendChild(butonoForigi);
    linioPiktogramoMesaĝo.appendChild(linioPiktogramoj);
    linio.appendChild(linioPiktogramoMesaĝo);

    listoKomponentojUi.appendChild(linio);
  });

}

// -----------------------------
// <5> Aldoni / Redakti Komponenton (Form-submeto)
// -----------------------------
formularoKomponento.addEventListener('submit', async function (evento) {
  evento.preventDefault();
  const teksto = kompTeksto.value.trim();
  const tipo = kompTipo.value;
  // Dispecigi antaŭpovas kaj postpovas (separitaj per komoj)
  const antaŭpovasListo = kompAntaupovas.value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const postpovasListo = kompPostpovas.value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const difino = kompDifino.value.trim();

  if (!teksto || !difino) {
    return
  }

  let listo = await legiKomponentojn();

  if (aktivaRedaktadoId) {
    // Redakti ekzistantan komponenton
    ĝisdatigiKomponenton({
      id: aktivaRedaktadoId,
      teksto: teksto,
      tipo: tipo,
      antaŭpovas: antaŭpovasListo,
      postpovas: postpovasListo,
      difino: difino,
    });
    mdui.snackbar({ message: 'Komponento ĝisdatita.' });
    aktivaRedaktadoId = null; // nuligi redaktadon
    montriListon(); // montri la ĝisdatitan liston
  } else {
    // Aldoni novan komponenton
    const novaKp = {
      teksto: teksto,
      tipo: tipo,
      antaŭpovas: antaŭpovasListo,
      postpovas: postpovasListo,
      difino: difino,
    };
    await aldoniKomponenton(novaKp);
    refreshListoKomponentoj();
    mdui.snackbar({
      message: 'Komponento aldonita.',
      action: 'Montri liston',
      onActionClick: function () {
        montriListon();
      },
    });
    formularoKomponento.reset();
  }
  
});

butonoNuligi.addEventListener('click', function () {
  formularoKomponento.reset();
  aktivaRedaktadoId = null;
  titoloAldo.textContent = 'Aldoni Novan Komponenton';
});

// Redakti komponanton (plenigas formon)
async function redaktiKomponenton(id) {
  const listo = await legiKomponentojn();
  const trovita = listo.find((kp) => kp.id === id);
  if (!trovita) return;
  aktivaRedaktadoId = id;
  titoloAldo.textContent = `Redakti Komponenton: ${trovita.teksto}`;
  kompTeksto.value = trovita.teksto;
  kompTipo.value = trovita.tipo;
  kompAntaupovas.value = trovita.antaŭpovas.join(',');
  kompPostpovas.value = trovita.postpovas.join(',');
  kompDifino.value = trovita.difino;
  montriRedaktonPanelon();
}

// Forigi komponanton kun konfirmo
function forigiKomponentonKonfirmo(id) {
  mdui.confirm({
    headline:'Forigi Komponenton?',
    description: 'Ĉu vi certe forigi ĉi tiun komponanton?',
    confirmText: '🗑️ Forigi',
    cancelText: '↩️ Nuligi',
    onConfirm: function () {
      forigiKomponenton(id)
        .then(() => {
          mdui.snackbar({ message: 'Komponento forigita.' });
          refreshListoKomponentoj();
        })
        .catch((er) => {
          mdui.alert({
            headline: 'Eraro dum forigo:',
            description: er.message || er,
            confirmText: 'Komprenis'
          });
        });
      refreshListoKomponentoj();
    },
    onCancel: function () {
      mdui.snackbar({ message: 'Forigo nuligita.' });
    }
});
}

const worker = new Worker('web-worker.js');

serĉoVorto.addEventListener('input', serĉiVorto);

async function serĉiVorto() {
  const teksto = serĉoVorto.value.trim().toLowerCase();
  document.getElementById('rezulto-karto').innerHTML = '';
  if (!teksto) return rezultojSerĉo.innerHTML = 'Bonvolu enigi vorton por serĉi.';
  rezultojSerĉo.innerHTML = '<mdui-circular-progress></mdui-circular-progress>';
  const listoK = await legiKomponentojn();
  const ekzKom = listoK.find((kp) => kp.teksto.toLowerCase() === teksto);

  if (ekzKom) {
    rezultojSerĉo.innerHTML = ''; // purigu antaŭe
    montriKarton(ekzKom, { tekstero: ekzKom.teksto, tipo: ekzKom.tipo, difino: ekzKom.difino });
    return;
  }

  worker.postMessage({ vorto: teksto, komponentoj: listoK });

  worker.onmessage = function (e) {
    rezultojSerĉo.innerHTML = ''; // purigu antaŭe
    const deko = e.data;
    if (deko.length === 0) {
      rezultojSerĉo.innerHTML = 'Neniaj rezultoj trovita.';
      return;
    }

    const titolo = document.createElement('h3');
    titolo.textContent = `Dekomponado de “${teksto}”:`;
    rezultojSerĉo.appendChild(titolo);

    montriĈipojn(deko);
  };
}

function montriĈipojn(deko) {
  const kartoj = document.createElement('div');
  kartoj.style.display = 'flex';
  kartoj.style.flexWrap = 'wrap';
  kartoj.id = 'chip-container';
  deko.forEach((ero, index) => {
    const tooltip = document.createElement('mdui-tooltip');
    const chip = document.createElement('mdui-chip');

    chip.setAttribute('variant', 'filter');
    chip.classList.add('chip-selectable');
    chip.dataset.index = index;

    if (ero.komp) {
      tooltip.setAttribute('content', ero.komp.difino);
      chip.textContent = ero.mapado.tekstero;

      chip.onclick = () => {
        // Deselect all chips
        document.querySelectorAll('.chip-selectable').forEach(c => c.removeAttribute('selected'));
        // Select the clicked chip
        chip.setAttribute('selected', '');
        // Show corresponding card
        montriKarton(ero.komp, ero.mapado);
      };
    } else {
      tooltip.setAttribute('content', 'Nevalida');
      chip.textContent = ero.mapado.tekstero;
      chip.setAttribute('disabled', '');
    }

    tooltip.appendChild(chip);
    kartoj.appendChild(tooltip);
  });
  rezultojSerĉo.appendChild(kartoj);
}

function montriKarton(komp, mapado) {
  const container = document.getElementById('rezulto-karto');
  container.innerHTML = '';

  const karto = document.createElement('mdui-card');
  karto.variant = 'filled';
  karto.style.padding = '10px';
  karto.style.width = '100%';

  const title = document.createElement('h3');
  title.textContent = `${mapado.tekstero} (${komp.tipo})`;
  karto.appendChild(title);

  const difinoPara = document.createElement('p');
  const difinoStrong = document.createElement('strong');
  difinoStrong.textContent = 'Difino: ';
  difinoPara.appendChild(difinoStrong);
  difinoPara.appendChild(document.createTextNode(komp.difino));
  karto.appendChild(difinoPara);

  const antauPara = document.createElement('p');
  const antauStrong = document.createElement('strong');
  antauStrong.textContent = 'Antaŭpovas: ';
  antauPara.appendChild(antauStrong);
  const antauText = komp.antaŭpovas.length > 0 ? komp.antaŭpovas.join(', ') : 'neniu restrikto';
  antauPara.appendChild(document.createTextNode(antauText));
  karto.appendChild(antauPara);

  const postPara = document.createElement('p');
  const postStrong = document.createElement('strong');
  postStrong.textContent = 'Postpovas: ';
  postPara.appendChild(postStrong);
  const postText = komp.postpovas.length > 0 ? komp.postpovas.join(', ') : 'neniu restrikto';
  postPara.appendChild(document.createTextNode(postText));
  karto.appendChild(postPara);
  container.appendChild(karto);
}



// -----------------------------
// <7> Importi JSON-dosieron de Komponentoj
// -----------------------------
butonoAlŝuti.addEventListener('click', importiKomponentojn);
function importiKomponentojn() {
  // Krei kaŝitan input[type=file]
  const inputDos = document.createElement('input');
  inputDos.type = 'file';
  inputDos.accept = '.json,application/json';
  inputDos.addEventListener('change', (evento) => {
    const dos = evento.target.files[0];
    if (!dos) return;
    const legilo = new FileReader();
    legilo.onload = function (e) {
      try {
        const enhavo = JSON.parse(e.target.result);
        if (!Array.isArray(enhavo)) throw 'Ne taŭga formato';
        // Ĉiu objekto en la listo devus havi id, teksto, tipo, antaŭpovas, postpovas, difino.
        enhavo.forEach((kp) => {
        if (!kp.id || !kp.teksto || !kp.tipo || !Array.isArray(kp.antaŭpovas) || !Array.isArray(kp.postpovas) || !kp.difino) {
          throw `Nevalida komponanto: ${JSON.stringify(kp)}`;
        } else {
          // Instead of deleting kp.id, just omit it when adding, or clone without id:
          const kompSenId = {...kp};
          delete kompSenId.id;

          aldoniKomponenton(kompSenId)
            .then(generatedId => {
              console.log(`Komponanto aldonita kun id ${generatedId}`);
            })
            .catch((er) => {
              console.error('Eraro dum aldono:', er);
              mdui.alert({
                headline: 'Eraro dum importo:',
                description: `Ne povis aldoni komponanton: ${kp.teksto}. Eraro: ${er.message || er}`,
                confirmText: 'Komprenis'
              });
            });
        }
      });
        mdui.snackbar({ message: 'Komponentoj importitaj.' });
        montriListon();
      } catch (er) {
        mdui.alert({
          headline:'Eraro en importi JSON: ',
          description:er,
          confirmText: 'Komprenis'
        });
      }
    };
    legilo.readAsText(dos, 'UTF-8');
  });
  // "kliku" por malfermi dosier-Dialogon
  inputDos.click();
};

// -----------------------------
// <8> Eksporti Komponentojn kiel JSON
// -----------------------------
butonoEkspremi.addEventListener('click', async () => {
  const listo = await legiKomponentojn();
  const json = JSON.stringify(listo, null, 2);
  const dosBlob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(dosBlob);
  const ligilo = document.createElement('a');
  ligilo.href = url;
  ligilo.download = 'vortkomponentoj.json';
  ligilo.click();
  //setTimeout(() => URL.revokeObjectURL(url), 10000);
  mdui.snackbar({ message: 'Komponentoj eksportitaj.' });
});

// -----------------------------
// <9> Event-listeners por menuo
// -----------------------------
menuListoKomponentoj.addEventListener('click', montriListon);
menuAldonuNova.addEventListener('click', montriAldonPanelon);
menuSerĉi.addEventListener('click', montriSerĉPanelon);

// Montri panelon ĉe starto
ŝargiPanelojn()

// -----------------------------
// <10> PWA: Registri Service Worker
// -----------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker
      .register('service-worker.js')
      .then(function (registro) {
        console.log('ServiceWorker sukcesis je: ', registro.scope);
      })
      .catch(function (eraro) {
        console.error('ServiceWorker malsukcesis: ', eraro);
      });
  });
}
let instaliPrompt = null;
const instaliButono = document.querySelector("#menu-instali");

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  instaliPrompt = event;
  instaliButono.removeAttribute("style");
});
instaliButono.addEventListener("click", async () => {
  if (!instaliPrompt) {
    return;
  }
  const result = await instaliPrompt.prompt();
  console.log(result.outcome);
  malaktiviInAppInstaliPrompt();
});

function malaktiviInAppInstaliPrompt() {
  instaliPrompt = null;
  instaliButono.setAttribute("style", "display: none;");
}
document.addEventListener('DOMContentLoaded', () => {
  mdui.setColorScheme("#78A75A");
});