const ROOM_WEIGHTS = {
  entrance: { slam: 2.1, whisper: 1.3 },
  living: { flicker: 1.3, slam: 2.4 },
  kitchen: { flicker: 2.4, jumpscare: 1.2 },
  bathroom: { jumpscare: 2.5, whisper: 1.8 },
  bedroom: { jumpscare: 1.8, whisper: 2.7 },
  basement: { flicker: 1.5, teleport: 2.6 },
  attic: { slam: 1.4, teleport: 2.3, whisper: 1.5 },
  'widows-room': { jumpscare: 1.8, teleport: 1.2, whisper: 3.1 },
  courtyard: { jumpscare: 0.7, slam: 0.35, teleport: 1.8, whisper: 2.8 },
  crypt: { flicker: 0.65, jumpscare: 1.7, slam: 0.35, teleport: 2.7, whisper: 1.6 },
  mirror: { flicker: 0.8, jumpscare: 3.2, slam: 0.25, teleport: 2.4, whisper: 2.1 },
  hall: { slam: 1.6, teleport: 1.4 },
}

const BASE_WEIGHTS = {
  flicker: 1.5,
  jumpscare: 0.55,
  slam: 1.35,
  teleport: 0.45,
  whisper: 1.8,
}

function pickWeighted(options) {
  const total = options.reduce((sum, option) => sum + option.weight, 0)
  let roll = Math.random() * total
  for (const option of options) {
    roll -= option.weight
    if (roll <= 0) return option
  }
  return options.at(-1)
}

export function createScareDirector({ actions, getRoom, getTension, isActive }) {
  let nextScareAt = 0

  const scheduleNext = (time) => {
    const tension = getTension()
    const minDelay = 11500 - tension * 6500
    const randomDelay = 9000 - tension * 3500
    nextScareAt = time + minDelay + Math.random() * randomDelay
  }

  const update = (time) => {
    if (!isActive() || time < nextScareAt) return

    const roomId = getRoom().id
    const roomWeights = ROOM_WEIGHTS[roomId] ?? ROOM_WEIGHTS.hall
    const tension = getTension()
    const options = Object.entries(BASE_WEIGHTS).map(([name, baseWeight]) => ({
      name,
      weight:
        baseWeight *
        (roomWeights[name] ?? 1) *
        (name === 'teleport' || name === 'jumpscare' ? 0.65 + tension * 1.8 : 1),
    }))
    const scare = pickWeighted(options)
    actions[scare.name]()
    scheduleNext(time)
  }

  return {
    reset(time = performance.now()) {
      scheduleNext(time)
    },
    update,
  }
}
