import * as THREE from 'three'

import { createStaticBatch } from './batch.js'

export const FLOOR_Y = -1.7
export const CEILING_Y = 2.5
export const UPPER_PLAYER_Y = 4.36
export const PLAYER_START = new THREE.Vector3(0, 0, 6)

const UPPER_FLOOR_Y = CEILING_Y + 0.16
const UPPER_CEILING_Y = 6.75
const STAIR_BOUNDS = { minX: -7.05, maxX: -5.05, minZ: -1.45, maxZ: 4.85 }

export const ROOM_DEFINITIONS = [
  {
    id: 'entrance',
    name: 'Entrance Hall',
    bounds: { minX: -4, maxX: 4, minZ: 2, maxZ: 10 },
    center: [0, 6],
    size: [8, 8],
    floor: 0x3d3028,
    light: 0xffb875,
    intensity: 30,
  },
  {
    id: 'living',
    name: 'Living Room',
    bounds: { minX: -12, maxX: -4, minZ: -2, maxZ: 10 },
    center: [-8, 4],
    size: [8, 12],
    floor: 0x332a27,
    light: 0xb87955,
    intensity: 24,
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    bounds: { minX: 4, maxX: 12, minZ: -2, maxZ: 10 },
    center: [8, 4],
    size: [8, 12],
    floor: 0x343a36,
    light: 0xa8c7bd,
    intensity: 31,
  },
  {
    id: 'bathroom',
    name: 'Bathroom',
    bounds: { minX: -12, maxX: -4, minZ: -12, maxZ: -2 },
    center: [-8, -7],
    size: [8, 10],
    floor: 0x304044,
    light: 0x8eb7c5,
    intensity: 27,
  },
  {
    id: 'bedroom',
    name: "Kid's Bedroom",
    bounds: { minX: 4, maxX: 12, minZ: -12, maxZ: -2 },
    center: [8, -7],
    size: [8, 10],
    floor: 0x3b303d,
    light: 0xa987b7,
    intensity: 21,
  },
  {
    id: 'basement',
    name: 'Basement',
    bounds: { minX: -12, maxX: -4, minZ: -23, maxZ: -12 },
    center: [-8, -17.5],
    size: [8, 11],
    floor: 0x242525,
    light: 0x8f3e2d,
    intensity: 18,
  },
  {
    id: 'attic',
    name: 'Attic',
    bounds: { minX: 4, maxX: 12, minZ: -23, maxZ: -12 },
    center: [8, -17.5],
    size: [8, 11],
    floor: 0x332d25,
    light: 0x8c7654,
    intensity: 17,
  },
  {
    id: 'nursery',
    name: 'Nursery',
    bounds: { minX: 12, maxX: 22, minZ: -12, maxZ: -2 },
    center: [17, -7],
    size: [10, 10],
    floor: 0x3a3340,
    light: 0xb7a0c4,
    intensity: 12,
  },
  {
    id: 'pantry',
    name: 'Pantry',
    bounds: { minX: 12, maxX: 18, minZ: 6, maxZ: 10 },
    center: [15, 8],
    size: [6, 4],
    floor: 0x2a2722,
    light: 0x8a7048,
    intensity: 9,
  },
  {
    id: 'study',
    name: 'Study',
    bounds: { minX: -22, maxX: -12, minZ: 2, maxZ: 10 },
    center: [-17, 6],
    size: [10, 8],
    floor: 0x2a221c,
    light: 0xc4a06a,
    intensity: 16,
  },
]

export const HUNTER_SPAWNS = [
  new THREE.Vector3(-8, FLOOR_Y + 0.08, -18),
  new THREE.Vector3(8, FLOOR_Y + 0.08, -18),
  new THREE.Vector3(-8, FLOOR_Y + 0.08, -7),
  new THREE.Vector3(8, FLOOR_Y + 0.08, -7),
  new THREE.Vector3(-17, FLOOR_Y + 0.08, 6.4),
  new THREE.Vector3(15.2, FLOOR_Y + 0.08, 8.1),
  new THREE.Vector3(17.4, FLOOR_Y + 0.08, -7.2),
]

