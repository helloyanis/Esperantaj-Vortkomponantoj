self.addEventListener("message", (e) => {
  const { vorto, komponentoj } = e.data;

  function dekomponi(vorto, listoKomp) {
    let restas = vorto.toLowerCase();
    const rezulto = [];
    let lastTipo = null;
    const uzitajKomponentoj = new Set();

    while (restas.length > 0) {
      // 1) collect all candidates that match the current 'restas'
      let kandidatoj = [];
      for (const kp of listoKomp) {
        const tek = kp.teksto.toLowerCase();
        if (!restas.startsWith(tek)) continue;
        if (uzitajKomponentoj.has(kp.id)) continue;

        // Enforce tipo‐ordering
        if (
          lastTipo === "radiko" && kp.tipo === "prefikso"
        ) {
          continue;
        }
        if (
          lastTipo === "sufikso" && kp.tipo !== "sufikso"
        ) {
          continue;
        }

        // Enforce antaŭpovas/postpovas
        if (rezulto.length > 0) {
          const lastKomp = rezulto[rezulto.length - 1].komp;
          if (
            kp.antaŭpovas.length > 0 &&
            !kp.antaŭpovas.includes(lastKomp.tipo) &&
            !kp.antaŭpovas.includes(lastKomp.teksto)
          ) {
            continue;
          }
          if (
            lastKomp.postpovas.length > 0 &&
            !lastKomp.postpovas.includes(kp.tipo) &&
            !lastKomp.postpovas.includes(kp.teksto)
          ) {
            continue;
          }
        }

        kandidatoj.push(kp);
      }

      if (kandidatoj.length === 0) {
        rezulto.push({
          mapado: {
            tekstero: `❌ ${restas}`,
            tipo: "???",
            difino: "Ne valida sekvo aŭ komponento",
          },
        });
        break;
      }

      // 2.1) SPECIAL RULE for “on vs. o + n”
      //
      // If “on” is in kandidatoj, check if we are also able to parse restas = "on"
      // as the two‐step sequence “o” then “n,” under the same antaŭpovas/postpovas rules.
      const onKp = kandidatoj.find((k) => k.teksto.toLowerCase() === "on");
      if (onKp) {
        // see if we also have “o” and “n” in our component set:
        const oKp = kandidatoj.find((k) => k.teksto.toLowerCase() === "o");
        // We only look up “n” if “o” matched, because we want “n” to come after “o.”
        let nKp = null;
        if (oKp && restas.length === 2) {
          // if restas = "on", then after taking “o” we'd have restas = "n"
          nKp = listoKomp.find(
            (k) =>
              k.teksto.toLowerCase() === "n" &&
              // ensure “n” can follow “o” (postpovas/antaŭpovas)
              ((oKp.postpovas.length === 0 ||
                oKp.postpovas.includes("n") ||
                oKp.postpovas.includes("n")) &&
               (k.antaŭpovas.length === 0 ||
                k.antaŭpovas.includes(oKp.tipo) ||
                k.antaŭpovas.includes(oKp.teksto)))
          );
        }

        if (oKp && nKp) {
          // “on” can be split into “o”+“n” in a rule‐compliant way → so FORCE “o”
          kandidatoj = [oKp];
        }
      }
      // 2.2) Do the same for “an vs. a + n”
      const anKp = kandidatoj.find((k) => k.teksto.toLowerCase() === "an");
      if (anKp) {
        // see if we also have “a” and “n” in our component set:
        const aKp = kandidatoj.find((k) => k.teksto.toLowerCase() === "a");
        // We only look up “n” if “a” matched, because we want “n” to come after “a.”
        let nKp = null;
        if (aKp && restas.length === 2) {
          // if restas = "an", then after taking “a” we'd have restas = "n"
          nKp = listoKomp.find(
            (k) =>
              k.teksto.toLowerCase() === "n" &&
              // ensure “n” can follow “a” (postpovas/antaŭpovas)
              ((aKp.postpovas.length === 0 ||
                aKp.postpovas.includes("n") ||
                aKp.postpovas.includes("n")) &&
               (k.antaŭpovas.length === 0 ||
                k.antaŭpovas.includes(aKp.tipo) ||
                k.antaŭpovas.includes(aKp.teksto)))
          );
        }

        if (aKp && nKp) {
          // “an” can be split into “o”+“n” in a rule‐compliant way → so FORCE “a”
          kandidatoj = [aKp];
        }
      }

      // 3) Pick the single longest (or the only one if we forced “o”)  
      let plejLonga = kandidatoj[0];
      for (const kp of kandidatoj.slice(1)) {
        if (kp.teksto.length > plejLonga.teksto.length) {
          plejLonga = kp;
        }
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

  const rezulto = dekomponi(vorto, komponentoj);
  self.postMessage(rezulto);
});
