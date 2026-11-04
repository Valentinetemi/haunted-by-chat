import * as THREE from 'three'

import { FLOOR_Y } from './house.js'

export const HAUNTED_PLACE_BOUNDS = {
  courtyard: { minX: 28, maxX: 48, minZ: -9, maxZ: 9 },
  crypt: { minX: -10, maxX: 10, minZ: -65, maxZ: -45 },
  mirror: { minX: -48, maxX: -28, minZ: -9, maxZ: 9 },
}

function addBox(parent, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function createDeadTree(parent, x, z, scale = 1) {
  const bark = new THREE.MeshStandardMaterial({ color: 0x171313, roughness: 1 })
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22 * scale, 0.38 * scale, 4.8 * scale, 7),
    bark,
  )
  trunk.position.set(x, FLOOR_Y + 2.35 * scale, z)
  trunk.rotation.z = 0.08
  trunk.castShadow = true
  parent.add(trunk)

  for (const [height, length, angle, tilt] of [
    [3.3, 2.4, 0.4, 0.9],
    [3.7, 2.1, 2.7, 1.05],
    [4.2, 1.7, 4.7, 0.88],
  ]) {
    const branch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06 * scale, 0.16 * scale, length * scale, 6),
      bark,
    )
    branch.position.set(
      x + Math.sin(angle) * length * 0.34 * scale,
      FLOOR_Y + height * scale,
      z + Math.cos(angle) * length * 0.34 * scale,
    )
    branch.rotation.order = 'YXZ'
    branch.rotation.set(tilt, angle, 0)
    branch.castShadow = true
    parent.add(branch)
  }
}

function createCourtyard() {
  const group = new THREE.Group()
  group.name = 'moonlit-courtyard'
  const stone = new THREE.MeshStandardMaterial({ color: 0x26302e, roughness: 0.94 })
  const wetStone = new THREE.MeshStandardMaterial({
    color: 0x1a2425,
    roughness: 0.48,
    metalness: 0.08,
  })
  const iron = new THREE.MeshStandardMaterial({ color: 0x101415, roughness: 0.72, metalness: 0.68 })
  const graveStone = new THREE.MeshStandardMaterial({ color: 0x3c4542, roughness: 1 })

  addBox(group, [20, 0.25, 18], [38, FLOOR_Y - 0.14, 0], stone)
  for (let x = 29; x <= 47; x += 2) {
    for (let z = -8; z <= 8; z += 2) {
      if ((x + z) % 4 !== 1) continue
      const slab = addBox(group, [1.55, 0.035, 1.55], [x, FLOOR_Y + 0.015, z], wetStone)
      slab.rotation.y = ((x * 7 + z * 3) % 5) * 0.035
    }
  }

  for (const x of [28.25, 47.75]) {
    for (let z = -8.4; z <= 8.4; z += 1.4) {
      addBox(group, [0.08, 2.2, 0.08], [x, FLOOR_Y + 1.1, z], iron)
    }
    addBox(group, [0.12, 0.12, 17], [x, FLOOR_Y + 0.5, 0], iron)
    addBox(group, [0.12, 0.12, 17], [x, FLOOR_Y + 1.65, 0], iron)
  }
  for (const z of [-8.75, 8.75]) {
    for (let x = 29; x <= 47; x += 1.4) {
      addBox(group, [0.08, 2.2, 0.08], [x, FLOOR_Y + 1.1, z], iron)
    }
    addBox(group, [18, 0.12, 0.12], [38, FLOOR_Y + 1.65, z], iron)
  }

  for (const [x, z, height] of [
    [31.5, -5.7, 1.5],
    [34.2, -6.4, 1.25],
    [43.8, -5.8, 1.6],
    [45.4, 3.6, 1.35],
    [31.8, 4.8, 1.45],
  ]) {
    addBox(group, [0.85, height, 0.28], [x, FLOOR_Y + height / 2, z], graveStone)
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.43, 8, 5, 0, Math.PI * 2, 0, Math.PI / 2), graveStone)
    cap.scale.z = 0.33
    cap.position.set(x, FLOOR_Y + height, z)
    cap.castShadow = true
    group.add(cap)
  }

  createDeadTree(group, 44.4, 5.5, 0.92)
  createDeadTree(group, 31, 1.3, 0.72)

  const moon = new THREE.DirectionalLight(0x9cc8ff, 3.2)
  moon.position.set(32, 12, 4)
  moon.target.position.set(38, FLOOR_Y, 0)
  moon.castShadow = true
  moon.shadow.mapSize.set(512, 512)
  moon.shadow.camera.left = -12
  moon.shadow.camera.right = 12
  moon.shadow.camera.top = 12
  moon.shadow.camera.bottom = -12
  group.add(moon, moon.target)

  const mistGlow = new THREE.PointLight(0x7198c7, 15, 22, 2)
  mistGlow.position.set(38, FLOOR_Y + 3.2, 0)
  group.add(mistGlow)
  return group
}

