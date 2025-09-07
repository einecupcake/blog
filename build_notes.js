// run with node build_notes.js

const fs = require("fs");
const path = require("path");

const NOTES_DIR = path.join(__dirname, "notes");
const OUTPUT_FILE = path.join(__dirname, "notes_index.json");

// Read all .md files from notes/
const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith(".md"));

// Sort by filename descending (assuming YYYY-MM-DD in filename)
files.sort((a, b) => b.localeCompare(a));

// Write JSON array of filenames
fs.writeFileSync(OUTPUT_FILE, JSON.stringify(files, null, 2));

console.log(`Generated ${OUTPUT_FILE} with ${files.length} notes.`);
