-- CreateTable
CREATE TABLE "Health" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "role" TEXT NOT NULL DEFAULT 'CLIENT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "managerCode" TEXT,
    "managerRateType" TEXT,
    "managerRateValue" DECIMAL,
    "managerActive" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "ManagerVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "managerId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "hits" INTEGER NOT NULL DEFAULT 1,
    "userId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManagerVisit_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SiteVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitorId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'ALL',
    "managerId" TEXT,
    "userId" TEXT,
    "firstPath" TEXT,
    "hits" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "CartAdd" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "managerId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'DIRECT',
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'General',
    "categoryId" TEXT,
    "notes" TEXT,
    "price" DECIMAL NOT NULL,
    "compareAtPrice" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'CUP',
    "costUsd" DECIMAL,
    "images" TEXT NOT NULL DEFAULT '[]',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "stock" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "duration" TEXT,
    "occasion" TEXT,
    "gender" TEXT NOT NULL DEFAULT 'UNISEX',
    "faqs" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "subtotal" DECIMAL NOT NULL,
    "deliveryType" TEXT NOT NULL,
    "address" TEXT,
    "latitude" REAL,
    "longitude" REAL,
    "distanceKm" REAL,
    "shippingCost" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "transferProofUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "customerNote" TEXT,
    "managerId" TEXT,
    "managerRateType" TEXT,
    "managerRateValue" DECIMAL,
    "managerSurcharge" DECIMAL NOT NULL DEFAULT 0,
    "managerCommission" DECIMAL NOT NULL DEFAULT 0,
    "payoutId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Reservation_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Reservation_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "ManagerPayout" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ManagerPayout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "managerId" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ManagerPayout_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ReservationItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reservationId" TEXT NOT NULL,
    "productId" TEXT,
    "comboId" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "priceOriginal" DECIMAL NOT NULL,
    "currencyOriginal" TEXT NOT NULL,
    "priceConverted" DECIMAL NOT NULL,
    "orderCurrency" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "ReservationItem_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ReservationItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "reservationId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WithdrawalRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "WithdrawalRequest_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CartItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StoreSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "brand" TEXT NOT NULL DEFAULT 'Mist & Mood',
    "tagline" TEXT NOT NULL DEFAULT '',
    "bankDetails" TEXT NOT NULL DEFAULT 'Banco Ejemplo
Titular: Mist & Mood S.R.L.
CUENTA: 0000000000
CBU: 0000000000000000000000
Alias: MIST-AND-MOOD',
    "whatsapp" TEXT NOT NULL DEFAULT '5491100000000',
    "whatsappDisplay" TEXT NOT NULL DEFAULT '+54 911 0000 0000',
    "storeAddress" TEXT NOT NULL DEFAULT '123 Calle Ejemplo, Buenos Aires',
    "storeLat" REAL NOT NULL DEFAULT -34.6037,
    "storeLng" REAL NOT NULL DEFAULT -58.3816,
    "baseRate" DECIMAL NOT NULL DEFAULT 250,
    "perKm" DECIMAL NOT NULL DEFAULT 120,
    "maxRadius" REAL NOT NULL DEFAULT 15,
    "baseCurrency" TEXT NOT NULL DEFAULT 'CUP',
    "displayCurrency" TEXT NOT NULL DEFAULT 'CUP',
    "showSecondCurrency" BOOLEAN NOT NULL DEFAULT false,
    "secondCurrency" TEXT NOT NULL DEFAULT 'USD',
    "showStock" BOOLEAN NOT NULL DEFAULT true,
    "notificationPhones" TEXT NOT NULL DEFAULT '[]',
    "currencies" TEXT NOT NULL DEFAULT '[{"code":"CUP","symbol":"$","rate":1,"label":"Peso cubano"},{"code":"USD","symbol":"US$","rate":320,"label":"Dólar"},{"code":"EUR","symbol":"€","rate":345,"label":"Euro"},{"code":"MLC","symbol":"MLC","rate":270,"label":"MLC"}]',
    "logoUrl" TEXT,
    "termsText" TEXT NOT NULL DEFAULT '',
    "privacyText" TEXT NOT NULL DEFAULT '',
    "cookiesText" TEXT NOT NULL DEFAULT '',
    "reservationsText" TEXT NOT NULL DEFAULT '',
    "catalogTitle" TEXT NOT NULL DEFAULT 'Catálogo',
    "catalogIntro" TEXT NOT NULL DEFAULT 'Filtrá por familia olfativa, marca o precio para encontrar tu fragancia.',
    "heroTitle" TEXT NOT NULL DEFAULT '',
    "heroSubtitle" TEXT NOT NULL DEFAULT '',
    "siteTexts" TEXT NOT NULL DEFAULT '{}',
    "seoTitle" TEXT NOT NULL DEFAULT 'Mist & Mood — Perfumería cubana',
    "seoDescription" TEXT NOT NULL DEFAULT 'Perfumes con reserva online y entrega en La Habana. Retiro en tienda o envío por kilómetro.',
    "seoKeywords" TEXT NOT NULL DEFAULT 'perfumes, perfumería, fragancias, perfumes originales, La Habana, Cuba, reservar perfume',
    "siteUrl" TEXT NOT NULL DEFAULT '',
    "googleSiteVerification" TEXT NOT NULL DEFAULT '',
    "vapidPublicKey" TEXT NOT NULL DEFAULT '',
    "vapidPrivateKey" TEXT NOT NULL DEFAULT '',
    "aiApiKey" TEXT NOT NULL DEFAULT '',
    "aiProvider" TEXT NOT NULL DEFAULT '',
    "aiModel" TEXT NOT NULL DEFAULT '',
    "autoRestockEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autoRepurchaseEnabled" BOOLEAN NOT NULL DEFAULT true,
    "repurchaseDays" INTEGER NOT NULL DEFAULT 60,
    "emailFrom" TEXT NOT NULL DEFAULT '',
    "emailApiKey" TEXT NOT NULL DEFAULT '',
    "emailProvider" TEXT NOT NULL DEFAULT '',
    "ownerEmail" TEXT NOT NULL DEFAULT '',
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CampaignTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'WHATSAPP',
    "message" TEXT NOT NULL,
    "link" TEXT,
    "uses" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Combo" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "image" TEXT,
    "price" DECIMAL NOT NULL,
    "compareAtPrice" DECIMAL,
    "currency" TEXT NOT NULL DEFAULT 'CUP',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ComboItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "comboId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "ComboItem_comboId_fkey" FOREIGN KEY ("comboId") REFERENCES "Combo" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ComboItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "subtitle" TEXT NOT NULL DEFAULT '',
    "image" TEXT,
    "ctaLabel" TEXT NOT NULL DEFAULT '',
    "ctaUrl" TEXT NOT NULL DEFAULT '',
    "background" TEXT NOT NULL DEFAULT '#1b1a17',
    "textColor" TEXT NOT NULL DEFAULT '#f6f1e6',
    "placement" TEXT NOT NULL DEFAULT 'HOME',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "endsAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StockAlert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "notifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "comment" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Review_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CheckoutIntent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "summary" TEXT NOT NULL,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'CUP',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "contactedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "LaunchWaitlist" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "interest" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "notifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "OutboxMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL DEFAULT 'MANUAL',
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "dedupeKey" TEXT,
    "sentAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CurrencyRateLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "rate" REAL NOT NULL,
    "snapshot" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_managerCode_key" ON "User"("managerCode");

