import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { INITIAL_CASES } from "./src/data/bansayData.ts";
import { register, createSession } from "./src/server/auth.ts";
import { createLessonCaseRecord } from "./src/server/bansayRepo.ts";
import { openDatabase } from "./src/server/db.ts";

const temp = mkdtempSync(join(tmpdir(), "bansay-demo-"));
const dbPath = join(temp, "test.sqlite");
const db = openDatabase(dbPath);
const teacher = register(db,{email:"demo@example.test",password:"fixture-password",degree:"Education",displayName:"Demo Teacher"});
const token = createSession(db,teacher.id);
const lesson = createLessonCaseRecord(db,teacher,{
  subject:"Mathematics",topic:"Rates in daily life",gradeLevel:"Grade 8",language:"en",teacherMajor:"Education",classDate:"2027-01-01",careerStage:"1",
  startingMaterial:"",baselineFirst:false,baselineExplanation:"",submissionFormat:"live-ai",usesLabEquipment:false,packStatus:"ai-draft",support:INITIAL_CASES[0].support,
});
const before = db.prepare("SELECT COUNT(*) AS total FROM pilot_audit_logs").get().total;
const base = "http://127.0.0.1:48733";
const server = spawn(process.execPath, ["server.ts","--preview"], { windowsHide:true, stdio:["ignore","inherit","inherit"],
  env:{...process.env,PORT:"48733",NODE_ENV:"production",DEMO_MODE:"true",BANSAY_DATABASE_PATH:dbPath,OPENROUTER_API_KEY:"",GEMINI_API_KEY:"",VITE_BANSAY_PHASE_2:"true"},
});
const edge = spawn("C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",["--headless=new","--remote-debugging-port=48734","--user-data-dir="+join(temp,"edge"),"--disable-gpu","--no-first-run","about:blank"],{windowsHide:true,stdio:"ignore"});
const pause = ms => new Promise(r=>setTimeout(r,ms));
async function wait(fn,label) {
  for (let i=0;i<150;i++) { const result=await fn(); if(result) return result; await pause(80); }
  throw Error("Timed out: "+label);
}
let socket;
try {
  const tab = await wait(async()=>(await fetch("http://127.0.0.1:48734/json/list").then(r=>r.json()).catch(()=>[]))[0],"browser");
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener("open",resolve,{once:true});socket.addEventListener("error",reject,{once:true});});
  let id=0;
  const command = (method,params={}) => new Promise((resolve,reject)=>{
    const key=++id;
    const receive=e=>{const message=JSON.parse(e.data);if(message.id!==key)return;socket.removeEventListener("message",receive);if(message.error)reject(message.error);else resolve(message.result);};
    socket.addEventListener("message",receive);
    socket.send(JSON.stringify({id:key,method,params}));
  });
  const evaluate = async expression => {
    const response=await command("Runtime.evaluate",{expression,returnByValue:true});
    if(response.exceptionDetails) throw Error(JSON.stringify(response.exceptionDetails));
    return response.result.value;
  };
  const has=text=>evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`);
  const button=text=>evaluate(`[...document.querySelectorAll('button')].find(element => element.getClientRects().length && element.textContent.trim() === ${JSON.stringify(text)})?.click()`);
  await wait(()=>fetch(base+"/api/bansay/auth/me").then(r=>r.status===401).catch(()=>false),"app");
  socket.addEventListener("message", ({data})=>{ const m=JSON.parse(data); if(m.method==="Runtime.exceptionThrown") console.log(m.params.exceptionDetails.exception?.description); });
  await command("Runtime.enable");
  await command("Page.enable");
  await command("Network.enable");
  await command("Network.setBlockedURLs",{urls:["*fonts.googleapis.com*","*fonts.gstatic.com*"]});
  await command("Page.addScriptToEvaluateOnNewDocument",{source:`if(location.origin===${JSON.stringify(base)}) sessionStorage.setItem("bansay_session_token_v1",${JSON.stringify(token)});
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      if (String(args[0]) !== "/api/bansay/workspace" || !response.ok) return response;
      const data = await response.json();
      return new Response(JSON.stringify({ ...data, rehearsalDemo: true }), { headers: { "Content-Type": "application/json" } });
    };`});
  console.log(await command("Page.navigate",{url:base}));
  await wait(()=>has("Back") .then(()=>evaluate("!!document.querySelector('nav[aria-label=Main]')")),"workspace").catch(async err=>{ console.log(await evaluate("JSON.stringify([location.href,document.readyState,document.body.innerText])")); throw err; });
  await evaluate("document.querySelector('nav [aria-label=\"Rehearsal & Review\"]').click()");
  await wait(()=>has("Good day, Teacher Demo Teacher!"),"greeting");
  assert.equal(await has("Sample Mentor"),false);
  assert.ok(await has("A mentor will be assigned when you submit."));
  await evaluate("document.querySelector('[aria-label=Attachments]').click()");
  assert.ok(await has("Attach audio"));

  assert.equal(await evaluate("document.querySelector('[aria-label=\"Conversation options\"], [aria-label=\"Dictate a message\"]')"),null);
  await evaluate("document.querySelector('[aria-label=\"Close attachments\"]').click()");
  await evaluate(`(() => {
    const input = document.querySelector('textarea[aria-label="Your response"]');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(input, "Compare the distance covered in the same time.");
    input.dispatchEvent(new Event("input",{bubbles:true}));
  })()`);
  await evaluate("document.querySelector('[aria-label=\"Send message\"]').click()");
  await wait(()=>has("Submit to mentor"),"submit available");
  await button("Submit to mentor");
  await wait(()=>evaluate("!!document.querySelector('dialog[open]')"),"confirmation");
  assert.ok(await has("Expected review time."));
  await button("Cancel");
  assert.equal(await has("Sample Mentor"),false);
  await button("Submit to mentor");
  await evaluate("[...document.querySelectorAll('dialog[open] button')].find(b=>b.textContent.trim()==='Submit to mentor').click()");
  await wait(()=>has("Finding a mentor..."),"finding status");
  await wait(()=>has("Pending review"),"pending status");
  const pending=Date.now();
  assert.ok(await has("Sample Mentor (Mathematics)"));
  assert.ok(await has("Sample Backup (Mathematics)"));
  assert.ok(await has("Start another practice"));
  assert.ok(await has("Thank you, Teacher Demo Teacher!"));
  await wait(()=>has("Review available"),"ready");
  assert.ok(Date.now()-pending>=5700);
  assert.equal(await evaluate("document.querySelector('nav [aria-label=\"Rehearsal & Review\"]').getAttribute('aria-description')"),"1 mentor note ready");
  await button("Review available");
  await wait(()=>has("Annotated transcript"),"sample review");
  assert.ok(await has("Compare the distance covered in the same time."));
  assert.ok(await has("Sample review for demo purposes."));
  await button("Save to portfolio");
  assert.ok(await has("Saved to demo portfolio"));
  assert.equal(db.prepare("SELECT submitted_for_review FROM mentor_reviews WHERE session_id=?").get(lesson.id).submitted_for_review,0);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM rehearsal_turns WHERE session_id=?").get(lesson.id).total,1);
  assert.equal(db.prepare("SELECT COUNT(*) AS total FROM pilot_audit_logs").get().total,before);
  console.log("Browser confirmed paperclip controls, confirm/cancel, assignment delay, six-second local review, sidebar badge, annotated transcript, and zero demo writes.");
} finally { socket?.close(); edge.kill(); server.kill(); db.close(); }
