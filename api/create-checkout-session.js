import Stripe from "stripe";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePriceId = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://worthit-info.com";

  if (!stripeSecretKey || !stripePriceId) {
    return res.status(200).json({
      checkoutUrl: null,
      message: "Stripe is not configured yet. Add STRIPE_SECRET_KEY and STRIPE_PRICE_ID in Vercel."
    });
  }

  try {
    const stripe = new Stripe(stripeSecretKey);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/?checkout=success`,
      cancel_url: `${appUrl}/?checkout=cancelled`,
      allow_promotion_codes: true
    });

    return res.status(200).json({ checkoutUrl: session.url });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Stripe checkout failed" });
  }
}
