import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Regions
  const regions = await Promise.all([
    prisma.region.upsert({ where: { name: "Abidjan" }, update: {}, create: { name: "Abidjan" } }),
    prisma.region.upsert({ where: { name: "Bouaké" }, update: {}, create: { name: "Bouaké" } }),
    prisma.region.upsert({ where: { name: "Yamoussoukro" }, update: {}, create: { name: "Yamoussoukro" } }),
    prisma.region.upsert({ where: { name: "San-Pédro" }, update: {}, create: { name: "San-Pédro" } }),
  ]);

  // Fuels
  const super95 = await prisma.fuel.upsert({
    where: { code: "SP95" },
    update: {},
    create: { name: "Super", code: "SP95", salePrice: 755, purchasePrice: 700, tva: 18, margin: 55, unit: "litre" },
  });
  const gasoil = await prisma.fuel.upsert({
    where: { code: "GO" },
    update: {},
    create: { name: "Gasoil", code: "GO", salePrice: 615, purchasePrice: 560, tva: 18, margin: 55, unit: "litre" },
  });
  const gaz = await prisma.fuel.upsert({
    where: { code: "GPL" },
    update: {},
    create: { name: "GAZ", code: "GPL", salePrice: 550, purchasePrice: 490, tva: 18, margin: 60, unit: "kg" },
  });
  const lubrifiant = await prisma.fuel.upsert({
    where: { code: "LUB" },
    update: {},
    create: { name: "Lubrifiant", code: "LUB", salePrice: 8500, purchasePrice: 7000, tva: 18, margin: 1500, unit: "litre" },
  });

  // Stations
  const st1 = await prisma.station.upsert({
    where: { code: "IE-ABJ-01" },
    update: {},
    create: { name: "Station Cocody", code: "IE-ABJ-01", city: "Abidjan", address: "Bd Latrille, Cocody", regionId: regions[0].id },
  });
  const st2 = await prisma.station.upsert({
    where: { code: "IE-ABJ-02" },
    update: {},
    create: { name: "Station Yopougon", code: "IE-ABJ-02", city: "Abidjan", address: "Rue des Jardins, Yopougon", regionId: regions[0].id },
  });
  const st3 = await prisma.station.upsert({
    where: { code: "IE-BKE-01" },
    update: {},
    create: { name: "Station Bouaké Centre", code: "IE-BKE-01", city: "Bouaké", address: "Av. Général de Gaulle", regionId: regions[1].id },
  });
  const st4 = await prisma.station.upsert({
    where: { code: "IE-YMK-01" },
    update: {},
    create: { name: "Station Yamoussoukro", code: "IE-YMK-01", city: "Yamoussoukro", address: "Bd Félix Houphouët-Boigny", regionId: regions[2].id },
  });

  // Users
  const adminPwd = await bcrypt.hash("Admin1234!", 12);
  const gerantPwd = await bcrypt.hash("Gerant1234!", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@ivoryenergies.ci" },
    update: {},
    create: { name: "Administrateur", email: "admin@ivoryenergies.ci", password: adminPwd, role: "ADMIN" },
  });

  const dg = await prisma.user.upsert({
    where: { email: "dg@ivoryenergies.ci" },
    update: {},
    create: { name: "Directeur Général", email: "dg@ivoryenergies.ci", password: adminPwd, role: "DIRECTION_GENERALE" },
  });

  const dc = await prisma.user.upsert({
    where: { email: "commercial@ivoryenergies.ci" },
    update: {},
    create: { name: "Direction Commerciale", email: "commercial@ivoryenergies.ci", password: adminPwd, role: "DIRECTION_COMMERCIALE" },
  });

  const df = await prisma.user.upsert({
    where: { email: "finance@ivoryenergies.ci" },
    update: {},
    create: { name: "Direction Financière", email: "finance@ivoryenergies.ci", password: adminPwd, role: "DIRECTION_FINANCIERE" },
  });

  const gerant1 = await prisma.user.upsert({
    where: { email: "gerant.cocody@ivoryenergies.ci" },
    update: {},
    create: { name: "Konan Koffi", email: "gerant.cocody@ivoryenergies.ci", password: gerantPwd, role: "GERANT", stationId: st1.id },
  });

  const gerant2 = await prisma.user.upsert({
    where: { email: "gerant.yopougon@ivoryenergies.ci" },
    update: {},
    create: { name: "Aya Coulibaly", email: "gerant.yopougon@ivoryenergies.ci", password: gerantPwd, role: "GERANT", stationId: st2.id },
  });

  // Pumps for station 1
  const pump1 = await prisma.pump.upsert({
    where: { stationId_number: { stationId: st1.id, number: 1 } },
    update: {},
    create: { stationId: st1.id, name: "Pompe 1", number: 1 },
  });
  const pump2 = await prisma.pump.upsert({
    where: { stationId_number: { stationId: st1.id, number: 2 } },
    update: {},
    create: { stationId: st1.id, name: "Pompe 2", number: 2 },
  });

  // Nozzles
  const nozzle1a = await prisma.nozzle.upsert({
    where: { pumpId_number: { pumpId: pump1.id, number: 1 } },
    update: {},
    create: { pumpId: pump1.id, fuelId: super95.id, number: 1 },
  });
  const nozzle1b = await prisma.nozzle.upsert({
    where: { pumpId_number: { pumpId: pump1.id, number: 2 } },
    update: {},
    create: { pumpId: pump1.id, fuelId: gasoil.id, number: 2 },
  });
  const nozzle2a = await prisma.nozzle.upsert({
    where: { pumpId_number: { pumpId: pump2.id, number: 1 } },
    update: {},
    create: { pumpId: pump2.id, fuelId: super95.id, number: 1 },
  });

  // Tanks for station 1
  await prisma.tank.upsert({
    where: { id: "seed-tank-sp-1" },
    update: {},
    create: { id: "seed-tank-sp-1", stationId: st1.id, fuelId: super95.id, name: "Cuve SP95-A", capacity: 30000, alertLevel: 3000 },
  });
  await prisma.tank.upsert({
    where: { id: "seed-tank-go-1" },
    update: {},
    create: { id: "seed-tank-go-1", stationId: st1.id, fuelId: gasoil.id, name: "Cuve GO-A", capacity: 30000, alertLevel: 3000 },
  });

  // Pump for station 2
  const pump3 = await prisma.pump.upsert({
    where: { stationId_number: { stationId: st2.id, number: 1 } },
    update: {},
    create: { stationId: st2.id, name: "Pompe 1", number: 1 },
  });
  await prisma.nozzle.upsert({
    where: { pumpId_number: { pumpId: pump3.id, number: 1 } },
    update: {},
    create: { pumpId: pump3.id, fuelId: gasoil.id, number: 1 },
  });
  await prisma.tank.upsert({
    where: { id: "seed-tank-go-2" },
    update: {},
    create: { id: "seed-tank-go-2", stationId: st2.id, fuelId: gasoil.id, name: "Cuve GO-A", capacity: 20000, alertLevel: 2000 },
  });

  // Bank accounts
  await prisma.bankAccount.upsert({
    where: { id: "seed-bank-1" },
    update: {},
    create: { id: "seed-bank-1", stationId: st1.id, bankName: "SGBCI", accountNumber: "CI12345600001" },
  });
  await prisma.bankAccount.upsert({
    where: { id: "seed-bank-2" },
    update: {},
    create: { id: "seed-bank-2", stationId: st2.id, bankName: "Ecobank", accountNumber: "CI98765400002" },
  });

  console.log("✅ Seed completed!");
  console.log("\n🔐 Comptes de test:");
  console.log("   Admin:     admin@ivoryenergies.ci / Admin1234!");
  console.log("   Dir. Gén.: dg@ivoryenergies.ci / Admin1234!");
  console.log("   Dir. Com.: commercial@ivoryenergies.ci / Admin1234!");
  console.log("   Dir. Fin.: finance@ivoryenergies.ci / Admin1234!");
  console.log("   Gérant 1:  gerant.cocody@ivoryenergies.ci / Gerant1234!");
  console.log("   Gérant 2:  gerant.yopougon@ivoryenergies.ci / Gerant1234!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
