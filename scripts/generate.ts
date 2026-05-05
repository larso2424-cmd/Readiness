/**
 * AI question generation pipeline.
 * Usage: npm run generate -- --subtopic "Quadratics" --count 5 --difficulty mix
 *        npm run generate -- --subtopic-id <uuid> --count 10 --difficulty hard
 */
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { spawnSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

// ─── Load env ────────────────────────────────────────────────────────────────
const envPath = path.resolve(process.cwd(), '.env.local')
fs.readFileSync(envPath, 'utf-8')
  .split('\n')
  .forEach((line) => {
    const [k, ...v] = line.split('=')
    if (k && v.length) process.env[k.trim()] = v.join('=').trim()
  })

// ─── Clients ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const MODEL_GENERATE = 'claude-sonnet-4-5-20250929'
const MODEL_VERIFY = 'claude-haiku-4-5-20251001'
const SIMILARITY_THRESHOLD = 0.8
const MAX_RETRIES = 3

// ─── Types ───────────────────────────────────────────────────────────────────
type Difficulty = 'easy' | 'medium' | 'hard'
type VerificationType = 'computational' | 'conceptual' | 'statistical'
type AnswerChoice = 'A' | 'B' | 'C' | 'D'

interface GeneratedQuestion {
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: AnswerChoice
  explanation: string
  difficulty: Difficulty
  verification_type: VerificationType
  sympy_check?: string
  skills: string[]
  common_mistakes: string
  estimated_time_seconds: number
}

interface Outcome {
  status: 'inserted' | 'failed_similarity' | 'failed_sympy' | 'failed_haiku' | 'failed_parse' | 'failed_db'
  question?: GeneratedQuestion
  error?: string
}

// ─── Args ────────────────────────────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2)
  const get = (flag: string) => {
    const i = args.indexOf(flag)
    return i !== -1 ? args[i + 1] : undefined
  }
  return {
    subtopicName: get('--subtopic'),
    subtopicId: get('--subtopic-id'),
    count: parseInt(get('--count') ?? '10', 10),
    difficulty: (get('--difficulty') ?? 'mix') as Difficulty | 'mix',
  }
}

// ─── Similarity check ────────────────────────────────────────────────────────
// Stop words common to all IB math questions — excluded from overlap calculation
const STOP_WORDS = new Set([
  'the', 'of', 'in', 'is', 'are', 'find', 'show', 'that', 'given', 'let',
  'for', 'an', 'and', 'to', 'where', 'with', 'its', 'by', 'be', 'it',
  'write', 'down', 'hence', 'or', 'otherwise', 'value', 'values', 'expression',
  'function', 'equation', 'following', 'which', 'this', 'from', 'at', 'your',
  'answer', 'expand', 'simplify', 'prove', 'determine', 'calculate', 'state',
])

function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    // Extract numbers from math — keep them as meaningful tokens
    .replace(/\$+([^$]*)\$+/g, (_, math) => ' ' + math.replace(/[^0-9a-z]/g, ' ') + ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t))
  return new Set(tokens)
}

function tokenOverlap(a: string, b: string): number {
  const ta = tokenize(a)
  const tb = tokenize(b)
  if (ta.size === 0 || tb.size === 0) return 0
  let intersection = 0
  for (const t of ta) if (tb.has(t)) intersection++
  return intersection / Math.min(ta.size, tb.size)
}

function isTooSimilar(candidate: string, corpus: string[]): boolean {
  return corpus.some((ref) => tokenOverlap(candidate, ref) > SIMILARITY_THRESHOLD)
}

// ─── SymPy verification ──────────────────────────────────────────────────────
function verifyWithSympy(sympyCheck: string): { passed: boolean; error?: string } {
  const result = spawnSync('python3', ['scripts/verify-sympy.py'], {
    input: JSON.stringify({ sympy_check: sympyCheck }),
    encoding: 'utf-8',
    timeout: 10000,
  })
  if (result.error || result.status !== 0) {
    return { passed: false, error: result.stderr || result.error?.message }
  }
  try {
    return JSON.parse(result.stdout)
  } catch {
    return { passed: false, error: 'Failed to parse SymPy output' }
  }
}

