"use strict";

const app = document.querySelector("#app");
const account = document.querySelector("#account");
const notice = document.querySelector("#notice");
const statuses = {
  draft: "Ready to rehearse", rehearsing: "Rehearsing", submitted: "Awaiting review",
  reviewed: "Review returned", revised: "Fresh case ready",
  fresh_case_submitted: "Awaiting assessment", assessed: "Assessed",
};
let state = { user: null, cases: [] };
let selectedId;
let busy = false;
let voice;
let liveVoice;
let liveStatus = "";
let liveCaptions = { teacher: "", student: "" };
let liveFallback = false;
let liveTyped = "";
let handsFree = false;
let muted = false;
let retry;
let portfolioOpen = false;
let mentorOpenedAt = Date.now();

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function message(text = "", error = false) {
  notice.textContent = text;
  notice.hidden = !text;
  notice.dataset.error = error;
}

async function request(path, data) {
  const response = await fetch("/api/" + path, data === undefined ? {} : {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || "Request failed. Try again.");
    error.sampleAvailable = result.sampleAvailable;
    error.unauthorized = response.status === 401;
    throw error;
  }
  return result;
}

function selected() {
  return state.cases.find((item) => item.id === selectedId);
}

function draftKey() {
  return "bansay-draft-" + state.user?.id + "-" + selectedId;
}

function draft(value) {
  try {
    if (value !== undefined) localStorage.setItem(draftKey(), value);
    return localStorage.getItem(draftKey()) || "";
  } catch {
    return "";
  }
}

function dateLabel(value) {
  if (!value) return "";
  const date = new Date(value.length === 10 ? value + "T00:00:00" : value);
  if (Number.isNaN(date.getTime())) return value;
  return value.length === 10 ? date.toLocaleDateString() : date.toLocaleString();
}

function nameOf(value) {
  return typeof value === "string" ? value : value?.name || "";
}

function correctionForm(turn, index) {
  return '<details data-live-correction' + (liveVoice?.active ? " hidden" : "") +
    '><summary id="correct-toggle-' + index + '">Correct transcript</summary>' +
    '<form data-action="live/correct"><input type="hidden" name="turnIndex" value="' + index + '">' +
    textarea("Corrected teacher caption", turn.text, false, "correct-turn-" + index) +
    '<button>Save correction</button></form></details>';
}

function transcript(turns = [], editable = false) {
  if (!turns.length) return "<p>There are no rehearsal turns yet.</p>";
  return '<ol class="transcript">' + turns.map((turn, index) =>
    '<li data-role="' + safe(turn.role) + '"><strong>' +
    (turn.role === "teacher" ? "Teacher" : "AI student") + (turn.correctedAt ? " · corrected transcript" : "") +
    "</strong><p>" + safe(turn.text) + "</p>" +
    (turn.correctedAt ? '<p><strong>Original caption</strong> ' + safe(turn.originalText) +
      '</p><small>Corrected ' + safe(dateLabel(turn.correctedAt)) + '</small>' : "") +
    (turn.createdAt ? "<p><small>" + safe(dateLabel(turn.createdAt)) + "</small></p>" : "") +
    (editable && turn.role === "teacher" && turns[index + 1]?.mode === "live" ? correctionForm(turn, index) : "") +
    "</li>"
  ).join("") + "</ol>";
}

function field(name, label, value = "", type = "text") {
  return '<div><label for="' + name + '">' + label + '</label><input id="' + name +
    '" name="' + name + '" type="' + type + '" value="' + safe(value) + '" required></div>';
}

function textarea(label, value = "", optional = false, id = "entry") {
  return '<div><label for="' + id + '">' + label + '</label><textarea id="' + id + '" name="text"' +
    (optional ? "" : " required") + ">" + safe(value) + "</textarea></div>";
}

