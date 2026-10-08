import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ApiClient, BibleClient } from '@youversion/platform-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const API_KEY = process.env.YOUVERSION_API_KEY;

if (!API_KEY) {
  console.error('❌ YOUVERSION_API_KEY not found in .env file');
  process.exit(1);
}

// Initialize YouVersion SDK
const apiClient = new ApiClient({ appKey: API_KEY });
const bibleClient = new BibleClient(apiClient);

// Portuguese to USFM book code mapping
const ptToUsfm = {
  "Gn": "GEN", "Gên": "GEN", "Gênesis": "GEN",
  "Ex": "EXO", "Êx": "EXO", "Êxodo": "EXO",
  "Lv": "LEV", "Levítico": "LEV",
  "Nm": "NUM", "Números": "NUM",
  "Dt": "DEU", "Deuteronômio": "DEU",
  "Js": "JOS", "Josué": "JOS",
  "Jz": "JDG", "Juízes": "JDG",
  "Rt": "RUT", "Rute": "RUT",
  "1Sm": "1SA", "1Samuel": "1SA",
  "2Sm": "2SA", "2Samuel": "2SA",
  "1Rs": "1KI", "1Reis": "1KI",
  "2Rs": "2KI", "2Reis": "2KI",
  "1Cr": "1CH", "1Crônicas": "1CH",
  "2Cr": "2CH", "2Crônicas": "2CH",
  "Ed": "EZR", "Esd": "EZR", "Esdras": "EZR",
  "Ne": "NEH", "Neemias": "NEH",
  "Et": "EST", "Ester": "EST",
  "Jó": "JOB",
  "Sl": "PSA", "Salmos": "PSA",
  "Pv": "PRO", "Provérbios": "PRO",
  "Ec": "ECC", "Eclesiastes": "ECC",
  "Ct": "SNG", "Cânticos": "SNG", "Cantares": "SNG",
  "Is": "ISA", "Isaías": "ISA",
  "Jr": "JER", "Jeremias": "JER",
  "Lm": "LAM", "Lamentações": "LAM",
  "Ez": "EZK", "Ezequiel": "EZK",
  "Dn": "DAN", "Dan": "DAN", "Daniel": "DAN",
  "Os": "HOS", "Oséias": "HOS",
  "Jl": "JOL", "Joel": "JOL",
  "Am": "AMO", "Amós": "AMO",
  "Ob": "OBA", "Obadias": "OBA",
  "Jn": "JON", "Jonas": "JON",
  "Mq": "MIC", "Miquéias": "MIC",
  "Na": "NAM", "Naum": "NAM",
  "Hc": "HAB", "Habacuque": "HAB",
  "Sf": "ZEP", "Sofonias": "ZEP",
  "Ag": "HAG", "Ageu": "HAG",
  "Zc": "ZEC", "Zac": "ZEC", "Zacarias": "ZEC",
  "Ml": "MAL", "Malaquias": "MAL",
  "Mt": "MAT", "Mateus": "MAT",
  "Mc": "MRK", "Mar": "MRK", "Marcos": "MRK",
  "Lc": "LUK", "Luc": "LUK", "Lucas": "LUK",
  "Jo": "JHN", "João": "JHN",
  "At": "ACT", "Atos": "ACT",
  "Rm": "ROM", "Romanos": "ROM",
  "1Co": "1CO", "1Coríntios": "1CO",
  "2Co": "2CO", "2Coríntios": "2CO",
  "Gl": "GAL", "Gál": "GAL", "Gálatas": "GAL",
  "Ef": "EPH", "Éf": "EPH", "Efésios": "EPH",
  "Fp": "PHP", "Fil": "PHP", "Filipenses": "PHP",
  "Cl": "COL", "Col": "COL", "Colossenses": "COL",
  "1Ts": "1TH", "1Tessalonicenses": "1TH",
  "2Ts": "2TH", "2Tessalonicenses": "2TH",
  "1Tm": "1TI", "1Timóteo": "1TI",
  "2Tm": "2TI", "2Timóteo": "2TI",
  "Tt": "TIT", "Tito": "TIT",
  "Fm": "PHM", "Filemom": "PHM",
  "Hb": "HEB", "Hebreus": "HEB",
  "Tg": "JAS", "Tia": "JAS", "Tiago": "JAS",
  "1Pe": "1PE", "1Pedro": "1PE",
  "2Pe": "2PE", "2Pedro": "2PE",
  "1Jo": "1JN", "1João": "1JN",
  "2Jo": "2JN", "2João": "2JN",
  "3Jo": "3JN", "3João": "3JN",
  "Jd": "JUD", "Judas": "JUD",
  "Ap": "REV", "Apocalipse": "REV"
};

