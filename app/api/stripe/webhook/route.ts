import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

if (!webhookSecret) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET");
}

if (!stripeSecretKey) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

if (!webhookSecret) {
  throw new Error("Missing STRIPE_WEBHOOK_SECRET");
}

const stripe = new Stripe(stripeSecretKey);

async function updateProfileByEmail(
  email: string,
  updates: Record<string, unknown>
) {
  return supabaseAdmin.from("profiles").update(updates).eq("email", email);
}

async function updateProfileByCustomerId(
  customerId: string,
  updates: Record<string, unknown>
) {
  return supabaseAdmin
    .from("profiles")
    .update(updates)
    .eq("stripe_customer_id", customerId);
}

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const customerId =
          typeof session.customer === "string" ? session.customer : null;
        const email = session.customer_email || null;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : null;

        let subscriptionStatus: string | null = null;
        let subscriptionPriceId: string | null = null;

        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          subscriptionStatus = subscription.status;

          const firstItem = subscription.items.data[0];
          subscriptionPriceId = firstItem?.price?.id || null;
        }

        if (email) {
          await updateProfileByEmail(email, {
            stripe_customer_id: customerId,
            subscription_status: subscriptionStatus,
            subscription_price_id: subscriptionPriceId,
          });
        }

        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : null;

        if (customerId) {
          await updateProfileByCustomerId(customerId, {
            subscription_status: subscription.status,
          });
        }

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);

    return NextResponse.json(
      { error: "Webhook failed" },
      { status: 500 }
    );
  }
}