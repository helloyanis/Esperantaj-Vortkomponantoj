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
   * @param {string} restas      – the unparsed suffix (always lowercase)
   * @param {Object|null} lastKp – the previous komponento (or null if at start)
   * @param {Set<string>} usedIds – set of kp.id’s already used
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
      // ─── 1) DISALLOW “sufikso” AT THE VERY START ───
      if (!lastKp && kp.tipo === "sufikso") {
        // If this is the first piece (lastKp===null), we cannot pick a suffix.
        continue;
      }

      // ─── 2) Must match text at front ───
      const t = kp.teksto.toLowerCase();
      if (!lowerRest.startsWith(t)) {
        continue;
      }

      // ─── 3) tipo‐ordering ───
      if (lastKp && lastKp.tipo === "radiko" && kp.tipo === "prefikso") {
        continue;
      }
      if (lastKp && lastKp.tipo === "sufikso" && kp.tipo !== "sufikso") {
        continue;
      }

      // ─── 4) antaŭpovas/postpovas ───
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

      // ─── 5) Recurse on the remainder ───
      const suffix = restas.substring(t.length);
      const newUsed = new Set(usedIds);
      newUsed.add(kp.id);
      const tail = helper(suffix, kp, newUsed);

      if (tail !== null) {
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
    }

    // No valid segmentation → emit a “❌ restas” chunk
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

    memo.set(cacheKey, bestParse);
    return bestParse;
  }

  return helper(vorto.toLowerCase(), null, new Set());
  }

  const rezulto = dekomponi(vorto, komponentoj);
  self.postMessage(rezulto);
});