const doorFrameMaterial = new THREE.MeshStandardMaterial({ color: 0x17110e, roughness: 0.92 })
const doorPanelMaterial = new THREE.MeshStandardMaterial({ color: 0x3a251b, roughness: 0.82 })
const doorMetalMaterial = new THREE.MeshStandardMaterial({
  color: 0x756246,
  metalness: 0.65,
  roughness: 0.38,
})

let shellBatch = null

export function addBox(parent, size, position, material, name = '') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
  mesh.position.set(...position)
  mesh.name = name
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function addShell(size, position, material, rotation = 0) {
  shellBatch.box(size, position, material, rotation)
}

function addSegmentedWallX(group, x, minZ, maxZ, gaps, material) {
  let cursor = minZ

  for (const [gapStart, gapEnd] of [...gaps].sort((a, b) => a[0] - b[0])) {
    if (gapStart > cursor) {
      addShell(
        [0.2, CEILING_Y - FLOOR_Y, gapStart - cursor],
        [x, (FLOOR_Y + CEILING_Y) / 2, (cursor + gapStart) / 2],
        material,
      )
    }
    cursor = Math.max(cursor, gapEnd)
  }

  if (cursor < maxZ) {
    addShell(
      [0.2, CEILING_Y - FLOOR_Y, maxZ - cursor],
      [x, (FLOOR_Y + CEILING_Y) / 2, (cursor + maxZ) / 2],
      material,
    )
  }
}

function addSegmentedWallZ(group, z, minX, maxX, gaps, material) {
  let cursor = minX

  for (const [gapStart, gapEnd] of [...gaps].sort((a, b) => a[0] - b[0])) {
    if (gapStart > cursor) {
      addShell(
        [gapStart - cursor, CEILING_Y - FLOOR_Y, 0.2],
        [(cursor + gapStart) / 2, (FLOOR_Y + CEILING_Y) / 2, z],
        material,
      )
    }
    cursor = Math.max(cursor, gapEnd)
  }

  if (cursor < maxX) {
    addShell(
      [maxX - cursor, CEILING_Y - FLOOR_Y, 0.2],
      [(cursor + maxX) / 2, (FLOOR_Y + CEILING_Y) / 2, z],
      material,
    )
  }
}

function createRoomDoor(group, roomId, x, z, opensToward) {
  const doorWidth = 1.7
  const doorHeight = 3
  const door = new THREE.Group()
  door.position.set(x, 0, z)
  door.userData.keepSeparate = true

  addShell(
    [0.25, doorHeight + 0.2, 0.16],
    [x, FLOOR_Y + doorHeight / 2, z - doorWidth / 2],
    doorFrameMaterial,
  )
  addShell(
    [0.25, doorHeight + 0.2, 0.16],
    [x, FLOOR_Y + doorHeight / 2, z + doorWidth / 2],
    doorFrameMaterial,
  )
  addShell(
    [0.25, 0.16, doorWidth + 0.16],
    [x, FLOOR_Y + doorHeight, z],
    doorFrameMaterial,
  )

  const hinge = new THREE.Group()
  const openRotation = opensToward * 0.62
  hinge.position.z = -doorWidth / 2
  hinge.rotation.y = openRotation
  addBox(hinge, [0.16, doorHeight, doorWidth], [0, FLOOR_Y + doorHeight / 2, doorWidth / 2], doorPanelMaterial)

  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), doorMetalMaterial)
  handle.position.set(opensToward * 0.11, FLOOR_Y + 1.2, doorWidth - 0.24)
  hinge.add(handle)
  door.add(hinge)
  group.add(door)

  return {
    hinge,
    openRotation,
    roomId,
    position: new THREE.Vector3(x, FLOOR_Y, z),
  }
}

