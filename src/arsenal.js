import * as THREE from 'three'

import { FLOOR_Y } from './house.js'

const DEFINITIONS = {
  revolver: {
    auto: false,
    cooldown: 340,
    damage: 2,
    headDamage: 6,
    magSize: 6,
    name: 'Revolver',
    pellets: 1,
    reserve: 24,
    spread: 0.012,
  },
  shotgun: {
    auto: false,
    cooldown: 760,
    damage: 1,
    headDamage: 3,
    magSize: 5,
    name: 'Shotgun',
    pellets: 7,
    reserve: 15,
    spread: 0.14,
  },
  smg: {
    auto: true,
    cooldown: 90,
    damage: 1,
    headDamage: 2,
    magSize: 30,
    name: 'SMG',
    pellets: 1,
    reserve: 60,
    spread: 0.055,
  },
}

function makeFlash(group, z) {
  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 0.18),
    new THREE.MeshBasicMaterial({
      color: 0xffe2a8,
      depthWrite: false,
      opacity: 0.95,
      toneMapped: false,
      transparent: true,
    }),
  )
  flash.position.set(0, 0.04, z)
  flash.visible = false
  const light = new THREE.PointLight(0xffd2a2, 0, 4.2, 2)
  light.position.copy(flash.position)
  group.add(flash, light)
  return { flash, light }
}

function buildRevolver() {
  const group = new THREE.Group()
  group.name = 'revolver'
  const steel = new THREE.MeshStandardMaterial({ color: 0x3c4148, metalness: 0.72, roughness: 0.38 })
  const grip = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.78 })
  const brass = new THREE.MeshStandardMaterial({ color: 0x8a7044, metalness: 0.6, roughness: 0.4 })
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.16, 0.08), grip)
  handle.position.set(0, -0.08, 0.04)
  handle.rotation.x = 0.35
  group.add(handle)
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.16), steel)
  frame.position.set(0, 0.02, -0.02)
  group.add(frame)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.28, 8), steel)
  barrel.rotation.x = Math.PI / 2
  barrel.position.set(0, 0.045, -0.2)
  group.add(barrel)
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.07, 10), brass)
  cylinder.rotation.z = Math.PI / 2
  cylinder.position.set(0, 0.03, -0.02)
  group.add(cylinder)
  const { flash, light } = makeFlash(group, -0.36)
  group.position.set(0.32, -0.28, -0.48)
  return { cylinder, flash, group, light }
}

function buildShotgun() {
  const group = new THREE.Group()
  group.name = 'shotgun'
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a2c18, roughness: 0.8 })
  const steel = new THREE.MeshStandardMaterial({ color: 0x2e3238, metalness: 0.66, roughness: 0.4 })
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.28), wood)
  stock.position.set(0, -0.02, 0.12)
  group.add(stock)
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.46), steel)
  barrel.position.set(0, 0.04, -0.16)
  group.add(barrel)
  const { flash, light } = makeFlash(group, -0.42)
  group.position.set(0.34, -0.26, -0.42)
  return { flash, group, light }
}

function buildSmg() {
  const group = new THREE.Group()
  group.name = 'smg'
  const steel = new THREE.MeshStandardMaterial({ color: 0x24282e, metalness: 0.7, roughness: 0.35 })
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.28), steel)
  body.position.set(0, 0.02, -0.02)
  group.add(body)
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22, 8), steel)
  barrel.rotation.x = Math.PI / 2
  barrel.position.set(0, 0.05, -0.22)
  group.add(barrel)
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.05), steel)
  mag.position.set(0, -0.08, 0)
  group.add(mag)
  const { flash, light } = makeFlash(group, -0.34)
  group.position.set(0.28, -0.24, -0.4)
  return { flash, group, light }
}

function hand(color) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.72 })
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.12), material)
  mesh.position.set(0.22, -0.3, -0.28)
  mesh.castShadow = false
  return { material, mesh }
}

