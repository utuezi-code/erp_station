import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireRole } from "@/lib/rbac";

export async function POST(req: NextRequest) {
  await requireRole(["DIRECTION_COMMERCIALE", "DIRECTION_FINANCIERE", "ADMIN"]);

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folder = (formData.get("folder") as string) || "uploads";

  if (!file) return NextResponse.json({ error: "Aucun fichier." }, { status: 400 });

  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const blob = await put(filename, file, { access: "public" });

  return NextResponse.json({ url: blob.url });
}