function addNursery(group, doors, wallMaterial) {
  addSegmentedWallX(group, 22, -12, -2, [], wallMaterial)
  addSegmentedWallZ(group, -2, 12, 22, [], wallMaterial)
  addSegmentedWallZ(group, -12, 12, 22, [], wallMaterial)
  doors.push(createRoomDoor(group, 'nursery', 12, -7, 1))
  addWalkableRegion({ minX: 12.38, maxX: 21.62, minZ: -11.62, maxZ: -2.38 })
  addWalkableRegion({ minX: 11.5, maxX: 12.7, minZ: -7.85, maxZ: -6.15 })
}

function addPantry(group, doors, wallMaterial) {
  addSegmentedWallX(group, 18, 6, 10, [], wallMaterial)
  addSegmentedWallZ(group, 10, 12, 18, [], wallMaterial)
  addSegmentedWallZ(group, 6, 12, 18, [], wallMaterial)
  doors.push(createRoomDoor(group, 'pantry', 12, 8, 1))
  addWalkableRegion({ minX: 12.38, maxX: 17.62, minZ: 6.38, maxZ: 9.62 })
  addWalkableRegion({ minX: 11.5, maxX: 12.7, minZ: 7.15, maxZ: 8.85 })
}

function addStudy(group, doors, wallMaterial) {
  addSegmentedWallX(group, -22, 2, 10, [], wallMaterial)
  addSegmentedWallZ(group, 10, -22, -12, [], wallMaterial)
  addSegmentedWallZ(group, 2, -22, -12, [], wallMaterial)
  doors.push(createRoomDoor(group, 'study', -12, 6.5, -1))
  addWalkableRegion({ minX: -21.62, maxX: -12.38, minZ: 2.38, maxZ: 9.62 })
  addWalkableRegion({ minX: -12.7, maxX: -11.5, minZ: 5.55, maxZ: 7.45 })
}

function createFrontDoor(group, material) {
  const frontDoor = new THREE.Group()
  const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x25110e, roughness: 0.72 })
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x92754d,
    metalness: 0.7,
    roughness: 0.3,
  })

  addBox(frontDoor, [2.4, 3.35, 0.18], [0, FLOOR_Y + 1.675, 9.92], panelMaterial, 'front-door')
  addShell([0.2, 3.55, 0.28], [-1.3, FLOOR_Y + 1.775, 9.92], material)
  addShell([0.2, 3.55, 0.28], [1.3, FLOOR_Y + 1.775, 9.92], material)
  addShell([2.8, 0.2, 0.28], [0, FLOOR_Y + 3.45, 9.92], material)

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), metalMaterial)
  knob.position.set(0.82, FLOOR_Y + 1.25, 9.72)
  frontDoor.add(knob)
  group.add(frontDoor)

  return frontDoor
}

function createLivingCeilingWithStairOpening(material) {
  addShell([4.8, 0.16, 12], [-9.6, CEILING_Y + 0.08, 4], material)
  addShell([0.6, 0.16, 12], [-4.3, CEILING_Y + 0.08, 4], material)
  addShell([2.6, 0.16, 0.45], [-5.9, CEILING_Y + 0.08, -1.775], material)
  addShell([2.6, 0.16, 4.8], [-5.9, CEILING_Y + 0.08, 7.6], material)
}

