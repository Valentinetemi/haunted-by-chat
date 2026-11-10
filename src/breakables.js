import * as THREE from 'three'

import { FLOOR_Y } from './house.js'

const SPOTS = [
  [-1.4, 5.4],
  [2.2, 6.2],
  [9.2, 6.4],
  [-9.4, 5.2],
  [0.6, -8.4],
  [7.2, -5.2],
  [-16.4, 5.6],
  [15.2, 7.4],
]

export function createBreakables(parent) {
  const glass = new THREE.MeshStandardMaterial({
    color: 0x8fb8b2,
    roughness: 0.2,
    transparent: true,
    opacity: 0.8,
  })
  const clay = new THREE.MeshStandardMaterial({ color: 0x6d4634, roughness: 0.86 })
  const items = SPOTS.map(([x, z], index) => {
    const mesh = new THREE.Mesh(
      index % 2 === 0 ? new THREE.CylinderGeometry(0.12, 0.14, 0.32, 8) : new THREE.SphereGeometry(0.16, 8, 6),
      index % 2 === 0 ? glass : clay,
    )
    mesh.position.set(x, FLOOR_Y + 0.2, z)
    mesh.castShadow = false
    mesh.name = 'breakable'
    parent.add(mesh)
    return mesh
  })

  return {
    items,
    shatter(raycaster) {
      const hits = raycaster.intersectObjects(items, false)
      const hit = hits.find((entry) => entry.object.visible && entry.distance < 12)
      if (!hit) return false
      hit.object.visible = false
      return true
    },
    reset() {
      for (const item of items) item.visible = true
    },
  }
}
