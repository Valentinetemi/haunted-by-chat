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

export function createMirrorRealm() {
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
  const shards = new THREE.InstancedMesh(shardGeometry, mirrorMaterial, 24)
  const shardMatrix = new THREE.Matrix4()
  const shardPosition = new THREE.Vector3()
  const shardQuaternion = new THREE.Quaternion()
  const shardScale = new THREE.Vector3()
  const shardEuler = new THREE.Euler()
  for (let index = 0; index < 24; index += 1) {
    const angle = index * 2.399
    const radius = 2.2 + (index % 6) * 1.15
    shardPosition.set(
      -38 + Math.cos(angle) * radius,
      FLOOR_Y + 0.3 + (index % 4) * 0.48,
      Math.sin(angle) * radius,
    )
    shardEuler.set(angle * 0.3, angle, index * 0.42)
    shardQuaternion.setFromEuler(shardEuler)
    shardScale.setScalar(0.6 + (index % 3) * 0.22)
    shardMatrix.compose(shardPosition, shardQuaternion, shardScale)
    shards.setMatrixAt(index, shardMatrix)
  }
  shards.castShadow = false
  group.add(shards)

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