function createStaircaseAndUpperRoom(group, ceilingLights) {
  const stairWood = new THREE.MeshStandardMaterial({ color: 0x2a1712, roughness: 0.88 })
  const railWood = new THREE.MeshStandardMaterial({ color: 0x160d0a, roughness: 0.82 })
  const upperWall = new THREE.MeshStandardMaterial({ color: 0x504842, roughness: 0.97 })
  const upperCeiling = new THREE.MeshStandardMaterial({ color: 0x242326, roughness: 1 })
  const fadedCloth = new THREE.MeshStandardMaterial({ color: 0x57434b, roughness: 1 })
  const mattress = new THREE.MeshStandardMaterial({ color: 0x8f8980, roughness: 1 })
  const stepCount = 12
  const stepDepth = (STAIR_BOUNDS.maxZ - STAIR_BOUNDS.minZ) / stepCount
  const totalRise = UPPER_FLOOR_Y - FLOOR_Y

  for (let index = 0; index < stepCount; index += 1) {
    const height = totalRise * ((index + 1) / stepCount)
    const z = STAIR_BOUNDS.minZ + stepDepth * (index + 0.5)
    addShell([1.72, height, stepDepth + 0.025], [-6.05, FLOOR_Y + height / 2, z], stairWood)
    if (index % 2 === 0) {
      const stepTop = FLOOR_Y + height
      for (const x of [-7, -5.1]) {
        addShell([0.08, 0.92, 0.08], [x, stepTop + 0.46, z], railWood)
      }
    }
  }
  for (const x of [-7, -5.1]) {
    addShell([0.09, 0.09, 6.7], [x, 1.58, 1.7], railWood, [-0.57, 0, 0])
  }

  const upperWallHeight = UPPER_CEILING_Y - UPPER_FLOOR_Y
  const upperWallCenterY = UPPER_FLOOR_Y + upperWallHeight / 2
  addShell([0.22, upperWallHeight, 12], [-11.9, upperWallCenterY, 4], upperWall)
  addShell([0.22, upperWallHeight, 12], [-4.1, upperWallCenterY, 4], upperWall)
  addShell([8, upperWallHeight, 0.22], [-8, upperWallCenterY, -1.9], upperWall)
  addShell([8, upperWallHeight, 0.22], [-8, upperWallCenterY, 9.9], upperWall)
  addShell([8, 0.18, 12], [-8, UPPER_CEILING_Y, 4], upperCeiling)

  addShell([5, upperWallHeight, 0.18], [-9.5, upperWallCenterY, 5.55], upperWall)
  addShell([1.1, upperWallHeight, 0.18], [-4.55, upperWallCenterY, 5.55], upperWall)
  addShell([0.18, 2.9, 0.26], [-6.92, UPPER_FLOOR_Y + 1.45, 5.55], railWood)
  addShell([0.18, 2.9, 0.26], [-5.08, UPPER_FLOOR_Y + 1.45, 5.55], railWood)
  addShell([2.02, 0.18, 0.26], [-6, UPPER_FLOOR_Y + 2.9, 5.55], railWood)

  for (const z of [0.2, 2.4, 4.65]) {
    for (const x of [-7.12, -4.98]) {
      addShell([0.08, 1.05, 0.08], [x, UPPER_FLOOR_Y + 0.52, z], railWood)
    }
  }
  addShell([0.08, 0.08, 5.5], [-7.12, UPPER_FLOOR_Y + 1.02, 2.1], railWood)
  addShell([0.08, 0.08, 5.5], [-4.98, UPPER_FLOOR_Y + 1.02, 2.1], railWood)

  addShell([3.4, 0.5, 1.75], [-9.7, UPPER_FLOOR_Y + 0.3, 8.4], stairWood)
  addShell([3.05, 0.28, 1.5], [-9.65, UPPER_FLOOR_Y + 0.66, 8.4], mattress)
  addShell([2.15, 0.08, 1.42], [-9.9, UPPER_FLOOR_Y + 0.86, 8.4], fadedCloth)
  addShell([0.2, 1.85, 1.9], [-11.3, UPPER_FLOOR_Y + 0.92, 8.4], railWood)
  addShell([1.45, 2.75, 0.8], [-10.9, UPPER_FLOOR_Y + 1.38, 6.25], stairWood)
  addShell([2.5, 0.035, 2.1], [-7.8, UPPER_FLOOR_Y + 0.025, 7.7], fadedCloth)

  const moonWindow = new THREE.MeshStandardMaterial({
    color: 0x92abc4,
    emissive: 0x668cb3,
    emissiveIntensity: 1.25,
    roughness: 0.25,
  })
  addShell([0.06, 1.65, 1.65], [-11.76, UPPER_FLOOR_Y + 2.25, 7.4], moonWindow)
  const upperLight = new THREE.PointLight(0x9dbbd5, 17, 11, 2)
  upperLight.position.set(-8, UPPER_FLOOR_Y + 2.7, 7.2)
  group.add(upperLight)
  const fixture = addBox(
    group,
    [0.65, 0.08, 0.65],
    [-8, UPPER_CEILING_Y - 0.12, 7.2],
    moonWindow,
  )
  fixture.userData.keepSeparate = true
  ceilingLights.push({
    baseEmissive: 1.25,
    baseIntensity: 17,
    fixture,
    light: upperLight,
    roomId: 'widows-room',
  })
}

