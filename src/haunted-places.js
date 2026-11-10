import * as THREE from 'three'

import { FLOOR_Y, movePlayerWithinHouse } from './house.js'

export const HAUNTED_PLACE_BOUNDS = {
  courtyard: { minX: 28, maxX: 48, minZ: -9, maxZ: 9 },
  crypt: { minX: -10, maxX: 10, minZ: -65, maxZ: -45 },
  mirror: { minX: -48, maxX: -28, minZ: -9, maxZ: 9 },
}

const HAUNTED_PLACE_NAMES = {
  courtyard: 'Moonlit Courtyard',
  crypt: 'Underground Crypt',
  mirror: 'Fractured Mirror Realm',
}

export function getHauntedPlaceAt(position) {
  for (const [id, bounds] of Object.entries(HAUNTED_PLACE_BOUNDS)) {
    if (
      position.x >= bounds.minX &&
      position.x <= bounds.maxX &&
      position.z >= bounds.minZ &&
      position.z <= bounds.maxZ
    ) {
      return { bounds, id, name: HAUNTED_PLACE_NAMES[id] }
    }
  }
  return null
}

export function movePlayerWithinWorld(position, displacement) {
  const place = getHauntedPlaceAt(position)
  if (!place) {
    movePlayerWithinHouse(position, displacement)
    return
  }

  const clearance = 0.45
  position.x = THREE.MathUtils.clamp(
    position.x + displacement.x,
    place.bounds.minX + clearance,
    place.bounds.maxX - clearance,
  )
  position.z = THREE.MathUtils.clamp(
    position.z + displacement.z,
    place.bounds.minZ + clearance,
    place.bounds.maxZ - clearance,
  )
}

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
  const position = new THREE.Vector3()
  positions.forEach((value, index) => {
    position.set(value[0], value[1], value[2])
    matrix.makeTranslation(position.x, position.y, position.z)
    mesh.setMatrixAt(index, matrix)
  })
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function createAmbientParticles(parent, {
  bounds,
  color,
  count,
  height,
  mode,
  opacity,
  size,
}) {
  const positions = new Float32Array(count * 3)
  const particles = []
  for (let index = 0; index < count; index += 1) {
    const particle = {
      phase: Math.random() * Math.PI * 2,
      x: THREE.MathUtils.lerp(bounds.minX + 0.8, bounds.maxX - 0.8, Math.random()),
      y: Math.random() * height,
      z: THREE.MathUtils.lerp(bounds.minZ + 0.8, bounds.maxZ - 0.8, Math.random()),
    }
    positions[index * 3] = particle.x
    positions[index * 3 + 1] = FLOOR_Y + 0.25 + particle.y
    positions[index * 3 + 2] = particle.z
    particles.push(particle)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const material = new THREE.PointsMaterial({
    blending: mode === 'crypt' ? THREE.NormalBlending : THREE.AdditiveBlending,
    color,
    depthWrite: false,
    opacity,
    size,
    transparent: true,
  })
  const points = new THREE.Points(geometry, material)
  points.frustumCulled = false
  parent.add(points)

  return {
    update(time) {
      const values = geometry.attributes.position.array
      particles.forEach((particle, index) => {
        if (mode === 'courtyard') {
          values[index * 3] = particle.x + Math.sin(time * 0.00045 + particle.phase) * 0.38
          values[index * 3 + 1] = FLOOR_Y + 0.35 + particle.y + Math.sin(time * 0.0011 + particle.phase) * 0.22
          values[index * 3 + 2] = particle.z + Math.cos(time * 0.00038 + particle.phase) * 0.3
        } else if (mode === 'crypt') {
          values[index * 3] = particle.x + Math.sin(time * 0.00052 + particle.phase) * 0.13
          values[index * 3 + 1] = FLOOR_Y + 0.2 + ((particle.y + time * 0.000075) % height)
          values[index * 3 + 2] = particle.z + Math.cos(time * 0.00043 + particle.phase) * 0.1
        } else {
          const twitch = Math.sin(time * 0.006 + particle.phase) * 0.07
          values[index * 3] = particle.x + Math.sin(time * 0.0015 + particle.phase) * 0.2 + twitch
          values[index * 3 + 1] = FLOOR_Y + 0.3 + particle.y + Math.sin(time * 0.0022 + particle.phase) * 0.32
          values[index * 3 + 2] = particle.z + Math.cos(time * 0.0017 + particle.phase) * 0.2
        }
      })
      material.opacity = opacity * (0.82 + Math.sin(time * 0.0018) * 0.18)
      geometry.attributes.position.needsUpdate = true
    },
  }
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

export async function createHauntedPlaces(scene, report = () => {}) {
  const group = new THREE.Group()
  group.name = 'haunted-places'
  report(0.7, 'The courtyard gate is opening…')
  const { createCourtyard } = await import('./places/courtyard.js')
  const courtyard = createCourtyard()
  const crypt = createCrypt()
  const mirror = createMirrorRealm()
  group.add(courtyard, crypt, mirror)
  const atmospheres = [
    createAmbientParticles(courtyard, {
      bounds: HAUNTED_PLACE_BOUNDS.courtyard,
      color: 0x9bc9df,
      count: 46,
      height: 3.8,
      mode: 'courtyard',
      opacity: 0.44,
      size: 0.065,
    }),
    createAmbientParticles(crypt, {
      bounds: HAUNTED_PLACE_BOUNDS.crypt,
      color: 0xa69a7a,
      count: 38,
      height: 3.6,
      mode: 'crypt',
      opacity: 0.28,
      size: 0.045,
    }),
    createAmbientParticles(mirror, {
      bounds: HAUNTED_PLACE_BOUNDS.mirror,
      color: 0xc3bdff,
      count: 52,
      height: 4.2,
      mode: 'mirror',
      opacity: 0.52,
      size: 0.055,
    }),
  ]
  scene.add(group)
  return {
    courtyard,
    crypt,
    group,
    mirror,
    update(time) {
      for (const atmosphere of atmospheres) atmosphere.update(time)
    },
  }
}
