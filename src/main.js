import * as THREE from 'three'

import './style.css'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
)
const renderer = new THREE.WebGLRenderer({ antialias: true })
const clock = new THREE.Clock()
const pressedKeys = new Set()
const movement = new THREE.Vector3()
const forward = new THREE.Vector3()
const right = new THREE.Vector3()
const movementSpeed = 5
const lookSensitivity = 0.002
const maxPitch = Math.PI / 2 - 0.01
const startScreen = document.querySelector('#start-screen')
const corridorWidth = 9
const corridorHeight = 4.4
const corridorLength = 80
const corridorStartZ = 8
const corridorEndZ = corridorStartZ - corridorLength
const corridorCenterZ = (corridorStartZ + corridorEndZ) / 2
const floorY = -1.7
const ceilingY = floorY + corridorHeight
let yaw = 0
let pitch = 0

camera.position.z = 5
camera.rotation.order = 'YXZ'

scene.background = new THREE.Color(0x020506)
scene.fog = new THREE.FogExp2(0x020506, 0.027)

const corridor = new THREE.Group()
const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x171a1c,
  roughness: 0.92,
})
const wallMaterial = new THREE.MeshStandardMaterial({
  color: 0x323638,
  roughness: 1,
})
const ceilingMaterial = new THREE.MeshStandardMaterial({
  color: 0x1b1e20,
  roughness: 1,
})
const fixtureMaterial = new THREE.MeshStandardMaterial({
  color: 0x73543b,
  emissive: 0xffa85c,
  emissiveIntensity: 0.65,
  roughness: 0.55,
})

function addBox(parent, size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material)

  mesh.position.set(...position)
  parent.add(mesh)

  return mesh
}

addBox(
  corridor,
  [corridorWidth, 0.2, corridorLength],
  [0, floorY - 0.1, corridorCenterZ],
  floorMaterial,
)
addBox(
  corridor,
  [corridorWidth, 0.2, corridorLength],
  [0, ceilingY + 0.1, corridorCenterZ],
  ceilingMaterial,
)
addBox(
  corridor,
  [0.2, corridorHeight, corridorLength],
  [-(corridorWidth / 2 + 0.1), (floorY + ceilingY) / 2, corridorCenterZ],
  wallMaterial,
)
addBox(
  corridor,
  [0.2, corridorHeight, corridorLength],
  [corridorWidth / 2 + 0.1, (floorY + ceilingY) / 2, corridorCenterZ],
  wallMaterial,
)
addBox(
  corridor,
  [corridorWidth, corridorHeight, 0.2],
  [0, (floorY + ceilingY) / 2, corridorEndZ - 0.1],
  wallMaterial,
)
addBox(
  corridor,
  [corridorWidth, corridorHeight, 0.2],
  [0, (floorY + ceilingY) / 2, corridorStartZ + 0.1],
  wallMaterial,
)

const ambientLight = new THREE.AmbientLight(0x59636b, 0.16)
scene.add(ambientLight)

const ceilingLightIntensity = 12
const ceilingLights = []

for (const z of [2, -10, -22, -34, -46, -58, -68]) {
  const fixture = addBox(
    corridor,
    [1.8, 0.06, 0.5],
    [0, ceilingY - 0.04, z],
    fixtureMaterial.clone(),
  )

  const light = new THREE.PointLight(0xffb66f, ceilingLightIntensity, 16, 2)
  light.position.set(0, ceilingY - 0.3, z)
  corridor.add(light)
  ceilingLights.push({ fixture, light })
}

const classroomDoors = new THREE.Group()
const doorMaterial = new THREE.MeshStandardMaterial({
  color: 0x29312d,
  roughness: 0.86,
})
const doorFrameMaterial = new THREE.MeshStandardMaterial({
  color: 0x101413,
  roughness: 0.75,
})
const doorWindowMaterial = new THREE.MeshStandardMaterial({
  color: 0x05090a,
  roughness: 0.3,
  metalness: 0.15,
})
const handleMaterial = new THREE.MeshStandardMaterial({
  color: 0x756b48,
  roughness: 0.35,
  metalness: 0.75,
})

function addClassroomDoor(side, z) {
  const door = new THREE.Group()
  const doorWidth = 1.45
  const doorHeight = 3
  const doorX = side * (corridorWidth / 2 - 0.05)
  const doorCenterY = floorY + doorHeight / 2

  addBox(door, [0.14, doorHeight, doorWidth], [doorX, doorCenterY, z], doorMaterial)
  addBox(
    door,
    [0.2, doorHeight + 0.18, 0.12],
    [doorX, doorCenterY + 0.09, z - doorWidth / 2 - 0.06],
    doorFrameMaterial,
  )
  addBox(
    door,
    [0.2, doorHeight + 0.18, 0.12],
    [doorX, doorCenterY + 0.09, z + doorWidth / 2 + 0.06],
    doorFrameMaterial,
  )
  addBox(
    door,
    [0.2, 0.12, doorWidth + 0.24],
    [doorX, floorY + doorHeight + 0.06, z],
    doorFrameMaterial,
  )
  addBox(
    door,
    [0.05, 0.62, 0.5],
    [doorX - side * 0.1, floorY + 2.15, z],
    doorWindowMaterial,
  )

  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), handleMaterial)
  handle.position.set(doorX - side * 0.13, floorY + 1.05, z + 0.46)
  door.add(handle)

  classroomDoors.add(door)
}

