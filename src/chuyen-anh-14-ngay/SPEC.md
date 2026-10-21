# Spec: Bộ 14 buổi ôn tiếng Anh hướng chuyên — học sinh lớp 7 (Hà Nội)

Learner: Vietnamese grade-7 student (12–13 y.o.), entry level unknown (likely A2–B1). Long-term goal: chuyên Anh grade-10 entrance (Hà Nội: Chuyên Ngoại ngữ, Ams/Chu Văn An/Nguyễn Huệ, Chuyên Sư phạm) in June 2029. Target by end of grade 7 ≈ B1. These 14 days bridge A2+ → B1 and introduce chuyên exam formats gently.

Daily session ≈ 30 minutes on paper + ~10 minutes web check. One session per day, 14 days.
Day 7 and Day 14 are REVIEW days (no new vocab/grammar).

Instructions to the student are in Vietnamese (friendly, "con" / "em"? → use "em"), exercise content in English.
All content must be ORIGINAL (do not copy from published books). British or American spelling: use British (colour, organise) consistently.

## Syllabus (fixed — do not change words, so spiral review works across files)

| Day | Theme (EN / VI) | Grammar | Word formation | Phrasal verbs | Vocab (8) | Exam format (D) |
|---|---|---|---|---|---|---|
| 1 | School & learning / Trường học và việc học | Present simple vs present continuous; stative verbs | Nouns with -tion/-ation, -ment | catch up (with), drop out (of) | curriculum, assignment, revise, concentrate, attend, knowledge, improve, encourage | Sentence completion (MCQ) |
| 2 | Hobbies & free time / Sở thích | Past simple vs past continuous; used to | Adjectives -ful / -less | take up, give up | leisure, collect, enthusiastic, spare, challenge, creative, relax, membership | Synonyms (MCQ) |
| 3 | Environment / Môi trường | Present perfect vs past simple (for, since, already, yet, ever, never) | Adjectives -al, -ous | cut down (on), throw away | pollution, protect, waste, recycle, species, climate, reduce, harmful | Antonyms (MCQ) |
| 4 | Technology / Công nghệ | Future: will, be going to, present continuous for arrangements | Adverbs -ly | switch off, keep up with | device, invent, access, digital, rely, screen, update, convenient | Dialogue completion (MCQ) |
| 5 | Health & fitness / Sức khoẻ | Comparatives & superlatives; too / enough; so / such | Negative prefixes un-, im-, in-, dis- | work out, get over | diet, exercise, habit, nutritious, injury, energy, balanced, avoid | Sentence transformation – closest meaning (MCQ) |
| 6 | Travel & transport / Du lịch và đi lại | Modals: can/could/be able to; must/have to; should | People nouns -er/-or/-ist/-ian | set off, look forward to | journey, destination, crowded, explore, delay, passenger, abroad, souvenir | Cloze passage (MCQ, 4 gaps) |
| 7 | REVIEW 1 (days 1–6) | — | — | — | — | mixed |
| 8 | Media & communication / Truyền thông | Passive voice (present simple, past simple) | Adjectives -able/-ible, -ive | find out, come across | article, audience, broadcast, advertise, reliable, opinion, inform, influence | Sentence completion (collocations make/do) |
| 9 | Food & culture / Ẩm thực và văn hoá | Countable/uncountable; much/many/a few/a little/plenty of; articles a/an/the/zero | Nouns -ness, -ity | eat out, run out of | tradition, festival, ingredient, recipe, flavour, custom, celebrate, local | Synonyms (MCQ) |
| 10 | Work & jobs / Công việc và nghề nghiệp | Conditionals type 0, 1, 2 | Verbs -ise, -ify, -en | carry on, turn down | career, skill, employ, experience, responsible, apply, colleague, ambition | Dialogue completion (MCQ) |
| 11 | People & relationships / Con người và các mối quan hệ | Relative clauses: who, which, that, whose, where (defining & non-defining) | Nouns/adjectives -ence/-ance, -ent/-ant | get on (well) with, look up to | personality, generous, honest, support, argue, trust, sympathetic, respect | Antonyms (MCQ) |
| 12 | Science & inventions / Khoa học và phát minh | Reported speech: statements, tense backshift, say/tell | Mixed word formation (all suffixes so far) | carry out, come up with | experiment, discover, research, theory, evidence, laboratory, breakthrough, analyse | Sentence transformation (MCQ) |
| 13 | Arts & entertainment / Nghệ thuật và giải trí | Gerund vs to-infinitive (enjoy doing, decide to do; stop/remember/try + both) | Nouns -ure, -age, -ance mix (pleasure, failure, performance) | put on, take part in | performance, exhibition, talented, imagination, compose, admire, rehearse, inspire | Cloze passage (MCQ, 4 gaps) |
| 14 | REVIEW 2 (days 8–13 + spiral from 1–6) | — | — | — | — | mixed |

## Spiral rule
- Normal day n: section G_review has 4 items: 2 from day n-1, 1 from day n-3, 1 from day n-6 (skip review days 7/14 by going one day further back; skip if day < 1). Day 1 has no G_review (use 4 "warm-up" items on A2 basics instead, from_day 0).
- web_check spiral items: 3 items following the same pattern (n-1, n-3, n-6), NEW sentences (not copies of paper items).
- Every item carries a "tag" pointing to the content it tests: vocab id (e.g. "d3v2"), phrasal id ("d3p1"), grammar ("d3g"), word formation ("d3w"), exam format ("fmt:antonym"), reading ("d3r").

