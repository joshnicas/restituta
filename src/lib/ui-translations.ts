const SWAHILI_UI: Record<string, string> = Object.fromEntries([
  ["No internet connection. Check your connection and try again.", "Hakuna muunganisho wa intaneti. Angalia muunganisho wako kisha ujaribu tena."],
  ["Select your grade to proceed", "Chagua darasa kuendelea"],
  ["Leaderboard", "Ubao wa wanaoongoza"], ["Back", "Rudi"], ["Who are you cheering with?", "Unashindana na nani?"], ["Everyone", "Wote"], ["My school", "Shule yangu"], ["My region", "Mkoa wangu"], ["Choose a school in Settings to see your school team.", "Chagua shule kwenye Mipangilio kuona timu ya shule yako."], ["When?", "Lini?"], ["All time", "Muda wote"], ["This week", "Wiki hii"], ["This month", "Mwezi huu"], ["Count by", "Panga kwa"], ["YOUR PLACE", "NAFASI YAKO"], ["Keep learning and see if you can move up!", "Endelea kujifunza ili upande nafasi!"], ["School stars", "Vinara wa shule"], ["Top learners", "Wanafunzi vinara"], ["Finding the leaderboard…", "Inatafuta ubao wa wanaoongoza…"], ["Could not load the leaderboard. Please try again.", "Imeshindwa kupakia ubao wa wanaoongoza. Tafadhali jaribu tena."], ["Try again", "Jaribu tena"], ["No scores yet. Play a game to be the first!", "Bado hakuna alama. Cheza mchezo uwe wa kwanza!"], ["You", "Wewe"],
  ["What school do you go to?", "Unasoma shule gani?"],
  ["School", "Shule"],
  ["Select your school", "Chagua shule yako"],
  ["Select school", "Chagua shule"],
  ["Select school (optional)", "Chagua shule (si lazima)"],
  ["Search school name or code", "Tafuta jina au namba ya shule"],
  ["All regions", "Mikoa yote"],
  ["All districts", "Wilaya zote"],
  ["Loading schools...", "Inapakia shule..."],
  ["No schools found. Try a search or select a region.", "Hakuna shule zilizopatikana. Tafuta au chagua mkoa."],
  ["Previous", "Iliyotangulia"],
  ["Next", "Inayofuata"],
  ["Saving school...", "Inahifadhi shule..."],
  ["Could not load regions. Please try again.", "Imeshindwa kupakia mikoa. Tafadhali jaribu tena."],
  ["Could not load districts. Please try again.", "Imeshindwa kupakia wilaya. Tafadhali jaribu tena."],
  ["Could not load schools. Please try again.", "Imeshindwa kupakia shule. Tafadhali jaribu tena."],
  ["Could not save your school.", "Imeshindwa kuhifadhi shule yako."],
  ["Log in to save your school.", "Ingia ili kuhifadhi shule yako."],
  ["Your school", "Shule yako"],
  ["Choose a region", "Chagua mkoa"],
  ["Choose a district", "Chagua wilaya"],
  ["Choose your school", "Chagua shule yako"],
  ["Find a region", "Tafuta mkoa"],
  ["Find a district", "Tafuta wilaya"],
  ["Find your school", "Tafuta shule yako"],
  ["No matches. Try another search.", "Hakuna yaliyopatikana. Jaribu kutafuta tena."],
  ["No schools found. Try another search.", "Hakuna shule zilizopatikana. Jaribu kutafuta tena."],
  ["Show more schools", "Onyesha shule zaidi"],
  ["Step 1 of 3", "Hatua ya 1 kati ya 3"],
  ["Step 2 of 3", "Hatua ya 2 kati ya 3"],
  ["Step 3 of 3", "Hatua ya 3 kati ya 3"],
  ["Could not load regions. Please try again.", "Imeshindwa kupakia mikoa. Tafadhali jaribu tena."],
  ["Could not load districts. Please try again.", "Imeshindwa kupakia wilaya. Tafadhali jaribu tena."],
  ["Could not load schools. Please try again.", "Imeshindwa kupakia shule. Tafadhali jaribu tena."],
  ["Not now", "Sio sasa"],
  ["Subscribe", "Jisajili"], ["Practice", "Mazoezi"], ["Practice by subject", "Fanya mazoezi kwa somo"], ["Quick Practice", "Mazoezi ya Haraka"], ["Mixed topics", "Mada mbalimbali"], ["Earn points & stars", "Pata pointi na nyota"], ["Practice your weaker topics", "Fanyia mazoezi mada zako dhaifu"], ["new questions", "maswali mapya"], ["We couldn’t find new questions for weaker topics yet. Answer 3 or more questions in a topic, including at least 1 wrong answer, to unlock practice.", "Bado hatujapata maswali mapya ya mada dhaifu. Jibu maswali 3 au zaidi katika mada moja, ukiwemo angalau jibu 1 lisilo sahihi, ili ufungue mazoezi."], ["You're improving! There are no new questions in your weaker topics right now.", "Unaendelea vizuri! Kwa sasa hakuna maswali mapya katika mada zako dhaifu."], ["questions", "maswali"], ["questions to improve", "maswali ya kuboresha"], ["Keep practicing to see accuracy", "Endelea kufanya mazoezi kuona usahihi"], ["Your practice", "Mazoezi yako"], ["Questions practiced", "Maswali yaliyofanyiwa mazoezi"], ["Accuracy", "Usahihi"], ["All", "Yote"], ["All topics in this subject", "Mada zote katika somo hili"], ["Topics", "Mada"], ["No topics are ready yet. Try all", "Bado hakuna mada. Jaribu somo lote la"], ["No subjects are ready yet. Check back soon!", "Bado hakuna masomo. Rudi tena baadaye!"], ["No questions yet! 🌱", "Bado hakuna maswali! 🌱"], ["Try another topic or come back later.", "Jaribu mada nyingine au urudi baadaye."], ["Practice results", "Matokeo ya mazoezi"], ["Great job!", "Hongera!"], ["Practice again", "Fanya mazoezi tena"], ["Question", "Swali"], ["of", "kati ya"], ["Next question...", "Swali linalofuata..."], ["Starting...", "Inaanza..."], ["Please sign in to use Practice.", "Ingia ili kutumia Mazoezi."], ["Please sign in to continue.", "Ingia ili kuendelea."], ["This practice session has expired. Start a new one.", "Kipindi hiki cha mazoezi kimeisha. Anza kingine."], ["This practice session could not be opened. Please start again.", "Kipindi hiki cha mazoezi hakikufunguka. Tafadhali anza tena."], ["This practice session could not be opened.", "Kipindi hiki cha mazoezi hakikufunguka."], ["Your results could not be loaded. 🌱", "Matokeo yako hayakupatikana. 🌱"], ["No questions yet! Try another topic or come back later.", "Bado hakuna maswali! Jaribu mada nyingine au urudi baadaye."], ["Could not start another practice round.", "Imeshindwa kuanza raundi nyingine ya mazoezi."], ["Could not load Practice. Please try again.", "Imeshindwa kupakia Mazoezi. Tafadhali jaribu tena."], ["Could not load this subject. Please try again.", "Imeshindwa kupakia somo hili. Tafadhali jaribu tena."], ["Could not save your answer. Please try again.", "Imeshindwa kuhifadhi jibu lako. Tafadhali jaribu tena."], ["Practice home", "Mwanzo wa Mazoezi"], ["Next question...", "Swali linalofuata..."], ["Loading Practice...", "Inapakia Mazoezi..."], ["Learn • Play • Improve", "Jifunze • Cheza • Boresha"], ["Mixed topics in this subject", "Mada mbalimbali katika somo hili"], ["Starting...", "Inaanza..."], ["All Mathematics", "Hisabati Yote"], ["Home", "Nyumbani"], ["Songs", "Nyimbo"], ["Land", "Ardhi"], ["this is play screen", "hii ni skrini ya kucheza"],
  ["Settings", "Mipangilio"], ["Close", "Funga"], ["Language", "Lugha"], ["English", "Kiingereza"], ["Kiswahili", "Kiswahili"],
  ["Theme", "Mandhari"], ["Sound", "Sauti"], ["Music", "Muziki"], ["Notifications", "Arifa"], ["Enabled", "Imewashwa"],
  ["Day", "Mchana"], ["Dark", "Giza"], ["Play", "Cheza"], ["Streak", "Mfululizo"], ["Challenge", "Changamoto"], ["Gift", "Zawadi"],
  ["Fire", "Moto"], ["Target", "Lengo"], ["Reward", "Zawadi"], ["Back", "Rudi"], ["Done", "Imekamilika"], ["Cancel", "Ghairi"], ["Save", "Hifadhi"], ["Continue", "Endelea"], ["Select", "Chagua"], ["Remove", "Ondoa"], ["Start", "Anza"], ["Loading…", "Inapakia…"], ["Loading...", "Inapakia..."],
  ["Register", "Jisajili"], ["Username", "Jina la mtumiaji"], ["Player name", "Jina la mchezaji"], ["Email", "Barua pepe"], ["Email verified", "Barua pepe imethibitishwa"], ["Not verified", "Haijathibitishwa"], ["Date of birth", "Tarehe ya kuzaliwa"], ["Grade", "Darasa"], ["Skip", "Ruka"], ["Regenerate user id", "Tengeneza kitambulisho kingine"], ["Select date of birth", "Chagua tarehe ya kuzaliwa"], ["Done selecting date of birth", "Maliza kuchagua tarehe ya kuzaliwa"], ["Save registration", "Hifadhi usajili"], ["Skip registration details and save user ID", "Ruka maelezo ya usajili na uhifadhi kitambulisho"], ["True", "Kweli"], ["False", "Si kweli"], ["Account", "Akaunti"], ["UserID", "Kitambulisho cha mtumiaji"], ["Update account", "Sasisha akaunti"], ["Email verified", "Barua pepe imethibitishwa"], ["Not verified", "Haijathibitishwa"], ["DOB", "Tarehe ya kuzaliwa"], ["Email status", "Hali ya barua pepe"], ["Subscription", "Usajili"], ["Profile", "Wasifu"], ["Streak best", "Mfululizo bora"], ["Choose a land", "Chagua ardhi"], ["CURRENT STREAK", "MFULULIZO WA SASA"], ["of", "kati ya"], ["correct", "sahihi"], ["wrong", "si sahihi"], ["Choose another level", "Chagua ngazi nyingine"], ["seconds", "sekunde"], ["Loading subjects...", "Inapakia masomo..."], ["Loading subjects…", "Inapakia masomo…"], ["Close settings", "Funga mipangilio"], ["Player profile", "Wasifu wa mchezaji"], ["Time limit", "Muda uliowekwa"], ["Attempt", "Jaribio"], ["Failed", "Imeshindwa"], ["+1 in", "+1 baada ya"], ["d", "siku"], ["h", "saa"], ["m", "dakika"], ["s", "sekunde"], ["Success", "Mafanikio"], ["Settings", "Mipangilio"], ["Enter your username", "Weka jina lako la mtumiaji"], ["Enter your email", "Weka barua pepe yako"],
  ["Select a subject", "Chagua somo"], ["Choose level", "Chagua ngazi"], ["Select a level", "Chagua ngazi"], ["Earn the required XP to unlock the next level.", "Pata XP zinazohitajika ili kufungua ngazi inayofuata."], ["Loading levels...", "Inapakia ngazi..."], ["Could not load levels.", "Imeshindwa kupakia ngazi."], ["Level details", "Maelezo ya ngazi"], ["Select subject", "Chagua somo"], ["Level progress", "Maendeleo ya ngazi"], ["Points progress", "Maendeleo ya pointi"], ["Points required", "Pointi zinazohitajika"], ["Points acquired", "Pointi zilizopatikana"], ["Time limit", "Muda uliowekwa"], ["Not set", "Haijawekwa"], ["seconds", "sekunde"], ["Level", "Ngazi"], ["Overview", "Muhtasari"], ["Duration", "Muda"], ["Correct", "Sahihi"], ["Wrong", "Si sahihi"], ["Continue", "Endelea"], ["Choose another level", "Chagua ngazi nyingine"], ["Choose another subject", "Chagua somo lingine"], ["Loading questions...", "Inapakia maswali..."], ["No questions are available for this level.", "Hakuna maswali ya ngazi hii."],
  ["Back", "Rudi"], ["Try again", "Jaribu tena"], ["Loading streak...", "Inapakia mfululizo..."], ["CURRENT STREAK", "MFULULIZO WA SASA"], ["days in a row", "siku mfululizo"], ["This week", "Wiki hii"], ["Your longest streaks", "Mifululizo yako mirefu zaidi"], ["Best streak", "Mfululizo bora"], ["Run", "Mfululizo"], ["Complete a learning activity to start your streak!", "Kamilisha zoezi la kujifunza ili kuanza mfululizo wako!"], ["Great start. Come back tomorrow to keep it going!", "Umeanza vizuri. Rudi kesho uendelee!"], ["Amazing streak!", "Mfululizo wa ajabu!"], ["Keep going. You are on fire!", "Endelea hivyo. Una bidii sana!"], ["Sign in to view your streak.", "Ingia ili kuona mfululizo wako."], ["Couldn't load your streak.", "Imeshindwa kupakia mfululizo wako."], ["The streak service isn't available on this server yet.", "Huduma ya mfululizo haipatikani kwenye seva hii bado."], ["Correct", "Sahihi"], ["Wrong", "Si sahihi"],
  ["Monday", "Jumatatu"], ["Tuesday", "Jumanne"], ["Wednesday", "Jumatano"], ["Thursday", "Alhamisi"], ["Friday", "Ijumaa"], ["Saturday", "Jumamosi"], ["Sunday", "Jumapili"], ["Best:", "Bora:"], ["days", "siku"], ["See more streaks", "Ona mifululizo zaidi"], ["Show less", "Onyesha machache"], ["No completed streak runs yet.", "Bado hujakamilisha mifululizo yoyote."],
  ["Finding your rewards...", "Inatafuta zawadi zako..."], ["Oops!", "Pole!"], ["We could not load your gifts.", "Imeshindwa kupakia zawadi zako."], ["No gifts yet!", "Bado huna zawadi!"], ["Keep playing and completing challenges to earn rewards.", "Endelea kucheza na kukamilisha changamoto ili kupata zawadi."], ["Play now", "Cheza sasa"], ["Go back", "Rudi"], ["My Gifts", "Zawadi Zangu"], ["Your Rewards", "Zawadi Zako"], ["New Gifts", "Zawadi Mpya"], ["NEW", "MPYA"], ["Finding more gifts...", "Inatafuta zawadi zaidi..."], ["Close gift", "Funga zawadi"], ["AMAZING!", "AJABU!"], ["Stars", "Nyota"], ["Points", "Pointi"], ["Awarded", "Imetolewa"], ["Awesome!", "Vizuri sana!"], ["pts", "pointi"], ["Tap to try again.", "Gusa ili ujaribu tena."], ["Awarded", "Imetolewa"],
  ["Songs", "Nyimbo"], ["Play a song", "Cheza wimbo"], ["Choose a rhythm for your next adventure.", "Chagua mdundo wa safari yako inayofuata."], ["Rewind 10 seconds", "Rudisha nyuma sekunde 10"], ["Forward 10 seconds", "Songa mbele sekunde 10"], ["Cancel Morning Beat", "Sitisha Mdundo wa Asubuhi"], ["Cancel", "Ghairi"], ["Pause", "Sitisha"], ["Play", "Cheza"],
  ["Leaderboard", "Ubao wa wanaoongoza"], ["Subject", "Somo"], ["Overall", "Jumla"], ["Math", "Hisabati"], ["English", "Kiingereza"], ["Science", "Sayansi"], ["YOUR RANK", "NAFASI YAKO"], ["Your rank", "Nafasi yako"], ["Top", "Vinara"], ["players", "wachezaji"], ["Grade", "Darasa"], ["XP", "XP"],
  ["Choose Your Land", "Chagua Ardhi Yako"], ["YOUR LAND", "ARDHI YAKO"], ["Choose a place to explore", "Chagua sehemu ya kuchunguza"], ["Lands", "Ardhi"], ["Kilimanjaro", "Kilimanjaro"], ["Mwanza", "Mwanza"], ["Select", "Chagua"],
  ["Challenges", "Changamoto"], ["TODAY’S QUEST", "CHANGAMOTO YA LEO"], ["Daily Challenge", "Changamoto ya Kila Siku"], ["A little practice, a big win.", "Mazoezi kidogo, ushindi mkubwa."], ["Your grade", "Darasa lako"], ["Today’s challenge", "Changamoto ya leo"], ["quick questions", "maswali ya haraka"], ["Finding your questions...", "Inatafuta maswali yako..."], ["Choosing a subject and your passed levels.", "Inachagua somo na ngazi ulizofaulu."], ["Challenge unavailable", "Changamoto haipatikani"], ["Challenge complete!", "Changamoto imekamilika!"], ["Claim your rewards to add them to your totals.", "Dai zawadi zako ili ziongezwe kwenye jumla yako."], ["pts earned", "pointi ulizopata"], ["stars earned", "nyota ulizopata"], ["stars", "nyota"], ["Claimed!", "Imedaiwa!"], ["Collecting...", "Inakusanya..."], ["Claim", "Dai"], ["Today’s challenge is already started", "Changamoto ya leo tayari imeanza"], ["You can try today’s challenge only once. Come back tomorrow for a new set of questions.", "Unaweza kujaribu changamoto ya leo mara moja tu. Rudi kesho kupata maswali mapya."], ["Ready for today’s challenge?", "Uko tayari kwa changamoto ya leo?"], ["Starting begins today’s one-time challenge.", "Kuanza kutaanzisha changamoto ya leo ya mara moja."], ["Starting...", "Inaanza..."], ["Start challenge", "Anza changamoto"], ["QUESTION", "SWALI"], ["Weekly Streak Challenge", "Changamoto ya Mfululizo wa Wiki"], ["REWARD EARNED", "ZAWADI IMEPATIKANA"], ["WEEKLY REWARD", "ZAWADI YA WIKI"], ["Rewards coming Monday", "Zawadi zinakuja Jumatatu"], ["Available challenges", "Changamoto zinazopatikana"], ["Live challenges for your grade.", "Changamoto za sasa za darasa lako."], ["No configured reward", "Hakuna zawadi iliyowekwa"], ["No other challenges yet", "Bado hakuna changamoto nyingine"], ["New challenges for your grade will appear here.", "Changamoto mpya za darasa lako zitaonekana hapa."], ["Challenge leaderboard", "Ubao wa wanaoongoza wa changamoto"], ["Top", "Vinara"], ["See how you rank with other learners", "Angalia nafasi yako dhidi ya wanafunzi wengine"], ["Every challenge makes you a little brighter!", "Kila changamoto inakufanya uwe mwerevu zaidi!"], ["Knowledge Challenge", "Changamoto ya Maarifa"], ["Weekly Challenge", "Changamoto ya Wiki"], ["Special Event", "Tukio Maalum"], ["Speed Challenge", "Changamoto ya Kasi"], ["Perfect Challenge", "Changamoto Kamili"],
  ["Your avatar customizer is ready.", "Kibadilisha mwonekano wako kiko tayari."], ["Avatar", "Mhusika"], ["Which animal is this?", "Huyu ni mnyama gani?"], ["Image unavailable", "Picha haipatikani"],
  ["Your account", "Akaunti yako"], ["Select grade", "Chagua darasa"], ["Select date", "Chagua tarehe"], ["Email status", "Hali ya barua pepe"], ["Verified", "Imethibitishwa"], ["Unverified", "Haijathibitishwa"], ["Subscription", "Usajili"], ["Saving...", "Inahifadhi..."], ["Rank", "Nafasi"], ["Mwanza", "Mwanza"], ["Mathematics", "Hisabati"], ["Maths", "Hisabati"], ["Morning Beat", "Mdundo wa Asubuhi"], ["Jungle Jump", "Kuruka Msituni"], ["Mountain Rhythm", "Mdundo wa Mlima"], ["Star Steps", "Hatua za Nyota"], ["Start your day", "Anza siku yako"], ["Play and explore", "Cheza na ugundue"], ["Climb higher", "Panda juu zaidi"], ["Keep your streak", "Dumisha mfululizo wako"], ["Points:", "Pointi:"], ["Duration:", "Muda:"], ["Correct:", "Sahihi:"], ["Wrong:", "Si sahihi:"], ["FAILED", "UMESHINDWA"], ["Ready?", "Uko tayari?"], ["No account ID", "Hakuna kitambulisho cha akaunti"], ["No session", "Hakuna kipindi cha kuingia"], ["Could not save this level progress.", "Imeshindwa kuhifadhi maendeleo ya ngazi hii."], ["Could not prepare level progress.", "Imeshindwa kuandaa maendeleo ya ngazi."], ["Could not load questions for this level.", "Imeshindwa kupakia maswali ya ngazi hii."], ["Select a game", "Chagua mchezo"], ["Are you sure?", "Una uhakika?"], ["Failed · you missed a weekday", "Umeshindwa · umekosa siku ya wiki"], ["Complete · weekly reward earned!", "Imekamilika · umepata zawadi ya wiki!"], ["Play at least once every weekday, Monday to Friday.", "Cheza angalau mara moja kila siku ya wiki, Jumatatu hadi Ijumaa."], ["Not available", "Haipatikani"], ["Not available yet", "Bado haipatikani"], ["Please try again.", "Tafadhali jaribu tena."], ["Please try again", "Tafadhali jaribu tena"], ["The email is invalid.", "Barua pepe si sahihi."], ["User ID", "Kitambulisho cha mtumiaji"], ["Today", "Leo"], ["Tomorrow", "Kesho"], ["Start your adventure", "Anza safari yako"], ["Awesome!", "Vizuri sana!"], ["Your streak", "Mfululizo wako"], ["Next life", "Maisha yanayofuata"], ["lives remaining", "maisha yamesalia"], ["life", "maisha"], ["attempts", "majaribio"], ["attempt", "jaribio"], ["Could not load your profile.", "Imeshindwa kupakia wasifu wako."], ["Could not save your account.", "Imeshindwa kuhifadhi akaunti yako."], ["Tap to try again.", "Gusa ili ujaribu tena."], ["Not available", "Haipatikani"], ["No levels are available for this subject.", "Hakuna ngazi za somo hili."], ["No topics are available for this subject.", "Hakuna mada za somo hili."], ["No grades found.", "Hakuna madarasa yaliyopatikana."], ["No subjects are available for this grade.", "Hakuna masomo ya darasa hili."], ["XP earned", "XP zilizopatikana"], ["Stars earned", "Nyota zilizopatikana"], ["Result", "Matokeo"], ["Your progress", "Maendeleo yako"], ["Select another level", "Chagua ngazi nyingine"], ["Retry", "Jaribu tena"], ["Error", "Hitilafu"], ["Success", "Mafanikio"], ["New gift", "Zawadi mpya"], ["gifts received", "zawadi ulizopokea"], ["seconds", "sekunde"], ["Answer", "Jibu"], ["Correct answer", "Jibu sahihi"], ["Time", "Muda"], ["Play again", "Cheza tena"], ["Next", "Inayofuata"], ["Previous", "Iliyotangulia"], ["Select level", "Chagua ngazi"], ["Available", "Inapatikana"], ["Completed", "Imekamilika"], ["Pending", "Inasubiri"],
  ["Rewards by subject", "Zawadi kwa somo"], ["No subject rewards yet. Pass a level to see its rewards here.", "Bado hakuna zawadi za masomo. Faulu ngazi ili kuona zawadi zake hapa."], ["View subject rewards", "Ona zawadi kwa somo"],
  ["FAILED · you missed a weekday", "UMESHINDWA · umekosa siku ya wiki"], ["Complete · weekly reward earned!", "Imekamilika · umepata zawadi ya wiki!"], ["Kilimanjaro", "Kilimanjaro"], ["Mwanza", "Mwanza"], ["Redirecting…", "Inaelekeza…"], ["Phone number", "Nambari ya simu"], ["Forgot password?", "Umesahau nenosiri?"], ["Password", "Nenosiri"], ["Login", "Ingia"], ["Sign in", "Ingia"], ["Log in", "Ingia"], ["Register", "Jisajili"], ["Cancel", "Ghairi"], ["Not enough lives", "Huna maisha ya kutosha"], ["You have no lives left.", "Huna maisha yaliyosalia."], ["Next life in", "Maisha yanayofuata baada ya"], ["New challenge", "Changamoto mpya"], ["Streak challenge", "Changamoto ya mfululizo"], ["weekly reward earned!", "umepata zawadi ya wiki!"], ["Stars earned", "Nyota ulizopata"], ["Points earned", "Pointi ulizopata"], ["Average", "Wastani"], ["Level progress", "Maendeleo ya ngazi"], ["Not set", "Haijawekwa"], ["Question", "Swali"], ["questions", "maswali"], ["of", "kati ya"], ["pts", "pointi"], ["XP", "XP"],
]);

