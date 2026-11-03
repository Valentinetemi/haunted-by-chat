import * as THREE from 'three'

import { FLOOR_Y, addBox } from './house.js'

const wood = new THREE.MeshStandardMaterial({ color: 0x2b1710, roughness: 0.88 })
const darkWood = new THREE.MeshStandardMaterial({ color: 0x160c09, roughness: 0.9 })
const brass = new THREE.MeshStandardMaterial({
  color: 0x8c6b32,
  metalness: 0.62,
  roughness: 0.4,
})
const cloth = new THREE.MeshStandardMaterial({ color: 0x3d1117, roughness: 1 })

export function furnishEntrance(parent) {
  const group = new THREE.Group()
  group.name = 'entrance-props'

  addBox(group, [3.2, 0.035, 4.5], [0, FLOOR_Y + 0.025, 5.8], cloth, 'entrance-rug')
  addBox(group, [2.4, 0.16, 0.65], [-2.35, FLOOR_Y + 1.05, 7.9], wood)
  for (const x of [-3.25, -1.45]) {
    addBox(group, [0.14, 1.05, 0.14], [x, FLOOR_Y + 0.52, 7.9], darkWood)
  }

  const candleMaterial = new THREE.MeshStandardMaterial({ color: 0xd3c19a, roughness: 0.75 })
  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffa536, toneMapped: false })
  for (const x of [-2.8, -2.25, -1.75]) {
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.42, 8), candleMaterial)
    candle.position.set(x, FLOOR_Y + 1.34, 7.9)
    group.add(candle)
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), flameMaterial)
    flame.scale.y = 1.7
    flame.position.set(x, FLOOR_Y + 1.59, 7.9)
    group.add(flame)
  }

  const candleLight = new THREE.PointLight(0xff8a32, 4.5, 5, 2)
  candleLight.position.set(-2.3, FLOOR_Y + 1.8, 7.4)
  group.add(candleLight)

  const coatPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 2.7, 8), darkWood)
  coatPost.position.set(2.8, FLOOR_Y + 1.35, 7.8)
  group.add(coatPost)
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 6), brass)
    hook.position.set(
      2.8 + Math.cos(angle) * 0.18,
      FLOOR_Y + 2.45,
      7.8 + Math.sin(angle) * 0.18,
    )
    hook.rotation.z = Math.PI / 2
    hook.rotation.y = angle
    group.add(hook)
  }

  const portrait = addBox(group, [1.35, 1.8, 0.08], [0, FLOOR_Y + 2.15, 9.72], darkWood)
  const portraitFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x4a3e35, roughness: 0.9 }),
  )
  portraitFace.position.set(0, FLOOR_Y + 2.15, 9.67)
  portraitFace.rotation.y = Math.PI
  group.add(portraitFace)
  portrait.userData.hauntedPortrait = true

  parent.add(group)
  return group
}

