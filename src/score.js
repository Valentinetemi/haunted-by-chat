const BEST_SCORE_KEY = 'haunted-by-chat-best-score'
const BANK_KEY = 'haunted-by-chat-bank'

function loadNumber(key) {
  try {
    const value = Number.parseInt(localStorage.getItem(key) ?? '', 10)
    return Number.isFinite(value) && value > 0 ? value : 0
  } catch {
    return 0
  }
}

function saveNumber(key, value) {
  try {
    localStorage.setItem(key, String(value))
    return true
  } catch {
    return false
  }
}

export function createScoreSystem({ cashDisplay, scoreDisplay, streakDisplay }) {
  let score = 0
  let runCash = 0
  let bank = loadNumber(BANK_KEY)
  let bankSeen = bank
  let kills = 0
  let streak = 0
  let bestStreak = 0
  let lastKillAt = 0
  let best = loadNumber(BEST_SCORE_KEY)
  const streakWindow = 4200

  const paint = () => {
    if (scoreDisplay) scoreDisplay.textContent = String(score)
    if (cashDisplay) cashDisplay.textContent = String(bank)
    if (streakDisplay) {
      streakDisplay.hidden = streak < 2
      streakDisplay.textContent = `x${streak}`
    }
  }

  const persistBank = (next) => {
    const stored = loadNumber(BANK_KEY)
    const merged = Math.max(0, stored + (next - bankSeen))
    if (!saveNumber(BANK_KEY, merged)) return false
    bank = merged
    bankSeen = merged
    return true
  }

  const noteBest = () => {
    const stored = loadNumber(BEST_SCORE_KEY)
    const merged = Math.max(stored, score)
    best = Math.max(best, merged)
    if (best > stored) saveNumber(BEST_SCORE_KEY, best)
    return score > 0 && score >= best
  }

  paint()

  return {
    get score() {
      return score
    },
    get runCash() {
      return runCash
    },
    get bank() {
      return bank
    },
    get kills() {
      return kills
    },
    get streak() {
      return streak
    },
    get bestStreak() {
      return bestStreak
    },
    get best() {
      return best
    },
    paint,
    tick(time) {
      if (streak > 0 && time - lastKillAt > streakWindow) {
        streak = 0
        paint()
      }
    },
    addScore(amount) {
      score += amount
      const record = noteBest()
      paint()
      return record
    },
    addCash(amount) {
      runCash += amount
      paint()
    },
    addKill({ payout = 8, points = 100, headshot = false } = {}) {
      const now = performance.now()
      if (now - lastKillAt > streakWindow) streak = 0
      streak += 1
      bestStreak = Math.max(bestStreak, streak)
      lastKillAt = now
      const multiplier = 1 + (streak - 1) * 0.25
      const gained = Math.floor(points * multiplier + (headshot ? 60 : 0))
      score += gained
      runCash += payout + (headshot ? 4 : 0)
      kills += 1
      const record = noteBest()
      paint()
      return { gained, record, streak }
    },
    spend(amount) {
      if (bank < amount) return false
      if (!persistBank(bank - amount)) return false
      paint()
      return true
    },
    refund(amount) {
      persistBank(bank + amount)
      paint()
    },
    bankRun() {
      if (!persistBank(bank + runCash)) return
      runCash = 0
      noteBest()
      paint()
    },
    resetRun() {
      score = 0
      runCash = 0
      kills = 0
      streak = 0
      bestStreak = 0
      lastKillAt = 0
      paint()
    },
  }
}
