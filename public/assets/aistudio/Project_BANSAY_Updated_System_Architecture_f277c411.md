# Project BANSAY: Reconciled System Architecture & Pilot Specification

## 1. Audit & Reconciliation of Identified Paper and Architecture Gaps

To ensure internal consistency between the *Project BANSAY Startup Proposal* (`Sttp-proposal.pdf`) and the updated hybrid coaching architecture, seven structural, financial, privacy, and evaluation issues are resolved below and integrated throughout this specification.

| # | Identified Gap | Root Analysis | Architectural & Proposal Fix |
| :--- | :--- | :--- | :--- |
| **1** | **6-Minute Mentor Budget Mismatch (Table 6)** | The original proposal budgeted $192\text{ minutes}$ for $32$ uniform $6\text{-minute}$ reviews ($16$ initial + $16$ fresh-case). Under the new workflow, the $2\text{-minute}$ Concept Pack audit applies **only** to the $16$ initial submissions ($16 \times (2 + 4)\text{ min} = 96\text{ min}$), while the $16$ fresh-case checks require **only** a $4\text{-minute}$ transcript review ($16 \times 4\text{ min} = 64\text{ min}$), totaling **$160\text{ minutes}$** ($2\text{ hr } 40\text{ min}$) of direct review rather than $192\text{ minutes}$. Additionally, reviewing a 3–5 turn dialogue in $4\text{ minutes}$ is tighter than the original $6\text{-minute}$ single-turn assumption. | Restated **Table 6** to reflect $160\text{ minutes}$ of direct review plus $200\text{ minutes}$ ($3\text{ hr } 20\text{ min}$) for case preparation, rubric calibration, and second-reviewer quality checks—preserving the $6.0\text{-hour}$ ($\text{PHP } 2,400$) mentor allocation. Added an explicit pilot validation metric testing whether median transcript review time holds at $\le 4.0\text{ minutes}$. |
| **2** | **Post-Use Badge Timing & `< 3 Days` Lead Time** | Concept Packs generate instantly at Step 3, meaning teachers read and prepare with them *before* a mentor audits them up to $2\text{ school days}$ later. Teachers submitting with $< 3\text{ school days}$ lead time never receive a pre-class badge. | Tagged all unverified packs prominently as **`AI Draft (Unverified)`** with explicit usage guardrails (permitted for self-study and AI rehearsal; restricted from the Shared LAC Library and verified MOV claims until badged). Added automatic lookup for pre-existing badged packs in the Shared LAC Library and a best-effort post-class verification queue for $< 3\text{-day}$ submissions. |
| **3** | **PMES Export vs. Non-Evaluative Promise (Table 5)** | Collecting plantilla rank at onboarding and auto-drafting formal DepEd PMES appraisal forms contradicts Table 5's core trust guarantee that BANSAY is non-evaluative coaching rather than administrative surveillance. | Removed mandatory plantilla rank collection at sign-in (defaulting to Proficient with optional user-controlled self-calibration). Disabled automatic PMES form generation; made all portfolio and PMES Means of Verification (MOV) exports strictly **teacher-initiated, opt-in, and under the teacher's sole custody**, never visible to school heads. |
| **4** | **Media Upload Contradiction & Retention Rules** | Claiming video is "strictly browser-local" conflicts with the Phase 2 Classroom Observation Tool (COT) add-on ($\text{PHP } 250/\text{lesson}$), which requires remote video review. Uploaded voice notes and setup photos also lacked retention and portfolio-stripping rules under RA 10173. | Defined a **4-Tier Media Policy**: (1) Core rehearsal video is browser-local ($0\text{ KB}$ upload); (2) Phase 2 COT video upload is named as the **sole exception**, requiring separate informed consent, adult/teacher-only framing, and auto-deletion within $7\text{ days}$; (3) Opt-in voice notes auto-delete within $14\text{ days}$ and are stripped from portfolios; (4) Optional setup photos stay private to the teacher's portfolio vault and purge within $30\text{ days}$ of retention expiry. |
| **5** | **Missing LLM Concept Pack Costs in COGS** | Dynamic Concept Pack generation, 5-criterion LLM-Judge scoring, and $20\%$ regeneration loops were omitted from the $\text{PHP } 300$ pilot data/AI budget and the $\text{PHP } 1,200/\text{year}$ SaaS overhead. | Itemized token inference costs ($\approx \text{PHP } 2.50/\text{uncached cycle}$), splitting the $\text{PHP } 300$ pilot line into **$\text{PHP } 50$ AI Inference** + **$\text{PHP } 250$ Mobile Data/Incidentals**, and updating annual commercial COGS in **Table 7** to **$\text{PHP } 1,800/\text{year}$** ($90.0\%$ margin) for the School-Wide SaaS License and **$\text{PHP } 90/\text{year}$** ($85.0\%$ margin) for the Teacher Pro + CPD Pass. |
| **6** | **Hardcoded `.2` PPST Indicators** | Fixing PPST codes at `.2` (*Proficient*, e.g., `1.1.2`) contradicted Layer 1 career-stage calibration across Beginning, Proficient, Highly Proficient, and Distinguished teachers. | Parameterized all PPST indicators as **`{domain}.{strand}.{stage}`** (`.1` Beginning, `.2` Proficient, `.3` Highly Proficient, `.4` Distinguished) and mapped behavioral descriptors across all four career stages. |
| **7** | **Incomplete Pilot Metrics & Table Mismatch** | The prior draft claimed "five controls and three metrics" but merged only three of each into one table, and left **Pre-Rehearsal Diagnostic Lift** without a numeric threshold. | Separated into two complete tables: **All 5 Engineering Controls** (Table 4) and **All 4 Falsifiable Pilot Metrics** (Table 5), assigning a concrete threshold to Pre-Rehearsal Diagnostic Lift ($\ge 75\%$ error elimination or $\ge +1.0\text{ point}$ gain on a $0\text{–}3$ rubric) alongside the new $\le 4.0\text{-minute}$ transcript review benchmark. |