export function createArsenal(camera) {
  const models = {
    revolver: buildRevolver(),
    shotgun: buildShotgun(),
    smg: buildSmg(),
  }
  const palm = hand(0xc49272)
  camera.add(palm.mesh)
  for (const model of Object.values(models)) {
    model.group.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = false
        object.receiveShadow = false
      }
    })
    model.group.visible = false
    camera.add(model.group)
  }

  const owned = { grenade: true, revolver: true, shotgun: false, smg: false }
  const carried = { grenade: true, revolver: true, shotgun: false, smg: false }
  const state = {}
  for (const [id, definition] of Object.entries(DEFINITIONS)) {
    state[id] = {
      ...definition,
      loaded: id === 'revolver' ? definition.magSize : 0,
      reserve: id === 'revolver' ? definition.reserve : 0,
    }
  }
  let grenades = 2
  let grenadeStock = 2
  let reloadScale = 1
  let currentId = 'revolver'
  let kick = 0
  let flashUntil = 0
  let nextShotAt = 0
  let triggerHeld = false

  const show = () => {
    for (const [id, model] of Object.entries(models)) model.group.visible = id === currentId
  }
  show()

  const current = () => state[currentId]

  return {
    get currentId() {
      return currentId
    },
    get grenades() {
      return grenades
    },
    get kick() {
      return kick
    },
    get name() {
      return currentId === 'grenade' ? 'Grenade' : current().name
    },
    get loaded() {
      return currentId === 'grenade' ? grenades : current().loaded
    },
    get reserve() {
      return currentId === 'grenade' ? 0 : current().reserve
    },
    addGrenades(amount) {
      grenades += amount
    },
    addBullets(id, amount) {
      if (!state[id]) return
      state[id].reserve += amount
      if (owned[id] && state[id].loaded === 0) {
        const taken = Math.min(state[id].magSize, state[id].reserve)
        state[id].loaded += taken
        state[id].reserve -= taken
      }
    },
    grant(id) {
      if (id === 'grenade') {
        grenades += 2
        return
      }
      if (!state[id]) return
      const alreadyCarried = Boolean(owned[id] || carried[id])
      carried[id] = true
      if (!alreadyCarried) {
        state[id].loaded = DEFINITIONS[id].magSize
        state[id].reserve = DEFINITIONS[id].reserve
        return
      }
      state[id].reserve += 8
    },
    unlock(id) {
      if (!owned[id] && state[id]) owned[id] = true
      carried[id] = true
    },
    owns: (id) => Boolean(owned[id] || carried[id]),
    setGrenadeStock(amount) {
      grenadeStock = amount
    },
    setReloadScale(scale) {
      reloadScale = scale
    },
    setHand(color) {
      palm.material.color.set(color)
    },
    setTrigger(held) {
      triggerHeld = held
    },
    switchTo(id) {
      if (id === 'grenade') {
        if (!owned.grenade || grenades <= 0) return false
        currentId = 'grenade'
        for (const model of Object.values(models)) model.group.visible = false
        return true
      }
      if (!owned[id] && !carried[id]) return false
      currentId = id
      show()
      return true
    },
    cycle() {
      const order = ['revolver', 'shotgun', 'smg', 'grenade']
      const start = order.indexOf(currentId)
      for (let step = 1; step <= order.length; step += 1) {
        const id = order[(start + step) % order.length]
        if (id === 'grenade' ? grenades > 0 : owned[id] || carried[id]) {
          this.switchTo(id)
          return id
        }
      }
      return currentId
    },
    reload(time) {
      if (currentId === 'grenade') return false
      const weapon = current()
      if (weapon.reloadReadyAt && time < weapon.reloadReadyAt) return false
      if (weapon.loaded >= weapon.magSize || weapon.reserve <= 0) return false
      weapon.reloadReadyAt = time + (weapon.magSize > 8 ? 1100 : 1400) * reloadScale
      return true
    },
    finishReload(time) {
      if (currentId === 'grenade') return false
      const weapon = current()
      if (!weapon.reloadReadyAt || time < weapon.reloadReadyAt) return false
      const taken = Math.min(weapon.magSize - weapon.loaded, weapon.reserve)
      weapon.loaded += taken
      weapon.reserve -= taken
      weapon.reloadReadyAt = 0
      return true
    },
    reloading() {
      return currentId !== 'grenade' && current().reloadReadyAt > performance.now()
    },
    pull(time) {
      if (currentId === 'grenade') {
        if (grenades <= 0 || time < nextShotAt) return null
        grenades -= 1
        nextShotAt = time + 700
        kick = 0.6
        if (grenades <= 0) this.switchTo('revolver')
        return { grenade: true }
      }
      const weapon = current()
      if (weapon.reloadReadyAt && time < weapon.reloadReadyAt) return null
      if (time < nextShotAt) return null
      if (weapon.auto && !triggerHeld && time !== weapon.forcedAt) return null
      if (weapon.loaded <= 0) return { empty: true }
      weapon.loaded -= 1
      nextShotAt = time + weapon.cooldown
      kick = 1
      flashUntil = time + (weapon.pellets > 1 ? 80 : 50)
      const model = models[currentId]
      if (model.cylinder) model.cylinder.rotation.x += 0.8
      const pellets = []
      for (let index = 0; index < weapon.pellets; index += 1) {
        pellets.push({
          damage: weapon.damage,
          headDamage: weapon.headDamage,
          spread: (Math.random() - 0.5) * weapon.spread,
          spreadY: (Math.random() - 0.5) * weapon.spread * 0.6,
        })
      }
      return { grenade: false, pellets }
    },
    tap(time) {
      const wasHeld = triggerHeld
      if (currentId !== 'grenade' && current().auto) {
        current().forcedAt = time
        triggerHeld = true
        const shot = this.pull(time)
        triggerHeld = wasHeld
        return shot
      }
      return this.pull(time)
    },
    holdFire(time) {
      if (currentId === 'grenade' || !current().auto || !triggerHeld) return null
      return this.pull(time)
    },
    update(time, delta) {
      kick += (0 - kick) * (1 - Math.exp(-12 * delta))
      const model = models[currentId]
      if (model) {
        model.group.position.z = (currentId === 'shotgun' ? -0.42 : currentId === 'smg' ? -0.4 : -0.48) + kick * 0.16
        model.group.rotation.x = -kick * (currentId === 'shotgun' ? 0.28 : 0.2)
        const flashing = time < flashUntil
        model.flash.visible = flashing
        model.light.intensity = flashing ? (currentId === 'shotgun' ? 12 : 7) : 0
      }
      return kick
    },
    reset() {
      carried.shotgun = owned.shotgun
      carried.smg = owned.smg
      currentId = 'revolver'
      grenades = owned.grenade ? grenadeStock : 0
      nextShotAt = 0
      for (const [id, definition] of Object.entries(DEFINITIONS)) {
        state[id].loaded = owned[id] ? definition.magSize : 0
        state[id].reserve = owned[id] ? definition.reserve : 0
        state[id].reloadReadyAt = 0
      }
      kick = 0
      triggerHeld = false
      show()
    },
  }
}

