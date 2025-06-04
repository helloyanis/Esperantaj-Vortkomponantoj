self.addEventListener("message", (e) => {
  const { vorto, komponentoj } = e.data;

  /**
   * Decompose `vorto` into a sequence of komponentoj.
   * We do a recursive DP that chooses, among all valid segmentations,
   * the one with the greatest number of pieces.
   *
   * @param {string} vorto             — the word to split (can be uppercase; we lowercase)
   * @param {Array<Object>} listoKomp  — list of { id, teksto, tipo, antaŭpovas, postpovas, difino, … }
   * @returns {Array<{komp:kp,mapado:{tekstero,tipo,difino}}>}
   */
    function dekomponi(vorto, listoKomp) {
      const memo = new Map();

      /**
       * @param {string} restas      — the unparsed suffix (always lowercase)
       * @param {Object|null} lastKp — the previous komponento (or null at start)
       * @param {Set<string>} usedIds — set of kp.id’s already used
       * @returns {Array<{komp:kp,mapado:{tekstero,tipo,difino}}> | null}
       *     The best (max‐pieces) decomposition of restas, or null if none is valid.
       */
      function helper(restas, lastKp, usedIds) {
        const keyLast = lastKp ? lastKp.id : "__START__";
        const keyUsed = Array.from(usedIds).sort().join(",");
        const cacheKey = restas + "|" + keyLast + "|" + keyUsed;
        if (memo.has(cacheKey)) {
          return memo.get(cacheKey);
        }
        if (restas === "") {
          memo.set(cacheKey, []);
          return [];
        }

        let bestParse = null;
        let bestCount = -1;
        const lowerRest = restas.toLowerCase();

        for (const kp of listoKomp) {
          // ── 1) DISALLOW “sufikso” AT THE VERY START ──
          if (!lastKp && kp.tipo === "sufikso") {
            continue;
          }

          // ── 2) Must match text at front ──
          const t = kp.teksto.toLowerCase();
          if (!lowerRest.startsWith(t)) {
            continue;
          }

          // ── 3) tipo‐ordering ──
          if (lastKp && lastKp.tipo === "radiko" && kp.tipo === "prefikso") {
            continue;
          }
          if (lastKp && lastKp.tipo === "sufikso" && kp.tipo !== "sufikso") {
            continue;
          }

          // ── 4) antaŭpovas/postpovas ──
          if (lastKp) {
            if (
              kp.antaŭpovas.length > 0 &&
              !kp.antaŭpovas.includes(lastKp.tipo) &&
              !kp.antaŭpovas.includes(lastKp.teksto)
            ) {
              continue;
            }
            if (
              lastKp.postpovas.length > 0 &&
              !lastKp.postpovas.includes(kp.tipo) &&
              !lastKp.postpovas.includes(kp.teksto)
            ) {
              continue;
            }
          }

          // ── 5) Recurse on the remainder ──
          const suffix = restas.substring(t.length);
          const newUsed = new Set(usedIds);
          newUsed.add(kp.id);
          const tail = helper(suffix, kp, newUsed);

          // ── 6) DROP any candidate that immediately leads to “❌ …” ──
          // If `tail` is exactly a single “failure” piece, treat it as invalid.
          if (
            Array.isArray(tail) &&
            tail.length === 1 &&
            tail[0].mapado &&
            tail[0].mapado.tipo === "???"
          ) {
            continue;
          }

          // ── 7) Score this candidate ──
          const thisParse = [
            {
              komp: kp,
              mapado: {
                tekstero: kp.teksto,
                tipo: kp.tipo,
                difino: kp.difino,
              },
            },
            ...tail,
          ];
          const count = thisParse.length;
          if (count > bestCount) {
            bestCount = count;
            bestParse = thisParse;
          }
        }

        // ── 8) If nothing valid, emit a single “❌ restas” chunk ──
        if (bestParse === null) {
          bestParse = [
            {
              mapado: {
                tekstero: `❌ ${restas}`,
                tipo: "???",
                difino: "Ne valida sekvo aŭ komponento",
              },
            },
          ];
        }

        // ── 9) If bestParse starts with a “prefikso,” see if a longer radiko can override ──
        //       (i.e. prefer “neni”→… over “ne”→… in “neniu”)
        if (
            bestParse.length > 0 &&
            bestParse[0].komp !== undefined &&
            bestParse[0].komp.tipo === "prefikso"
        ) {
          const prefikso = bestParse[0].komp;
          const prefLen = prefikso.teksto.length;

          // Look for any radiko in listoKomp that:
          //  - starts at the same position (“restas.startsWith(radiko.teksto)”)
          //  - is strictly longer than this prefikso
          let overrideParse = null;
          for (const kpRad of listoKomp) {
            if (kpRad.tipo !== "radiko") continue;
            const radText = kpRad.teksto.toLowerCase();
            if (
              restas.toLowerCase().startsWith(radText) &&
              radText.length > prefLen
            ) {
              // Try re‐parsing under this longer radiko
              const newUsed2 = new Set(usedIds);
              newUsed2.add(kpRad.id);
              const suffixAfterRad = restas.substring(radText.length);
              const tail2 = helper(suffixAfterRad, kpRad, newUsed2);

              // If that tail2 is not a single‐failure parse, we accept it
              if (
                Array.isArray(tail2) &&
                !(tail2.length === 1 && tail2[0].mapado.tipo === "???")
              ) {
                overrideParse = [
                  {
                    komp: kpRad,
                    mapado: {
                      tekstero: kpRad.teksto,
                      tipo: kpRad.tipo,
                      difino: kpRad.difino,
                    },
                  },
                  ...tail2,
                ];
                break; // we found a longer‐radiko override; stop searching
              }
            }
          }

          if (overrideParse) {
            bestParse = overrideParse;
          }
        }

        memo.set(cacheKey, bestParse);
        return bestParse;
      }

      return helper(vorto.toLowerCase(), null, new Set());
    }
  const rezulto = dekomponi(vorto, komponentoj);
  self.postMessage(rezulto);
});
