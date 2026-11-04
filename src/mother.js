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
    color: 0x858582,
    roughness: 0.92,
    side: THREE.DoubleSide,
  })
  const stainMaterial = new THREE.MeshStandardMaterial({
    color: 0x302d2b,
    roughness: 1,
    transparent: true,
    opacity: 0.78,
  })
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0x8596a0,
    emissive: 0x101923,
    emissiveIntensity: 0.18,
    roughness: 0.84,
  })
  const hairMaterial = new THREE.MeshStandardMaterial({
    color: 0x060708,
    metalness: 0.18,
    roughness: 0.24,
  })
  const voidMaterial = new THREE.MeshBasicMaterial({ color: 0x010101 })
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xc8d2d3,
    emissive: 0x9eafb5,
    emissiveIntensity: 1.4,
    roughness: 0.38,
  })
  const limbs = []
  const hairStrands = []

  const skirt = addMesh(
    group,
    new THREE.ConeGeometry(0.53, 1.5, 9, 2, true),
    dressMaterial,
    [0, 0.75, 0],
  )
  skirt.scale.z = 0.56

  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2
    const tornHem = addMesh(
      group,
      new THREE.ConeGeometry(0.09 + (index % 3) * 0.018, 0.3 + (index % 2) * 0.12, 3),
      dressMaterial,
      [Math.cos(angle) * 0.4, 0.08 + (index % 2) * 0.03, Math.sin(angle) * 0.23],
    )
    tornHem.rotation.y = -angle
    tornHem.rotation.z = (index % 2 ? 1 : -1) * 0.08
  }

  const torso = addMesh(
    group,
    new THREE.CylinderGeometry(0.2, 0.34, 0.84, 8),
    dressMaterial,
    [0, 1.45, 0],
  )
  torso.scale.z = 0.68

  for (const [x, y, width, height, rotation] of [
    [-0.18, 1.28, 0.17, 0.3, -0.15],
    [0.1, 0.8, 0.22, 0.42, 0.1],
    [-0.08, 0.42, 0.12, 0.24, -0.24],
  ]) {
    const stain = new THREE.Mesh(new THREE.PlaneGeometry(width, height), stainMaterial)
    stain.position.set(x, y, 0.35)
    stain.rotation.z = rotation
    group.add(stain)
  }

  const neck = addMesh(
    group,
    new THREE.CylinderGeometry(0.07, 0.09, 0.3, 7),
    skinMaterial,
    [0, 1.9, 0],
  )
  neck.rotation.z = -0.08

  const head = addMesh(
    group,
    new THREE.SphereGeometry(0.25, 12, 10),
    skinMaterial,
    [0, 2.12, 0],
  )
  head.scale.set(0.78, 1.08, 0.68)
  head.rotation.z = -0.08

  const eye = addMesh(group, new THREE.SphereGeometry(0.045, 10, 8), eyeMaterial, [0.06, 2.15, 0.18])
  eye.scale.set(1.35, 0.72, 0.5)
  const mouth = addMesh(group, new THREE.BoxGeometry(0.34, 0.045, 0.022), voidMaterial, [0, 2.02, 0.18])
  mouth.rotation.z = -0.04

  const hairCap = addMesh(
    group,
    new THREE.SphereGeometry(0.28, 12, 9, 0, Math.PI * 2, 0, Math.PI * 0.72),
    hairMaterial,
    [0, 2.23, -0.015],
  )
  hairCap.scale.set(0.9, 1, 0.82)
  addMesh(group, new THREE.BoxGeometry(0.46, 0.92, 0.13), hairMaterial, [0, 1.88, -0.14])

  for (let index = 0; index < 9; index += 1) {
    const offset = (index - 4) * 0.052
    const length = 0.72 + (index % 3) * 0.1
    const strand = addMesh(
      group,
      new THREE.CylinderGeometry(0.022, 0.035, length, 5),
      hairMaterial,
      [offset, 2.02 - (index % 2) * 0.04, 0.19 + Math.abs(offset) * 0.12],
    )
    strand.rotation.z = offset * 0.45
    hairStrands.push({
      baseX: strand.position.x,
      baseRotationZ: strand.rotation.z,
      mesh: strand,
      phase: index * 0.72,
      side: Math.sign(offset) || 1,
    })
  }

  for (const side of [-1, 1]) {
    const upperArm = addMesh(
      group,
      new THREE.CylinderGeometry(0.052, 0.045, 0.83, 6),
      dressMaterial,
      [side * 0.35, 1.42, 0],
    )
    upperArm.rotation.z = side * -0.08
    limbs.push({ baseZ: upperArm.rotation.z, mesh: upperArm, side, phase: 0 })

    const forearm = addMesh(
      group,
      new THREE.CylinderGeometry(0.042, 0.026, 0.93, 6),
      skinMaterial,
      [side * 0.4, 0.56, 0.025],
    )
    forearm.rotation.z = side * -0.035
    limbs.push({ baseZ: forearm.rotation.z, mesh: forearm, side, phase: Math.PI })

    const palm = addMesh(
      group,
      new THREE.SphereGeometry(0.065, 8, 6),
      skinMaterial,
      [side * 0.42, 0.08, 0.04],
    )
    palm.scale.set(0.62, 1.4, 0.5)

    for (let finger = 0; finger < 4; finger += 1) {
      const claw = addMesh(
        group,
        new THREE.CylinderGeometry(0.009, 0.004, 0.27 + finger * 0.025, 5),
        skinMaterial,
        [side * (0.39 + finger * 0.018), -0.13 - finger * 0.018, 0.05],
      )
      claw.rotation.z = side * (0.045 + finger * 0.012)
    }
  }

  const stunLight = new THREE.PointLight(0x38bfff, 0, 6, 2)
  stunLight.position.set(0, 1.2, 0.35)
  group.add(stunLight)

  return {
    dressMaterial,
    eye,
    group,
    hairStrands,
    head,
    limbs,
    mouth,
    skinMaterial,
    stunLight,
    torso,
  }
}

