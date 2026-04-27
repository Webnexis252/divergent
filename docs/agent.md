# Agent Instructions (LMS + LLM Platform Edition)

This system is designed to build and operate a scalable AI-powered Learning Management System (LMS) using a 3-layer architecture.

The goal is to combine deterministic backend systems (courses, payments, tracking) with probabilistic AI systems (LLMs, recommendations, chatbots) in a reliable way.

---

# 🧠 The 3-Layer Architecture (LMS Version)

## Layer 1: Directive (Business Logic & Learning Flows)

Location: `directives/`

These define LMS workflows like:

* Course creation and structuring
* Student onboarding
* Lesson delivery
* Doubt resolution system
* AI-powered recommendations
* Mentor assignment
* Payment and enrollment

Each directive includes:

* Objective (e.g. "Resolve student doubt")
* Inputs (student query, course ID, context)
* Tools to call (RAG system, DB queries, APIs)
* Output (response, update DB, notify user)
* Edge cases (no data found, mentor unavailable, etc.)

👉 Directives act like SOPs for running your LMS business.

---

## Layer 2: Orchestration (AI Decision Layer)

This is the intelligent controller (YOU / agent system).

Responsibilities:

* Route user requests:

  * Student asks doubt → call RAG → fallback to mentor
  * Student logs in → fetch dashboard data
  * Payment success → trigger enrollment

* Combine systems:

  * LLM + database + APIs
  * AI + deterministic workflows

* Handle failures:

  * Retry failed operations
  * Escalate to mentor/admin
  * Log issues

* Maintain system intelligence:

  * Improve directives over time
  * Optimize flows (e.g. faster doubt resolution)

👉 This layer ensures AI doesn’t act randomly—it follows structured logic.

---

## Layer 3: Execution (Deterministic Backend)

Location: `execution/`

This layer contains Python scripts and backend services.

Handles:

* Database operations (users, courses, progress)
* Payment processing (Stripe / Razorpay)
* Video/content delivery
* Notifications (email, SMS)
* Real-time systems (chat, attendance)
* AI integrations (OpenAI, embeddings, vector DB)

Examples:

* `create_course.py`
* `enroll_student.py`
* `fetch_dashboard_data.py`
* `resolve_doubt_rag.py`
* `assign_mentor.py`

👉 All critical logic MUST live here (not in LLM).

---

# ⚙️ LMS-Specific System Design

## Core Modules

### 1. Course Engine

* Courses → Chapters → Lessons
* Content types: video, PDF, text
* Drip scheduling
* Progress tracking

### 2. Student System

* Authentication (OTP, OAuth)
* Dashboard (progress, streaks, analytics)
* Learning history

### 3. Doubt Resolution System (AI + Human Hybrid)

Flow:

1. Student submits doubt
2. RAG system searches knowledge base
3. If confidence high → AI answers
4. Else → assign mentor
5. Store resolved doubt for future AI use

### 4. AI Layer (LLM Integration)

* Chatbot (24/7 support)
* Smart recommendations
* Auto quiz generation
* Performance analysis

Tools:

* Vector DB (Chroma / Pinecone)
* Embeddings
* Prompt pipelines

### 5. Community System

* Channels (like Discord)
* Messaging (real-time)
* Role-based access

### 6. Assessment System

* Quiz engine
* Auto grading
* Analytics

### 7. Payments & Enrollment

* Payment gateway integration
* Auto-enrollment
* Subscription handling

---

# 🔁 Self-Annealing Loop (LMS Version)

When system fails:

Example:

* AI gives wrong answer

Steps:

1. Log incorrect response
2. Improve prompt / retrieval
3. Update execution script
4. Update directive
5. Store corrected answer

System improves over time.

---

# 📁 File Organization (LMS Optimized)

* `directives/` → LMS workflows (doubt, enrollment, analytics)
* `execution/` → backend scripts (DB, APIs, AI calls)
* `.tmp/` → logs, scraped data, temporary files
* `frontend/` → React dashboard & UI
* `backend/` → Node/Python services
* `ai/` → RAG pipelines, embeddings, prompts

---

# 🔐 Key Principles for LMS

1. AI is assistive, not authoritative

   * Always allow human override (mentors/admin)

2. Deterministic > Probabilistic

   * Payments, progress, data MUST be deterministic

3. Store everything

   * Doubts, answers, performance → future AI training

4. Modular architecture

   * Each system (AI, course, chat) should be independent

5. Scalability first

   * Design for 100 → 10,000 users

---

# 🚀 Example End-to-End Flow

User Action: "Ask Doubt"

→ Directive: `resolve_doubt.md`
→ Orchestrator:

* Calls `search_vector_db.py`
* If confidence > threshold → call LLM
* Else → call `assign_mentor.py`

→ Execution:

* Fetch data
* Generate response
* Store result

→ Output:

* Answer shown to student
* Logged for analytics

---

# 🧠 Final Philosophy

This LMS is not just a platform.

It is:

* A learning system
* An AI assistant
* A mentor network
* A scalable SaaS business

The LLM provides intelligence.
The backend provides reliability.
The orchestration layer provides control.

Together → you get a powerful, production-ready LMS platform.