function evidence(label, record, extra = "") {
  if (!record) return "";
  const author = nameOf(record.author);
  const time = dateLabel(record.createdAt);
  return '<article class="evidence"><h3>' + label + '</h3><p class="muted">' +
    safe([author, time].filter(Boolean).join(" · ")) + "</p><p>" + safe(record.text) +
    "</p>" + extra + "</article>";
}

function login() {
  return '<section class="card login"><h1>Sign in</h1><form data-action="login">' +
    '<div><label for="username">Username</label><input id="username" name="username" autocomplete="username" required></div>' +
    '<div><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" required></div>' +
    '<button>Sign in</button></form><details><summary>Demo accounts</summary>' +
    '<p>Mara (teacher), mentor, or Ana (teacher with an empty workspace). Use <strong>mara</strong>, <strong>mentor</strong>, or <strong>ana</strong> with password <strong>bansay-demo</strong>.</p></details></section>';
}

function prepare() {
  return '<section class="card"><h2>Prepare a lesson</h2><form data-action="cases">' +
    field("title", "Lesson title", "Mixtures and solutions") +
    field("specialization", "Teaching specialization", "English") +
    field("subject", "Lesson subject", "Science") +
    field("grade", "Grade", "7") +
    field("competency", "Competency", "Explain what happens when salt dissolves in water") +
    field("classDate", "Class date", "", "date") +
    '<button>Save lesson</button></form></section>';
}

function guide(item) {
  if (!item.guide) return '<details><summary>Preparation guide</summary><p>A guide is available for the Grade 7 salt solution case.</p></details>';
  return '<details><summary>Preparation guide</summary><h3>Specialization bridge</h3><p>' +
    safe(item.guide.bridge) + '</p><h3>Misconception alert</h3><p>' +
    safe(item.guide.misconception) + '</p><h3>Classroom activity</h3><p>' +
    safe(item.guide.activity) + '</p><p><a href="/static/grade7-guide.txt" download>Download the Grade 7 activity</a></p></details>';
}

function rehearsal(item) {
  const turns = item.turns || [];
  const teacherTurnCount = turns.filter((turn) => turn.role === "teacher").length;
  const hasTeacherTurn = teacherTurnCount > 0;
  const isOpen = !item.rehearsalEnded && teacherTurnCount < 5;
  const voiceAvailable = voice?.supported;
  const liveAvailable = state.liveEnabled && window.BansayLive?.supported;
  if (item.supported === false) {
    return '<section class="card"><h2>Rehearsal</h2><p>There is no rehearsal guide for this lesson yet.</p></section>';
  }
  return '<section class="card"><h2>Rehearsal</h2>' +
    '<p id="rehearsal-mode" class="muted">' + (item.mode === "live" || liveVoice?.active ? "Live AI student" :
      "Offline sample · scripted learner replies") + "</p>" +
    transcript(turns, item.status === "rehearsing") +
    (isOpen && liveAvailable ? '<p class="muted">Starting live rehearsal sends your microphone audio or typed responses to Gemini.</p>' +
      '<div class="actions"><button type="button" id="live-toggle" data-click="live">' +
      (liveVoice?.active ? "End live rehearsal" : "Start live conversation") + '</button>' +
      '<button type="button" id="live-mic-toggle" class="secondary" data-click="live-mic"' +
      (liveVoice?.micAvailable ? "" : " hidden") + '>' +
      (liveVoice?.micPaused ? "Resume microphone" : "Pause microphone") + '</button></div>' +
      '<p id="live-status" role="status" class="muted">' + safe(liveStatus) + '</p>' +
      '<div class="live-captions">' +
      '<p id="live-teacher" hidden><strong>Teacher, live</strong><span></span></p>' +
      '<p id="live-student" hidden><strong>AI student, live</strong><span></span></p></div>' : '') +
    (isOpen ? '<form data-action="turn">' + textarea("Your response", draft()) +
      '<div class="actions"><button id="send-response">' +
      (liveVoice?.active ? "Send live response" : "Send offline sample response") + '</button>' +
      (voiceAvailable ? '<button type="button" id="mic" class="secondary" data-click="mic">Dictate</button>' : "") +
      '<button type="button" id="repeat" class="secondary" data-click="repeat">Repeat learner</button>' +
      '<button type="button" class="secondary" data-click="pause">Pause voice</button></div>' +
      '<div class="actions"><label><input type="checkbox" id="muted"' + (muted ? " checked" : "") +
      '> Mute playback</label>' + (voiceAvailable ? '<label><input type="checkbox" id="hands-free"' +
        (handsFree ? " checked" : "") + '> Hands-free dictation (send automatically)</label>' : "") +
      '</div><p id="voice-status" role="status" class="muted"></p>' +
      (retry?.sampleAvailable || liveFallback ? '<button type="button" data-click="sample" class="secondary">Send using offline sample</button>' : "") +
      '</form>' + (hasTeacherTurn ? '<button class="secondary" data-click="end">End rehearsal</button>' : "") :
      '<p>Rehearsal ended.</p>') + "</section>" +
    (hasTeacherTurn ? '<section class="card"><h2>Request mentor review</h2>' +
      '<p>The subject mentor will receive the transcript above and the class date' +
      (item.classDate ? " (" + safe(dateLabel(item.classDate)) + ")" : "") +
      '.</p><form data-action="submit">' + textarea("Note for your mentor (optional)", "", true, "review-note") +
      '<button>Submit for review</button></form></section>' : "");
}