export function createHauntedHouse(scene) {
  const group = new THREE.Group()
  group.name = 'haunted-house'
  shellBatch = createStaticBatch()
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x5b5149, roughness: 0.94 })
  const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0x302d2b, roughness: 1 })
  const hallFloorMaterial = new THREE.MeshStandardMaterial({ color: 0x2c2825, roughness: 0.9 })
  const ceilingLights = []
  const doors = []

  for (const room of ROOM_DEFINITIONS) {
    const [x, z] = room.center
    const [width, depth] = room.size
    const floorMaterial = new THREE.MeshStandardMaterial({ color: room.floor, roughness: 0.86 })

    addShell([width, 0.2, depth], [x, FLOOR_Y - 0.1, z], floorMaterial)
    if (room.id === 'living') {
      createLivingCeilingWithStairOpening(ceilingMaterial)
    } else {
      addShell([width, 0.16, depth], [x, CEILING_Y + 0.08, z], ceilingMaterial)
    }

    const fixtureMaterial = new THREE.MeshStandardMaterial({
      color: room.light,
      emissive: room.light,
      emissiveIntensity: 1.6,
      roughness: 0.45,
    })
    const fixture = addBox(group, [0.75, 0.08, 0.75], [x, CEILING_Y - 0.05, z], fixtureMaterial)
    fixture.userData.keepSeparate = true
    const light = new THREE.PointLight(room.light, room.intensity, 14, 2)
    light.position.set(x, CEILING_Y - 0.35, z)
    group.add(light)
    ceilingLights.push({ fixture, light, baseIntensity: room.intensity, baseEmissive: 1.6, roomId: room.id })
  }

  createStaircaseAndUpperRoom(group, ceilingLights)

  addShell([8, 0.2, 25], [0, FLOOR_Y - 0.1, -10.5], hallFloorMaterial)
  addShell([8, 0.16, 25], [0, CEILING_Y + 0.08, -10.5], ceilingMaterial)

  for (const z of [-4.5, -10.5, -16.5]) {
    const fixtureMaterial = new THREE.MeshStandardMaterial({
      color: 0xa68a68,
      emissive: 0xa68a68,
      emissiveIntensity: 0.8,
    })
    const fixture = addBox(group, [0.55, 0.08, 0.55], [0, CEILING_Y - 0.05, z], fixtureMaterial)
    fixture.userData.keepSeparate = true
    const light = new THREE.PointLight(0xd5a36f, 15, 9, 2)
    light.position.set(0, CEILING_Y - 0.35, z)
    group.add(light)
    ceilingLights.push({ fixture, light, baseIntensity: 15, baseEmissive: 0.8, roomId: 'hall' })
  }

  const moonWindowMaterial = new THREE.MeshStandardMaterial({
    color: 0x8ea9c6,
    emissive: 0x6f91ba,
    emissiveIntensity: 1.1,
    roughness: 0.3,
  })
  for (const [side, z] of [[-1, 5.8], [1, 5.2], [-1, -7.4], [1, -7.1]]) {
    addShell([0.06, 1.55, 1.45], [side * 11.86, FLOOR_Y + 2.25, z], moonWindowMaterial)
  }

  addSegmentedWallZ(group, 10, -12, 12, [[-1.3, 1.3]], wallMaterial)
  addSegmentedWallZ(group, -23, -12, 12, [], wallMaterial)
  addSegmentedWallX(group, -12, -23, 10, [[5.65, 7.35]], wallMaterial)
  addStudy(group, doors, wallMaterial)
  addSegmentedWallX(group, 12, -23, 10, [[-7.85, -6.15], [7.15, 8.85]], wallMaterial)
  addPantry(group, doors, wallMaterial)
  addNursery(group, doors, wallMaterial)
  addSegmentedWallX(group, -4, -23, 10, [[-18.35, -16.65], [-7.85, -6.15], [3.15, 4.85]], wallMaterial)
  addSegmentedWallX(group, 4, -23, 10, [[-18.35, -16.65], [-7.85, -6.15], [3.15, 4.85]], wallMaterial)
  addSegmentedWallZ(group, -2, -12, -4, [], wallMaterial)
  addSegmentedWallZ(group, -2, 4, 12, [], wallMaterial)
  addSegmentedWallZ(group, -12, -12, -4, [], wallMaterial)
  addSegmentedWallZ(group, -12, 4, 12, [], wallMaterial)

  doors.push(createRoomDoor(group, 'living', -4, 4, -1))
  doors.push(createRoomDoor(group, 'kitchen', 4, 4, 1))
  doors.push(createRoomDoor(group, 'bathroom', -4, -7, -1))
  doors.push(createRoomDoor(group, 'bedroom', 4, -7, 1))
  doors.push(createRoomDoor(group, 'basement', -4, -17.5, -1))
  doors.push(createRoomDoor(group, 'attic', 4, -17.5, 1))

  const frontDoor = createFrontDoor(group, wallMaterial)
  const ambientLight = new THREE.HemisphereLight(0x78889c, 0x251511, 1.35)
  group.add(ambientLight)

  const moonLight = new THREE.DirectionalLight(0x91b7e2, 1.8)
  moonLight.position.set(-9, 8, 7)
  moonLight.target.position.set(0, FLOOR_Y, -8)
  moonLight.castShadow = true
  moonLight.shadow.mapSize.set(512, 512)
  moonLight.shadow.camera.left = -18
  moonLight.shadow.camera.right = 18
  moonLight.shadow.camera.top = 18
  moonLight.shadow.camera.bottom = -18
  moonLight.shadow.camera.near = 1
  moonLight.shadow.camera.far = 45
  moonLight.shadow.bias = -0.0004
  group.add(moonLight, moonLight.target)
  shellBatch.flush(group)
  shellBatch = null
  scene.add(group)

  return { group, doors, ceilingLights, frontDoor }
}

