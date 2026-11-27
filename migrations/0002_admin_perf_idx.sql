CREATE INDEX IF NOT EXISTS "Reservation_status_createdAt_idx" ON "Reservation"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Reservation_status_paymentMethod_createdAt_idx" ON "Reservation"("status", "paymentMethod", "createdAt");
CREATE INDEX IF NOT EXISTS "Reservation_deliveryType_updatedAt_idx" ON "Reservation"("deliveryType", "updatedAt");
CREATE INDEX IF NOT EXISTS "ReservationItem_reservationId_idx" ON "ReservationItem"("reservationId");
CREATE INDEX IF NOT EXISTS "ReservationItem_productId_idx" ON "ReservationItem"("productId");
CREATE INDEX IF NOT EXISTS "Product_stock_idx" ON "Product"("stock");
CREATE INDEX IF NOT EXISTS "User_createdAt_role_idx" ON "User"("createdAt", "role");
