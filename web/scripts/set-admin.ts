import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

type Args = {
  email?: string;
  password?: string;
};

function parseArgs() {
  const args: Args = {};
  const entries = process.argv.slice(2);
  for (let i = 0; i < entries.length; i += 1) {
    const current = entries[i];
    if (current === "--email") {
      args.email = entries[i + 1];
      i += 1;
    } else if (current === "--password") {
      args.password = entries[i + 1];
      i += 1;
    }
  }
  return args;
}

async function main() {
  const prisma = new PrismaClient();
  const args = parseArgs();
  const email = (args.email || process.env.ADMIN_EMAIL || "").toLowerCase().trim();
  const password = args.password || process.env.ADMIN_PASSWORD || "";

  if (!email || !password) {
    console.error("Usage: tsx scripts/set-admin.ts --email <email> --password <password>");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: Role.ADMIN },
    create: {
      email,
      passwordHash,
      name: "ILLUVRSE Admin",
      role: Role.ADMIN,
    },
  });

  console.log(`Admin credentials set for ${email}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
