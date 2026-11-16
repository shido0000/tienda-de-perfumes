import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
const prisma = new PrismaClient();
const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
const secret = process.env.AUTH_SECRET || "dev-secret";
const t = jwt.sign({ sub: admin.id, role: admin.role }, secret, { expiresIn: "2h" });
console.log(t);
await prisma.$disconnect();
