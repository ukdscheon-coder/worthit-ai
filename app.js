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
  result.innerHTML = `
    <div class="resultHead">
      <div class="bigDecision ${c}">${decision}</div>
      <div class="bigScore">${score}/100</div>
    </div>
    <h2>${data.product || input.value.trim()}</h2>
    <p class="lead" style="text-align:left;margin:0">${data.summary || 'WorthIt AI completed the analysis.'}</p>
    <div class="reasons">
      ${reasons.map((r) => `<div class="reason"><b>${r.title}</b><span>${r.detail}</span></div>`).join('')}
    </div>
    <div class="ctaBox">
      <h3>WorthIt recommendation</h3>
      <p>${data.alternative || 'Compare one trusted alternative before checkout.'}</p>
      <button onclick="window.location.href='#pricing'">Unlock unlimited checks</button>
    </div>
  `;
  result.scrollIntoView({ behavior: 'smooth' });
}

async function analyze() {
  const product = input.value.trim();
  if (!product) {
    input.focus();
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Checking...';
  result.className = 'result';
  result.innerHTML = '<h2>WorthIt AI is checking price risk, quality risk, and alternatives...</h2>';

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product })
    });

    const data = await response.json();
    render(data);
  } catch (error) {
    render({
      product,
      decision: 'WAIT',
      score: 60,
      summary: 'Connection failed. Do not buy yet. Try again after deployment settings are complete.',
      reasons: [
        { title: 'API connection', detail: 'Frontend could not reach the analysis API.' },
        { title: 'Safe default', detail: 'Waiting is safer than buying without comparison.' },
        { title: 'Next action', detail: 'Check Vercel deployment logs and environment variables.' }
      ],
      alternative: 'Retry after deployment setup.'
    });
  } finally {
    btn.disabled = false;
    btn.textContent = 'Check Now';
  }
}

btn.addEventListener('click', analyze);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') analyze();
});