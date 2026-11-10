import * as THREE from 'three'

import { FLOOR_Y, isHouseSegmentOpen, movePlayerWithinHouse } from './house.js'

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

export function canReachOnFoot(x0, z0, x1, z1) {
  const start = getHauntedPlaceAt({ x: x0, y: 0, z: z0 })
  const end = getHauntedPlaceAt({ x: x1, y: 0, z: z1 })
  if (start || end) return Boolean(start && end && start.id === end.id)
  return isHouseSegmentOpen(x0, z0, x1, z1)
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


export async function createHauntedPlaces(scene, report = () => {}) {
  const group = new THREE.Group()
  group.name = 'haunted-places'
  report(0.7, 'The courtyard gate is opening…')
  const { createCourtyard } = await import('./places/courtyard.js')
  const courtyard = createCourtyard()
  report(0.78, 'Something woke under the floor…')
  const { createCrypt } = await import('./places/crypt.js')
  const crypt = createCrypt()
  report(0.86, 'The mirrors are turning…')
  const { createMirrorRealm } = await import('./places/mirror.js')
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
