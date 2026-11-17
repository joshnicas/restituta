import type { Request, Response } from "express";
import { z } from "zod";
import prisma from "../../prisma";
import { teachersService } from "./teachers.service";

const territorySchema = z.enum(["MAINLAND", "ZANZIBAR"]);
const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  password: z.string().min(8, "Please choose a password with at least 8 characters.").max(72, "Your password must be 72 characters or fewer.").refine((value) => Buffer.byteLength(value, "utf8") <= 72, "Your password must be 72 characters or fewer."),
}).strict();
const schoolSchema = z.object({ schoolCode: z.string().trim().min(2).max(80), territory: territorySchema }).strict();
const loginSchema = z.object({ email: z.string().trim().email().max(200), password: z.string().min(1).max(72) }).strict();
const addStudentsSchema = z.object({ studentIds: z.array(z.number().int().positive()).min(1).max(100) }).strict();
const createClassSchema = z.object({ name: z.string().trim().min(2).max(80) }).strict();
const classStudentsSchema = z.object({ studentIds: z.array(z.number().int().positive()).min(1).max(100) }).strict();
const teacherId = (req: Request) => req.teacher?.id;
const routeParam = (value: string | string[] | undefined): string => Array.isArray(value) ? value[0] ?? "" : value ?? "";

export const teachersController = {
  register: async (req: Request, res: Response): Promise<void> => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Enter valid teacher registration details." }); return; }
    try { res.status(201).json({ success: true, ...await teachersService.register(parsed.data) }); }
    catch (error) { res.status(400).json({ message: error instanceof Error ? error.message : "Teacher registration failed." }); }
  },

  login: async (req: Request, res: Response): Promise<void> => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Enter a valid email and password." }); return; }
    try { res.json({ success: true, ...await teachersService.login(parsed.data.email, parsed.data.password) }); }
    catch (error) {
      const message = error instanceof Error ? error.message : "Teacher login failed.";
      res.status(401).json({ message });
    }
  },

  me: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    const teacher = await teachersService.getMe(id);
    if (!teacher) { res.status(404).json({ message: "Teacher account was not found." }); return; }
    res.json({ success: true, teacher });
  },

  schools: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    res.json({ success: true, schools: await teachersService.getSchools(id) });
  },

  setSchool: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    const parsed = schoolSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Choose a valid school." }); return; }
    try {
      const teacher = await teachersService.setSchool(id, parsed.data);
      if (!teacher) { res.status(404).json({ message: "Teacher account was not found." }); return; }
      res.json({ success: true, teacher, schools: await teachersService.getSchools(id) });
    } catch (error) { res.status(400).json({ message: error instanceof Error ? error.message : "Could not save your school." }); }
  },

  selectSchool: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    const parsed = schoolSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Choose a valid school." }); return; }
    try { res.json({ success: true, teacher: await teachersService.selectSchool(id, parsed.data) }); }
    catch (error) { res.status(400).json({ message: error instanceof Error ? error.message : "Could not select this school." }); }
  },

  removeSchool: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    const parsed = schoolSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Choose a valid school to remove." }); return; }
    const teacher = await teachersService.removeSchool(id, parsed.data);
    if (!teacher) { res.status(404).json({ message: "This school is not on your account." }); return; }
    res.json({ success: true, teacher, schools: await teachersService.getSchools(id) });
  },

  grades: async (_req: Request, res: Response): Promise<void> => {
    const grades = await prisma.grade.findMany({ where: { active: true }, orderBy: { level: "asc" }, select: { id: true, name: true, code: true, level: true } });
    res.json({ success: true, grades });
  },

  candidates: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 80) : undefined;
    const parsedGradeId = req.query.gradeId === undefined ? undefined : Number(req.query.gradeId);
    if (parsedGradeId !== undefined && (!Number.isInteger(parsedGradeId) || parsedGradeId <= 0)) { res.status(400).json({ message: "Choose a valid grade." }); return; }
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 25));
    try { res.json({ success: true, ...(await teachersService.getCandidates(id, { search, gradeId: parsedGradeId, page, limit })) }); }
    catch (error) { const message = error instanceof Error ? error.message : "Could not load pupils for this school."; res.status(message.startsWith("Select your school") ? 409 : 500).json({ message }); }
  },

  roster: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    const gradeId = req.query.gradeId === undefined ? undefined : Number(req.query.gradeId);
    if (gradeId !== undefined && (!Number.isInteger(gradeId) || gradeId <= 0)) { res.status(400).json({ message: "Choose a valid grade." }); return; }
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
    try { res.json({ success: true, ...(await teachersService.getRoster(id, { page, limit, gradeId })) }); }
    catch (error) { const message = error instanceof Error ? error.message : "Could not load your pupil roster."; res.status(message.startsWith("Select your school") ? 409 : 500).json({ message }); }
  },

  addStudents: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    const parsed = addStudentsSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Select between 1 and 100 valid pupils." }); return; }
    try { res.status(201).json({ success: true, ...await teachersService.addStudents(id, parsed.data.studentIds) }); }
    catch (error) { res.status(400).json({ message: error instanceof Error ? error.message : "Could not add pupils." }); }
  },

  addAllSchoolStudents: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    try { res.status(201).json({ success: true, ...await teachersService.addAllSchoolStudents(id) }); }
    catch (error) {
      const message = error instanceof Error ? error.message : "Could not add pupils from your school.";
      res.status(message.startsWith("Select your school") ? 409 : 400).json({ message });
    }
  },

  performance: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    const studentId = Number(req.params.studentId);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    if (!Number.isInteger(studentId) || studentId <= 0) { res.status(400).json({ message: "Invalid pupil." }); return; }
    const result = await teachersService.getStudentPerformance(id, studentId);
    if (!result) { res.status(404).json({ message: "Pupil was not found in your roster." }); return; }
    res.json({ success: true, ...result });
  },

  removeStudent: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    const studentId = Number(req.params.studentId);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    if (!Number.isInteger(studentId) || studentId <= 0) { res.status(400).json({ message: "Invalid pupil." }); return; }
    if (!await teachersService.removeStudent(id, studentId)) { res.status(404).json({ message: "Pupil was not found in your roster." }); return; }
    res.json({ success: true });
  },

  classes: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    res.json({ success: true, classes: await teachersService.getClasses(id) });
  },

  createClass: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    const parsed = createClassSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Enter a class name between 2 and 80 characters." }); return; }
    res.status(201).json({ success: true, classRoom: await teachersService.createClass(id, parsed.data.name) });
  },

  deleteClass: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    if (!await teachersService.deleteClass(id, routeParam(req.params.classId))) { res.status(404).json({ message: "Class was not found." }); return; }
    res.json({ success: true });
  },

  classCandidates: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    const gradeId = req.query.gradeId === undefined ? undefined : Number(req.query.gradeId);
    if (gradeId !== undefined && (!Number.isInteger(gradeId) || gradeId <= 0)) { res.status(400).json({ message: "Choose a valid grade." }); return; }
    const page = Math.max(1, Number.parseInt(String(req.query.page ?? "1"), 10) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 25));
    try {
      res.json({ success: true, ...(await teachersService.getClassCandidates(id, routeParam(req.params.classId), {
        search: typeof req.query.search === "string" ? req.query.search.trim().slice(0, 80) || undefined : undefined,
        schoolName: typeof req.query.schoolName === "string" ? req.query.schoolName.trim().slice(0, 100) || undefined : undefined,
        gradeId, page, limit,
      })) });
    } catch (error) { res.status(404).json({ message: error instanceof Error ? error.message : "Could not search pupils." }); }
  },

  classPupils: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    const result = await teachersService.getClassPupils(id, routeParam(req.params.classId));
    if (!result) { res.status(404).json({ message: "Class was not found." }); return; }
    res.json({ success: true, ...result });
  },

  addClassStudents: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    const parsed = classStudentsSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ message: "Select between 1 and 100 valid pupils." }); return; }
    try { res.status(201).json({ success: true, ...await teachersService.addClassStudents(id, routeParam(req.params.classId), parsed.data.studentIds) }); }
    catch (error) { res.status(400).json({ message: error instanceof Error ? error.message : "Could not add pupils to this class." }); }
  },

  removeClassPupil: async (req: Request, res: Response): Promise<void> => {
    const id = teacherId(req);
    if (!id) { res.status(401).json({ message: "Teacher authentication is required." }); return; }
    if (!await teachersService.removeClassPupil(id, routeParam(req.params.classId), routeParam(req.params.membershipId))) { res.status(404).json({ message: "Pupil was not found in this class." }); return; }
    res.json({ success: true });
  },
};