// ─── Haiku verification ──────────────────────────────────────────────────────
async function verifyWithHaiku(q: GeneratedQuestion): Promise<{ passed: boolean; reason?: string }> {
  const prompt = `You are verifying an IB Math AA SL multiple choice question. Check:
1. Is the question grammatically correct and unambiguous?
2. Are all four options distinct and plausible?
3. Is the stated correct answer actually correct?
4. Is the explanation accurate and complete?
5. Is the difficulty label (${q.difficulty}) appropriate?

Question: ${q.question_text}
A) ${q.option_a}
B) ${q.option_b}
C) ${q.option_c}
D) ${q.option_d}
Correct answer: ${q.correct_answer}
Explanation: ${q.explanation}

Respond with JSON only: { "passed": true/false, "reason": "brief reason if failed" }`

  const response = await anthropic.messages.create({
    model: MODEL_VERIFY,
    max_tokens: 300,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return { passed: false, reason: 'Haiku returned non-JSON' }
  try {
    return JSON.parse(match[0])
  } catch {
    return { passed: false, reason: 'Haiku JSON parse error' }
  }
}

// ─── Generation prompt ───────────────────────────────────────────────────────
function buildPrompt(
  subtopicName: string,
  topicName: string,
  referenceQuestions: string[],
  difficulty: Difficulty
): string {
  const refs = referenceQuestions
    .map((q, i) => `[${i + 1}] ${q}`)
    .join('\n\n')

  return `You are generating an original IB Math AA SL multiple choice question for the subtopic "${subtopicName}" (topic: "${topicName}").

Difficulty target: ${difficulty}

REFERENCE QUESTIONS (for style and difficulty calibration only — do NOT copy or closely paraphrase):
${refs}

Generate ONE original multiple choice question. It must be inspired by the style and difficulty of the references but must be entirely new — different numbers, different setup, different context.

KATEX-SAFE LATEX RULES (strictly enforced — these render in KaTeX, not full LaTeX):
ALLOWED:
- \\frac{}{}, \\sqrt{}, \\sqrt[n]{}
- \\leq, \\geq, \\neq, \\pm, \\infty
- \\sum_{}^{}, \\int_{}^{}, \\lim_{}
- \\sin, \\cos, \\tan, \\ln, \\log
- \\pi, \\theta, \\alpha, \\beta, \\lambda and other Greek letters
- f^{-1}, x^{2}, x_{n} (super/subscripts)
- \\mathbb{R}, \\in, \\notin, \\subset
- ^{\\circ} for degrees
- Inline math: $...$ and display math: $$...$$

NOT ALLOWED (will break rendering):
- \\begin{align}, \\begin{align*}, \\begin{cases}, \\begin{array}
- Any \\begin{}...\\end{} environment
- \\text{} inside math (avoid entirely)
- \\intertext, \\tag, \\label, \\ref
- AMS-only macros

FORMAT RULES:
- All math must be in $...$ or $$...$$
- Use \\\\ for line breaks within display math if needed
- Use plain text for non-math parts of answer options

VERIFICATION TYPE:
Classify this question as one of:
- "computational": algebra, equations, sequences, binomial, logs — answer is symbolically verifiable with SymPy
- "conceptual": graph identification, describing transformations, definitions, true/false reasoning — not symbolically verifiable
- "statistical": probability, statistics, distributions — numerical but not symbolic

If verification_type is "computational", include a "sympy_check" field: a self-contained Python code snippet using SymPy that sets a variable \`result = True\` if the correct answer is mathematically verified. Import sympy at the top. Example:
  "sympy_check": "from sympy import symbols, solve\\nx = symbols('x')\\nsol = solve(x**2 - 4, x)\\nresult = (2 in sol)"

If verification_type is "conceptual" or "statistical", omit the sympy_check field.

SKILL TAGS:
Include a "skills" array of fine-grained skill tags that this question tests. Tags should be kebab-case, specific, and reusable across questions. Examples:
- "binomial-negative-power", "binomial-specific-term", "binomial-fractional-coefficient"
- "quadratic-completing-the-square", "quadratic-discriminant", "quadratic-vertex-form"
- "log-change-of-base", "log-product-rule", "exponential-equation"
- "chain-rule", "product-rule", "definite-integral-substitution"
- "probability-conditional", "probability-tree-diagram", "normal-distribution-standardise"
Use 1–4 tags that precisely name the skills being tested.

COMMON MISTAKES:
Include a "common_mistakes" string: a brief note (1–2 sentences) on the most typical wrong approach a student takes on this question. E.g. "Students often forget to apply the negative sign when k is odd, leading to a positive term instead of negative."

ESTIMATED TIME:
Include "estimated_time_seconds": the number of seconds a confident IB student would typically need to solve this (e.g. 60 for easy, 120 for medium, 180–240 for hard).

Respond with ONLY valid JSON (no markdown, no explanation outside the JSON):
{
  "question_text": "string with LaTeX",
  "option_a": "string with LaTeX",
  "option_b": "string with LaTeX",
  "option_c": "string with LaTeX",
  "option_d": "string with LaTeX",
  "correct_answer": "A" | "B" | "C" | "D",
  "explanation": "step-by-step solution string with LaTeX — annotate each step with IB mark scheme codes in brackets: [M1] for method marks, [A1] for accuracy marks, [R1] for reasoning/justification marks. E.g. 'Substitute into the formula [M1], giving x = 3 [A1]'",
  "difficulty": "${difficulty}",
  "verification_type": "computational" | "conceptual" | "statistical",
  "sympy_check": "optional python string",
  "skills": ["skill-tag-1", "skill-tag-2"],
  "common_mistakes": "string",
  "estimated_time_seconds": 120
}`
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const args = parseArgs()

  if (!args.subtopicName && !args.subtopicId) {
    console.error('Usage: npm run generate -- --subtopic "Quadratics" --count 5 --difficulty mix')
    process.exit(1)
  }

  // Resolve subtopic
  let subtopicQuery = supabase.from('subtopics').select('id, topic, subtopic')
  if (args.subtopicId) {
    subtopicQuery = subtopicQuery.eq('id', args.subtopicId)
  } else {
    subtopicQuery = subtopicQuery.ilike('subtopic', args.subtopicName!)
  }

  const { data: subtopics, error: stErr } = await subtopicQuery.limit(1)
  if (stErr || !subtopics?.length) {
    console.error(`Subtopic not found: ${args.subtopicName ?? args.subtopicId}`)
    process.exit(1)
  }
  const subtopic = subtopics[0]
  console.log(`\nGenerating for: ${subtopic.topic} / ${subtopic.subtopic}`)
  console.log(`Count: ${args.count}, Difficulty: ${args.difficulty}\n`)

  // Load reference questions for this subtopic
  const { data: refRows } = await supabase
    .from('reference_questions')
    .select('question_text')
    .eq('subtopic_id', subtopic.id)

  const allRefTexts = (refRows ?? []).map((r) => r.question_text)
  if (allRefTexts.length === 0) {
    console.error('No reference questions found for this subtopic. Cannot generate.')
    process.exit(1)
  }

  // Load already-approved generated questions for similarity check
  const { data: approvedRows } = await supabase
    .from('generated_questions')
    .select('question_text')
    .eq('subtopic_id', subtopic.id)
    .eq('status', 'approved')

  const approvedTexts = (approvedRows ?? []).map((r) => r.question_text)
  const similarityCorpus = [...allRefTexts, ...approvedTexts]

  // Difficulty distribution
  const difficulties: Difficulty[] = []
  if (args.difficulty === 'mix') {
    for (let i = 0; i < args.count; i++) {
      difficulties.push(['easy', 'medium', 'hard'][i % 3] as Difficulty)
    }
  } else {
    for (let i = 0; i < args.count; i++) difficulties.push(args.difficulty)
  }

  // Track outcomes
  const outcomes = {
    generated: 0,
    failed_parse: 0,
    failed_similarity: 0,
    failed_sympy: 0,
    failed_haiku: 0,
    failed_db: 0,
    inserted: 0,
  }

  // Generate each question
  for (let i = 0; i < args.count; i++) {
    const difficulty = difficulties[i]
    console.log(`[${i + 1}/${args.count}] Generating ${difficulty} question...`)

    let outcome: Outcome = { status: 'failed_parse' }

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 1) console.log(`  Retry ${attempt}/${MAX_RETRIES}...`)

      // Pick 5 random reference questions
      const sample = allRefTexts
        .slice()
        .sort(() => Math.random() - 0.5)
        .slice(0, 5)

      const prompt = buildPrompt(subtopic.subtopic, subtopic.topic, sample, difficulty)

      // Call Sonnet to generate
      let generated: GeneratedQuestion
      try {
        const response = await anthropic.messages.create({
          model: MODEL_GENERATE,
          max_tokens: 2500,
          messages: [{ role: 'user', content: prompt }],
        })
        const text = response.content[0].type === 'text' ? response.content[0].text : ''
        const match = text.match(/\{[\s\S]*\}/)
        if (!match) throw new Error('No JSON found in response')
        generated = JSON.parse(match[0])
      } catch (e: any) {
        console.log(`  Parse failed: ${e.message}`)
        outcomes.failed_parse++
        continue
      }

      outcomes.generated++

      // Similarity check disabled — human review is the guard against near-copies

      // SymPy verification (computational only — advisory, not a hard blocker)
      let verificationMethod: 'sympy' | 'ai_only' | 'failed' = 'ai_only'
      if (generated.verification_type === 'computational' && generated.sympy_check) {
        process.stdout.write('  SymPy verification... ')
        const sympyResult = verifyWithSympy(generated.sympy_check)
        if (!sympyResult.passed) {
          console.log(`warning (${sympyResult.error?.slice(0, 80)}) — continuing to Haiku`)
          outcomes.failed_sympy++
          verificationMethod = 'failed'
        } else {
          console.log('passed')
          verificationMethod = 'sympy'
        }
      }

      // Haiku verification
      process.stdout.write('  Haiku verification... ')
      const haikuResult = await verifyWithHaiku(generated)
      if (!haikuResult.passed) {
        console.log(`FAILED: ${haikuResult.reason}`)
        outcomes.failed_haiku++
        outcome = { status: 'failed_haiku', question: generated, error: haikuResult.reason }
        await insertWithOutcome(subtopic.id, generated, 'failed_haiku_verification', prompt, true, verificationMethod)
        continue
      }
      console.log('passed')

      // Store as pending_review
      const { error: dbErr } = await supabase.from('generated_questions').insert({
        subtopic_id: subtopic.id,
        question_text: generated.question_text,
        option_a: generated.option_a,
        option_b: generated.option_b,
        option_c: generated.option_c,
        option_d: generated.option_d,
        correct_answer: generated.correct_answer,
        explanation: generated.explanation,
        difficulty: generated.difficulty,
        status: 'pending_review',
        verification_method: verificationMethod,
        generation_outcome: 'generated',
        similarity_check_passed: true,
        generation_prompt: prompt,
        skills: generated.skills ?? [],
        common_mistakes: generated.common_mistakes ?? null,
        estimated_time_seconds: generated.estimated_time_seconds ?? null,
      })

      if (dbErr) {
        console.log(`  DB insert failed: ${dbErr.message}`)
        outcomes.failed_db++
        outcome = { status: 'failed_db', error: dbErr.message }
      } else {
        console.log(`  Stored as pending_review`)
        outcomes.inserted++
        similarityCorpus.push(generated.question_text) // prevent near-duplicate in same run
        outcome = { status: 'inserted', question: generated }
      }
      break
    }

    if (outcome.status !== 'inserted') {
      console.log(`  Gave up after ${MAX_RETRIES} attempts`)
    }
  }

  // Summary
  console.log('\n─────────────────────────────')
  console.log('Generation complete')
  console.log(`  Stored (pending review): ${outcomes.inserted}`)
  console.log(`  Failed parse:            ${outcomes.failed_parse}`)
  console.log(`  Failed similarity:       ${outcomes.failed_similarity}`)
  console.log(`  Failed SymPy:            ${outcomes.failed_sympy}`)
  console.log(`  Failed Haiku:            ${outcomes.failed_haiku}`)
  console.log(`  Failed DB:               ${outcomes.failed_db}`)
  console.log('─────────────────────────────')
}

async function insertWithOutcome(
  subtopicId: string,
  q: GeneratedQuestion,
  outcome: string,
  prompt: string,
  similarityPassed: boolean,
  verificationMethod: string
) {
  await supabase.from('generated_questions').insert({
    subtopic_id: subtopicId,
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    difficulty: q.difficulty,
    status: 'rejected',
    verification_method: verificationMethod,
    generation_outcome: outcome as any,
    similarity_check_passed: similarityPassed,
    generation_prompt: prompt,
  })
}

main().catch((e) => {
  console.error('Fatal error:', e)
  process.exit(1)
})