export function createWeaponPickups(parent) {
  const spots = {
    shotgun: [[1.2, 4.2], [8.4, 3.2]],
    smg: [[-8.4, 3.6], [6.8, -6.4]],
    grenade: [[0.4, -6], [-16.2, 6.2]],
  }
  const materials = {
    grenade: new THREE.MeshStandardMaterial({ color: 0x3d6a32, roughness: 0.55 }),
    shotgun: new THREE.MeshStandardMaterial({ color: 0x8a5a32, emissive: 0x3a2412, emissiveIntensity: 0.4 }),
    smg: new THREE.MeshStandardMaterial({ color: 0x66707a, emissive: 0x22262c, emissiveIntensity: 0.35 }),
  }
  const pickups = []
  for (const [id, places] of Object.entries(spots)) {
    const [x, z] = places[Math.floor(Math.random() * places.length)]
    const mesh = new THREE.Mesh(
      id === 'grenade' ? new THREE.SphereGeometry(0.16, 8, 6) : new THREE.BoxGeometry(0.45, 0.14, 0.16),
      materials[id],
    )
    mesh.position.set(x, FLOOR_Y + 0.45, z)
    mesh.castShadow = false
    parent.add(mesh)
    pickups.push({ baseY: mesh.position.y, id, mesh, taken: false })
  }
  return {
    reset() {
      for (const pickup of pickups) {
        const places = spots[pickup.id]
        const [x, z] = places[Math.floor(Math.random() * places.length)]
        pickup.mesh.position.set(x, FLOOR_Y + 0.45, z)
        pickup.mesh.visible = true
        pickup.taken = false
      }
    },
    update(player, time, active) {
      const found = []
      for (const pickup of pickups) {
        if (pickup.taken) continue
        pickup.mesh.rotation.y = time * 0.0015
        pickup.mesh.position.y = pickup.baseY + Math.sin(time * 0.003) * 0.06
        if (!active) continue
        const distance = Math.hypot(player.x - pickup.mesh.position.x, player.z - pickup.mesh.position.z)
        if (distance < 1.5 && Math.abs(player.y - pickup.baseY) < 2.4) {
          pickup.taken = true
          pickup.mesh.visible = false
          found.push(pickup.id)
        }
      }
      return found
    },
  }
}

export function createGrenades(scene) {
  const material = new THREE.MeshStandardMaterial({ color: 0x3d6a32, roughness: 0.5 })
  const geometry = new THREE.SphereGeometry(0.12, 8, 6)
  const grenades = Array.from({ length: 5 }, () => {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.visible = false
    mesh.castShadow = false
    scene.add(mesh)
    return { active: false, explodeAt: 0, mesh, velocity: new THREE.Vector3() }
  })

  return {
    throw(origin, direction) {
      const grenade = grenades.find((entry) => !entry.active)
      if (!grenade) return false
      grenade.mesh.visible = true
      grenade.mesh.position.copy(origin)
      grenade.velocity.copy(direction).multiplyScalar(11)
      grenade.velocity.y += 3.2
      grenade.active = true
      grenade.explodeAt = performance.now() + 1100
      return true
    },
    update(delta, time) {
      const blasts = []
      for (const grenade of grenades) {
        if (!grenade.active) continue
        grenade.velocity.y -= 12 * delta
        grenade.mesh.position.addScaledVector(grenade.velocity, delta)
        if (grenade.mesh.position.y < FLOOR_Y + 0.12) {
          grenade.mesh.position.y = FLOOR_Y + 0.12
          grenade.velocity.y *= -0.35
          grenade.velocity.x *= 0.7
          grenade.velocity.z *= 0.7
        }
        if (time < grenade.explodeAt) continue
        grenade.active = false
        grenade.mesh.visible = false
        blasts.push(grenade.mesh.position.clone())
      }
      return blasts
    },
    reset() {
      for (const grenade of grenades) {
        grenade.active = false
        grenade.mesh.visible = false
      }
    },
  }
}
