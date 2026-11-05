import * as THREE from 'three'

import { FLOOR_Y } from './house.js'

const PORTALS = [
  {
    color: 0x7da6d8,
    destination: new THREE.Vector3(38, 0, 5.6),
    destinationPortal: new THREE.Vector3(38, FLOOR_Y, 7.4),
    housePortal: new THREE.Vector3(-10.7, FLOOR_Y, 2.7),
    houseReturn: new THREE.Vector3(-9.2, 0, 2.7),
    id: 'courtyard',
    name: 'Moonlit Courtyard',
    requiredKeys: 1,
  },
  {
    color: 0x78a27d,
    destination: new THREE.Vector3(0, 0, -48),
    destinationPortal: new THREE.Vector3(0, FLOOR_Y, -46.2),
    housePortal: new THREE.Vector3(-10.1, FLOOR_Y, -17.6),
    houseReturn: new THREE.Vector3(-8.6, 0, -17.6),
    id: 'crypt',
    name: 'Underground Crypt',
    requiredKeys: 2,
  },
  {
    color: 0xa38bc5,
    destination: new THREE.Vector3(-38, 0, 5.6),
    destinationPortal: new THREE.Vector3(-38, FLOOR_Y, 7.4),
    housePortal: new THREE.Vector3(-10.4, FLOOR_Y, -7.2),
    houseReturn: new THREE.Vector3(-9, 0, -7.2),
    id: 'mirror',
    name: 'Fractured Mirror Realm',
    requiredKeys: 4,
  },
]

function addBox(parent, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
  mesh.position.set(...position)
  mesh.castShadow = true
  parent.add(mesh)
  return mesh
}

function createPortalMesh(definition, position, isHouseSide) {
  const group = new THREE.Group()
  group.position.copy(position)
  group.name = `${definition.id}-${isHouseSide ? 'entrance' : 'return'}-portal`
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x211d20,
    emissive: definition.color,
    emissiveIntensity: 0.04,
    metalness: 0.54,
    roughness: 0.62,
  })
  const veilMaterial = new THREE.MeshBasicMaterial({
    color: definition.color,
    opacity: 0.18,
    side: THREE.DoubleSide,
    transparent: true,
  })
  addBox(group, [0.28, 3.5, 0.28], [-1.25, 1.75, 0], frameMaterial)
  addBox(group, [0.28, 3.5, 0.28], [1.25, 1.75, 0], frameMaterial)
  addBox(group, [2.78, 0.28, 0.28], [0, 3.42, 0], frameMaterial)

  const runeMaterial = new THREE.MeshBasicMaterial({
    color: definition.color,
    opacity: 0.52,
    transparent: true,
  })
  for (const [x, y, rotation] of [
    [-1.25, 0.65, 0.25],
    [-1.25, 1.8, -0.18],
    [1.25, 1.15, -0.28],
    [1.25, 2.55, 0.2],
    [0, 3.42, Math.PI / 4],
  ]) {
    const rune = new THREE.Mesh(new THREE.RingGeometry(0.11, 0.17, 4), runeMaterial)
    rune.position.set(x, y, -0.15)
    rune.rotation.z = rotation
    group.add(rune)
  }

  const veil = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 3.15, 8, 8), veilMaterial)
  veil.position.y = 1.66
  group.add(veil)

  const particleCount = 22
  const particlePositions = new Float32Array(particleCount * 3)
  const particleData = []
  for (let index = 0; index < particleCount; index += 1) {
    const x = (Math.random() - 0.5) * 2.1
    const y = 0.12 + Math.random() * 3.05
    const phase = Math.random() * Math.PI * 2
    const speed = 0.00016 + Math.random() * 0.00018
    particlePositions[index * 3] = x
    particlePositions[index * 3 + 1] = y
    particlePositions[index * 3 + 2] = -0.19
    particleData.push({ phase, speed, x, y })
  }
  const particleGeometry = new THREE.BufferGeometry()
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3))
  const particleMaterial = new THREE.PointsMaterial({
    blending: THREE.AdditiveBlending,
    color: definition.color,
    depthWrite: false,
    opacity: 0.55,
    size: 0.065,
    transparent: true,
  })
  const particles = new THREE.Points(particleGeometry, particleMaterial)
  group.add(particles)
  const light = new THREE.PointLight(definition.color, 2, 5.5, 2)
  light.position.set(0, 1.7, 0.4)
  group.add(light)
  group.rotation.y = isHouseSide ? Math.PI / 2 : 0
  return {
    frameMaterial,
    group,
    light,
    particleData,
    particleGeometry,
    particleMaterial,
    runeMaterial,
    veil,
    veilMaterial,
  }
}

