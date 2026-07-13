const b = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
p.user.update({
  where: { email: "ray@renovessa.com" },
  data: { passwordHash: b.hashSync("Renovessa2026", 10) },
}).then(() => {
  console.log("done");
  p.$disconnect();
}).catch((e) => {
  console.error(e);
  p.$disconnect();
});
