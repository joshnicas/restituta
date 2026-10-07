import type { Request, Response } from "express";
import { z } from "zod";
import { subscriptionsService } from "./subscriptions.service";

export const subscriptionPaymentBody = z.object({ planId: z.string().min(1), phoneNumber: z.string().min(1) }).strict();
function authenticatedId(req: Request): number | null { const id = Number(req.user?.id); return Number.isInteger(id) && id > 0 ? id : null; }

export const subscriptionsController = {
  plans: async (_req: Request, res: Response) => res.json(await subscriptionsService.listPlans()),
  mine: async (req: Request, res: Response) => { const id = authenticatedId(req); if (!id) { res.status(401).json({ message: "Unauthorized." }); return; } res.json(await subscriptionsService.getMine(id)); },
  pay: async (req: Request, res: Response) => {
    const id = authenticatedId(req); if (!id) { res.status(401).json({ message: "Unauthorized." }); return; }
    const parsed = subscriptionPaymentBody.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Choose a valid plan and enter a Tanzanian mobile number." }); return; }
    try { res.status(202).json(await subscriptionsService.createPayment(id, parsed.data.planId, parsed.data.phoneNumber)); }
    catch (error) {
      const message = error instanceof Error ? error.message : "Could not start the payment.";
      const status = /valid Tanzanian|valid email|already have|unavailable|already in progress|account was not found/i.test(message) ? 400 : 502;
      res.status(status).json({ message });
    }
  },
  payment: async (req: Request, res: Response) => { const id = authenticatedId(req); if (!id) { res.status(401).json({ message: "Unauthorized." }); return; } const paymentId = Array.isArray(req.params.paymentId) ? req.params.paymentId[0] : req.params.paymentId; const payment = await subscriptionsService.getPayment(id, paymentId); if (!payment) { res.status(404).json({ message: "Payment not found." }); return; } res.json(payment); },
  openPayment: async (req: Request, res: Response) => { const id = authenticatedId(req); if (!id) { res.status(401).json({ message: "Unauthorized." }); return; } res.json({ payment: await subscriptionsService.getOpenPayment(id) }); },
  webhook: async (req: Request, res: Response) => { try { if (!Buffer.isBuffer(req.body)) { res.status(400).json({ message: "Invalid callback." }); return; } await subscriptionsService.processWebhook(req.body, req.headers); res.status(200).json({ accepted: true }); } catch { console.warn(JSON.stringify({ component: "subscription-payments", event: "WEBHOOK_REJECTED" })); res.status(400).json({ message: "Invalid callback." }); } },
};