function anchor(item) {
  const turn = (item.submission?.turns || item.turns || [])[item.review?.turnIndex];
  if (!turn) return "";
  const highlight = item.review.highlight;
  const at = highlight ? turn.text.indexOf(highlight) : -1;
  const quote = at < 0 ? safe(turn.text) :
    safe(turn.text.slice(0, at)) + "<mark>" + safe(highlight) + "</mark>" +
    safe(turn.text.slice(at + highlight.length));
  return '<blockquote>' + quote + '</blockquote>' +
    (item.review.issue ? '<p><strong>Issue</strong> ' + safe(item.review.issue) + '</p>' : "");
}

function assessmentDetails(item) {
  const scores = item.assessment?.scores;
  if (scores?.accuracy === undefined) return "";
  return '<p>Accuracy ' + safe(scores.accuracy) + ' of 2 · Major error ' +
    (scores.majorError ? "recorded" : "absent") + '</p>';
}

function mentorWork(item) {
  if (item.status === "submitted") {
    const choices = (item.submission?.turns || item.turns || []).map((turn, index) =>
      turn.role === "teacher" ? '<option value="' + index + '">' + safe(turn.text) + "</option>" : ""
    ).join("");
    return '<section class="card"><h2>Return feedback</h2><form data-action="review">' +
      '<div><label for="turn-index">Teacher utterance</label><select id="turn-index" name="turnIndex" required>' +
      '<option value="">Select an utterance</option>' + choices + '</select></div>' +
      '<div><label for="highlight">Exact phrase to highlight (optional)</label><input id="highlight" name="highlight" maxlength="500"></div>' +
      '<div><label for="issue">Issue in the explanation</label><input id="issue" name="issue" maxlength="500" required></div>' +
      textarea("One actionable correction") +
      '<button>Return review</button></form></section>';
  }
  if (item.status === "fresh_case_submitted") {
    return '<section class="card"><h2>Assess the fresh case</h2>' +
      (item.rubric ? '<p>' + safe(item.rubric) + '</p>' : '') + '<form data-action="assess">' +
      '<div><label for="accuracy">Subject accuracy</label><select id="accuracy" name="accuracy" required>' +
      '<option value="">Choose an assessment</option><option value="0">0 — Inaccurate</option>' +
      '<option value="1">1 — Partly accurate</option><option value="2">2 — Accurate</option></select></div>' +
      '<label><input type="checkbox" name="majorError"> Major subject error</label>' +
      textarea("Assessment note") + '<button>Save assessment</button></form></section>';
  }
  return "";
}

