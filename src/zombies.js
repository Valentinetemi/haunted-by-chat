import * as THREE from 'three'

import { FLOOR_Y } from './house.js'

const TYPES = {
  walker: { cash: 8, damage: 12, head: 1.35, height: 1.7, hp: 3, points: 100, radius: 0.42, scale: 1, speed: 1.75 },
  runner: { cash: 12, damage: 10, head: 1.28, height: 1.6, hp: 2, points: 140, radius: 0.36, scale: 0.92, speed: 3.35 },
  crawler: { cash: 10, damage: 8, head: 0.48, height: 0.7, hp: 2, points: 120, radius: 0.46, scale: 1, speed: 2.45 },
  brute: { cash: 36, damage: 22, head: 1.85, height: 2.25, hp: 14, points: 320, radius: 0.62, scale: 1.45, speed: 1.15 },
}

const SKIN = new THREE.MeshStandardMaterial({ color: 0x7d8a72, roughness: 0.86, emissive: 0x1a120c, emissiveIntensity: 0.2 })
const CLOTH = new THREE.MeshStandardMaterial({ color: 0x2a2422, roughness: 0.94 })
const BRUTE_CLOTH = new THREE.MeshStandardMaterial({ color: 0x3a1814, roughness: 0.9 })
const EYE = new THREE.MeshBasicMaterial({ color: 0xd6ff6a })
const WOUND = new THREE.MeshStandardMaterial({ color: 0x6a1a16, roughness: 0.7 })

const SPAWNS = [
  [0, -4],
  [-8, 2],
  [8, 2],
  [0, -14],
  [-8, -16],
  [8, -16],
  [-16, 5],
  [15, 8],
  [16, -6],
  [-17, -4],
  [-16, -17],
  [8, -7],
]

function addPart(parent, geometry, material, position, scale) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(position[0], position[1], position[2])
  if (scale) mesh.scale.set(scale[0], scale[1], scale[2])
  mesh.castShadow = false
  mesh.receiveShadow = false
  parent.add(mesh)
  return mesh
}

const torsoGeo = new THREE.BoxGeometry(0.42, 0.7, 0.24)
const headGeo = new THREE.SphereGeometry(0.16, 8, 6)
const limbGeo = new THREE.BoxGeometry(0.1, 0.55, 0.1)
const eyeGeo = new THREE.SphereGeometry(0.035, 6, 4)

function buildBody(type) {
  const group = new THREE.Group()
  const cloth = type === 'brute' ? BRUTE_CLOTH : CLOTH
  const tall = type !== 'crawler'
  addPart(group, torsoGeo, cloth, [0, tall ? 0.95 : 0.32, 0], type === 'brute' ? [1.5, 1.35, 1.4] : [1, tall ? 1 : 0.7, 1])
  const head = addPart(group, headGeo, SKIN, [0, tall ? 1.48 : 0.62, 0.02], type === 'brute' ? [1.35, 1.2, 1.2] : [1, 1, 1])
  addPart(group, eyeGeo, EYE, [-0.05, tall ? 1.52 : 0.66, 0.12])
  addPart(group, eyeGeo, EYE, [0.05, tall ? 1.52 : 0.66, 0.12])
  addPart(group, limbGeo, SKIN, [-0.28, tall ? 0.9 : 0.28, 0.02])
  addPart(group, limbGeo, type === 'brute' ? WOUND : SKIN, [0.28, tall ? 0.9 : 0.28, 0.02])
  if (tall) {
    addPart(group, limbGeo, CLOTH, [-0.12, 0.35, 0])
    addPart(group, limbGeo, CLOTH, [0.12, 0.35, 0])
  }
  group.userData.head = head
  return group
}

function pickSpawn(player) {
  const open = SPAWNS.filter(([x, z]) => (x - player.x) ** 2 + (z - player.z) ** 2 > 7 ** 2)
  const pool = open.length > 0 ? open : SPAWNS
  return pool[Math.floor(Math.random() * pool.length)]
}

