export function createMobileControls({
  interactButton,
  joystick,
  joystickKnob,
  joystickZone,
  lookZone,
  onInteract,
  onLook,
  onFireHold,
  onGrenade,
  onReload,
  onStun,
  onSwap,
  grenadeButton,
  reloadButton,
  root,
  runButton,
  stunButton,
  swapButton,
}) {
  const movement = { x: 0, y: 0 }
  const targetMovement = { x: 0, y: 0 }
  let active = false
  let joystickPointerId = null
  let lookPointerId = null
  let lastLookX = 0
  let lastLookY = 0
  let sprinting = false
  let joystickCenterX = 0
  let joystickCenterY = 0

  const resetJoystick = () => {
    joystickPointerId = null
    targetMovement.x = 0
    targetMovement.y = 0
    movement.x = 0
    movement.y = 0
    joystick.classList.remove('is-active')
    joystick.style.removeProperty('left')
    joystick.style.removeProperty('top')
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
    const maxDistance = bounds.width * 0.35
    const offsetX = event.clientX - joystickCenterX
    const offsetY = event.clientY - joystickCenterY
    const distance = Math.hypot(offsetX, offsetY)
    const scale = distance > maxDistance ? maxDistance / distance : 1
    const clampedX = offsetX * scale
    const clampedY = offsetY * scale
    const rawX = clampedX / maxDistance
    const rawY = -clampedY / maxDistance
    const magnitude = Math.min(1, Math.hypot(rawX, rawY))
    const deadZone = 0.08
    const response = magnitude <= deadZone
      ? 0
      : Math.pow((magnitude - deadZone) / (1 - deadZone), 0.72)
    const responseScale = magnitude > 0 ? response / magnitude : 0
    targetMovement.x = rawX * responseScale
    targetMovement.y = rawY * responseScale
    joystickKnob.style.transform =
      `translate(calc(-50% + ${clampedX}px), calc(-50% + ${clampedY}px))`
  }

  joystickZone.addEventListener('pointerdown', (event) => {
    if (!active || joystickPointerId !== null) return
    event.preventDefault()
    joystickPointerId = event.pointerId
    const zoneBounds = joystickZone.getBoundingClientRect()
    const stickRadius = joystick.offsetWidth / 2
    joystickCenterX = Math.min(
      zoneBounds.right - stickRadius,
      Math.max(zoneBounds.left + stickRadius, event.clientX),
    )
    joystickCenterY = Math.min(
      zoneBounds.bottom - stickRadius,
      Math.max(zoneBounds.top + stickRadius, event.clientY),
    )
    joystick.style.left = `${joystickCenterX - zoneBounds.left}px`
    joystick.style.top = `${joystickCenterY - zoneBounds.top}px`
    joystick.classList.add('is-active')
    joystickZone.setPointerCapture(event.pointerId)
    updateJoystick(event)
  })
  joystickZone.addEventListener('pointermove', (event) => {
    if (event.pointerId !== joystickPointerId) return
    event.preventDefault()
    updateJoystick(event)
  })
  for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    joystickZone.addEventListener(eventName, (event) => {
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
    onFireHold?.(true)
    onStun()
    stunButton.setPointerCapture(event.pointerId)
  })
  for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    stunButton.addEventListener(eventName, () => {
      onFireHold?.(false)
    })
  }
  reloadButton.addEventListener('pointerdown', (event) => {
    if (!active) return
    event.preventDefault()
    onReload()
  })
  swapButton?.addEventListener('pointerdown', (event) => {
    if (!active) return
    event.preventDefault()
    onSwap()
  })
  grenadeButton?.addEventListener('pointerdown', (event) => {
    if (!active) return
    event.preventDefault()
    onGrenade()
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
    update(delta) {
      const smoothing = 1 - Math.exp(-18 * delta)
      movement.x += (targetMovement.x - movement.x) * smoothing
      movement.y += (targetMovement.y - movement.y) * smoothing
      if (Math.abs(movement.x) < 0.002) movement.x = 0
      if (Math.abs(movement.y) < 0.002) movement.y = 0
    },
  }
}
