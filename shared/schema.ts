import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users, sessions } from "./models/auth";

export { users, sessions };

export const warehouses = pgTable("warehouses", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  warehouseId: integer("warehouse_id").notNull(),
  name: text("name").notNull(),
  potatoType: text("potato_type").notNull(),
  capacityKg: integer("capacity_kg").notNull(),
  storageType: text("storage_type").notNull(), // bulk / pallets
  isActive: boolean("is_active").default(true),
  // Sensor thresholds
  maxTempC: numeric("max_temp_c").default("5"),
  maxHumidityPct: numeric("max_humidity_pct").default("95"),
  maxCo2Ppm: numeric("max_co2_ppm").default("4000"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  contactInfo: text("contact_info"),
  maxAcceptedQuantityKg: integer("max_accepted_quantity_kg"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const farms = pgTable("farms", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id"),
  name: text("name").notNull(),
  location: text("location"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const trucks = pgTable("trucks", {
  id: serial("id").primaryKey(),
  truckNumber: text("truck_number").notNull(),
  supplierId: integer("supplier_id"),
  farmId: integer("farm_id"),
  productType: text("product_type").notNull(), // Potato / Corn
  variety: text("variety").notNull(),
  antiSproutType: text("anti_sprout_type"),
  firstWeightKg: integer("first_weight_kg").notNull(),
  secondWeightKg: integer("second_weight_kg"), // optional — weighed on the way out
  totalWeightKg: integer("total_weight_kg").notNull(), // net weight (first - second) or first if no second
  arrivalDate: timestamp("arrival_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const batches = pgTable("batches", {
  lotNumber: text("lot_number").primaryKey(),
  truckId: integer("truck_id").notNull(),
  warehouseId: integer("warehouse_id").notNull(),
  roomId: integer("room_id").notNull(),
  initialQuantityKg: integer("initial_quantity_kg").notNull(),
  currentQuantityKg: integer("current_quantity_kg").notNull(),
  jamboBags: integer("jambo_bags"),
  expirationDate: timestamp("expiration_date").notNull(),
  receivedDate: timestamp("received_date").notNull(),
  status: text("status").notNull().default("Stored"), // Stored, Partial, Depleted, Expired
  acceptanceStatus: text("acceptance_status").notNull().default("Accepted"), // Accepted, Rejected, Partial Reject
});

export const shipments = pgTable("shipments", {
  id: serial("id").primaryKey(),
  shipmentNumber: text("shipment_number"),
  batchId: text("batch_id").notNull(),
  quantityKg: integer("quantity_kg").notNull(),
  destination: text("destination").notNull(),
  shipmentType: text("shipment_type").default("Full"), // Full, Partial
  shippedDate: timestamp("shipped_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const losses = pgTable("losses", {
  id: serial("id").primaryKey(),
  batchId: text("batch_id").notNull(),
  lossType: text("loss_type").notNull(), // Rot, Damage, Shrinkage
  quantityKg: integer("quantity_kg").notNull(),
  notes: text("notes"),
  recordedDate: timestamp("recorded_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const roomSensors = pgTable("room_sensors", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").notNull(),
  temperature: numeric("temperature").notNull(),
  humidity: numeric("humidity").notNull(),
  co2Level: numeric("co2_level").notNull(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Zod schemas for inserts/updates
export const insertWarehouseSchema = createInsertSchema(warehouses).omit({ id: true, createdAt: true });
export const insertRoomSchema = createInsertSchema(rooms).omit({ id: true, createdAt: true });
export const insertSupplierSchema = createInsertSchema(suppliers).omit({ id: true, createdAt: true });
export const insertFarmSchema = createInsertSchema(farms).omit({ id: true, createdAt: true });
export const insertTruckSchema = createInsertSchema(trucks).omit({ id: true, createdAt: true });
export const insertBatchSchema = createInsertSchema(batches);
export const insertShipmentSchema = createInsertSchema(shipments).omit({ id: true, createdAt: true });
export const insertLossSchema = createInsertSchema(losses).omit({ id: true, createdAt: true });
export const insertRoomSensorSchema = createInsertSchema(roomSensors).omit({ id: true, timestamp: true });

// Types
export type UserResponse = typeof users.$inferSelect;
export type WarehouseResponse = typeof warehouses.$inferSelect;
export type RoomResponse = typeof rooms.$inferSelect;
export type SupplierResponse = typeof suppliers.$inferSelect;
export type FarmResponse = typeof farms.$inferSelect;
export type TruckResponse = typeof trucks.$inferSelect;
export type BatchResponse = typeof batches.$inferSelect;
export type ShipmentResponse = typeof shipments.$inferSelect;
export type LossResponse = typeof losses.$inferSelect;
export type RoomSensorResponse = typeof roomSensors.$inferSelect;

export type CreateWarehouseRequest = z.infer<typeof insertWarehouseSchema>;
export type UpdateWarehouseRequest = Partial<CreateWarehouseRequest>;
export type CreateRoomRequest = z.infer<typeof insertRoomSchema>;
export type UpdateRoomRequest = Partial<CreateRoomRequest>;
export type CreateSupplierRequest = z.infer<typeof insertSupplierSchema>;
export type UpdateSupplierRequest = Partial<CreateSupplierRequest>;

export interface SupplierRemainingQuota {
  supplierId: number;
  supplierName: string;
  maxAcceptedQuantityKg: number;
  totalReceivedKg: number;
  remainingKg: number;
}
export type CreateFarmRequest = z.infer<typeof insertFarmSchema>;
export type CreateTruckRequest = z.infer<typeof insertTruckSchema>;
export type CreateBatchRequest = z.infer<typeof insertBatchSchema>;
export type UpdateBatchRequest = Partial<CreateBatchRequest>;
export type CreateShipmentRequest = z.infer<typeof insertShipmentSchema>;
export type CreateLossRequest = z.infer<typeof insertLossSchema>;
export type CreateRoomSensorRequest = z.infer<typeof insertRoomSensorSchema>;

export interface DashboardStatsResponse {
  trucksReceivedToday: number;
  tonsReceivedToday: number;
  tonsShippedToday: number;
  activeBatches: number;
  totalCurrentInventoryKg: number;
  capacityUtilizationPercent: number;
  roomsOverThreshold: number;
  expiringIn7Days: number;
  lossRecordedTodayKg: number;
}

export interface WeeklyFlowPoint {
  date: string;
  inbound: number;
  outbound: number;
}

export interface WarehouseUtilizationResponse {
  warehouseId: number;
  warehouseName: string;
  warehouseLocation: string;
  totalCapacityKg: number;
  usedKg: number;
  rooms: { roomId: number; roomName: string; capacityKg: number; usedKg: number }[];
}

export interface SensorAlertResponse {
  roomId: number;
  roomName: string;
  warehouseName: string;
  alertType: "temperature" | "humidity" | "co2";
  value: number;
  limit: number;
  timestamp: string;
}
