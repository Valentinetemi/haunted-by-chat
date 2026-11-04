export function createMobileControls({
  interactButton,
  joystick,
  joystickKnob,
  lookZone,
  onInteract,
  onLook,
  onStun,
  root,
  runButton,
  stunButton,
}) {
  const movement = { x: 0, y: 0 }
  let active = false
  let joystickPointerId = null
  let lookPointerId = null
  let lastLookX = 0
  let lastLookY = 0
  let sprinting = false

  const resetJoystick = () => {
    joystickPointerId = null
    movement.x = 0
    movement.y = 0
    joystickKnob.style.transform = 'translate(-50%, -50%)'
  }

  const reset = () => {
    resetJoystick()
    lookPointerId = null
    sprinting = false
    runButton.classList.remove('is-held')
  }

  const updateJoystick = (event) => {
    const bounds = joystick.getBoundingClientRect()
    const centerX = bounds.left + bounds.width / 2
    const centerY = bounds.top + bounds.height / 2
    const maxDistance = bounds.width * 0.34
    const offsetX = event.clientX - centerX
    const offsetY = event.clientY - centerY
    const distance = Math.hypot(offsetX, offsetY)
    const scale = distance > maxDistance ? maxDistance / distance : 1
    const clampedX = offsetX * scale
    const clampedY = offsetY * scale
    movement.x = clampedX / maxDistance
    movement.y = -clampedY / maxDistance
    joystickKnob.style.transform =
      `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`
  }

  joystick.addEventListener('pointerdown', (event) => {
    if (!active || joystickPointerId !== null) return
    event.preventDefault()
    joystickPointerId = event.pointerId
    joystick.setPointerCapture(event.pointerId)
    updateJoystick(event)
  })
  joystick.addEventListener('pointermove', (event) => {
    if (event.pointerId !== joystickPointerId) return
    event.preventDefault()
    updateJoystick(event)
  })
  for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    joystick.addEventListener(eventName, (event) => {
      if (event.pointerId === joystickPointerId) resetJoystick()
    })
  }

  lookZone.addEventListener('pointerdown', (event) => {
    if (!active || lookPointerId !== null) return
    event.preventDefault()
    lookPointerId = event.pointerId
    lastLookX = event.clientX
    lastLookY = event.clientY
    lookZone.setPointerCapture(event.pointerId)
  })
  lookZone.addEventListener('pointermove', (event) => {
    if (event.pointerId !== lookPointerId) return
    event.preventDefault()
    const deltaX = event.clientX - lastLookX
    const deltaY = event.clientY - lastLookY
    lastLookX = event.clientX
    lastLookY = event.clientY
    onLook(deltaX, deltaY)
  })
  for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    lookZone.addEventListener(eventName, (event) => {
      if (event.pointerId === lookPointerId) lookPointerId = null
    })
  }

  runButton.addEventListener('pointerdown', (event) => {
    if (!active) return
    event.preventDefault()
    sprinting = true
    runButton.classList.add('is-held')
    runButton.setPointerCapture(event.pointerId)
  })
  for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    runButton.addEventListener(eventName, () => {
      sprinting = false
      runButton.classList.remove('is-held')
    })
  }

  stunButton.addEventListener('pointerdown', (event) => {
    if (!active) return
    event.preventDefault()
    onStun()
  })
  interactButton.addEventListener('pointerdown', (event) => {
    if (!active) return
    event.preventDefault()
    onInteract()
  })
  root.addEventListener('contextmenu', (event) => event.preventDefault())

  return {
    get movementX() {
      return movement.x
    },
    get movementY() {
      return movement.y
    },
    get sprinting() {
      return sprinting
    },
    reset,
    setActive(isActive) {
      active = isActive
      root.hidden = !active
      if (!active) reset()
    },
  }
}