## IDs
- Vocab: d{day}v{1..8} in the order of the syllabus table. Phrasal: d{day}p{1,2}. Grammar: d{day}g. Word formation: d{day}w. Reading: d{day}r.
- web_check item ids: d{day}q{1..n}. Paper item ids: d{day}{section letter}{k}, e.g. d3B4.

## File format — one JSON file per day: content/dayNN.json (NN = 01..14), valid UTF-8 JSON, no comments

Normal day:
```json
{
  "day": 3,
  "type": "normal",
  "theme_en": "Environment",
  "theme_vi": "Môi trường",
  "goal_vi": "Hôm nay em sẽ ... (2 câu, thân thiện)",
  "minutes": 30,
  "vocab": [
    {"id":"d3v1","word":"pollution","pos":"n","ipa":"/pəˈluːʃn/","meaning_vi":"sự ô nhiễm","example":"Air pollution is a serious problem in big cities.","family":"pollute (v), polluted (adj)"}
  ],
  "phrasal": [
    {"id":"d3p1","phrase":"cut down (on)","meaning_vi":"cắt giảm","example":"We should cut down on plastic bags."}
  ],
  "grammar": {"id":"d3g","title":"Present perfect vs past simple","rule_vi":["bullet 1","bullet 2","bullet 3 (3–5 bullets, ngắn, có công thức)"],"examples":["...","...","..."],"common_mistake_vi":"1 lỗi hay gặp + cách sửa"},
  "wordform": {"id":"d3w","focus":"-al, -ous","rule_vi":"1–2 câu","examples":[["environment","environmental"],["danger","dangerous"],["nature","natural"],["fame","famous"]]},
  "paper": {
    "A_vocab": {"instruction_vi":"...","bank":["optional word bank"],"items":[{"id":"d3A1","q":"Sentence with ______ gap.","answer":"pollution"}]},
    "B_grammar": {"instruction_vi":"...","items":[{"id":"d3B1","q":"...(verb in brackets)...","answer":"has lived","accept":["'s lived"]}]},
    "C_wordform": {"instruction_vi":"Viết dạng đúng của từ in hoa.","items":[{"id":"d3C1","q":"Plastic is ______ to sea animals. (DANGER)","answer":"dangerous"}]},
    "D_exam": {"format":"antonym","instruction_vi":"...","items":[{"id":"d3D1","q":"...","options":["...","...","...","..."],"answer":"B"}]},
    "E_reading": {"id":"d3r","title":"...","text":"130–170 words, B1 level, original","items":[{"id":"d3E1","kind":"tfng","q":"statement","answer":"True"},{"id":"d3E3","kind":"mcq","q":"...","options":["..."],"answer":"C"}]},
    "F_writing": {"task_en":"...","task_vi":"...","min_words":50,"model":"short model answer (60–80 words)","checklist_vi":["...","...","..."]},
    "G_review": {"instruction_vi":"Ôn xoắn ốc – ...","items":[{"id":"d3G1","q":"...","answer":"...","from_day":2,"tag":"d2v3"}]}
  },
  "web_check": [
    {"id":"d3q1","type":"mcq","skill":"vocab","q":"...","options":["...","...","...","..."],"answer":1,"explain_vi":"ngắn","tag":"d3v1"},
    {"id":"d3q5","type":"text","skill":"grammar","q":"...","answer":"has visited","accept":["'s visited"],"explain_vi":"...","tag":"d3g"}
  ],
  "can_do_vi": ["Em có thể ...","...","..."]
}
```
Counts for a normal day: vocab 8, phrasal 2, A_vocab 6 (cover all 8 words + 2 phrasal across A and the web where possible), B_grammar 6, C_wordform 4, D_exam 4, E_reading 4 (2 tfng with answer "True"/"False"/"Not Given", 2 mcq), G_review 4.
web_check = 12 items: 3 vocab/phrasal, 3 grammar, 2 wordform, 1 exam-format, 3 spiral (skill "review", with "from_day" field). Mix types: about 8 mcq + 4 text. For mcq, "answer" is the 0-based index of the correct option. For paper D_exam / E mcq, "answer" is the letter.
Text answers must be short (1–3 words) and unambiguous; list all acceptable variants in "accept" (contractions, British/American spelling).
web_check items must test the same content as the paper but with NEW sentences — never repeat a paper sentence.

Review day (7 and 14):
```json
{
  "day": 7, "type": "review", "theme_en": "Review 1", "theme_vi": "Vòng ôn 1 (buổi 1–6)", "goal_vi": "...", "minutes": 35,
  "paper": {
    "R1_vocab": {"instruction_vi":"...","items":[{"id":"d7R1_1","q":"...","answer":"...","from_day":2,"tag":"d2v5"}]},      // 10 items covering all 6 days
    "R2_grammar": {...10 items, each with from_day + tag...},
    "R3_wordform": {...6 items...},
    "R4_exam": {"instruction_vi":"...","items":[{"id":"..","format":"synonym","q":"..","options":[..],"answer":"A","from_day":2,"tag":"fmt:synonym"}]},   // 6 mixed-format MCQ
    "E_reading": {... like normal, 5 items, new passage linking several themes ...},
    "F_writing": {... min_words 80 ...},
    "self_check_vi": ["Em đã thuộc ... (6 câu tự đánh giá)"]
  },
  "web_check": [ 16 items, all skill "review" or by skill, each with from_day + tag, NEW sentences ],
  "can_do_vi": [...]
}
```
Day 14 R-sections cover days 8–13 mostly, with ~30% from days 1–6.

Level guidance: vocabulary and reading ≈ B1 with a few B2 words; grammar at B1. Distractors in MCQ must be plausible but clearly wrong for a careful student. Avoid culture-specific trivia. Keep everything appropriate for a 12-year-old.
