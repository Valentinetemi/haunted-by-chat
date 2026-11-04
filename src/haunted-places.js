import * as THREE from 'three'

import { FLOOR_Y } from './house.js'

export const HAUNTED_PLACE_BOUNDS = {
  courtyard: { minX: 28, maxX: 48, minZ: -9, maxZ: 9 },
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

export function createHauntedPlaces(scene) {
  const group = new THREE.Group()
  group.name = 'haunted-places'
  const courtyard = createCourtyard()
  group.add(courtyard)
  scene.add(group)
  return { courtyard, group }
}
