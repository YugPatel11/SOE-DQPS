import { PrismaClient, Role } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPERADMIN_EMAIL;
  const name = process.env.SUPERADMIN_NAME || 'Super Admin';

  if (!email) {
    console.error('❌ SUPERADMIN_EMAIL environment variable is required');
    process.exit(1);
  }

  // Check if superadmin already exists
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    console.log(`✅ SuperAdmin already exists: ${email}`);
    return;
  }

  // Create a default password hash (admin should change this)
  const defaultPassword = await hash('ChangeMeNow!2024', 12);

  const superadmin = await prisma.user.create({
    data: {
      email,
      name,
      role: Role.SUPERADMIN,
      isActive: true,
      passwordHash: defaultPassword,
      mustChangePassword: true,
    },
  });

  console.log(`✅ SuperAdmin created successfully!`);
  console.log(`   Email: ${superadmin.email}`);
  console.log(`   Name: ${superadmin.name}`);
  console.log(`   ID: ${superadmin.id}`);
  console.log(`\n⚠️  Default password: ChangeMeNow!2024`);
  console.log(`   (SuperAdmin uses OTP login, but password is set as fallback)`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