function createCrypt() {
  const group = new THREE.Group()
  group.name = 'underground-crypt'
  const stone = new THREE.MeshStandardMaterial({ color: 0x292b28, roughness: 1 })
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x161817, roughness: 0.96 })
  const tombStone = new THREE.MeshStandardMaterial({ color: 0x383b35, roughness: 0.88 })
  const flameMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd38a,
    emissive: 0xff8c32,
    emissiveIntensity: 2.8,
  })

  addBox(group, [20, 0.25, 20], [0, FLOOR_Y - 0.14, -55], stone)
  addBox(group, [20, 0.2, 20], [0, FLOOR_Y + 4.3, -55], darkStone)
  addBox(group, [0.35, 6, 20], [-9.85, FLOOR_Y + 2.3, -55], darkStone)
  addBox(group, [0.35, 6, 20], [9.85, FLOOR_Y + 2.3, -55], darkStone)
  addBox(group, [20, 6, 0.35], [0, FLOOR_Y + 2.3, -64.85], darkStone)
  addBox(group, [20, 6, 0.35], [0, FLOOR_Y + 2.3, -45.15], darkStone)

  for (const x of [-7.1, 7.1]) {
    for (const z of [-61.5, -55, -48.5]) {
      const column = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.72, 4.25, 8), stone)
      column.position.set(x, FLOOR_Y + 2.12, z)
      column.castShadow = true
      column.receiveShadow = true
      group.add(column)
      addBox(group, [1.7, 0.28, 1.7], [x, FLOOR_Y + 0.14, z], stone)
      addBox(group, [1.45, 0.3, 1.45], [x, FLOOR_Y + 4.12, z], stone)
    }
  }

  for (const [x, z, rotation] of [
    [-4.3, -61.2, 0.05],
    [3.7, -60.3, -0.08],
    [-4.5, -51.9, -0.04],
    [4.2, -49.5, 0.07],
  ]) {
    const tomb = new THREE.Group()
    tomb.position.set(x, 0, z)
    tomb.rotation.y = rotation
    addBox(tomb, [2.5, 0.72, 1.25], [0, FLOOR_Y + 0.36, 0], tombStone)
    addBox(tomb, [2.25, 0.18, 1], [0, FLOOR_Y + 0.81, 0], stone)
    group.add(tomb)
  }

  const altar = addBox(group, [3.4, 1.35, 1.6], [0, FLOOR_Y + 0.67, -62.2], tombStone)
  altar.rotation.y = 0.02
  for (const x of [-1.1, 0, 1.1]) {
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.45, 8), flameMaterial)
    candle.position.set(x, FLOOR_Y + 1.58, -62.2)
    group.add(candle)
    const candleLight = new THREE.PointLight(0xff8438, 7, 5, 2)
    candleLight.position.set(x, FLOOR_Y + 1.9, -62.2)
    group.add(candleLight)
  }

  for (const [x, z] of [[-6, -57.8], [6, -53.4]]) {
    const sicklyLight = new THREE.PointLight(0x72977a, 16, 11, 2)
    sicklyLight.position.set(x, FLOOR_Y + 2.4, z)
    sicklyLight.castShadow = true
    sicklyLight.shadow.mapSize.set(256, 256)
    group.add(sicklyLight)
  }

  return group
}

function createMirrorRealm() {
  const group = new THREE.Group()
  group.name = 'fractured-mirror-realm'
  const voidMaterial = new THREE.MeshStandardMaterial({
    color: 0x080a12,
    roughness: 0.18,
    metalness: 0.72,
  })
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x1e1825,
    roughness: 0.38,
    metalness: 0.72,
  })
  const mirrorMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x8ba1b8,
    emissive: 0x25344a,
    emissiveIntensity: 0.85,
    metalness: 0.88,
    roughness: 0.08,
    clearcoat: 0.9,
  })

  addBox(group, [20, 0.22, 18], [-38, FLOOR_Y - 0.13, 0], voidMaterial)
  for (const [x, z, rotation, width, height] of [
    [-46.8, -5.6, 0.2, 2.3, 4.5],
    [-45.8, 4.8, -0.28, 1.8, 3.7],
    [-41.8, -7.3, 0.08, 2.1, 4.2],
    [-35.2, 6.8, 0.12, 2.5, 4.8],
    [-29.4, -4.4, -0.2, 2, 4],
    [-30.2, 4.7, 0.24, 1.7, 3.4],
  ]) {
    const mirror = new THREE.Group()
    mirror.position.set(x, 0, z)
    mirror.rotation.y = rotation
    addBox(mirror, [width + 0.28, height + 0.28, 0.18], [0, FLOOR_Y + height / 2, 0], frameMaterial)
    addBox(mirror, [width, height, 0.1], [0, FLOOR_Y + height / 2, -0.12], mirrorMaterial)
    group.add(mirror)
  }

  const shardGeometry = new THREE.ConeGeometry(0.26, 1.3, 3)
  for (let index = 0; index < 24; index += 1) {
    const angle = index * 2.399
    const radius = 2.2 + (index % 6) * 1.15
    const shard = new THREE.Mesh(shardGeometry, mirrorMaterial)
    shard.position.set(
      -38 + Math.cos(angle) * radius,
      FLOOR_Y + 0.3 + (index % 4) * 0.48,
      Math.sin(angle) * radius,
    )
    shard.rotation.set(angle * 0.3, angle, index * 0.42)
    shard.scale.setScalar(0.6 + (index % 3) * 0.22)
    shard.castShadow = true
    group.add(shard)
  }

  for (const [x, z, color] of [
    [-44, -3, 0x7a68ba],
    [-38, 4, 0x91c9e8],
    [-31.5, -2, 0xc26e9d],
  ]) {
    const light = new THREE.PointLight(color, 22, 12, 2)
    light.position.set(x, FLOOR_Y + 2.4, z)
    group.add(light)
  }

  const overheadGlow = new THREE.DirectionalLight(0xb8c9ff, 1.8)
  overheadGlow.position.set(-38, 10, 0)
  overheadGlow.target.position.set(-38, FLOOR_Y, 0)
  group.add(overheadGlow, overheadGlow.target)
  return group
}

export function createHauntedPlaces(scene) {
  const group = new THREE.Group()
  group.name = 'haunted-places'
  const courtyard = createCourtyard()
  const crypt = createCrypt()
  const mirror = createMirrorRealm()
  group.add(courtyard, crypt, mirror)
  scene.add(group)
  return { courtyard, crypt, group, mirror }
}
