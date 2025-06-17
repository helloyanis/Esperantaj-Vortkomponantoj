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
const progreso = document.getElementById('progreso');
const menuListoKomponentoj = document.getElementById('menu-listo-komponentoj');
const appbarListoKomponentoj = document.getElementById('appbar-listo-komponentoj');
const menuAldonuNova = document.getElementById('menu-aldonu-nova');
const appbarAldonuNova = document.getElementById('appbar-aldonu-nova');
const menuSerĉi = document.getElementById('menu-serĉi');
const appbarSerĉi = document.getElementById('appbar-serĉi');
const menuHelpo = document.getElementById('menu-helpo');
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
let listo = false; // Listo de komponantoj
let listoIndekso = 0;


menuFontkodo.addEventListener('click', () => {
  window.open('https://github.com/helloyanis/Esperanto-Vortkomponentoj', '_blank');
});
menuHelpo.addEventListener('click', () => {
  window.open('https://github.com/helloyanis/Esperanto-Vortkomponentoj/wiki', '_blank');
});

// Helpo pri la x-sistemo
function xSistemonSubstituo(texto){
  const replacements = {
        'c': 'ĉ',
        'g': 'ĝ',
        'h': 'ĥ',
        'j': 'ĵ',
        's': 'ŝ',
        'u': 'ŭ'
    };

    return texto.replace(/([cghjsu])x/gi, (match, letter) => {
        const lower = letter.toLowerCase();
        const accented = replacements[lower];
        return letter === letter.toUpperCase() ? accented.toUpperCase() : accented;
    });
}
document.querySelectorAll('.x-sistemo').forEach((element) => {
  element.addEventListener('input', (evento) => {
    const originalText = evento.target.value;
    const convertedText = xSistemonSubstituo(originalText);
    if (originalText !== convertedText) {
      evento.target.value = convertedText;
    }
  });
});
// -----------------------------
// <2> Funkcioj por Manipuli IndexedDB
// -----------------------------
/**
 * Legas ĉiujn vortkomponentojn el indexedDB kaj returnas kiel tablo.
 * Se ne ekzistas, returnas malplenan liston.
 */
const idbWorker = new Worker('web-worker-idb.js');
let requestId = 0;
const pendingRequests = new Map();

idbWorker.onmessage = ({ data }) => {
  const { id, result, error } = data;
  const { resolve, reject } = pendingRequests.get(id) || {};
  pendingRequests.delete(id);
  if (error) reject(new Error(error));
  else resolve(result);
};

function sendToWorker(action, data) {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    pendingRequests.set(id, { resolve, reject });
    idbWorker.postMessage({ id, action, data });
  });
}
async function legiKomponentojn() {
  listo = await sendToWorker('legiKomponentojn');
  if (!listo || !Array.isArray(listo)) {
    listo = [];
  }
  return listo;
}

async function aldoniKomponenton(komponento) {
  petiKonstantaStokado();
  await sendToWorker('aldoniKomponenton', komponento);
  await legiKomponentojn();
  return listo;
}

async function aldoniKomponentojn(komponentoj) {
  petiKonstantaStokado();
  await sendToWorker('aldoniKomponentojn', komponentoj);
  await legiKomponentojn();
}

async function ĝisdatigiKomponenton(komponento) {
  await sendToWorker('ĝisdatigiKomponenton', komponento);
  await legiKomponentojn();
}

async function forigiKomponenton(id) {
  await sendToWorker('forigiKomponenton', id);
  await legiKomponentojn();
}

async function forigiĈiujKomponentoj() {
  await sendToWorker('forigiĈiujKomponentoj');
  await legiKomponentojn();
}


function petiKonstantaStokado() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persisted().then((persistent) => {
      if (persistent) {
        console.log("✅ La stokejo estas persista.");
      } else {
        if(sessionStorage.getItem('persistanta-stokejo-rifuzita')) return;
        sessionStorage.setItem('persistanta-stokejo-rifuzita', 'true');
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
                  description: 'Eraro dum ebligado de konstanta stokado. Via retumilo eble ne estas subtenata (ĉu provu Firefox?), aŭ eble vi retumas en privata reĝimo. Se la stoka spaco de via aparato malpleniĝas, via retumilo eble forigos datumojn de ĉi tiu retejo por krei spacon.',
                  confirmText: 'Komprenis',
                });
              }
            });
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
  appbarAldonuNova.setAttribute('variant', 'standard');
  appbarListoKomponentoj.setAttribute('variant', 'standard');
  ladoTirilo.removeAttribute('open');
}

