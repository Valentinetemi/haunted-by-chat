import * as THREE from 'three'

import { FLOOR_Y } from './house.js'

const AMMO_SPOTS = [
  [-9.2, 3.4],
  [7.4, 6.6],
  [-7.2, -6.4],
  [8.4, -6.2],
  [-8.6, -16.4],
  [7.2, -16.8],
  [-16.8, 4.6],
  [15.4, 7.6],
  [16.8, -5.4],
  [-18.4, -3.2],
  [-16.2, -16.2],
  [36.5, 2.4],
  [2.4, -56.5],
  [-36.4, -2.2],
]

function createRevolver() {
  const group = new THREE.Group()
  group.name = 'revolver'
  const steel = new THREE.MeshStandardMaterial({
    color: 0x3c4148,
    metalness: 0.72,
    roughness: 0.38,
  })
  const grip = new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.78 })
  const brass = new THREE.MeshStandardMaterial({
    color: 0x8a7044,
    metalness: 0.6,
    roughness: 0.4,
  })

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

  const hammer = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.03), steel)
  hammer.position.set(0, 0.08, 0.04)
  group.add(hammer)

  const flashMaterial = new THREE.MeshBasicMaterial({
    color: 0xffe2a8,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    toneMapped: false,
  })
  const flashMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.16), flashMaterial)
  flashMesh.position.set(0, 0.045, -0.36)
  flashMesh.visible = false
  group.add(flashMesh)
  const flashLight = new THREE.PointLight(0xffd2a2, 0, 4.5, 2)
  flashLight.position.set(0, 0.04, -0.34)
  group.add(flashLight)

  group.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = false
      object.receiveShadow = false
    }
  })

  return { cylinder, flashLight, flashMesh, group }
}

export function createWeapon(camera) {
  const { cylinder, flashLight, flashMesh, group } = createRevolver()
  group.position.set(0.32, -0.28, -0.48)
  camera.add(group)
  let kick = 0
  let flashUntil = 0

  return {
    group,
    kick(time) {
      kick = 1
      flashUntil = time + 60
      cylinder.rotation.x += Math.PI / 3
    },
    update(time, delta) {
      kick += (0 - kick) * (1 - Math.exp(-12 * delta))
      group.position.z = -0.48 + kick * 0.14
      group.rotation.x = -kick * 0.22
      const flashing = time < flashUntil
      flashMesh.visible = flashing
      flashLight.intensity = flashing ? 7 : 0
      return kick
    },
  }
}

export function createAmmoPickups(parent) {
  const boxMaterial = new THREE.MeshStandardMaterial({
    color: 0x6a4a2a,
    roughness: 0.7,
    metalness: 0.2,
  })
  const stripe = new THREE.MeshStandardMaterial({
    color: 0xc2a15a,
    emissive: 0x5a3a10,
    emissiveIntensity: 0.4,
    metalness: 0.4,
    roughness: 0.45,
  })
  const pickups = Array.from({ length: 8 }, () => {
    const mesh = new THREE.Group()
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.1, 0.14), boxMaterial)
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.03, 0.15), stripe)
    band.position.y = 0.02
    mesh.add(body, band)
    parent.add(mesh)
    return { baseY: FLOOR_Y + 0.2, mesh, taken: false }
  })

  const reset = () => {
    const pool = [...AMMO_SPOTS]
    pickups.forEach((pickup) => {
      const index = Math.floor(Math.random() * pool.length)
      const [x, z] = pool.splice(index, 1)[0]
      pickup.mesh.position.set(x, FLOOR_Y + 0.2, z)
      pickup.mesh.visible = true
      pickup.taken = false
      pickup.baseY = FLOOR_Y + 0.2
    })
  }

  const update = (playerPosition, time, active) => {
    let gained = 0
    for (const pickup of pickups) {
      if (pickup.taken) continue
      pickup.mesh.rotation.y = time * 0.001
      pickup.mesh.position.y = pickup.baseY + Math.sin(time * 0.003) * 0.04
      if (!active) continue
      const distance = Math.hypot(
        pickup.mesh.position.x - playerPosition.x,
        pickup.mesh.position.z - playerPosition.z,
      )
      if (distance < 1.25 && Math.abs(pickup.mesh.position.y - playerPosition.y) < 2.2) {
        pickup.taken = true
        pickup.mesh.visible = false
        gained += 4
      }
    }
    return gained
  }

  reset()
  return { reset, update }
}
