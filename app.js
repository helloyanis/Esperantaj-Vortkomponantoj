// =============================
// Fengŝu: “Esperanto Vortkomponantoj”
// Ĉi tiu dosiero enhavas la logikon por:
// - Stoki, legi, ĝisdatigi, forigi vortkomponantojn en indexedDB.
// - Montri liston de komponantoj.
// - Formojn por aldoni/redakti komponanton.
// - Serĉi aŭ malkonstrui tutan vorton.
// - Enporti/elporti JSON-dosieron.
// - PWA‐registron de service worker.
// =============================

'use strict';


// -----------------------------
// <1> Difino de ŝlosiloj kaj referencoj
// -----------------------------
const ŝlosiloKomponantoj = 'vortkomponantoj'; // Loka stokejo ŝlosilo

// Referencoj al HTML-elementoj
const progreso = document.getElementById('progreso');
const menuListoKomponantoj = document.getElementById('menu-listo-komponantoj');
const appbar = document.getElementById('appbar-nav');
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

const listoKomponantojUi = document.getElementById('listo-komponantoj');
const formularoKomponanto = document.getElementById('formularo-komponanto');
const titoloAldo = document.getElementById('titolo-aldo');
const kompTeksto = document.getElementById('komp-teksto');
const kompTipo = document.getElementById('komp-tipo');
const kompAntaupovas = document.getElementById('komp-antaupovas');
const kompPostpovas = document.getElementById('komp-postpovas');
const kompDifino = document.getElementById('komp-difino');
const butonoKonservi = document.getElementById('butono-konservi');
const butonoNuligi = document.getElementById('butono-nuligi');

const serĉoVorto = document.getElementById('serĉo-vorto');
const rezultojSerĉo = document.getElementById('rezultoj-serĉo');

const butonoAlŝuti = document.getElementById('menu-enporti');
const butonoEkspremi = document.getElementById('menu-elporti');

// Variablo por teni la id de komponanto kiam oni redaktas
let aktivaRedaktadoId = null;
let listo = false; // Listo de komponantoj
let listoIndekso = 0;


menuFontkodo.addEventListener('click', () => {
  window.open('https://github.com/helloyanis/Esperantaj-Vortkomponantoj', '_blank');
});
menuHelpo.addEventListener('click', () => {
  window.open('https://github.com/helloyanis/Esperantaj-Vortkomponantoj/wiki', '_blank');
});

