// run with node build_blog.js

const fs = require("fs");
const path = require("path");

const NOTES_DIR = path.join(__dirname, "notes");
const INDEX_FILE = path.join(__dirname, "index.html");

function parseNote(content) {
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
  
  let title = "";
  let tags = "";
  let date = "";
  let body = [];

  for (let line of lines) {
    if (line.startsWith("# ")) {
      title = line.replace("# ", "").trim();
    } else if (line.toLowerCase().startsWith("tags:")) {
      tags = line.replace(/tags:/i, "").trim();
    } else if (line.toLowerCase().startsWith("date:")) {
      date = line.replace(/date:/i, "").trim();
    } else {
      body.push(line);
    }
  }

  return { title, tags, date, text: body.join(" ") };
}

function generateEntryHTML(note) {
  return `        <li>
            <h3>${note.title}</h3>
            <p><strong>Date:</strong> ${note.date}</p>
            <p><strong>Tags:</strong> ${note.tags}</p>
            <p>${note.text}</p>
        </li>`;
}

function buildBlog() {
  // Read all .md files from notes/
  const files = fs.readdirSync(NOTES_DIR).filter(f => f.endsWith(".md"));
  
  // Sort by filename descending (assuming YYYY-MM-DD in filename)
  files.sort((a, b) => b.localeCompare(a));
  
  // Parse all notes
  const entries = [];
  for (let filename of files) {
    const filePath = path.join(NOTES_DIR, filename);
    const content = fs.readFileSync(filePath, "utf-8");
    const note = parseNote(content);
    entries.push(generateEntryHTML(note));
  }
  
  let indexHTML = fs.readFileSync(INDEX_FILE, "utf-8");
  
  const entriesHTML = entries.join("\n\n");
  
  const updatedHTML = indexHTML.replace(
    /(<ul id="latest-entry-list">)([\s\S]*?)(<\/ul>)/,
    `$1\n\n${entriesHTML}\n\n        $3`
  );
  
  fs.writeFileSync(INDEX_FILE, updatedHTML);
  
  console.log(`Built blog with ${files.length} entries into ${INDEX_FILE}`);
}

buildBlog();