---

## 2. Reconciled End-to-End 8-Step Coaching & Verification Workflow

```text
[1. Low-Data Onboarding] -> [2. Deadline Intake + Optional Baseline] -> [3. 10-Min AI Draft Concept Pack]
                                                                                     |
[8. Shared LAC & Opt-In Portfolio] <- [7. Live Class & Log] <- [6. Revision + Fresh Case] <- [5. 6-Min Mentor Dual Review] <- [4. Multi-Turn AI Rehearsal]
```

### Step 1: Privacy-First Profile & Low-Data Onboarding
* **User Action:** Upon registration, the teacher enters their **Name**, **College Degree/Major** (e.g., MAPEH, English, Social Studies), **School/Division**, and **Preferred Coaching Language** (English, Filipino, or Cebuano), and toggles **Low-Data Mode**.
* **Career-Stage Privacy Rule:** Plantilla rank is **not** required at onboarding. The system defaults to the **Proficient** career stage (`.2` PPST descriptors) while allowing the teacher to privately adjust their self-calibration tier (`.1` Beginning through `.4` Distinguished) in settings.
* **Design Rationale:** Removes repetitive intake friction and anchors every lesson bridge in the teacher's academic major without collecting sensitive HR rank data that could signal administrative evaluation.

### Step 2: Deadline-Aware Lesson Intake & Optional Baseline Capture
* **User Action:** The teacher selects the **Subject** (Science, Mathematics, or English), **Grade Level**, **DepEd Competency or Custom Topic**, and **Scheduled Class Date**. Optionally, they attach a compressed photo of handwritten notes or available materials (teacher/materials-only, no student faces) and toggle **"Baseline First"** to record their initial explanation before viewing AI scaffolding.
* **System Behavior & Lead-Time Triage:**
  * **$\ge 3\text{ School Days}$ Before Class:** Eligible for guaranteed pre-class specialist review within the $2\text{-school-day}$ SLA.
  * **$< 3\text{ School Days}$ Before Class:** Immediately checks the **Shared LAC Peer Library** for an existing **Mentor-Verified Concept Pack** matching the exact competency. If none exists, the teacher still receives an instant `AI Draft` pack and AI rehearsal access, while any mentor submission is routed to a **Best-Effort / Post-Class Verification Queue** without promising pre-class turnaround.
  * **No human mentor is assigned at Step 2**, preventing dead mentor allocations if a teacher drops off during self-study.