export function getRoomAt(position) {
  if (position.y > 2.2 && position.x >= -12 && position.x <= -4 && position.z >= -2 && position.z <= 10) {
    return {
      id: 'widows-room',
      name: "Widow's Room",
      bounds: { minX: -12, maxX: -4, minZ: -2, maxZ: 10 },
    }
  }
  return (
    ROOM_DEFINITIONS.find(
      ({ bounds }) =>
        position.x >= bounds.minX &&
        position.x <= bounds.maxX &&
        position.z >= bounds.minZ &&
        position.z <= bounds.maxZ,
    ) ?? {
      id: 'hall',
      name: 'Hallway',
      bounds: { minX: -2, maxX: 2, minZ: -23, maxZ: 2 },
    }
  )
}

const WALKABLE_REGIONS = [
  { minX: -3.68, maxX: 3.68, minZ: -22.62, maxZ: 9.58 },
  { minX: -11.62, maxX: -4.32, minZ: -1.68, maxZ: 9.58 },
  { minX: -11.62, maxX: -4.32, minZ: -11.68, maxZ: -2.32 },
  { minX: -11.62, maxX: -4.32, minZ: -22.62, maxZ: -12.32 },
  { minX: 4.32, maxX: 11.62, minZ: -1.68, maxZ: 9.58 },
  { minX: 4.32, maxX: 11.62, minZ: -11.68, maxZ: -2.32 },
  { minX: 4.32, maxX: 11.62, minZ: -22.62, maxZ: -12.32 },
  { minX: -4.55, maxX: -3.45, minZ: 2.98, maxZ: 5.02 },
  { minX: 3.45, maxX: 4.55, minZ: 2.98, maxZ: 5.02 },
  { minX: -4.55, maxX: -3.45, minZ: -8.02, maxZ: -5.98 },
  { minX: 3.45, maxX: 4.55, minZ: -8.02, maxZ: -5.98 },
  { minX: -4.55, maxX: -3.45, minZ: -18.52, maxZ: -16.48 },
  { minX: 3.45, maxX: 4.55, minZ: -18.52, maxZ: -16.48 },
]

