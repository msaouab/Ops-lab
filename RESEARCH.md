# What the hiring process looks like

Researched 13 Oct 2026. The company does not publish its tests, so most of this comes from
anonymous candidate reports (Glassdoor, blogs). Treat it as a strong pattern, not a guarantee.

## Official (job posting: Software Developer, R&D, Belgium)

- Process: application screening → **technical test** (coding and problem-solving) →
  recruiter phone call → **technical interview** with one of their developers → offer. About 7–15 days.
- Must have: several programming languages, OOP, relational databases, problem solving,
  learning fast and autonomously, professional English.
- Stack: Python and JavaScript, PostgreSQL through the framework's ORM, GitHub, XML, and an
  in-house component framework for the frontend teams.
- A degree is listed as nice to have; the posting says it is not the most important factor.
- **Visa sponsorship and relocation are offered**; for candidates from abroad the company covers
  the first month's rent and a flight to Belgium.

## Online test (reports)

- Platforms: **Coderbyte** (most recent reports), HackerRank (2021–22). Usually about **1 hour**.
- 2–4 problems, LeetCode **easy to medium**. Topics named: **strings, stacks, dynamic programming**
  (one candidate: "they really seem to like dynamic programming"), graphs, arrays.
- Specific examples: checking that **HTML tags are correctly nested** (valid-parentheses style),
  string manipulation, a medium stack problem.
- Often **one SQL question**, "slightly challenging", with complex queries.
- Full-stack roles: **MCQs on HTML, CSS, JavaScript and React**.
- Scoring can be strict: one candidate scored 16/20 with 13/20 as the pass mark and still read it as a fail (anecdote).

## Logic and English tests (reports)

- Aptitude / IQ-like test: about **28 questions in 30 minutes** (arithmetic, verbal, non-verbal).
- English: **write client-facing emails** about support problems, judged on clarity, tone, professionalism.

## Recruiter call

- About 15–30 minutes: motivation, background, English, availability, relocation.

## Technical interview (reports)

- Long: **2–4 hours** with a senior developer, **thinking out loud**.
- More algorithm problems: **Same Tree**, an **RPN calculator**, easy/medium LeetCode, complexity
  questions ("can you do it in O(n)?").
- **Database design**: car sales, **warehouse inventory with average cost and FIFO costing**,
  data modelling, indexes. SQL: SELECT with WHERE, INNER JOIN with logical operators.
- **Git** questions (e.g. rebase).
- Live full-stack build (one report, 2 h planned, 3 h 20 actual): product page, shopping cart,
  search with filters and **debounce**, CRUD API, database connection, stack of your choice.
- Live Python task: **add a feature to their ERP framework**, with the official documentation allowed.
- Selection rate quoted in one blog (2021): about 15% pass the technical interview.

## How this repo maps to it

| Real step | Where to practise |
|---|---|
| Online coding test | `A2-online-test/01…05`, timed mocks in `07-mock-tests` |
| SQL question | `A2-online-test/06-sql` (PostgreSQL, ERP-shaped tables) |
| Logic + English + web MCQ | `A2-online-test/08-aptitude-english-mcq` |
| Recruiter call | `A4-hr-screen` |
| Technical interview | `A5-technical-interview` (live problems, DB design incl. FIFO / average cost, git) |
| Live build / framework feature | `A3-erp-framework`, `A6-live-coding` |

## Sources

The job posting, the framework's developer tutorials, and candidate reports on Glassdoor,
dev.to, GeeksforGeeks, Dataford and a former employee's blog. Links are kept in my private
notes so this repo stays company-neutral.