function teacherWork(item) {
  if (item.status === "reviewed") {
    return '<section class="card"><h2>Revise your explanation</h2><form data-action="revise">' +
      textarea("Revised explanation") + '<button>Save revision and open fresh case</button></form></section>';
  }
  if (item.status === "revised") {
    return '<section class="card"><h2>Try a fresh case</h2><p>' + safe(item.transferPrompt) +
      '</p><form data-action="transfer">' + textarea("Your independent explanation") +
      '<button>Submit for assessment</button></form></section>';
  }
  return "";
}

function records(item, print = false) {
  return (print ? '<h3>Original rehearsal</h3>' + transcript(item.submission?.turns || item.turns) : "") +
    evidence("Review request", item.submission) +
    evidence("Mentor feedback", item.review, anchor(item)) +
    evidence("Teacher revision", item.revision) +
    evidence("Independent fresh case", item.transfer, item.transferPrompt ? '<blockquote>' + safe(item.transferPrompt) + '</blockquote>' : "") +
    evidence("Mentor assessment", item.assessment, assessmentDetails(item));
}

function workspace(item) {
  if (!item) return state.user.role === "teacher" ? prepare() :
    '<section class="card"><h2>No reviews assigned</h2><p>Submitted rehearsals will appear here.</p></section>';
  const teacher = state.user.role === "teacher";
  const isRehearsal = ["draft", "rehearsing"].includes(item.status);
  const classDate = dateLabel(item.classDate);
  return '<div id="screen"><section class="card"><h2>' + safe(item.title) + '</h2><p>' +
    safe(statuses[item.status] || item.status) + (classDate ? ' · Class ' + safe(classDate) : "") +
    '</p>' + (teacher && (isRehearsal || item.status === "reviewed") ? guide(item) : "") +
    (!teacher && item.teacher ? "<p>Teacher " + safe(nameOf(item.teacher)) + "</p>" : "") +
    (item.reviewDueDate && item.status === "submitted" ? "<p>Review target " + safe(dateLabel(item.reviewDueDate)) + "</p>" : "") +
    "</section>" + (teacher && isRehearsal ? rehearsal(item) :
      '<section class="card"><h2>Original rehearsal</h2>' + transcript(item.submission?.turns || item.turns) +
      records(item) + "</section>" + (teacher ? teacherWork(item) : mentorWork(item))) +
    '<button class="secondary" data-click="portfolio" aria-expanded="' + portfolioOpen + '">Teaching Evidence Portfolio</button></div>' +
    '<section id="portfolio" class="card"' + (portfolioOpen ? "" : " hidden") +
    '><h2>Teaching Evidence Portfolio</h2><p>' + safe(item.title) +
    (classDate ? " · Class " + safe(classDate) : "") + "</p>" +
    (item.teacher ? "<p>Teacher " + safe(nameOf(item.teacher)) + "</p>" : "") +
    records(item, true) + '<button class="secondary" data-click="print">Print portfolio</button></section>';
}

function render() {
  app.setAttribute("aria-busy", "false");
  if (!state.user) {
    account.replaceChildren();
    app.innerHTML = login();
    return;
  }
  const teacher = state.user.role === "teacher";
  const items = [...state.cases].sort((a, b) =>
    (a.classDate || "9999").localeCompare(b.classDate || "9999")
  );
  const item = selected();
  account.innerHTML = "<span>" + safe(state.user.name) +
    '</span><button class="secondary" data-click="logout">Sign out</button>';
  app.innerHTML = "<h1>" + (teacher ? "Your lessons" : "Mentor desk") +
    '</h1><div class="grid"><aside aria-label="Lesson list"><ul class="case-list">' +
    items.map((entry) => '<li><button class="secondary" data-click="select" data-id="' +
      safe(entry.id) + '" aria-current="' + (entry.id === selectedId) + '">' + safe(entry.title) +
      "<br><small>" + safe(statuses[entry.status] || entry.status) + "</small></button></li>").join("") +
    "</ul>" + (teacher ? '<button class="secondary" data-click="new">Prepare a lesson</button>' : "") +
    "</aside><div>" + workspace(item) + "</div></div>";
}

