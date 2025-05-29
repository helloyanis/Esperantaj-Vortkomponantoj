self.addEventListener('message', (e) => {
  const { vorto, komponentoj } = e.data;

  function dekomponiKunReguloj(vorto, listoKomp) {
    const restVorto = vorto.toLowerCase();
    const rezulto = [];

    let restas = restVorto;
    let lastTipo = null;
    let uzitajKomponentoj = new Set();

    while (restas.length > 0) {
      let plejLonga = null;

      for (const kp of listoKomp) {
        const tek = kp.teksto.toLowerCase();
        if (!restas.startsWith(tek)) continue;
        if (uzitajKomponentoj.has(kp.id)) continue;

        // Enforce order
        if (
          lastTipo === "radiko" && kp.tipo === "prefikso" ||
          lastTipo === "sufikso" && kp.tipo !== "sufikso"
        ) continue;

        // Enforce antaŭpovas/postpovas
        if (lastTipo && !kp.antaŭpovas.includes(lastTipo) && kp.antaŭpovas.length > 0)
          continue;
        if (
          rezulto.length > 0 &&
          !rezulto[rezulto.length - 1].komp.postpovas.includes(kp.tipo) &&
          rezulto[rezulto.length - 1].komp.postpovas.length > 0
        )
          continue;

        if (!plejLonga || tek.length > plejLonga.teksto.length) {
          plejLonga = kp;
        }
      }

      if (!plejLonga) {
        rezulto.push({
          mapado: {
            tekstero: `❌ ${restas}`,
            tipo: '???',
            difino: 'Ne valida sekvo aŭ komponento',
          },
        });
        break;
      }

      uzitajKomponentoj.add(plejLonga.id);
      rezulto.push({
        komp: plejLonga,
        mapado: {
          tekstero: plejLonga.teksto,
          tipo: plejLonga.tipo,
          difino: plejLonga.difino,
        },
      });

      lastTipo = plejLonga.tipo;
      restas = restas.substring(plejLonga.teksto.length);
    }

    return rezulto;
  }

  const rezulto = dekomponiKunReguloj(vorto, komponentoj);
  self.postMessage(rezulto);
});
