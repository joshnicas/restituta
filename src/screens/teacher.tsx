import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import SchoolPicker from "../components/school-picker";
import type { SchoolOption, TeacherAccount, TeacherClass, TeacherClassCandidate, TeacherClassPupil, TeacherPupil, TeacherSchool } from "../lib/api";
import {
  addTeacherPupils,
  addAllTeacherPupils,
  addTeacherClassStudents,
  createTeacherClass,
  deleteTeacherClass,
  getSchoolByCode,
  getTeacherClasses,
  getTeacherCandidates,
  getTeacherGrades,
  getTeacherClassPupils,
  getTeacherMe,
  getTeacherPupilPerformance,
  getTeacherRoster,
  getTeacherSchools,
  loginTeacher,
  registerTeacher,
  removeTeacherPupil,
  removeTeacherClassPupil,
  removeTeacherSchool,
  searchTeacherClassCandidates,
  selectTeacherSchool,
  setTeacherSchool,
} from "../lib/api";

const TEACHER_TOKEN_KEY = "kido.teacherToken";
type Teacher = TeacherAccount;
type Grade = { id: number; name: string; code: string; level: number };
type Performance = TeacherPupil & {
  levels: Array<{ subject: string; name: string; levelNumber: number; requiredPoints: number; bestScore: number; attempts: number; completed: boolean; completedAt: string | null }>;
};