function adopt(next) {
  state = next;
  if (!state.cases.some((item) => item.id === selectedId)) {
    selectedId = state.cases[0]?.id;
  }
}

function voiceStatus(text) {
  const target = document.querySelector("#voice-status");
  if (target) target.textContent = text;
}

function updateLive() {
  const mode = document.querySelector("#rehearsal-mode");
  if (mode) mode.textContent = selected()?.mode === "live" || liveVoice?.active ?
    "Live AI student" : "Offline sample · scripted learner replies";
  const toggle = document.querySelector("#live-toggle");
  if (toggle) toggle.textContent = liveVoice?.active ? "End live rehearsal" : "Start live conversation";
  const send = document.querySelector("#send-response");
  if (send) send.textContent = liveVoice?.active ? "Send live response" : "Send offline sample response";
  const micToggle = document.querySelector("#live-mic-toggle");
  if (micToggle) {
    micToggle.hidden = !liveVoice?.micAvailable;
    micToggle.textContent = liveVoice?.micPaused ? "Resume microphone" : "Pause microphone";
  }
  const status = document.querySelector("#live-status");
  if (status) status.textContent = liveStatus;
  for (const role of Object.keys(liveCaptions)) {
    const caption = document.querySelector("#live-" + role);
    if (!caption) continue;
    caption.hidden = !liveCaptions[role];
    caption.querySelector("span").textContent = liveCaptions[role];
  }
  document.querySelectorAll("[data-live-correction]").forEach((editor) => {
    editor.hidden = Boolean(liveVoice?.active);
  });
}

function pauseLive(status = "") {
  liveVoice?.stop();
  liveCaptions = { teacher: "", student: "" };
  liveTyped = "";
  liveStatus = status;
  updateLive();
}

function voiceState({ listening }) {
  const mic = document.querySelector("#mic");
  if (mic) {
    mic.textContent = listening ? "Finish dictating" : "Dictate";
    mic.dataset.listening = listening;
  }
}

function setBusy(value) {
  busy = value;
  app.setAttribute("aria-busy", String(value));
  document.querySelectorAll("form button[type=submit], form button:not([type])").forEach((button) => {
    button.disabled = value;
  });
}

function turnId() {
  return globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

async function run(action, data = {}, okMessage = "Saved.", behavior = {}) {
  if (busy) return;
  const previousId = selectedId;
  const oldIds = new Set(state.cases.map((item) => item.id));
  const reviewNote = action === "live/correct" ? document.querySelector("#review-note")?.value : "";
  setBusy(true);
  message(action === "turn" ? "Waiting for the learner…" : "");
  try {
    const next = await request(action, data);
    if (action === "logout") {
      try {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith("bansay-draft-" + state.user.id + "-")) localStorage.removeItem(key);
        }
      } catch {}
      handsFree = false;
      voice?.setAutoListen(false);
    }
    if (action === "cases") {
      selectedId = next.cases.find((item) => !oldIds.has(item.id))?.id;
      portfolioOpen = false;
    }
    if (action === "login") mentorOpenedAt = Date.now();
    if (action === "turn") {
      draft("");
      retry = undefined;
    }
    adopt(next);
    render();
    if (reviewNote && document.querySelector("#review-note")) document.querySelector("#review-note").value = reviewNote;
    message(okMessage);
    if (action === "turn") {
      const item = selected();
      const reply = item?.turns?.at(-1);
      const canContinue = Boolean(document.querySelector("form[data-action=turn]"));
      if (reply?.role === "student" && selectedId === previousId) {
        voice?.speak(reply.text, handsFree && canContinue);
      }
      if (!(handsFree && canContinue)) document.querySelector("#entry, #review-note")?.focus();
    } else if (behavior.focus) {
      document.querySelector(behavior.focus)?.focus();
    }
  } catch (error) {
    if (action === "turn" && retry) {
      retry.sampleAvailable = error.sampleAvailable;
      if (retry.sampleAvailable) render();
    }
    if (error.unauthorized && state.user) {
      voice?.pause();
      adopt(await request("state").catch(() => ({ user: null, cases: [] })));
      render();
    }
    message(error.message, true);
  } finally {
    setBusy(false);
  }
}

