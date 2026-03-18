import { db } from "./db";
import {
  users, warehouses, rooms, suppliers, farms, trucks, batches, shipments, losses, roomSensors,
  type UserResponse, type WarehouseResponse, type RoomResponse, type SupplierResponse,
  type FarmResponse, type TruckResponse, type BatchResponse, type ShipmentResponse,
  type LossResponse, type RoomSensorResponse,
  type CreateWarehouseRequest, type UpdateWarehouseRequest,
  type CreateRoomRequest, type UpdateRoomRequest,
  type CreateSupplierRequest, type UpdateSupplierRequest, type CreateFarmRequest,
  type CreateTruckRequest, type CreateBatchRequest, type UpdateBatchRequest,
  type CreateShipmentRequest, type CreateLossRequest,
  type DashboardStatsResponse, type WeeklyFlowPoint,
  type WarehouseUtilizationResponse, type SensorAlertResponse
} from "@shared/schema";
import { eq, sql, and, gte, lte, desc } from "drizzle-orm";

export interface IStorage {
  getUsers(): Promise<UserResponse[]>;
  updateUser(id: string, updates: { role?: string; warehouseId?: number | null }): Promise<UserResponse>;

  getWarehouses(): Promise<WarehouseResponse[]>;
  createWarehouse(warehouse: CreateWarehouseRequest): Promise<WarehouseResponse>;
  updateWarehouse(id: number, updates: UpdateWarehouseRequest): Promise<WarehouseResponse>;

  getRooms(): Promise<RoomResponse[]>;
  getRoomsByWarehouse(warehouseId: number): Promise<RoomResponse[]>;
  createRoom(room: CreateRoomRequest): Promise<RoomResponse>;
  updateRoom(id: number, updates: UpdateRoomRequest): Promise<RoomResponse>;

  getSuppliers(): Promise<SupplierResponse[]>;
  createSupplier(supplier: CreateSupplierRequest): Promise<SupplierResponse>;
  updateSupplier(id: number, updates: UpdateSupplierRequest): Promise<SupplierResponse>;

  getFarms(): Promise<FarmResponse[]>;
  createFarm(farm: CreateFarmRequest): Promise<FarmResponse>;

  getTrucks(): Promise<TruckResponse[]>;
  createTruck(truck: CreateTruckRequest): Promise<TruckResponse>;
  updateTruckSecondWeight(id: number, secondWeightKg: number, totalWeightKg: number): Promise<TruckResponse>;

  getBatches(): Promise<BatchResponse[]>;
  getBatch(lotNumber: string): Promise<BatchResponse | undefined>;
  createBatch(batch: CreateBatchRequest): Promise<BatchResponse>;
  updateBatch(lotNumber: string, updates: UpdateBatchRequest): Promise<BatchResponse>;

  getShipments(): Promise<ShipmentResponse[]>;
  createShipment(shipment: CreateShipmentRequest): Promise<ShipmentResponse>;

  getLosses(): Promise<LossResponse[]>;
  createLoss(loss: CreateLossRequest): Promise<LossResponse>;

  getRoomSensors(roomId: number): Promise<RoomSensorResponse[]>;
  createRoomSensor(data: { roomId: number; temperature: string; humidity: string; co2Level: string }): Promise<RoomSensorResponse>;
  getLatestSensorPerRoom(): Promise<RoomSensorResponse[]>;

  getDashboardStats(): Promise<DashboardStatsResponse>;
  getWeeklyFlow(): Promise<WeeklyFlowPoint[]>;
  getWarehouseUtilization(): Promise<WarehouseUtilizationResponse[]>;
  getSensorAlerts(): Promise<SensorAlertResponse[]>;
}

export class DatabaseStorage implements IStorage {
  async getUsers() {
    return await db.select().from(users);
  }

  async updateUser(id: string, updates: { role?: string; warehouseId?: number | null }) {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated;
  }

  async getWarehouses() {
    return await db.select().from(warehouses).orderBy(warehouses.name);
  }

  async createWarehouse(warehouse: CreateWarehouseRequest) {
    const [created] = await db.insert(warehouses).values(warehouse).returning();
    return created;
  }

  async updateWarehouse(id: number, updates: UpdateWarehouseRequest) {
    const [updated] = await db.update(warehouses).set(updates).where(eq(warehouses.id, id)).returning();
    return updated;
  }

  async getRooms() {
    return await db.select().from(rooms).orderBy(rooms.name);
  }

  async getRoomsByWarehouse(warehouseId: number) {
    return await db.select().from(rooms).where(eq(rooms.warehouseId, warehouseId));
  }

  async createRoom(room: CreateRoomRequest) {
    const [created] = await db.insert(rooms).values(room).returning();
    return created;
  }

  async updateRoom(id: number, updates: UpdateRoomRequest) {
    const [updated] = await db.update(rooms).set(updates).where(eq(rooms.id, id)).returning();
    return updated;
  }

  async getSuppliers() {
    return await db.select().from(suppliers).orderBy(suppliers.name);
  }

