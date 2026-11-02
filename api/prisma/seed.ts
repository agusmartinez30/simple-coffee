import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { hash } from 'argon2';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { unmetPasswordRequirements } from '../src/modules/auth/domain/password-policy.js';
import { normalizeEmail } from '../src/modules/auth/domain/staff-user.js';
import { Rfc6238Totp } from '../src/modules/auth/infrastructure/rfc6238-totp.js';
import { seedCatalog } from './seed-catalog.js';
import { seedTablesConfiguration } from './seed-tables.js';
import { seedVenue } from './seed-venue.js';

/**
 * Creates the single venue when missing (see `seed-venue.ts`), creates (or updates) the initial
 * owner from environment variables, and creates the sample table configuration when there is none
 * (see `seed-tables.ts`; its QR credentials are issued by the owner) and the sample menu when the catalog is empty (see `seed-catalog.ts`).
 * Run with `npm run db:seed`.
 * Credentials always come from the environment; nothing is hardcoded.
 */
const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    SEED_OWNER_EMAIL: z.email(),
    SEED_OWNER_PASSWORD: z.string().min(1),
    SEED_OWNER_NAME: z.string().min(1).default('Owner'),
    SEED_OWNER_MFA: z.stringbool().default(false),
  })
  .parse(process.env);

const email = normalizeEmail(env.SEED_OWNER_EMAIL);
const unmet = unmetPasswordRequirements(env.SEED_OWNER_PASSWORD);
if (unmet.length > 0) throw new Error(`SEED_OWNER_PASSWORD does not meet: ${unmet.join(', ')}`);

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });
const passwordHash = await hash(env.SEED_OWNER_PASSWORD);
const mfaSecret = env.SEED_OWNER_MFA ? new Rfc6238Totp().generateSecret() : null;

try {
  await seedVenue(prisma);
  console.log('Seeded venue profile and payment settings (kept existing ones).');

  const owner = await prisma.staffUser.upsert({
    where: { email },
    create: { email, name: env.SEED_OWNER_NAME, role: 'OWNER', passwordHash, mfaSecret },
    update: { name: env.SEED_OWNER_NAME, role: 'OWNER', passwordHash, mfaSecret, mfaLastUsedStep: null },
  });
  console.log(`Seeded owner ${email}.`);
  if (mfaSecret) {
    const label = encodeURIComponent(`Cafe Central:${email}`);
    console.log(`Add this to your authenticator app: otpauth://totp/${label}?secret=${mfaSecret}&issuer=Cafe%20Central`);
  }

  const seededTables = await seedTablesConfiguration(prisma, owner);
  console.log(seededTables ? 'Seeded spaces, tables and QR credentials.' : 'Kept the existing table configuration.');

  const seededCatalog = await seedCatalog(prisma);
  console.log(seededCatalog ? 'Seeded menu categories and products.' : 'Kept the existing catalog.');
} finally {
  await prisma.$disconnect();
}