function sendTurn(text, sample = false) {
  if (busy || !text.trim() || !selected() || selected().rehearsalEnded) return;
  text = text.trim();
  if (!retry || retry.text !== text || retry.caseId !== selectedId) {
    retry = { text, caseId: selectedId, clientTurnId: turnId() };
  }
  const { text: response, caseId, clientTurnId } = retry;
  voice?.pause();
  pauseLive();
  run("turn", { text: response, caseId, clientTurnId, ...(sample ? { sample } : {}) }, "");
}

function useVoiceText(text) {
  const entry = document.querySelector('form[data-action=turn] textarea');
  if (!entry) return;
  entry.value = text;
  draft(text);
  if (handsFree) sendTurn(text);
  else {
    voiceStatus("Transcript ready to edit.");
    entry.focus();
  }
}

app.addEventListener("submit", (event) => {
  event.preventDefault();
  const { action } = event.target.dataset;
  const data = Object.fromEntries(new FormData(event.target));
  if (action === "turn") {
    if (liveVoice?.active) {
      const text = data.text.trim();
      if (!text) return;
      if (liveCaptions.teacher || liveCaptions.student || liveTyped) {
        message("Wait for the current live turn to finish, or end live rehearsal to switch to the offline sample.");
      } else if (liveVoice.sendText(text)) {
        liveTyped = text;
        liveCaptions.teacher = text;
        updateLive();
        message();
      } else {
        message("Wait for live voice to connect, or end live rehearsal to use the offline sample.");
      }
      return;
    }
    sendTurn(data.text);
    return;
  }
  if (action !== "login" && action !== "cases") data.caseId = selectedId;
  if (action === "live/correct") {
    if (liveVoice?.active) {
      message("End live rehearsal before correcting a caption.", true);
      return;
    }
    data.turnIndex = Number(data.turnIndex);
    run(action, data, "Transcript correction saved.", { focus: "#correct-toggle-" + data.turnIndex });
    return;
  }
  if (action === "review") data.turnIndex = Number(data.turnIndex);
  if (action === "review" || action === "assess") {
    data.durationSeconds = Math.min(28800, Math.floor((Date.now() - mentorOpenedAt) / 1000));
  }
  if (action === "assess") {
    data.scores = { accuracy: Number(data.accuracy), majorError: data.majorError === "on" };
    delete data.accuracy;
    delete data.majorError;
  }
  voice?.pause();
  pauseLive();
  const messages = {
    login: "", cases: "Lesson saved.", submit: "Submitted to your mentor.",
    review: "Review returned to the teacher.", revise: "Revision saved. Your fresh case is ready.",
    transfer: "Fresh case submitted for assessment.", assess: "Assessment saved.",
  };
  run(action, data, messages[action]);
});

app.addEventListener("input", (event) => {
  if (event.target.matches('form[data-action=turn] textarea')) draft(event.target.value);
});

