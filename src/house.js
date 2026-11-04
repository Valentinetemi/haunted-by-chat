import * as THREE from 'three'

export const FLOOR_Y = -1.7
export const CEILING_Y = 2.5
export const PLAYER_START = new THREE.Vector3(0, 0, 6)

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
]

export const HUNTER_SPAWNS = [
  new THREE.Vector3(-8, FLOOR_Y + 0.08, -18),
  new THREE.Vector3(8, FLOOR_Y + 0.08, -18),
  new THREE.Vector3(-8, FLOOR_Y + 0.08, -7),
  new THREE.Vector3(8, FLOOR_Y + 0.08, -7),
]

export function addBox(parent, size, position, material, name = '') {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)
  mesh.position.set(...position)
  mesh.name = name
  mesh.castShadow = true
  mesh.receiveShadow = true
  parent.add(mesh)
  return mesh
}

function addSegmentedWallX(group, x, minZ, maxZ, gaps, material) {
  let cursor = minZ

  for (const [gapStart, gapEnd] of [...gaps].sort((a, b) => a[0] - b[0])) {
    if (gapStart > cursor) {
      addBox(
        group,
        [0.2, CEILING_Y - FLOOR_Y, gapStart - cursor],
        [x, (FLOOR_Y + CEILING_Y) / 2, (cursor + gapStart) / 2],
        material,
      )
    }
    cursor = Math.max(cursor, gapEnd)
  }

  if (cursor < maxZ) {
    addBox(
      group,
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
      addBox(
        group,
        [gapStart - cursor, CEILING_Y - FLOOR_Y, 0.2],
        [(cursor + gapStart) / 2, (FLOOR_Y + CEILING_Y) / 2, z],
        material,
      )
    }
    cursor = Math.max(cursor, gapEnd)
  }

  if (cursor < maxX) {
    addBox(
      group,
      [maxX - cursor, CEILING_Y - FLOOR_Y, 0.2],
      [(cursor + maxX) / 2, (FLOOR_Y + CEILING_Y) / 2, z],
      material,
    )
  }
}

function createRoomDoor(group, roomId, x, z, opensToward) {
  const doorWidth = 1.7
  const doorHeight = 3
  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x17110e, roughness: 0.92 })
  const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x3a251b, roughness: 0.82 })
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x756246,
    metalness: 0.65,
    roughness: 0.38,
  })
  const door = new THREE.Group()
  door.position.set(x, 0, z)

  addBox(door, [0.25, doorHeight + 0.2, 0.16], [0, FLOOR_Y + doorHeight / 2, -doorWidth / 2], frameMaterial)
  addBox(door, [0.25, doorHeight + 0.2, 0.16], [0, FLOOR_Y + doorHeight / 2, doorWidth / 2], frameMaterial)
  addBox(door, [0.25, 0.16, doorWidth + 0.16], [0, FLOOR_Y + doorHeight, 0], frameMaterial)

  const hinge = new THREE.Group()
  const openRotation = opensToward * 0.62
  hinge.position.z = -doorWidth / 2
  hinge.rotation.y = openRotation
  addBox(hinge, [0.16, doorHeight, doorWidth], [0, FLOOR_Y + doorHeight / 2, doorWidth / 2], panelMaterial)

  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), metalMaterial)
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

function createFrontDoor(group, material) {
  const frontDoor = new THREE.Group()
  const panelMaterial = new THREE.MeshStandardMaterial({ color: 0x25110e, roughness: 0.72 })
  const metalMaterial = new THREE.MeshStandardMaterial({
    color: 0x92754d,
    metalness: 0.7,
    roughness: 0.3,
  })

  addBox(frontDoor, [2.4, 3.35, 0.18], [0, FLOOR_Y + 1.675, 9.92], panelMaterial, 'front-door')
  addBox(frontDoor, [0.2, 3.55, 0.28], [-1.3, FLOOR_Y + 1.775, 9.92], material)
  addBox(frontDoor, [0.2, 3.55, 0.28], [1.3, FLOOR_Y + 1.775, 9.92], material)
  addBox(frontDoor, [2.8, 0.2, 0.28], [0, FLOOR_Y + 3.45, 9.92], material)

  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), metalMaterial)
  knob.position.set(0.82, FLOOR_Y + 1.25, 9.72)
  frontDoor.add(knob)
  group.add(frontDoor)

  return frontDoor
}