for (const z of [-5, -21, -37, -53]) {
  addClassroomDoor(-1, z)
}

for (const z of [-11, -27, -43, -59]) {
  addClassroomDoor(1, z)
}

corridor.add(classroomDoors)

const exitDoor = new THREE.Group()
const exitDoorZ = corridorEndZ + 0.09
const exitDoorHeight = 3.2
const exitDoorWidth = 2.3
const exitDoorCenterY = floorY + exitDoorHeight / 2
const exitDoorMaterial = new THREE.MeshStandardMaterial({
  color: 0x1b2723,
  roughness: 0.8,
})
const panicBarMaterial = new THREE.MeshStandardMaterial({
  color: 0x8b8f86,
  roughness: 0.35,
  metalness: 0.8,
})

addBox(
  exitDoor,
  [exitDoorWidth, exitDoorHeight, 0.14],
  [0, exitDoorCenterY, exitDoorZ],
  exitDoorMaterial,
)
addBox(
  exitDoor,
  [0.14, exitDoorHeight + 0.18, 0.22],
  [-(exitDoorWidth / 2 + 0.07), exitDoorCenterY + 0.09, exitDoorZ],
  doorFrameMaterial,
)
addBox(
  exitDoor,
  [0.14, exitDoorHeight + 0.18, 0.22],
  [exitDoorWidth / 2 + 0.07, exitDoorCenterY + 0.09, exitDoorZ],
  doorFrameMaterial,
)
addBox(
  exitDoor,
  [exitDoorWidth + 0.28, 0.14, 0.22],
  [0, floorY + exitDoorHeight + 0.07, exitDoorZ],
  doorFrameMaterial,
)
addBox(
  exitDoor,
  [1.35, 0.09, 0.1],
  [0, floorY + 1.15, exitDoorZ + 0.13],
  panicBarMaterial,
)

const exitSignCanvas = document.createElement('canvas')
exitSignCanvas.width = 512
exitSignCanvas.height = 192

const exitSignContext = exitSignCanvas.getContext('2d')
exitSignContext.fillStyle = '#082d20'
exitSignContext.fillRect(0, 0, exitSignCanvas.width, exitSignCanvas.height)
exitSignContext.strokeStyle = '#8dffc0'
exitSignContext.lineWidth = 14
exitSignContext.strokeRect(8, 8, exitSignCanvas.width - 16, exitSignCanvas.height - 16)
exitSignContext.fillStyle = '#d8ffe8'
exitSignContext.font = 'bold 118px sans-serif'
exitSignContext.textAlign = 'center'
exitSignContext.textBaseline = 'middle'
exitSignContext.fillText('EXIT', exitSignCanvas.width / 2, exitSignCanvas.height / 2 + 6)

const exitSignTexture = new THREE.CanvasTexture(exitSignCanvas)
exitSignTexture.colorSpace = THREE.SRGBColorSpace

const exitSign = new THREE.Mesh(
  new THREE.PlaneGeometry(1.9, 0.7),
  new THREE.MeshBasicMaterial({ map: exitSignTexture, toneMapped: false }),
)
exitSign.position.set(0, floorY + exitDoorHeight + 0.62, exitDoorZ + 0.13)
exitDoor.add(exitSign)

const exitLight = new THREE.PointLight(0x67ff9b, 6, 7, 2)
exitLight.position.set(0, floorY + exitDoorHeight + 0.45, exitDoorZ + 0.7)
exitDoor.add(exitLight)

corridor.add(exitDoor)

scene.add(corridor)

renderer.setClearColor(0x000000)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.setSize(window.innerWidth, window.innerHeight)

document.querySelector('#app').appendChild(renderer.domElement)

renderer.setAnimationLoop(() => {
  const delta = Math.min(clock.getDelta(), 0.1)

  movement.set(0, 0, 0)
  camera.getWorldDirection(forward)
  forward.y = 0
  forward.normalize()
  right.crossVectors(forward, camera.up).normalize()

  if (pressedKeys.has('KeyW')) movement.add(forward)
  if (pressedKeys.has('KeyS')) movement.sub(forward)
  if (pressedKeys.has('KeyD')) movement.add(right)
  if (pressedKeys.has('KeyA')) movement.sub(right)

  if (movement.lengthSq() > 0) {
    camera.position.addScaledVector(movement.normalize(), movementSpeed * delta)
  }

  renderer.render(scene, camera)
})

window.addEventListener('keydown', (event) => {
  if (document.pointerLockElement === renderer.domElement) {
    pressedKeys.add(event.code)
  }
})

window.addEventListener('keyup', (event) => {
  pressedKeys.delete(event.code)
})

window.addEventListener('blur', () => {
  pressedKeys.clear()
})

startScreen.addEventListener('click', () => {
  renderer.domElement.requestPointerLock()
})

document.addEventListener('pointerlockchange', () => {
  const isLocked = document.pointerLockElement === renderer.domElement

  startScreen.hidden = isLocked

  if (!isLocked) {
    pressedKeys.clear()
  }
})

document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== renderer.domElement) return

  yaw -= event.movementX * lookSensitivity
  pitch -= event.movementY * lookSensitivity
  pitch = THREE.MathUtils.clamp(pitch, -maxPitch, maxPitch)
  camera.rotation.set(pitch, yaw, 0)
})

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(window.innerWidth, window.innerHeight)
})
