import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const hash = bcrypt.hashSync("Renovessa2026", 10);
  await prisma.user.update({
    where: { email: "ray@renovessa.com" },
    data: { passwordHash: hash },
  });
  console.log("Password updated for ray@renovessa.com -> Renovessa2026");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
