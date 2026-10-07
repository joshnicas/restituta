import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useKidoLanguage } from "../lib/language-context";
import { translateUiText } from "../lib/ui-translations";
import {
  getSchoolDistricts,
  getSchoolRegions,
  searchSchools,
  type SchoolOption,
} from "../lib/api";

type Props = {
  selectedSchool?: SchoolOption | null;
  darkMode?: boolean;
  onSelect: (school: SchoolOption) => void;
};
type Step = "region" | "district" | "school";

const translate = (text: string, language: "EN" | "SW") =>
  translateUiText(text, language);

export default function SchoolPicker({ selectedSchool, darkMode = false, onSelect }: Props) {
  const { language } = useKidoLanguage();
  const [step, setStep] = useState<Step>("region");
  const [regions, setRegions] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [region, setRegion] = useState("");
  const [district, setDistrict] = useState("");
  const [query, setQuery] = useState("");
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getSchoolRegions()
      .then((result) => { if (active) setRegions(result.regions); })
      .catch(() => { if (active) setError("Could not load regions. Please try again."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (step !== "school" || !region || !district) return;
    let active = true;
    setLoading(true);
    setError("");
    const timer = setTimeout(() => {
      searchSchools({ search: query.trim() || undefined, region, district, page: 1, limit: 30 })
        .then((result) => {
          if (!active) return;
          setSchools(result.schools);
          setPage(1);
          setHasMore(result.page < result.totalPages);
        })
        .catch(() => { if (active) setError("Could not load schools. Please try again."); })
        .finally(() => { if (active) setLoading(false); });
    }, query ? 250 : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [step, region, district, query]);

  const palette = darkMode
    ? { text: "#fff", muted: "#c5c9d3", card: "#242b3a", border: "#485064", input: "#171c27", accent: "#f8c25a" }
    : { text: "#263044", muted: "#68738a", card: "#fff", border: "#e4e8ef", input: "#f6f8fb", accent: "#f3ae32" };
  const list = step === "region" ? regions : step === "district" ? districts : [];
  const filteredList = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    return normalized ? list.filter((item) => item.toLocaleLowerCase().includes(normalized)) : list;
  }, [list, query]);

  const chooseRegion = async (value: string) => {
    setRegion(value); setDistrict(""); setQuery(""); setStep("district"); setLoading(true); setError("");
    try {
      const result = await getSchoolDistricts(value);
      setDistricts(result.districts);
    } catch { setError("Could not load districts. Please try again."); }
    finally { setLoading(false); }
  };

  const chooseDistrict = (value: string) => {
    setDistrict(value); setQuery(""); setSchools([]); setStep("school");
  };

  const loadMore = async () => {
    if (loading || !hasMore) return;
    setLoading(true); setError("");
    try {
      const nextPage = page + 1;
      const result = await searchSchools({ search: query.trim() || undefined, region, district, page: nextPage, limit: 30 });
      setSchools((previous) => [...previous, ...result.schools]);
      setPage(nextPage); setHasMore(nextPage < result.totalPages);
    } catch { setError("Could not load schools. Please try again."); }
    finally { setLoading(false); }
  };

  const back = () => {
    setError(""); setQuery("");
    if (step === "school") setStep("district");
    else if (step === "district") setStep("region");
  };

  const heading = step === "region" ? "Choose a region" : step === "district" ? "Choose a district" : "Choose your school";
  const placeholder = step === "region" ? "Find a region" : step === "district" ? "Find a district" : "Find your school";
  const stepNumber = step === "region" ? 1 : step === "district" ? 2 : 3;

  return (
    <View style={styles.container}>
      {selectedSchool ? (
        <View style={[styles.current, { backgroundColor: palette.input }]}>
          <Text style={[styles.currentLabel, { color: palette.muted }]}>{translate("Your school", language)}</Text>
          <Text style={[styles.currentName, { color: palette.text }]}>{selectedSchool.name}</Text>
        </View>
      ) : null}
      <View style={styles.headingRow}>
        {step !== "region" ? <Pressable onPress={back} style={[styles.back, { borderColor: palette.border }]}><Text style={[styles.backText, { color: palette.text }]}>‹ {translate("Back", language)}</Text></Pressable> : null}
        <View style={styles.headingTextWrap}>
          <Text style={[styles.step, { color: palette.muted }]}>{translate(`Step ${stepNumber} of 3`, language)}</Text>
          <Text style={[styles.heading, { color: palette.text }]}>{translate(heading, language)}</Text>
        </View>
      </View>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder={translate(placeholder, language)}
        placeholderTextColor={palette.muted}
        style={[styles.search, { color: palette.text, backgroundColor: palette.input, borderColor: palette.border }]}
        autoCorrect={false}
        accessibilityLabel={translate(placeholder, language)}
      />
      {step !== "school" ? (
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {loading && !filteredList.length ? <ActivityIndicator color={palette.accent} style={styles.spinner} /> : null}
          {filteredList.map((item) => (
            <Pressable key={item} onPress={() => step === "region" ? chooseRegion(item) : chooseDistrict(item)} style={[styles.choice, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.choiceText, { color: palette.text }]}>{item}</Text>
              <Text style={[styles.chevron, { color: palette.accent }]}>›</Text>
            </Pressable>
          ))}
          {!loading && !filteredList.length ? <Text style={[styles.empty, { color: palette.muted }]}>{translate("No matches. Try another search.", language)}</Text> : null}
        </ScrollView>
      ) : (
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {schools.map((school) => (
            <Pressable key={school.schoolCode} onPress={() => onSelect(school)} style={[styles.choice, { backgroundColor: palette.card, borderColor: palette.border }]}>
              <Text style={[styles.choiceText, { color: palette.text }]}>{school.name}</Text>
            </Pressable>
          ))}
          {loading ? <ActivityIndicator color={palette.accent} style={styles.spinner} /> : null}
          {!loading && !schools.length && !error ? <Text style={[styles.empty, { color: palette.muted }]}>{translate("No schools found. Try another search.", language)}</Text> : null}
          {!loading && hasMore ? <Pressable onPress={loadMore} style={[styles.more, { borderColor: palette.accent }]}><Text style={[styles.moreText, { color: palette.text }]}>{translate("Show more schools", language)}</Text></Pressable> : null}
        </ScrollView>
      )}
      {error ? <Text style={styles.error}>{translate(error, language)}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: "100%" },
  current: { borderRadius: 14, padding: 11, marginBottom: 12 },
  currentLabel: { fontFamily: "FredokaMedium", fontSize: 13 },
  currentName: { fontFamily: "FredokaBold", fontSize: 16, marginTop: 2 },
  headingRow: { minHeight: 48, flexDirection: "row", alignItems: "center", marginBottom: 10 },
  back: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 8, marginRight: 10 },
  backText: { fontFamily: "FredokaMedium", fontSize: 14 },
  headingTextWrap: { flex: 1 },
  step: { fontFamily: "FredokaMedium", fontSize: 12 },
  heading: { fontFamily: "FredokaBold", fontSize: 21 },
  search: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 11, fontFamily: "FredokaRegular", fontSize: 16, marginBottom: 10 },
  list: { maxHeight: 255 },
  choice: { minHeight: 48, borderWidth: 1, borderRadius: 13, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 7, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  choiceText: { fontFamily: "FredokaMedium", fontSize: 16, flex: 1 },
  chevron: { fontFamily: "FredokaBold", fontSize: 23, marginLeft: 8 },
  spinner: { padding: 15 },
  empty: { textAlign: "center", fontFamily: "FredokaRegular", fontSize: 15, padding: 14 },
  more: { borderWidth: 2, borderRadius: 13, padding: 12, alignItems: "center", marginBottom: 8 },
  moreText: { fontFamily: "FredokaBold", fontSize: 15 },
  error: { color: "#c0392b", fontFamily: "FredokaMedium", fontSize: 14, marginTop: 6 },
});
