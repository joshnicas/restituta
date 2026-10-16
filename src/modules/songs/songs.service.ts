import prisma from "../../prisma";
import type { SongCreateBody, SongUpdateBody } from "./songs.schema";

export const songsService = {
  list: (admin = false) => prisma.song.findMany({
    where: admin ? undefined : { active: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  }),
  getById: (id: number) => prisma.song.findUnique({ where: { id } }),
  create: (data: SongCreateBody & { url: string; mediaType: "AUDIO" | "VIDEO" }) => prisma.song.create({ data }),
  update: (id: number, data: SongUpdateBody) => prisma.song.update({ where: { id }, data }),
  delete: (id: number) => prisma.song.delete({ where: { id } }),
};
