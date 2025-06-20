self.addEventListener("message", (e) => {
  const { vorto, komponantoj } = e.data;

  /**
   * Decompose `vorto` into a sequence of komponantoj.
   * We do a recursive DP that chooses, among all valid segmentations,
   * the one with the greatest number of pieces.
   *
   * @param {string} vorto             — the word to split (can be uppercase; we lowercase)
   * @param {Array<Object>} listoKomp  — list of { id, teksto, tipo, antaŭpovas, postpovas, difino, … }
   * @returns {Array<{komp:kp,mapado:{tekstero,tipo,difino}}>}
   */
  function dekomponi(vorto, listoKomp) {
    listoKomp.sort((A, B) => {
  // First put **longer** teksto before shorter teksto (fix "Malsanulejo")
  if (A.teksto.length !== B.teksto.length) {
    return B.teksto.length - A.teksto.length;
  }
  return A.teksto.localeCompare(B.teksto);
});

    const memo = new Map();

    /**
     * @param {string} restas      — the unparsed suffix (always lowercase)
     * @param {Object|null} lastKp — the previous komponanto (or null at start)
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
      let bestScore = -Infinity;
      const lowerRest = restas.toLowerCase();

      for (const kp of listoKomp) {
        // ── 1) DISALLOW “sufikso” AT THE VERY START ──
        if (!lastKp && kp.tipo === "sufikso") {
          continue;
        }

        // ─── 1.5) NO REPEATING EXACTLY THE SAME teksto TWICE IN A ROW ───
        if (lastKp && kp.teksto.toLowerCase() === lastKp.teksto.toLowerCase()) {
          // If the previous piece was “o” and this candidate is also “o,” skip it.
          continue;
        }

        // ── 2) Must match text at front ──
        const t = kp.teksto.toLowerCase();
        if (!lowerRest.startsWith(t)) {
          continue;
        }

        // ── 3) tipo‐ordering ──

        let hardPenalty = 0;
        if (lastKp && lastKp.tipo === "radiko" && kp.tipo === "prefikso") {
          hardPenalty += 2
        }
        if (lastKp && lastKp.tipo === "sufikso" && kp.tipo !== "sufikso") {
          hardPenalty += 1
        }

        // ── 4) antaŭpovas/postpovas ──
        if (lastKp) {
          if (
            kp.antaŭpovas.length > 0 &&
            !kp.antaŭpovas.includes(lastKp.tipo) &&
            !kp.antaŭpovas.includes(lastKp.teksto)
          ) {
            hardPenalty += 1;
          }
          if (
            lastKp.postpovas.length > 0 &&
            !lastKp.postpovas.includes(kp.tipo) &&
            !lastKp.postpovas.includes(kp.teksto)
          ) {
            hardPenalty += 1;
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

        // ── 7) Build the tentative parse ──
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

        // 7.1) Base piece count
        const baseCount = thisParse.length;

        // 7.2) Penalty if last piece is NOT a suffix
        let suffixPenalty = 0;
        const lastPiece = thisParse[baseCount - 1].komp;
        if (lastPiece.tipo !== "sufikso") {
          suffixPenalty = 1;
        }

        // 7.3) Penalty for each consecutive “radiko→radiko”
        let radikoChainPenalty = 0;
        for (let i = 1; i < baseCount; i++) {
          const prevType = thisParse[i - 1].komp.tipo;
          const currType = thisParse[i].komp.tipo;
          if (prevType === "radiko" && currType === "radiko") {
            radikoChainPenalty++;
          }
        }
        // 7.3.1) Penalty for each consecutive “sufikso→sufikso”
let suffixChainPenalty = 0;
for (let i = 1; i < thisParse.length; i++) {
  const prev = thisParse[i - 1].komp.tipo;
  const curr = thisParse[i].komp.tipo;
  if (prev === "sufikso" && curr === "sufikso") suffixChainPenalty++;
}

        // 7.4) Bonus if there is at least one prefix anywhere
        let prefixBonus = 0;
        for (const piece of thisParse) {
          if (piece.komp.tipo === "prefikso") {
            prefixBonus = 1;
            break;
          }
        }

        // 7.5) Final score
        let score =
          baseCount - suffixPenalty - radikoChainPenalty + prefixBonus - hardPenalty - suffixChainPenalty;
        // Determine if parse = prefikso* radiko+ sufikso*
        let types = thisParse.map(p => p.komp.tipo);
        let firstRad = types.findIndex(t => t === "radiko");
        let lastRad = types.map((t, i) => t === "radiko" ? i : null)
          .filter(i => i !== null).pop();

        // If there's at least one radiko and all before are prefixes and all after rad are suffixes
        if (firstRad >= 0
          && types.slice(0, firstRad).every(t => t === "prefikso")
          && types.slice(firstRad, lastRad + 1).every(t => t === "radiko")
          && types.slice(lastRad + 1).every(t => t === "sufikso")) {
          // give a healthy bonus so these “canonical” parses win
          score += 3;
        }

        // 7.6) Compare to bestScore, not just piece‐count
        if (score > bestScore) {
          bestScore = score;
          bestParse = thisParse;
        } else if (score === bestScore) {
          // Optional tie-breaker: shorter first komponanto wins
          const oldFirstLen = bestParse[0].komp.teksto.length;
          const newFirstLen = thisParse[0].komp.teksto.length;
          if (newFirstLen < oldFirstLen) {
            bestParse = thisParse;
          }
        }
      }


      // ── 8) If nothing valid, emit a single “❌ restas” chunk ──
      if (bestParse === null) {
        bestParse = [
          {
            mapado: {
              tekstero: `❌ ${restas}`,
              tipo: "???",
              difino: "Ne valida sekvo aŭ komponanto",
            },
          },
        ];
      }

      // ── 9) If bestParse starts with a “prefikso” OR “radiko,” see if a strictly longer radiko can override ──
      // (i.e. prefer “neni”→… over “ne”→… in “neniu”)
      if (
        bestParse.length > 0 &&
        bestParse[0].komp !== undefined &&
        (bestParse[0].komp.tipo === "prefikso" || bestParse[0].komp.tipo === "radiko")
      ) {
        const first = bestParse[0].komp;
        const firstText = first.teksto.toLowerCase();
        const firstLen = firstText.length;

        // Look for any radiko that starts here and is strictly longer
        for (const kpRad of listoKomp) {
          if (kpRad.tipo !== "radiko") continue;
          const radText = kpRad.teksto.toLowerCase();
          if (
            restas.toLowerCase().startsWith(radText) &&
            radText.length > firstLen
          ) {
            // Re‐parse using this longer radiko
            const newUsed = new Set(usedIds);
            newUsed.add(kpRad.id);
            const afterRad = restas.substring(radText.length);
            const tail2 = helper(afterRad, kpRad, newUsed);

            if (
              Array.isArray(tail2) &&
              !(tail2.length === 1 && tail2[0].mapado.tipo === "???")
            ) {
              bestParse = [
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
              break;
            }
          }
        }
      }

      memo.set(cacheKey, bestParse);
      return bestParse;
    }

    return helper(vorto.toLowerCase(), null, new Set());
  }
  const rezulto = dekomponi(vorto, komponantoj);
  self.postMessage(rezulto);
});
