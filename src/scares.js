const ROOM_WEIGHTS = {
  entrance: { slam: 2.1, whisper: 1.3 },
  living: { blackout: 1.4, flicker: 1.3, slam: 2.4 },
  kitchen: { crawl: 1.6, flicker: 2.4, jumpscare: 1.2, water: 1.4 },
  bathroom: { curtain: 6, jumpscare: 2.2, water: 5.5, whisper: 1.8 },
  bedroom: { crawl: 1.8, jumpscare: 1.8, whisper: 2.7 },
  basement: { blackout: 2.2, crawl: 2.4, flicker: 1.5, teleport: 2.6 },
  attic: { crawl: 2.1, slam: 1.4, teleport: 2.3, whisper: 1.5 },
  'widows-room': { blackout: 1.6, jumpscare: 1.8, teleport: 1.2, whisper: 3.1 },
  courtyard: { crawl: 1.6, jumpscare: 0.7, slam: 0.35, teleport: 1.8, whisper: 2.8 },
  crypt: { blackout: 1.4, crawl: 2.2, flicker: 0.65, jumpscare: 1.7, teleport: 2.7, whisper: 1.6 },
  mirror: { blackout: 1.8, flicker: 0.8, jumpscare: 3.2, teleport: 2.4, whisper: 2.1 },
  hall: { blackout: 1.5, crawl: 1.3, slam: 1.6, teleport: 1.4 },
  study: { blackout: 3.2, crawl: 1.4, whisper: 2.4 },
  pantry: { blackout: 2.6, crawl: 4.2, whisper: 1.6 },
  nursery: { crawl: 2.8, mobile: 8, whisper: 3.4 },
  'guest-bath': { curtain: 6.5, water: 5, whisper: 1.6 },
  'cellar-bath': { blackout: 2.4, curtain: 5.5, crawl: 2.2, water: 4.5 },
}

const BASE_WEIGHTS = {
  blackout: 0.55,
  crawl: 0.5,
  curtain: 0.2,
  flicker: 1.5,
  jumpscare: 0.55,
  mobile: 0.08,
  slam: 1.35,
  teleport: 0.45,
  water: 0.22,
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