### Step 3: Interactive 10-Minute Concept Pack (`AI Draft` vs. `Mentor-Verified`)
* **User Action:** The teacher completes an offline-cacheable, text-first **Concept Pack** ($\approx 10\text{ minutes}$) tailored to their college degree:
  1. **The Big Idea ($\le 3$ Sentences):** Plain-language core concept paired with a **Specialty-to-Subject Bridge** and an explicit **`where_analogy_breaks_down`** boundary.
  2. **2–3 Contrastive Worked Examples:** Step-by-step causal reasoning (*why* it works) paired with a contrastive non-example (e.g., sugar in water vs. sand in water).
  3. **Interactive Misconception Check:** Diagnostic multiple-choice prompt requiring the teacher to identify flawed student mental models (e.g., *"The sugar disappeared"* or *"The sugar turned into water"*).
  4. **3-Question Quick Self-Check:** Brief formative check (e.g., conservation of mass upon dissolving) with instant automated feedback.
  5. **Ready-to-Use Improvised Demo:** Household/sari-sari store materials list, steps, safety protocol (e.g., sun or supervised gentle heat instead of open flame), and expected observations.
  6. **Bridge to Rehearsal:** Transition prompt launching the simulated student dialogue.
* **Verification Status Labeling & Guardrails:**
  * Freshly generated packs display a persistent **`AI Draft (Unverified)`** banner and watermark.
  * **Permitted Uses (`AI Draft`):** Individual teacher self-study, conceptual warm-up, and private AI student rehearsal.
  * **Restricted Uses (`AI Draft`):** Cannot be published to the cross-school Shared LAC Peer Library, cannot be exported as mentor-verified portfolio evidence, and carries an explicit reminder to cross-check safety steps and formulas against the DepEd Teacher's Guide before live classroom delivery if class occurs before mentor review.

### Step 4: Multi-Turn Simulated Learner Rehearsal (Tiered Media Capture)
* **User Action:** In a private practice workspace, the teacher conducts a **3-to-5 turn dialogue** with an AI-simulated student, responding to an opening conceptual question and realistic follow-up pushback (e.g., *"What if we use a cloth with really, really tiny holes?"*).
* **System Behavior:** Browser speech-to-text transcription allows the teacher to rehearse aloud and edit misheard scientific terms before sending. Default submission uploads **only the structured multi-turn text transcript ($< 10\text{ KB}$)** alongside optional compressed audio ($\approx 150\text{ KB/min}$), keeping webcam video strictly browser-local ($0\text{ KB}$ upload).

### Step 5: Asynchronous Mentor Routing & 6-Minute Dual Verification
* **User Action (Teacher):** Clicks **"Submit Rehearsal for Review,"** routing the package to a matched human subject specialist (filtered by Subject, Language, and Class Date urgency, with automated backup escalation if a slot nears expiration).
* **User Action (Mentor — $\approx 6\text{ Minutes}$ Initial / $\approx 4\text{ Minutes}$ Fresh Case):** Within **$2\text{ school days}$**, the specialist performs:
  1. **Concept Pack Audit ($\approx 2\text{ minutes}$ — Initial Submission Only):** Inspects the `AI Draft` Concept Pack for scientific accuracy, makes inline edits if an analogy overreaches, and clicks **"Verify Guide"** to upgrade its status to **`Mentor-Verified`**.
  2. **Multi-Turn Transcript Review ($\approx 4\text{ minutes}$):** Evaluates the 3–5 turn student-teacher exchange (and plays the optional short voice note if attached) against a calibrated subject rubric, returning **one focused, practical correction** and one actionable teaching move.

