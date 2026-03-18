import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { registerAuthRoutes } from "./replit_integrations/auth";
import { setupAuth } from "./replit_integrations/auth";
import { format } from "date-fns";

function generateLotNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `LOT-${year}-${rand}`;
}

function generateShipmentNumber(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `SHP-${year}-${rand}`;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // Users
  app.get(api.users.list.path, async (req, res) => {
    res.json(await storage.getUsers());
  });

  app.put(api.users.update.path, async (req, res) => {
    try {
      const input = api.users.update.input.parse(req.body);
      const user = await storage.updateUser(req.params.id, input);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // Warehouses
  app.get(api.warehouses.list.path, async (req, res) => {
    res.json(await storage.getWarehouses());
  });

  app.post(api.warehouses.create.path, async (req, res) => {
    try {
      const input = api.warehouses.create.input.parse(req.body);
      res.status(201).json(await storage.createWarehouse(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put(api.warehouses.update.path, async (req, res) => {
    try {
      const input = api.warehouses.update.input.parse(req.body);
      const updated = await storage.updateWarehouse(Number(req.params.id), input);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // Rooms
  app.get(api.rooms.list.path, async (req, res) => {
    res.json(await storage.getRooms());
  });

  app.post(api.rooms.create.path, async (req, res) => {
    try {
      const input = api.rooms.create.input.parse(req.body);
      res.status(201).json(await storage.createRoom(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put(api.rooms.update.path, async (req, res) => {
    try {
      const input = api.rooms.update.input.parse(req.body);
      const updated = await storage.updateRoom(Number(req.params.id), input);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // Suppliers
  app.get(api.suppliers.list.path, async (req, res) => {
    res.json(await storage.getSuppliers());
  });

  app.post(api.suppliers.create.path, async (req, res) => {
    try {
      const input = api.suppliers.create.input.parse(req.body);
      res.status(201).json(await storage.createSupplier(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.patch("/api/suppliers/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id)) return res.status(400).json({ message: "Invalid supplier ID" });
      const updateSchema = z.object({
        name: z.string().optional(),
        contactInfo: z.string().nullable().optional(),
        maxAcceptedQuantityKg: z.number().nullable().optional(),
      });
      const parsed = updateSchema.parse(req.body);
      const updated = await storage.updateSupplier(id, parsed);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      if (err instanceof Error && err.message === "Supplier not found") return res.status(404).json({ message: "Supplier not found" });
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  app.get("/api/suppliers/remaining-quotas", async (req, res) => {
    try {
      const allSuppliers = await storage.getSuppliers();
      const allTrucks = await storage.getTrucks();
      const allBatches = await storage.getBatches();
      const acceptedStatuses = new Set(["Accepted", "Partial Reject"]);
      const quotas = allSuppliers
        .filter(s => s.maxAcceptedQuantityKg != null && s.maxAcceptedQuantityKg > 0)
        .map(s => {
          const supplierTrucks = allTrucks.filter(t => t.supplierId === s.id);
          let totalReceivedKg = 0;
          for (const truck of supplierTrucks) {
            const batch = allBatches.find(b => b.truckId === truck.id);
            if (batch && acceptedStatuses.has(batch.acceptanceStatus)) {
              totalReceivedKg += truck.totalWeightKg || 0;
            }
          }
          return {
            supplierId: s.id,
            supplierName: s.name,
            maxAcceptedQuantityKg: s.maxAcceptedQuantityKg!,
            totalReceivedKg,
            remainingKg: Math.max(0, s.maxAcceptedQuantityKg! - totalReceivedKg),
          };
        });
      res.json(quotas);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Farms
  app.get(api.farms.list.path, async (req, res) => {
    res.json(await storage.getFarms());
  });

  app.post(api.farms.create.path, async (req, res) => {
    try {
      const input = api.farms.create.input.parse(req.body);
      res.status(201).json(await storage.createFarm(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // Trucks — creates truck AND batch automatically
  app.get(api.trucks.list.path, async (req, res) => {
    res.json(await storage.getTrucks());
  });

  app.post(api.trucks.create.path, async (req, res) => {
    try {
      const body = req.body;
      // Coerce dates and numbers
      const firstWeight = Number(body.firstWeightKg);
      const secondWeight = body.secondWeightKg ? Number(body.secondWeightKg) : undefined;
      const netWeight = secondWeight !== undefined ? Math.abs(firstWeight - secondWeight) : firstWeight;

      const truckData = {
        truckNumber: body.truckNumber,
        supplierId: body.supplierId ? Number(body.supplierId) : null,
        farmId: body.farmId ? Number(body.farmId) : null,
        productType: body.productType,
        variety: body.variety,
        antiSproutType: body.antiSproutType || null,
        firstWeightKg: firstWeight,
        secondWeightKg: secondWeight ?? null,
        totalWeightKg: netWeight,
        arrivalDate: new Date(body.arrivalDate),
      };

      const truck = await storage.createTruck(truckData);

      // Auto-generate batch if warehouseId and roomId provided
      if (body.warehouseId && body.roomId) {
        const lotNumber = generateLotNumber();
        const receivedDate = new Date(body.arrivalDate);
        // Default expiration 6 months from now
        const expirationDate = body.expirationDate
          ? new Date(body.expirationDate)
          : new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

        await storage.createBatch({
          lotNumber,
          truckId: truck.id,
          warehouseId: Number(body.warehouseId),
          roomId: Number(body.roomId),
          initialQuantityKg: netWeight,
          currentQuantityKg: netWeight,
          jamboBags: body.jamboBags ? Number(body.jamboBags) : null,
          expirationDate,
          receivedDate,
          status: "Pending",
          acceptanceStatus: "Pending",
        });
      }

      res.status(201).json(truck);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Record second weight for a truck
  app.patch("/api/trucks/:id/second-weight", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const secondWeightKg = Number(req.body.secondWeightKg) * 1000;
      const acceptanceStatus = req.body.acceptanceStatus || "Accepted";
      const truck = (await storage.getTrucks()).find(t => t.id === id);
      if (!truck) return res.status(404).json({ message: "Truck not found" });
      const netWeight = Math.abs(truck.firstWeightKg - secondWeightKg);
      const updated = await storage.updateTruckSecondWeight(id, secondWeightKg, netWeight);
      // Update the associated batch's initial/current quantity and status
      const allBatches = await storage.getBatches();
      const batch = allBatches.find(b => b.truckId === id);
      if (batch) {
        let batchStatus = "Stored";
        if (acceptanceStatus === "Rejected") batchStatus = "Rejected";
        else if (acceptanceStatus === "Partial Reject") batchStatus = "Partial";
        
        await storage.updateBatch(batch.lotNumber, {
          initialQuantityKg: netWeight,
          currentQuantityKg: netWeight,
          status: batchStatus,
          acceptanceStatus: acceptanceStatus,
        });
      }
      res.json(updated);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Batches
  app.get(api.batches.list.path, async (req, res) => {
    res.json(await storage.getBatches());
  });

  app.post(api.batches.create.path, async (req, res) => {
    try {
      const input = {
        ...req.body,
        expirationDate: new Date(req.body.expirationDate),
        receivedDate: new Date(req.body.receivedDate),
        initialQuantityKg: Number(req.body.initialQuantityKg),
        currentQuantityKg: Number(req.body.currentQuantityKg),
        warehouseId: Number(req.body.warehouseId),
        roomId: Number(req.body.roomId),
        truckId: Number(req.body.truckId),
      };
      res.status(201).json(await storage.createBatch(input));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  app.put(api.batches.update.path, async (req, res) => {
    try {
      const input = req.body;
      const updated = await storage.updateBatch(req.params.lotNumber, input);
      if (!updated) return res.status(404).json({ message: "Not found" });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // Shipments
  app.get(api.shipments.list.path, async (req, res) => {
    res.json(await storage.getShipments());
  });

  app.post(api.shipments.create.path, async (req, res) => {
    try {
      const shipmentData = {
        ...req.body,
        shipmentNumber: generateShipmentNumber(),
        quantityKg: Number(req.body.quantityKg),
        shippedDate: new Date(req.body.shippedDate),
      };
      res.status(201).json(await storage.createShipment(shipmentData));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // Losses
  app.get(api.losses.list.path, async (req, res) => {
    res.json(await storage.getLosses());
  });

  app.post(api.losses.create.path, async (req, res) => {
    try {
      const lossData = {
        ...req.body,
        quantityKg: Number(req.body.quantityKg),
        recordedDate: new Date(req.body.recordedDate),
      };
      res.status(201).json(await storage.createLoss(lossData));
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: err.errors[0].message });
      throw err;
    }
  });

  // Room Sensors
  app.get(api.roomSensors.list.path, async (req, res) => {
    res.json(await storage.getRoomSensors(Number(req.params.id)));
  });

  app.post("/api/sensors", async (req, res) => {
    const schema = z.object({
      roomId: z.number().int().positive(),
      temperature: z.string(),
      humidity: z.string(),
      co2Level: z.string(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
    const reading = await storage.createRoomSensor(parsed.data);
    res.status(201).json(reading);
  });

  app.get("/api/sensors/latest", async (req, res) => {
    const sensors = await storage.getLatestSensorPerRoom();
    // Normalize to camelCase for frontend
    const normalized = sensors.map((s: any) => ({
      id: s.id,
      roomId: s.roomId ?? s.room_id,
      temperature: s.temperature,
      humidity: s.humidity,
      co2Level: s.co2Level ?? s.co2_level,
      timestamp: s.timestamp,
    }));
    res.json(normalized);
  });

  app.get("/api/sensors/alerts", async (req, res) => {
    res.json(await storage.getSensorAlerts());
  });

  // Dashboard
  app.get(api.dashboard.stats.path, async (req, res) => {
    res.json(await storage.getDashboardStats());
  });

  app.get("/api/dashboard/weekly-flow", async (req, res) => {
    res.json(await storage.getWeeklyFlow());
  });

  app.get("/api/dashboard/warehouse-utilization", async (req, res) => {
    res.json(await storage.getWarehouseUtilization());
  });

  // Reports CSV generation
  app.get("/api/reports/inbound", async (req, res) => {
    const allTrucks = await storage.getTrucks();
    const allBatches = await storage.getBatches();
    const allSuppliers = await storage.getSuppliers();
    const allFarms = await storage.getFarms();
    const allWarehouses = await storage.getWarehouses();
    const allRooms = await storage.getRooms();

    const supMap = Object.fromEntries(allSuppliers.map(s => [s.id, s.name]));
    const farmMap = Object.fromEntries(allFarms.map(f => [f.id, f.name]));
    const whMap = Object.fromEntries(allWarehouses.map(w => [w.id, w.name]));
    const roomMap = Object.fromEntries(allRooms.map(r => [r.id, r.name]));
    const batchMap = Object.fromEntries(allBatches.map(b => [b.truckId, b]));

    const rows = [
      ["Lot Number", "Truck #", "Supplier", "Farm", "Product", "Variety", "1st Weight (t)", "2nd Weight (t)", "Net Weight (t)", "Date", "Warehouse", "Room", "Batch Status", "Acceptance"],
      ...allTrucks.map(t => {
        const batch = batchMap[t.id];
        return [
          batch?.lotNumber || '',
          t.truckNumber,
          t.supplierId ? supMap[t.supplierId] || '' : '',
          t.farmId ? farmMap[t.farmId] || '' : '',
          t.productType,
          t.variety,
          (t.firstWeightKg / 1000).toFixed(2),
          t.secondWeightKg != null ? (t.secondWeightKg / 1000).toFixed(2) : '',
          (t.totalWeightKg / 1000).toFixed(2),
          format(new Date(t.arrivalDate), 'yyyy-MM-dd'),
          batch ? whMap[batch.warehouseId] || '' : '',
          batch ? roomMap[batch.roomId] || '' : '',
          batch?.status || '',
          batch?.acceptanceStatus || '',
        ];
      })
    ];

    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="inbound-report.csv"`);
    res.send(csv);
  });

  app.get("/api/reports/outbound", async (req, res) => {
    const allShipments = await storage.getShipments();
    const rows = [
      ["Shipment #", "Lot Number", "Quantity (t)", "Destination", "Type", "Date"],
      ...allShipments.map(s => [
        s.shipmentNumber || '',
        s.batchId,
        (s.quantityKg / 1000).toFixed(2),
        s.destination,
        s.shipmentType || 'Full',
        format(new Date(s.shippedDate), 'yyyy-MM-dd'),
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="outbound-report.csv"`);
    res.send(csv);
  });

  app.get("/api/reports/inventory", async (req, res) => {
    const allBatches = await storage.getBatches();
    const allWarehouses = await storage.getWarehouses();
    const allRooms = await storage.getRooms();
    const whMap = Object.fromEntries(allWarehouses.map(w => [w.id, w.name]));
    const roomMap = Object.fromEntries(allRooms.map(r => [r.id, r.name]));

    const rows = [
      ["Lot Number", "Warehouse", "Room", "Initial (t)", "Current (t)", "Received", "Expires", "Status", "Acceptance"],
      ...allBatches.map(b => [
        b.lotNumber,
        whMap[b.warehouseId] || '',
        roomMap[b.roomId] || '',
        (b.initialQuantityKg / 1000).toFixed(2),
        (b.currentQuantityKg / 1000).toFixed(2),
        format(new Date(b.receivedDate), 'yyyy-MM-dd'),
        format(new Date(b.expirationDate), 'yyyy-MM-dd'),
        b.status,
        b.acceptanceStatus,
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="inventory-snapshot.csv"`);
    res.send(csv);
  });

  app.get("/api/reports/losses", async (req, res) => {
    const allLosses = await storage.getLosses();
    const rows = [
      ["Lot Number", "Loss Type", "Quantity (t)", "Notes", "Date"],
      ...allLosses.map(l => [
        l.batchId,
        l.lossType,
        (l.quantityKg / 1000).toFixed(2),
        l.notes || '',
        format(new Date(l.recordedDate), 'yyyy-MM-dd'),
      ])
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="loss-report.csv"`);
    res.send(csv);
  });

  app.get("/api/reports/aging", async (req, res) => {
    const allBatches = await storage.getBatches();
    const now = new Date();
    const rows = [
      ["Lot Number", "Age (days)", "Bucket", "Current (t)", "Status"],
      ...allBatches.map(b => {
        const days = Math.floor((now.getTime() - new Date(b.receivedDate).getTime()) / (86400000));
        const bucket = days <= 30 ? '0-30 days' : days <= 60 ? '30-60 days' : '60+ days';
        return [b.lotNumber, String(days), bucket, (b.currentQuantityKg / 1000).toFixed(2), b.status];
      })
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="aging-report.csv"`);
    res.send(csv);
  });

  app.get("/api/reports/expiration", async (req, res) => {
    const allBatches = await storage.getBatches();
    const now = new Date();
    const expiring = allBatches.filter(b => new Date(b.expirationDate) <= new Date(now.getTime() + 30 * 86400000));
    const rows = [
      ["Lot Number", "Days Until Expiry", "Current (t)", "Status"],
      ...expiring.map(b => {
        const daysLeft = Math.floor((new Date(b.expirationDate).getTime() - now.getTime()) / 86400000);
        return [b.lotNumber, String(daysLeft), (b.currentQuantityKg / 1000).toFixed(2), b.status];
      })
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="expiration-alert.csv"`);
    res.send(csv);
  });

  // Seed database
  seedDatabase().catch(console.error);

  return httpServer;
}

async function seedDatabase() {
  const existing = await storage.getWarehouses();
  const existingTrucks = await storage.getTrucks();
  // Only skip if both warehouses AND trucks are already seeded
  if (existing.length > 0 && existingTrucks.length > 0) return;

  // Use existing or create warehouses
  let wh1 = existing.find(w => w.name === "omda") || await storage.createWarehouse({ name: "omda", location: "ashyer" });
  let wh2 = existing.find(w => w.name === "serag") || await storage.createWarehouse({ name: "serag", location: "october" });

  const allRooms = await storage.getRooms();
  let rm1 = allRooms.find(r => r.warehouseId === wh1.id && r.name === "f8") || await storage.createRoom({ warehouseId: wh1.id, name: "f8", potatoType: "Russet", capacityKg: 5000000, storageType: "bulk", isActive: true, maxTempC: "5", maxHumidityPct: "95", maxCo2Ppm: "4000" });
  let rm2 = allRooms.find(r => r.warehouseId === wh2.id && r.name === "k9") || await storage.createRoom({ warehouseId: wh2.id, name: "k9", potatoType: "Variety Mix", capacityKg: 2500000, storageType: "pallets", isActive: true, maxTempC: "4", maxHumidityPct: "90", maxCo2Ppm: "3500" });

  const allSuppliers = await storage.getSuppliers();
  let sup1 = allSuppliers.find(s => s.name === "baraka") || await storage.createSupplier({ name: "baraka", contactInfo: "baraka@farms.com" });
  let sup2 = allSuppliers.find(s => s.name === "test") || await storage.createSupplier({ name: "test", contactInfo: "test@supply.com" });

  const allFarms = await storage.getFarms();
  let farm1 = allFarms.find(f => f.name === "dab3a") || await storage.createFarm({ supplierId: null, name: "dab3a", location: "North Region" });

  // Seed trucks and batches
  const seedTrucks = [
    { truckNumber: "7600", supplierId: sup2.id, farmId: null, productType: "Potato", variety: "Crops", firstWeightKg: 70000, secondWeightKg: 35000, totalWeightKg: 35000, arrivalDate: new Date("2026-03-11"), warehouseId: wh1.id, roomId: rm1.id, acceptanceStatus: "Accepted" },
    { truckNumber: "5678", supplierId: sup1.id, farmId: null, productType: "Potato", variety: "Rozet", firstWeightKg: 50000, secondWeightKg: 30000, totalWeightKg: 20000, arrivalDate: new Date("2026-03-10"), warehouseId: wh1.id, roomId: rm1.id, acceptanceStatus: "Accepted" },
    { truckNumber: "6544", supplierId: null, farmId: farm1.id, productType: "Potato", variety: "roZet", firstWeightKg: 40000, secondWeightKg: 30000, totalWeightKg: 10000, arrivalDate: new Date("2026-03-09"), warehouseId: wh1.id, roomId: rm1.id, acceptanceStatus: "Accepted" },
    { truckNumber: "1234", supplierId: sup1.id, farmId: null, productType: "Potato", variety: "rozet", firstWeightKg: 45000, secondWeightKg: 7000, totalWeightKg: 38000, arrivalDate: new Date("2026-03-08"), warehouseId: wh2.id, roomId: rm2.id, acceptanceStatus: "Accepted" },
    { truckNumber: "89090", supplierId: sup1.id, farmId: null, productType: "Potato", variety: "crops", firstWeightKg: 40000, secondWeightKg: null, totalWeightKg: 40000, arrivalDate: new Date("2026-03-07"), warehouseId: wh2.id, roomId: rm2.id, acceptanceStatus: "Accepted" },
    { truckNumber: "0000", supplierId: sup2.id, farmId: null, productType: "Potato", variety: "rozet", firstWeightKg: 150000, secondWeightKg: null, totalWeightKg: 150000, arrivalDate: new Date("2026-03-07"), warehouseId: wh2.id, roomId: rm2.id, acceptanceStatus: "Accepted" },
  ];

  for (const t of seedTrucks) {
    const truck = await storage.createTruck({
      truckNumber: t.truckNumber,
      supplierId: t.supplierId,
      farmId: t.farmId,
      productType: t.productType,
      variety: t.variety,
      antiSproutType: null,
      firstWeightKg: t.firstWeightKg,
      secondWeightKg: t.secondWeightKg,
      totalWeightKg: t.totalWeightKg,
      arrivalDate: t.arrivalDate,
    });

    const lotNumber = `LOT-2026-${String(Math.floor(10000 + Math.random() * 90000))}`;
    await storage.createBatch({
      lotNumber,
      truckId: truck.id,
      warehouseId: t.warehouseId,
      roomId: t.roomId,
      initialQuantityKg: t.totalWeightKg,
      currentQuantityKg: t.totalWeightKg,
      expirationDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      receivedDate: t.arrivalDate,
      status: "Stored",
      acceptanceStatus: t.acceptanceStatus,
    });
  }

  // Seed sensor data
  const { db: dbInst } = await import("./db");
  const { roomSensors } = await import("@shared/schema");
  // Normal readings for rm1
  await dbInst.insert(roomSensors).values([
    { roomId: rm1.id, temperature: "3.5", humidity: "88", co2Level: "2800", timestamp: new Date() },
    { roomId: rm2.id, temperature: "6.2", humidity: "96", co2Level: "4200", timestamp: new Date() }, // alerts!
  ]);
}