export function updateMotherAnimation(mother, time, chaseIntensity, isStunned) {
  if (isStunned) {
    mother.group.position.y = 0
    mother.group.rotation.z = Math.sin(time * 0.045) * 0.018
    mother.head.rotation.z = -0.08
    for (const limb of mother.limbs) {
      limb.mesh.rotation.x = 0
      limb.mesh.rotation.z = limb.baseZ
    }
    return
  }

  const seconds = time * 0.001
  const pace = 2.4 + chaseIntensity * 1.15
  const reach = 0.08 + chaseIntensity * 0.055
  mother.group.position.y = Math.sin(seconds * pace * 1.9) * 0.045
  mother.group.rotation.z = Math.sin(seconds * pace * 0.42) * 0.025
  mother.torso.rotation.y = Math.sin(seconds * pace * 0.55) * 0.055
  mother.head.rotation.z = -0.08 + Math.sin(seconds * 0.7) * 0.06
  mother.head.rotation.y = Math.sin(seconds * 0.43) * 0.12

  for (const limb of mother.limbs) {
    const swing = Math.sin(seconds * pace + limb.phase) * reach
    limb.mesh.rotation.x = swing
    limb.mesh.rotation.z = limb.baseZ + limb.side * Math.abs(swing) * 0.18
  }
}

export function updateMotherFaceReveal(mother, distance, time) {
  const reveal = 1 - THREE.MathUtils.smoothstep(distance, 1.45, 5.4)

  for (const strand of mother.hairStrands) {
    const unevenPart = 0.055 + (Math.sin(strand.phase * 2.3) + 1) * 0.018
    strand.mesh.position.x = strand.baseX + strand.side * unevenPart * reveal
    strand.mesh.rotation.z =
      strand.baseRotationZ + strand.side * reveal * (0.07 + Math.sin(time * 0.008 + strand.phase) * 0.018)
  }

  mother.eye.material.emissiveIntensity = 0.8 + reveal * 3.4
  mother.eye.scale.x = 1.2 + reveal * 0.65
  mother.eye.scale.y = 0.6 + reveal * 0.3
  mother.mouth.scale.x = 0.75 + reveal * 1.15
  mother.mouth.scale.y = 0.8 + reveal * 2.2
  mother.mouth.position.z = 0.18 + reveal * 0.025
}
