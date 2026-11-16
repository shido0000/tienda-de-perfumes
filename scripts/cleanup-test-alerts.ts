import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const a = await p.stockAlert.deleteMany({ where: { name: { contains: "zz-test" } } });
  const c = await p.checkoutIntent.deleteMany({
    where: { OR: [{ name: { contains: "zz-test" } }, { summary: { contains: "zz-test" } }] },
  });
  const r = await p.review.deleteMany({ where: { comment: { contains: "zz-test" } } });
  console.log("alerts", a.count, "intents", c.count, "reviews", r.count);
  await p.$disconnect();
})();