  async createSupplier(supplier: CreateSupplierRequest) {
    const [created] = await db.insert(suppliers).values(supplier).returning();
    return created;
  }

  async updateSupplier(id: number, updates: UpdateSupplierRequest) {
    const [updated] = await db.update(suppliers).set(updates).where(eq(suppliers.id, id)).returning();
    if (!updated) throw new Error("Supplier not found");
    return updated;
  }

  async getFarms() {
    return await db.select().from(farms).orderBy(farms.name);
  }

  async createFarm(farm: CreateFarmRequest) {
    const [created] = await db.insert(farms).values(farm).returning();
    return created;
  }

  async getTrucks() {
    return await db.select().from(trucks).orderBy(desc(trucks.arrivalDate));
  }

  async createTruck(truck: CreateTruckRequest) {
    const [created] = await db.insert(trucks).values(truck).returning();
    return created;
  }

  async updateTruckSecondWeight(id: number, secondWeightKg: number, totalWeightKg: number) {
    const [updated] = await db.update(trucks)
      .set({ secondWeightKg, totalWeightKg })
      .where(eq(trucks.id, id))
      .returning();
    return updated;
  }

  async getBatches() {
    return await db.select().from(batches).orderBy(desc(batches.receivedDate));
  }

  async getBatch(lotNumber: string) {
    const [batch] = await db.select().from(batches).where(eq(batches.lotNumber, lotNumber));
    return batch;
  }

  async createBatch(batch: CreateBatchRequest) {
    const [created] = await db.insert(batches).values(batch).returning();
    return created;
  }

  async updateBatch(lotNumber: string, updates: UpdateBatchRequest) {
    const [updated] = await db.update(batches).set(updates).where(eq(batches.lotNumber, lotNumber)).returning();
    return updated;
  }

  async getShipments() {
    return await db.select().from(shipments).orderBy(desc(shipments.shippedDate));
  }

  async createShipment(shipment: CreateShipmentRequest) {
    const batch = await this.getBatch(shipment.batchId);
    if (batch) {
      const newQty = Math.max(0, batch.currentQuantityKg - shipment.quantityKg);
      const newStatus = newQty <= 0 ? 'Depleted' : 'Partial';
      await db.update(batches)
        .set({ currentQuantityKg: newQty, status: newStatus })
        .where(eq(batches.lotNumber, shipment.batchId));
    }
    const [created] = await db.insert(shipments).values(shipment).returning();
    return created;
  }

  async getLosses() {
    return await db.select().from(losses).orderBy(desc(losses.recordedDate));
  }

  async createLoss(loss: CreateLossRequest) {
    const batch = await this.getBatch(loss.batchId);
    if (batch) {
      const newQty = Math.max(0, batch.currentQuantityKg - loss.quantityKg);
      const newStatus = newQty <= 0 ? 'Depleted' : (newQty < batch.initialQuantityKg ? 'Partial' : 'Stored');
      await db.update(batches)
        .set({ currentQuantityKg: newQty, status: newStatus })
        .where(eq(batches.lotNumber, loss.batchId));
    }
    const [created] = await db.insert(losses).values(loss).returning();
    return created;
  }

  async getRoomSensors(roomId: number) {
    return await db.select().from(roomSensors)
      .where(eq(roomSensors.roomId, roomId))
      .orderBy(desc(roomSensors.timestamp))
      .limit(100);
  }

  async createRoomSensor(data: { roomId: number; temperature: string; humidity: string; co2Level: string }) {
    const [created] = await db.insert(roomSensors).values({
      roomId: data.roomId,
      temperature: data.temperature,
      humidity: data.humidity,
      co2Level: data.co2Level,
    }).returning();
    return created;
  }

  async getLatestSensorPerRoom() {
    // Get the latest sensor reading for each room using a subquery
    const result = await db.execute(sql`
      SELECT DISTINCT ON (room_id) 
        id, room_id as "roomId", temperature, humidity, co2_level as "co2Level", timestamp
      FROM room_sensors
      ORDER BY room_id, timestamp DESC
    `);
    return result.rows as RoomSensorResponse[];
  }

