import * as THREE from 'three'

import { FLOOR_Y, UPPER_PLAYER_Y } from './house.js'

const KEY_SPOTS_BY_ROOM = {
  living: [[-10.6, 6.6], [-6.2, 2.8], [-9.1, 4.8]],
  kitchen: [[5.4, 1.1], [8.2, 5.2], [10.4, 8.7]],
  bathroom: [[-10.2, -10.1], [-5.5, -8.8], [-9, -4.2]],
  bedroom: [[5.6, -5.2], [8.8, -9.5], [10.5, -3.5]],
  basement: [[-10.4, -14.4], [-6.2, -18.6], [-9.2, -21.2]],
  attic: [[5.4, -14.8], [8.1, -18.5], [10.5, -21]],
  study: [[-18.8, 4.4], [-15.6, 8.35], [-20.6, 7.2]],
  pantry: [[16.6, 7.3], [13.8, 9.15], [15.4, 6.85]],
  nursery: [[18.6, -4.8], [14.6, -8.2], [20.4, -9.4]],
  'guest-bath': [[-19.6, -1.4], [-15.4, 0.6], [-14.8, -6.8]],
  'cellar-bath': [[-19.4, -15.6], [-15.4, -18.6], [-18.2, -13.8]],
}

const COURTYARD_KEY_SPOTS = [[31.8, -6.2], [44.5, -5.4], [45.2, 5.2], [34.2, 4.6]]
const CRYPT_KEY_SPOTS = [[-4.3, -61], [4.1, -59.6], [-5.2, -51.1], [4.5, -49.2]]
const MIRROR_KEY_SPOTS = [[-45.1, -5.2], [-31.2, -4.4], [-44.2, 4.1], [-33.7, 5.3]]
const WIDOWS_ROOM_KEY_SPOTS = [
  [-8.1, 7.5, UPPER_PLAYER_Y - 1],
  [-10.7, 6.6, UPPER_PLAYER_Y - 1],
  [-6.3, 8.7, UPPER_PLAYER_Y - 1],
]
const ROOM_LABELS = {
  attic: 'attic',
  basement: 'basement',
  bathroom: 'bathroom',
  bedroom: "child's room",
  'cellar-bath': 'cellar washroom',
  courtyard: 'courtyard',
  crypt: 'crypt',
  'guest-bath': 'guest bathroom',
  kitchen: 'kitchen',
  living: 'living room',
  mirror: 'mirror realm',
  nursery: 'nursery',
  pantry: 'pantry',
  study: 'study',
  'widows-room': "widow's room",
}

function labelSpots(room, spots) {
  return spots.map(([x, z, y]) => ({
    label: ROOM_LABELS[room],
    room,
    x,
    y,
    z,
  }))
}

const HOUSE_KEY_SPOTS = Object.entries(KEY_SPOTS_BY_ROOM).flatMap(([room, spots]) => labelSpots(room, spots))
const BACKTRACK_KEY_SPOTS = [
  ...HOUSE_KEY_SPOTS,
  ...labelSpots('courtyard', COURTYARD_KEY_SPOTS),
  ...labelSpots('crypt', CRYPT_KEY_SPOTS),
  ...labelSpots('widows-room', WIDOWS_ROOM_KEY_SPOTS),
]
const KEY_STAGES = [
  HOUSE_KEY_SPOTS,
  labelSpots('courtyard', COURTYARD_KEY_SPOTS),
  labelSpots('crypt', CRYPT_KEY_SPOTS),
  BACKTRACK_KEY_SPOTS,
  labelSpots('mirror', MIRROR_KEY_SPOTS),
]

function pick(values) {
  return values[Math.floor(Math.random() * values.length)]
}

const KEY_DESIGNS = [
  { color: 0xd7a441, emissive: 0x6a3a08, gem: 0xffe1a3, name: 'brass' },
  { color: 0x8d9298, emissive: 0x1c242c, gem: 0xd5dde6, name: 'iron' },
  { color: 0xe6d7c4, emissive: 0x4a3a2c, gem: 0xfff4e4, name: 'bone' },
  { color: 0x8fd6e8, emissive: 0x14607a, gem: 0xe9fbff, name: 'glass' },
  { color: 0x2a2e36, emissive: 0x3a1018, gem: 0xff3b3b, name: 'blackened' },
]

