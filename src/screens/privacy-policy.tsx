import { useAudioPlayer } from "expo-audio";
import { useRouter, type Href } from "expo-router";
import { useCallback } from "react";
import {
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AppText from "../components/app-text";
import KidoAnimatedLogo from "../components/kido-animated-logo";
import { useAudioPreferences } from "../lib/audio-preferences";
import { useKidoLanguage } from "../lib/language-context";
import { useDarkTheme } from "../lib/use-dark-theme";

const popSound = require("../assets/sound.effects/pop.mp3");

interface PolicySubsection {
  letter?: string;
  headingEn?: string;
  headingSw?: string;
  paragraphsEn?: string[];
  paragraphsSw?: string[];
  bulletsEn?: string[];
  bulletsSw?: string[];
}

interface PolicySection {
  number: string;
  titleEn: string;
  titleSw: string;
  paragraphsEn?: string[];
  paragraphsSw?: string[];
  bulletsEn?: string[];
  bulletsSw?: string[];
  subsections?: PolicySubsection[];
  highlight?: boolean;
}

const POLICY_SECTIONS: PolicySection[] = [
  {
    number: "1",
    titleEn: "Introduction",
    titleSw: "Utangulizi",
    paragraphsEn: [
      "Welcome to Kido (“Kido,” “we,” “our,” or “us”). Kido is an educational application designed to help children learn through interactive educational content and activities.",
      "This Privacy Policy explains how we collect, use, store, share, and protect information when you use the Kido mobile application and related services.",
      "Kido is operated by SAYARI SOFTWARE, located in TANZANIA. For privacy-related questions, contact us at info@sayarisoftware.com.",
      "We are committed to protecting children's privacy and handling personal information responsibly. Parents and legal guardians should review this policy before allowing a child to use Kido.",
    ],
    paragraphsSw: [
      "Karibu Kido (“Kido,” “sisi,” au “yetu”). Kido ni programu ya kielimu iliyoundwa kuwasaidia watoto kujifunza kupitia maudhui na shughuli shirikishi za kielimu.",
      "Sera hii ya Faragha inaeleza jinsi tunavyokusanya, kutumia, kuhifadhi, kushiriki, na kulinda taarifa unapotumia programu ya simu ya Kido na huduma zinazohusiana nayo.",
      "Kido inaendeshwa na SAYARI SOFTWARE, iliyoko TANZANIA. Kwa maswali yanayohusu faragha, wasiliana nasi kupitia info@sayarisoftware.com.",
      "Tumejitolea kulinda faragha ya watoto na kushughulikia taarifa za kibinafsi kwa uwajibikaji. Wazazi na walezi kisheria wanapaswa kupitia sera hii kabla ya kumruhusu mtoto kutumia Kido.",
    ],
  },
  {
    number: "2",
    titleEn: "Information We Collect",
    titleSw: "Taarifa Tunazokusanya",
    paragraphsEn: [
      "The information we collect depends on how you use Kido and which features you access.",
    ],
    paragraphsSw: [
      "Taarifa tunazokusanya hutegemea jinsi unavyotumia Kido na vipengele unavyofikia.",
    ],
    subsections: [
      {
        letter: "A",
        headingEn: "Account information",
        headingSw: "Taarifa za akaunti",
        paragraphsEn: ["When an account is created, we may collect information such as:"],
        paragraphsSw: ["Akaunti inapoundwa, tunaweza kukusanya taarifa kama vile:"],
        bulletsEn: [
          "Name or username.",
          "Email address or other login identifier.",
          "Authentication information necessary to create and secure an account.",
          "Age range or date of birth, if requested.",
          "Parent or guardian contact and consent information, where applicable.",
          "School information, if required.",
        ],
        bulletsSw: [
          "Jina au jina la mtumiaji (username).",
          "Barua pepe au kitambulisho kingine cha kuingia.",
          "Taarifa za uthibitishaji zinazohitajika kuunda na kulinda akaunti.",
          "Kiwango cha umri au tarehe ya kuzaliwa, ikiwa itaombwa.",
          "Mawasiliano ya mzazi au mlezi na taarifa za idhini, pale inapohitajika.",
          "Taarifa za shule, ikiwa zitahitajika.",
        ],
      },
      {
        letter: "B",
        headingEn: "Learning activity and progress",
        headingSw: "Shughuli za kujifunza na maendeleo",
        paragraphsEn: [
          "To provide educational features, Kido may process information such as:",
        ],
        paragraphsSw: [
          "Ili kutoa vipengele vya kielimu, Kido inaweza kuchakata taarifa kama vile:",
        ],
        bulletsEn: [
          "Questions answered and learning activities completed.",
          "Scores, achievements, and learning progress.",
          "Preferences and application settings.",
          "Information needed to maintain a user's learning history.",
        ],
        bulletsSw: [
          "Maswali yaliyojibiwa na shughuli za kujifunza zilizokamilika.",
          "Alama, mafanikio, na maendeleo ya masomo.",
          "Mapendeleo na mipangilio ya programu.",
          "Taarifa zinazohitajika kudumisha kumbukumbu ya masomo ya mtumiaji.",
        ],
      },
      {
        letter: "C",
        headingEn: "Subscription and transaction information",
        headingSw: "Taarifa za usajili na miamala",
        paragraphsEn: [
          "Kido offers or may offer free and premium features through subscription plans.",
          "If you purchase a subscription, we may process information needed to identify your subscription, confirm payment status, provide premium access, and manage subscription-related support requests.",
          "Payments may be processed by third-party payment providers, including Selcom where applicable. Those providers handle payment information according to their own privacy policies and applicable requirements.",
        ],
        paragraphsSw: [
          "Kido inatoa au inaweza kutoa vipengele vya bure na vya kulipia kupitia vifurushi vya usajili.",
          "Ukinunua usajili, tunaweza kuchakata taarifa zinazohitajika kutambua usajili wako, kuthibitisha hali ya malipo, kutoa ufikiaji wa vipengele vya kulipia, na kusimamia maombi ya usaidizi yanayohusu usajili.",
          "Malipo yanaweza kuchakatwa na watoa huduma za malipo wa nje, ikiwa ni pamoja na Selcom pale inapohusika. Watoa huduma hao hushughulikia taarifa za malipo kulingana na sera zao za faragha na matakwa husika ya kisheria.",
        ],
      },
      {
        letter: "D",
        headingEn: "Technical and diagnostic information",
        headingSw: "Taarifa za kiufundi na uchunguzi wa hitilafu",
        paragraphsEn: [
          "When you use Kido, our services may process technical information needed to operate and secure the application, such as:",
        ],
        paragraphsSw: [
          "Unapotumia Kido, huduma zetu zinaweza kuchakata taarifa za kiufundi zinazohitajika kuendesha na kulinda programu, kama vile:",
        ],
        bulletsEn: [
          "Application version and device operating system.",
          "Server requests and error logs.",
          "Basic diagnostic and performance information.",
          "Security events and information needed to prevent abuse.",
        ],
        bulletsSw: [
          "Toleo la programu na mfumo wa uendeshaji wa kifaa.",
          "Maombi ya seva na kumbukumbu za hitilafu (error logs).",
          "Taarifa za msingi za utambuzi na utendaji kazi.",
          "Matukio ya usalama na taarifa zinazohitajika kuzuia matumizi mabaya.",
        ],
      },
      {
        letter: "E",
        headingEn: "Information we do not intentionally collect",
        headingSw: "Taarifa ambazo hatukusanyi kwa makusudi",
        paragraphsEn: [
          "Kido is not intended to collect a child's precise location, contacts, photographs, microphone recordings, or other sensitive information unless a specific feature requires it and the appropriate legal and platform requirements have been met.",
        ],
        paragraphsSw: [
          "Kido haijakusudiwa kukusanya eneo kamili la mtoto (precise location), orodha ya mawasiliano (contacts), picha za kibinafsi, rekodi za maikrofoni, au taarifa nyingine nyeti isipokuwa kipengele maalum kikiitaji na matakwa husika ya kisheria na mifumo yakitimizwa.",
        ],
      },
    ],
  },
  {
    number: "3",
    titleEn: "How We Use Information",
    titleSw: "Jinsi Tunavyotumia Taarifa",
    paragraphsEn: ["We may use information we collect to:"],
    paragraphsSw: ["Tunaweza kutumia taarifa tunazokusanya ili:"],
    bulletsEn: [
      "Create and manage user accounts.",
      "Provide educational content and learning activities.",
      "Save learning progress and user preferences.",
      "Manage subscriptions and premium access.",
      "Respond to support requests.",
      "Maintain the security and reliability of Kido.",
      "Diagnose errors and improve application performance.",
      "Meet applicable legal obligations and enforce our policies.",
    ],
    bulletsSw: [
      "Kuunda na kusimamia akaunti za watumiaji.",
      "Kutoa maudhui ya kielimu na shughuli za kujifunza.",
      "Kuhifadhi maendeleo ya masomo na mapendeleo ya mtumiaji.",
      "Kusimamia vifurushi vya usajili na ufikiaji wa vipengele vya kulipia.",
      "Kujibu maombi ya usaidizi na huduma kwa wateja.",
      "Kudumisha usalama na uaminifu wa Kido.",
      "Kuchunguza hitilafu na kuboresha utendaji wa programu.",
      "Kutimiza wajibu wa kisheria na kutekeleza sera zetu.",
    ],
    subsections: [
      {
        paragraphsEn: [
          "We do not use children's personal information for purposes that are incompatible with applicable children's privacy laws or Google Play's Families policies.",
        ],
        paragraphsSw: [
          "Hatutumii taarifa za kibinafsi za watoto kwa madhumuni yasiyoendana na sheria husika za faragha za watoto au sera za Familia za Google Play.",
        ],
      },
    ],
  },
  {
    number: "4",
    titleEn: "Children's Privacy and Parental Involvement",
    titleSw: "Faragha ya Watoto na Ushiriki wa Wazazi",
    highlight: true,
    paragraphsEn: [
      "Kido is an educational application intended for children and families.",
      "We recognize that children's personal information requires additional protection. Where required by applicable law, we will obtain verifiable parental or guardian consent before collecting, using, or disclosing a child's personal information.",
      "Parents and legal guardians may contact us to ask what information we hold about a child, request corrections, withdraw consent where applicable, or request deletion of the child's account and associated information.",
      "We will handle such requests in accordance with applicable laws and our identity-verification procedures.",
      "We do not knowingly collect more personal information from children than is reasonably necessary for the relevant educational and application functions.",
    ],
    paragraphsSw: [
      "Kido ni programu ya kielimu iliyokusudiwa watoto na familia.",
      "Tunatambua kuwa taarifa za kibinafsi za watoto zinahitaji ulinzi wa ziada. Pale panapohitajika kisheria, tutapata idhini inayothibitishwa ya mzazi au mlezi kabla ya kukusanya, kutumia, au kufichua taarifa za kibinafsi za mtoto.",
      "Wazazi na walezi kisheria wanaweza kuwasiliana nasi kuuliza taarifa tulizo nazo kumhusu mtoto, kuomba marekebisho, kuondoa idhini pale inapohusika, au kuomba kufutwa kwa akaunti ya mtoto na taarifa zote zinazohusiana nayo.",
      "Tutashughulikia maombi hayo kwa mujibu wa sheria husika na taratibu zetu za uthibitishaji wa utambulisho.",
      "Hatukusanyi kwa makusudi taarifa nyingi zaidi za kibinafsi kutoka kwa watoto kuliko inavyohitajika kwa ajili ya utendaji husika wa kielimu.",
    ],
  },
  {
    number: "5",
    titleEn: "Legal Basis and Consent",
    titleSw: "Msingi wa Kisheria na Idhini",
    paragraphsEn: [
      "Where applicable privacy laws require a legal basis for processing personal information, we rely on the basis appropriate to the activity, which may include:",
    ],
    paragraphsSw: [
      "Pale ambapo sheria za faragha zinahitaji msingi wa kisheria kwa ajili ya kuchakata taarifa za kibinafsi, tunategemea msingi unaofaa kwa shughuli husika, ikiwa ni pamoja na:",
    ],
    bulletsEn: [
      "Providing the services requested by the user.",
      "Consent from the user or a parent or guardian where legally required.",
      "Compliance with legal obligations.",
      "Legitimate interests such as service security, where permitted by law and consistent with children's rights.",
    ],
    bulletsSw: [
      "Kutoa huduma zilizoombwa na mtumiaji.",
      "Idhini kutoka kwa mtumiaji au mzazi/mlezi pale inapohitajika kisheria.",
      "Utekelezaji wa wajibu wa kisheria.",
      "Maslahi halali kama vile usalama wa huduma, pale inaporuhusiwa kisheria na kwa kuzingatia haki za watoto.",
    ],
    subsections: [
      {
        paragraphsEn: [
          "Where processing relies on consent, consent may be withdrawn as permitted by applicable law. Withdrawing consent may affect features that require the relevant information.",
        ],
        paragraphsSw: [
          "Pale ambapo uchakataji unategemea idhini, idhini hiyo inaweza kuondolewa kama inavyoruhusiwa kisheria. Kuondoa idhini kunaweza kuathiri vipengele vinavyohitaji taarifa hizo.",
        ],
      },
    ],
  },
  {
    number: "6",
    titleEn: "How We Share Information",
    titleSw: "Jinsi Tunavyoshiriki Taarifa",
    paragraphsEn: [
      "We do not sell children's personal information.",
      "We may share limited information with the following categories of recipients when necessary:",
    ],
    paragraphsSw: [
      "Hatuuzi taarifa za kibinafsi za watoto.",
      "Tunaweza kushiriki taarifa chache na makundi yafuatayo pale inapobidi tu:",
    ],
    subsections: [
      {
        letter: "A",
        headingEn: "Hosting and infrastructure providers",
        headingSw: "Watoa huduma za seva na miundombinu",
        paragraphsEn: [
          "Kido uses backend infrastructure and a database to support application features. These services may process information on our behalf to host the application, store information, and maintain service availability.",
        ],
        paragraphsSw: [
          "Kido hutumia miundombinu ya seva na kanzidata kusaidia vipengele vya programu. Huduma hizi zinaweza kuchakata taarifa kwa niaba yetu ili kuendesha programu, kuhifadhi taarifa, na kudumisha upatikanaji wa huduma.",
        ],
      },
      {
        letter: "B",
        headingEn: "Payment providers",
        headingSw: "Watoa huduma za malipo",
        paragraphsEn: [
          "Where a payment provider is used, relevant transaction information may be shared with that provider to process payments, verify transactions, manage subscriptions, or prevent payment fraud.",
        ],
        paragraphsSw: [
          "Pale ambapo mtoa huduma ya malipo anapotumika, taarifa husika za muamala zinaweza kushirikiwa naye ili kuchakata malipo, kuthibitisha miamala, kusimamia vifurushi, au kuzuia udanganyifu wa malipo.",
        ],
      },
      {
        letter: "C",
        headingEn: "Security and technical service providers",
        headingSw: "Watoa huduma za kiufundi na usalama",
        paragraphsEn: [
          "We may use service providers for application monitoring, troubleshooting, security, or customer support if those services are implemented in Kido.",
        ],
        paragraphsSw: [
          "Tunaweza kutumia watoa huduma kwa ajili ya ufuatiliaji wa programu, utatuzi wa hitilafu, usalama, au huduma kwa wateja ikiwa huduma hizo zitatekelezwa katika Kido.",
        ],
      },
      {
        letter: "D",
        headingEn: "Legal requirements",
        headingSw: "Mahitaji ya kisheria",
        paragraphsEn: [
          "We may disclose information when required by law, a valid legal process, or a lawful request from an authorized public authority.",
        ],
        paragraphsSw: [
          "Tunaweza kufichua taarifa pale inapohitajika kisheria, mchakato halali wa kisheria, au ombi halali kutoka kwa mamlaka ya umma iliyoidhinishwa.",
        ],
      },
      {
        letter: "E",
        headingEn: "Business transfers",
        headingSw: "Uhawilishaji wa biashara",
        paragraphsEn: [
          "If Kido is involved in a merger, acquisition, or transfer of its services, information may be transferred where legally permitted and subject to appropriate safeguards.",
        ],
        paragraphsSw: [
          "Ikiwa Kido itahusika katika muungano, ununuzi, au uhamisho wa huduma zake, taarifa zinaweza kuhamishwa pale inaporuhusiwa kisheria na kwa ulinzi unaofaa.",
        ],
      },
      {
        paragraphsEn: [
          "We do not authorize service providers to use children's personal information for unrelated purposes. We will review third-party services used by Kido for compatibility with applicable children's privacy requirements.",
        ],
        paragraphsSw: [
          "Hatuwaruhusu watoa huduma kutumia taarifa za kibinafsi za watoto kwa madhumuni yasiyohusika. Tutapitia huduma zote za nje zinazotumiwa na Kido kuhakikisha zinaendana na matakwa ya faragha ya watoto.",
        ],
      },
    ],
  },
  {
    number: "7",
    titleEn: "Advertising and Analytics",
    titleSw: "Matangazo na Takwimu",
    highlight: true,
    paragraphsEn: [
      "• Current advertising status: Kido does not display advertisements.",
      "• Current analytics status: Kido does not use third-party analytics.",
    ],
    paragraphsSw: [
      "• Hali ya sasa ya matangazo: Kido haionyeshi matangazo yoyote ya biashara.",
      "• Hali ya sasa ya takwimu: Kido haitumii zana za nje za takwimu (third-party analytics).",
    ],
  },
  {
    number: "8",
    titleEn: "Data Storage and Security",
    titleSw: "Uhifadhi na Usalama wa Data",
    paragraphsEn: [
      "Kido uses technical and organizational measures intended to protect information against unauthorized access, alteration, disclosure, loss, or destruction.",
      "These measures may include access controls, authentication safeguards, secure network connections, and restricted access to production systems.",
      "Information is retained only for as long as reasonably necessary for the purposes described in this policy, unless a longer period is required or permitted by law.",
      "No method of electronic storage or transmission is completely secure. We therefore cannot guarantee absolute security.",
    ],
    paragraphsSw: [
      "Kido hutumia hatua za kiufundi na kiutawala zilizokusudiwa kulinda taarifa dhidi ya ufikiaji usioidhinishwa, mabadiliko, ufichuzi, upotevu, au uharibifu.",
      "Hatua hizi ni pamoja na udhibiti wa ufikiaji, ulinzi wa uthibitishaji, miunganisho salama ya mtandao, na kizuizi cha ufikiaji wa mifumo ya kazi.",
      "Taarifa huhifadhiwa tu kwa muda unaofaa kwa madhumuni yaliyoelezwa katika sera hii, isipokuwa muda mrefu zaidi ukihitajika au kuruhusiwa kisheria.",
      "Hakuna njia ya uhifadhi wa kielektroniki au uwasilishaji mtandaoni iliyo salama kwa asilimia mia moja. Hivyo hatuwezi kuhakikisha usalama kamili usio na dosari.",
    ],
  },
  {
    number: "9",
    titleEn: "Data Retention and Deletion",
    titleSw: "Utunzaji na Ufutaji wa Data",
    paragraphsEn: [
      "We retain personal information only for as long as needed to provide Kido, maintain necessary records, resolve disputes, protect the service, or comply with legal obligations.",
      "When a user or their authorized parent or guardian requests account deletion, we will delete the associated personal information that we are required to delete, subject to applicable legal obligations and permitted exceptions.",
      "Certain records may need to be retained for a limited period for legal compliance, transaction records, security, or fraud prevention. Where information must be retained, we will limit its use and retention as required by applicable law.",
      "Deleting the application from a device does not necessarily delete the associated account or server-side information.",
    ],
    paragraphsSw: [
      "Tunatunza taarifa za kibinafsi kwa muda unaohitajika tu kutoa Kido, kudumisha kumbukumbu muhimu, kusuluhisha migogoro, kulinda huduma, au kutimiza wajibu wa kisheria.",
      "Mtumiaji au mzazi/mlezi wake aliyeidhinishwa akiomba kufuta akaunti, tutafuta taarifa zote za kibinafsi zinazohusika ambazo tunatakiwa kuzifuta kisheria, kwa kuzingatia wajibu na msamaha wa kisheria.",
      "Kumbukumbu fulani zinaweza kuhitaji kutunzwa kwa muda mfupi kwa ajili ya kufuata sheria, kumbukumbu za miamala, usalama, au kuzuia udanganyifu.",
      "Kufuta programu kwenye simu au kifaa hakufuti moja kwa moja akaunti au taarifa zilizopo kwenye seva.",
    ],
  },
  {
    number: "10",
    titleEn: "How to Request Account or Data Deletion",
    titleSw: "Jinsi ya Kuomba Kufuta Akaunti au Data",
    highlight: true,
    paragraphsEn: [
      "Users and parents or legal guardians may request deletion of a Kido account and associated personal information by contacting our support team.",
      "Alternatively, contact us at info@sayarisoftware.com with the subject line “Kido Account and Data Deletion Request.”",
      "Please include enough information for us to identify the relevant account. Do not send passwords or payment-card details. We may request reasonable information to verify that the request is authorized, especially when it concerns a child's account.",
      "We will explain any necessary next steps and process valid requests within the period required by applicable law.",
      "If a subscription is active, the user may need to cancel it separately with the relevant payment provider to prevent future charges. Deleting a Kido account does not automatically cancel a subscription unless the applicable subscription service confirms that it does.",
    ],
    paragraphsSw: [
      "Watumiaji na wazazi au walezi kisheria wanaweza kuomba kufutwa kwa akaunti ya Kido na taarifa zote zinazohusiana kwa kuwasiliana na timu yetu ya usaidizi.",
      "Vile vile, unaweza kuwasiliana nasi kupitia info@sayarisoftware.com ukiweka mada: “Kido Account and Data Deletion Request.”",
      "Tafadhali jumuisha taarifa za kutosha kutuwezesha kutambua akaunti husika. Usitume nenosiri wala taarifa za kadi ya benki. Tunaweza kuomba uthibitisho wa kuridhisha kuhakikisha ombi limeidhinishwa, hasa linapohusu akaunti ya mtoto.",
      "Tutaeleza hatua zinazofuata na kushughulikia maombi halali ndani ya muda unaotakiwa kisheria.",
      "Ikiwa una usajili unaoendelea, mtumiaji anaweza kuhitaji kuusitisha kando kupitia mtoa huduma wa malipo husika ili kuzuia makato ya baadaye. Kufuta akaunti ya Kido hakusitishi moja kwa moja usajili.",
    ],
  },
  {
    number: "11",
    titleEn: "International Data Transfers",
    titleSw: "Uhawilishaji wa Data Kimataifa",
    paragraphsEn: [
      "Depending on the infrastructure and service providers used, information may be processed in countries other than the country where the user lives.",
      "Where international transfers occur, we will use the safeguards required by applicable privacy laws.",
    ],
    paragraphsSw: [
      "Kulingana na miundombinu na watoa huduma wanaotumika, taarifa zinaweza kuchakatwa katika nchi nyingine mbali na nchi anapoishi mtumiaji.",
      "Pale uhawilishaji wa kimataifa unapofanyika, tutatumia hatua za ulinzi zinazotakiwa na sheria husika za faragha.",
    ],
  },
  {
    number: "12",
    titleEn: "Third-Party Services and Links",
    titleSw: "Huduma za Nje na Viungo",
    paragraphsEn: [
      "Kido may rely on third-party services to provide hosting, payments, security, or other functionality. Those services may have their own privacy policies.",
      "Where applicable, users should review the privacy policies of those providers to understand how their information is handled.",
      "We are responsible for describing Kido's own data practices accurately and for selecting and configuring third-party services in a manner consistent with applicable requirements.",
    ],
    paragraphsSw: [
      "Kido inaweza kutegemea huduma za watoa huduma wa nje kwa ajili ya seva, malipo, usalama, au utendaji mwingine. Huduma hizo zinaweza kuwa na sera zao za faragha.",
      "Pale inapohusika, watumiaji wanashauriwa kupitia sera za faragha za watoa huduma hao kuelewa jinsi taarifa zao zinavyoshughulikiwa.",
      "Tuna wajibu wa kueleza taratibu za data za Kido kwa usahihi na kuchagua na kusanidi huduma za nje kwa namna inayolingana na matakwa husika.",
    ],
  },
  {
    number: "13",
    titleEn: "Your Privacy Rights",
    titleSw: "Haki Zako za Faragha",
    paragraphsEn: [
      "Depending on your location and applicable law, you or your authorized parent or guardian may have the right to:",
    ],
    paragraphsSw: [
      "Kulingana na eneo lako na sheria husika, wewe au mzazi/mlezi wako aliyeidhinishwa mnaweza kuwa na haki ya:",
    ],
    bulletsEn: [
      "Request access to personal information.",
      "Request correction of inaccurate information.",
      "Request deletion of personal information.",
      "Withdraw consent where processing relies on consent.",
      "Object to or restrict certain processing.",
      "Lodge a complaint with the relevant data protection authority.",
    ],
    bulletsSw: [
      "Kuomba kufikia taarifa za kibinafsi.",
      "Kuomba kusahihishwa kwa taarifa zisizo sahihi.",
      "Kuomba kufutwa kwa taarifa za kibinafsi.",
      "Kuondoa idhini pale ambapo uchakataji ulitegemea idhini.",
      "Kupinga au kuzuia uchakataji fulani wa taarifa.",
      "Kuwasilisha malalamiko kwa mamlaka husika ya ulinzi wa data.",
    ],
    subsections: [
      {
        paragraphsEn: [
          "To exercise these rights, contact info@sayarisoftware.com. We will review and respond to requests in accordance with applicable law.",
        ],
        paragraphsSw: [
          "Kutumia haki hizi, wasiliana na info@sayarisoftware.com. Tutapitia na kujibu maombi kulingana na sheria husika.",
        ],
      },
    ],
  },
  {
    number: "14",
    titleEn: "Changes to This Privacy Policy",
    titleSw: "Mabadiliko ya Sera Hii ya Faragha",
    paragraphsEn: [
      "We may update this Privacy Policy when Kido's features, data practices, service providers, or legal obligations change.",
      "We will update the “Last updated” date when changes are made. Where required, we will notify users or parents and guardians and obtain renewed consent before implementing changes that require it.",
      "We encourage parents and guardians to review this policy periodically.",
    ],
    paragraphsSw: [
      "Tunaweza kusasisha Sera hii ya Faragha pale ambapo vipengele vya Kido, taratibu za data, watoa huduma, au wajibu wa kisheria unapobadilika.",
      "Tutasasisha tarehe ya “Ilisasishwa mwisho” pale mabadiliko yatakapofanyika. Pale inapohitajika, tutawajulisha watumiaji au wazazi na walezi na kupata idhini mpya kabla ya kutekeleza mabadiliko yanayohitaji idhini.",
      "Tunawahimiza wazazi na walezi kupitia sera hii mara kwa mara.",
    ],
  },
  {
    number: "15",
    titleEn: "Contact Us",
    titleSw: "Wasiliana Nasi",
    highlight: true,
    paragraphsEn: [
      "For questions, concerns, or requests relating to this Privacy Policy or Kido's handling of personal information, contact:",
    ],
    paragraphsSw: [
      "Kwa maswali, maoni, au maombi yanayohusiana na Sera hii ya Faragha au utunzaji wa taarifa za kibinafsi katika Kido, wasiliana nasi:",
    ],
    bulletsEn: [
      "App Name: Kido",
      "Developer or Legal Entity: SayariSoftware",
      "Privacy Contact Email: info@sayarisoftware.com",
      "Country: Tanzania",
      "Website: sayarisoftware.com",
    ],
    bulletsSw: [
      "Jina la Programu: Kido",
      "Msanidi au Chombo cha Kisheria: SayariSoftware",
      "Barua Pepe ya Faragha: info@sayarisoftware.com",
      "Nchi: Tanzania",
      "Tovuti: sayarisoftware.com",
    ],
  },
];

export default function PrivacyPolicyScreen() {
  const router = useRouter();
  const darkTheme = useDarkTheme();
  const { width } = useWindowDimensions();
  const isLargeScreen = width >= 860;
  const { language, setLanguage } = useKidoLanguage();
  const isSw = language === "SW";
  const { soundEnabled, preferencesLoaded } = useAudioPreferences();
  const popPlayer = useAudioPlayer(popSound);

  const playPop = useCallback(() => {
    if (!preferencesLoaded || !soundEnabled) return;
    try {
      popPlayer.seekTo(0);
      popPlayer.play();
    } catch {
      // Audio playback non-blocking fallback
    }
  }, [popPlayer, preferencesLoaded, soundEnabled]);

  const handleBack = () => {
    playPop();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.push("/home");
    }
  };

  const handleEmail = () => {
    playPop();
    void Linking.openURL("mailto:info@sayarisoftware.com?subject=Kido%20Privacy%20Inquiry");
  };

  const handleDeletionEmail = () => {
    playPop();
    void Linking.openURL("mailto:info@sayarisoftware.com?subject=Kido%20Account%20and%20Data%20Deletion%20Request");
  };

  const handleDeletionInstructions = () => {
    playPop();
    router.push("/account-deletion" as Href);
  };

  const handleWebsite = () => {
    playPop();
    void Linking.openURL("https://sayarisoftware.com");
  };

  return (
    <SafeAreaView style={[styles.safeArea, darkTheme && styles.darkSafeArea]}>
      {/* Top Header with Back, Logo, and Language Switcher */}
      <View style={[styles.header, isLargeScreen && styles.headerWide, darkTheme && styles.darkCard]}>
        <Pressable
          style={[styles.backButton, darkTheme && styles.darkControl]}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel={isSw ? "Rudi nyuma" : "Go back"}
        >
          <AppText translate={false} style={[styles.backButtonText, darkTheme && styles.darkText]}>
            {isSw ? "← Rudi" : "← Back"}
          </AppText>
        </Pressable>

        <View style={styles.headerLogoWrap}>
          <KidoAnimatedLogo capHeight={32} delay={150} onPress={playPop} />
        </View>

        {/* Language Switcher Pill */}
        <Pressable
          style={styles.langPill}
          accessibilityRole="button"
          accessibilityLabel="Switch Language"
          onPress={() => {
            playPop();
            setLanguage(isSw ? "EN" : "SW");
          }}
        >
          <AppText translate={false} style={[styles.langText, !isSw && styles.langActive]}>
            🇬🇧 EN
          </AppText>
          <View style={styles.langDivider} />
          <AppText translate={false} style={[styles.langText, isSw && styles.langActive]}>
            🇹🇿 SW
          </AppText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.container, isLargeScreen && styles.containerWide]}>
          {/* Main Hero Card */}
          <View style={[styles.heroCard, darkTheme && styles.darkCard]}>
            <View style={styles.shieldBadge}>
              <AppText translate={false} style={styles.shieldEmoji}>
                🛡️
              </AppText>
            </View>

            <AppText translate={false} style={[styles.heroTitle, darkTheme && styles.darkText]}>
              {isSw ? "Sera ya Faragha ya Kido" : "Kido Privacy Policy"}
            </AppText>

            <View style={styles.dateRow}>
              <View style={styles.datePill}>
                <AppText translate={false} style={styles.dateText}>
                  {isSw ? "Tarehe ya kuanza: 23 Oktoba 2026" : "Effective date: October 23, 2026"}
                </AppText>
              </View>
              <View style={[styles.datePill, { backgroundColor: "#FEF3C7" }]}>
                <AppText translate={false} style={[styles.dateText, { color: "#92400E" }]}>
                  {isSw ? "Ilisasishwa mwisho: 23 Oktoba 2026" : "Last updated: October 23, 2026"}
                </AppText>
              </View>
            </View>
          </View>

          {/* Quick Contact Bar */}
          <View style={[styles.contactBar, darkTheme && styles.darkCard]}>
            <View style={styles.contactBarCopy}>
              <AppText translate={false} style={[styles.contactBarTitle, darkTheme && styles.darkText]}>
                {isSw ? "Una maswali au maombi kuhusu faragha?" : "Have privacy questions or requests?"}
              </AppText>
              <AppText translate={false} style={[styles.contactBarSub, darkTheme && styles.darkMutedText]}>
                {isSw
                  ? "Inaendeshwa na SAYARI SOFTWARE (Tanzania). Tupo hapa kusaidia wazazi na walezi."
                  : "Operated by SAYARI SOFTWARE (Tanzania). We’re here to help parents & guardians."}
              </AppText>
            </View>
            <Pressable style={styles.emailButton} onPress={handleEmail} accessibilityRole="button">
              <AppText translate={false} style={styles.emailButtonText}>
                {isSw ? "✉️ Tuma Barua Pepe" : "✉️ Email Us"}
              </AppText>
            </Pressable>
          </View>

          {/* Policy Sections */}
          {POLICY_SECTIONS.map((section) => (
            <View
              key={section.number}
              style={[
                styles.sectionCard,
                section.highlight && styles.sectionCardHighlight,
                darkTheme && styles.darkCard,
                darkTheme && section.highlight && styles.darkSectionCardHighlight,
              ]}
            >
              {/* Section Header */}
              <View style={styles.sectionHeaderRow}>
                <View
                  style={[
                    styles.sectionNumBadge,
                    section.highlight && styles.sectionNumBadgeHighlight,
                  ]}
                >
                  <AppText
                    translate={false}
                    style={[
                      styles.sectionNumText,
                      section.highlight && styles.sectionNumTextHighlight,
                    ]}
                  >
                    {section.number}
                  </AppText>
                </View>
                <AppText
                  translate={false}
                  style={[
                    styles.sectionTitle,
                    section.highlight && styles.sectionTitleHighlight,
                    darkTheme && styles.darkText,
                  ]}
                >
                  {isSw ? section.titleSw : section.titleEn}
                </AppText>
              </View>

              {/* Main Section Paragraphs */}
              {(isSw ? section.paragraphsSw : section.paragraphsEn)?.map((p, pIdx) => (
                <AppText
                  key={pIdx}
                  translate={false}
                  style={[styles.paragraph, darkTheme && styles.darkMutedText]}
                >
                  {p}
                </AppText>
              ))}

              {/* Main Section Bullets */}
              {(isSw ? section.bulletsSw : section.bulletsEn) && (
                <View style={styles.bulletsWrap}>
                  {(isSw ? section.bulletsSw : section.bulletsEn)!.map((b, bIdx) => (
                    <View key={bIdx} style={styles.bulletRow}>
                      <AppText translate={false} style={styles.bulletDot}>
                        •
                      </AppText>
                      <AppText
                        translate={false}
                        style={[styles.bulletText, darkTheme && styles.darkMutedText]}
                      >
                        {b}
                      </AppText>
                    </View>
                  ))}
                </View>
              )}

              {/* Subsections if any */}
              {section.subsections?.map((sub, sIdx) => {
                const heading = isSw ? sub.headingSw : sub.headingEn;
                const paragraphs = isSw ? sub.paragraphsSw : sub.paragraphsEn;
                const bullets = isSw ? sub.bulletsSw : sub.bulletsEn;

                return (
                  <View key={sIdx} style={styles.subsectionBlock}>
                    {heading && (
                      <AppText
                        translate={false}
                        style={[styles.subsectionHeading, darkTheme && styles.darkText]}
                      >
                        {sub.letter ? `${sub.letter}. ` : ""}
                        {heading}
                      </AppText>
                    )}
                    {paragraphs?.map((sp, spIdx) => (
                      <AppText
                        key={spIdx}
                        translate={false}
                        style={[styles.paragraph, darkTheme && styles.darkMutedText]}
                      >
                        {sp}
                      </AppText>
                    ))}
                    {bullets && (
                      <View style={styles.bulletsWrap}>
                        {bullets.map((sb, sbIdx) => (
                          <View key={sbIdx} style={styles.bulletRow}>
                            <AppText translate={false} style={styles.bulletDot}>
                              •
                            </AppText>
                            <AppText
                              translate={false}
                              style={[styles.bulletText, darkTheme && styles.darkMutedText]}
                            >
                              {sb}
                            </AppText>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

              {/* Interactive buttons for Section 10 & 15 */}
              {section.number === "10" && (
                <View style={styles.actionRow}>
                  <Pressable style={styles.actionBtn} onPress={handleDeletionEmail}>
                    <AppText translate={false} style={styles.actionBtnText}>
                      {isSw ? "📧 Omba Kufuta Akaunti" : "📧 Request Account Deletion"}
                    </AppText>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, styles.actionBtnOutline, { marginTop: 8 }]} onPress={handleDeletionInstructions}>
                    <AppText translate={false} style={styles.actionBtnOutlineText}>
                      {isSw ? "Soma Maelekezo ya Kufuta Akaunti" : "Read Account Deletion Instructions"}
                    </AppText>
                  </Pressable>
                </View>
              )}

              {section.number === "15" && (
                <View style={styles.contactLinksRow}>
                  <Pressable style={styles.actionBtn} onPress={handleEmail}>
                    <AppText translate={false} style={styles.actionBtnText}>
                      ✉️ info@sayarisoftware.com
                    </AppText>
                  </Pressable>
                  <Pressable style={[styles.actionBtn, styles.actionBtnOutline]} onPress={handleWebsite}>
                    <AppText translate={false} style={styles.actionBtnOutlineText}>
                      🌐 sayarisoftware.com
                    </AppText>
                  </Pressable>
                </View>
              )}
            </View>
          ))}

          {/* Footer Card */}
          <View style={[styles.footerCard, darkTheme && styles.darkCard]}>
            <KidoAnimatedLogo capHeight={28} autoPlay={false} interactive onPress={playPop} />
            <AppText translate={false} style={[styles.footerText, darkTheme && styles.darkMutedText]}>
              {isSw
                ? "Kido imejitolea kuhakikisha ujifunzaji ulio salama, wazi, na wenye furaha tele kwa kila mtoto."
                : "Kido is dedicated to safe, transparent, and joyful learning for every child."}
            </AppText>
            <Pressable style={styles.footerBackBtn} onPress={handleBack}>
              <AppText translate={false} style={styles.footerBackBtnText}>
                {isSw ? "Rudi kwenye Programu" : "Return to App"}
              </AppText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FDF8F0",
  },
  darkSafeArea: {
    backgroundColor: "#0F172A",
  },
  scrollContent: {
    paddingBottom: 48,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(80, 54, 23, 0.08)",
  },
  headerWide: {
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
    borderRadius: 20,
    marginTop: 8,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "rgba(80, 54, 23, 0.08)",
  },
  backButton: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
  },
  backButtonText: {
    fontFamily: "FredokaBold",
    fontSize: 13,
    color: "#4B5563",
  },
  headerLogoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  langPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  langText: {
    fontFamily: "FredokaMedium",
    fontSize: 12,
    color: "#6B7280",
  },
  langActive: {
    color: "#1E293B",
    fontFamily: "FredokaBold",
  },
  langDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#D1D5DB",
    marginHorizontal: 6,
  },

  // Container
  container: {
    paddingHorizontal: 18,
    paddingTop: 20,
    width: "100%",
  },
  containerWide: {
    maxWidth: 960,
    alignSelf: "center",
    paddingHorizontal: 24,
  },

  // Hero Card
  heroCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(80, 54, 23, 0.08)",
    marginBottom: 18,
  },
  shieldBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#EFF6FF",
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  shieldEmoji: {
    fontSize: 26,
  },
  heroTitle: {
    fontFamily: "FredokaBold",
    fontSize: 28,
    color: "#451A03",
    textAlign: "center",
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  datePill: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  dateText: {
    fontFamily: "FredokaMedium",
    fontSize: 12,
    color: "#4B5563",
  },

  // Quick Contact Bar
  contactBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFBEB",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#FDE68A",
    marginBottom: 20,
    gap: 12,
  },
  contactBarCopy: {
    flex: 1,
    minWidth: 240,
  },
  contactBarTitle: {
    fontFamily: "FredokaBold",
    fontSize: 15,
    color: "#92400E",
    marginBottom: 2,
  },
  contactBarSub: {
    fontFamily: "FredokaRegular",
    fontSize: 13,
    color: "#78350F",
  },
  emailButton: {
    backgroundColor: "#F59E0B",
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  emailButtonText: {
    fontFamily: "FredokaBold",
    fontSize: 13,
    color: "#FFFFFF",
  },

  // Section Cards
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: "rgba(80, 54, 23, 0.08)",
    marginBottom: 16,
  },
  sectionCardHighlight: {
    borderColor: "#F59E0B",
    borderWidth: 2,
    backgroundColor: "#FFFDF7",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionNumBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionNumBadgeHighlight: {
    backgroundColor: "#FEF3C7",
  },
  sectionNumText: {
    fontFamily: "FredokaBold",
    fontSize: 14,
    color: "#4B5563",
  },
  sectionNumTextHighlight: {
    color: "#B45309",
  },
  sectionTitle: {
    fontFamily: "FredokaBold",
    fontSize: 18,
    color: "#451A03",
    flex: 1,
  },
  sectionTitleHighlight: {
    color: "#B45309",
  },
  paragraph: {
    fontFamily: "FredokaRegular",
    fontSize: 14,
    lineHeight: 22,
    color: "#374151",
    marginBottom: 10,
  },
  bulletsWrap: {
    marginBottom: 10,
    paddingLeft: 4,
    gap: 6,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bulletDot: {
    fontFamily: "FredokaBold",
    fontSize: 16,
    color: "#F59E0B",
    lineHeight: 20,
  },
  bulletText: {
    fontFamily: "FredokaRegular",
    fontSize: 14,
    lineHeight: 21,
    color: "#374151",
    flex: 1,
  },
  subsectionBlock: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(80, 54, 23, 0.06)",
  },
  subsectionHeading: {
    fontFamily: "FredokaBold",
    fontSize: 15,
    color: "#1E293B",
    marginBottom: 6,
  },
  actionRow: {
    marginTop: 12,
  },
  actionBtn: {
    backgroundColor: "#F59E0B",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: "flex-start",
  },
  actionBtnText: {
    fontFamily: "FredokaBold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  contactLinksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  actionBtnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: "#D97706",
  },
  actionBtnOutlineText: {
    fontFamily: "FredokaBold",
    fontSize: 13,
    color: "#D97706",
  },

  // Footer Card
  footerCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(80, 54, 23, 0.08)",
    marginTop: 10,
    marginBottom: 20,
  },
  footerText: {
    fontFamily: "FredokaMedium",
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 16,
    maxWidth: 420,
  },
  footerBackBtn: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  footerBackBtnText: {
    fontFamily: "FredokaBold",
    fontSize: 13,
    color: "#4B5563",
  },

  // Dark Mode Overrides
  darkCard: {
    backgroundColor: "#1E293B",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  darkSectionCardHighlight: {
    borderColor: "#F59E0B",
    backgroundColor: "#1E293B",
  },
  darkControl: {
    backgroundColor: "#334155",
  },
  darkText: {
    color: "#F8FAFC",
  },
  darkMutedText: {
    color: "#94A3B8",
  },
});
