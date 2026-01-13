import { prisma } from '@/lib/prisma';

export async function listShows() {
  return prisma.show.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function createShow(params: {
  title: string;
  synopsis?: string;
  slug: string;
  heroImageUrl?: string | null;
  posterUrl?: string | null;
}) {
  return prisma.show.create({
    data: {
      title: params.title,
      synopsis: params.synopsis,
      slug: params.slug,
      heroImageUrl: params.heroImageUrl ?? null,
      posterUrl: params.posterUrl ?? null,
    },
  });
}

export async function updateShow(
  id: string,
  updates: Partial<{
    title: string;
    synopsis: string | null;
    slug: string;
    heroImageUrl: string | null;
    posterUrl: string | null;
  }>
) {
  return prisma.show.update({
    where: { id },
    data: updates,
  });
}

export async function deleteShow(id: string) {
  return prisma.show.delete({ where: { id } });
}

export async function getShowBySlug(slug: string) {
  return prisma.show.findUnique({
    where: { slug },
    include: {
      seasons: {
        orderBy: { number: 'asc' },
        include: {
          episodes: {
            orderBy: { number: 'asc' },
            include: { videoAsset: true },
          },
        },
      },
    },
  });
}