function createKeyMesh(design) {
  const group = new THREE.Group()
  const metal = new THREE.MeshStandardMaterial({
    color: design.color,
    emissive: design.emissive,
    emissiveIntensity: 0.9,
    metalness: design.name === 'bone' ? 0.05 : 0.82,
    roughness: design.name === 'bone' ? 0.72 : 0.28,
  })
  const gemMaterial = new THREE.MeshStandardMaterial({
    color: design.gem,
    emissive: design.gem,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  })

  if (design.name === 'iron') {
    const bow = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.06), metal)
    bow.position.y = 0.32
    group.add(bow)
    const hole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.07), new THREE.MeshBasicMaterial({ color: 0x050505 }))
    hole.position.y = 0.32
    group.add(hole)
  } else if (design.name === 'bone') {
    const bow = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), metal)
    bow.scale.set(1, 1.35, 0.55)
    bow.position.y = 0.3
    group.add(bow)
  } else if (design.name === 'glass') {
    const bow = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), metal)
    bow.position.y = 0.32
    group.add(bow)
  } else {
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.045, 8, 14), metal)
    bow.position.y = 0.3
    group.add(bow)
  }

  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.5, 0.07), metal)
  shaft.position.y = -0.02
  group.add(shaft)
  const toothCount = design.name === 'blackened' ? 3 : 2
  for (let index = 0; index < toothCount; index += 1) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.06), metal)
    tooth.position.set(index % 2 === 0 ? 0.08 : -0.07, -0.18 - index * 0.08, 0)
    group.add(tooth)
  }
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), gemMaterial)
  gem.position.y = 0.3
  group.add(gem)

  const moteMaterial = new THREE.MeshBasicMaterial({ color: design.gem, transparent: true, opacity: 0.85 })
  const motes = []
  for (let index = 0; index < 5; index += 1) {
    const mote = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), moteMaterial)
    group.add(mote)
    motes.push(mote)
  }
  const glow = new THREE.PointLight(design.gem, 0, 2.4, 2)
  group.add(glow)
  group.userData.glow = glow
  group.userData.motes = motes
  return group
}

export function createKeySystem({
  audio,
  getAreaId,
  hudCount,
  hudPips,
  onEscape,
  onPickup,
  parent,
  prompt,
}) {
  const keys = KEY_DESIGNS.map((design) => {
    const mesh = createKeyMesh(design)
    parent.add(mesh)
    return {
      baseY: FLOOR_Y + 0.7,
      collected: false,
      collecting: false,
      collectStarted: 0,
      mesh,
      phase: Math.random() * Math.PI * 2,
    }
  })
  let collectedCount = 0
  let canEscape = false

  const updateHud = () => {
    hudCount.textContent = `${collectedCount} / ${keys.length}`
    ;[...hudPips.children].forEach((pip, index) => {
      pip.classList.toggle('is-collected', index < collectedCount)
    })
  }

  const reset = () => {
    collectedCount = 0
    canEscape = false
    prompt.hidden = true

    keys.forEach((key, index) => {
      const spot = pick(KEY_STAGES[index])
      const y = spot.y ?? FLOOR_Y + 0.7
      key.baseY = y
      key.room = spot.room
      key.roomLabel = spot.label
      key.roomChimed = false
      key.mesh.position.set(spot.x, key.baseY, spot.z)
      key.mesh.visible = index === 0
      key.mesh.scale.setScalar(1)
      key.collected = false
      key.collecting = false
      key.phase = Math.random() * Math.PI * 2
      key.mesh.userData.glow.intensity = index === 0 ? 2.2 : 0
    })
    updateHud()
  }

  const update = (playerPosition, time, active) => {
    prompt.hidden = true
    if (!active) return

    for (const key of keys) {
      if (key.collected && !key.collecting) continue
      if (!key.mesh.visible && !key.collecting) continue
      key.mesh.rotation.y = time * 0.0014 + key.phase
      key.mesh.userData.motes.forEach((mote, index) => {
        const angle = time * 0.003 + key.phase + index * 1.25
        const radius = 0.28 + (index % 2) * 0.08
        mote.position.set(Math.cos(angle) * radius, 0.15 + Math.sin(angle * 1.3) * 0.12, Math.sin(angle) * radius)
      })

      if (key.collecting) {
        const progress = Math.min((time - key.collectStarted) / 420, 1)
        key.mesh.position.y = key.baseY + progress * 1.1
        key.mesh.scale.setScalar(1 + progress * 0.8)
        key.mesh.userData.glow.intensity = 2.2 * (1 - progress)
        if (progress >= 1) {
          key.collecting = false
          key.mesh.visible = false
          key.mesh.userData.glow.intensity = 0
        }
        continue
      }

      key.mesh.position.y = key.baseY + Math.sin(time * 0.0025 + key.phase) * 0.12
      const distanceToKey = Math.hypot(
        key.mesh.position.x - playerPosition.x,
        key.mesh.position.y - playerPosition.y,
        key.mesh.position.z - playerPosition.z,
      )
      if (
        getAreaId &&
        !key.roomChimed &&
        getAreaId() === key.room
      ) {
        key.roomChimed = true
        audio.hint()
      }

      if (distanceToKey <= 1.55) {
        key.collected = true
        key.collecting = true
        key.collectStarted = time
        collectedCount += 1
        if (collectedCount < keys.length) {
          const nextKey = keys[collectedCount]
          nextKey.mesh.visible = true
          nextKey.mesh.userData.glow.intensity = 2.2
        }
        audio.pickup()
        updateHud()
        onPickup(collectedCount, keys.length)
      }
    }

    const frontDoorDistance = Math.hypot(playerPosition.x, playerPosition.z - 9.4)
    canEscape = frontDoorDistance < 2.1
    if (canEscape) {
      prompt.textContent =
        collectedCount === keys.length
          ? 'E · unlock the front door and escape'
          : `Front door locked · ${keys.length - collectedCount} keys remain`
      prompt.hidden = false
    }
  }

  const interact = () => {
    if (!canEscape || collectedCount < keys.length) return false
    onEscape()
    return true
  }

  reset()
  return {
    get count() {
      return collectedCount
    },
    get nextLabel() {
      return keys[collectedCount]?.roomLabel ?? ''
    },
    get total() {
      return keys.length
    },
    interact,
    reset,
    update,
  }
}
