const fs = require("fs");
const path = require("path");

const NOTES_DIR = path.join(__dirname, "notes");
const INDEX_FILE = path.join(__dirname, "index.html");

// HTML-escape helper
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Allow only <br> tags, escape everything else
function safeBody(raw) {
  // raw contains literal "<br>" markers produced by our parser
  // Escape everything first, then restore <br>
  const escaped = escapeHtml(raw);
  return escaped.replace(/&lt;br&gt;/g, "<br>");
}

// Parse markdown note into structured data
function parseNote(content) {
  // Cut everything above the first "# " header (if present)
  const headerIndex = content.indexOf("# ");
  if (headerIndex !== -1) {
    content = content.slice(headerIndex);
  }

  // Split by actual newlines but preserve blank lines and original spacing
  const rawLines = content.split(/\r?\n/);

  let title = "";
  let tags = "";
  let date = "";
  let body = [];

  for (let rawLine of rawLines) {
    // Keep the raw line (do not trim) for body preservation.
    const lineTrim = rawLine.trim();

    if (lineTrim.startsWith("# ")) {
      // Title from header (trimmed)
      title = lineTrim.replace(/^#\s+/, "").trim();
    } else if (lineTrim.toLowerCase().startsWith("tags:")) {
      tags = lineTrim.replace(/tags:/i, "").trim();
    } else if (lineTrim.toLowerCase().startsWith("date:")) {
      date = lineTrim.replace(/date:/i, "").trim();
    } else {
      // Preserve exact line content (including empty lines)
      // Replace any stray carriage returns
      body.push(rawLine.replace(/\r$/, ""));
    }
  }

  // Join lines with <br> to preserve line breaks in HTML.
  // Empty lines become additional <br>, so spacing is preserved.
  const text = body.join("<br>\n");

  return { title, tags, date, text };
}

function generateEntryHTML(note) {
  // Title/date/tags must be escaped to avoid injection.
  // The body uses safeBody which escapes everything but restores <br>.
  const titleEsc = escapeHtml(note.title);
  const dateEsc = escapeHtml(note.date);
  const tagsEsc = escapeHtml(note.tags);
  const bodySafe = safeBody(note.text);

  return `                <li>
                    <h3>${titleEsc}</h3>
                    <p><strong>Date:</strong> ${dateEsc}</p>
                    <p><strong>Tags:</strong> ${tagsEsc}</p>
                    <p>${bodySafe}</p>
                </li>`;
}

// Helper: extract <h3>...</h3> from an entry HTML (for duplicate checks)
function getTitleFromEntry(entryHtml) {
  const m = entryHtml.match(/<h3>([\s\S]*?)<\/h3>/i);
  return m ? m[0] : "";
}

function escapeForRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// PREPEND new entry (newest at top) while preserving existing content
function insertIntoSection(html, sectionId, entryHtml) {
  const sectionRegex = new RegExp(
    `(<div\\s+id="${escapeForRegex(sectionId)}"[\\s\\S]*?<ul\\s+class="entry-list">)([\\s\\S]*?)(</ul>)`
  );

  return html.replace(sectionRegex, (match, start, oldContent, end) => {
    // If the exact title already exists in this section, skip to avoid duplicates
    const existingTitleHtml = getTitleFromEntry(entryHtml);
    if (oldContent.includes(existingTitleHtml)) {
      return match;
    }

    // PREPEND: new entry first, then old content
    const updated = `${start}\n${entryHtml}\n${oldContent}\n${end}`;
    return updated;
  });
}

function buildBlog(noteFile, category) {
  const allowed = [
    "all-section",
    "short-section",
    "long-section",
    "timeless-section",
    "archive-section"
  ];

  if (!allowed.includes(category)) {
    console.error(`Unknown category "${category}". Allowed: ${allowed.join(", ")}`);
    process.exit(1);
  }

  const filePath = path.join(NOTES_DIR, noteFile);
  if (!fs.existsSync(filePath)) {
    console.error(`Note file not found: ${filePath}`);
    process.exit(1);
  }

  let indexHTML = fs.readFileSync(INDEX_FILE, "utf-8");
  const content = fs.readFileSync(filePath, "utf-8");
  const note = parseNote(content);

  // Small sanity: require a title
  if (!note.title) {
    console.error(`Parsed note has no title (no '# Header' found). Aborting.`);
    process.exit(1);
  }

  const entryHTML = generateEntryHTML(note);

  // Prevent global duplicates by title across the whole index
  const titleSnippet = `<h3>${escapeHtml(note.title)}</h3>`;
  if (indexHTML.includes(titleSnippet)) {
    console.log(`Note titled "${note.title}" already appears in index.html — skipping insertion.`);
    return;
  }

  // 1) Insert into requested category (prepend newest at top)
  indexHTML = insertIntoSection(indexHTML, category, entryHTML);

  // 2) Also insert into ALL (prepend), unless the chosen category already was all-section
  if (category !== "all-section") {
    indexHTML = insertIntoSection(indexHTML, "all-section", entryHTML);
  }

  fs.writeFileSync(INDEX_FILE, indexHTML, "utf-8");

  console.log(`Inserted "${noteFile}" into #${category} and #all-section (newest on top).`);
}

// CLI handling
const [,, noteName, category] = process.argv;

if (!noteName || !category) {
  console.error('Usage: node build_notes.js "note.md" "category-id"');
  process.exit(1);
}

buildBlog(noteName, category);
