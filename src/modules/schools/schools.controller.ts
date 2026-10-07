import type { Request, Response } from "express";
import { schoolsService } from "./schools.service";

const queryText = (value: unknown) => typeof value === "string" ? value.trim() : "";
const queryNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};

export const schoolsController = {
  regions: (_req: Request, res: Response): void => { res.json({ success: true, regions: schoolsService.getRegions() }); },
  districts: (req: Request, res: Response): void => {
    const region = queryText(req.query.region);
    if (!region) { res.status(400).json({ message: "Region is required." }); return; }
    res.json({ success: true, districts: schoolsService.getDistricts(region) });
  },
  byCode: (req: Request, res: Response): void => {
    const schoolCode = Array.isArray(req.params.schoolCode)
      ? req.params.schoolCode[0]
      : req.params.schoolCode;
    const school = schoolsService.getByCode(schoolCode);
    if (!school) { res.status(404).json({ message: "School not found." }); return; }
    res.json({ success: true, school });
  },
  list: (req: Request, res: Response): void => {
    const result = schoolsService.list({
      search: queryText(req.query.search), region: queryText(req.query.region),
      district: queryText(req.query.district), page: queryNumber(req.query.page, 1),
      limit: queryNumber(req.query.limit, 30),
    });
    res.json({ success: true, ...result });
  },
};
