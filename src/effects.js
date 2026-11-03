import * as THREE from 'three'

import { FLOOR_Y } from './house.js'

export function createBlackPuddles(parent) {
  const group = new THREE.Group()
  group.name = 'black-puddles'
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
