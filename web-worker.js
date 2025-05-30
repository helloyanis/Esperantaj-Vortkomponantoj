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

        // Enforce antaŭpovas/postpovas with type OR text match
        if (rezulto.length > 0) {
          const lastKomp = rezulto[rezulto.length - 1].komp;

          // Check if kp is allowed to come after lastKomp
          const allowedBefore = kp.antaŭpovas;
          if (
            allowedBefore.length > 0 &&
            !allowedBefore.includes(lastKomp.tipo) &&
            !allowedBefore.includes(lastKomp.teksto)
          ) continue;

          // Check if lastKomp is allowed to be followed by kp
          const allowedAfter = lastKomp.postpovas;
          if (
            allowedAfter.length > 0 &&
            !allowedAfter.includes(kp.tipo) &&
            !allowedAfter.includes(kp.teksto)
          ) continue;
        }


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