export function createZombieHorde(parent) {
  const zombies = []
  const limit = 14

  const make = (typeName) => {
    const type = TYPES[typeName]
    const mesh = buildBody(typeName)
    mesh.visible = false
    mesh.scale.setScalar(type.scale)
    parent.add(mesh)
    return {
      attackAt: 0,
      fall: 0,
      hp: type.hp,
      knock: new THREE.Vector3(),
      mesh,
      phase: Math.random() * Math.PI * 2,
      removeAt: 0,
      type: typeName,
      stats: type,
    }
  }

  const pool = ['walker', 'runner', 'crawler', 'brute'].flatMap((name) =>
    Array.from({ length: name === 'brute' ? 2 : 4 }, () => make(name)),
  )

  const living = () => zombies.filter((zombie) => zombie.mesh.visible && zombie.hp > 0)

  const spawn = (typeName, x, z) => {
    if (living().length >= limit) return null
    const zombie = pool.find((entry) => entry.type === typeName && !entry.mesh.visible)
    if (!zombie) return null
    zombie.hp = zombie.stats.hp
    zombie.fall = 0
    zombie.knock.set(0, 0, 0)
    zombie.removeAt = 0
    zombie.attackAt = 0
    zombie.mesh.visible = true
    zombie.mesh.rotation.set(typeName === 'crawler' ? 1.15 : 0, 0, 0)
    zombie.mesh.position.set(x, FLOOR_Y, z)
    zombies.push(zombie)
    return zombie
  }

  const spawnWave = (wave, player) => {
    const count = Math.min(3 + wave, 8)
    const bag = ['walker', 'walker']
    if (wave >= 2) bag.push('runner', 'walker')
    if (wave >= 3) bag.push('crawler', 'runner')
    if (wave % 3 === 0) bag.push('brute')
    let spawned = 0
    for (let index = 0; index < count; index += 1) {
      const [x, z] = pickSpawn(player)
      const typeName = bag[Math.floor(Math.random() * bag.length)]
      if (spawn(typeName, x + (Math.random() - 0.5) * 1.4, z + (Math.random() - 0.5) * 1.4)) spawned += 1
    }
    return spawned
  }

  const aim = new THREE.Vector3()
  const center = new THREE.Vector3()
  const size = new THREE.Vector3()
  const hitPoint = new THREE.Vector3()
  const box = new THREE.Box3()

  const rayHit = (ray) => {
    let closest = null
    let closestDistance = Infinity
    for (const zombie of living()) {
      const height = zombie.stats.height * zombie.stats.scale
      center.set(
        zombie.mesh.position.x,
        zombie.mesh.position.y + height * 0.5,
        zombie.mesh.position.z,
      )
      size.set(zombie.stats.radius * 2, height, zombie.stats.radius * 2)
      box.setFromCenterAndSize(center, size)
      const point = ray.intersectBox(box, hitPoint)
      if (!point) continue
      const distance = point.distanceTo(ray.origin)
      if (distance > 32 || distance >= closestDistance) continue
      closestDistance = distance
      const headshot = point.y - zombie.mesh.position.y > zombie.stats.head * zombie.stats.scale * 0.92
      closest = { distance, headshot, point: point.clone(), zombie }
    }
    return closest
  }

  const damage = (zombie, { amount, direction, force = 2.2 }) => {
    if (!zombie.mesh.visible || zombie.hp <= 0) return false
    zombie.hp -= amount
    zombie.knock.addScaledVector(direction, force)
    zombie.fall = Math.min(1.6, zombie.fall + (zombie.hp <= 0 ? 1.3 : 0.38))
    if (zombie.hp <= 0) {
      zombie.removeAt = performance.now() + 900
      return true
    }
    return false
  }

  const update = (delta, time, player, active) => {
    const bites = []
    for (let index = zombies.length - 1; index >= 0; index -= 1) {
      const zombie = zombies[index]
      if (!zombie.mesh.visible) {
        zombies.splice(index, 1)
        continue
      }
      if (zombie.hp <= 0) {
        zombie.mesh.rotation.x = THREE.MathUtils.lerp(zombie.mesh.rotation.x, 1.45, 0.15)
        zombie.mesh.position.addScaledVector(zombie.knock, delta)
        zombie.knock.multiplyScalar(0.9)
        if (time >= zombie.removeAt) {
          zombie.mesh.visible = false
          zombies.splice(index, 1)
        }
        continue
      }
      if (!active) continue
      const direction = aim
      direction.set(player.x - zombie.mesh.position.x, 0, player.z - zombie.mesh.position.z)
      const distance = direction.length()
      if (distance > 0.001) {
        direction.multiplyScalar(1 / distance)
        const speed = zombie.stats.speed * (zombie.fall > 0.2 ? 0.35 : 1)
        zombie.mesh.position.addScaledVector(direction, speed * delta)
        zombie.mesh.position.addScaledVector(zombie.knock, delta)
        zombie.knock.multiplyScalar(0.86)
        zombie.mesh.lookAt(player.x, zombie.mesh.position.y, player.z)
      }
      const bob = Math.sin(time * 0.008 * zombie.stats.speed + zombie.phase) * 0.04
      zombie.mesh.position.y = FLOOR_Y + bob
      const upright = zombie.type === 'crawler' ? 1.15 : 0
      zombie.mesh.rotation.x = THREE.MathUtils.lerp(zombie.mesh.rotation.x, upright + zombie.fall, 0.2)
      zombie.fall = Math.max(0, zombie.fall - delta * 0.8)
      if (distance < zombie.stats.radius + 0.7 && time >= zombie.attackAt) {
        zombie.attackAt = time + 900
        bites.push({ damage: zombie.stats.damage, zombie })
      }
    }
    return bites
  }

  const reset = () => {
    for (const zombie of pool) zombie.mesh.visible = false
    zombies.length = 0
  }

  return {
    get alive() {
      return living().length
    },
    damage,
    rayHit,
    reset,
    spawn,
    spawnWave,
    update,
  }
}
