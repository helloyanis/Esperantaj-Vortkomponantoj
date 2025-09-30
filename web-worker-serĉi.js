self.addEventListener("message", (e) => {
  const { vorto, komponantoj } = e.data;

  // Pre-sort components by descending length, tie-breaker lexicographically
  komponantoj.sort((A, B) =>
    B.teksto.length !== A.teksto.length
      ? B.teksto.length - A.teksto.length
      : A.teksto.localeCompare(B.teksto)
  );

  const memo = new Map();

  // Return an array of *all* valid parses for (restas, lastKp, usedIds)
  function helper(restas, lastKp, usedIds) {
    const lastKey = lastKp ? lastKp.id : "__START__";
    const usedKey = [...usedIds].sort().join(",");
    const cacheKey = `${restas}|${lastKey}|${usedKey}`;
    if (memo.has(cacheKey)) return memo.get(cacheKey);

    // Base case: perfectly consumed
    if (!restas) {
      memo.set(cacheKey, [[]]);  // one empty parse
      return [[]];
    }

    const lower = restas.toLowerCase();
    const candidates = komponantoj.filter(kp => {
      const t = kp.teksto.toLowerCase();
      if (!lower.startsWith(t)) return false;
      if (!lastKp && kp.tipo === "sufikso") return false;
      if (lastKp && lastKp.teksto.toLowerCase() === t) return false;
      return true;
    });

    // If no candidates, return one “failure” parse
    if (candidates.length === 0) {
      const failParse = [{
        mapado: {
          tekstero: `❌ ${restas}`,
          tipo: "???",
          difino: "Ne valida sekvo aŭ komponanto"
        }
      }];
      memo.set(cacheKey, [failParse]);
      return [failParse];
    }

    // Build *all* parses by recursing on each candidate
    const allParses = [];
    for (const kp of candidates) {
      const t = kp.teksto.toLowerCase();
      const suffix = restas.slice(t.length);
      const newUsed = new Set(usedIds);
      newUsed.add(kp.id);

      const tailParses = helper(suffix, kp, newUsed);
      for (const tail of tailParses) {
        // skip pure failure
        if (tail.length === 1 && tail[0].mapado.tipo === "???") continue;
        allParses.push([
          { komp: kp, mapado: { tekstero: kp.teksto, tipo: kp.tipo, difino: kp.difino } },
          ...tail
        ]);
      }
    }

    memo.set(cacheKey, allParses);
    return allParses;
  }

  function scoreParse(parseArr) {
    if (parseArr.some(p => !p.komp)) return -Infinity;
    const singles = new Set(["o","a","e","i","u"]);
    const baseCount = parseArr.length;
    let suffixPenalty = 0, radikoChainPenalty = 0;
    let prefixBonus = 0, hardPenalty = 0, contextBonus = 0, uniquePenalty = 0;


    for (let i = 0; i < parseArr.length; i++) {
      const kp = parseArr[i].komp;
      const prev = i > 0 ? parseArr[i-1].komp : null;
      const next = i < parseArr.length-1 ? parseArr[i+1].komp : null;

      if (prev && prev.tipo === "radiko"   && kp.tipo === "prefikso") hardPenalty += 5;
      if (prev && prev.tipo === "radiko"   && kp.tipo === "radiko") hardPenalty += 2;
      if (prev && prev.tipo === "sufikso"  && kp.tipo === "prefikso") hardPenalty += 2;
      if (prev && prev.tipo === "sufikso" && kp.tipo === "sufikso") suffixPenalty ++;
      if (prev && prev.tipo === "sufikso" && kp.tipo === "radiko") suffixPenalty +=3;

      if (prev && Array.isArray(kp.antaŭpovas) && kp.antaŭpovas.length) {
        if (kp.antaŭpovas.includes(prev.teksto) || kp.antaŭpovas.includes(prev.tipo))
          contextBonus += 3;
        else hardPenalty += 5;
      }
      if (next && Array.isArray(kp.postpovas) && kp.postpovas.length) {
        if (kp.postpovas.includes(next.teksto) || kp.postpovas.includes(next.tipo))
          contextBonus += 3;
        else hardPenalty += 5;
      }
    }

    let consSingles = 0;
    parseArr.forEach(p => {
      if (singles.has(p.komp.teksto.toLowerCase())) consSingles++;
    });
    if( consSingles > 1) {
      uniquePenalty += consSingles+2;
    }

    if (parseArr[0].komp.tipo === "prefikso") prefixBonus = 0;
    if (parseArr[baseCount-1].komp.tipo === "sufikso") suffixPenalty -= 1;


    const types = parseArr.map(p => p.komp.tipo);
    const firstRad = types.indexOf("radiko");
    const lastRad  = types.lastIndexOf("radiko");
    if (
      firstRad > 0 &&
      types.slice(0, firstRad).every(t => t === "prefikso") &&
      types.slice(firstRad, lastRad+1).every(t => t === "radiko") &&
      types.slice(lastRad+1).every(t => t === "sufikso")
    ) {
      const numRadikos = lastRad - firstRad + 1;
      contextBonus += Math.max(0, 3 - (numRadikos - 1));
    }


    console.log(`Scoring parse: ${parseArr.map(p => `${p.komp.teksto}[${p.komp.tipo}]`).join(" + ")} : ${baseCount
         - suffixPenalty
         - radikoChainPenalty
         + prefixBonus
         - hardPenalty
         + contextBonus
        - uniquePenalty
      }`);
    console.log(`Base: ${baseCount}, Suffix Penalty: ${suffixPenalty}, Radiko Chain Penalty: ${radikoChainPenalty}, Prefix Bonus: ${prefixBonus}, Hard Penalty: ${hardPenalty}, Context Bonus: ${contextBonus}, Unique Penalty: ${uniquePenalty}`);
   return baseCount
         - suffixPenalty
         - radikoChainPenalty
         + prefixBonus
         - hardPenalty
         + contextBonus
          - uniquePenalty
  }
  // Build all parses, pick the best one
  const allParses = helper(vorto, null, new Set());
  console.log(`Found ${allParses.length} parses for "${vorto}"`);
  let best = null, bestScore = -Infinity;
  for (const p of allParses) {
    const sc = scoreParse(p);
    if (sc > bestScore) {
      bestScore = sc;
      best     = p;
    }
  }

  // Send back the champion (or a failure if none)
  self.postMessage(
    best || [{
      mapado: { tekstero: `❌ ${vorto}`, tipo: "???", difino: "Ne valida sekvo aŭ komponanto" }
    }]
  );
});
