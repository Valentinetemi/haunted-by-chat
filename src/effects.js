import * as THREE from 'three'

import { FLOOR_Y } from './house.js'

export function createBlackPuddles(parent) {
  const group = new THREE.Group()
  group.name = 'black-puddles'
  group.userData.keepSeparate = true
  const material = new THREE.MeshStandardMaterial({
    color: 0x050407,
    metalness: 0.15,
    roughness: 0.2,
    transparent: true,
    opacity: 0.94,
    side: THREE.DoubleSide,
  })
  const puddles = []

  for (const [x, z, width, depth, rotation] of [
    [-1.1, -4.8, 1.4, 0.72, 0.3],
    [-7.4, -16.2, 1.9, 1.05, -0.2],
    [9.6, -8.6, 1.1, 0.65, 0.7],
    [6.5, 5.5, 0.95, 0.5, -0.45],
    [-9.8, 3.5, 0.8, 0.48, 0.15],
  ]) {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 24), material)
    puddle.position.set(x, FLOOR_Y + 0.018, z)
    puddle.rotation.set(-Math.PI / 2, 0, rotation)
    puddle.scale.set(width, depth, 1)
    puddle.userData.baseScale = new THREE.Vector2(width, depth)
    puddle.userData.phase = x * 0.71 + z * 0.33
    puddles.push(puddle)
    group.add(puddle)

    for (let drop = 0; drop < 4; drop += 1) {
      const droplet = new THREE.Mesh(new THREE.CircleGeometry(0.08 + drop * 0.025, 10), material)
      const angle = rotation + drop * 1.8
      droplet.position.set(
        x + Math.cos(angle) * (width + drop * 0.12),
        FLOOR_Y + 0.019,
        z + Math.sin(angle) * (depth + drop * 0.09),
      )
      droplet.rotation.x = -Math.PI / 2
      group.add(droplet)
    }
  }

  const update = (time) => {
    for (const puddle of puddles) {
      const pulse = Math.sin(time * 0.0014 + puddle.userData.phase) * 0.035
      puddle.scale.set(
        puddle.userData.baseScale.x * (1 + pulse),
        puddle.userData.baseScale.y * (1 - pulse),
        1,
      )
    }
    material.color.setScalar(0.012 + (Math.sin(time * 0.002) + 1) * 0.006)
  }

  parent.add(group)
  return { group, update }
}

export function createMotherDrips(scene) {
  const group = new THREE.Group()
  group.name = 'mother-drips'
  const liquidMaterial = new THREE.MeshStandardMaterial({
    color: 0x010203,
    metalness: 0.3,
    roughness: 0.16,
  })
  const puddleMaterial = new THREE.MeshStandardMaterial({
    color: 0x020304,
    metalness: 0.25,
    roughness: 0.2,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide,
  })
  const particles = Array.from({ length: 22 }, () => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), liquidMaterial)
    mesh.visible = false
    group.add(mesh)
    return { active: false, mesh, velocity: new THREE.Vector3() }
  })
  const puddles = Array.from({ length: 18 }, (_, index) => {
    const mesh = new THREE.Mesh(new THREE.CircleGeometry(1, 12), puddleMaterial.clone())
    mesh.rotation.x = -Math.PI / 2
    mesh.position.y = FLOOR_Y + 0.022 + index * 0.0001
    mesh.visible = false
    group.add(mesh)
    return mesh
  })
  const mouthPosition = new THREE.Vector3()
  let nextDropAt = 0
  let puddleCursor = 0

  const spawnPuddle = (position) => {
    const puddle = puddles[puddleCursor]
    puddleCursor = (puddleCursor + 1) % puddles.length
    puddle.position.x = position.x
    puddle.position.z = position.z
    puddle.rotation.z = Math.random() * Math.PI
    puddle.scale.set(0.07, 0.035 + Math.random() * 0.035, 1)
    puddle.material.opacity = 0.88
    puddle.visible = true
  }

  const spawnDrop = (mother) => {
    const particle = particles.find((candidate) => !candidate.active)
    if (!particle) return
    mother.mouth.getWorldPosition(mouthPosition)
    particle.active = true
    particle.mesh.visible = true
    particle.mesh.position.copy(mouthPosition)
    particle.mesh.position.x += (Math.random() - 0.5) * 0.08
    particle.mesh.position.z += (Math.random() - 0.5) * 0.05
    particle.mesh.scale.set(0.7 + Math.random() * 0.5, 1.5 + Math.random(), 0.7)
    particle.velocity.set((Math.random() - 0.5) * 0.05, -0.12 - Math.random() * 0.12, 0.02)
  }

  const update = (time, delta, mother, active) => {
    if (active && time >= nextDropAt) {
      spawnDrop(mother)
      if (Math.random() < 0.34) spawnDrop(mother)
      nextDropAt = time + 160 + Math.random() * 260
    }

    for (const particle of particles) {
      if (!particle.active) continue
      particle.velocity.y -= 4.2 * delta
      particle.mesh.position.addScaledVector(particle.velocity, delta)
      if (particle.mesh.position.y <= FLOOR_Y + 0.035) {
        spawnPuddle(particle.mesh.position)
        particle.active = false
        particle.mesh.visible = false
      }
    }

    for (const puddle of puddles) {
      if (!puddle.visible) continue
      puddle.scale.x = Math.min(puddle.scale.x + delta * 0.025, 0.17)
      puddle.scale.y = Math.min(puddle.scale.y + delta * 0.012, 0.09)
    }
  }

  const reset = () => {
    nextDropAt = 0
    puddleCursor = 0
    for (const particle of particles) {
      particle.active = false
      particle.mesh.visible = false
    }
    for (const puddle of puddles) puddle.visible = false
  }

  scene.add(group)
  return { reset, update }
}
