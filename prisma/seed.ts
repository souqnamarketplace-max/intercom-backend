// Bootstraps the very first login. Without this, there's a chicken-and-egg
// problem: only a platform_admin can create Owner accounts and other staff,
// but no staff account exists yet on a fresh database.
//
// Run once: npx ts-node prisma/seed.ts
// CHANGE THIS PASSWORD IMMEDIATELY after your first login.

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.SEED_ADMIN_PASSWORD || 'change-me-immediately';

  const existing = await prisma.staffAccount.findUnique({ where: { email } });
  if (existing) {
    console.log(`Platform admin already exists for ${email}, skipping.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.staffAccount.create({
    data: { email, passwordHash, role: 'platform_admin' },
  });

  console.log(`Created platform_admin: ${email} / ${password}`);
  console.log('Log in once, then change this password immediately.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
