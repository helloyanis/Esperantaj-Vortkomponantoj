// =============================
// Fengŝu: “Esperanto Vortkomponentoj”
// Ĉi tiu dosiero enhavas la logikon por:
// - Stoki, legi, ĝisdatigi, forigi vortkomponentojn en LocalStorage.
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

  // -----------------------------
  // <2> Funkcioj por Manipuli LokaStokejo
  // -----------------------------
  /**
   * Legas ĉiujn vortkomponentojn el localStorage kaj returnas kiel tablo.
   * Se ne ekzistas, returnas malplenan liston.
   */
  function legiKomponentojn() {
    const json = localStorage.getItem(ŝlosiloKomponentoj);
    if (!json) {
      return [];
    }
    try {
      return JSON.parse(json);
    } catch (eraro) {
      console.error('Eraro dum legi JSON el stokejo:', eraro);
      return [];
    }
  }

  /**
   * Skribas la liston de komponantoj al localStorage.
   * @param {Array<Object>} listo – listo de komponantoj.
   */
  function skribiKomponentojn(listo) {
    const json = JSON.stringify(listo);
    localStorage.setItem(ŝlosiloKomponentoj, json);
  }

  /**
   * Kreu unikajn identigilon por komponanto (UUID-simila).
   */
  function kreiUnikanId() {
    // Simpligita UUID (ne perfektigita, sed utila ĉi tie)
    return 'xxyxxy'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
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
  }

  function montriAldonPanelon() {
    kaŝiĈiujPaneloj();
    paneloAldo.removeAttribute('hidden');
    // resetu formon
    formularoKomponento.reset();
    aktivaRedaktadoId = null;
    titoloAldo.textContent = 'Aldoni Novan Komponenton';
  }

  function montriSerĉPanelon() {
    kaŝiĈiujPaneloj();
    paneloSerĉo.removeAttribute('hidden');
    rezultojSerĉo.innerHTML = '';
    serĉoVorto.value = '';
  }

  montriSerĉPanelon();

  // -----------------------------
  // <4> Montri Liston de Komponentoj
  // -----------------------------
  function refreshListoKomponentoj() {
    const listo = legiKomponentojn();
    listoKomponentojUi.innerHTML = ''; // purigu antaŭe
    if (listo.length === 0) {
      const neEkzistas = document.createElement('mdui-card');
      neEkzistas.Text = 'Neniaj komponantoj trovitaj.';
      const aldoniButono = document.createElement('mdui-button');
      aldoniButono.textContent = 'Aldoni Komponenton';
      listoKomponentojUi.appendChild(neEkzistas);
      return;
    }
    listo.forEach((komp) => {
      const linio = document.createElement('li');
      linio.className = 'mdui-list-item mdui-ripple';

      // Teksto de komponanto kaj tipo
      const enhavo = document.createElement('div');
      enhavo.className = 'mdui-list-item-content';
      enhavo.textContent = `${komp.teksto} (${komp.tipo})`;

      // Butonoj Redakti kaj Forigi
      const butonoGrupe = document.createElement('div');
      butonoGrupe.className = 'mdui-btn mdui-btn-icon';
      butonoGrupe.style.marginLeft = 'auto';

      const butonoRedakti = document.createElement('button');
      butonoRedakti.className = 'mdui-btn mdui-ripple';
      butonoRedakti.innerHTML = '<i class="mdui-icon material-icons">edit</i>';
      butonoRedakti.addEventListener('click', () => redaktiKomponenton(komp.id));

      const butonoForigi = document.createElement('button');
      butonoForigi.className = 'mdui-btn mdui-ripple';
      butonoForigi.innerHTML = '<i class="mdui-icon material-icons">delete</i>';
      butonoForigi.addEventListener('click', () => forigiKomponenton(komp.id));

      butonoGrupe.appendChild(butonoRedakti);
      butonoGrupe.appendChild(butonoForigi);

      linio.appendChild(enhavo);
      linio.appendChild(butonoGrupe);
      listoKomponentojUi.appendChild(linio);
    });
  }

  // -----------------------------
  // <5> Aldoni / Redakti Komponenton (Form-submeto)
  // -----------------------------
  formularoKomponento.addEventListener('submit', function (evento) {
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

    if (!teksto) {
      mdui.alert('Bonvolu enigi la tekston de la komponanto.', 'Mankas Teksto');
      return;
    }
    if (!difino) {
      mdui.alert('Bonvolu enigi difinon por la komponanto.', 'Mankas Difino');
      return;
    }

    let listo = legiKomponentojn();

    if (aktivaRedaktadoId) {
      // Redakti ekzistantan komponenton
      listo = listo.map((kp) => {
        if (kp.id === aktivaRedaktadoId) {
          return {
            id: kp.id,
            teksto: teksto,
            tipo: tipo,
            antaŭpovas: antaŭpovasListo,
            postpovas: postpovasListo,
            difino: difino,
          };
        }
        return kp;
      });
      mdui.snackbar({ message: 'Komponento ĝisdatita.' });
    } else {
      // Aldoni novan komponenton
      const novaKp = {
        id: kreiUnikanId(),
        teksto: teksto,
        tipo: tipo,
        antaŭpovas: antaŭpovasListo,
        postpovas: postpovasListo,
        difino: difino,
      };
      listo.push(novaKp);
      mdui.snackbar({ message: 'Komponento aldonita.' });
    }

    skribiKomponentojn(listo);
    montriListon();
  });

  butonoNuligi.addEventListener('click', function () {
    formularoKomponento.reset();
    aktivaRedaktadoId = null;
    titoloAldo.textContent = 'Aldoni Novan Komponenton';
  });

  // Redakti komponanton (plenigas formon)
  function redaktiKomponenton(id) {
    const listo = legiKomponentojn();
    const trovita = listo.find((kp) => kp.id === id);
    if (!trovita) return;
    aktivaRedaktadoId = id;
    titoloAldo.textContent = `Redakti Komponenton: ${trovita.teksto}`;
    kompTeksto.value = trovita.teksto;
    kompTipo.value = trovita.tipo;
    kompAntaupovas.value = trovita.antaŭpovas.join(',');
    kompPostpovas.value = trovita.postpovas.join(',');
    kompDifino.value = trovita.difino;
    montriAldonPanelon();
  }

  // Forigi komponanton kun konfirmo
  function forigiKomponenton(id) {
    mdui.confirm(
      'Ĉu vi certe forigi ĉi tiun komponanton?',
      'Forigi Komponenton',
      function () {
        let listo = legiKomponentojn();
        listo = listo.filter((kp) => kp.id !== id);
        skribiKomponentojn(listo);
        mdui.snackbar({ message: 'Komponento forigita.' });
        refreshListoKomponentoj();
      },
      function () {
        // nuligi
      }
    );
  }

  // -----------------------------
  // <6> Serĉo de Tuta Vorto
  // -----------------------------
  /**
   * Funkcio por “dekomponi” vorton en vortkomponentojn, unuavice trovi la plej longan
   * kombinaĵon ĉe la komenco, tiam pluan, ktp. Ĉi tio estas simpla heuristika.
   *
   * @param {string} vorto – la plene kunmetita vorto (ekz: malgrandajn)
   * @returns {Array<Object>} listo de objektoj kun {komp, mapado} kie
   *          komp estas la komponento-objekto, kaj mapado = {tekstero, tipo, difino}.
   *          Se ne troviĝis plua komponanto, ĉesas.
   */

  const worker = new Worker('web-worker.js');

