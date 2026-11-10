const SURVIVOR_KEY = 'haunted-by-chat-survivor'
const UNLOCK_KEY = 'haunted-by-chat-unlocks'

export const SURVIVORS = [
  {
    blurb: 'A steady hand and a full revolver.',
    grenades: 2,
    hand: '#c49272',
    health: 100,
    id: 'vale',
    name: 'Vale',
    perk: 'Balanced',
    price: 0,
    reload: 1,
    speed: 1,
  },
  {
    blurb: 'Slams a fresh magazine in faster.',
    grenades: 2,
    hand: '#8d5a3c',
    health: 100,
    id: 'rook',
    name: 'Rook',
    perk: 'Fast reload',
    price: 0,
    reload: 0.68,
    speed: 1,
  },
  {
    blurb: 'Takes more bites before going down.',
    grenades: 1,
    hand: '#e0c2a2',
    health: 145,
    id: 'june',
    name: 'June',
    perk: 'More health',
    price: 0,
    reload: 1,
    speed: 1,
  },
  {
    blurb: 'Pockets extra grenades.',
    grenades: 5,
    hand: '#6d6a60',
    health: 90,
    id: 'ash',
    name: 'Ash',
    perk: 'Extra grenades',
    price: 280,
    reload: 1,
    speed: 1,
  },
  {
    blurb: 'Gets around the house quicker.',
    grenades: 2,
    hand: '#4f6d55',
    health: 100,
    id: 'nico',
    name: 'Nico',
    perk: 'Faster move',
    price: 360,
    reload: 1,
    speed: 1.14,
  },
]

const WEAPON_UNLOCKS = {
  shotgun: 250,
  smg: 520,
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}

export function survivorById(id) {
  return SURVIVORS.find((survivor) => survivor.id === id) ?? SURVIVORS[0]
}

export function loadSurvivorId() {
  try {
    return localStorage.getItem(SURVIVOR_KEY) || 'vale'
  } catch {
    return 'vale'
  }
}

export function saveSurvivorId(id) {
  try {
    localStorage.setItem(SURVIVOR_KEY, id)
  } catch {
    // The picker still uses the in-memory choice.
  }
}

export function loadUnlocks() {
  return {
    ash: false,
    nico: false,
    shotgun: false,
    smg: false,
    ...readJson(UNLOCK_KEY, {}),
  }
}

export function replaceUnlocks(unlocks) {
  return writeJson(UNLOCK_KEY, unlocks)
}

export function saveUnlocks(unlocks) {
  const latest = loadUnlocks()
  const merged = { ...latest }
  for (const [key, value] of Object.entries(unlocks)) {
    merged[key] = Boolean(latest[key]) || Boolean(value)
  }
  return writeJson(UNLOCK_KEY, merged)
}

export function weaponPrice(id) {
  return WEAPON_UNLOCKS[id] ?? 0
}
