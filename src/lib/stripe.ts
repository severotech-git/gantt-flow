import Stripe from 'stripe';

const globalForStripe = global as typeof globalThis & { stripe?: Stripe };

function createStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  return new Stripe(key, {
    // Use a stable API version that still exposes current_period_start/end on Subscription
    // @ts-expect-error – older API version not in the latest type union
    apiVersion: '2023-10-16',
  });
}

export function getStripe(): Stripe {
  if (!globalForStripe.stripe) {
    globalForStripe.stripe = createStripeClient();
  }
  return globalForStripe.stripe;
}

// Convenience proxy — keeps call sites clean
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getStripe() as unknown as Record<string, unknown>)[prop as string];
  },
});
