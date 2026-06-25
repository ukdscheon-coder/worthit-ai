export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { product } = req.body || {};

    if (!product || typeof product !== 'string') {
      return res.status(400).json({ error: 'Product is required' });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(200).json(fallbackDecision(product));
    }

    const prompt = `You are WorthIt AI, a concise product buying advisor.\n\nAnalyze this product or URL and return JSON only.\n\nProduct: ${product}\n\nRules:\n- Do not invent live prices or fake review data.\n- If real-time data is unavailable, say uncertainty clearly.\n- Give one decision only: BUY, WAIT, or DON'T BUY.\n- Focus on saving money, avoiding regret, and finding better alternatives.\n\nJSON schema:\n{\n  "decision":"BUY | WAIT | DON'T BUY",\n  "score":0,\n  "summary":"",\n  "reasons":[{"title":"","detail":""}],\n  "alternative":"",\n  "confidence":0\n}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'You are WorthIt AI. Return strict JSON only.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';
    const parsed = JSON.parse(text.replace(/```json|```/g, '').trim());

    return res.status(200).json(normalize(parsed, product));
  } catch (error) {
    return res.status(200).json(fallbackDecision(req.body?.product || 'this product'));
  }
}

function normalize(data, product) {
  const decision = String(data.decision || 'WAIT').toUpperCase();
  return {
    product,
    decision: decision.includes('DON') ? "DON'T BUY" : decision.includes('BUY') ? 'BUY' : 'WAIT',
    score: Number(data.score || 65),
    summary: String(data.summary || 'WorthIt AI could not fully verify this product. Check one alternative before buying.'),
    reasons: Array.isArray(data.reasons) ? data.reasons.slice(0, 3) : [],
    alternative: String(data.alternative || 'Compare one trusted alternative before checkout.'),
    confidence: Number(data.confidence || 60)
  };
}

function fallbackDecision(product) {
  return {
    product,
    decision: 'WAIT',
    score: 70,
    summary: 'AI backend is not connected yet. This is a safe default: wait and compare before buying.',
    reasons: [
      { title: 'Backend pending', detail: 'OpenAI API key must be added in Vercel environment variables.' },
      { title: 'Avoid regret', detail: 'Compare price, reviews, and one alternative before purchase.' },
      { title: 'Next step', detail: 'Deploy to Vercel and add OPENAI_API_KEY.' }
    ],
    alternative: 'Compare with one recognised alternative product.',
    confidence: 50
  };
}
