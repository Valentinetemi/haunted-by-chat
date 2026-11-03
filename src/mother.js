import * as THREE from 'three'

function addMesh(parent, geometry, material, position) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(...position)
  parent.add(mesh)
  return mesh
}

export function createMother() {
  const group = new THREE.Group()
  group.name = 'mother'
  const dressMaterial = new THREE.MeshStandardMaterial({
    color: 0x0a0809,
    roughness: 0.96,
    side: THREE.DoubleSide,
  })
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0xa99c92,
    emissive: 0x140c0d,
    emissiveIntensity: 0.22,
    roughness: 0.87,
  })
  const hairMaterial = new THREE.MeshStandardMaterial({ color: 0x080505, roughness: 1 })
  const voidMaterial = new THREE.MeshBasicMaterial({ color: 0x010000 })
  const limbs = []

  const skirt = addMesh(
    group,
    new THREE.ConeGeometry(0.78, 2.35, 10, 1, true),
    dressMaterial,
    [0, 1.12, 0],
  )
  skirt.scale.z = 0.66

  const torso = addMesh(
    group,
    new THREE.CylinderGeometry(0.31, 0.56, 1.35, 9),
    dressMaterial,
    [0, 2.12, 0],
  )
  torso.scale.z = 0.72

  const neck = addMesh(
    group,
    new THREE.CylinderGeometry(0.1, 0.12, 0.38, 8),
    skinMaterial,
    [0, 2.86, 0],
  )
  neck.rotation.z = -0.06

  const head = addMesh(
    group,
    new THREE.SphereGeometry(0.32, 12, 10),
    skinMaterial,
    [0, 3.2, 0],
  )
  head.scale.set(0.82, 1.22, 0.74)
  head.rotation.z = -0.08

  const hair = addMesh(
    group,
    new THREE.SphereGeometry(0.35, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.65),
    hairMaterial,
    [0, 3.34, -0.02],
  )
  hair.scale.set(0.92, 1.1, 0.9)
  addMesh(group, new THREE.BoxGeometry(0.58, 1.28, 0.18), hairMaterial, [0, 2.84, -0.19])

  for (const side of [-1, 1]) {
    const eye = addMesh(
      group,
      new THREE.SphereGeometry(0.038, 8, 6),
      voidMaterial,
      [side * 0.095, 3.23, 0.235],
    )
    eye.scale.x = 0.65

    const upperArm = addMesh(
      group,
      new THREE.CylinderGeometry(0.075, 0.06, 1.32, 7),
      dressMaterial,
      [side * 0.48, 2.05, 0],
    )
    upperArm.rotation.z = side * -0.13
    limbs.push({ mesh: upperArm, side, phase: 0 })

    const forearm = addMesh(
      group,
      new THREE.CylinderGeometry(0.055, 0.035, 1.15, 7),
      skinMaterial,
      [side * 0.6, 0.92, 0.03],
    )
    forearm.rotation.z = side * -0.07
    limbs.push({ mesh: forearm, side, phase: Math.PI })

    const palm = addMesh(
      group,
      new THREE.SphereGeometry(0.09, 8, 6),
      skinMaterial,
      [side * 0.65, 0.31, 0.05],
    )
    palm.scale.set(0.65, 1.35, 0.55)

    for (let finger = 0; finger < 4; finger += 1) {
      const claw = addMesh(
        group,
        new THREE.CylinderGeometry(0.012, 0.006, 0.34 + finger * 0.025, 5),
        skinMaterial,
        [side * (0.61 + finger * 0.025), 0.08 - finger * 0.02, 0.07],
      )
      claw.rotation.z = side * 0.06
    }
  }

  const mouth = addMesh(group, new THREE.BoxGeometry(0.16, 0.025, 0.018), voidMaterial, [0, 3.08, 0.245])
  mouth.rotation.z = -0.06

  const stunLight = new THREE.PointLight(0x38bfff, 0, 6, 2)
  stunLight.position.set(0, 1.7, 0.4)
  group.add(stunLight)

  return {
    dressMaterial,
    group,
    head,
    limbs,
    skinMaterial,
    stunLight,
    torso,
  }
}
