import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// In-memory store for failed login attempts: email -> { count, firstAttempt }
const failedAttempts = new Map<string, { count: number; firstAttempt: number }>();

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 3;

export async function POST(req: NextRequest) {
  let email = "";
  try {
    const body = await req.json();
    email = body.email || "";
  } catch {
    return NextResponse.json({ error: "Corps invalide" }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "Email requis" }, { status: 400 });
  }

  const now = Date.now();
  const existing = failedAttempts.get(email);

  if (!existing || now - existing.firstAttempt > WINDOW_MS) {
    // Reset window
    failedAttempts.set(email, { count: 1, firstAttempt: now });
  } else {
    existing.count += 1;

    if (existing.count >= MAX_ATTEMPTS) {
      // Create suspicious connection alert (avoid duplicates within the window)
      try {
        const windowStart = new Date(existing.firstAttempt);
        const existingAlert = await db.alert.findFirst({
          where: {
            type: "CONNEXION_SUSPECTE",
            message: { contains: email },
            createdAt: { gte: windowStart },
          },
        });

        if (!existingAlert) {
          await db.alert.create({
            data: {
              type: "CONNEXION_SUSPECTE",
              level: "RED",
              message: `Tentatives de connexion suspectes répétées pour l'email : ${email} (${existing.count} tentatives en moins de 10 minutes).`,
            },
          });
        }

        // Reset counter after alert creation
        failedAttempts.delete(email);
      } catch (err) {
        console.error("Erreur création alerte connexion suspecte:", err);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
