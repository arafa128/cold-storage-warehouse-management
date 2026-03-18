import { z } from 'zod';
import { 
  insertWarehouseSchema, 
  insertRoomSchema, 
  insertSupplierSchema, 
  insertFarmSchema,
  insertTruckSchema,
  insertBatchSchema,
  insertShipmentSchema,
  insertLossSchema,
  users, warehouses, rooms, suppliers, farms, trucks, batches, shipments, losses, roomSensors
} from './schema';

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  users: {
    list: { method: 'GET' as const, path: '/api/users' as const, responses: { 200: z.array(z.custom<typeof users.$inferSelect>()) } },
    update: { method: 'PUT' as const, path: '/api/users/:id' as const, input: z.object({ role: z.string().optional(), warehouseId: z.number().nullable().optional() }), responses: { 200: z.custom<typeof users.$inferSelect>(), 404: errorSchemas.notFound } }
  },
  warehouses: {
    list: { method: 'GET' as const, path: '/api/warehouses' as const, responses: { 200: z.array(z.custom<typeof warehouses.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/warehouses' as const, input: insertWarehouseSchema, responses: { 201: z.custom<typeof warehouses.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: 'PUT' as const, path: '/api/warehouses/:id' as const, input: insertWarehouseSchema.partial(), responses: { 200: z.custom<typeof warehouses.$inferSelect>(), 404: errorSchemas.notFound } }
  },
  rooms: {
    list: { method: 'GET' as const, path: '/api/rooms' as const, responses: { 200: z.array(z.custom<typeof rooms.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/rooms' as const, input: insertRoomSchema, responses: { 201: z.custom<typeof rooms.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: 'PUT' as const, path: '/api/rooms/:id' as const, input: insertRoomSchema.partial(), responses: { 200: z.custom<typeof rooms.$inferSelect>(), 404: errorSchemas.notFound } }
  },
  suppliers: {
    list: { method: 'GET' as const, path: '/api/suppliers' as const, responses: { 200: z.array(z.custom<typeof suppliers.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/suppliers' as const, input: insertSupplierSchema, responses: { 201: z.custom<typeof suppliers.$inferSelect>(), 400: errorSchemas.validation } }
  },
  farms: {
    list: { method: 'GET' as const, path: '/api/farms' as const, responses: { 200: z.array(z.custom<typeof farms.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/farms' as const, input: insertFarmSchema, responses: { 201: z.custom<typeof farms.$inferSelect>(), 400: errorSchemas.validation } }
  },
  trucks: {
    list: { method: 'GET' as const, path: '/api/trucks' as const, responses: { 200: z.array(z.custom<typeof trucks.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/trucks' as const, input: z.any(), responses: { 201: z.custom<typeof trucks.$inferSelect>(), 400: errorSchemas.validation } }
  },
  batches: {
    list: { method: 'GET' as const, path: '/api/batches' as const, responses: { 200: z.array(z.custom<typeof batches.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/batches' as const, input: insertBatchSchema, responses: { 201: z.custom<typeof batches.$inferSelect>(), 400: errorSchemas.validation } },
    update: { method: 'PUT' as const, path: '/api/batches/:lotNumber' as const, input: insertBatchSchema.partial(), responses: { 200: z.custom<typeof batches.$inferSelect>(), 404: errorSchemas.notFound } }
  },
  shipments: {
    list: { method: 'GET' as const, path: '/api/shipments' as const, responses: { 200: z.array(z.custom<typeof shipments.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/shipments' as const, input: insertShipmentSchema, responses: { 201: z.custom<typeof shipments.$inferSelect>(), 400: errorSchemas.validation } }
  },
  losses: {
    list: { method: 'GET' as const, path: '/api/losses' as const, responses: { 200: z.array(z.custom<typeof losses.$inferSelect>()) } },
    create: { method: 'POST' as const, path: '/api/losses' as const, input: insertLossSchema, responses: { 201: z.custom<typeof losses.$inferSelect>(), 400: errorSchemas.validation } }
  },
  roomSensors: {
    list: { method: 'GET' as const, path: '/api/rooms/:id/sensors' as const, responses: { 200: z.array(z.custom<typeof roomSensors.$inferSelect>()) } }
  },
  dashboard: {
    stats: { method: 'GET' as const, path: '/api/dashboard/stats' as const, responses: { 200: z.any() } }
  }
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) url = url.replace(`:${key}`, String(value));
    });
  }
  return url;
}
