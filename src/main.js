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
let yaw = 0
let pitch = 0

camera.position.z = 5
camera.rotation.order = 'YXZ'

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