-- CreateIndex
CREATE INDEX "User_managerCode_idx" ON "User"("managerCode");

-- CreateIndex
CREATE INDEX "ManagerVisit_managerId_createdAt_idx" ON "ManagerVisit"("managerId", "createdAt");

-- CreateIndex
CREATE INDEX "ManagerVisit_managerId_userId_idx" ON "ManagerVisit"("managerId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ManagerVisit_managerId_visitorId_day_key" ON "ManagerVisit"("managerId", "visitorId", "day");

-- CreateIndex
CREATE INDEX "SiteVisit_day_idx" ON "SiteVisit"("day");

-- CreateIndex
CREATE INDEX "SiteVisit_managerId_idx" ON "SiteVisit"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteVisit_visitorId_day_scope_key" ON "SiteVisit"("visitorId", "day", "scope");

-- CreateIndex
CREATE INDEX "CartAdd_createdAt_idx" ON "CartAdd"("createdAt");

-- CreateIndex
CREATE INDEX "CartAdd_managerId_idx" ON "CartAdd"("managerId");

-- CreateIndex
CREATE INDEX "CartAdd_visitorId_idx" ON "CartAdd"("visitorId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_order_idx" ON "Category"("order");

-- CreateIndex
CREATE INDEX "Product_visible_createdAt_idx" ON "Product"("visible", "createdAt");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_code_key" ON "Reservation"("code");

-- CreateIndex
CREATE INDEX "Reservation_userId_idx" ON "Reservation"("userId");

-- CreateIndex
CREATE INDEX "Reservation_managerId_idx" ON "Reservation"("managerId");

-- CreateIndex
CREATE INDEX "Reservation_payoutId_idx" ON "Reservation"("payoutId");

-- CreateIndex
CREATE INDEX "ManagerPayout_managerId_idx" ON "ManagerPayout"("managerId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_productId_key" ON "WishlistItem"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_userId_productId_key" ON "CartItem"("userId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");

-- CreateIndex
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- CreateIndex
CREATE INDEX "Campaign_createdAt_idx" ON "Campaign"("createdAt");

-- CreateIndex
CREATE INDEX "CampaignTemplate_createdAt_idx" ON "CampaignTemplate"("createdAt");

-- CreateIndex
CREATE INDEX "Combo_visible_order_idx" ON "Combo"("visible", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ComboItem_comboId_productId_key" ON "ComboItem"("comboId", "productId");

-- CreateIndex
CREATE INDEX "Banner_visible_placement_order_idx" ON "Banner"("visible", "placement", "order");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_createdAt_idx" ON "ChatMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "StockAlert_productId_status_idx" ON "StockAlert"("productId", "status");

-- CreateIndex
CREATE INDEX "Review_productId_status_idx" ON "Review"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Review_productId_userId_key" ON "Review"("productId", "userId");

-- CreateIndex
CREATE INDEX "CheckoutIntent_status_createdAt_idx" ON "CheckoutIntent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "LaunchWaitlist_status_createdAt_idx" ON "LaunchWaitlist"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "OutboxMessage_dedupeKey_key" ON "OutboxMessage"("dedupeKey");

-- CreateIndex
CREATE INDEX "OutboxMessage_status_createdAt_idx" ON "OutboxMessage"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxMessage_kind_createdAt_idx" ON "OutboxMessage"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "CurrencyRateLog_code_createdAt_idx" ON "CurrencyRateLog"("code", "createdAt");