// Helpo pri la x-sistemo
function xSistemonSubstituo(texto) {
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
 * Legas ĉiujn vortkomponantojn el indexedDB kaj returnas kiel tablo.
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
async function legiKomponantojn() {
  listo = await sendToWorker('legiKomponantojn');
  if (!listo || !Array.isArray(listo)) {
    listo = [];
  }
  return listo;
}

async function aldoniKomponanton(komponanto) {
  petiKonstantaStokado();
  await sendToWorker('aldoniKomponanton', komponanto);
  await legiKomponantojn();
  return listo;
}

async function aldoniKomponantojn(komponantoj) {
  petiKonstantaStokado();
  await sendToWorker('aldoniKomponantojn', komponantoj);
  await legiKomponantojn();
}

async function ĝisdatigiKomponanton(komponanto) {
  await sendToWorker('ĝisdatigiKomponanton', komponanto);
  await legiKomponantojn();
}

async function forigiKomponanton(id) {
  await sendToWorker('forigiKomponanton', id);
  await legiKomponantojn();
}

async function forigiĈiujKomponantoj() {
  await sendToWorker('forigiĈiujKomponantoj');
  await legiKomponantojn();
}


function petiKonstantaStokado() {
  if (navigator.storage && navigator.storage.persist) {
    navigator.storage.persisted().then((persistent) => {
      if (persistent) {
        console.log("✅ La stokejo estas persista.");
      } else {
        if (sessionStorage.getItem('persistanta-stokejo-rifuzita')) return;
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
  } else {
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
  appbar.value=""
  ladoTirilo.removeAttribute('open');
}

function montriListon() {
  kaŝiĈiujPaneloj();
  progreso.style.display = 'block';
  progreso.indeterminate = true;
  listoIndekso = 0; // Reset the index when showing the list
  paneloListo.removeAttribute('hidden');
  appbar.value = 'appbar-listo-komponantoj';
  refreshListoKomponantoj();
  localStorage.setItem('paneloAktiva', 'panelo-listo');
  document.title = '📜 Listo • VortKom';
  const url = new URL(location);
  if (url.searchParams.get('panelo') === 'listo') {
    return; // Se jam estas serĉa panelo, ne ŝanĝu la URL
  }
  url.searchParams.set('panelo', 'listo');
  url.searchParams.delete('vorto');
  history.pushState({ panelo: 'listo' }, '', url.toString());
}

function montriAldonPanelon() {
  kaŝiĈiujPaneloj();
  paneloAldo.removeAttribute('hidden');
  appbar.value = 'appbar-aldonu-nova';
  // resetu formon
  formularoKomponanto.reset();
  aktivaRedaktadoId = null;
  titoloAldo.textContent = 'Aldoni Novan Komponanton';
  localStorage.setItem('paneloAktiva', 'panelo-aldo');
  document.title = '➕ Aldoni • VortKom';
  const url = new URL(location);
  if (url.searchParams.get('panelo') === 'aldo') {
    return; // Se jam estas serĉa panelo, ne ŝanĝu la URL
  }
  url.searchParams.set('panelo', 'aldo');
  url.searchParams.delete('vorto');
  history.pushState({ panelo: 'aldo' }, '', url.toString());
}

async function montriRedaktonPanelon() {
  kaŝiĈiujPaneloj();
  paneloAldo.removeAttribute('hidden');
  appbar.value = '';
  // resetu formon
  formularoKomponanto.reset();
  // Plenigu la formon kun la redaktota komponanto
  if (aktivaRedaktadoId) {
    const komponanto = listo.find(kp => kp.id === aktivaRedaktadoId);
    if (komponanto) {
      titoloAldo.textContent = `Redakti Komponanton: ${komponanto.teksto}`;
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
  appbar.value = 'appbar-serĉi';
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
  history.pushState({ panelo: 'serĉo' }, '', url.toString());
}

function ŝargiPanelojn() {
  const url = new URL(location);
  if (url.searchParams.get('panelo')) {
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
        if (url.searchParams.get('vorto')) {
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
// <4> Montri Liston de Komponantoj
// -----------------------------
async function refreshListoKomponantoj() {
  progreso.removeAttribute("value")
  listoKomponantojUi.innerHTML = ''; // purigu antaŭe
  if (listo.length === 0) {
    progreso.style.display = 'none';
    const neEkzistas = document.createElement('div');
    neEkzistas.style.display = 'flex';
    neEkzistas.style.justifyContent = 'space-between';
    neEkzistas.style.flexWrap = 'wrap';
    neEkzistas.style.alignItems = 'center';
    const neEkzistasTeksto = document.createElement('span');
    neEkzistasTeksto.style.flex = '1';
    neEkzistasTeksto.textContent = 'Neniaj komponantoj trovitaj.';
    const aldoniButono = document.createElement('mdui-button');
    const aldoniButonoPiktogramo = document.createElement('mdui-icon');
    aldoniButonoPiktogramo.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
  <path d="M440-280h80v-160h160v-80H520v-160h-80v160H280v80h160v160Zm40 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" />
</svg>`;
    aldoniButonoPiktogramo.slot = 'icon';
    aldoniButono.textContent = 'Aldoni';
    aldoniButono.appendChild(aldoniButonoPiktogramo);
    aldoniButono.addEventListener('click', montriAldonPanelon);
    neEkzistas.appendChild(neEkzistasTeksto);
    neEkzistas.appendChild(aldoniButono);
    const enportiButono = document.createElement('mdui-button');
    const enportiButonoPiktogramo = document.createElement('mdui-icon');
    enportiButonoPiktogramo.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
  <path  d="M440-200h80v-167l64 64 56-57-160-160-160 160 57 56 63-63v167ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z" />
</svg>`;
    enportiButonoPiktogramo.slot = 'icon';
    enportiButono.textContent = 'Enporti';
    enportiButono.appendChild(enportiButonoPiktogramo);
    enportiButono.addEventListener('click', () => enportiKomponantojn());
    neEkzistas.appendChild(enportiButono);
    listoKomponantojUi.appendChild(neEkzistas);
    const enportiSistemVortaro = document.createElement('div');
    enportiSistemVortaro.style.display = 'flex';
    enportiSistemVortaro.style.justifyContent = 'space-between';
    enportiSistemVortaro.style.flexWrap = 'wrap';
    enportiSistemVortaro.style.alignItems = 'center';
    const enportiSistemVortaroTeksto = document.createElement('span');
    enportiSistemVortaroTeksto.style.flex = '1';
    enportiSistemVortaroTeksto.textContent = 'Komence, ĉi tiu retejo ne enhavas vortaron, do vi povas agordi ĝin laŭplaĉe. Se vi volas, vi povas uzi enkonstruitan Esperanta-angla vortaron!';
    const enportiSistemVortaroButono = document.createElement('mdui-button');
    const enportiSistemVortaroPiktogramo = document.createElement('mdui-icon');
    enportiSistemVortaroPiktogramo.innerHTML = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960"><path d="M160-391h45l23-66h104l24 66h44l-97-258h-46l-97 258Zm81-103 38-107h2l38 107h-78Zm319-70v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-600q-38 0-73 9.5T560-564Zm0 220v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-380q-38 0-73 9t-67 27Zm0-110v-68q33-14 67.5-21t72.5-7q26 0 51 4t49 10v64q-24-9-48.5-13.5T700-490q-38 0-73 9.5T560-454ZM260-320q47 0 91.5 10.5T440-278v-394q-41-24-87-36t-93-12q-36 0-71.5 7T120-692v396q35-12 69.5-18t70.5-6Zm260 42q44-21 88.5-31.5T700-320q36 0 70.5 6t69.5 18v-396q-33-14-68.5-21t-71.5-7q-47 0-93 12t-87 36v394Zm-40 118q-48-38-104-59t-116-21q-42 0-82.5 11T100-198q-21 11-40.5-1T40-234v-482q0-11 5.5-21T62-752q46-24 96-36t102-12q58 0 113.5 15T480-740q51-30 106.5-45T700-800q52 0 102 12t96 36q11 5 16.5 15t5.5 21v482q0 23-19.5 35t-40.5 1q-37-20-77.5-31T700-240q-60 0-116 21t-104 59ZM280-499Z"/></svg>`;
    enportiSistemVortaroPiktogramo.slot = 'icon';
    enportiSistemVortaroButono.textContent = 'Enporti enkonstruitan vortaron';
    enportiSistemVortaroButono.appendChild(enportiSistemVortaroPiktogramo);
    enportiSistemVortaroButono.addEventListener('click', () => {
      mdui.confirm({
        headline: 'Enporti Vortaron',
        description: 'Ĉu vi certas, ke vi volas enporti la enkonstruitan Esperanta-anglan vortaron?',
        confirmText: '✅ Enporti',
        cancelText: '❌ Nuligi',
        onConfirm: async function () {
          try {
            await enportiSistemVortaroKomponantojn();
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
    enportiSistemVortaro.appendChild(enportiSistemVortaroTeksto);
    enportiSistemVortaro.appendChild(enportiSistemVortaroButono);
    listoKomponantojUi.appendChild(enportiSistemVortaro);
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
  if (listoIndekso === 0) {
    forigiButono.addEventListener('click', () => {
      mdui.confirm({
        headline: 'Forigi Ĉiujn Komponantojn?',
        description: 'Ĉu vi certas forigi ĉiujn komponantojn? Ĉi tio ne povas esti malfariĝita.',
        confirmText: '🗑️ Forigi Ĉiujn',
        cancelText: '↩️ Nuligi',
        onConfirm: async function () {
          try {
            await forigiĈiujKomponantoj();
            mdui.snackbar({ message: 'Ĉiuj komponantoj forigitaj.' });
            refreshListoKomponantoj();
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
  listoKomponantojUi.appendChild(forigiListo);
  let listo2 = listo;
  let stumpigista = false
  if (listo.length > listoIndekso + 200) {
    listo2 = listo.slice(0, listoIndekso + 200); // Limigu al 1000 komponantoj por eviti tro longan liston
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
    butonoRedakti.slot = 'end-icon';
    butonoRedakti.innerHTML = `
      <mdui-icon>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
          <path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/>
        </svg>
      </mdui-icon>`;
    butonoRedakti.addEventListener('click', () => redaktiKomponanton(komp.id));

    // Butono Forigi
    const butonoForigi = document.createElement('mdui-button-icon');
    butonoForigi.slot = 'end-icon'
    butonoForigi.innerHTML = `
      <mdui-icon>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
          <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
        </svg>
      </mdui-icon>`;
    butonoForigi.addEventListener('click', () => forigiKomponantonKonfirmo(komp.id));

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
    linioPiktogramoMesaĝo.slot = 'icon';

    linio.appendChild(difino);
    linio.appendChild(butonoRedakti);
    linio.appendChild(butonoForigi);
    linioPiktogramoMesaĝo.appendChild(linioPiktogramoj);
    linio.appendChild(linioPiktogramoMesaĝo);

    listoKomponantojUi.appendChild(linio);
    linio.addEventListener('click', () => {
      if (aktivaRedaktadoId) {
        return; // Ne eblas montri karton dum redaktado
      }
      montriSerĉPanelon();
      serĉoVorto.value = komp.teksto;
      serĉiVorto();
    });
    progreso.value++;
  });
  if (stumpigista) {
    const pliDaKomponantoj = document.createElement('mdui-list-item');
    pliDaKomponantoj.textContent = `+${listo.length - listoIndekso} pli da komponantoj...`;
    pliDaKomponantoj.addEventListener('click', () => {
      listoIndekso += 200;
      refreshListoKomponantoj();
    });
    listoKomponantojUi.appendChild(pliDaKomponantoj);
  } else {
    listoIndekso = 0; // Reset the index if we show all components
  }
  progreso.style.display = 'none';

}

async function enportiSistemVortaroKomponantojn() {
  // Montru progreso dum la importado
  progreso.style.display = 'block';
  progreso.indeterminate = true;
  progreso.removeAttribute("value")
  //FETCH /sistem-vortaro.json
  const respondo = await fetch('sistem-vortaro.json');
  if (!respondo.ok) {
    throw new Error(`Eraro dum ŝarĝo de sistem-vortaro.json: ${respondo.status} ${respondo.statusText}`);
  }
  const komponantoj = await respondo.json();
  if (!Array.isArray(komponantoj)) {
    throw new Error('Sistem-vortaro.json ne enhavas validan liston de komponantoj.');
  }
  await aldoniKomponantojn(komponantoj);
  progreso.style.display = 'none';
  mdui.snackbar({ message: 'Sistem-vortaro enportita kun sukceso.' });
  // Refresh the list to show the new components
  await refreshListoKomponantoj();
  return true;
}

// -----------------------------
// <5> Aldoni / Redakti Komponanton (Form-submeto)
// -----------------------------
formularoKomponanto.addEventListener('submit', async function (evento) {
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
    // Redakti ekzistantan komponanton
    await ĝisdatigiKomponanton({
      id: aktivaRedaktadoId,
      teksto: teksto,
      tipo: tipo,
      antaŭpovas: antaŭpovasListo,
      postpovas: postpovasListo,
      difino: difino,
    });
    mdui.snackbar({ message: 'Komponanto ĝisdatita.' });
    aktivaRedaktadoId = null; // nuligi redaktadon
    montriListon(); // montri la ĝisdatitan liston
  } else {
    // Aldoni novan komponanton
    const novaKp = {
      teksto: teksto,
      tipo: tipo,
      antaŭpovas: antaŭpovasListo,
      postpovas: postpovasListo,
      difino: difino,
    };
    await aldoniKomponanton(novaKp);
    refreshListoKomponantoj();
    mdui.snackbar({
      message: 'Komponanto aldonita.',
      action: 'Montri liston',
      onActionClick: function () {
        montriListon();
      },
    });
    formularoKomponanto.reset();
  }

});

butonoNuligi.addEventListener('click', function () {
  formularoKomponanto.reset();
  aktivaRedaktadoId = null;
  titoloAldo.textContent = 'Aldoni Novan Komponanton';
});

// Redakti komponanton (plenigas formon)
async function redaktiKomponanton(id) {
  const trovita = listo.find((kp) => kp.id === id);
  if (!trovita) return;
  aktivaRedaktadoId = id;
  titoloAldo.textContent = `Redakti Komponanton: ${trovita.teksto}`;
  kompTeksto.value = trovita.teksto;
  kompTipo.value = trovita.tipo;
  kompAntaupovas.value = trovita.antaŭpovas.join(',');
  kompPostpovas.value = trovita.postpovas.join(',');
  kompDifino.value = trovita.difino;
  montriRedaktonPanelon();
}

// Forigi komponanton kun konfirmo
function forigiKomponantonKonfirmo(id) {
  mdui.confirm({
    headline: 'Forigi Komponanton?',
    description: 'Ĉu vi certe forigi ĉi tiun komponanton?',
    confirmText: '🗑️ Forigi',
    cancelText: '↩️ Nuligi',
    onConfirm: function () {
      forigiKomponanton(id)
        .then(async () => {
          mdui.snackbar({ message: 'Komponanto forigita.' });
          await refreshListoKomponantoj();
          montriListon();
        })
        .catch((er) => {
          mdui.alert({
            headline: 'Eraro dum forigo:',
            description: er.message || er,
            confirmText: 'Komprenis'
          });
        });
      refreshListoKomponantoj();
    },
    onCancel: function () {
      mdui.snackbar({ message: 'Forigo nuligita.' });
    }
  });
}

const workerSerĉi = new Worker('web-worker-serĉi.js');

serĉoVorto.addEventListener('input', serĉiVorto);

async function serĉiVorto() {
  if (!listo.length) {
    mdui.alert({
      headline: 'Neniu komponanto disponebla',
      description: 'Bonvolu aldoni komponantojn antaŭ ol serĉi.',
      confirmText: 'Komprenis',
      onConfirm: function () {
        montriListon();
      }
    });
    return;
  }
  serĉoVorto.value = xSistemonSubstituo(serĉoVorto.value)
  const teksto = serĉoVorto.value.trim().toLowerCase();
  document.getElementById('rezulto-karto').innerHTML = '';
  if (!teksto) return rezultojSerĉo.innerHTML = 'Bonvolu enigi vorton por serĉi.';
  document.title = `🔍 Serĉo de ${teksto} • VortKom`;
  const url = new URL(location);
  url.searchParams.set('vorto', teksto);
  url.searchParams.set('panelo', 'serĉo');
  history.replaceState({ panelo: 'serĉo', vorto: teksto }, '', url.toString());
  rezultojSerĉo.innerHTML = '<mdui-circular-progress></mdui-circular-progress>';
  const listoK = listo
  const ekzKom = listoK.find((kp) => kp.teksto.toLowerCase() === teksto);

  if (ekzKom) {
    rezultojSerĉo.innerHTML = ''; // purigu antaŭe
    montriKarton(ekzKom, { tekstero: ekzKom.teksto, tipo: ekzKom.tipo, difino: ekzKom.difino });
    return;
  }

  workerSerĉi.postMessage({ vorto: teksto, komponantoj: listoK });

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
      tooltip.placement = "top-start"
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
  butonoRedakti.addEventListener('click', () => redaktiKomponanton(komp.id));
  butonoj.appendChild(butonoRedakti);
  const butonoForigi = document.createElement('mdui-button-icon');
  butonoForigi.slot = 'end-icon';
  butonoForigi.innerHTML = `
      <mdui-icon>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960">
          <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
        </svg>
      </mdui-icon>`;
  butonoForigi.addEventListener('click', () => forigiKomponantonKonfirmo(komp.id));
  butonoj.appendChild(butonoForigi);
  karto.appendChild(butonoj);
  container.appendChild(karto);
}

// -----------------------------
// <7> Enporti JSON-dosieron de Komponantoj
// -----------------------------
butonoAlŝuti.addEventListener('click', () => enportiKomponantojn());

async function enportiKomponantojn(dosiero = null) {
  if (!dosiero) {
    const inputDos = document.createElement('input');
    inputDos.type = 'file';
    inputDos.accept = '.json,application/json';
    inputDos.addEventListener('change', (evento) => {
      const dos = evento.target.files[0];
      enportiKomponantojn(dos);
    });
    inputDos.click();
    return;
  }

  const legilo = new FileReader();
  legilo.onload = async function (e) {
  try {
    const enhavo = JSON.parse(e.target.result); // ✅ Assign parsed data

    if (!Array.isArray(enhavo)) {
      throw 'Ne taŭga formato: atendata estas tabelo de komponantoj.';
    }

    if (listo.length > 0) {
      mdui.confirm({
        headline: 'Ĉu vi certas?',
        description: 'Enporti novajn komponantojn forigos ĉiujn ekzistantajn komponantojn. Ĉu vi daŭrigi?',
        confirmText: 'Daŭrigi',
        cancelText: 'Nuligi',
        onConfirm: async function () {
          try {
            listoKomponantojUi.innerHTML = '';
            listoKomponantojUi.appendChild(progreso);
            progreso.style.display = 'block';
            progreso.indeterminate = true;
            progreso.removeAttribute("value");

            await forigiĈiujKomponantoj();
            progreso.indeterminate = false;
            progreso.max = enhavo.length;
            progreso.value = 0;

            await aldoniKomponantojn(enhavo); // Assuming this updates progreso.value as needed

            progreso.style.display = 'none';
            mdui.snackbar({ message: 'Komponantoj enportitaj.' });
            montriListon();
          } catch (innerError) {
            console.error('Eraro dum enporto:', innerError);
            mdui.alert({
              headline: 'Eraro dum enporto',
              description: innerError.message || innerError,
              confirmText: 'Komprenis'
            });
          } finally {
            butonoAlŝuti.loading = false;
          }
        }
      });
    } else {
      // No need for confirmation, just proceed directly
      progreso.style.display = 'block';
      progreso.indeterminate = true;
      progreso.removeAttribute("value");

      await forigiĈiujKomponantoj();
      progreso.indeterminate = false;
      progreso.max = enhavo.length;
      progreso.value = 0;

      await aldoniKomponantojn(enhavo);
      progreso.style.display = 'none';
      mdui.snackbar({ message: 'Komponantoj enportitaj.' });
      montriListon();
    }

  } catch (er) {
    console.error('Eraro dum legado de dosiero:', er);
    butonoAlŝuti.loading = false;
    mdui.alert({
      headline: 'Eraro en enporti JSON:',
      description: er.message || er,
      confirmText: 'Komprenis'
    });
  }
};

  legilo.readAsText(dosiero, 'UTF-8');
}

// -----------------------------
// <8> Elporti Komponantojn kiel JSON
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
  ligilo.download = 'vortkomponantoj.json';
  ligilo.click();
  //setTimeout(() => URL.revokeObjectURL(url), 10000);
  mdui.snackbar({ message: 'Komponantoj elportitaj.' });
});

// -----------------------------
// <9> Event-listeners por menuo
// -----------------------------
appbar.addEventListener('change', (evento) => {
  const panelo = evento.target.value;
  console.log('Ŝanĝo de panelo:', panelo);
  if (panelo === 'appbar-listo-komponantoj') {
    montriListon();
  } else if (panelo === 'appbar-serĉi') {
    montriSerĉPanelon();
  } else if (panelo === 'appbar-aldonu-nova') {
    montriAldonPanelon();
  }
}
);

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
  listo = await legiKomponantojn();
  // Montri panelon ĉe starto
  ŝargiPanelojn()
  document.querySelector('#progreso').setAttribute('style', 'display: none;');

  // Enporti .json-dosieron de la sistemo se disponebla
  if ("launchQueue" in window) {
    window.launchQueue.setConsumer(async (launchParams) => {
      if (launchParams.files && launchParams.files.length) {
        const dosieroHandle = launchParams.files[0];

        try {
          const dosiero = await dosieroHandle.getFile();
          enportiKomponantojn(dosiero);
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
