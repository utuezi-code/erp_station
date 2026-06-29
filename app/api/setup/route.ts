import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

// One-time setup endpoint — delete after first use
const SETUP_KEY = process.env.SETUP_KEY || "";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!SETUP_KEY || key !== SETUP_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const adminPwd = await bcrypt.hash("Admin1234!", 12);
    const gerantPwd = await bcrypt.hash("Gerant1234!", 12);

    // Regions
    const regions = await Promise.all([
      db.region.upsert({ where: { name: "Abidjan" }, update: {}, create: { name: "Abidjan" } }),
      db.region.upsert({ where: { name: "Bouaké" }, update: {}, create: { name: "Bouaké" } }),
      db.region.upsert({ where: { name: "Yamoussoukro" }, update: {}, create: { name: "Yamoussoukro" } }),
      db.region.upsert({ where: { name: "San-Pédro" }, update: {}, create: { name: "San-Pédro" } }),
    ]);

    // Fuels
    const super95 = await db.fuel.upsert({
      where: { code: "SP95" }, update: {},
      create: { name: "Super", code: "SP95", salePrice: 755, purchasePrice: 700, tva: 18, margin: 55, unit: "litre" },
    });
    const gasoil = await db.fuel.upsert({
      where: { code: "GO" }, update: {},
      create: { name: "Gasoil", code: "GO", salePrice: 615, purchasePrice: 560, tva: 18, margin: 55, unit: "litre" },
    });

    // Stations
    const st1 = await db.station.upsert({
      where: { code: "IE-ABJ-01" }, update: {},
      create: { name: "Station Cocody", code: "IE-ABJ-01", city: "Abidjan", address: "Bd Latrille, Cocody", regionId: regions[0].id },
    });
    const st2 = await db.station.upsert({
      where: { code: "IE-ABJ-02" }, update: {},
      create: { name: "Station Yopougon", code: "IE-ABJ-02", city: "Abidjan", address: "Rue des Jardins, Yopougon", regionId: regions[0].id },
    });

    // Users
    await db.user.upsert({
      where: { email: "admin@ivoryenergies.ci" }, update: {},
      create: { name: "Administrateur", email: "admin@ivoryenergies.ci", password: adminPwd, role: "ADMIN" },
    });
    await db.user.upsert({
      where: { email: "dg@ivoryenergies.ci" }, update: {},
      create: { name: "Directeur Général", email: "dg@ivoryenergies.ci", password: adminPwd, role: "DIRECTION_GENERALE" },
    });
    await db.user.upsert({
      where: { email: "commercial@ivoryenergies.ci" }, update: {},
      create: { name: "Direction Commerciale", email: "commercial@ivoryenergies.ci", password: adminPwd, role: "DIRECTION_COMMERCIALE" },
    });
    await db.user.upsert({
      where: { email: "finance@ivoryenergies.ci" }, update: {},
      create: { name: "Direction Financière", email: "finance@ivoryenergies.ci", password: adminPwd, role: "DIRECTION_FINANCIERE" },
    });
    await db.user.upsert({
      where: { email: "gerant.cocody@ivoryenergies.ci" }, update: {},
      create: { name: "Konan Koffi", email: "gerant.cocody@ivoryenergies.ci", password: gerantPwd, role: "GERANT", stationId: st1.id },
    });
    await db.user.upsert({
      where: { email: "gerant.yopougon@ivoryenergies.ci" }, update: {},
      create: { name: "Aya Coulibaly", email: "gerant.yopougon@ivoryenergies.ci", password: gerantPwd, role: "GERANT", stationId: st2.id },
    });

    // Pumps & Nozzles for st1
    const pump1 = await db.pump.upsert({
      where: { stationId_number: { stationId: st1.id, number: 1 } }, update: {},
      create: { stationId: st1.id, name: "Pompe 1", number: 1 },
    });
    await db.nozzle.upsert({
      where: { pumpId_number: { pumpId: pump1.id, number: 1 } }, update: {},
      create: { pumpId: pump1.id, fuelId: super95.id, number: 1 },
    });
    await db.nozzle.upsert({
      where: { pumpId_number: { pumpId: pump1.id, number: 2 } }, update: {},
      create: { pumpId: pump1.id, fuelId: gasoil.id, number: 2 },
    });

    // Tanks
    await db.tank.upsert({
      where: { id: "seed-tank-sp-1" }, update: {},
      create: { id: "seed-tank-sp-1", stationId: st1.id, fuelId: super95.id, name: "Cuve SP95-A", capacity: 30000, alertLevel: 3000 },
    });
    await db.tank.upsert({
      where: { id: "seed-tank-go-1" }, update: {},
      create: { id: "seed-tank-go-1", stationId: st1.id, fuelId: gasoil.id, name: "Cuve GO-A", capacity: 30000, alertLevel: 3000 },
    });

    // Bank accounts
    await db.bankAccount.upsert({
      where: { id: "seed-bank-1" }, update: {},
      create: { id: "seed-bank-1", stationId: st1.id, bankName: "SGBCI", accountNumber: "CI12345600001" },
    });

    return NextResponse.json({
      success: true,
      message: "Base de données initialisée avec succès",
      comptes: [
        { email: "admin@ivoryenergies.ci", motDePasse: "Admin1234!", role: "ADMIN" },
        { email: "dg@ivoryenergies.ci", motDePasse: "Admin1234!", role: "DIRECTION_GENERALE" },
        { email: "commercial@ivoryenergies.ci", motDePasse: "Admin1234!", role: "DIRECTION_COMMERCIALE" },
        { email: "finance@ivoryenergies.ci", motDePasse: "Admin1234!", role: "DIRECTION_FINANCIERE" },
        { email: "gerant.cocody@ivoryenergies.ci", motDePasse: "Gerant1234!", role: "GERANT" },
        { email: "gerant.yopougon@ivoryenergies.ci", motDePasse: "Gerant1234!", role: "GERANT" },
      ],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