export function createHauntedHouse(scene) {
  const group = new THREE.Group()
  group.name = 'haunted-house'
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x5b5149, roughness: 0.94 })
  const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0x302d2b, roughness: 1 })
  const hallFloorMaterial = new THREE.MeshStandardMaterial({ color: 0x2c2825, roughness: 0.9 })
  const ceilingLights = []
  const doors = []

  for (const room of ROOM_DEFINITIONS) {
    const [x, z] = room.center
    const [width, depth] = room.size
    const floorMaterial = new THREE.MeshStandardMaterial({ color: room.floor, roughness: 0.86 })

    addBox(group, [width, 0.2, depth], [x, FLOOR_Y - 0.1, z], floorMaterial, `${room.id}-floor`)
    addBox(group, [width, 0.16, depth], [x, CEILING_Y + 0.08, z], ceilingMaterial, `${room.id}-ceiling`)

    const fixtureMaterial = new THREE.MeshStandardMaterial({
      color: room.light,
      emissive: room.light,
      emissiveIntensity: 1.6,
      roughness: 0.45,
    })
    const fixture = addBox(group, [0.75, 0.08, 0.75], [x, CEILING_Y - 0.05, z], fixtureMaterial)
    const light = new THREE.PointLight(room.light, room.intensity, 14, 2)
    light.position.set(x, CEILING_Y - 0.35, z)
    group.add(light)
    ceilingLights.push({ fixture, light, baseIntensity: room.intensity, baseEmissive: 1.6, roomId: room.id })
  }

  addBox(group, [8, 0.2, 25], [0, FLOOR_Y - 0.1, -10.5], hallFloorMaterial, 'main-hall-floor')
  addBox(group, [8, 0.16, 25], [0, CEILING_Y + 0.08, -10.5], ceilingMaterial, 'main-hall-ceiling')

  for (const z of [-4.5, -10.5, -16.5]) {
    const fixtureMaterial = new THREE.MeshStandardMaterial({
      color: 0xa68a68,
      emissive: 0xa68a68,
      emissiveIntensity: 0.8,
    })
    const fixture = addBox(group, [0.55, 0.08, 0.55], [0, CEILING_Y - 0.05, z], fixtureMaterial)
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
    addBox(
      group,
      [0.06, 1.55, 1.45],
      [side * 11.86, FLOOR_Y + 2.25, z],
      moonWindowMaterial,
      'moonlit-window',
    )
    const windowLight = new THREE.PointLight(0x8eb8e8, 7, 8, 2)
    windowLight.position.set(side * 10.9, FLOOR_Y + 2.1, z)
    group.add(windowLight)
  }

  addSegmentedWallZ(group, 10, -12, 12, [[-1.3, 1.3]], wallMaterial)
  addSegmentedWallZ(group, -23, -12, 12, [], wallMaterial)
  addSegmentedWallX(group, -12, -23, 10, [], wallMaterial)
  addSegmentedWallX(group, 12, -23, 10, [], wallMaterial)
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
  moonLight.shadow.mapSize.set(1024, 1024)
  moonLight.shadow.camera.left = -18
  moonLight.shadow.camera.right = 18
  moonLight.shadow.camera.top = 18
  moonLight.shadow.camera.bottom = -18
  moonLight.shadow.camera.near = 1
  moonLight.shadow.camera.far = 45
  moonLight.shadow.bias = -0.0004
  group.add(moonLight, moonLight.target)
  scene.add(group)

  return { group, doors, ceilingLights, frontDoor }
}

export function getRoomAt(position) {
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

const DOORWAY_Z_CENTERS = [4, -7, -17.5]
const PLAYER_WALL_CLEARANCE = 0.32

function crossesBoundary(start, end, boundary) {
  return (start < boundary && end >= boundary) || (start > boundary && end <= boundary)
}

function isInsideDoorway(z) {
  return DOORWAY_Z_CENTERS.some((center) => Math.abs(z - center) < 1.02)
}

export function movePlayerWithinHouse(position, displacement) {
  let nextX = THREE.MathUtils.clamp(position.x + displacement.x, -11.62, 11.62)
  let nextZ = THREE.MathUtils.clamp(position.z + displacement.z, -22.62, 9.58)

  for (const wallX of [-4, 4]) {
    if (crossesBoundary(position.x, nextX, wallX) && !isInsideDoorway(nextZ)) {
      nextX =
        position.x < wallX
          ? wallX - PLAYER_WALL_CLEARANCE
          : wallX + PLAYER_WALL_CLEARANCE
    }
  }

  for (const wallZ of [-12, -2]) {
    const isInsideSideRooms = Math.abs(nextX) > 4 + PLAYER_WALL_CLEARANCE
    if (isInsideSideRooms && crossesBoundary(position.z, nextZ, wallZ)) {
      nextZ =
        position.z < wallZ
          ? wallZ - PLAYER_WALL_CLEARANCE
          : wallZ + PLAYER_WALL_CLEARANCE
    }
  }

  position.x = nextX
  position.z = nextZ
}
