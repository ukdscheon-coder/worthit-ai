export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { product } = req.body || {};
  if (!product || typeof product !== "string") return res.status(400).json({ error: "Product is required" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(200).json(fallback(product, "OPENAI_API_KEY missing"));

  try {
    const prompt = `You are WorthIt AI, a money-saving shopping advisor.

Analyze this product input:
${product}

Return JSON only. No markdown.

The business goal is to show why the user can save money or avoid loss. Do not give vague advice.

Rules:
- Never invent live current prices, historical prices, review counts, or retailer data.
- If verified live price data is unavailable, set currentPrice and fairPrice to "Unknown".
- You may estimate risk and likely saving category, but clearly mark evidenceLevel as "AI estimate".
- Provide practical alternatives users understand.
- If multiple products are pasted, identify the main shopping decision and mention comparison risk.

Schema:
{
  "product":"string",
  "decision":"BUY | WAIT | DON'T BUY",
  "worthItScore":0,
  "estimatedSaving":"string",
  "confidence":0,
  "currentPrice":"Unknown unless verified",
  "fairPrice":"Unknown unless verified",
  "evidenceLevel":"Verified data | AI estimate | Insufficient data",
  "summary":"string",
  "reasons":[{"title":"string","detail":"string"}],
  "alternatives":[{"name":"string","whyBetter":"string","estimatedSaving":"string"}],
  "nextAction":"string"
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: "Return strict JSON only. Be evidence-first. Never fabricate live prices." },
          { role: "user", content: prompt }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(200).json(fallback(product, data?.error?.message || "OpenAI error"));

    const raw = data?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
    return res.status(200).json(normalize(parsed, product));
  } catch (err) {
    return res.status(200).json(fallback(product, "fallback"));
  }
}

function normalize(x, product) {
  const raw = String(x.decision || "WAIT").toUpperCase();
  const decision = raw.includes("DON") ? "DON'T BUY" : raw.includes("BUY") ? "BUY" : "WAIT";
  return {
    product: x.product || product,
    decision,
    worthItScore: clamp(Number(x.worthItScore || x.score || 65), 0, 100),
    estimatedSaving: x.estimatedSaving || "Needs verified price data",
    confidence: clamp(Number(x.confidence || 60), 0, 100),
    currentPrice: x.currentPrice || "Unknown",
    fairPrice: x.fairPrice || "Unknown",
    evidenceLevel: x.evidenceLevel || "AI estimate",
    summary: x.summary || "Initial purchase analysis completed.",
    reasons: Array.isArray(x.reasons) ? x.reasons.slice(0, 4) : [],
    alternatives: Array.isArray(x.alternatives) ? x.alternatives.slice(0, 3) : [],
    nextAction: x.nextAction || "Compare one alternative before purchase."
  };
}

function fallback(product, debug) {
  const s = String(product).toLowerCase();
  if (s.includes("temu") || s.includes("aliexpress") || s.includes("cheap")) {
    return {
      product,
      decision: "DON'T BUY",
      worthItScore: 38,
      estimatedSaving: "Avoid potential full purchase loss",
      confidence: 72,
      currentPrice: "Unknown",
      fairPrice: "Unknown",
      evidenceLevel: "AI estimate",
      summary: "This looks like a high regret-risk purchase. Low price may be offset by quality, warranty, or return issues.",
      reasons: [
        { title: "Money risk", detail: "A cheap item can become expensive if it fails, arrives late, or cannot be returned easily." },
        { title: "Quality uncertainty", detail: "Marketplace products with weak brand proof can have inconsistent quality." },
        { title: "Better alternative likely", detail: "A recognised brand may cost more upfront but reduce replacement risk." }
      ],
      alternatives: [
        { name: "Recognised brand alternative", whyBetter: "Better warranty and reliability", estimatedSaving: "May save replacement cost" },
        { name: "Top-reviewed marketplace option", whyBetter: "Higher review confidence", estimatedSaving: "Avoids bad purchase risk" }
      ],
      nextAction: "Do not buy until you compare one trusted alternative.",
      debug
    };
  }
  if (s.includes("iphone") || s.includes("macbook") || s.includes("apple")) {
    return {
      product,
      decision: "WAIT",
      worthItScore: 73,
      estimatedSaving: "Potential saving via refurbished or seasonal offers",
      confidence: 70,
      currentPrice: "Unknown",
      fairPrice: "Unknown",
      evidenceLevel: "AI estimate",
      summary: "Likely strong product, but purchase timing matters. Check certified refurbished and major retailer pricing before paying full price.",
      reasons: [
        { title: "Timing risk", detail: "Premium Apple products often become better value through seasonal promotions or certified refurbished listings." },
        { title: "Strong resale value", detail: "The product may still be worth buying, but paying full price without comparison can waste money." },
        { title: "Clear saving route", detail: "Compare official, refurbished, and major retailer options before checkout." }
      ],
      alternatives: [
        { name: "Certified refurbished Apple", whyBetter: "Similar quality with lower price", estimatedSaving: "Often meaningful if available" },
        { name: "Previous generation model", whyBetter: "Usually better value for most users", estimatedSaving: "Can avoid premium launch pricing" }
      ],
      nextAction: "Check refurbished and one major retailer before buying.",
      debug
    };
  }
  return {
    product,
    decision: "BUY",
    worthItScore: 82,
    estimatedSaving: "Verify final price before checkout",
    confidence: 65,
    currentPrice: "Unknown",
    fairPrice: "Unknown",
    evidenceLevel: "AI estimate",
    summary: "This appears to be a reasonable purchase if the price fits your budget, but compare one alternative before checkout.",
    reasons: [
      { title: "Clear use case", detail: "The product appears to solve a real need." },
      { title: "Low obvious risk", detail: "No major red flag is visible from the input alone." },
      { title: "Final comparison", detail: "A quick alternative check can prevent overpaying." }
    ],
    alternatives: [
      { name: "Comparable alternative", whyBetter: "May offer similar value at lower cost", estimatedSaving: "Unknown until verified" }
    ],
    nextAction: "Compare one alternative before final purchase.",
    debug
  };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}