### Step 6: Guided Revision & Independent Fresh-Case Transfer Check
* **User Action:** The teacher sees the **`Mentor-Verified` Badge** on their Concept Pack, reads the single focused correction, and completes:
  1. **Targeted Revision (Optional Local Redo):** Revises their explanation and may optionally re-run the initial simulated exchange locally to practice delivery.
  2. **Mandatory Independent Fresh Case:** Answers a **new, structurally comparable student scenario** independently without model hints.
* **Mentor Fresh-Case Check ($\approx 4\text{ Minutes}$):** The mentor evaluates the fresh-case transcript ($4\text{ minutes}$, with **no** Concept Pack audit required) to confirm that the teacher applied the correction without introducing new errors.

### Step 7: Live Classroom Execution & Voluntary Micro-Reflection
* **User Action:** The teacher delivers the lesson using the **`Mentor-Verified`** Concept Pack and revised explanation, optionally logging a 2-minute post-class reflection or materials-only setup photo. Classroom implementation logs remain strictly separated from simulated rehearsal scores.

### Step 8: Shared LAC Peer Library & Teacher-Custody Portfolio Export
* **Cross-School Shared LAC Peer Library:** Only packs stamped **`Mentor-Verified`** (after stripping teacher identities) enter the searchable cross-school repository, giving future teachers instant access to pre-verified guides even when they have $< 3\text{ days}$ lead time.
* **Teacher-Custody Teaching Evidence Portfolio:** Baseline attempts, verified Concept Packs, checked transcripts, mentor corrections, fresh-case responses, and classroom reflections compile into a private portfolio. Any export to DepEd PMES Means of Verification (MOVs) or partner-accredited **PRC CPD** applications is **100% teacher-initiated and opt-in**, never shared with school heads or administrators.

---

## 3. Restated Financial & Operational Unit Economics

### 3.1 Pilot Direct Delivery Cost Reconciliation (Restated Table 6)

In an 8-teacher, 4-week pilot completing 2 coaching cycles per teacher ($16$ initial submissions + $16$ fresh-case checks = $32$ review actions):
* **Initial Submission Reviews ($16\text{ actions}$):** $16 \times (2\text{ min Concept Pack audit} + 4\text{ min multi-turn transcript review}) = \mathbf{96\text{ minutes}}$ ($1\text{ hr } 36\text{ min}$).
* **Fresh-Case Transfer Reviews ($16\text{ actions}$):** $16 \times 4\text{ min transcript review (no pack audit)} = \mathbf{64\text{ minutes}}$ ($1\text{ hr } 04\text{ min}$).
* **Total Direct Review Time:** $96 + 64 = \mathbf{160\text{ minutes}}$ ($2\text{ hr } 40\text{ min}$), saving $32\text{ minutes}$ compared to the original $192\text{-minute}$ estimate.
* **Case Prep, Rubric Calibration & Quality Sampling Buffer:** Expanded from $168\text{ minutes}$ to **$\mathbf{200\text{ minutes}}$** ($3\text{ hr } 20\text{ min}$), preserving the fixed **$6.0\text{-hour}$ ($360\text{-minute}$)** specialist commitment per cohort.
* **Itemized AI Inference Cost:** At flash-tier API rates ($\approx 2,500\text{ input} + 1,800\text{ output tokens}$ for Concept Pack generation, $\approx 2,500\text{ tokens}$ for the 5-criterion LLM Judge, $+20\%$ regeneration overhead, and $\approx 3,000\text{ tokens}$ for multi-turn AI rehearsal), uncached AI compute averages **$\approx \text{PHP } 2.50\text{ per cycle}$** ($\approx \text{PHP } 40$ across 16 cycles, budgeted at **$\text{PHP } 50$** with buffer), leaving **$\text{PHP } 250$** for teacher mobile-data stipends and SMS alerts inside the $\text{PHP } 300$ non-labor line.

