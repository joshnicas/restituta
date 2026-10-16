import { readFileSync } from "node:fs";
import path from "node:path";

type School = { school_code: string; school_name: string };
type SchoolData = Array<{ region: string; districts: Array<{ district: string; schools: School[] }> }>;
export type SchoolTerritory = "mainland" | "zanzibar";
export type PublicSchool = { schoolCode: string; name: string; district: string; region: string; territory: SchoolTerritory };

const cachedSchools = new Map<SchoolTerritory, PublicSchool[]>();
const schoolsByCode = new Map<SchoolTerritory, Map<string, PublicSchool>>();
function getSchools(territory: SchoolTerritory = "mainland"): PublicSchool[] {
  const cached = cachedSchools.get(territory);
  if (cached) return cached;
  const fileName = territory === "zanzibar"
    ? "zec_standard_seven_2025.json"
    : "necta_psle_2025_nested.json";
  const filePath = path.resolve(__dirname, `../../data/${fileName}`);
  const data = JSON.parse(readFileSync(filePath, "utf8")) as SchoolData;
  const schools = data.flatMap((region) =>
    region.districts.flatMap((district) =>
      district.schools.map((school) => ({
        schoolCode: school.school_code,
        name: school.school_name,
        district: district.district,
        region: region.region,
        territory,
      })),
    ),
  );
  cachedSchools.set(territory, schools);
  schoolsByCode.set(territory, new Map(schools.map((school) => [school.schoolCode.toLowerCase(), school])));
  return schools;
}

export const schoolsService = {
  getRegions: (territory: SchoolTerritory = "mainland") => [...new Set(getSchools(territory).map((school) => school.region))].sort(),
  getDistricts: (region: string, territory: SchoolTerritory = "mainland") => [...new Set(
    getSchools(territory).filter((school) => school.region.toLowerCase() === region.toLowerCase()).map((school) => school.district),
  )].sort(),
  getByCode: (schoolCode: string, territory: SchoolTerritory = "mainland"): PublicSchool | null =>
    (getSchools(territory), schoolsByCode.get(territory)?.get(schoolCode.trim().toLowerCase()) ?? null),
  getCodesByLocation: ({ region = "", district = "", territory = "mainland" }: { region?: string; district?: string; territory?: SchoolTerritory }): string[] =>
    getSchools(territory).filter((school) =>
      (!region || school.region.toLowerCase() === region.toLowerCase()) &&
      (!district || school.district.toLowerCase() === district.toLowerCase()),
    ).map((school) => school.schoolCode),
  list: ({ search = "", region = "", district = "", territory = "mainland", page = 1, limit = 30 }: {
    search?: string; region?: string; district?: string; territory?: SchoolTerritory; page?: number; limit?: number;
  }) => {
    const term = search.trim().toLowerCase();
    const filtered = getSchools(territory).filter((school) =>
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
