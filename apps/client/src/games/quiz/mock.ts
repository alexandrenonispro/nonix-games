export type QuizPhase = 'question_mcq' | 'question_free' | 'round_results' | 'final'

export interface QuizPlayer {
  id: string
  username: string
  score: number
  hasAnswered: boolean
  lastAnswerCorrect?: boolean
  lastPoints?: number
  answer?: string
}

export interface MCQQuestion {
  type: 'mcq'
  text: string
  choices: string[]
  correctIndex: number
  theme: string
}

export interface FreeQuestion {
  type: 'free'
  text: string
  answer: string
  theme: string
}

export type Question = MCQQuestion | FreeQuestion

export const MOCK_PLAYERS: QuizPlayer[] = [
  { id: 'me',  username: 'Zerox',  score: 1400, hasAnswered: false },
  { id: '1',   username: 'Noxie',  score: 2100, hasAnswered: false },
  { id: '2',   username: 'Krypt',  score: 800,  hasAnswered: false },
  { id: '3',   username: 'Torken', score: 1750, hasAnswered: false },
]

export const MOCK_QUESTIONS: Question[] = [
  {
    type: 'mcq',
    text: "Quelle est la capitale de l'Australie ?",
    choices: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
    correctIndex: 2,
    theme: '🌍 Géographie',
  },
  {
    type: 'free',
    text: 'Quel scientifique a découvert la pénicilline ?',
    answer: 'fleming',
    theme: '🔬 Sciences',
  },
  {
    type: 'mcq',
    text: 'Dans quel langage est écrit le noyau Linux ?',
    choices: ['Python', 'C', 'Rust', 'Assembly'],
    correctIndex: 1,
    theme: '💻 Tech',
  },
]

export const MOCK_ROUND_RESULTS: (QuizPlayer & { answer: string; correct: boolean; pointsGained: number })[] = [
  { id: '1',  username: 'Noxie',  score: 2100, hasAnswered: true, answer: 'Canberra',  correct: true,  pointsGained: 320 },
  { id: '3',  username: 'Torken', score: 1750, hasAnswered: true, answer: 'Canberra',  correct: true,  pointsGained: 290 },
  { id: 'me', username: 'Zerox',  score: 1400, hasAnswered: true, answer: 'Sydney',    correct: false, pointsGained: 0   },
  { id: '2',  username: 'Krypt',  score: 800,  hasAnswered: true, answer: 'Melbourne', correct: false, pointsGained: 0   },
]

export const MOCK_FINAL_RANKINGS: QuizPlayer[] = [
  { id: '1',  username: 'Noxie',  score: 3200, hasAnswered: true },
  { id: '3',  username: 'Torken', score: 2800, hasAnswered: true },
  { id: 'me', username: 'Zerox',  score: 1900, hasAnswered: true },
  { id: '2',  username: 'Krypt',  score: 1100, hasAnswered: true },
]