/**
 * Check if a reference is a verse range
 * @param {string} ref - e.g., "Jo 3:16" or "Mt 6:9-13" or "2 Pe 1:1-3"
 * @returns {boolean}
 */
function isVerseRange(ref) {
  return /^([1-3]?\s?[A-Za-zÀ-ÿ]+)\s+(\d+):(\d+)-(\d+)$/.test(ref.trim());
}

/**
 * Expand a verse range into individual verse references
 * @param {string} ref - e.g., "Mt 6:9-13" or "2 Pe 1:1-3"
 * @returns {string[]} - e.g., ["Mt 6:9", "Mt 6:10", "Mt 6:11", "Mt 6:12", "Mt 6:13"]
 */
function expandVerseRange(ref) {
  const match = ref.trim().match(/^([1-3]?\s?[A-Za-zÀ-ÿ]+)\s+(\d+):(\d+)-(\d+)$/);

  if (!match) {
    return [ref]; // Not a range, return as-is
  }

  const [, book, chapter, startVerse, endVerse] = match;
  const start = parseInt(startVerse, 10);
  const end = parseInt(endVerse, 10);

  if (start > end) {
    console.warn(`⚠️  Invalid verse range: "${ref}" (start > end)`);
    return [ref];
  }

  const verses = [];
  for (let v = start; v <= end; v++) {
    verses.push(`${book} ${chapter}:${v}`);
  }

  return verses;
}

/**
 * Parse Portuguese Bible reference to USFM format (single verse only)
 * @param {string} ref - e.g., "Jo 3:16" or "2 Pe 1:21"
 * @returns {string|null} - e.g., "JHN.3.16" or null if invalid
 */
function parseReference(ref) {
  // Match pattern: Book Chapter:Verse (single verse only)
  // Allows optional space after book number (e.g., "2 Pe" or "2Pe")
  const match = ref.trim().match(/^([1-3]?\s?[A-Za-zÀ-ÿ]+)\s+(\d+):(\d+)$/);

  if (!match) {
    console.warn(`⚠️  Invalid reference format: "${ref}"`);
    return null;
  }

  const [, bookRaw, chapter, verse] = match;
  // Normalize book name by removing internal spaces (e.g., "2 Pe" -> "2Pe")
  const book = bookRaw.replace(/\s+/g, '');
  const usfmBook = ptToUsfm[book];

  if (!usfmBook) {
    console.warn(`⚠️  Unknown book abbreviation: "${book}" in reference "${ref}"`);
    return null;
  }

  return `${usfmBook}.${chapter}.${verse}`;
}

/**
 * Count words in verse text (for point calculation)
 * Removes punctuation and counts words
 * @param {string} text - Plain text from YouVersion API
 * @returns {number} - Word count
 */
function countWords(text) {
  // Remove punctuation, keep letters (including áéíóúãõçñ) and numbers
  // \p{L} matches any Unicode letter, \p{N} matches numbers
  const cleanText = text.replace(/[^\p{L}\p{N}\s]/gu, ' ');

  // Split by whitespace and filter empty strings
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);

  return words.length;
}

/**
 * Clean verse text for storage (normalize whitespace)
 * @param {string} text - Plain text from YouVersion API
 * @returns {string} - Clean plain text
 */
