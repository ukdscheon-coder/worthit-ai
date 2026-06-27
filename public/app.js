const input = document.getElementById('product');
const btn = document.getElementById('btn');
const result = document.getElementById('result');

function clsFor(decision) {
  if (decision === 'BUY') return 'buy';
  if (decision === 'WAIT') return 'wait';
  return 'skip';
}

function cleanReasons(reasons) {
  if (!Array.isArray(reasons) || reasons.length === 0) {
    return [
      { title: 'Money risk', detail: 'Check if the price is fair before buying.' },
      { title: 'Quality risk', detail: 'Compare reviews and warranty before checkout.' },
      { title: 'Alternative', detail: 'Look at one competing product first.' }
    ];
  }
  return reasons.slice(0, 3).map((r) => ({
    title: r.title || r[0] || 'Reason',
    detail: r.detail || r[1] || String(r)
  }));
}

function render(data) {
  const decision = data.decision || 'WAIT';
  const c = clsFor(decision);
  const score = Math.max(0, Math.min(100, Number(data.score || 65)));
  const reasons = cleanReasons(data.reasons);
  result.className = 'result';
  result.innerHTML = `<div class="resultHead"><div class="bigDecision ${c}">${decision}</div><div class="bigScore">${score}/100</div></div><h2>${data.product || input.value.trim()}</h2><p class="lead" style="text-align:left;margin:0">${data.summary || 'WorthIt AI completed the analysis.'}</p><div class="reasons">${reasons.map((r) => `<div class="reason"><b>${r.title}</b><span>${r.detail}</span></div>`).join('')}</div><div class="ctaBox"><h3>WorthIt recommendation</h3><p>${data.alternative || 'Compare one trusted alternative before checkout.'}</p><button onclick="window.location.href='#pricing'">Unlock unlimited checks</button></div>`;
  result.scrollIntoView({ behavior: 'smooth' });
}

function localDecision(product) {
  const s = product.toLowerCase();
  if (s.includes('temu') || s.includes('aliexpress') || s.includes('cheap')) {
    return { product, decision: "DON'T BUY", score: 39, summary: 'High regret risk. The price may look attractive, but quality, support, and return risk are too high.', reasons: [{ title: 'Hidden cost', detail: 'Cheap products often cost more through returns, delays or poor durability.' }, { title: 'Quality uncertainty', detail: 'Not enough trusted proof to recommend buying now.' }, { title: 'Better move', detail: 'Search one recognised alternative before spending money.' }], alternative: 'Choose a recognised brand with warranty and clear returns.' };
  }
  if (s.includes('iphone') || s.includes('macbook') || s.includes('apple')) {
    return { product, decision: 'WAIT', score: 73, summary: 'Good product, but not always the best buying moment. Check seasonal offers or certified refurbished first.', reasons: [{ title: 'Timing risk', detail: 'Waiting may reduce the price without losing much value.' }, { title: 'Strong product', detail: 'Brand support and resale value are usually strong.' }, { title: 'Smart action', detail: 'Compare new vs refurbished before purchase.' }], alternative: 'Check Apple refurbished or one previous-generation model.' };
  }
  return { product, decision: 'BUY', score: 86, summary: 'This looks like a sensible purchase if the final price is within your budget.', reasons: [{ title: 'Clear value', detail: 'The product appears to solve a real need.' }, { title: 'Low regret risk', detail: 'No obvious red flags from the input.' }, { title: 'Final check', detail: 'Compare one alternative before checkout.' }], alternative: 'Compare one trusted alternative before buying.' };
}

async function analyze() {
  const product = input.value.trim();
  if (!product) { input.focus(); return; }
  btn.disabled = true;
  btn.textContent = 'Checking...';
  result.className = 'result';
  result.innerHTML = '<h2>WorthIt AI is checking price risk, quality risk, and alternatives...</h2>';
  try {
    const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product }) });
    if (!response.ok) throw new Error('API unavailable');
    const data = await response.json();
    render(data);
  } catch (error) {
    render(localDecision(product));
  } finally {
    btn.disabled = false;
    btn.textContent = 'Check Now';
  }
}

btn.addEventListener('click', analyze);
input.addEventListener('keydown', (e) => { if (e.key === 'Enter') analyze(); });
