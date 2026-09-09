import { randomBytes, createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import "../auth";

type Invitation = {
  id: string;
  restaurantId: string;
  role: "serveur";
  tokenHash: string;
  expiresAt: string;
  usedAt?: string;
  revokedAt?: string;
};

const DEMO_RESTAURANT_ID = "demo-restaurant";
const invitations: Invitation[] = [];

export async function invitationsRoutes(app: FastifyInstance) {
  app.post<{ Body: { durationHours?: number } }>("/invitations", async (req, reply) => {
    const durationHours = Math.min(Math.max(req.body.durationHours ?? 48, 1), 168);
    const token = randomBytes(32).toString("hex");
    const invitation: Invitation = {
      id: `inv-${Date.now()}`,
      restaurantId: req.auth?.restaurantId ?? DEMO_RESTAURANT_ID,
      role: "serveur",
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
    };
    invitations.push(invitation);
    return reply.status(201).send({
      id: invitation.id,
      restaurantId: invitation.restaurantId,
      role: invitation.role,
      token,
      expiresAt: invitation.expiresAt,
      maxUses: 1,
    });
  });

  app.post<{ Body: { token: string; displayName: string } }>("/invitations/redeem", async (req, reply) => {
    const invitation = invitations.find((candidate) => candidate.tokenHash === hashToken(req.body.token));
    if (!invitation || invitation.revokedAt || invitation.usedAt || new Date(invitation.expiresAt) <= new Date()) {
      return reply.status(400).send({ error: "Invitation invalide ou expirée" });
    }
    if (!req.body.displayName?.trim()) {
      return reply.status(400).send({ error: "Le nom est obligatoire" });
    }
    invitation.usedAt = new Date().toISOString();
    return {
      restaurantId: invitation.restaurantId,
      role: invitation.role,
      displayName: req.body.displayName.trim(),
      accessGranted: true,
    };
  });
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}