**Restated Table 6. Estimated Direct Delivery Cost (COGS) of One Four-Week Pilot Cohort**

| Pilot Expense Line | Updated Basis & Time / Token Allocation | Estimated Value | Cash Outlay (If Labor Donated) |
| :--- | :--- | :--- | :--- |
| **Subject Mentor Labor** | $6.0\text{ hr } (360\text{ min}) \times \text{PHP } 400/\text{hr}$: $96\text{ min}$ initial reviews ($16 \times [2\text{ min pack audit} + 4\text{ min transcript}]$) + $64\text{ min}$ fresh-case reviews ($16 \times 4\text{ min transcript}$) + $200\text{ min}$ case prep, calibration & 2nd-reviewer sampling | $\text{PHP } 2,400$ | $\text{PHP } 0$ |
| **Cohort Coordination** | $4.0\text{ hr} \times \text{PHP } 250/\text{hr}$ (intake triage, SLA tracking, backup routing & closeout log) | $\text{PHP } 1,000$ | $\text{PHP } 0$ |
| **AI Inference (LLM Compute)** | $16\text{ cycles} \times \approx \text{PHP } 2.50/\text{cycle}$ (Concept Pack generation, 5-criterion LLM Judge, $20\%$ regeneration, 3–5 turn AI student & fresh-case prompts) + $\text{PHP } 10$ buffer | $\text{PHP } 50$ | $\text{PHP } 50$ |
| **Mobile Data & Incidentals** | Prepaid mobile-data allowance & SMS deadline notifications for 8 pilot teachers | $\text{PHP } 250$ | $\text{PHP } 250$ |
| **Total Cohort Direct COGS** | **16 completed cycles** ($\text{PHP } 231.25/\text{cycle}$ at $100\%$ completion; $\text{PHP } 308.33/\text{cycle}$ at $75\%$ / $12\text{ cycles}$) | **$\text{PHP } 3,700$** | **$\text{PHP } 300$** |

### 3.2 Updated Commercial Unit Economics (Restated Table 7)

Accounting explicitly for Concept Pack generation, LLM-Judge verification, and regeneration overhead updates annual SaaS and Teacher Pro variable COGS while preserving high gross margins through Shared LAC Library cache hits (where pre-verified packs incur $\text{PHP } 0$ generation or judge tokens):

**Restated Table 7. Pilot Baseline vs. Updated Commercial Unit-Economics Hypotheses**

| Tier / Offer Structure | Target Buyer & Budget Line | Updated Direct Variable COGS | Target Price | Unit Gross Profit | Unit Gross Margin | Validation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Pilot Cohort (Baseline)** | Host school / STTP+ R&D trial | $\text{PHP } 3,700$ ($\text{PHP } 300$ cash) | $\text{PHP } 3,700$ | $\text{PHP } 0$ ($-\text{PHP } 300$ cash) | $0.0\%$ | Active 4-week pilot baseline |
| **Free Preparation Tier (B2C)** | Individual teachers ($2\text{ cycles/mo}$) | $\approx \text{PHP } 5.00/\text{user/mo}$ ($2\text{ uncached packs + judge + AI chat}$) | $\text{PHP } 0$ | $-\text{PHP } 5.00/\text{mo}$ | Acquisition CAC | Active acquisition funnel |
| **Mentored Cohort (Commercial)** | DepEd SDO (HRTD), LGU (SEF), Private Schools | $\text{PHP } 3,700/\text{cohort}$ ($6\text{ hr}$ mentor + $4\text{ hr}$ coord + $\text{PHP } 300$ AI/data) | $\text{PHP } 12,000/\text{cohort}$ ($\text{PHP } 1,500/\text{teacher}$) | $\text{PHP } 8,300$ | $69.2\%$ | Pricing hypothesis (Sec. 5.1.2) |
| **School-Wide SaaS License** | Public/Private High Schools (MOOE LAC/ICT) | $\text{PHP } 1,800/\text{school/yr}$ ($30\text{ teachers} \times 20\text{ cycles/yr}$ at $50\%$ LAC cache hit rate: $\text{PHP } 1,200$ AI + $\text{PHP } 600$ cloud/audio) | $\text{PHP } 18,000/\text{school/yr}$ | $\text{PHP } 16,200$ | $90.0\%$ | Pricing hypothesis (Sec. 5.1.2) |
| **Teacher Pro + CPD Pass** | Individual teachers (optional B2C) | $\text{PHP } 90/\text{teacher/yr}$ ($24\text{ cycles}$ AI generation/judge + PDF MOV assembly) | $\text{PHP } 599/\text{teacher/yr}$ | $\text{PHP } 509$ | $85.0\%$ | Contingent on CPD accreditation |

