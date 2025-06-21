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

        // ── 4) Reward if antaŭpovas/postpovas match──
        let contextBonus = 0;

        // (a) if there is a last piece, and this kp lists that piece in its antaŭpovas:
        if (lastKp && Array.isArray(kp.antaŭpovas) && kp.antaŭpovas.includes(lastKp.teksto)) {
          contextBonus += 3;
        }

        // (b) if the recursive tail begins with a piece that this kp allows after it:
        const suffix = restas.substring(t.length);
        const newUsed = new Set(usedIds);
        newUsed.add(kp.id);
        const tail = helper(suffix, kp, newUsed);

        if (Array.isArray(tail) && tail.length > 0) {
          const nextKp = tail[0].komp;
          if (nextKp &&
              Array.isArray(kp.postpovas) &&
              kp.postpovas.includes(nextKp.teksto)) {
            contextBonus += 3;
          }
        }
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


        // 7.4) Bonus if there is at least one prefix anywhere
        let prefixBonus = 0;
        for (const piece of thisParse) {
          if (piece.komp.tipo === "prefikso") {
            prefixBonus = 1;
            break;
          }
        }

        const uniqueKompList = ["o", "a", "e", "i", "u"];
        let uniqueKompMatches = 0;

        // First and only loop to count total matches of uniqueKompList
        thisParse.forEach(piece => {
          const text = piece.komp.teksto.toLowerCase();
          if (uniqueKompList.includes(text)) {
            uniqueKompMatches++;
          }
        });

        // Apply penalty only if more than one match
        suffixPenalty += uniqueKompMatches > 1 ? uniqueKompMatches * 3 : -1;

        // 7.7) Final score
        let score =
          baseCount - suffixPenalty - radikoChainPenalty + prefixBonus - hardPenalty + contextBonus;
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

      memo.set(cacheKey, bestParse);
      return bestParse;
    }

    return helper(vorto.toLowerCase(), null, new Set());
  }
  const rezulto = dekomponi(vorto, komponantoj);
  self.postMessage(rezulto);
});
