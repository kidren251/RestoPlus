import { randomBytes, createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { Pole } from "@resto-plus/types";
import "../auth";

type Invitation = {
  id: string;
  restaurantId: string;
  role: "serveur";
  pole: Pole;
  tokenHash: string;
  expiresAt: string;
  usedAt?: string;
  revokedAt?: string;
};

type RestaurantMember = {
  id: string;
  restaurantId: string;
  name: string;
  role: "serveur";
  pole: Pole;
  status: "temporaire" | "expire";
  expiresAt: string;
};

const DEMO_RESTAURANT_ID = "demo-restaurant";
const invitations: Invitation[] = [];
const restaurantMembers: RestaurantMember[] = [];

export async function invitationsRoutes(app: FastifyInstance) {
  app.post<{ Body: { durationHours?: number; pole?: Pole } }>("/invitations", async (req, reply) => {
    if (req.auth?.accessRole && req.auth.accessRole !== "directeur_admin") {
      return reply.status(403).send({ error: "DIRECTOR_ADMIN_REQUIRED" });
    }
    const pole: Pole = req.body.pole === "cuisine" ? "cuisine" : "salle";
    const durationHours = Math.min(Math.max(req.body.durationHours ?? 48, 1), 168);
    const token = randomBytes(32).toString("hex");
    const invitation: Invitation = {
      id: `inv-${Date.now()}`,
      restaurantId: req.auth?.restaurantId ?? DEMO_RESTAURANT_ID,
      role: "serveur",
      pole,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString(),
    };
    invitations.push(invitation);
    return reply.status(201).send({
      id: invitation.id,
      restaurantId: invitation.restaurantId,
      role: invitation.role,
      pole: invitation.pole,
      token,
      expiresAt: invitation.expiresAt,
      maxUses: 1,
    });
  });

  app.get("/restaurant/members", async (req) => {
    const restaurantId = req.auth?.restaurantId ?? DEMO_RESTAURANT_ID;
    return {
      members: restaurantMembers.filter((member) => member.restaurantId === restaurantId),
    };
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
    restaurantMembers.push({
      id: `member-${Date.now()}`,
      restaurantId: invitation.restaurantId,
      name: req.body.displayName.trim(),
      role: invitation.role,
      pole: invitation.pole,
      status: "temporaire",
      expiresAt: invitation.expiresAt,
    });
    return {
      restaurantId: invitation.restaurantId,
      role: invitation.role,
      pole: invitation.pole,
      displayName: req.body.displayName.trim(),
      accessGranted: true,
    };
  });
}

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}