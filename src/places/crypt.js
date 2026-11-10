import * as THREE from 'three'

import { FLOOR_Y } from '../house.js'

function addBox(parent, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
  mesh.position.set(...position)
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function addInstances(parent, geometry, material, positions) {
  const mesh = new THREE.InstancedMesh(geometry, material, positions.length)
  const matrix = new THREE.Matrix4()
  positions.forEach((value, index) => {
    matrix.makeTranslation(value[0], value[1], value[2])
    mesh.setMatrixAt(index, matrix)
  })
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

export function createCrypt() {
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

  const columnPositions = []
  for (const x of [-7.1, 7.1]) {
    for (const z of [-61.5, -55, -48.5]) {
      columnPositions.push([x, FLOOR_Y + 2.12, z])
      addBox(group, [1.7, 0.28, 1.7], [x, FLOOR_Y + 0.14, z], stone)
      addBox(group, [1.45, 0.3, 1.45], [x, FLOOR_Y + 4.12, z], stone)
    }
  }
  addInstances(group, new THREE.CylinderGeometry(0.55, 0.72, 4.25, 6), stone, columnPositions)

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
    group.add(sicklyLight)
  }

  return group
}