export function furnishLivingRoom(parent) {
  const group = new THREE.Group()
  group.name = 'living-room-props'
  const upholstery = new THREE.MeshStandardMaterial({ color: 0x30201f, roughness: 1 })
  const stone = new THREE.MeshStandardMaterial({ color: 0x3b3733, roughness: 0.96 })
  const ember = new THREE.MeshBasicMaterial({ color: 0xff541f, toneMapped: false })

  addBox(group, [3.7, 0.65, 1.15], [-9.3, FLOOR_Y + 0.42, 7.6], upholstery, 'living-sofa')
  addBox(group, [3.7, 1.05, 0.35], [-9.3, FLOOR_Y + 1.05, 8.02], upholstery)
  for (const x of [-11.05, -7.55]) {
    addBox(group, [0.35, 0.85, 1.2], [x, FLOOR_Y + 0.62, 7.6], upholstery)
  }

  addBox(group, [2.2, 0.18, 1.1], [-8.8, FLOOR_Y + 0.68, 4.9], wood, 'coffee-table')
  for (const x of [-9.65, -7.95]) {
    for (const z of [4.52, 5.28]) {
      addBox(group, [0.12, 0.65, 0.12], [x, FLOOR_Y + 0.33, z], darkWood)
    }
  }

  addBox(group, [3, 2.7, 0.5], [-11.68, FLOOR_Y + 1.35, 2.2], stone, 'fireplace')
  addBox(group, [1.8, 1.35, 0.18], [-11.39, FLOOR_Y + 0.72, 2.2], darkWood)
  for (const x of [-11.9, -11.35, -10.8]) {
    const coal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.17, 0), ember)
    coal.position.set(x, FLOOR_Y + 0.24, 2.08)
    group.add(coal)
  }
  const fireLight = new THREE.PointLight(0xff4b1f, 7, 7, 2)
  fireLight.position.set(-10.8, FLOOR_Y + 1, 2.6)
  group.add(fireLight)

  const lampShade = new THREE.Mesh(
    new THREE.ConeGeometry(0.45, 0.65, 10, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x7d5b39,
      emissive: 0x5e321c,
      emissiveIntensity: 0.6,
      side: THREE.DoubleSide,
    }),
  )
  lampShade.position.set(-5.3, FLOOR_Y + 2.25, 7.8)
  group.add(lampShade)
  addBox(group, [0.08, 1.8, 0.08], [-5.3, FLOOR_Y + 1.2, 7.8], brass)

  parent.add(group)
  return group
}

export function furnishKitchen(parent) {
  const group = new THREE.Group()
  group.name = 'kitchen-props'
  const cabinet = new THREE.MeshStandardMaterial({ color: 0x354039, roughness: 0.86 })
  const counter = new THREE.MeshStandardMaterial({ color: 0x777872, roughness: 0.55 })
  const appliance = new THREE.MeshStandardMaterial({
    color: 0x687174,
    metalness: 0.45,
    roughness: 0.52,
  })
  const grime = new THREE.MeshStandardMaterial({ color: 0x171a16, roughness: 0.95 })

  for (const x of [5.2, 6.8, 8.4, 10]) {
    addBox(group, [1.45, 0.95, 0.7], [x, FLOOR_Y + 0.48, 9.25], cabinet)
    addBox(group, [1.5, 0.12, 0.82], [x, FLOOR_Y + 1.02, 9.22], counter)
  }
  addBox(group, [1.45, 2.9, 1.05], [11, FLOOR_Y + 1.45, 7.55], appliance, 'refrigerator')
  addBox(group, [1.18, 0.045, 0.04], [11, FLOOR_Y + 1.35, 7], grime)
  addBox(group, [1.55, 0.95, 1.15], [10.7, FLOOR_Y + 0.48, 3.2], appliance, 'oven')
  addBox(group, [1.2, 0.55, 0.05], [10.7, FLOOR_Y + 0.5, 2.61], grime)

  addBox(group, [3.4, 0.85, 1.35], [7.5, FLOOR_Y + 0.44, 4.8], cabinet, 'kitchen-island')
  addBox(group, [3.6, 0.13, 1.55], [7.5, FLOOR_Y + 0.92, 4.8], counter)
  const sink = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, 0.09, 0.72),
    new THREE.MeshStandardMaterial({ color: 0x293235, metalness: 0.6, roughness: 0.35 }),
  )
  sink.position.set(7.5, FLOOR_Y + 1.01, 4.8)
  group.add(sink)

  for (const [x, z, scale] of [[5.3, 1, 0.8], [7.2, 0.4, 1], [9.7, 1.4, 0.65]]) {
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1 * scale, 0.13 * scale, 0.65 * scale, 8),
      new THREE.MeshStandardMaterial({ color: 0x2f4433, transparent: true, opacity: 0.75 }),
    )
    bottle.position.set(x, FLOOR_Y + 0.34 * scale, z)
    bottle.rotation.z = (Math.random() - 0.5) * 0.35
    group.add(bottle)
  }

  parent.add(group)
  return group
}
