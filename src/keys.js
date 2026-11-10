import * as THREE from 'three'

import { FLOOR_Y, UPPER_PLAYER_Y } from './house.js'

const KEY_SPOTS_BY_ROOM = {
  living: [[-9.2, 4.6], [-7.6, 6.4]],
  kitchen: [[6.6, 2.8], [9.4, 6.2]],
  bathroom: [[-7.4, -6.4], [-6.8, -8.2]],
  bedroom: [[6.8, -6.2], [7.8, -8]],
  basement: [[-7.2, -16.6], [-6.8, -18.8]],
  attic: [[8.2, -16.8], [7.4, -18.2]],
  study: [[-17.2, 5.4], [-16.2, 6.6]],
  pantry: [[14.8, 8], [15.8, 7.5]],
  nursery: [[16.4, -6.2], [17.6, -5.4]],
  'guest-bath': [[-16.4, -3.4], [-17.4, -2.4]],
  'cellar-bath': [[-16.2, -17], [-15.6, -15.8]],
}

const COURTYARD_KEY_SPOTS = [[38, 0.4], [40.5, 2.2], [35.2, -1.2]]
const CRYPT_KEY_SPOTS = [[0.2, -55], [2.2, -52.4], [-1.6, -57.2]]
const MIRROR_KEY_SPOTS = [[-38, 0.2], [-35.6, 2.4], [-40.2, -1.6]]
const WIDOWS_ROOM_KEY_SPOTS = [
  [-8.4, 7.2, UPPER_PLAYER_Y - 0.35],
  [-7.2, 6.2, UPPER_PLAYER_Y - 0.35],
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

const KEY_SCALE = 1.85
const KEY_GLOW = 11

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
    emissiveIntensity: 1.8,
    metalness: design.name === 'bone' ? 0.05 : 0.82,
    roughness: design.name === 'bone' ? 0.72 : 0.28,
  })
  const gemMaterial = new THREE.MeshStandardMaterial({
    color: design.gem,
    emissive: design.gem,
    emissiveIntensity: 2.8,
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

  const moteMaterial = new THREE.MeshBasicMaterial({
    color: design.gem,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  })
  const motes = []
  for (let index = 0; index < 10; index += 1) {
    const mote = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 4), moteMaterial)
    group.add(mote)
    motes.push(mote)
  }
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.42, 4.4, 8, 1, true),
    new THREE.MeshBasicMaterial({
      color: design.gem,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    }),
  )
  beam.position.y = 2.05
  group.add(beam)
  const glow = new THREE.PointLight(design.gem, 0, 18, 1.35)
  glow.position.y = 0.4
  group.add(glow)
  group.scale.setScalar(KEY_SCALE)
  group.userData.glow = glow
  group.userData.beam = beam
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
      key.mesh.scale.setScalar(KEY_SCALE)
      key.collected = false
      key.collecting = false
      key.phase = Math.random() * Math.PI * 2
      key.mesh.userData.glow.intensity = index === 0 ? KEY_GLOW : 0
      key.mesh.userData.beam.visible = index === 0
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
        const angle = time * 0.0022 + key.phase + index * 0.62
        const radius = 0.55 + (index % 3) * 0.16
        mote.position.set(
          Math.cos(angle) * radius,
          0.35 + Math.sin(angle * 1.4) * 0.85,
          Math.sin(angle) * radius,
        )
      })
      const beam = key.mesh.userData.beam
      beam.material.opacity = 0.16 + Math.sin(time * 0.004 + key.phase) * 0.1

      if (key.collecting) {
        const progress = Math.min((time - key.collectStarted) / 420, 1)
        key.mesh.position.y = key.baseY + progress * 1.1
        key.mesh.scale.setScalar(KEY_SCALE * (1 + progress * 0.45))
        key.mesh.userData.glow.intensity = KEY_GLOW * (1 - progress)
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

      if (distanceToKey <= 2.15) {
        key.collected = true
        key.collecting = true
        key.collectStarted = time
        collectedCount += 1
        if (collectedCount < keys.length) {
          const nextKey = keys[collectedCount]
          nextKey.mesh.visible = true
          nextKey.mesh.userData.glow.intensity = KEY_GLOW
          nextKey.mesh.userData.beam.visible = true
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
