import * as THREE from 'three'

function addMesh(parent, geometry, material, position, rotation) {
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.set(position[0], position[1], position[2])
  if (rotation) mesh.rotation.set(rotation[0], rotation[1], rotation[2])
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

export function createMother() {
  const group = new THREE.Group()
  group.name = 'mother'
  const veinTime = { value: 0 }
  const dressMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1214,
    roughness: 0.94,
    side: THREE.DoubleSide,
  })
  const hemMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a1c1a,
    roughness: 1,
    side: THREE.DoubleSide,
  })
  const stainMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a0c0e,
    roughness: 1,
    transparent: true,
    opacity: 0.82,
  })
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: 0x8d978c,
    emissive: 0x1a0c10,
    emissiveIntensity: 0.28,
    roughness: 0.78,
  })
  skinMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uVeinTime = veinTime
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMotherLocal;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMotherLocal = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uVeinTime;\nvarying vec3 vMotherLocal;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         float vein = sin(vMotherLocal.y * 26.0 + uVeinTime) * sin(vMotherLocal.x * 18.0 + vMotherLocal.z * 14.0);
         totalEmissiveRadiance += vec3(0.28, 0.02, 0.04) * smoothstep(0.55, 0.95, vein);`,
      )
  }
  const hairMaterial = new THREE.MeshStandardMaterial({
    color: 0x070605,
    metalness: 0.12,
    roughness: 0.35,
  })
  const voidMaterial = new THREE.MeshBasicMaterial({ color: 0x050203 })
  const eyeMaterial = new THREE.MeshStandardMaterial({
    color: 0xfff3cf,
    emissive: 0xffe7a2,
    emissiveIntensity: 2.4,
    roughness: 0.2,
  })
  const limbs = []
  const hairStrands = []
  const eyes = []

  const skirt = addMesh(group, new THREE.ConeGeometry(0.62, 1.7, 8, 1, true), dressMaterial, [0, 0.85, 0])
  skirt.scale.z = 0.48

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2
    const length = 0.28 + (index % 4) * 0.08
    const strip = addMesh(
      group,
      new THREE.ConeGeometry(0.045 + (index % 3) * 0.012, length, 3),
      index % 2 === 0 ? hemMaterial : dressMaterial,
      [Math.cos(angle) * 0.46, 0.08, Math.sin(angle) * 0.24],
    )
    strip.rotation.y = -angle
    strip.rotation.z = (index % 2 === 0 ? -1 : 1) * 0.35
  }

  const torso = addMesh(group, new THREE.CylinderGeometry(0.11, 0.2, 0.78, 7), dressMaterial, [0, 1.72, 0.02])
  torso.scale.z = 0.62
  torso.rotation.z = 0.08

  for (const [x, y, width, height, rotation] of [
    [-0.08, 1.55, 0.16, 0.34, -0.4],
    [0.06, 1.05, 0.2, 0.46, 0.2],
    [-0.04, 0.55, 0.12, 0.28, -0.15],
  ]) {
    const stain = new THREE.Mesh(new THREE.PlaneGeometry(width, height), stainMaterial)
    stain.position.set(x, y, 0.22)
    stain.rotation.z = rotation
    group.add(stain)
  }

  const neck = addMesh(group, new THREE.CylinderGeometry(0.045, 0.06, 0.42, 6), skinMaterial, [0.08, 2.18, 0.02])
  neck.rotation.z = 0.55

  const head = addMesh(group, new THREE.SphereGeometry(0.22, 12, 10), skinMaterial, [0.2, 2.42, 0.04])
  head.scale.set(0.72, 1.25, 0.62)
  head.rotation.z = 0.72

  for (const side of [-1, 1]) {
    const eye = addMesh(
      group,
      new THREE.SphereGeometry(0.035, 8, 6),
      eyeMaterial,
      [0.2 + side * 0.055, 2.46, 0.16],
    )
    eye.scale.set(1.15, 0.42, 0.55)
    eyes.push(eye)
  }
  const eye = eyes[0]

  const mouth = addMesh(group, new THREE.BoxGeometry(0.16, 0.035, 0.02), voidMaterial, [0.2, 2.3, 0.16])
  mouth.rotation.z = 0.55

  const hairCap = addMesh(
    group,
    new THREE.SphereGeometry(0.24, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.68),
    hairMaterial,
    [0.16, 2.52, -0.01],
  )
  hairCap.scale.set(0.95, 1.05, 0.8)
  addMesh(group, new THREE.BoxGeometry(0.34, 1.15, 0.08), hairMaterial, [0.05, 2.05, -0.08])

  for (let index = 0; index < 11; index += 1) {
    const offset = (index - 5) * 0.045
    const length = 0.85 + (index % 3) * 0.16
    const strand = addMesh(
      group,
      new THREE.CylinderGeometry(0.012, 0.02, length, 4),
      hairMaterial,
      [0.16 + offset, 2.15 - (index % 2) * 0.08, 0.16],
    )
    strand.rotation.z = 0.5 + offset
    hairStrands.push({
      baseX: strand.position.x,
      baseRotationZ: strand.rotation.z,
      mesh: strand,
      phase: index * 0.67,
      side: Math.sign(offset) || 1,
    })
  }

  for (const side of [-1, 1]) {
    const upperArm = addMesh(
      group,
      new THREE.CylinderGeometry(0.035, 0.028, 0.95, 6),
      dressMaterial,
      [side * 0.28, 1.55, 0.02],
    )
    upperArm.rotation.z = side * 0.15
    limbs.push({ baseZ: upperArm.rotation.z, mesh: upperArm, side, phase: side > 0 ? 0 : Math.PI })

    const forearm = addMesh(
      group,
      new THREE.CylinderGeometry(0.026, 0.016, 1.15, 5),
      skinMaterial,
      [side * 0.42, 0.72, 0.06],
    )
    forearm.rotation.z = side * 0.08
    limbs.push({ baseZ: forearm.rotation.z, mesh: forearm, side, phase: side > 0 ? Math.PI : 0 })

    const palm = addMesh(
      group,
      new THREE.SphereGeometry(0.05, 6, 5),
      skinMaterial,
      [side * 0.5, 0.12, 0.08],
    )
    palm.scale.set(0.55, 1.5, 0.4)

    for (let finger = 0; finger < 4; finger += 1) {
      const claw = addMesh(
        group,
        new THREE.CylinderGeometry(0.007, 0.003, 0.34 + finger * 0.03, 4),
        skinMaterial,
        [side * (0.46 + finger * 0.02), -0.08 - finger * 0.02, 0.1],
      )
      claw.rotation.z = side * (0.12 + finger * 0.04)
    }
  }

  for (const side of [-1, 1]) {
    const foot = addMesh(
      group,
      new THREE.BoxGeometry(0.08, 0.06, 0.28),
      skinMaterial,
      [side * 0.12, 0.04, 0.12],
    )
    foot.rotation.x = 0.4
  }

  const stunLight = new THREE.PointLight(0xfff1c4, 0, 5.5, 2)
  stunLight.position.set(0.16, 2.4, 0.2)
  group.add(stunLight)

  const rimLight = new THREE.PointLight(0x6b0b12, 2.4, 3.5, 2)
  rimLight.position.set(-0.2, 1.4, -0.4)
  group.add(rimLight)

  return {
    dressMaterial,
    eye,
    eyes,
    group,
    hairStrands,
    head,
    limbs,
    mouth,
    neck,
    rimLight,
    skinMaterial,
    stunLight,
    torso,
    veinTime,
  }
}

export function updateMotherAnimation(mother, time, chaseIntensity, isStunned) {
  mother.veinTime.value = time * 0.004
  if (isStunned) {
    mother.group.position.set((Math.sin(time * 0.04) * 0.5) * 0.04, 0, 0)
    mother.group.rotation.x = 0.2
    mother.group.rotation.z = Math.sin(time * 0.05) * 0.04
    mother.head.rotation.set(0.2, 0, 0.72)
    return
  }

  const seconds = time * 0.001
  const isHunched = chaseIntensity > 1.35
  const pace = isHunched ? 11 + chaseIntensity : 3.4
  const pose = Math.floor(time / (isHunched ? 70 : 180))
  const poseNoise = (offset) => {
    const value = Math.sin((pose + offset) * 12.9898) * 43758.5453
    return value - Math.floor(value)
  }
  const twitch = poseNoise(7) > 0.72
  const hunch = isHunched ? 0.62 : 0.18

  mother.group.position.x = twitch ? (poseNoise(8) - 0.5) * 0.08 : 0
  mother.group.position.y = Math.abs(Math.sin(seconds * pace)) * (isHunched ? 0.05 : 0.02)
  mother.group.position.z = isHunched ? Math.sin(seconds * pace * 0.5) * 0.04 : 0
  mother.group.rotation.x = hunch + (twitch ? 0.12 : 0)
  mother.group.rotation.z = (poseNoise(1) - 0.5) * (isHunched ? 0.14 : 0.06)
  mother.torso.rotation.y = (poseNoise(2) - 0.5) * (isHunched ? 0.35 : 0.12)
  mother.neck.rotation.z = 0.55 + (poseNoise(9) - 0.5) * (isHunched ? 0.2 : 0.06)
  mother.head.rotation.x = (poseNoise(3) - 0.5) * (isHunched ? 0.55 : 0.2)
  mother.head.rotation.y = (poseNoise(4) - 0.5) * (isHunched ? 0.9 : 0.4)
  mother.head.rotation.z = 0.72 + (poseNoise(5) - 0.5) * (isHunched ? 0.28 : 0.1)

  for (const [index, limb] of mother.limbs.entries()) {
    const snappedReach = (poseNoise(index + 10) - 0.5) * (isHunched ? 1.15 : 0.28)
    const runningSwing = isHunched ? Math.sin(seconds * pace + limb.phase) * 0.65 : 0
    limb.mesh.rotation.x = snappedReach + runningSwing
    limb.mesh.rotation.z =
      limb.baseZ + limb.side * (isHunched ? 0.28 : 0.06) + (twitch ? (poseNoise(index + 20) - 0.5) * 0.3 : 0)
  }

  for (const strand of mother.hairStrands) {
    strand.mesh.position.y = 2.15 + Math.sin(seconds * pace + strand.phase) * 0.03
    strand.mesh.rotation.x = Math.sin(seconds * pace + strand.phase) * (isHunched ? 0.22 : 0.07)
  }
}

export function updateMotherFaceReveal(mother, distance, time) {
  const reveal = 1 - THREE.MathUtils.smoothstep(distance, 1.6, 6.2)

  for (const strand of mother.hairStrands) {
    const unevenPart = 0.04 + (Math.sin(strand.phase * 2.3) + 1) * 0.02
    strand.mesh.position.x = strand.baseX + strand.side * unevenPart * reveal
    strand.mesh.rotation.z =
      strand.baseRotationZ + strand.side * reveal * (0.08 + Math.sin(time * 0.01 + strand.phase) * 0.02)
  }

  mother.eyes.forEach((eye, index) => {
    eye.material.emissiveIntensity = 1.4 + reveal * 3.2
    eye.scale.y = 0.35 + reveal * 0.45 + (index === 0 ? 0.05 : 0)
    eye.scale.x = 1.05 + reveal * 0.4
  })
  mother.mouth.scale.x = 0.8 + reveal * 1.4
  mother.mouth.scale.y = 0.7 + reveal * 2.4
}