function montriListon() {
  kaŝiĈiujPaneloj();
  listoIndekso = 0; // Reset the index when showing the list
  paneloListo.removeAttribute('hidden');
  appbarListoKomponentoj.setAttribute('variant', 'filled');
  appbarListoKomponentoj.loading = true;
  refreshListoKomponentoj();
  localStorage.setItem('paneloAktiva', 'panelo-listo');
  document.title = '📜 Listo • VortKom';
  const url = new URL(location);
  if (url.searchParams.get('panelo') === 'listo') {
    return; // Se jam estas serĉa panelo, ne ŝanĝu la URL
  }
  url.searchParams.set('panelo', 'listo');
  url.searchParams.delete('vorto');
  history.pushState({panelo: 'listo'}, '', url.toString());
}

function montriAldonPanelon() {
  kaŝiĈiujPaneloj();
  paneloAldo.removeAttribute('hidden');
  appbarAldonuNova.setAttribute('variant', 'filled');
  // resetu formon
  formularoKomponento.reset();
  aktivaRedaktadoId = null;
  titoloAldo.textContent = 'Aldoni Novan Komponenton';
  localStorage.setItem('paneloAktiva', 'panelo-aldo');
  document.title = '➕ Aldoni • VortKom';
  const url = new URL(location);
  if (url.searchParams.get('panelo') === 'aldo') {
    return; // Se jam estas serĉa panelo, ne ŝanĝu la URL
  }
  url.searchParams.set('panelo', 'aldo');
  url.searchParams.delete('vorto');
  history.pushState({panelo: 'aldo'}, '', url.toString());
}

async function montriRedaktonPanelon() {
  kaŝiĈiujPaneloj();
  paneloAldo.removeAttribute('hidden');
  appbarAldonuNova.setAttribute('variant', 'filled');
  // resetu formon
  formularoKomponento.reset();
  // Plenigu la formon kun la redaktota komponanto
  if (aktivaRedaktadoId) {
    const komponanto = listo.find(kp => kp.id === aktivaRedaktadoId);
    if (komponanto) {
      titoloAldo.textContent = `Redakti Komponenton: ${komponanto.teksto}`;
      kompTeksto.value = komponanto.teksto;
      kompTipo.value = komponanto.tipo;
      kompAntaupovas.value = komponanto.antaŭpovas.join(',');
      kompPostpovas.value = komponanto.postpovas.join(',');
      kompDifino.value = komponanto.difino;
      document.title = `✏️ Redakto de ${komponanto.teksto} • VortKom`;
    }
  }
}

function montriSerĉPanelon() {
  kaŝiĈiujPaneloj();
  paneloSerĉo.removeAttribute('hidden');
  rezultojSerĉo.innerHTML = '';
  serĉoVorto.value = '';
  localStorage.setItem('paneloAktiva', 'panelo-serĉo');
  document.title = '🔍 Serĉi • VortKom';
  const url = new URL(location);
  if (url.searchParams.get('panelo') === 'serĉo') {
    return; // Se jam estas serĉa panelo, ne ŝanĝu la URL
  }
  url.searchParams.set('panelo', 'serĉo');
  history.pushState({panelo: 'serĉo'}, '', url.toString());
}

