import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Prisma } from "@prisma/client";
import prisma from "../../prisma";
import { schoolsService } from "../schools/schools.service";

const JWT_SECRET = process.env.JWT_SECRET ?? "development-secret";
type SchoolTerritory = "MAINLAND" | "ZANZIBAR";

function territoryValue(value: string): "mainland" | "zanzibar" {
  return value === "ZANZIBAR" ? "zanzibar" : "mainland";
}

function issueToken(teacher: { id: string; email: string }): string {
  return jwt.sign({ sub: teacher.id, email: teacher.email, role: "teacher" }, JWT_SECRET, { expiresIn: "12h" });
}

export const teachersService = {
  register: async (input: { name: string; email: string; password: string }) => {
    const email = input.email.trim().toLowerCase();
    if (await prisma.teacher.findUnique({ where: { email }, select: { id: true } })) throw new Error("A teacher account with this email already exists.");
    const teacher = await prisma.teacher.create({
      data: {
        name: input.name.trim(), email, passwordHash: await bcrypt.hash(input.password, 12),
      },
      select: { id: true, name: true, email: true, schoolCode: true, territory: true },
    });
    console.info(JSON.stringify({ component: "teacher-access", event: "REGISTERED", teacherId: teacher.id }));
    return { token: issueToken(teacher), teacher };
  },

  login: async (email: string, password: string) => {
    const teacher = await prisma.teacher.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!teacher || !(await bcrypt.compare(password, teacher.passwordHash))) throw new Error("Email or password is incorrect.");
    const safeTeacher = { id: teacher.id, name: teacher.name, email: teacher.email, schoolCode: teacher.schoolCode, territory: teacher.territory };
    return { token: issueToken(safeTeacher), teacher: safeTeacher };
  },

  getMe: async (teacherId: string) => prisma.teacher.findUnique({
    where: { id: teacherId },
    select: { id: true, name: true, email: true, schoolCode: true, territory: true },
  }),

  getSchools: async (teacherId: string) => {
    const memberships = await prisma.teacherSchool.findMany({
      where: { teacherId }, orderBy: [{ territory: "asc" }, { schoolCode: "asc" }],
      select: { schoolCode: true, territory: true },
    });
    return memberships.map((membership) => ({
      ...membership,
      name: schoolsService.getByCode(membership.schoolCode, territoryValue(membership.territory))?.name ?? membership.schoolCode,
    }));
  },

  setSchool: async (teacherId: string, input: { schoolCode: string; territory: SchoolTerritory }) => {
    const schoolCode = input.schoolCode.trim();
    if (!schoolsService.getByCode(schoolCode, territoryValue(input.territory))) throw new Error("Choose a valid school from the school directory.");
    const current = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { schoolCode: true, territory: true } });
    if (!current) throw new Error("Teacher account was not found.");
    await prisma.$transaction([
      prisma.teacherSchool.upsert({
        where: { teacherId_schoolCode_territory: { teacherId, schoolCode, territory: input.territory } },
        create: { teacherId, schoolCode, territory: input.territory },
        update: {},
      }),
      prisma.teacher.update({ where: { id: teacherId }, data: { schoolCode, territory: input.territory } }),
    ]);
    console.info(JSON.stringify({ component: "teacher-access", event: current.schoolCode === schoolCode && current.territory === input.territory ? "SCHOOL_SELECTED" : "SCHOOL_ADDED_AND_SELECTED", teacherId, schoolCode, territory: input.territory }));
    return prisma.teacher.findUnique({ where: { id: teacherId }, select: { id: true, name: true, email: true, schoolCode: true, territory: true } });
  },

  selectSchool: async (teacherId: string, input: { schoolCode: string; territory: SchoolTerritory }) => {
    const membership = await prisma.teacherSchool.findUnique({
      where: { teacherId_schoolCode_territory: { teacherId, schoolCode: input.schoolCode, territory: input.territory } },
      select: { id: true },
    });
    if (!membership) throw new Error("Add this school to your account before selecting it.");
    return prisma.teacher.update({
      where: { id: teacherId }, data: { schoolCode: input.schoolCode, territory: input.territory },
      select: { id: true, name: true, email: true, schoolCode: true, territory: true },
    });
  },

  removeSchool: async (teacherId: string, input: { schoolCode: string; territory: SchoolTerritory }) => {
    const membership = await prisma.teacherSchool.findUnique({
      where: { teacherId_schoolCode_territory: { teacherId, schoolCode: input.schoolCode, territory: input.territory } },
      select: { id: true },
    });
    if (!membership) return null;
    return prisma.$transaction(async (tx) => {
      const teacher = await tx.teacher.findUnique({ where: { id: teacherId }, select: { schoolCode: true, territory: true } });
      await tx.teacherSchool.delete({ where: { teacherId_schoolCode_territory: { teacherId, schoolCode: input.schoolCode, territory: input.territory } } });
      if (teacher?.schoolCode !== input.schoolCode || teacher.territory !== input.territory) {
        return tx.teacher.findUnique({ where: { id: teacherId }, select: { id: true, name: true, email: true, schoolCode: true, territory: true } });
      }
      const nextSchool = await tx.teacherSchool.findFirst({
        where: { teacherId }, orderBy: [{ territory: "asc" }, { schoolCode: "asc" }],
        select: { schoolCode: true, territory: true },
      });
      return tx.teacher.update({
        where: { id: teacherId },
        data: { schoolCode: nextSchool?.schoolCode ?? null, territory: nextSchool?.territory ?? null },
        select: { id: true, name: true, email: true, schoolCode: true, territory: true },
      });
    });
  },

  getCandidates: async (teacherId: string, options: { search?: string; gradeId?: number; page: number; limit: number }) => {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { schoolCode: true } });
    if (!teacher) throw new Error("Teacher account was not found.");
    if (!teacher.schoolCode) throw new Error("Select your school before managing pupils.");
    const where: Prisma.UserWhereInput = {
      schoolCode: teacher.schoolCode,
      ...(options.gradeId ? { gradeId: options.gradeId } : {}),
      ...(options.search ? { userID: { contains: options.search, mode: "insensitive" } } : {}),
      teacherRosterEntries: { none: { teacherId } },
    };
    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where, orderBy: { userID: "asc" }, skip: (options.page - 1) * options.limit, take: options.limit,
        select: { id: true, userID: true, grade: { select: { id: true, name: true } } },
      }),
      prisma.user.count({ where }),
    ]);
    return {
      students: students.map((student) => ({ id: String(student.id), userID: student.userID, grade: student.grade })),
      total, page: options.page, limit: options.limit, totalPages: Math.ceil(total / options.limit),
    };
  },

  addStudents: async (teacherId: string, studentIds: number[]) => {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { schoolCode: true } });
    if (!teacher) throw new Error("Teacher account was not found.");
    if (!teacher.schoolCode) throw new Error("Select your school before managing pupils.");
    const ids = [...new Set(studentIds)];
    if (!ids.length || ids.length > 100) throw new Error("Select between 1 and 100 pupils at a time.");
    const students = await prisma.user.findMany({ where: { id: { in: ids }, schoolCode: teacher.schoolCode }, select: { id: true } });
    if (students.length !== ids.length) throw new Error("Some selected pupils are not registered at your selected school.");
    const result = await prisma.teacherStudent.createMany({ data: ids.map((studentId) => ({ teacherId, studentId })), skipDuplicates: true });
    console.info(JSON.stringify({ component: "teacher-roster", event: "STUDENTS_ADDED", teacherId, count: result.count }));
    return { added: result.count };
  },

  addAllSchoolStudents: async (teacherId: string) => {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { schoolCode: true } });
    if (!teacher) throw new Error("Teacher account was not found.");
    if (!teacher.schoolCode) throw new Error("Select your school before managing pupils.");

    const batchSize = 500;
    let offset = 0;
    let added = 0;
    let total = 0;
    while (true) {
      const students = await prisma.user.findMany({
        where: { schoolCode: teacher.schoolCode },
        orderBy: { id: "asc" }, skip: offset, take: batchSize,
        select: { id: true },
      });
      if (!students.length) break;
      total += students.length;
      const result = await prisma.teacherStudent.createMany({
        data: students.map(({ id: studentId }) => ({ teacherId, studentId })),
        skipDuplicates: true,
      });
      added += result.count;
      offset += students.length;
    }

    console.info(JSON.stringify({ component: "teacher-roster", event: "ALL_SCHOOL_STUDENTS_ADDED", teacherId, schoolCode: teacher.schoolCode, count: added }));
    return { added, total };
  },

  getRoster: async (teacherId: string, options: { page: number; limit: number; gradeId?: number }) => {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { schoolCode: true } });
    if (!teacher) throw new Error("Teacher account was not found.");
    if (!teacher.schoolCode) throw new Error("Select your school before managing pupils.");
    const rosterWhere = { teacherId, student: { schoolCode: teacher.schoolCode, ...(options.gradeId ? { gradeId: options.gradeId } : {}) } };
    const [entries, total] = await Promise.all([
      prisma.teacherStudent.findMany({
        where: rosterWhere,
        orderBy: [
          { student: { gameProfile: { xp: "desc" } } },
          { student: { userID: "asc" } },
        ],
        skip: (options.page - 1) * options.limit, take: options.limit,
        include: {
          student: {
            select: {
              id: true, userID: true, grade: { select: { id: true, name: true } },
              lastActivityDate: true, currentStreak: true,
              gameProfile: { select: { xp: true, stars: true } },
              progress: { where: { gameLevel: { active: true } }, select: { completed: true } },
            },
          },
        },
      }),
      prisma.teacherStudent.count({ where: rosterWhere }),
    ]);
    return {
      students: entries.map(({ student }, index) => ({
        id: String(student.id), userID: student.userID, grade: student.grade,
        xp: student.gameProfile?.xp ?? 0, stars: student.gameProfile?.stars ?? 0,
        rank: (options.page - 1) * options.limit + index + 1,
        currentStreak: student.currentStreak, lastActivityDate: student.lastActivityDate,
        levelsStarted: student.progress.length,
        levelsCompleted: student.progress.filter((progress) => progress.completed).length,
      })),
      total, page: options.page, limit: options.limit, totalPages: Math.ceil(total / options.limit),
    };
  },

  getStudentPerformance: async (teacherId: string, studentId: number) => {
    const student = await prisma.user.findFirst({
      where: {
        id: studentId,
        OR: [
          { teacherRosterEntries: { some: { teacherId } } },
          { classMemberships: { some: { teacherClass: { teacherId } } } },
        ],
      },
      select: {
        id: true, userID: true, schoolCode: true, grade: { select: { id: true, name: true } },
        lastActivityDate: true, currentStreak: true,
        gameProfile: { select: { xp: true, stars: true } },
        progress: {
          where: { gameLevel: { active: true } },
          orderBy: { gameLevel: { gradeSubject: { subject: { name: "asc" } } } },
          select: {
            completed: true, bestScore: true, attempts: true, completedAt: true,
            gameLevel: { select: { name: true, levelNumber: true, requiredPoints: true, gradeSubject: { select: { subject: { select: { name: true } } } } } },
          },
        },
      },
    });
    if (!student) return null;
    return {
      student: {
        id: String(student.id), userID: student.userID, grade: student.grade,
        xp: student.gameProfile?.xp ?? 0, stars: student.gameProfile?.stars ?? 0,
        currentStreak: student.currentStreak, lastActivityDate: student.lastActivityDate,
        levels: student.progress.map((progress) => ({
          subject: progress.gameLevel.gradeSubject.subject.name,
          name: progress.gameLevel.name, levelNumber: progress.gameLevel.levelNumber,
          requiredPoints: progress.gameLevel.requiredPoints, bestScore: progress.bestScore,
          attempts: progress.attempts, completed: progress.completed, completedAt: progress.completedAt,
        })),
      },
    };
  },

  removeStudent: async (teacherId: string, studentId: number) => {
    const teacher = await prisma.teacher.findUnique({ where: { id: teacherId }, select: { schoolCode: true } });
    if (!teacher?.schoolCode) return false;
    const deleted = await prisma.teacherStudent.deleteMany({ where: { teacherId, studentId, student: { schoolCode: teacher.schoolCode } } });
    if (deleted.count) console.info(JSON.stringify({ component: "teacher-roster", event: "STUDENT_REMOVED", teacherId }));
    return deleted.count > 0;
  },

  getClasses: async (teacherId: string) => {
    const classes = await prisma.teacherClass.findMany({
      where: { teacherId },
      orderBy: [{ name: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { pupils: true } } },
    });
    return classes.map(({ _count, ...classRoom }) => ({ ...classRoom, pupilCount: _count.pupils }));
  },

  createClass: async (teacherId: string, name: string) => prisma.teacherClass.create({
    data: { teacherId, name: name.trim() },
    select: { id: true, name: true, createdAt: true },
  }),

  deleteClass: async (teacherId: string, classId: string) => {
    const deleted = await prisma.teacherClass.deleteMany({ where: { id: classId, teacherId } });
    return deleted.count > 0;
  },

  getClassCandidates: async (teacherId: string, classId: string, options: { search?: string; schoolName?: string; gradeId?: number; page: number; limit: number }) => {
    const classRoom = await prisma.teacherClass.findFirst({ where: { id: classId, teacherId }, select: { id: true } });
    if (!classRoom) throw new Error("Class was not found.");
    const where: Prisma.UserWhereInput = {
      ...(options.gradeId ? { gradeId: options.gradeId } : {}),
      ...(options.search ? { userID: { contains: options.search, mode: "insensitive" } } : {}),
      ...(options.schoolName ? { schoolCode: { in: schoolsService.getCodesByName(options.schoolName) } } : {}),
      classMemberships: { none: { classId } },
    };
    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where, orderBy: [{ schoolCode: "asc" }, { userID: "asc" }],
        skip: (options.page - 1) * options.limit, take: options.limit,
        select: { id: true, userID: true, schoolCode: true, grade: { select: { id: true, name: true } } },
      }),
      prisma.user.count({ where }),
    ]);
    return {
      students: students.map((student) => ({
        id: String(student.id), userID: student.userID, schoolCode: student.schoolCode,
        schoolName: schoolDisplayName(student.schoolCode), grade: student.grade,
      })),
      total, page: options.page, limit: options.limit, totalPages: Math.ceil(total / options.limit),
    };
  },

  getClassPupils: async (teacherId: string, classId: string) => {
    const classRoom = await prisma.teacherClass.findFirst({
      where: { id: classId, teacherId }, select: { id: true, name: true },
    });
    if (!classRoom) return null;
    const members = await prisma.teacherClassPupil.findMany({
      where: { classId },
      include: {
        student: {
          select: {
            id: true, userID: true, schoolCode: true, grade: { select: { id: true, name: true } },
            currentStreak: true, lastActivityDate: true,
            gameProfile: { select: { xp: true, stars: true } },
            progress: { where: { gameLevel: { active: true } }, select: { completed: true } },
          },
        },
      },
    });
    const pupils = members.map((member) => {
      const student = member.student;
      return {
        id: member.id, type: "account" as const, accountId: String(student.id), name: student.userID,
        userID: student.userID, schoolCode: student.schoolCode, schoolName: schoolDisplayName(student.schoolCode),
        grade: student.grade, xp: student.gameProfile?.xp ?? 0, stars: student.gameProfile?.stars ?? 0,
        currentStreak: student.currentStreak, lastActivityDate: student.lastActivityDate,
        levelsCompleted: student.progress.filter((progress) => progress.completed).length,
      };
    }).sort((left, right) => right.xp - left.xp || left.name.localeCompare(right.name));
    return {
      classRoom,
      pupils: pupils.map((pupil, index) => ({ ...pupil, rank: index + 1 })),
    };
  },

  addClassStudents: async (teacherId: string, classId: string, studentIds: number[]) => {
    const classRoom = await prisma.teacherClass.findFirst({ where: { id: classId, teacherId }, select: { id: true } });
    if (!classRoom) throw new Error("Class was not found.");
    const ids = [...new Set(studentIds)];
    if (!ids.length || ids.length > 100) throw new Error("Select between 1 and 100 pupils at a time.");
    const students = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true } });
    if (students.length !== ids.length) throw new Error("Some selected pupils could not be found.");
    const result = await prisma.teacherClassPupil.createMany({
      data: ids.map((studentId) => ({ classId, studentId })), skipDuplicates: true,
    });
    return { added: result.count };
  },

  removeClassPupil: async (teacherId: string, classId: string, membershipId: string) => {
    const result = await prisma.teacherClassPupil.deleteMany({
      where: { id: membershipId, classId, teacherClass: { teacherId } },
    });
    return result.count > 0;
  },
};

function schoolDisplayName(schoolCode: string | null): string | null {
  if (!schoolCode) return null;
  return schoolsService.getByCode(schoolCode, "mainland")?.name
    ?? schoolsService.getByCode(schoolCode, "zanzibar")?.name
    ?? schoolCode;
}
