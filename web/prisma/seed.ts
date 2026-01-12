import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@illuvrse.local';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existing) return existing;

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  return prisma.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      name: 'ILLUVRSE Admin',
      role: Role.ADMIN,
    },
  });
}

async function seedContent() {
  const show = await prisma.show.upsert({
    where: { slug: 'illuvrse-origins' },
    update: {},
    create: {
      slug: 'illuvrse-origins',
      title: 'ILLUVRSE: Origins',
      synopsis: 'Journey into uncharted realms and discover the first Illuvials.',
    },
  });

  const season1 = await prisma.season.upsert({
    where: { showId_number: { showId: show.id, number: 1 } },
    update: {},
    create: {
      showId: show.id,
      number: 1,
      title: 'Season 1',
      synopsis: 'The beginning of the Illuvrse saga.',
    },
  });

  const episode1 = await prisma.episode.upsert({
    where: { seasonId_number: { seasonId: season1.id, number: 1 } },
    update: {},
    create: {
      seasonId: season1.id,
      number: 1,
      title: 'The Awakening',
      synopsis: 'A new explorer enters the world of Illuvrse.',
    },
  });

  const asset = await prisma.videoAsset.upsert({
    where: { id: 'seed-asset-episode-1' },
    update: {
      sourceUrl: 'https://cdn.illuvrse.com/videos/illuvrse-origins-s1e1.mp4',
      durationSec: 2580,
      format: 'mp4',
      size: 1024 * 1024 * 800,
    },
    create: {
      id: 'seed-asset-episode-1',
      sourceUrl: 'https://cdn.illuvrse.com/videos/illuvrse-origins-s1e1.mp4',
      durationSec: 2580,
      format: 'mp4',
      size: 1024 * 1024 * 800,
    },
  });

  if (!episode1.videoAssetId) {
    await prisma.episode.update({
      where: { id: episode1.id },
      data: { videoAssetId: asset.id },
    });
  }
}

async function main() {
  await seedAdmin();
  await seedContent();
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