function ŝargiPanelojn() {
  const url = new URL(location);
  if(url.searchParams.get('panelo')){
    const panelo = url.searchParams.get('panelo');
    switch (panelo) {
      case 'listo':
        montriListon();
        break;
      case 'aldo':
        montriAldonPanelon();
        break;
      case 'serĉo':
        montriSerĉPanelon();
        if(url.searchParams.get('vorto')) {
          serĉoVorto.value = xSistemonSubstituo(url.searchParams.get('vorto'));
          serĉiVorto();
        }
        break;
      default:
        // defaŭlta al listo
        montriListon();
        break;
    }
    return
  }
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

window.addEventListener('popstate', () => {
  console.log('Popstate event detected. Reloading panel...');
  ŝargiPanelojn()
});

// -----------------------------
// <4> Montri Liston de Komponentoj
// -----------------------------
async function refreshListoKomponentoj() {
  progreso.style.display = 'block';
  progreso.indeterminate = true;
  progreso.removeAttribute("value")
  listoKomponentojUi.innerHTML = ''; // purigu antaŭe
  if (listo.length === 0) {
    progreso.style.display = 'none';
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
    const importiSistemVortaro = document.createElement('mdui-list-item');
    importiSistemVortaro.nonclickable = true; 
    importiSistemVortaro.textContent = 'Defaŭlte, ĉi tiu retejo ne enhavas vortaron, do vi povas agordi ĝin laŭplaĉe. Se vi volas, vi povas uzi enkonstruitan Esperanta-angla vortaron!';
    const importiSistemVortaroButono = document.createElement('mdui-button');
    importiSistemVortaroButono.slot='end-icon';
    importiSistemVortaroButono.textContent = 'Importi Vortaron';
    importiSistemVortaroButono.addEventListener('click', () => {
      mdui.confirm({
        headline: 'Importi Vortaron',
        description: 'Ĉu vi certas, ke vi volas importi la enkonstruitan Esperanta-anglan vortaron?',
        confirmText: '✅ Importi',
        cancelText: '❌ Nuligi',
        onConfirm: async function () {
          try {
            await importiSistemVortaroKomponentojn();
          } catch (er) {
            mdui.alert({
              headline: 'Eraro dum importado:',
              description: er.message || er,
              confirmText: 'Komprenis',
            });
          }
        }
      });
    });
    importiSistemVortaro.appendChild(importiSistemVortaroButono);
    listoKomponentojUi.appendChild(importiSistemVortaro);
    appbarListoKomponentoj.loading = false;
    return;
  }
  progreso.max = listo.length;
  progreso.value = 0;
  progreso.indeterminate = false;
  const forigiListo = document.createElement('mdui-list-item');
  forigiListo.nonclickable = true;
  const forigiButono = document.createElement('mdui-button');
  forigiButono.slot = 'end-icon';
  forigiButono.textContent = 'Forigi Ĉiujn';
  if(listoIndekso=== 0) {
    forigiButono.addEventListener('click', () => {
      mdui.confirm({
        headline: 'Forigi Ĉiujn Komponentojn?',
        description: 'Ĉu vi certas forigi ĉiujn komponantojn? Ĉi tio ne povas esti malfariĝita.',
        confirmText: '🗑️ Forigi Ĉiujn',
        cancelText: '↩️ Nuligi',
        onConfirm: async function () {
          try {
            await forigiĈiujKomponentoj();
            mdui.snackbar({ message: 'Ĉiuj komponantoj forigitaj.' });
            refreshListoKomponentoj();
            } catch (er) {
              mdui.alert({
                headline: 'Eraro dum forigo:',
                description: er.message || er,
                confirmText: 'Komprenis',
              });
            }
          }
      });
    });
  }
    forigiListo.appendChild(forigiButono);
    listoKomponentojUi.appendChild(forigiListo);
  let listo2 = listo;
  let stumpigista = false
  if(listo.length > listoIndekso+200) {
    listo2 = listo.slice(0, listoIndekso+200); // Limigu al 1000 komponantoj por eviti tro longan liston
    stumpigista = true;
  }
  listo2.forEach((komp) => {
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
    linio.addEventListener('click', () => {
      if(aktivaRedaktadoId) {
        return; // Ne eblas montri karton dum redaktado
      }
      montriSerĉPanelon();
      serĉoVorto.value = komp.teksto;
      serĉiVorto();
    });
    progreso.value++;
  });
  if(stumpigista) {
    const pliDaKomponentoj = document.createElement('mdui-list-item');
    pliDaKomponentoj.textContent = `+${listo.length - listoIndekso} pli da komponantoj...`;
    pliDaKomponentoj.addEventListener('click', () => {
      listoIndekso += 200;
      refreshListoKomponentoj();
    });
    listoKomponentojUi.appendChild(pliDaKomponentoj);
  } else {
    listoIndekso = 0; // Reset the index if we show all components
  }
  progreso.style.display = 'none';
  appbarListoKomponentoj.loading = false;

}

async function importiSistemVortaroKomponentojn() {
  // Montru progreso dum la importado
  progreso.style.display = 'block';
  progreso.indeterminate = true;
  progreso.removeAttribute("value")
  //FETCH /sistem-vortaro.json
  const respondo = await fetch('sistem-vortaro.json');
  if (!respondo.ok) {
    throw new Error(`Eraro dum ŝarĝo de sistem-vortaro.json: ${respondo.status} ${respondo.statusText}`);
  }
  const komponentoj = await respondo.json();
  if (!Array.isArray(komponentoj)) {
    throw new Error('Sistem-vortaro.json ne enhavas validan liston de komponentoj.');
  }
  await aldoniKomponentojn(komponentoj);
  progreso.style.display = 'none';
  mdui.snackbar({ message: 'Sistem-vortaro importita kun sukceso.' });
  // Refresh the list to show the new components
  await refreshListoKomponentoj();
  return true;
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

  if (aktivaRedaktadoId) {
    // Redakti ekzistantan komponenton
    await ĝisdatigiKomponenton({
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
        .then(async () => {
          mdui.snackbar({ message: 'Komponento forigita.' });
          await refreshListoKomponentoj();
          montriListon();
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

const workerSerĉi = new Worker('web-worker-serĉi.js');

serĉoVorto.addEventListener('input', serĉiVorto);

async function serĉiVorto() {
  serĉoVorto.value=xSistemonSubstituo(serĉoVorto.value)
  const teksto = serĉoVorto.value.trim().toLowerCase();
  document.getElementById('rezulto-karto').innerHTML = '';
  if (!teksto) return rezultojSerĉo.innerHTML = 'Bonvolu enigi vorton por serĉi.';
  document.title = `🔍 Serĉo de ${teksto} • VortKom`;
  const url = new URL(location);
  url.searchParams.set('vorto', teksto);
  url.searchParams.set('panelo', 'serĉo');
  history.replaceState({panelo: 'serĉo', vorto: teksto}, '', url.toString());
  rezultojSerĉo.innerHTML = '<mdui-circular-progress></mdui-circular-progress>';
  const listoK = listo
  const ekzKom = listoK.find((kp) => kp.teksto.toLowerCase() === teksto);

  if (ekzKom) {
    rezultojSerĉo.innerHTML = ''; // purigu antaŭe
    montriKarton(ekzKom, { tekstero: ekzKom.teksto, tipo: ekzKom.tipo, difino: ekzKom.difino });
    return;
  }

  workerSerĉi.postMessage({ vorto: teksto, komponentoj: listoK });

  workerSerĉi.onmessage = function (e) {
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
      tooltip.placement="top-start"
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
  // const difinoStrong = document.createElement('strong');
  // difinoStrong.textContent = 'Difino: ';
  // difinoPara.appendChild(difinoStrong);
  difinoPara.appendChild(document.createTextNode(komp.difino));
  karto.appendChild(difinoPara);

  // const antauPara = document.createElement('p');
  // const antauStrong = document.createElement('strong');
  // antauStrong.textContent = 'Antaŭpovas: ';
  // antauPara.appendChild(antauStrong);
  // const antauText = komp.antaŭpovas.length > 0 ? komp.antaŭpovas.join(', ') : 'neniu restrikto';
  // antauPara.appendChild(document.createTextNode(antauText));
  // karto.appendChild(antauPara);

  // const postPara = document.createElement('p');
  // const postStrong = document.createElement('strong');
  // postStrong.textContent = 'Postpovas: ';
  // postPara.appendChild(postStrong);
  // const postText = komp.postpovas.length > 0 ? komp.postpovas.join(', ') : 'neniu restrikto';
  // postPara.appendChild(document.createTextNode(postText));
  // karto.appendChild(postPara);

  const butonoj = document.createElement('div');
  butonoj.style.display = 'flex';

  const butonoRedakti = document.createElement('mdui-button-icon');
  butonoRedakti.slot = 'end-icon';
  butonoRedakti.innerHTML = `
      <mdui-icon>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
          <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
        </svg>
      </mdui-icon>`;
    butonoRedakti.addEventListener('click', () => redaktiKomponenton(komp.id));
  butonoj.appendChild(butonoRedakti);
  const butonoForigi = document.createElement('mdui-button-icon');
  butonoForigi.slot = 'end-icon';
  butonoForigi.innerHTML = `
      <mdui-icon>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
          <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
        </svg>
      </mdui-icon>`;
  butonoForigi.addEventListener('click', () => forigiKomponentonKonfirmo(komp.id));
  butonoj.appendChild(butonoForigi);
  karto.appendChild(butonoj);
  container.appendChild(karto);
}

// -----------------------------
// <7> Importi JSON-dosieron de Komponentoj
// -----------------------------
butonoAlŝuti.addEventListener('click', () => importiKomponentojn());

async function importiKomponentojn(dosiero = null) {
  if (!dosiero) {
    const inputDos = document.createElement('input');
    inputDos.type = 'file';
    inputDos.accept = '.json,application/json';
    inputDos.addEventListener('change', (evento) => {
      const dos = evento.target.files[0];
      importiKomponentojn(dos);
    });
    inputDos.click();
    return;
  }

  const legilo = new FileReader();
  legilo.onload = async function (e) {
    butonoAlŝuti.loading = true;
    try {
      if (listo.length > 0) {
        try {
          await mdui.confirm({
            headline: 'Ĉu vi certas?',
            description: 'Importi novajn komponantojn forigos ĉiujn ekzistantajn komponantojn. Ĉu vi daŭrigi?',
            confirmText: 'Daŭrigi',
            cancelText: 'Nuligi'
          });
        } catch (er) {
          console.error('Importo nuligita:', er);
          butonoAlŝuti.loading = false;
          return;
        }
      }
      progreso.style.display = 'block';
      progreso.indeterminate = true;
      progreso.removeAttribute("value");

      try{
        JSON.parse(e.target.result); // Validigi JSON-formaton
      }
      catch (er) {
        throw 'Ne taŭga JSON-dosiero';
      }
      if (!Array.isArray(enhavo)) throw 'Ne taŭga formato';

      listoKomponentojUi.innerHTML = '';
      listoKomponentojUi.appendChild(progreso);

      progreso.indeterminate = true;
      progreso.removeAttribute("value");

      forigiĈiujKomponentoj().then(async () => {
        progreso.indeterminate = false;
        progreso.max = enhavo.length;
        progreso.value = 0;
        await aldoniKomponentojn(enhavo);
        progreso.style.display = 'none';
        mdui.snackbar({ message: 'Komponentoj importitaj.' });
        montriListon();
        butonoAlŝuti.loading = false;
      });
    } catch (er) {
      console.error('Eraro dum importo:', er);
      butonoAlŝuti.loading = false;
      mdui.alert({
        headline: 'Eraro en importi JSON:',
        description: er,
        confirmText: 'Komprenis'
      });
    }
  };

  legilo.readAsText(dosiero, 'UTF-8');
}

// -----------------------------
// <8> Eksporti Komponentojn kiel JSON
// -----------------------------
butonoEkspremi.addEventListener('click', async () => {
  const listoSenId = listo.map(kp => {
    const { id, ...resto } = kp; // forigi id
    return resto; // returni reston sen id
  });
  const json = JSON.stringify(listoSenId, null, 2);
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
appbarListoKomponentoj.addEventListener('click', montriListon);
menuListoKomponentoj.addEventListener('click', montriListon);
appbarAldonuNova.addEventListener('click', montriAldonPanelon);
menuAldonuNova.addEventListener('click', montriAldonPanelon);
appbarSerĉi.addEventListener('click', montriSerĉPanelon);
menuSerĉi.addEventListener('click', montriSerĉPanelon);


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
document.addEventListener('DOMContentLoaded', async () => {
  mdui.setColorScheme("#78A75A");
  document.querySelector('#progreso').removeAttribute('style');
  document.querySelector('#progreso').indeterminate = true
  listo = await legiKomponentojn();
  // Montri panelon ĉe starto
  ŝargiPanelojn()
  document.querySelector('#progreso').setAttribute('style', 'display: none;');

  // Importi .json-dosieron de la sistemo se disponebla
  if ("launchQueue" in window) {
  window.launchQueue.setConsumer(async (launchParams) => {
    if (launchParams.files && launchParams.files.length) {
      const dosieroHandle = launchParams.files[0];

      try {
        const dosiero = await dosieroHandle.getFile();
        importiKomponentojn(dosiero);
      } catch (er) {
        console.error("Ne eblis legi la dosieron de launchQueue:", er);
        mdui.alert({
          headline: 'Eraro pri malfermo',
          description: 'Ne eblis legi la dosieron alŝutita de la sistemo.',
          confirmText: 'Fermi'
        });
      }
    }
  });
}
});