  async getDashboardStats(): Promise<DashboardStatsResponse> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ trucksReceived }] = await db.select({ trucksReceived: sql<number>`count(*)::int` })
      .from(trucks).where(gte(trucks.arrivalDate, today));

    const [{ tonsReceived }] = await db.select({ tonsReceived: sql<number>`COALESCE(sum(total_weight_kg), 0)::bigint` })
      .from(trucks).where(gte(trucks.arrivalDate, today));

    const [{ tonsShipped }] = await db.select({ tonsShipped: sql<number>`COALESCE(sum(quantity_kg), 0)::bigint` })
      .from(shipments).where(gte(shipments.shippedDate, today));

    const [{ activeBatches }] = await db.select({ activeBatches: sql<number>`count(*)::int` })
      .from(batches).where(sql`${batches.status} IN ('Stored', 'Partial')`);

    const [{ totalCurrentInventory }] = await db.select({ totalCurrentInventory: sql<number>`COALESCE(sum(current_quantity_kg), 0)::bigint` })
      .from(batches).where(sql`${batches.status} IN ('Stored', 'Partial')`);

    const [{ totalCapacity }] = await db.select({ totalCapacity: sql<number>`COALESCE(sum(capacity_kg), 1)::bigint` })
      .from(rooms).where(eq(rooms.isActive, true));

    const utilization = totalCapacity > 0 ? Math.round((Number(totalCurrentInventory) / Number(totalCapacity)) * 100) : 0;

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const [{ expiringIn7Days }] = await db.select({ expiringIn7Days: sql<number>`count(*)::int` })
      .from(batches).where(and(
        sql`${batches.status} IN ('Stored', 'Partial')`,
        lte(batches.expirationDate, sevenDaysFromNow)
      ));

    const [{ lossRecordedToday }] = await db.select({ lossRecordedToday: sql<number>`COALESCE(sum(quantity_kg), 0)::bigint` })
      .from(losses).where(gte(losses.recordedDate, today));

    const alerts = await this.getSensorAlerts();

    return {
      trucksReceivedToday: trucksReceived,
      tonsReceivedToday: Math.round(Number(tonsReceived) / 1000),
      tonsShippedToday: Math.round(Number(tonsShipped) / 1000),
      activeBatches: activeBatches,
      totalCurrentInventoryKg: Number(totalCurrentInventory),
      capacityUtilizationPercent: utilization,
      roomsOverThreshold: alerts.length,
      expiringIn7Days: expiringIn7Days,
      lossRecordedTodayKg: Number(lossRecordedToday)
    };
  }

  async getWeeklyFlow(): Promise<WeeklyFlowPoint[]> {
    const days: WeeklyFlowPoint[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);

      const [{ inKg }] = await db.select({ inKg: sql<number>`COALESCE(sum(total_weight_kg), 0)::bigint` })
        .from(trucks).where(and(gte(trucks.arrivalDate, d), lte(trucks.arrivalDate, next)));

      const [{ outKg }] = await db.select({ outKg: sql<number>`COALESCE(sum(quantity_kg), 0)::bigint` })
        .from(shipments).where(and(gte(shipments.shippedDate, d), lte(shipments.shippedDate, next)));

      days.push({
        date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
        inbound: Math.round(Number(inKg) / 1000),
        outbound: Math.round(Number(outKg) / 1000),
      });
    }
    return days;
  }

  async getWarehouseUtilization(): Promise<WarehouseUtilizationResponse[]> {
    const allWarehouses = await this.getWarehouses();
    const allRooms = await this.getRooms();
    const allBatches = await db.select().from(batches)
      .where(sql`${batches.status} IN ('Stored', 'Partial')`);

    return allWarehouses.map(wh => {
      const whRooms = allRooms.filter(r => r.warehouseId === wh.id);
      const roomsWithUsage = whRooms.map(room => {
        const usedKg = allBatches
          .filter(b => b.roomId === room.id)
          .reduce((sum, b) => sum + b.currentQuantityKg, 0);
        return { roomId: room.id, roomName: room.name, capacityKg: room.capacityKg, usedKg };
      });

      const totalCapacityKg = whRooms.reduce((s, r) => s + r.capacityKg, 0);
      const usedKg = roomsWithUsage.reduce((s, r) => s + r.usedKg, 0);

      return {
        warehouseId: wh.id,
        warehouseName: wh.name,
        warehouseLocation: wh.location,
        totalCapacityKg,
        usedKg,
        rooms: roomsWithUsage
      };
    });
  }

  async getSensorAlerts(): Promise<SensorAlertResponse[]> {
    const allRooms = await this.getRooms();
    const allWarehouses = await this.getWarehouses();
    const latestSensors = await this.getLatestSensorPerRoom();

    const alerts: SensorAlertResponse[] = [];

    for (const sensor of latestSensors) {
      const room = allRooms.find(r => r.id === Number(sensor.roomId));
      if (!room) continue;
      const wh = allWarehouses.find(w => w.id === room.warehouseId);
      const whName = wh?.name || "Unknown";

      const temp = Number(sensor.temperature);
      const humidity = Number(sensor.humidity);
      const co2 = Number(sensor.co2Level);
      const maxTemp = Number(room.maxTempC || 5);
      const maxHumidity = Number(room.maxHumidityPct || 95);
      const maxCo2 = Number(room.maxCo2Ppm || 4000);

      if (temp > maxTemp) {
        alerts.push({ roomId: room.id, roomName: room.name, warehouseName: whName, alertType: 'temperature', value: temp, limit: maxTemp, timestamp: String(sensor.timestamp) });
      }
      if (humidity > maxHumidity) {
        alerts.push({ roomId: room.id, roomName: room.name, warehouseName: whName, alertType: 'humidity', value: humidity, limit: maxHumidity, timestamp: String(sensor.timestamp) });
      }
      if (co2 > maxCo2) {
        alerts.push({ roomId: room.id, roomName: room.name, warehouseName: whName, alertType: 'co2', value: co2, limit: maxCo2, timestamp: String(sensor.timestamp) });
      }
    }

    return alerts;
  }
}

export const storage = new DatabaseStorage();