export function addWalkableRegion(region) {
  WALKABLE_REGIONS.push(region)
}

function isWalkable(x, z) {
  return WALKABLE_REGIONS.some(
    (region) => x >= region.minX && x <= region.maxX && z >= region.minZ && z <= region.maxZ,
  )
}

function segmentWalkable(x0, z0, x1, z1) {
  const distance = Math.hypot(x1 - x0, z1 - z0)
  const steps = Math.max(1, Math.ceil(distance / 0.18))
  for (let step = 1; step <= steps; step += 1) {
    const t = step / steps
    if (!isWalkable(x0 + (x1 - x0) * t, z0 + (z1 - z0) * t)) return false
  }
  return true
}

function crossesBoundary(start, end, boundary) {
  return (start < boundary && end >= boundary) || (start > boundary && end <= boundary)
}

export function movePlayerWithinHouse(position, displacement) {
  const attemptedX = position.x + displacement.x
  const attemptedZ = position.z + displacement.z
  const insideStairFootprint =
    attemptedX >= STAIR_BOUNDS.minX &&
    attemptedX <= STAIR_BOUNDS.maxX &&
    attemptedZ >= STAIR_BOUNDS.minZ &&
    attemptedZ <= STAIR_BOUNDS.maxZ
  const isBetweenFloors = position.y > 0.05 && position.y < UPPER_PLAYER_Y - 0.05
  const enteringFromBottom =
    position.y <= 0.05 &&
    position.z <= STAIR_BOUNDS.minZ + 0.7
  const enteringFromTop =
    position.y >= UPPER_PLAYER_Y - 0.05 &&
    position.z >= STAIR_BOUNDS.maxZ - 0.7

  if (insideStairFootprint && (isBetweenFloors || enteringFromBottom || enteringFromTop)) {
    position.x = THREE.MathUtils.clamp(attemptedX, STAIR_BOUNDS.minX + 0.18, STAIR_BOUNDS.maxX - 0.18)
    position.z = THREE.MathUtils.clamp(attemptedZ, STAIR_BOUNDS.minZ, STAIR_BOUNDS.maxZ)
    const progress = THREE.MathUtils.clamp(
      (position.z - STAIR_BOUNDS.minZ) / (STAIR_BOUNDS.maxZ - STAIR_BOUNDS.minZ),
      0,
      1,
    )
    position.y = THREE.MathUtils.lerp(0, UPPER_PLAYER_Y, progress)
    return
  }

  if (position.y > 2.2) {
    const upperX = THREE.MathUtils.clamp(attemptedX, -11.6, -4.4)
    let upperZ = THREE.MathUtils.clamp(attemptedZ, -1.6, 9.55)
    const isInsideUpperDoorway = upperX > -7.05 && upperX < -4.95
    if (crossesBoundary(position.z, upperZ, 5.55) && !isInsideUpperDoorway) {
      upperZ = position.z < 5.55 ? 5.25 : 5.85
    }
    position.x = upperX
    position.z = upperZ
    position.y = UPPER_PLAYER_Y
    return
  }

  const slide = (axis, amount) => {
    let scale = 1
    const start = position[axis]
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const next = start + amount * scale
      const x = axis === 'x' ? next : position.x
      const z = axis === 'z' ? next : position.z
      if (segmentWalkable(position.x, position.z, x, z)) {
        position[axis] = next
        return
      }
      scale *= 0.5
    }
  }
  slide('x', displacement.x)
  slide('z', displacement.z)
  position.y = 0
}