app.addEventListener("change", (event) => {
  if (event.target.id === "muted") {
    muted = event.target.checked;
    voice?.setMuted(muted);
    liveVoice?.setMuted(muted);
  }
  if (event.target.id === "hands-free") {
    handsFree = event.target.checked;
    voice?.setAutoListen(handsFree);
    voiceStatus(handsFree ? "Press Dictate to start hands-free offline rehearsal." : "Hands-free off.");
  }
});

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-click]");
  if (!button || busy) return;
  switch (button.dataset.click) {
    case "logout":
      voice?.pause();
      pauseLive();
      liveFallback = false;
      portfolioOpen = false;
      run("logout", {}, "Signed out.", { focus: "#username" });
      break;
    case "select":
    case "new":
      voice?.pause();
      pauseLive();
      liveFallback = false;
      selectedId = button.dataset.id;
      mentorOpenedAt = Date.now();
      retry = undefined;
      portfolioOpen = false;
      message();
      render();
      app.querySelector("[aria-current=true], #title")?.focus();
      break;
    case "mic":
      pauseLive();
      if (button.dataset.listening === "true") voice?.stop();
      else voice?.start();
      break;
    case "repeat": {
      pauseLive();
      const last = selected()?.turns?.findLast((turn) => turn.role === "student");
      if (last) voice?.speak(last.text, false);
      break;
    }
    case "pause":
      voice?.pause();
      pauseLive("Live voice paused.");
      voiceStatus("Voice paused.");
      break;
    case "sample":
      sendTurn(document.querySelector('form[data-action=turn] textarea').value, true);
      break;
    case "live":
      voice?.pause();
      if (liveVoice?.active) pauseLive("Live rehearsal ended.");
      else if (selectedId) {
        message();
        liveVoice?.start(selectedId);
      }
      break;
    case "live-mic":
      liveVoice?.toggleMic();
      updateLive();
      break;
    case "end":
      voice?.pause();
      pauseLive();
      run("end", { caseId: selectedId }, "Rehearsal ended.", { focus: "#review-note" });
      break;
    case "portfolio":
      portfolioOpen = !portfolioOpen;
      document.querySelector("#portfolio").hidden = !portfolioOpen;
      button.setAttribute("aria-expanded", String(portfolioOpen));
      if (portfolioOpen) document.querySelector("#portfolio").scrollIntoView();
      break;
    case "print":
      window.print();
      break;
  }
});

voice = window.BansayVoice?.create({
  onInput: useVoiceText, onStatus: voiceStatus, onState: voiceState,
});
liveVoice = window.BansayLive?.create({
  getTicket: (caseId) => request("live/ticket", { caseId }),
  onStatus: (status) => {
    liveStatus = status;
    updateLive();
  },
  onCaption: (role, text, replace) => {
    if (typeof text !== "string" || (role === "teacher" && liveTyped)) return;
    liveCaptions[role] = replace ? text : liveCaptions[role] + text;
    updateLive();
  },
  onTurn: (next) => {
    const focused = document.activeElement?.id;
    const note = document.querySelector("#review-note")?.value;
    if (liveTyped && draft().trim() === liveTyped) draft("");
    liveTyped = "";
    liveCaptions = { teacher: "", student: "" };
    liveFallback = false;
    adopt(next);
    render();
    if (note && document.querySelector("#review-note")) document.querySelector("#review-note").value = note;
    if (focused) document.getElementById(focused)?.focus({ preventScroll: true });
    message();
    return Boolean(document.querySelector("#live-toggle"));
  },
  onDiscard: (error) => {
    liveCaptions = { teacher: "", student: "" };
    liveTyped = "";
    liveStatus = error || "Live turn could not be transcribed. Try again or type.";
    updateLive();
  },
  onError: (error, sampleAvailable) => {
    const caption = liveCaptions.teacher.trim();
    if (caption && !draft()) draft(caption);
    pauseLive("Live voice disconnected.");
    liveFallback = sampleAvailable;
    render();
    message(error || "Live voice is unavailable. Type a response to continue.", true);
  },
});
window.addEventListener("pagehide", () => {
  pauseLive();
  voice?.pause();
});
request("state").then((next) => { adopt(next); render(); }).catch((error) => {
  render();
  message(error.message, true);
});
