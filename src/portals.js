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

  const veil = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 3.15, 8, 8), veilMaterial)
  veil.position.y = 1.66
  group.add(veil)
  const light = new THREE.PointLight(definition.color, 2, 5.5, 2)
  light.position.set(0, 1.7, 0.4)
  group.add(light)
  group.rotation.y = isHouseSide ? Math.PI / 2 : 0
  return { group, light, veil, veilMaterial }
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
