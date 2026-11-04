import * as THREE from 'three'

import { FLOOR_Y } from './house.js'

const KEY_SPOTS_BY_ROOM = {
  living: [[-10.6, 6.6], [-6.2, 2.8], [-9.1, 4.8]],
  kitchen: [[5.4, 1.1], [8.2, 5.2], [10.4, 8.7]],
  bathroom: [[-10.2, -10.1], [-5.5, -8.8], [-9, -4.2]],
  bedroom: [[5.6, -5.2], [8.8, -9.5], [10.5, -3.5]],
  basement: [[-10.4, -14.4], [-6.2, -18.6], [-9.2, -21.2]],
  attic: [[5.4, -14.8], [8.1, -18.5], [10.5, -21]],
}

const COURTYARD_KEY_SPOTS = [[31.8, -6.2], [44.5, -5.4], [45.2, 5.2], [34.2, 4.6]]
const CRYPT_KEY_SPOTS = [[-4.3, -61], [4.1, -59.6], [-5.2, -51.1], [4.5, -49.2]]
const MIRROR_KEY_SPOTS = [[-45.1, -5.2], [-31.2, -4.4], [-44.2, 4.1], [-33.7, 5.3]]
const HOUSE_KEY_SPOTS = Object.values(KEY_SPOTS_BY_ROOM).flat()
const BACKTRACK_KEY_SPOTS = [
  ...HOUSE_KEY_SPOTS,
  ...COURTYARD_KEY_SPOTS,
  ...CRYPT_KEY_SPOTS,
]
const KEY_STAGES = [
  HOUSE_KEY_SPOTS,
  COURTYARD_KEY_SPOTS,
  CRYPT_KEY_SPOTS,
  BACKTRACK_KEY_SPOTS,
  MIRROR_KEY_SPOTS,
]

function pick(values) {
  return values[Math.floor(Math.random() * values.length)]
}

function createKeyMesh(material) {
  const group = new THREE.Group()
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.055, 8, 16), material)
  ring.rotation.y = Math.PI / 2
  ring.position.y = 0.26
  group.add(ring)

  const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.08), material)
  shaft.position.y = -0.05
  group.add(shaft)
  for (const [x, y] of [[0.1, -0.22], [-0.08, -0.33]]) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.07, 0.08), material)
    tooth.position.set(x, y, 0)
    group.add(tooth)
  }

  const glow = new THREE.PointLight(0xffcb62, 3.5, 3, 2)
  group.add(glow)
  return group
}

export function createKeySystem({ audio, hudCount, onEscape, onPickup, parent, prompt }) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xc99c45,
    emissive: 0x5a3210,
    emissiveIntensity: 1.2,
    metalness: 0.8,
    roughness: 0.28,
  })
  const keys = Array.from({ length: 5 }, () => {
    const mesh = createKeyMesh(material)
    parent.add(mesh)
    return { baseY: FLOOR_Y + 0.7, collected: false, mesh, phase: Math.random() * Math.PI * 2 }
  })
  let collectedCount = 0
  let canEscape = false

  const updateHud = () => {
    hudCount.textContent = `${collectedCount} / ${keys.length}`
  }

  const reset = () => {
    collectedCount = 0
    canEscape = false
    prompt.hidden = true

    keys.forEach((key, index) => {
      const [x, z] = pick(KEY_STAGES[index])
      key.mesh.position.set(x, key.baseY, z)
      key.mesh.visible = index === 0
      key.collected = false
      key.phase = Math.random() * Math.PI * 2
    })
    updateHud()
  }

  const update = (playerPosition, time, active) => {
    prompt.hidden = true
    if (!active) return

    for (const key of keys) {
      if (key.collected || !key.mesh.visible) continue
      key.mesh.rotation.y = time * 0.0014 + key.phase
      key.mesh.position.y = key.baseY + Math.sin(time * 0.0025 + key.phase) * 0.12

      const distanceToKey = Math.hypot(
        key.mesh.position.x - playerPosition.x,
        key.mesh.position.z - playerPosition.z,
      )
      if (distanceToKey <= 1.15) {
        key.collected = true
        key.mesh.visible = false
        collectedCount += 1
        if (collectedCount < keys.length) keys[collectedCount].mesh.visible = true
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
    get total() {
      return keys.length
    },
    interact,
    reset,
    update,
  }
}