export function createPortalSystem({ camera, getKeyCount, onTravel, parent, prompt }) {
  const endpoints = []

  for (const definition of PORTALS) {
    const entrance = createPortalMesh(definition, definition.housePortal, true)
    const exit = createPortalMesh(definition, definition.destinationPortal, false)
    parent.add(entrance.group, exit.group)
    endpoints.push(
      {
        definition,
        destinationId: definition.id,
        mesh: entrance,
        position: definition.housePortal,
        target: definition.destination,
      },
      {
        definition,
        destinationId: 'house',
        mesh: exit,
        position: definition.destinationPortal,
        target: definition.houseReturn,
      },
    )
  }

  let nearbyEndpoint = null
  let travelCooldownUntil = 0

  const update = (playerPosition, time, active) => {
    nearbyEndpoint = null
    if (!active) return

    let nearestDistance = Infinity
    const keyCount = getKeyCount()
    for (const endpoint of endpoints) {
      const unlocked = keyCount >= endpoint.definition.requiredKeys
      endpoint.mesh.veilMaterial.opacity = unlocked
        ? 0.2 + Math.sin(time * 0.003) * 0.06
        : 0.055
      endpoint.mesh.light.intensity = unlocked ? 3 + Math.sin(time * 0.004) * 1.2 : 0.25
      endpoint.mesh.veil.rotation.z = Math.sin(time * 0.0016 + endpoint.position.x) * 0.015
      endpoint.mesh.veil.scale.set(
        1 + Math.sin(time * 0.0022 + endpoint.position.z) * 0.025,
        1 + Math.cos(time * 0.0018 + endpoint.position.x) * 0.018,
        1,
      )
      endpoint.mesh.frameMaterial.emissiveIntensity = unlocked
        ? 0.16 + Math.sin(time * 0.0035) * 0.05
        : 0.025
      endpoint.mesh.runeMaterial.opacity = unlocked ? 0.45 + Math.sin(time * 0.004) * 0.16 : 0.08
      endpoint.mesh.particleMaterial.opacity = unlocked ? 0.52 : 0.06
      endpoint.mesh.particleMaterial.size = unlocked ? 0.065 : 0.025
      const positions = endpoint.mesh.particleGeometry.attributes.position.array
      endpoint.mesh.particleData.forEach((particle, index) => {
        positions[index * 3] = particle.x + Math.sin(time * 0.0014 + particle.phase) * 0.1
        positions[index * 3 + 1] = 0.1 + ((particle.y + time * particle.speed) % 3.1)
        positions[index * 3 + 2] = -0.19 + Math.cos(time * 0.0017 + particle.phase) * 0.035
      })
      endpoint.mesh.particleGeometry.attributes.position.needsUpdate = true

      const distance = Math.hypot(
        playerPosition.x - endpoint.position.x,
        playerPosition.z - endpoint.position.z,
      )
      if (distance < 2.25 && distance < nearestDistance) {
        nearbyEndpoint = endpoint
        nearestDistance = distance
      }
    }

    if (!nearbyEndpoint) return
    const { definition, destinationId } = nearbyEndpoint
    if (keyCount < definition.requiredKeys) {
      const missingKeys = definition.requiredKeys - keyCount
      prompt.textContent = `${definition.name} sealed · find ${missingKeys} more ${missingKeys === 1 ? 'key' : 'keys'}`
    } else {
      prompt.textContent = destinationId === 'house'
        ? 'E · return to the house'
        : `E · enter the ${definition.name.toLowerCase()}`
    }
    prompt.hidden = false
  }

  const interact = () => {
    if (!nearbyEndpoint || performance.now() < travelCooldownUntil) return false
    if (getKeyCount() < nearbyEndpoint.definition.requiredKeys) return false
    camera.position.copy(nearbyEndpoint.target)
    travelCooldownUntil = performance.now() + 800
    onTravel({
      destination: nearbyEndpoint.destinationId,
      name: nearbyEndpoint.destinationId === 'house' ? 'The House' : nearbyEndpoint.definition.name,
    })
    nearbyEndpoint = null
    prompt.hidden = true
    return true
  }

  return {
    interact,
    reset() {
      nearbyEndpoint = null
      travelCooldownUntil = 0
    },
    update,
  }
}
