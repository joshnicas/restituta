import { readFileSync } from "node:fs";
import path from "node:path";

type School = { school_code: string; school_name: string };
type SchoolData = Array<{ region: string; districts: Array<{ district: string; schools: School[] }> }>;
export type PublicSchool = { schoolCode: string; name: string; district: string; region: string };

let cachedSchools: PublicSchool[] | null = null;
let schoolsByCode: Map<string, PublicSchool> | null = null;
function getSchools(): PublicSchool[] {
  if (cachedSchools) return cachedSchools;
  const filePath = path.resolve(__dirname, "../../data/necta_psle_2025_nested.json");
  const data = JSON.parse(readFileSync(filePath, "utf8")) as SchoolData;
  cachedSchools = data.flatMap((region) =>
    region.districts.flatMap((district) =>
      district.schools.map((school) => ({
        schoolCode: school.school_code,
        name: school.school_name,
        district: district.district,
        region: region.region,
      })),
    ),
  );
  schoolsByCode = new Map(cachedSchools.map((school) => [school.schoolCode.toLowerCase(), school]));
  return cachedSchools;
}

export const schoolsService = {
  getRegions: () => [...new Set(getSchools().map((school) => school.region))].sort(),
  getDistricts: (region: string) => [...new Set(
    getSchools().filter((school) => school.region.toLowerCase() === region.toLowerCase()).map((school) => school.district),
  )].sort(),
  getByCode: (schoolCode: string): PublicSchool | null =>
    (getSchools(), schoolsByCode?.get(schoolCode.trim().toLowerCase()) ?? null),
  getCodesByLocation: ({ region = "", district = "" }: { region?: string; district?: string }): string[] =>
    getSchools().filter((school) =>
      (!region || school.region.toLowerCase() === region.toLowerCase()) &&
      (!district || school.district.toLowerCase() === district.toLowerCase()),
    ).map((school) => school.schoolCode),
  list: ({ search = "", region = "", district = "", page = 1, limit = 30 }: {
    search?: string; region?: string; district?: string; page?: number; limit?: number;
  }) => {
    const term = search.trim().toLowerCase();
    const filtered = getSchools().filter((school) =>
      (!region || school.region.toLowerCase() === region.toLowerCase()) &&
      (!district || school.district.toLowerCase() === district.toLowerCase()) &&
      (!term || school.name.toLowerCase().includes(term) || school.schoolCode.toLowerCase().includes(term)),
    );
    const safeLimit = Math.min(Math.max(Math.floor(limit) || 30, 1), 100);
    const safePage = Math.max(Math.floor(page) || 1, 1);
    const start = (safePage - 1) * safeLimit;
    return { schools: filtered.slice(start, start + safeLimit), total: filtered.length, page: safePage, limit: safeLimit, totalPages: Math.ceil(filtered.length / safeLimit) };
  },
};
