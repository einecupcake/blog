const entryList = document.querySelector("#latest-entry-list");

const NOTES_DIR = "notes/"; 

async function loadNote(filename) {
  const path = NOTES_DIR + filename;
  const res = await fetch(path);
  const text = await res.text();

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

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

async function renderNotes() {
  const res = await fetch("notes_index.json");
  const notes = await res.json();

  for (let filename of notes) {
    const note = await loadNote(filename);

    const li = document.createElement("li");
    li.innerHTML = `
      <h3>${note.title}</h3>
      <p><strong>Date:</strong> ${note.date}</p>
      <p><strong>Tags:</strong> ${note.tags}</p>
      <p>${note.text}</p>
    `;
    entryList.appendChild(li);
  }
}


renderNotes();
