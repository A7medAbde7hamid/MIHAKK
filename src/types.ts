export type QuestionType = 'mcq' | 'true_false' | 'essay'
export type Question = {
  question_id: string; type: QuestionType; difficulty?: string; question_text: string
  options?: { option_id: string; text: string }[]; correct_answer?: string | boolean
  explanation?: string; model_answer?: string; source?: { lecture?: string }
}
export type Subject = {
  file: string; name: string; ar: string; code: string; icon: string
  total: number; questions: Question[]
}
