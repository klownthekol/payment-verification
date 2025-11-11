import { Request, Response } from "express";
import { DevbaseClient } from "@devfunlabs/web-sdk";
import dotenv from "dotenv";

dotenv.config();

const devbaseClient = new DevbaseClient({
  baseURL: process.env.DEVBASE_BASE_URL || "https://api.dev.fun",
  appId: process.env.DEVBASE_APP_ID!,
  rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com",
});

export default async function verifyPaid(req: Request, res: Response) {
  try {
    const wallet = req.query.wallet as string;
    if (!wallet) return res.status(400).json({ error: "Wallet query parameter required" });

    // ✅ Fetch agent record from Devbase
    const record = await devbaseClient.listEntities("verifiedAgents", {
      where: `wallet == '${wallet}'`,
      limit: 1,
    });

    if (!record || record.length === 0) {
      return res.status(200).json({ wallet, paid: false });
    }

    const agent = record[0];
    const now = Date.now();
    const expiresAt = Number(agent.expiresAt) || 0;
    const paid = expiresAt > now;

    return res.status(200).json({
      wallet,
      paid,
      amount: agent.amount,
      lastPaymentTxId: agent.lastPaymentTxId || null,
      expiresAt: new Date(expiresAt).toISOString(),
    });
  } catch (error) {
    console.error("❌ verifyPaid error:", error);
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
