import * as THREE from 'three'

const HIDING_SPOTS = [
  {
    name: 'behind the sofa',
    position: new THREE.Vector3(-9.4, 0, 7.3),
    hiddenPosition: new THREE.Vector3(-9.4, -0.55, 8.55),
    exitPosition: new THREE.Vector3(-9.4, 0, 6.5),
  },
  {
    name: 'inside the pantry',
    position: new THREE.Vector3(10.8, 0, 7.5),
    hiddenPosition: new THREE.Vector3(11.25, -0.15, 7.5),
    exitPosition: new THREE.Vector3(9.7, 0, 7.5),
  },
  {
    name: 'under the bed',
    position: new THREE.Vector3(9.6, 0, -10.1),
    hiddenPosition: new THREE.Vector3(9.6, -1.15, -10.65),
    exitPosition: new THREE.Vector3(8.7, 0, -9.3),
  },
  {
    name: 'inside the trunk',
    position: new THREE.Vector3(9.5, 0, -20.4),
    hiddenPosition: new THREE.Vector3(9.5, -0.65, -20.4),
    exitPosition: new THREE.Vector3(8.2, 0, -19.7),
  },
]

export function createHidingSystem(camera, prompt) {
  let hiddenSpot = null
  let nearbySpot = null

  const update = (active) => {
    if (!active) {
      prompt.hidden = true
      return
    }

    if (hiddenSpot) {
      camera.position.copy(hiddenSpot.hiddenPosition)
      prompt.textContent = 'E · leave hiding spot'
      prompt.hidden = false
      return
    }

    nearbySpot = HIDING_SPOTS.reduce((nearest, spot) => {
      const distance = camera.position.distanceToSquared(spot.position)
      if (distance > 2.2 ** 2) return nearest
      if (!nearest || distance < nearest.distance) return { distance, spot }
      return nearest
    }, null)?.spot ?? null

    prompt.textContent = nearbySpot ? `E · hide ${nearbySpot.name}` : ''
    prompt.hidden = !nearbySpot
  }

  const toggle = () => {
    if (hiddenSpot) {
      camera.position.copy(hiddenSpot.exitPosition)
      hiddenSpot = null
      return true
    }
    if (!nearbySpot) return false
    hiddenSpot = nearbySpot
    nearbySpot = null
    camera.position.copy(hiddenSpot.hiddenPosition)
    return true
  }

  const reset = () => {
    hiddenSpot = null
    nearbySpot = null
    prompt.hidden = true
  }

  return {
    get isHidden() {
      return hiddenSpot !== null
    },
    reset,
    toggle,
    update,
  }
}