---

## 4. Media Capture, Retention & RA 10173 Privacy Policy

To resolve all ambiguity regarding video uploads, temporary audio/image storage, and Data Privacy Act (RA 10173) compliance, BANSAY enforces a strict **4-Tier Media Lifecycle**:

| Media Type | Upload & Storage Rule | Explicit Consent & Framing Requirement | Retention & Auto-Deletion Window | Teaching Evidence Portfolio Inclusion |
| :--- | :--- | :--- | :--- | :--- |
| **1. Core Rehearsal Webcam Video** (Step 4) | **Browser-Local Only ($0\text{ KB}$ uploaded).** Held exclusively in local browser memory (`sessionStorage` / local Blob URL) for teacher self-review. | Covered by standard rehearsal terms; never transmitted to BANSAY servers or mentors. | **Purged immediately ($0\text{ hours}$)** upon closing or refreshing the browser session. | **Excluded (Never Uploaded).** |
| **2. Phase 2 COT Quick-Review Video** ($\text{PHP } 250/\text{lesson}$ Paid Add-On — **Single Exception**) | **Encrypted Server Upload.** Uploaded strictly when a teacher opts into the paid Phase 2 Classroom Observation Tool (COT) quick-review service. | **Requires a separate, explicit informed consent modal** prior to upload, confirming **teacher-only / materials-only framing** (no identifiable learners in frame, per Table 1). | **Auto-deleted within $7\text{ calendar days}$** after the mentor submits the COT feedback note. | **Video Stripped.** Only the mentor's written COT feedback summary is saved to the portfolio; the video file is purged. |
| **3. Opt-In Rehearsal Voice Notes** (Step 4, $\approx 150\text{ KB/min}$ Opus Audio) | **Encrypted Server Upload.** Uploaded only when the teacher toggles audio recording for vocal emphasis (e.g., English) or mobile convenience. | Covered by explicit microphone permission and submission consent; accessible only to the assigned mentor. | **Auto-deleted within $14\text{ calendar days}$** of submission (or immediately upon cycle closeout). | **Audio Stripped.** Only the teacher-verified text transcript is retained in the portfolio. |
| **4. Optional Setup / Lesson Photos** (Steps 2 & 7, $\le 1\text{ MB}$ compressed) | **Encrypted Private Portfolio Vault.** Uploaded when attaching handwritten notes or improvised lab materials. | Teacher confirms **no student faces or personal learner data** appear in the image before upload. | Retained in the teacher's private account for the active school year; **purged within $30\text{ days}$** of account deletion or retention expiry. | **Included (Opt-In).** Retained as static visual evidence inside the teacher's private portfolio unless deleted by the user. |

---

## 5. Career-Stage Calibrated DepEd PMES & PPST LLM Pipeline

To align with **DepEd Memorandum No. 089, s. 2025** (*Multi-Year PMES for Teachers, SY 2025–2026 to SY 2027–2028*) and **DepEd Order No. 010, s. 2024** (*MATATAG Curriculum Rollout*), PPST indicator codes are parameterized as **`{domain}.{strand}.{stage}`** rather than hardcoded at `.2`:

### 5.1 Dynamic Career-Stage PPST Parameterization

