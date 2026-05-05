import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse/sync'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

const VALID_CALC_TYPES = ['calc', 'no_calc'] as const
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard', ''] as const

interface CsvRow {
  topic: string
  subtopic: string
  calc_type: string
  marks: string
  question_text: string
  answer?: string
  difficulty?: string
  source_notes?: string
}

async function main() {
  const csvPath = path.resolve(process.cwd(), 'data/reference_questions.csv')

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found at: ${csvPath}`)
    console.error('Place your reference_questions.csv in the /data folder.')
    process.exit(1)
  }

  const raw = fs.readFileSync(csvPath, 'utf-8')
  const rows: CsvRow[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  })

  console.log(`Parsed ${rows.length} rows from CSV`)

  // Load all subtopics into a lookup map
  const { data: subtopics, error: subtopicErr } = await supabase
    .from('subtopics')
    .select('id, topic, subtopic')

  if (subtopicErr || !subtopics) {
    console.error('Failed to load subtopics:', subtopicErr?.message)
    process.exit(1)
  }

  const subtopicMap = new Map<string, string>()
  for (const s of subtopics) {
    subtopicMap.set(`${s.topic}|${s.subtopic}`, s.id)
  }

  let inserted = 0
  let skipped = 0
  const errors: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const lineNum = i + 2 // 1-indexed + header row

    // Validate required fields
    if (!row.topic?.trim()) {
      errors.push(`Row ${lineNum}: missing topic`)
      skipped++
      continue
    }
    if (!row.subtopic?.trim()) {
      errors.push(`Row ${lineNum}: missing subtopic`)
      skipped++
      continue
    }
    if (!VALID_CALC_TYPES.includes(row.calc_type?.trim() as typeof VALID_CALC_TYPES[number])) {
      errors.push(`Row ${lineNum}: invalid calc_type "${row.calc_type}" (must be calc or no_calc)`)
      skipped++
      continue
    }
    const marks = parseInt(row.marks?.trim(), 10)
    if (isNaN(marks) || marks < 1) {
      errors.push(`Row ${lineNum}: invalid marks "${row.marks}"`)
      skipped++
      continue
    }
    if (!row.question_text?.trim()) {
      errors.push(`Row ${lineNum}: missing question_text`)
      skipped++
      continue
    }

    const subtopicId = subtopicMap.get(`${row.topic.trim()}|${row.subtopic.trim()}`)
    if (!subtopicId) {
      errors.push(`Row ${lineNum}: unknown topic/subtopic combination "${row.topic} / ${row.subtopic}"`)
      skipped++
      continue
    }

    const difficulty = row.difficulty?.trim() || null
    if (difficulty && !['easy', 'medium', 'hard'].includes(difficulty)) {
      errors.push(`Row ${lineNum}: invalid difficulty "${difficulty}" — skipping difficulty field`)
    }

    const { error } = await supabase.from('reference_questions').insert({
      subtopic_id: subtopicId,
      calc_type: row.calc_type.trim(),
      marks,
      question_text: row.question_text.trim(),
      answer: row.answer?.trim() || null,
      difficulty: ['easy', 'medium', 'hard'].includes(difficulty ?? '') ? difficulty : null,
      source_notes: row.source_notes?.trim() || null,
    })

    if (error) {
      errors.push(`Row ${lineNum}: DB insert failed — ${error.message}`)
      skipped++
    } else {
      inserted++
    }
  }

  console.log(`\nDone.`)
  console.log(`  Inserted: ${inserted}`)
  console.log(`  Skipped:  ${skipped}`)

  if (errors.length > 0) {
    console.log(`\nErrors/warnings:`)
    errors.forEach((e) => console.log(`  ${e}`))
  }
}

main()