function cleanVerseText(text) {
  // Normalize whitespace and trim
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Fetch verse text from YouVersion using SDK
 */
async function fetchVerse(bibleId, bibleAbbr, usfmRef, originalRef) {
  try {
    const passage = await bibleClient.getPassage(bibleId, usfmRef, 'text');

    if (!passage || !passage.content) {
      return null;
    }

    const rawText = passage.content.trim();
    const cleanText = cleanVerseText(rawText);

    return {
      reference: passage.reference || originalRef,
      text: cleanText,
      wordCount: countWords(cleanText),
      youversionUrl: `https://www.bible.com/pt/bible/${bibleId}/${usfmRef}`
    };
  } catch (error) {
    console.error(`    ❌ ${bibleAbbr}: ${error.message}`);
    return null;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('📖 YouVersion Multi-Version Verse Fetcher (SDK)\n');

  // Load config
  const configPath = path.join(__dirname, 'bible-versions.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

  console.log(`📋 Configured versions: ${config.versions.map(v => v.abbreviation).join(', ')}\n`);

  // Read leaderboard data
  const leaderboardPath = path.join(__dirname, '..', 'public', 'data', 'leaderboard.json');
  const leaderboardData = JSON.parse(fs.readFileSync(leaderboardPath, 'utf-8'));

  // Extract unique verse references and expand ranges
  const originalRefs = new Set();
  leaderboardData.participants.forEach(participant => {
    if (participant.memorizedVerses && Array.isArray(participant.memorizedVerses)) {
      participant.memorizedVerses.forEach(v => {
        const ref = typeof v === 'string' ? v : v.ref;
        if (ref) originalRefs.add(ref);
      });
    }
  });

  // Manual do Candidato lesson verses (shown on the Manual page even before anyone recites them)
  const lessonsPath = path.join(__dirname, '..', 'public', 'data', 'lessons.json');
  if (fs.existsSync(lessonsPath)) {
    const lessonsData = JSON.parse(fs.readFileSync(lessonsPath, 'utf-8'));
    lessonsData.lessons.forEach(lesson => {
      [...(lesson.verses ?? []), ...(lesson.challenge ?? [])].forEach(v => originalRefs.add(v.ref));
    });
  }

  // Hand-entered texts for versions the API does not serve (ARC, ARA, NAA, Manual)
  const verseTextsPath = path.join(__dirname, '..', 'public', 'data', 'verse-texts.json');
  const verseTexts = fs.existsSync(verseTextsPath)
    ? JSON.parse(fs.readFileSync(verseTextsPath, 'utf-8'))
    : { versions: {}, verses: {} };
  Object.keys(verseTexts.verses).forEach(ref => originalRefs.add(ref));

  // Expand all ranges into individual verses
  const allRefs = new Set();
  for (const ref of originalRefs) {
    if (isVerseRange(ref)) {
      const expanded = expandVerseRange(ref);
      console.log(`  📋 Expanding range: ${ref} → ${expanded.length} verses`);
      expanded.forEach(v => allRefs.add(v));
    } else {
      allRefs.add(ref);
    }
  }

  if (allRefs.size === 0) {
    console.log('ℹ️  No verses to fetch. Creating empty verses.json');
    const output = {
      generatedAt: new Date().toISOString(),
      defaultVersion: config.defaultVersion,
      versions: {},
      verses: {}
    };

    const outputPath = path.join(__dirname, '..', 'public', 'data', 'verses.json');
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log('✅ Created empty verses.json');
    return;
  }

  console.log(`Found ${allRefs.size} unique verse reference(s)\n`);

  // Build Bible versions metadata
  console.log('📚 Configured Bible versions:\n');
  const bibleVersions = {};

  for (const version of config.versions) {
    bibleVersions[version.abbreviation] = {
      id: version.id,
      name: version.name,
      fullTitle: version.name
    };
    console.log(`  ✅ ${version.abbreviation}: ${version.name} (ID: ${version.id})`);
  }

  // Fetch all verses in all versions
  console.log('\n📥 Fetching verses...\n');
  const verses = {};

  for (const ref of allRefs) {
    const usfmRef = parseReference(ref);
    if (!usfmRef) continue;

    console.log(`  📖 ${ref} (${usfmRef})`);
    verses[ref] = {};

    for (const [abbr, bibleInfo] of Object.entries(bibleVersions)) {
      const verseData = await fetchVerse(bibleInfo.id, abbr, usfmRef, ref);
      if (verseData) {
        verses[ref][abbr] = verseData;
        console.log(`    ✅ ${abbr}`);
      }
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 150));
    }
  }

  // Merge hand-entered texts (word count computed the same way as API texts)
  console.log('\n✍️  Merging hand-entered texts...\n');
  for (const [abbr, info] of Object.entries(verseTexts.versions)) {
    bibleVersions[abbr] = { id: info.id ?? 0, name: info.name, fullTitle: info.name };
  }
  for (const [ref, byVersion] of Object.entries(verseTexts.verses)) {
    const usfmRef = parseReference(ref);
    verses[ref] = verses[ref] ?? {};
    for (const [abbr, text] of Object.entries(byVersion)) {
      const id = verseTexts.versions[abbr]?.id;
      const cleanText = cleanVerseText(text);
      verses[ref][abbr] = {
        reference: verses[ref].NVI?.reference ?? ref,
        text: cleanText,
        wordCount: countWords(cleanText),
        youversionUrl: id && usfmRef ? `https://www.bible.com/pt/bible/${id}/${usfmRef}.${abbr}` : ''
      };
      console.log(`  ✅ ${ref} ${abbr}`);
    }
  }

  // Write output
  const output = {
    generatedAt: new Date().toISOString(),
    defaultVersion: config.defaultVersion,
    versions: bibleVersions,
    verses
  };

  const outputPath = path.join(__dirname, '..', 'public', 'data', 'verses.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  // Calculate stats
  let totalFetched = 0;
  for (const verseVersions of Object.values(verses)) {
    totalFetched += Object.keys(verseVersions).length;
  }

  // ANSI color codes
  const colors = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    dim: '\x1b[2m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
  };

  // Version colors (cycle through for multiple versions)
  const versionColors = [colors.cyan, colors.magenta, colors.yellow, colors.green, colors.blue];

  // Print word count report - side by side
  console.log('\n📊 Word Count Report:\n');

  // Header with version names
  const versionAbbrs = Object.keys(bibleVersions);
  const refWidth = 16;
  let header = `  ${'Referência'.padEnd(refWidth)}`;
  versionAbbrs.forEach((abbr, idx) => {
    const color = versionColors[idx % versionColors.length];
    header += ` │ ${color}${abbr.padEnd(12)}${colors.reset}`;
  });
  console.log(header);
  console.log(`  ${'─'.repeat(refWidth)}${'─┼─────────────'.repeat(versionAbbrs.length)}`);

  // Print each verse with all versions side by side
  for (const [ref, versionData] of Object.entries(verses)) {
    let line = `  ${colors.bold}${ref.padEnd(refWidth)}${colors.reset}`;

    versionAbbrs.forEach((abbr, idx) => {
      const color = versionColors[idx % versionColors.length];
      const data = versionData[abbr];

      if (data) {
        const words = data.wordCount;
        const icon = words >= 20 ? '█' : '·';
        const pts = words >= 20 ? '35' : '25';
        line += ` │ ${color}${icon} ${String(words).padStart(2)}w ${colors.dim}+${pts}${colors.reset}`;
      } else {
        line += ` │ ${colors.dim}   ──    ${colors.reset}`;
      }
    });

    console.log(line);
  }

  // Legend
  console.log(`\n  ${colors.dim}Legenda: █ ≥20 palavras (+35pts) │ · <20 palavras (+25pts)${colors.reset}`);

  console.log(`\n✅ Successfully fetched ${totalFetched} verse(s) across ${Object.keys(bibleVersions).length} version(s)`);
  console.log(`📝 Written to: ${outputPath}`);
}

main().catch(error => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
