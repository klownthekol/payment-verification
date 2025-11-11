console.log("🧠 paymentWebhook function started");

import { Request, Response } from "express";
import dotenv from "dotenv";
import { DevbaseClient } from "@devfunlabs/web-sdk";
dotenv.config();

const devbaseClient = new DevbaseClient({
  baseURL: process.env.DEVBASE_BASE_URL || "https://api.dev.fun",
  appId: process.env.DEVBASE_APP_ID!,
  rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com",
});
console.log("🔑 Loaded webhook secret:", process.env.HELIUS_WEBHOOK_SECRET);

export default async function paymentWebhook(req: Request, res: Response) {
  try {
    // ✅ Verify Helius signature
    const signatureHeader = req.headers["x-helius-signature"];
    if (signatureHeader !== process.env.HELIUS_WEBHOOK_SECRET) {
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    // ✅ Log raw payload for debugging
    console.log("📩 Incoming Webhook Payload:");
    console.dir(req.body, { depth: null });

    const possibleTransfers =
      req.body?.data?.[0]?.events?.tokenTransfers ??
      req.body?.tokenTransfers ??
      req.body?.transfers ??
      [];

    const transfers = Array.isArray(possibleTransfers) ? possibleTransfers : [];

    if (transfers.length === 0) {
      console.log("⚠️ No transfers found in payload structure");
      return res.status(200).json({ status: "no_transfers_found" });
    }

    for (const transfer of transfers) {
      const { amount, mint, destination, source, signature: txId } = transfer;

      if (
        mint === process.env.USDC_MINT &&
        destination === process.env.VERIFICATION_WALLET &&
        Number(amount) >= Number(process.env.VERIFICATION_PRICE || 50)
      ) {
        console.log("✅ Valid payment received from:", source);

        // 💾 Persist payment in Devbase
        // First, check if entity exists
        const existingRecords = await devbaseClient.listEntities("verifiedAgents", {
          where: `wallet == "${source}"`,
        });

        const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
        const entityData = {
          wallet: source,
          isPaid: true,
          expiresAt,
          scanStatus: "active",
          lastPaymentTxId: txId || null,
          amount: Number(amount),
        };

        if (existingRecords && existingRecords.length > 0) {
          // Update existing entity
          await devbaseClient.updateEntity("verifiedAgents", existingRecords[0].id, entityData);
        } else {
          // Create new entity
          await devbaseClient.createEntity("verifiedAgents", entityData);
        }

        console.log(`💰 ${source} verified in Devbase until ${new Date(expiresAt).toISOString()}`);
      }
    }

    return res.status(200).json({ status: "ok" });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