export default function TeacherScreen() {
  const router = useRouter();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const isCompactLayout = viewportWidth < 720;
  const [mode, setMode] = useState<"login" | "register">("login");
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);
  const [school, setSchool] = useState<SchoolOption | null>(null);
  const [teacherSchools, setTeacherSchools] = useState<TeacherSchool[]>([]);
  const [teacherSchoolNames, setTeacherSchoolNames] = useState<Record<string, string>>({});
  const [addingSchool, setAddingSchool] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [grades, setGrades] = useState<Grade[]>([]);
  const [gradeId, setGradeId] = useState("");
  const [search, setSearch] = useState("");
  const [candidatePage, setCandidatePage] = useState(1);
  const [candidates, setCandidates] = useState<TeacherPupil[]>([]);
  const [candidateTotal, setCandidateTotal] = useState(0);
  const [candidatePages, setCandidatePages] = useState(1);
  const [roster, setRoster] = useState<TeacherPupil[]>([]);
  const [rosterTotal, setRosterTotal] = useState(0);
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterPages, setRosterPages] = useState(1);
  const [rosterGradeId, setRosterGradeId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAddAll, setConfirmAddAll] = useState(false);
  const [selectedPupil, setSelectedPupil] = useState<Performance | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [confirmRemoveClassMemberId, setConfirmRemoveClassMemberId] = useState<string | null>(null);
  const [tab, setTab] = useState<"roster" | "add" | "classes">("roster");
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [activeClassId, setActiveClassId] = useState("");
  const [classPupils, setClassPupils] = useState<TeacherClassPupil[]>([]);
  const [classCandidates, setClassCandidates] = useState<TeacherClassCandidate[]>([]);
  const [classCandidateTotal, setClassCandidateTotal] = useState(0);
  const [classCandidatePages, setClassCandidatePages] = useState(1);
  const [classCandidatePage, setClassCandidatePage] = useState(1);
  const [classSearch, setClassSearch] = useState("");
  const [classSchoolName, setClassSchoolName] = useState("");
  const [classGradeId, setClassGradeId] = useState("");
  const [classSelectedIds, setClassSelectedIds] = useState<Set<string>>(new Set());
  const [classNameInput, setClassNameInput] = useState("");
  const [classMode, setClassMode] = useState<"roster" | "accounts">("roster");
  const [activeClassName, setActiveClassName] = useState("");
  const rosterRequestId = useRef(0);
  const performanceDrawerX = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!selectedPupil) return;
    performanceDrawerX.setValue(1);
    Animated.timing(performanceDrawerX, { toValue: 0, duration: 260, useNativeDriver: false }).start();
    return () => { performanceDrawerX.stopAnimation(); };
  }, [performanceDrawerX, selectedPupil?.id, viewportWidth]);

  const loadRoster = useCallback(async (activeToken: string, page = 1, activeGradeId = rosterGradeId) => {
    const requestId = ++rosterRequestId.current;
    const result = await getTeacherRoster(activeToken, page, activeGradeId ? Number(activeGradeId) : undefined);
    if (requestId !== rosterRequestId.current) return;
    setRoster(result.students);
    setRosterTotal(result.total);
    setRosterPage(result.page);
    setRosterPages(Math.max(1, result.totalPages));
  }, [rosterGradeId]);

  useEffect(() => {
    let active = true;
    if (Platform.OS !== "web") {
      setLoading(false);
      return () => { active = false; };
    }
    void AsyncStorage.getItem(TEACHER_TOKEN_KEY).then(async (savedToken) => {
      if (!savedToken) return;
      try {
        const response = await getTeacherMe(savedToken);
        if (!active) return;
        setToken(savedToken);
        setTeacher(response.teacher);
        setTab(response.teacher.schoolCode ? "classes" : "roster");
      } catch {
        await AsyncStorage.removeItem(TEACHER_TOKEN_KEY).catch(() => undefined);
      }
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!token || !teacher) return;
    let active = true;
    void Promise.all([getTeacherGrades(token), teacher.schoolCode ? loadRoster(token) : Promise.resolve(null)])
      .then(([gradeResponse]) => { if (active) setGrades(gradeResponse.grades); })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load your pupils."); });
    return () => { active = false; };
  }, [loadRoster, teacher, token]);

  useEffect(() => {
    if (!token || !teacher) return;
    let active = true;
    void getTeacherSchools(token).then((result) => { if (active) setTeacherSchools(result.schools); })
      .catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not load your schools."); });
    return () => { active = false; };
  }, [teacher?.id, token]);

  const refreshClasses = useCallback(async (activeToken: string) => {
    const result = await getTeacherClasses(activeToken);
    setClasses(result.classes);
    setActiveClassId((current) => current && result.classes.some((item) => item.id === current) ? current : result.classes[0]?.id ?? "");
  }, []);

  const refreshClassPupils = useCallback(async (activeToken: string, classId: string) => {
    if (!classId) { setClassPupils([]); return; }
    const result = await getTeacherClassPupils(activeToken, classId);
    setActiveClassName(result.classRoom.name);
    setClassPupils(result.pupils);
  }, []);

  useEffect(() => {
    if (!token || !teacher) return;
    void refreshClasses(token)
      .catch((requestError) => setError(requestError instanceof Error ? requestError.message : "Could not load your classes."));
  }, [refreshClasses, teacher?.id, token]);

  useEffect(() => {
    if (!token || !activeClassId) { setClassPupils([]); return; }
    let active = true;
    void refreshClassPupils(token, activeClassId).catch((requestError) => {
      if (active) setError(requestError instanceof Error ? requestError.message : "Could not load this class.");
    });
    return () => { active = false; };
  }, [activeClassId, refreshClassPupils, token]);

  useEffect(() => {
    if (!token || !activeClassId || classMode !== "accounts") return;
    let active = true;
    const timer = setTimeout(() => {
      void searchTeacherClassCandidates(token, activeClassId, {
        search: classSearch.trim() || undefined,
        schoolName: classSchoolName.trim() || undefined,
        gradeId: classGradeId ? Number(classGradeId) : undefined,
        page: classCandidatePage,
        limit: 25,
      }).then((result) => {
        if (!active) return;
        setClassCandidates(result.students);
        setClassCandidateTotal(result.total);
        setClassCandidatePages(Math.max(1, result.totalPages));
      }).catch((requestError) => { if (active) setError(requestError instanceof Error ? requestError.message : "Could not search pupils."); });
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [activeClassId, classCandidatePage, classGradeId, classMode, classSchoolName, classSearch, token]);

  useEffect(() => {
    if (!teacherSchools.length) { setTeacherSchoolNames({}); return; }
    let active = true;
    void Promise.all(teacherSchools.map(async (school) => {
      const key = `${school.territory}:${school.schoolCode}`;
      try {
        const result = await getSchoolByCode(school.schoolCode, school.territory.toLowerCase() as "mainland" | "zanzibar");
        return [key, result.school.name] as const;
      } catch {
        return [key, school.name || school.schoolCode] as const;
      }
    })).then((entries) => { if (active) setTeacherSchoolNames(Object.fromEntries(entries)); });
    return () => { active = false; };
  }, [teacherSchools]);

  useEffect(() => {
    if (!teacher?.schoolCode || !teacher.territory) { setSchoolName(""); return; }
    let active = true;
    const selectedSchoolCode = teacher.schoolCode;
    void getSchoolByCode(teacher.schoolCode, teacher.territory.toLowerCase() as "mainland" | "zanzibar")
      .then((response) => { if (active) setSchoolName(response.school.name); })
      .catch(() => { if (active) setSchoolName(selectedSchoolCode); });
    return () => { active = false; };
  }, [teacher]);

  useEffect(() => {
    if (!token || !teacher?.schoolCode || tab !== "add") return;
    let active = true;
    const timer = setTimeout(() => {
      setError("");
      void getTeacherCandidates(token, {
        search: search.trim() || undefined,
        gradeId: gradeId ? Number(gradeId) : undefined,
        page: candidatePage,
        limit: 25,
      }).then((result) => {
        if (!active) return;
        setCandidates(result.students);
        setCandidateTotal(result.total);
        setCandidatePages(Math.max(1, result.totalPages));
      }).catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : "Could not search pupils.");
      });
    }, 180);
    return () => { active = false; clearTimeout(timer); };
  }, [candidatePage, gradeId, search, tab, teacher?.schoolCode, token]);

  const toggleCandidate = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else if (next.size < 100) next.add(id);
    else { setError("You can add up to 100 pupils at a time."); return; }
    setSelectedIds(next);
  };
  const allVisibleSelected = candidates.length > 0 && candidates.every((student) => selectedIds.has(student.id));

  const submitAuth = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      if (mode === "register") {
        if (password.length < 8) throw new Error("Please choose a password with at least 8 characters.");
        if (password !== confirmPassword) throw new Error("Your passwords do not match. Please check and try again.");
        const response = await registerTeacher({ name: name.trim(), email: email.trim(), password });
        await AsyncStorage.setItem(TEACHER_TOKEN_KEY, response.token);
        setToken(response.token); setTeacher(response.teacher); setTab(response.teacher.schoolCode ? "classes" : "roster"); setPassword(""); setConfirmPassword("");
        setNotice("Your account is ready. Choose your school to start managing pupils.");
      } else {
        const response = await loginTeacher(email.trim(), password);
        await AsyncStorage.setItem(TEACHER_TOKEN_KEY, response.token);
        setToken(response.token); setTeacher(response.teacher); setTab(response.teacher.schoolCode ? "classes" : "roster"); setPassword("");
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not complete the request.");
    } finally { setBusy(false); }
  };

  const chooseTeacherSchool = async (selected: SchoolOption) => {
    if (!token) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await setTeacherSchool(token, {
        schoolCode: selected.schoolCode,
        territory: selected.territory === "zanzibar" ? "ZANZIBAR" : "MAINLAND",
      });
      setTeacher(result.teacher); setTeacherSchools(result.schools); setSchool(selected);
      setSelectedPupil(null); setTab("roster"); setAddingSchool(false); setRosterGradeId(""); setRosterPage(1);
      setNotice("School saved to your account and selected. You can now manage its pupils.");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not save your school."); }
    finally { setBusy(false); }
  };

  const chooseExistingSchool = async (selected: TeacherSchool) => {
    if (!token || (teacher?.schoolCode === selected.schoolCode && teacher.territory === selected.territory)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await selectTeacherSchool(token, selected);
      setTeacher(result.teacher); setSelectedPupil(null); setTab("roster"); setRosterGradeId(""); setRosterPage(1);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not select this school."); }
    finally { setBusy(false); }
  };

  const removeSelectedSchool = async () => {
    const selected = teacherSchools.find((item) => item.schoolCode === teacher?.schoolCode && item.territory === teacher?.territory);
    if (!token || !teacher || !selected || busy) return;
    const nameToRemove = teacherSchoolNames[`${selected.territory}:${selected.schoolCode}`] || selected.name || selected.schoolCode;
    if (!window.confirm(`Remove ${nameToRemove} from your schools? Your class rosters will not be affected.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await removeTeacherSchool(token, selected);
      setTeacher(result.teacher);
      setTeacherSchools(result.schools);
      setSchool(null);
      setRosterGradeId(""); setRosterPage(1);
      setNotice(result.teacher.schoolCode ? `${nameToRemove} was removed. ${result.teacher.schoolCode} is now selected.` : `${nameToRemove} was removed. Choose a school to view its roster.`);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not remove this school."); }
    finally { setBusy(false); }
  };

  const addSelected = async () => {
    if (!selectedIds.size || !token) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await addTeacherPupils(token, [...selectedIds]);
      setNotice(`${result.added} pupil${result.added === 1 ? "" : "s"} added to your roster.`);
      setSelectedIds(new Set());
      await Promise.all([loadRoster(token), getTeacherCandidates(token, { search: search.trim() || undefined, gradeId: gradeId ? Number(gradeId) : undefined, page: candidatePage, limit: 25 }).then((response) => { setCandidates(response.students); setCandidateTotal(response.total); setCandidatePages(Math.max(1, response.totalPages)); })]);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not add the selected pupils."); }
    finally { setBusy(false); }
  };

  const addAllSchoolPupils = async () => {
    if (!token || !teacher?.schoolCode) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await addAllTeacherPupils(token);
      setNotice(result.total === 0 ? "No pupils are registered to this school yet." : result.added ? `${result.added} of ${result.total} pupils added from your school.` : `All ${result.total} pupils from your school are already on your roster.`);
      setConfirmAddAll(false); setSelectedIds(new Set());
      await Promise.all([
        loadRoster(token),
        getTeacherCandidates(token, { search: search.trim() || undefined, gradeId: gradeId ? Number(gradeId) : undefined, page: candidatePage, limit: 25 }).then((response) => {
          setCandidates(response.students); setCandidateTotal(response.total); setCandidatePages(Math.max(1, response.totalPages));
        }),
      ]);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not add pupils from your school."); }
    finally { setBusy(false); }
  };

  const createClassNow = async () => {
    if (!token || classNameInput.trim().length < 2) { setError("Enter a class name with at least 2 characters."); return; }
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await createTeacherClass(token, classNameInput.trim());
      setClassNameInput("");
      await refreshClasses(token);
      setActiveClassId(result.classRoom.id);
      setActiveClassName(result.classRoom.name);
      setClassMode("roster");
      setNotice(`${result.classRoom.name} is ready. Add pupils from any school.`);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not create this class."); }
    finally { setBusy(false); }
  };

  const addSelectedToClass = async () => {
    if (!token || !activeClassId || !classSelectedIds.size) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const result = await addTeacherClassStudents(token, activeClassId, [...classSelectedIds]);
      setClassSelectedIds(new Set());
      await Promise.all([refreshClassPupils(token, activeClassId), searchTeacherClassCandidates(token, activeClassId, {
        search: classSearch.trim() || undefined, schoolName: classSchoolName.trim() || undefined,
        gradeId: classGradeId ? Number(classGradeId) : undefined, page: classCandidatePage, limit: 25,
      }).then((response) => { setClassCandidates(response.students); setClassCandidateTotal(response.total); setClassCandidatePages(Math.max(1, response.totalPages)); }), refreshClasses(token)]);
      setNotice(`${result.added} pupil${result.added === 1 ? "" : "s"} added to ${activeClassName}.`);
      setClassMode("roster");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not add pupils to this class."); }
    finally { setBusy(false); }
  };

  const removeClassMember = async (membershipId: string) => {
    if (!token || !activeClassId) return;
    setBusy(true); setError("");
    try {
      await removeTeacherClassPupil(token, activeClassId, membershipId);
      await Promise.all([refreshClassPupils(token, activeClassId), refreshClasses(token)]);
      setConfirmRemoveClassMemberId(null);
      setNotice("Pupil removed from this class.");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not remove this pupil."); }
    finally { setBusy(false); }
  };

  const deleteSelectedClass = async () => {
    if (!token || !activeClassId || busy) return;
    if (!window.confirm(`Delete ${activeClassName || "this class"} and remove its pupil roster? Kido accounts will not be deleted.`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await deleteTeacherClass(token, activeClassId);
      setClassPupils([]);
      setActiveClassName("");
      setClassMode("roster");
      await refreshClasses(token);
      setNotice("Class deleted. Its pupils remain in their Kido accounts and other class rosters.");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not delete this class."); }
    finally { setBusy(false); }
  };

  const showPerformance = async (pupil: TeacherPupil) => {
    if (!token) return;
    setBusy(true); setError("");
    try { setSelectedPupil((await getTeacherPupilPerformance(token, pupil.id)).student); }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not load pupil performance."); }
    finally { setBusy(false); }
  };

  const closePerformance = () => {
    Animated.timing(performanceDrawerX, { toValue: 1, duration: 220, useNativeDriver: false }).start(({ finished }) => {
      if (finished) setSelectedPupil(null);
    });
  };

  const removePupil = async (studentId: string) => {
    if (!token) return;
    setBusy(true); setError("");
    try {
      await removeTeacherPupil(token, studentId);
      const nextTotal = Math.max(0, rosterTotal - 1);
      const nextPage = Math.min(rosterPage, Math.max(1, Math.ceil(nextTotal / 100)));
      await loadRoster(token, nextPage);
      setSelectedPupil(null); setConfirmRemoveId(null);
      setNotice("Pupil removed from your roster.");
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Could not remove this pupil."); }
    finally { setBusy(false); }
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(TEACHER_TOKEN_KEY).catch(() => undefined);
    setToken(""); setTeacher(null); setRoster([]); setSelectedPupil(null); setNotice(""); setError("");
  };

  if (Platform.OS !== "web") {
    return <View style={styles.restricted}><Text style={styles.title}>Teacher management is available on the web.</Text><Pressable onPress={() => router.replace("/welcome")} style={styles.primaryButton}><Text style={styles.primaryButtonText}>Back to Kido</Text></Pressable></View>;
  }

  if (loading) return <View style={styles.restricted}><ActivityIndicator size="large" color="#F59E0B" /></View>;

  return (
    <View style={styles.screen}>
    <ScrollView
      style={[styles.page, styles.phoneWebScroll]}
      contentContainerStyle={styles.pageContent}
      showsVerticalScrollIndicator
      keyboardShouldPersistTaps="handled"
      scrollEnabled
    >
      <View style={styles.topbar}>
        <Pressable onPress={() => router.replace("/welcome")}><Text style={styles.brand}>Kido <Text style={styles.brandAccent}>Teachers</Text></Text></Pressable>
        {teacher ? <Pressable onPress={signOut} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Sign out</Text></Pressable> : null}
      </View>

      {!teacher ? (
        <View style={styles.authCard}>
          <Text style={styles.eyebrow}>PUPIL PERFORMANCE</Text>
          <Text style={styles.title}>{mode === "register" ? "Teacher registration" : "Teacher sign in"}</Text>
          <Text style={styles.subtitle}>{mode === "register" ? "Create your teacher account with your name, email, and password. Choose your school after signing in." : "Sign in to manage your pupil roster and view learning progress."}</Text>
          {mode === "register" ? <TextInput
            ref={nameInputRef}
            value={name}
            onChangeText={setName}
            onSubmitEditing={() => emailInputRef.current?.focus()}
            placeholder="Full name"
            style={styles.input}
            autoCapitalize="words"
            returnKeyType="next"
          /> : null}
          <TextInput
            ref={emailInputRef}
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={() => passwordInputRef.current?.focus()}
            placeholder="Email"
            style={styles.input}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
          />
          <View style={styles.passwordField}>
            <TextInput
              ref={passwordInputRef}
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={() => {
                if (mode === "register") confirmPasswordInputRef.current?.focus();
                else if (!busy) void submitAuth();
              }}
              placeholder={mode === "register" ? "Password (8+ characters)" : "Password"}
              style={[styles.input, styles.passwordInput]}
              secureTextEntry={!showPassword}
              returnKeyType={mode === "register" ? "next" : "done"}
            />
            <Pressable onPress={() => setShowPassword((visible) => !visible)} style={styles.passwordToggle} accessibilityRole="button" accessibilityLabel={showPassword ? "Hide password" : "Show password"}>
              <Text style={styles.passwordToggleText}>{showPassword ? "Hide" : "Show"}</Text>
            </Pressable>
          </View>
          {mode === "register" ? <View style={styles.passwordField}>
            <TextInput
              ref={confirmPasswordInputRef}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              onSubmitEditing={() => { if (!busy) void submitAuth(); }}
              placeholder="Confirm password"
              style={[styles.input, styles.passwordInput]}
              secureTextEntry={!showConfirmPassword}
              returnKeyType="done"
            />
            <Pressable onPress={() => setShowConfirmPassword((visible) => !visible)} style={styles.passwordToggle} accessibilityRole="button" accessibilityLabel={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}>
              <Text style={styles.passwordToggleText}>{showConfirmPassword ? "Hide" : "Show"}</Text>
            </Pressable>
          </View> : null}
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable onPress={submitAuth} disabled={busy} style={[styles.primaryButton, busy && styles.disabledButton]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>{mode === "register" ? "Create account" : "Sign in"}</Text>}
          </Pressable>
          <Pressable onPress={() => { setError(""); setNotice(""); setConfirmPassword(""); setMode(mode === "login" ? "register" : "login"); }} style={styles.modeLink}>
            <Text style={styles.modeLinkText}>{mode === "login" ? "New teacher? Create an account" : "Already registered? Sign in"}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.dashboard}>
          <View style={[styles.welcomeRow, isCompactLayout && styles.welcomeRowCompact]}>
            <View style={isCompactLayout && styles.welcomeCopyCompact}><Text style={styles.eyebrow}>TEACHER WORKSPACE</Text><Text style={[styles.title, isCompactLayout && styles.compactTitle]}>Welcome, {teacher.name}</Text><Text style={styles.subtitle}>{teacher.schoolCode ? `${schoolName || teacher.schoolCode} · ${rosterTotal} pupils on your roster` : "Choose your school to get started."}</Text></View>
            {teacher.schoolCode ? <View style={[styles.headerActions, isCompactLayout && styles.headerActionsCompact]}>
              <Pressable onPress={() => { setAddingSchool((value) => !value); setError(""); setNotice(""); }} style={[styles.secondaryButton, isCompactLayout && styles.compactActionButton]}><Text style={[styles.secondaryButtonText, isCompactLayout && styles.compactActionText]}>{addingSchool ? "Cancel" : "＋ Add school"}</Text></Pressable>
              <Pressable onPress={() => { setTab(tab === "roster" ? "add" : "roster"); setError(""); setNotice(""); }} style={[styles.primaryButton, isCompactLayout && styles.compactActionButton]}><Text style={[styles.primaryButtonText, isCompactLayout && styles.compactActionText]}>{tab === "roster" ? "＋ Add pupils" : "View roster"}</Text></Pressable>
            </View> : null}
          </View>
          <View style={styles.workspaceTabs}>
            <Pressable onPress={() => { setTab("classes"); setAddingSchool(false); setClassMode("roster"); setError(""); setNotice(""); }} style={[styles.workspaceTab, tab === "classes" && styles.workspaceTabActive]}>
              <Text style={[styles.workspaceTabText, tab === "classes" && styles.workspaceTabTextActive]}>My classes</Text>
            </Pressable>
            {teacher.schoolCode ? <Pressable onPress={() => { setTab("roster"); setAddingSchool(false); setError(""); setNotice(""); }} style={[styles.workspaceTab, tab !== "classes" && styles.workspaceTabActive]}>
              <Text style={[styles.workspaceTabText, tab !== "classes" && styles.workspaceTabTextActive]}>School roster</Text>
            </Pressable> : <Pressable onPress={() => { setTab("roster"); setAddingSchool(false); setError(""); setNotice(""); }} style={[styles.workspaceTab, tab !== "classes" && styles.workspaceTabActive]}>
              <Text style={[styles.workspaceTabText, tab !== "classes" && styles.workspaceTabTextActive]}>Select school</Text>
            </Pressable>}
          </View>
          {notice ? <Text style={styles.notice}>{notice}</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}

          {teacherSchools.length > 0 && tab !== "classes" && !addingSchool ? <View style={styles.schoolChoices}>
            <Text style={styles.pupilMeta}>Your schools — select one to view its pupils:</Text>
            <View style={styles.schoolChoicesRow}>{teacherSchools.map((teacherSchool) => {
              const selected = teacher.schoolCode === teacherSchool.schoolCode && teacher.territory === teacherSchool.territory;
              const schoolName = teacherSchoolNames[`${teacherSchool.territory}:${teacherSchool.schoolCode}`] || teacherSchool.name || "Loading school name…";
              return <Pressable key={`${teacherSchool.territory}-${teacherSchool.schoolCode}`} onPress={() => void chooseExistingSchool(teacherSchool)} disabled={busy} style={[styles.schoolChip, selected && styles.schoolChipActive]} accessibilityLabel={`${schoolName}, registration number ${teacherSchool.schoolCode}${selected ? ", selected" : ""}`}><Text numberOfLines={2} style={[styles.schoolChipName, selected && styles.schoolChipTextActive]}>{schoolName}</Text><Text style={[styles.schoolChipCode, selected && styles.schoolChipTextActive]}>{teacherSchool.schoolCode}</Text>{selected ? <Text style={styles.schoolChipSelected}>Selected</Text> : null}</Pressable>;
            })}</View>
          </View> : null}

          {addingSchool || (!teacher.schoolCode && tab !== "classes") ? <View style={styles.panel}>
            <Text style={styles.sectionTitle}>{teacher.schoolCode ? "Add a school" : "Choose your first school"}</Text>
            <Text style={styles.pupilMeta}>Add each school you teach at. Then select a saved school to view and manage its pupils.</Text>
            <View style={styles.schoolPicker}><SchoolPicker selectedSchool={school} onSelect={(selected) => void chooseTeacherSchool(selected)} /></View>
            {busy ? <ActivityIndicator color="#F59E0B" /> : null}
          </View> : tab === "classes" ? (
            <View style={styles.panel}>
              <View style={styles.classHeading}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sectionTitle}>My classes</Text>
                  <Text style={styles.pupilMeta}>Create your own rosters with pupils from any school, plus pupils you enter yourself.</Text>
                </View>
                <View style={styles.createClassRow}>
                  <TextInput value={classNameInput} onChangeText={setClassNameInput} placeholder="New class name" style={[styles.input, styles.classNameInput]} maxLength={80} />
                  <Pressable onPress={() => void createClassNow()} disabled={busy} style={[styles.primaryButton, busy && styles.disabledButton]}><Text style={styles.primaryButtonText}>Create class</Text></Pressable>
                </View>
              </View>
              {classes.length ? <View style={styles.classChips}>{classes.map((classRoom) => <Pressable key={classRoom.id} onPress={() => { setActiveClassId(classRoom.id); setActiveClassName(classRoom.name); setClassMode("roster"); setClassSelectedIds(new Set()); }} style={[styles.classChip, activeClassId === classRoom.id && styles.classChipActive]}><Text style={[styles.classChipName, activeClassId === classRoom.id && styles.classChipNameActive]}>{classRoom.name}</Text><Text style={styles.classChipCount}>{classRoom.pupilCount} pupils</Text></Pressable>)}</View> : <Text style={styles.empty}>Create a class to start building a roster.</Text>}
              {activeClassId ? <>
                <View style={styles.classToolbar}>
                  <Text style={styles.sectionTitle}>{activeClassName || classes.find((item) => item.id === activeClassId)?.name || "Class roster"}</Text>
                  <View style={styles.classActions}>
                    <Pressable onPress={() => setClassMode("roster")} style={[styles.workspaceTab, classMode === "roster" && styles.workspaceTabActive]}><Text style={[styles.workspaceTabText, classMode === "roster" && styles.workspaceTabTextActive]}>Roster</Text></Pressable>
                    <Pressable onPress={() => { setClassMode("accounts"); setClassCandidatePage(1); setClassSelectedIds(new Set()); }} style={[styles.workspaceTab, classMode === "accounts" && styles.workspaceTabActive]}><Text style={[styles.workspaceTabText, classMode === "accounts" && styles.workspaceTabTextActive]}>Find pupils</Text></Pressable>
                    <Pressable onPress={() => void deleteSelectedClass()} disabled={busy} style={[styles.removeButton, busy && styles.disabledButton]}><Text style={styles.removeButtonText}>Delete class</Text></Pressable>
                  </View>
                </View>
                {classMode === "roster" ? <>
                  {!classPupils.length ? <Text style={styles.empty}>This class is empty. Search for Kido pupils across all schools to add them.</Text> : classPupils.map((pupil) => <View key={pupil.id} style={styles.pupilRow}>
                    <Pressable style={styles.pupilInfo} onPress={() => void showPerformance({ id: pupil.accountId!, userID: pupil.userID, grade: pupil.grade, xp: pupil.xp, stars: pupil.stars, rank: pupil.rank, levelsCompleted: pupil.levelsCompleted, currentStreak: pupil.currentStreak, lastActivityDate: pupil.lastActivityDate } as TeacherPupil)}>
                      <Text style={styles.pupilName}>{pupil.name}</Text>
                      <Text style={styles.pupilGrade}>{pupil.grade?.name ?? "Grade not set"}{pupil.schoolName ? ` · ${pupil.schoolName}` : pupil.schoolCode ? ` · ${pupil.schoolCode}` : " · School not set"}</Text>
                      <Text style={styles.pupilMeta}>Rank #{pupil.rank ?? "—"} · {pupil.xp ?? 0} XP · {pupil.levelsCompleted ?? 0} levels completed · {pupil.stars ?? 0} stars</Text>
                    </Pressable>
                    <Pressable onPress={() => setConfirmRemoveClassMemberId(confirmRemoveClassMemberId === pupil.id ? null : pupil.id)} disabled={busy} style={styles.removeButton}><Text style={styles.removeButtonText}>{confirmRemoveClassMemberId === pupil.id ? "Cancel" : "Remove"}</Text></Pressable>
                    {confirmRemoveClassMemberId === pupil.id ? <Pressable onPress={() => void removeClassMember(pupil.id)} disabled={busy} style={styles.confirmRemove}><Text style={styles.confirmRemoveText}>Confirm removal</Text></Pressable> : null}
                  </View>)}
                </> : <>
                  <Text style={styles.pupilMeta}>Search Kido pupils across all schools by pupil ID, or narrow results by school name.</Text>
                  <View style={styles.filters}>
                    <TextInput value={classSearch} onChangeText={(value) => { setClassSearch(value); setClassCandidatePage(1); }} placeholder="Search pupil user ID" style={[styles.input, styles.searchInput]} autoCapitalize="none" />
                    <TextInput value={classSchoolName} onChangeText={(value) => { setClassSchoolName(value); setClassCandidatePage(1); }} placeholder="Filter by school name" style={[styles.input, styles.searchInput]} />
                    <View style={styles.gradeFilters}>
                      <Pressable onPress={() => { setClassGradeId(""); setClassCandidatePage(1); }} style={[styles.gradeChip, !classGradeId && styles.gradeChipActive]}><Text style={[styles.gradeChipText, !classGradeId && styles.gradeChipTextActive]}>All grades</Text></Pressable>
                      {grades.map((grade) => <Pressable key={grade.id} onPress={() => { setClassGradeId(String(grade.id)); setClassCandidatePage(1); }} style={[styles.gradeChip, classGradeId === String(grade.id) && styles.gradeChipActive]}><Text style={[styles.gradeChipText, classGradeId === String(grade.id) && styles.gradeChipTextActive]}>{grade.name}</Text></Pressable>)}
                    </View>
                  </View>
                  <View style={styles.selectionRow}><Text style={styles.pupilMeta}>{classCandidateTotal} pupils found · {classSelectedIds.size} selected</Text><Pressable onPress={() => setClassSelectedIds((previous) => {
                    const next = new Set(previous);
                    const allSelected = classCandidates.length > 0 && classCandidates.every((candidate) => next.has(candidate.id));
                    if (allSelected) classCandidates.forEach((candidate) => next.delete(candidate.id));
                    else classCandidates.filter((candidate) => !next.has(candidate.id)).slice(0, Math.max(0, 100 - next.size)).forEach((candidate) => next.add(candidate.id));
                    return next;
                  })} style={styles.selectPage}><Text style={styles.selectPageText}>Select this page</Text></Pressable></View>
                  {!classCandidates.length ? <Text style={styles.empty}>No unassigned pupils match those filters.</Text> : classCandidates.map((candidate) => <Pressable key={candidate.id} onPress={() => setClassSelectedIds((previous) => {
                    const next = new Set(previous);
                    if (next.has(candidate.id)) next.delete(candidate.id);
                    else if (next.size < 100) next.add(candidate.id);
                    else setError("You can add up to 100 pupils at a time.");
                    return next;
                  })} style={styles.candidateRow}>
                    <View style={[styles.checkbox, classSelectedIds.has(candidate.id) && styles.checkboxChecked]}>{classSelectedIds.has(candidate.id) ? <Text style={styles.checkboxTick}>✓</Text> : null}</View>
                    <View style={{ flex: 1 }}><Text style={styles.pupilName}>{candidate.userID}</Text><Text style={styles.pupilMeta}>{candidate.grade?.name ?? "Grade not set"} · {candidate.schoolName || candidate.schoolCode || "School not set"}{candidate.schoolName && candidate.schoolCode ? ` (${candidate.schoolCode})` : ""}</Text></View>
                  </Pressable>)}
                  <View style={styles.selectionRow}><Pressable onPress={() => setClassCandidatePage((page) => Math.max(1, page - 1))} disabled={classCandidatePage === 1} style={styles.pageButton}><Text style={styles.pageButtonText}>Previous</Text></Pressable><Text style={styles.pupilMeta}>Page {classCandidatePage} of {classCandidatePages}</Text><Pressable onPress={() => setClassCandidatePage((page) => Math.min(classCandidatePages, page + 1))} disabled={classCandidatePage >= classCandidatePages} style={styles.pageButton}><Text style={styles.pageButtonText}>Next</Text></Pressable></View>
                  <Pressable onPress={() => void addSelectedToClass()} disabled={busy || classSelectedIds.size === 0} style={[styles.primaryButton, styles.addButton, (busy || classSelectedIds.size === 0) && styles.disabledButton]}><Text style={styles.primaryButtonText}>{busy ? "Adding…" : `Add ${classSelectedIds.size} selected`}</Text></Pressable>
                </>}
              </> : null}
            </View>
          ) : tab === "roster" ? (
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>My pupil roster</Text>
              {teacher.schoolCode ? <Pressable onPress={() => void removeSelectedSchool()} disabled={busy} style={[styles.removeButton, styles.removeSchoolButton, busy && styles.disabledButton]}><Text style={styles.removeButtonText}>Remove selected school</Text></Pressable> : null}
              <View style={styles.rosterGradeFilter}>
                <Text style={styles.pupilMeta}>Filter by grade</Text>
                <View style={styles.gradeFilters}>
                  <Pressable onPress={() => { setRosterGradeId(""); setRosterPage(1); }} style={[styles.gradeChip, !rosterGradeId && styles.gradeChipActive]}><Text style={[styles.gradeChipText, !rosterGradeId && styles.gradeChipTextActive]}>All grades</Text></Pressable>
                  {grades.map((grade) => <Pressable key={grade.id} onPress={() => { setRosterGradeId(String(grade.id)); setRosterPage(1); }} style={[styles.gradeChip, rosterGradeId === String(grade.id) && styles.gradeChipActive]}><Text style={[styles.gradeChipText, rosterGradeId === String(grade.id) && styles.gradeChipTextActive]}>{grade.name}</Text></Pressable>)}
                </View>
              </View>
              {!roster.length ? <Text style={styles.empty}>{rosterGradeId ? "No pupils on your roster match this grade." : "No pupils have been added yet. Search for pupils at your school to build your roster."}</Text> : roster.map((pupil) => (
                <View key={pupil.id} style={styles.pupilRow}>
                  <Pressable style={styles.pupilInfo} onPress={() => void showPerformance(pupil)}>
                    <Text style={styles.pupilName}>{pupil.userID}</Text>
                    <Text style={styles.pupilGrade}>Grade: {pupil.grade?.name ?? "Not set"}</Text>
                    <Text style={styles.pupilMeta}>Rank #{pupil.rank ?? "—"} · {pupil.xp ?? 0} XP · {pupil.levelsCompleted ?? 0} levels completed · {pupil.stars ?? 0} stars</Text>
                  </Pressable>
                  <Pressable onPress={() => setConfirmRemoveId(confirmRemoveId === pupil.id ? null : pupil.id)} style={styles.removeButton}><Text style={styles.removeButtonText}>{confirmRemoveId === pupil.id ? "Cancel" : "Remove"}</Text></Pressable>
                  {confirmRemoveId === pupil.id ? <Pressable onPress={() => void removePupil(pupil.id)} disabled={busy} style={styles.confirmRemove}><Text style={styles.confirmRemoveText}>Confirm removal</Text></Pressable> : null}
                </View>
              ))}
              {rosterTotal > 100 ? <View style={styles.selectionRow}>
                <Pressable onPress={() => void loadRoster(token, Math.max(1, rosterPage - 1))} disabled={rosterPage === 1} style={styles.pageButton}><Text style={styles.pageButtonText}>Previous</Text></Pressable>
                <Text style={styles.pupilMeta}>Page {rosterPage} of {rosterPages}</Text>
                <Pressable onPress={() => void loadRoster(token, Math.min(rosterPages, rosterPage + 1))} disabled={rosterPage >= rosterPages} style={styles.pageButton}><Text style={styles.pageButtonText}>Next</Text></Pressable>
              </View> : null}
            </View>
          ) : (
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Find pupils at {schoolName || teacher.schoolCode}</Text>
              <Text style={styles.pupilMeta}>Only pupils registered to your selected school can be added.</Text>
              {!confirmAddAll ? <Pressable onPress={() => setConfirmAddAll(true)} disabled={busy} style={[styles.secondaryButton, styles.addAllButton, busy && styles.disabledButton]}><Text style={styles.secondaryButtonText}>Add all pupils in this school</Text></Pressable> : <View style={styles.addAllConfirm}>
                <Text style={styles.pupilMeta}>This will add every pupil registered to {schoolName || "your selected school"}, including pupils outside the current search and grade filters. Continue?</Text>
                <View style={styles.selectionRow}><Pressable onPress={() => setConfirmAddAll(false)} disabled={busy} style={styles.pageButton}><Text style={styles.pageButtonText}>Cancel</Text></Pressable><Pressable onPress={() => void addAllSchoolPupils()} disabled={busy} style={[styles.primaryButton, busy && styles.disabledButton]}><Text style={styles.primaryButtonText}>{busy ? "Adding pupils…" : "Confirm add all"}</Text></Pressable></View>
              </View>}
              <View style={styles.filters}>
                <TextInput value={search} onChangeText={(value) => { setSearch(value); setCandidatePage(1); }} placeholder="Search by pupil user ID" style={[styles.input, styles.searchInput]} autoCapitalize="none" />
                <View style={styles.gradeFilters}>
                  <Pressable onPress={() => { setGradeId(""); setCandidatePage(1); }} style={[styles.gradeChip, !gradeId && styles.gradeChipActive]}><Text style={[styles.gradeChipText, !gradeId && styles.gradeChipTextActive]}>All grades</Text></Pressable>
                  {grades.map((grade) => <Pressable key={grade.id} onPress={() => { setGradeId(String(grade.id)); setCandidatePage(1); }} style={[styles.gradeChip, gradeId === String(grade.id) && styles.gradeChipActive]}><Text style={[styles.gradeChipText, gradeId === String(grade.id) && styles.gradeChipTextActive]}>{grade.name}</Text></Pressable>)}
                </View>
              </View>
              <View style={styles.selectionRow}>
                <Text style={styles.pupilMeta}>{candidateTotal} pupils found · {selectedIds.size} selected</Text>
                <Pressable onPress={() => {
                  const unselectedVisible = candidates.filter((pupil) => !selectedIds.has(pupil.id));
                  if (!allVisibleSelected && unselectedVisible.length > Math.max(0, 100 - selectedIds.size)) setError("You can add up to 100 pupils at a time.");
                  setSelectedIds((previous) => {
                  const next = new Set(previous);
                  if (allVisibleSelected) candidates.forEach((pupil) => next.delete(pupil.id));
                  else {
                    const remaining = Math.max(0, 100 - next.size);
                    unselectedVisible.slice(0, remaining).forEach((pupil) => next.add(pupil.id));
                  }
                  return next;
                  });
                }} style={styles.selectPage}><Text style={styles.selectPageText}>{allVisibleSelected ? "Clear this page" : "Select this page"}</Text></Pressable>
              </View>
              {!candidates.length ? <Text style={styles.empty}>No unassigned pupils match those filters.</Text> : candidates.map((pupil) => <Pressable key={pupil.id} onPress={() => toggleCandidate(pupil.id)} style={styles.candidateRow}>
                <View style={[styles.checkbox, selectedIds.has(pupil.id) && styles.checkboxChecked]}>{selectedIds.has(pupil.id) ? <Text style={styles.checkboxTick}>✓</Text> : null}</View>
                <View><Text style={styles.pupilName}>{pupil.userID}</Text><Text style={styles.pupilMeta}>{pupil.grade?.name ?? "Grade not set"}</Text></View>
              </Pressable>)}
              <View style={styles.selectionRow}>
                <Pressable onPress={() => setCandidatePage((page) => Math.max(1, page - 1))} disabled={candidatePage === 1} style={styles.pageButton}><Text style={styles.pageButtonText}>Previous</Text></Pressable>
                <Text style={styles.pupilMeta}>Page {candidatePage} of {candidatePages}</Text>
                <Pressable onPress={() => setCandidatePage((page) => Math.min(candidatePages, page + 1))} disabled={candidatePage >= candidatePages} style={styles.pageButton}><Text style={styles.pageButtonText}>Next</Text></Pressable>
              </View>
              <Pressable onPress={() => void addSelected()} disabled={busy || selectedIds.size === 0} style={[styles.primaryButton, styles.addButton, (busy || selectedIds.size === 0) && styles.disabledButton]}><Text style={styles.primaryButtonText}>{busy ? "Adding…" : `Add ${selectedIds.size} selected`}</Text></Pressable>
            </View>
          )}
          <Text style={styles.footerNote}>Pupil performance is visible to you only while each pupil is on your roster.</Text>
        </View>
      )}
    </ScrollView>
    {selectedPupil ? <View style={[styles.drawerLayer, Platform.OS === "web" && styles.drawerLayerWeb]}>
      <Pressable style={styles.drawerBackdrop} onPress={closePerformance} accessibilityRole="button" accessibilityLabel="Close pupil performance" />
      <Animated.View style={[styles.performanceDrawer, { width: Math.min(620, viewportWidth * 0.94), height: Math.max(0, viewportHeight - 24), transform: [{ translateX: performanceDrawerX.interpolate({ inputRange: [0, 1], outputRange: [0, Math.min(620, viewportWidth * 0.94)] }) }] }]}>
        <View style={styles.performanceHeader}>
          <View style={styles.profileCard}>
            <View style={styles.profileTopRow}>
              <View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{selectedPupil.userID.slice(0, 1).toUpperCase()}</Text></View>
              <Pressable onPress={closePerformance} style={styles.drawerClose} accessibilityRole="button" accessibilityLabel="Close pupil performance"><Text style={styles.drawerCloseText}>×</Text></Pressable>
            </View>
            <Text style={styles.profileEyebrow}>PUPIL PERFORMANCE</Text>
            <Text style={styles.profileName}>{selectedPupil.userID}</Text>
            <View style={styles.profileMetaRow}>
              <Text style={styles.gradeBadge}>{selectedPupil.grade?.name ?? "Grade not set"}</Text>
              <Text style={styles.lastActive}>Last active {selectedPupil.lastActivityDate ? new Date(selectedPupil.lastActivityDate).toLocaleDateString() : "not yet"}</Text>
            </View>
          </View>
        </View>
        <View style={styles.performanceStats}>
          <View style={styles.performanceStat}><Text style={styles.performanceStatValue}>{(selectedPupil.xp ?? 0).toLocaleString()}</Text><Text style={styles.performanceStatLabel}>XP earned</Text></View>
          <View style={styles.performanceStat}><Text style={styles.performanceStatValue}>{selectedPupil.currentStreak ?? 0}</Text><Text style={styles.performanceStatLabel}>Day streak</Text></View>
          <View style={styles.performanceStat}><Text style={styles.performanceStatValue}>{selectedPupil.levelsCompleted ?? 0}</Text><Text style={styles.performanceStatLabel}>Levels done</Text></View>
        </View>
        <View style={styles.progressHeading}>
          <Text style={styles.progressTitle}>Learning progress</Text>
          <Text style={styles.progressCount}>{selectedPupil.levels.length} {selectedPupil.levels.length === 1 ? "level" : "levels"}</Text>
        </View>
        <ScrollView style={styles.performanceContent} contentContainerStyle={styles.performanceContentInner}>
          {!selectedPupil.levels.length ? <View style={styles.emptyProgress}><Text style={styles.emptyProgressTitle}>No progress yet</Text><Text style={styles.emptyProgressText}>Level activity will appear here when this pupil starts playing.</Text></View> : selectedPupil.levels.map((level, index) => {
            const progress = level.requiredPoints > 0 ? Math.min(100, Math.max(0, (level.bestScore / level.requiredPoints) * 100)) : 0;
            return <View key={`${level.subject}-${level.levelNumber}-${index}`} style={styles.levelCard}>
              <View style={styles.levelCardTop}>
                <View style={styles.levelCopy}>
                  <Text style={styles.levelSubject}>{level.subject}</Text>
                  <Text style={styles.levelName}>{level.name || `Level ${level.levelNumber}`}</Text>
                </View>
                <Text style={[styles.levelStatus, level.completed ? styles.levelStatusCompleted : styles.levelStatusProgress]}>{level.completed ? "Completed" : "In progress"}</Text>
              </View>
              <View style={styles.levelProgressTrack}><View style={[styles.levelProgressFill, level.completed && styles.levelProgressComplete, { width: `${progress}%` }]} /></View>
              <View style={styles.levelDetails}><Text style={styles.levelMeta}>{level.bestScore}/{level.requiredPoints} XP</Text><Text style={styles.levelMeta}>{level.attempts} {level.attempts === 1 ? "attempt" : "attempts"}</Text></View>
            </View>;
          })}
        </ScrollView>
      </Animated.View>
    </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0, position: "relative", backgroundColor: "#F6F8FC" },
  page: { flex: 1, minHeight: 0, alignSelf: "stretch", backgroundColor: "#F6F8FC" },
  // Explicitly allow vertical touch panning in mobile browsers where RN Web's
  // nested overflow container can otherwise lose the gesture to its parent.
  phoneWebScroll: { touchAction: "pan-y", WebkitOverflowScrolling: "touch" } as any,
  pageContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48, alignItems: "center" },
  topbar: { width: "100%", maxWidth: 1180, minHeight: 76, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#E4E8EF", marginBottom: 30 },
  brand: { color: "#263044", fontSize: 25, fontWeight: "900" }, brandAccent: { color: "#D48C13" },
  authCard: { width: "100%", maxWidth: 620, backgroundColor: "#FFFFFF", borderRadius: 22, padding: 28, borderWidth: 1, borderColor: "#E4E8EF", gap: 14 },
  dashboard: { width: "100%", maxWidth: 1180, gap: 18 },
  welcomeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 8 },
  welcomeRowCompact: { flexDirection: "column", alignItems: "stretch", gap: 14 },
  welcomeCopyCompact: { width: "100%" },
  compactTitle: { fontSize: 26 },
  headerActions: { flexDirection: "row", gap: 8 },
  headerActionsCompact: { width: "100%", flexWrap: "wrap", justifyContent: "flex-start", alignItems: "stretch" },
  compactActionButton: { flexGrow: 1, flexBasis: "42%", minWidth: 100, alignItems: "center", justifyContent: "center", paddingHorizontal: 8 },
  compactActionText: { fontSize: 13, textAlign: "center" },
  schoolChoices: { backgroundColor: "#FFFFFF", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#E4E8EF", gap: 10 },
  workspaceTabs: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 2 },
  workspaceTab: { borderWidth: 1, borderColor: "#D6DCE6", backgroundColor: "#FFFFFF", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 9 },
  workspaceTabActive: { borderColor: "#E89A16", backgroundColor: "#FFF4D7" },
  workspaceTabText: { color: "#4B5565", fontWeight: "700", fontSize: 13 },
  workspaceTabTextActive: { color: "#68451B", fontWeight: "800" },
  classHeading: { gap: 12 },
  createClassRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" },
  classNameInput: { flex: 1, minWidth: 180 },
  classChips: { flexDirection: "row", flexWrap: "wrap", gap: 9, paddingVertical: 6 },
  classChip: { minWidth: 150, borderWidth: 1, borderColor: "#D6DCE6", backgroundColor: "#FFFFFF", borderRadius: 12, paddingHorizontal: 13, paddingVertical: 10 },
  classChipActive: { borderColor: "#E89A16", backgroundColor: "#FFF4D7" },
  classChipName: { color: "#263044", fontWeight: "800", fontSize: 14 },
  classChipNameActive: { color: "#68451B" },
  classChipCount: { color: "#68738A", fontSize: 12, marginTop: 3 },
  classToolbar: { borderTopWidth: 1, borderTopColor: "#EDF0F5", paddingTop: 14, gap: 12 },
  classActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  schoolChoicesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  schoolChip: { minWidth: 190, maxWidth: 280, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: "#D6DCE6", backgroundColor: "#FFFFFF", gap: 3 },
  schoolChipActive: { borderColor: "#E89A16", backgroundColor: "#FFF4D7" },
  schoolChipCode: { color: "#4B5565", fontWeight: "800", fontSize: 13 },
  schoolChipName: { color: "#4B5565", fontWeight: "600", fontSize: 12 },
  schoolChipSelected: { color: "#8A6A32", fontWeight: "700", fontSize: 10, marginTop: 2 },
  schoolChipTextActive: { color: "#68451B", fontWeight: "800" },
  eyebrow: { color: "#8A6A32", fontSize: 12, fontWeight: "800", letterSpacing: 1.3, marginBottom: 6 },
  title: { color: "#263044", fontSize: 30, fontWeight: "900", marginBottom: 4 },
  subtitle: { color: "#68738A", fontSize: 15, lineHeight: 22 },
  input: { width: "100%", minHeight: 48, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: "#DCE2EB", backgroundColor: "#FAFBFD", color: "#263044", fontSize: 15 },
  passwordField: { width: "100%", flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: "#DCE2EB", borderRadius: 10, backgroundColor: "#FAFBFD", paddingRight: 12 },
  passwordInput: { flex: 1, borderWidth: 0, backgroundColor: "transparent", minWidth: 0 },
  passwordToggle: { paddingHorizontal: 8, paddingVertical: 10 },
  passwordToggleText: { color: "#8A5B12", fontWeight: "800", fontSize: 13 },
  schoolPicker: { borderWidth: 1, borderColor: "#E4E8EF", borderRadius: 12, padding: 12, maxHeight: 470, overflow: "scroll" as any },
  primaryButton: { minHeight: 46, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, backgroundColor: "#E89A16", alignItems: "center", justifyContent: "center" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  secondaryButton: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 9, borderWidth: 1, borderColor: "#D6DCE6" },
  secondaryButtonText: { color: "#4B5565", fontWeight: "700" },
  modeLink: { alignItems: "center", padding: 8 }, modeLinkText: { color: "#7C571B", fontWeight: "700" },
  notice: { padding: 12, borderRadius: 10, backgroundColor: "#ECFDF3", color: "#21623B", lineHeight: 20 },
  error: { padding: 12, borderRadius: 10, backgroundColor: "#FFF1F0", color: "#A3342A", lineHeight: 20 },
  disabledButton: { opacity: 0.55 },
  panel: { backgroundColor: "#FFFFFF", borderRadius: 18, padding: 22, borderWidth: 1, borderColor: "#E4E8EF", gap: 12 },
  sectionTitle: { color: "#263044", fontSize: 21, fontWeight: "900" },
  pupilRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14, borderTopWidth: 1, borderTopColor: "#EDF0F5" },
  pupilInfo: { flex: 1 }, pupilName: { color: "#263044", fontSize: 16, fontWeight: "800" },
  pupilGrade: { color: "#4B5565", fontSize: 13, fontWeight: "700", marginTop: 3 },
  pupilMeta: { color: "#68738A", fontSize: 13, marginTop: 4, lineHeight: 19 },
  removeButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#FFF1F0" }, removeButtonText: { color: "#A3342A", fontWeight: "700" },
  removeSchoolButton: { alignSelf: "flex-start", marginTop: 2 },
  confirmRemove: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#A3342A" }, confirmRemoveText: { color: "#FFF", fontWeight: "700" },
  performance: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#E5E9F0", gap: 8 },
  performanceHeader: { marginBottom: 14 },
  profileCard: { backgroundColor: "#FFF7E6", borderWidth: 1, borderColor: "#F3DFB1", borderRadius: 18, padding: 18 },
  profileTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  profileAvatar: { width: 48, height: 48, borderRadius: 16, backgroundColor: "#F2B544", alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#FFFFFF" },
  profileAvatarText: { color: "#573C16", fontSize: 21, fontWeight: "900" },
  profileEyebrow: { color: "#A16B17", fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  profileName: { color: "#263044", fontSize: 25, fontWeight: "900", marginTop: 3 },
  profileMetaRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 9, marginTop: 9 },
  gradeBadge: { color: "#765219", backgroundColor: "#FCE9BB", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, fontSize: 12, fontWeight: "800", overflow: "hidden" },
  lastActive: { color: "#68738A", fontSize: 12 },
  drawerClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#EAD9B4", alignItems: "center", justifyContent: "center" },
  drawerCloseText: { color: "#765219", fontSize: 25, lineHeight: 29, fontWeight: "500" },
  performanceStats: { flexDirection: "row", gap: 9, marginBottom: 22 },
  performanceStat: { flex: 1, minWidth: 0, backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4E8EF", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 12 },
  performanceStatValue: { color: "#263044", fontSize: 19, fontWeight: "900" },
  performanceStatLabel: { color: "#68738A", fontSize: 11, marginTop: 3 },
  progressHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  progressTitle: { color: "#263044", fontSize: 18, fontWeight: "900" },
  progressCount: { color: "#68738A", fontSize: 12, fontWeight: "700" },
  drawerLayer: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000, elevation: 20, flexDirection: "row", justifyContent: "flex-end" },
  drawerLayerWeb: { position: "fixed", top: 0, right: 0, bottom: 0, left: 0 } as any,
  drawerBackdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(22, 30, 45, 0.38)" },
  performanceDrawer: { marginVertical: 12, marginRight: 12, backgroundColor: "#F8FAFD", borderWidth: 1, borderColor: "#D7DEE9", borderRadius: 24, padding: 20, shadowColor: "#142033", shadowOpacity: 0.2, shadowRadius: 22, shadowOffset: { width: 0, height: 5 }, elevation: 18 },
  performanceContent: { flex: 1, minHeight: 0 },
  performanceContentInner: { paddingBottom: 24, gap: 10 },
  levelCard: { padding: 14, borderRadius: 14, borderWidth: 1, borderColor: "#E4E8EF", backgroundColor: "#FFFFFF" },
  levelCardTop: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  levelCopy: { flex: 1, minWidth: 0 },
  levelSubject: { color: "#8A6A32", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  levelName: { color: "#263044", fontWeight: "800", fontSize: 15, marginTop: 3 },
  levelStatus: { borderRadius: 20, paddingHorizontal: 9, paddingVertical: 5, fontSize: 10, fontWeight: "800", overflow: "hidden" },
  levelStatusCompleted: { color: "#287344", backgroundColor: "#E8F6ED" },
  levelStatusProgress: { color: "#87601D", backgroundColor: "#FFF4D7" },
  levelProgressTrack: { height: 7, backgroundColor: "#EDF0F5", borderRadius: 8, overflow: "hidden", marginTop: 14 },
  levelProgressFill: { height: "100%", backgroundColor: "#E9A22A", borderRadius: 8 },
  levelProgressComplete: { backgroundColor: "#48A66A" },
  levelDetails: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  levelMeta: { color: "#68738A", fontSize: 12, fontWeight: "600" },
  emptyProgress: { alignItems: "center", padding: 24, backgroundColor: "#FFFFFF", borderRadius: 14, borderWidth: 1, borderColor: "#E4E8EF" },
  emptyProgressTitle: { color: "#263044", fontWeight: "800", fontSize: 16 },
  emptyProgressText: { color: "#68738A", fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 6 },
  empty: { paddingVertical: 22, textAlign: "center", color: "#68738A", lineHeight: 21 },
  filters: { gap: 12, marginVertical: 8 }, searchInput: { maxWidth: 560 }, gradeFilters: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gradeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: "#DCE2EB", backgroundColor: "#FFF" }, gradeChipActive: { borderColor: "#E89A16", backgroundColor: "#FFF4D7" }, gradeChipText: { color: "#4B5565", fontSize: 13 }, gradeChipTextActive: { color: "#68451B", fontWeight: "800" },
  selectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 8 },
  rosterGradeFilter: { gap: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#EDF0F5" },
  selectPage: { paddingHorizontal: 12, paddingVertical: 8 }, selectPageText: { color: "#7C571B", fontWeight: "700" },
  candidateRow: { minHeight: 58, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: "#EDF0F5" },
  checkbox: { width: 21, height: 21, borderWidth: 1.5, borderColor: "#A8B0BF", borderRadius: 5, alignItems: "center", justifyContent: "center" }, checkboxChecked: { backgroundColor: "#E89A16", borderColor: "#E89A16" }, checkboxTick: { color: "#FFF", fontWeight: "900", fontSize: 14 },
  pageButton: { borderWidth: 1, borderColor: "#D6DCE6", paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }, pageButtonText: { color: "#4B5565", fontWeight: "700" },
  addButton: { alignSelf: "flex-end", minWidth: 190, marginTop: 8 }, footerNote: { color: "#7B8493", textAlign: "center", fontSize: 13, paddingVertical: 8 },
  addAllButton: { alignSelf: "flex-start", marginVertical: 5 },
  addAllConfirm: { backgroundColor: "#FFF8E8", borderWidth: 1, borderColor: "#F3DFB1", borderRadius: 12, padding: 13, gap: 8 },
  restricted: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#F6F8FC", gap: 16 },
});