| Career Stage Suffix | Target Teacher Group (Optional Self-Selected Calibration) | Dynamic Indicator Codes (`{domain}.{strand}.{stage}`) | LLM Pedagogical & Rubric Calibration |
| :--- | :--- | :--- | :--- |
| **`.1` (Beginning)** | Newly hired / Pre-service / Teacher I entry | `1.1.1`, `1.2.1`, `1.5.1`, `2.1.1`, `4.1.1`, `5.1.1` | Focuses on foundational content accuracy, clear step-by-step scaffolding, basic safety awareness, and avoiding direct conceptual errors. |
| **`.2` (Proficient — Default)** | Teacher I–III / Teacher IV–VII (PMES Annex C-1/C-2) | `1.1.2`, `1.2.2`, `1.5.2`, `2.1.2`, `4.1.2`, `5.1.2` | Focuses on cross-disciplinary bridges (`1.1.2`), research-based misconception diagnosis (`1.2.2`), HOTS questioning (`1.5.2`), safe improvised setups (`2.1.2`), sequenced delivery (`4.1.2`), and diagnostic checks (`5.1.2`). |
| **`.3` (Highly Proficient)** | Master Teacher I–II (PMES Annex C-3) | `1.1.3`, `1.2.3`, `1.5.3`, `2.1.3`, `4.1.3`, `5.1.3` | Prompts modeling of effective cross-curricular applications for colleagues, evaluating alternative student solution paths, and generating reusable LAC mentoring artifacts. |
| **`.4` (Distinguished)** | Master Teacher III–IV | `1.1.4`, `1.2.4`, `1.5.4`, `2.1.4`, `4.1.4`, `5.1.4` | Emphasizes systemic curriculum adaptation, multi-level misconception synthesis, and division-wide pedagogical leadership exemplars. |

### 5.2 Five-Layer Constrained Generation & Non-Evaluative Export Architecture

1. **Context Injection Layer:** Binds the selected DepEd competency code, teacher college major, preferred language (English/Filipino/Cebuano), and optional career-stage suffix (`.1`–`.4`).
2. **RAG Curriculum Grounding Layer:** Routes **Kindergarten–Grade 9** requests to official **MATATAG Curriculum Guides** (DO No. 010, s. 2024) and **Grade 10 / Senior High School (Grades 11–12)** requests to active **K to 12 Curriculum Guides / MELCs** (sourced from DepEd LRMDS), alongside PPST COT rubric descriptors and BANSAY's **`Mentor-Verified` Shared LAC Library**.
3. **Constrained JSON Decoding Layer:** Enforces structured generation (`big_idea`, `specialty_bridge`, `where_analogy_breaks_down`, `contrastive_examples`, `misconception_distractors`, `diagnostic_items`, `improvised_demo`, `safety_note`, `rehearsal_seed`) tagged with dynamic `{domain}.{strand}.{stage}` metadata.
4. **Automated Post-Generation Judge Layer:** Validates sentence length ($\le 3$ sentences for Big Idea), mandatory analogical boundary and safety clauses, and scores the pack on a $0\text{–}3$ rubric before serving.
5. **Opt-In, Teacher-Custody MOV Export Layer (Non-Evaluative Wall):**
   * BANSAY **never** auto-populates or transmits PMES forms to school heads, principals, or department coordinators.
   * All baseline mistakes, initial rehearsals, and mentor critiques remain strictly confidential inside the teacher's private vault.
   * Only when a teacher manually initiates an export does BANSAY package **non-stigmatizing, finalized artifacts** (`Mentor-Verified` Concept Packs, optional post-class reflections, and LAC/CPD completion summaries) formatted to assist the teacher in compiling their personal **PMES Annex A (Reflection Journal)** or self-selected MOV portfolio. School administrators receive **only** anonymized, cohort-level participation counts and aggregated topic-gap trends.

---

## 6. Concept Pack Viability Controls & Falsifiable Pilot Metrics

