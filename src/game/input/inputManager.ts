export interface VehicleInputState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  brake: boolean;
  nitro: boolean;
  justPressedPause: boolean;
  justPressedReset: boolean;
  justPressedInteract: boolean;
  justPressedCamera: boolean;
  justPressedPulse: boolean;
  justPressedTab: boolean;
  reticleX: number;
  reticleY: number;
}

export class InputManager {
  private heldKeys = new Set<string>();
  private touchState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    brake: false,
    nitro: false,
  };
  private locked = false;
  private justPressedPause = false;
  private justPressedReset = false;
  private justPressedInteract = false;
  private justPressedCamera = false;
  private justPressedPulse = false;
  private justPressedTab = false;
  private reticleX = 0;
  private reticleY = 0;

  private handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable)
    ) {
      return;
    }

    const code = e.code;

    if (code === 'Escape') {
      this.justPressedPause = true;
      return;
    }

    if (this.locked) {
      return;
    }

    if (code === 'KeyR') {
      this.justPressedReset = true;
      return;
    }

    if (code === 'KeyE') {
      this.justPressedInteract = true;
      return;
    }

    if (code === 'KeyC') {
      this.justPressedCamera = true;
      return;
    }

    if (code === 'KeyF') {
      this.justPressedPulse = true;
      return;
    }

    if (code === 'Tab') {
      e.preventDefault();
      this.justPressedTab = true;
      return;
    }

    if (
      code === 'KeyW' ||
      code === 'ArrowUp' ||
      code === 'KeyS' ||
      code === 'ArrowDown' ||
      code === 'KeyA' ||
      code === 'ArrowLeft' ||
      code === 'KeyD' ||
      code === 'ArrowRight' ||
      code === 'Space' ||
      code === 'ShiftLeft' ||
      code === 'ShiftRight'
    ) {
      e.preventDefault();
      this.heldKeys.add(code);
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
  };

  private handlePointerMove = (e: PointerEvent) => {
    if (this.locked) return;
    const w = window.innerWidth || 1;
    const h = window.innerHeight || 1;
    // Normalized device coordinates (-1 to +1)
    this.reticleX = Math.max(-0.85, Math.min(0.85, (e.clientX / w) * 2 - 1));
    this.reticleY = Math.max(-0.75, Math.min(0.75, -(e.clientY / h) * 2 + 1));
  };

  private handleBlur = () => {
    this.clearAllInputs();
  };

  public attach() {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('blur', this.handleBlur);
  }

  public detach() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('blur', this.handleBlur);
  }

  public setLocked(locked: boolean) {
    this.locked = locked;
    if (locked) {
      this.clearAllInputs();
    }
  }

  public clearAllInputs() {
    this.heldKeys.clear();
    this.touchState.forward = false;
    this.touchState.backward = false;
    this.touchState.left = false;
    this.touchState.right = false;
    this.touchState.brake = false;
    this.touchState.nitro = false;
  }

  public triggerVirtualAction(action: 'interact' | 'camera' | 'pulse' | 'reset') {
    if (this.locked) return;
    if (action === 'interact') this.justPressedInteract = true;
    else if (action === 'camera') this.justPressedCamera = true;
    else if (action === 'pulse') this.justPressedPulse = true;
    else if (action === 'reset') this.justPressedReset = true;
  }

  public setReticleNdc(x: number, y: number) {
    this.reticleX = Math.max(-0.9, Math.min(0.9, x));
    this.reticleY = Math.max(-0.8, Math.min(0.8, y));
  }

  public setTouchControl(
    control: 'forward' | 'backward' | 'left' | 'right' | 'brake' | 'nitro',
    active: boolean
  ) {
    if (this.locked) {
      this.clearAllInputs();
      return;
    }
    this.touchState[control] = active;
  }

  public sampleInput(): VehicleInputState {
    const pause = this.justPressedPause;
    const reset = this.justPressedReset;
    const interact = this.justPressedInteract;
    const camera = this.justPressedCamera;
    const pulse = this.justPressedPulse;
    const tab = this.justPressedTab;

    this.justPressedPause = false;
    this.justPressedReset = false;
    this.justPressedInteract = false;
    this.justPressedCamera = false;
    this.justPressedPulse = false;
    this.justPressedTab = false;

    if (this.locked) {
      return {
        forward: false,
        backward: false,
        left: false,
        right: false,
        brake: false,
        nitro: false,
        justPressedPause: pause,
        justPressedReset: false,
        justPressedInteract: false,
        justPressedCamera: false,
        justPressedPulse: false,
        justPressedTab: false,
        reticleX: this.reticleX,
        reticleY: this.reticleY,
      };
    }

    const forward =
      this.heldKeys.has('KeyW') ||
      this.heldKeys.has('ArrowUp') ||
      this.touchState.forward;
    const backward =
      this.heldKeys.has('KeyS') ||
      this.heldKeys.has('ArrowDown') ||
      this.touchState.backward;
    const left =
      this.heldKeys.has('KeyA') ||
      this.heldKeys.has('ArrowLeft') ||
      this.touchState.left;
    const right =
      this.heldKeys.has('KeyD') ||
      this.heldKeys.has('ArrowRight') ||
      this.touchState.right;
    const brake = this.heldKeys.has('Space') || this.touchState.brake;
    const nitro =
      this.heldKeys.has('ShiftLeft') ||
      this.heldKeys.has('ShiftRight') ||
      this.touchState.nitro;

    return {
      forward,
      backward,
      left,
      right,
      brake,
      nitro,
      justPressedPause: pause,
      justPressedReset: reset,
      justPressedInteract: interact,
      justPressedCamera: camera,
      justPressedPulse: pulse,
      justPressedTab: tab,
      reticleX: this.reticleX,
      reticleY: this.reticleY,
    };
  }
}