Object.assign(SWAHILI_UI, {
  "Choose a grade before starting Practice.": "Chagua darasa kabla ya kuanza Mazoezi.",
  "Subject not found for your grade.": "Somo halipatikani katika darasa lako.",
  "Choose a subject or topic available for your grade.": "Chagua somo au mada inayopatikana katika darasa lako.",
  "This Practice session is already complete.": "Kipindi hiki cha Mazoezi tayari kimekamilika.",
  "That question is not part of this Practice session.": "Swali hilo si sehemu ya kipindi hiki cha Mazoezi.",
  "That question is not available for your grade.": "Swali hilo halipatikani katika darasa lako.",
  "Choose an answer from this question.": "Chagua jibu kati ya majibu ya swali hili.",
  "This question was already answered.": "Swali hili tayari limejibiwa.",
  "Answer every question before finishing Practice.": "Jibu maswali yote kabla ya kumaliza Mazoezi.",
  "No questions yet! Try another subject or come back later.": "Bado hakuna maswali! Jaribu somo jingine au urudi baadaye.",
});

export function translateUiText(text: string, language: "EN" | "SW"): string {
  if (language !== "SW") return text;
  const trimmed = text.trim();
  if (SWAHILI_UI[trimmed]) return text.replace(trimmed, SWAHILI_UI[trimmed]);

  let match = trimmed.match(/^You got (\d+) out of (\d+)\. Claim your rewards to add them to your totals\.$/);
  if (match) return `Umepata ${match[1]} kati ya ${match[2]}. Dai zawadi zako ili ziongezwe kwenye jumla yako.`;
  match = trimmed.match(/^Question (\d+) of (\d+)$/i);
  if (match) return `Swali ${match[1]} kati ya ${match[2]}`;
  match = trimmed.match(/^(\d+) questions to improve$/i);
  if (match) return `Maswali ${match[1]} ya kuboresha`;
  match = trimmed.match(/^(\d+) questions$/i);
  if (match) return `Maswali ${match[1]}`;
  match = trimmed.match(/^(\d+)% accuracy$/i);
  if (match) return `Usahihi ${match[1]}%`;
  match = trimmed.match(/^(\d+)% Accuracy$/);
  if (match) return `Usahihi ${match[1]}%`;
  match = trimmed.match(/^\+(\d+) Stars$/);
  if (match) return `+${match[1]} Nyota`;
  match = trimmed.match(/^All (.+)$/);
  if (match) return `${translateUiText(match[1], language)} Yote`;
  match = trimmed.match(/^No topics are ready yet\. Try all (.+)\.$/);
  if (match) return `Bado hakuna mada. Jaribu somo lote la ${translateUiText(match[1], language)}.`;
  if (trimmed === "No questions are ready for practice yet." || trimmed === "No new questions are ready for mistake practice yet.") return "Bado hakuna maswali! Jaribu mada nyingine au urudi baadaye.";
  match = trimmed.match(/^Top learners · (.+)$/);
  if (match) return `Wanafunzi vinara · ${translateUiText(match[1], language)}`;
  match = trimmed.match(/^QUESTION (\d+) OF (\d+)$/);
  if (match) return `SWALI ${match[1]} KATI YA ${match[2]}`;
  match = trimmed.match(/^\+(\d+) pts earned$/);
  if (match) return `+${match[1]} pointi ulizopata`;
  match = trimmed.match(/^\+(\d+) stars earned$/);
  if (match) return `+${match[1]} nyota ulizopata`;
  match = trimmed.match(/^Awarded (.+)$/);
  if (match) return `Imetolewa ${match[1]}`;
  match = trimmed.match(/^Run (\d+)$/);
  if (match) return `Mfululizo ${match[1]}`;
  match = trimmed.match(/^Level (\d+)$/);
  if (match) return `Ngazi ${match[1]}`;
  match = trimmed.match(/^Select (.+)$/);
  if (match) return `Chagua ${match[1]}`;
  match = trimmed.match(/^\+(\d+) Points$/);
  if (match) return `+${match[1]} Pointi`;
  match = trimmed.match(/^⭐ (\d+) Stars$/);
  if (match) return `⭐ ${match[1]} Nyota`;
  match = trimmed.match(/^Starts Monday · (.+)$/);
  if (match) return `Inaanza Jumatatu · ${translateCountdown(match[1])}`;
  match = trimmed.match(/^You’ll get (\d+) questions from (.+)\. Starting begins today’s one-time challenge\.$/);
  if (match) return `Utapata maswali ${match[1]} kutoka ${match[2]}. Kuanza kutaanzisha changamoto ya leo ya mara moja.`;
  match = trimmed.match(/^(.+) · (\d+) gifts received$/);
  if (match) return `${match[1]} · zawadi ${match[2]} ulizopokea`;
  match = trimmed.match(/^🎁 (\d+) New Gifts$/);
  if (match) return `🎁 Zawadi mpya ${match[1]}`;
  match = trimmed.match(/^Top (.+) · (.+) players$/);
  if (match) return `Vinara wa ${match[1]} · wachezaji ${match[2]}`;
  match = trimmed.match(/^\+1 in (.+)$/);
  if (match) return `+1 baada ya ${match[1]}`;
  match = trimmed.match(/^(\d+) quick questions$/);
  if (match) return `maswali ${match[1]} ya haraka`;
  match = trimmed.match(/^Required XP reached\. This level’s rewards will be included in your totals\.$/);
  if (match) return "XP inayohitajika imepatikana. Zawadi za ngazi hii zitaongezwa kwenye jumla yako.";
  match = trimmed.match(/^Required XP reached\. This level's rewards will be included in your totals\.$/);
  if (match) return "XP inayohitajika imepatikana. Zawadi za ngazi hii zitaongezwa kwenye jumla yako.";
  match = trimmed.match(/^If this attempt ends below the target, rewards from both attempts will be discarded\.$/);
  if (match) return "Jaribio hili likiisha bila kufikia lengo, zawadi za majaribio yote mawili zitaondolewa.";
  match = trimmed.match(/^Attempt (\d+) of (\d+)\. XP and stars stay pending until you reach the target\.$/);
  if (match) return `Jaribio la ${match[1]} kati ya ${match[2]}. XP na nyota zitasubiri hadi ufikie lengo.`;
  match = trimmed.match(/^Level (\d+), (.+)$/);
  if (match) return `Ngazi ${match[1]}, ${match[2]}`;
  match = trimmed.match(/^Grade (\d+)$/);
  if (match) return `Darasa la ${match[1]}`;
  match = trimmed.match(/^Top (.+)$/);
  if (match) return `Vinara ${match[1]}`;
  match = trimmed.match(/^Your rank: (.+)$/);
  if (match) return `Nafasi yako: ${match[1]}`;
  match = trimmed.match(/^Subject (.+), level (\d+)$/);
  if (match) return `Somo ${translateUiText(match[1], language)}, ngazi ${match[2]}`;
  match = trimmed.match(/^Points progress (\d+) of (\d+)$/);
  if (match) return `Maendeleo ya pointi ${match[1]} kati ya ${match[2]}`;
  match = trimmed.match(/^Select (.+)$/);
  if (match) return `Chagua ${translateUiText(match[1], language)}`;
  match = trimmed.match(/^(\d+) lives remaining$/);
  if (match) return `Maisha ${match[1]} yamesalia`;
  if (trimmed === "Correct") return "Jibu sahihi";
  if (trimmed === "Wrong") return "Jibu lisilo sahihi";
  if (trimmed === "Starting today’s one-time challenge.") return "Anzisha changamoto ya leo ya mara moja.";
  match = trimmed.match(/^\+?(\d+) pts$/);
  if (match) return `${match[1]} pointi`;
  match = trimmed.match(/^\+?(\d+) stars$/i);
  if (match) return `${match[1]} nyota`;
  return text;
}

function translateCountdown(value: string): string {
  return value
    .replace(/\b(d)\b/g, "siku")
    .replace(/\b(h)\b/g, "saa")
    .replace(/\b(m)\b/g, "dakika")
    .replace(/\b(s)\b/g, "sekunde");
}

export function translateUiAttribute(text: string, language: "EN" | "SW"): string {
  if (language !== "SW") return text;
  const translated = translateUiText(text, language);
  return translated === text ? text : translated;
}