serĉoVorto.addEventListener('input', serĉiVorto);

function serĉiVorto() {
  const teksto = serĉoVorto.value.trim().toLowerCase();
  rezultojSerĉo.innerHTML = '';
  if (!teksto) {
    //mdui.alert('Enigu vorton aŭ komponenton por serĉi.', 'Serĉo Malplena');
    return;
  }

  const listoK = legiKomponentojn();
  const ekzKom = listoK.find((kp) => kp.teksto.toLowerCase() === teksto);

  if (ekzKom) {
    // Montru la komponanton per ĝia difino
      const karto = document.createElement('div');
      karto.className = 'mdui-card mdui-m-y-2';
      karto.innerHTML = `
        <div class="mdui-card-primary">
          <div class="mdui-card-primary-title">${ekzKom.teksto} (${ekzKom.tipo})</div>
        </div>
        <div class="mdui-card-content">
          <p><strong>Difino:</strong> ${ekzKom.difino}</p>
          <p><strong>Antaŭpovas:</strong> ${ekzKom.antaŭpovas.join(', ') || 'neniu restrikto'}</p>
          <p><strong>Postpovas:</strong> ${ekzKom.postpovas.join(', ') || 'neniu restrikto'}</p>
        </div>
      `;
      rezultojSerĉo.appendChild(karto);
      return;
  }

  // Now use worker
  worker.postMessage({ vorto: teksto, komponentoj: listoK });

  worker.onmessage = function (e) {
    const deko = e.data;

    if (deko.length === 0) {
      rezultojSerĉo.textContent = 'Neniaj rezultoj trovita.';
      return;
    }

    const titolo = document.createElement('h3');
    titolo.className = 'mdui-typo-subheading';
    titolo.textContent = `Dekomponado de “${teksto}”:`;
    rezultojSerĉo.appendChild(titolo);
    const kartoj = document.createElement('div');
    kartoj.style.display = 'flex';
    deko.forEach((ero) => {
      const karto = document.createElement('div');
      karto.className = 'mdui-card mdui-m-y-1';
      if (ero.komp) {
        karto.innerHTML = `
          <mdui-tooltip content="${ero.komp.difino}">
            <mdui-chip variant="filter" onclick="document.getElementById('serĉo-vorto').value='${ero.mapado.tekstero}'; serĉiVorto()">${ero.mapado.tekstero}</mdui-chip>
          </mdui-tooltip>
        `;
      } else {
        karto.innerHTML = `
          <div class="mdui-card-primary">
            <div class="mdui-card-primary-title">${ero.mapado.tekstero} (neniu)</div>
          </div>
          <div class="mdui-card-content">
            <p>${ero.mapado.difino}</p>
          </div>
        `;
      }
      kartoj.appendChild(karto);
    });
    rezultojSerĉo.appendChild(kartoj);
  };
}

  // -----------------------------
  // <7> Importi JSON-dosieron de Komponentoj
  // -----------------------------
  butonoAlŝuti.addEventListener('click', () => {
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
          skribiKomponentojn(enhavo);
          mdui.snackbar({ message: 'Komponentoj importitaj.' });
          montriListon();
        } catch (er) {
          mdui.alert('Eraro en importi JSON: ' + er, 'Importa Eraro');
        }
      };
      legilo.readAsText(dos, 'UTF-8');
    });
    // "kliku" por malfermi dosier-Dialogon
    inputDos.click();
  });

  // -----------------------------
  // <8> Eksporti Komponentojn kiel JSON
  // -----------------------------
  butonoEkspremi.addEventListener('click', () => {
    const listo = legiKomponentojn();
    const json = JSON.stringify(listo, null, 2);
    const dosBlob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(dosBlob);
    const ligilo = document.createElement('a');
    ligilo.href = url;
    ligilo.download = 'vortkomponentoj.json';
    ligilo.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    mdui.snackbar({ message: 'Komponentoj eksportitaj.' });
  });

  // -----------------------------
  // <9> Event-listeners por menuo
  // -----------------------------
  menuListoKomponentoj.addEventListener('click', montriListon);
  menuAldonuNova.addEventListener('click', montriAldonPanelon);
  menuSerĉi.addEventListener('click', montriSerĉPanelon);

  // Montri liston ĉe starto
  montriListon();

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
