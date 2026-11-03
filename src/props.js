import * as THREE from 'three'

import { FLOOR_Y, addBox } from './house.js'

const wood = new THREE.MeshStandardMaterial({ color: 0x2b1710, roughness: 0.88 })
const darkWood = new THREE.MeshStandardMaterial({ color: 0x160c09, roughness: 0.9 })
const brass = new THREE.MeshStandardMaterial({
  color: 0x8c6b32,
  metalness: 0.62,
  roughness: 0.4,
})
const cloth = new THREE.MeshStandardMaterial({ color: 0x3d1117, roughness: 1 })

export function furnishEntrance(parent) {
  const group = new THREE.Group()
  group.name = 'entrance-props'

  addBox(group, [3.2, 0.035, 4.5], [0, FLOOR_Y + 0.025, 5.8], cloth, 'entrance-rug')
  addBox(group, [2.4, 0.16, 0.65], [-2.35, FLOOR_Y + 1.05, 7.9], wood)
  for (const x of [-3.25, -1.45]) {
    addBox(group, [0.14, 1.05, 0.14], [x, FLOOR_Y + 0.52, 7.9], darkWood)
  }

  const candleMaterial = new THREE.MeshStandardMaterial({ color: 0xd3c19a, roughness: 0.75 })
  const flameMaterial = new THREE.MeshBasicMaterial({ color: 0xffa536, toneMapped: false })
  for (const x of [-2.8, -2.25, -1.75]) {
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.42, 8), candleMaterial)
    candle.position.set(x, FLOOR_Y + 1.34, 7.9)
    group.add(candle)
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), flameMaterial)
    flame.scale.y = 1.7
    flame.position.set(x, FLOOR_Y + 1.59, 7.9)
    group.add(flame)
  }

  const candleLight = new THREE.PointLight(0xff8a32, 4.5, 5, 2)
  candleLight.position.set(-2.3, FLOOR_Y + 1.8, 7.4)
  group.add(candleLight)

  const coatPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 2.7, 8), darkWood)
  coatPost.position.set(2.8, FLOOR_Y + 1.35, 7.8)
  group.add(coatPost)
  for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const hook = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.55, 6), brass)
    hook.position.set(
      2.8 + Math.cos(angle) * 0.18,
      FLOOR_Y + 2.45,
      7.8 + Math.sin(angle) * 0.18,
    )
    hook.rotation.z = Math.PI / 2
    hook.rotation.y = angle
    group.add(hook)
  }

  const portrait = addBox(group, [1.35, 1.8, 0.08], [0, FLOOR_Y + 2.15, 9.72], darkWood)
  const portraitFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.05, 1.5),
    new THREE.MeshStandardMaterial({ color: 0x4a3e35, roughness: 0.9 }),
  )
  portraitFace.position.set(0, FLOOR_Y + 2.15, 9.67)
  portraitFace.rotation.y = Math.PI
  group.add(portraitFace)
  portrait.userData.hauntedPortrait = true

  parent.add(group)
  return group
}