To guarantee competitive baseline quality over generic chatbots and establish rigorous go/no-go evidence during the 4-week field pilot, engineering controls are separated cleanly from quantitative pilot benchmarks:

### 6.1 Five (5) Pre-Delivery Concept Pack Engineering Controls (Table 4)

| # | Engineering Control | Technical Specification | Pedagogical & Operational Purpose |
| :--- | :--- | :--- | :--- |
| **1** | **Analogical Boundary Guardrail** | Mandatory `where_analogy_breaks_down` field paired with every Specialty-to-Subject Bridge (e.g., noting that dancers choose positions whereas dissolved sugar particles move randomly). | Prevents cross-disciplinary metaphors from introducing new scientific misconceptions. |
| **2** | **Contrastive Causal Worked Examples** | Requires at least one positive example paired with a contrastive non-example (e.g., sugar in water vs. sand in water), isolating causal theory (*why*) from classroom procedure (*how*). | Solves the core Iligan City interview gap where teachers can run an activity but struggle to explain *why* it works. |
| **3** | **Cognitive-Conflict Misconception & Self-Check Items** | Generates distractors from documented student mental models, requiring the teacher to diagnose *why* a learner holds the misconception before viewing the refutation. | Builds diagnostic empathy and active retrieval in $< 3\text{ minutes}$ prior to AI student rehearsal. |
| **4** | **Resource-Constrained Local Materials Whitelist** | Restricts improvised demos to household/sari-sari store items (water, salt, sugar, strainer, cloth, saucer, sunlight) unless lab equipment is explicitly toggled on. | Guarantees $100\%$ feasibility in remote or under-resourced public high schools. |
| **5** | **Automated 5-Criterion LLM-Judge Gate** | Evaluates every generated pack on a $0\text{–}3$ scale across *Conceptual Accuracy*, *Analogy Fidelity*, *Misconception Depth*, *Local Feasibility*, and *Mobile Scannability*; auto-regenerates (up to $2\times$) if any score $< 2$. | Enforces a deterministic minimum quality floor before displaying an `AI Draft` pack to the teacher. |

### 6.2 Four (4) Falsifiable Pilot Validation Metrics (Table 5)

| # | Pilot Metric | Quantitative Success Threshold | Measurement Method & Data Source |
| :--- | :--- | :--- | :--- |
| **1** | **Concept Pack Mentor Edit Rate** | **$\le 20\%$ substantive rewrites** ($\le 3\text{ of }16$ initial packs require core conceptual or analogy rewrites before receiving the Verification Badge). | Logged diff between the generated `AI Draft` JSON and the mentor-approved **`Mentor-Verified`** version during Weeks 2–3. |
| **2** | **Pre-Rehearsal Diagnostic Lift** | **$\ge 75\%$ error elimination** ($\ge 12\text{ of }16$ cycles eliminate baseline factual/definitional errors after completing the Concept Pack and prior to human mentor feedback) **OR $\ge +1.0\text{ point}$ mean gain** on a $0\text{–}3$ conceptual accuracy rubric. | Blinded comparison of optional **"Baseline First"** responses (Step 2) and pre-pack self-check scores against Turn 1 of the post-pack AI student rehearsal (Step 4). |
| **3** | **Mentor 4-Minute Transcript Review Compliance** | **Median transcript review time $\le 4.0\text{ minutes}$** (and total initial submission review $\le 6.0\text{ minutes}$), with **$\ge 81.25\%$ ($\ge 13\text{ of }16$)** returned within the $2\text{-school-day}$ SLA. | Timestamped mentor queue logs across all $16$ initial multi-turn reviews and $16$ fresh-case reviews. |
| **4** | **Independent Fresh-Case Transfer Rate** | **$\ge 62.5\%$ ($\ge 5\text{ of }8$ cohort teachers)** demonstrate measurable rubric improvement on an unseen, comparable student scenario without introducing a consequential subject error. | Blinded second-reviewer scoring comparing initial baseline attempts against independent fresh-case responses in Week 4. |