import { requireRole } from "@/lib/rbac";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { revalidatePath } from "next/cache";

async function createRegion(formData: FormData) {
  "use server";
  const name = formData.get("name") as string;
  if (name) {
    await db.region.create({ data: { name } });
    revalidatePath("/dashboard/admin/settings");
  }
}

export default async function SettingsPage() {
  await requireRole(["ADMIN", "DIRECTION_GENERALE"]);

  const regions = await db.region.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
      </div>

      <Card className="max-w-md">
        <CardHeader><CardTitle className="text-base">Régions</CardTitle></CardHeader>
        <CardContent>
          <ul className="mb-4 space-y-1">
            {regions.map((r) => (
              <li key={r.id} className="text-sm py-1 border-b last:border-0">{r.name}</li>
            ))}
          </ul>
          <form action={createRegion} className="flex gap-2">
            <Input name="name" placeholder="Nom de la région" required />
            <Button type="submit" className="bg-[#0369A1] hover:bg-blue-700 whitespace-nowrap">Ajouter</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
