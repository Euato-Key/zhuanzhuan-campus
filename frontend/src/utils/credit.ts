export interface CreditLevel {
  label: string
  level: string
  color: string
}

const CREDIT_LEVELS: { min: number; max: number; label: string; level: string; color: string }[] = [
  { min: 120, max: 150, label: '优秀', level: 'excellent', color: '#4CAF50' },
  { min: 100, max: 119, label: '良好', level: 'good', color: '#2196F3' },
  { min: 80, max: 99, label: '一般', level: 'average', color: '#FF9800' },
  { min: 60, max: 79, label: '较差', level: 'poor', color: '#E65100' },
  { min: 0, max: 59, label: '极差', level: 'very_poor', color: '#F44336' },
]

export function getCreditLevel(score: number): CreditLevel {
  const entry = CREDIT_LEVELS.find(l => score >= l.min && score <= l.max)
  return entry ?? CREDIT_LEVELS[CREDIT_LEVELS.length - 1]
}
