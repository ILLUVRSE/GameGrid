import type Phaser from 'phaser';

export interface PlayerInputState {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  leftPressed: boolean;
  rightPressed: boolean;
  jumpPressed: boolean;
  attackPressed: boolean;
  specialPressed: boolean;
  dashPressed: boolean;
}

export class InputManager {
  private scene: Phaser.Scene;
  private mappings: Record<number, Phaser.Types.Input.Keyboard.CursorKeys & Record<string, Phaser.Input.Keyboard.Key>> = {};

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.createMappings();
    this.scene.input.gamepad?.start();
  }

  private createMappings() {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) {
      return;
    }

    this.mappings[1] = keyboard.addKeys({
      left: 'A',
      right: 'D',
      up: 'W',
      down: 'S',
      attack: 'J',
      special: 'K',
      dash: 'SHIFT'
    }) as Phaser.Types.Input.Keyboard.CursorKeys & Record<string, Phaser.Input.Keyboard.Key>;

    this.mappings[2] = keyboard.addKeys({
      left: 'LEFT',
      right: 'RIGHT',
      up: 'UP',
      down: 'DOWN',
      attack: 'NUMPAD_ONE',
      special: 'NUMPAD_TWO',
      dash: 'NUMPAD_ZERO'
    }) as Phaser.Types.Input.Keyboard.CursorKeys & Record<string, Phaser.Input.Keyboard.Key>;

    this.mappings[3] = keyboard.addKeys({
      left: 'F',
      right: 'H',
      up: 'T',
      down: 'G',
      attack: 'Y',
      special: 'U',
      dash: 'R'
    }) as Phaser.Types.Input.Keyboard.CursorKeys & Record<string, Phaser.Input.Keyboard.Key>;

    this.mappings[4] = keyboard.addKeys({
      left: 'J',
      right: 'L',
      up: 'I',
      down: 'K',
      attack: 'O',
      special: 'P',
      dash: 'SEMICOLON'
    }) as Phaser.Types.Input.Keyboard.CursorKeys & Record<string, Phaser.Input.Keyboard.Key>;
  }

  getState(playerId: number): PlayerInputState {
    const keys = this.mappings[playerId];
    if (!keys) {
      return this.getGamepadState(playerId);
    }

    const left = keys.left?.isDown ?? false;
    const right = keys.right?.isDown ?? false;
    const up = keys.up?.isDown ?? false;
    const down = keys.down?.isDown ?? false;
    const leftPressed = Phaser.Input.Keyboard.JustDown(keys.left);
    const rightPressed = Phaser.Input.Keyboard.JustDown(keys.right);
    const jumpPressed = Phaser.Input.Keyboard.JustDown(keys.up);
    const attackPressed = Phaser.Input.Keyboard.JustDown(keys.attack);
    const specialPressed = Phaser.Input.Keyboard.JustDown(keys.special);
    const dashPressed = Phaser.Input.Keyboard.JustDown(keys.dash);

    return {
      left,
      right,
      up,
      down,
      leftPressed,
      rightPressed,
      jumpPressed,
      attackPressed,
      specialPressed,
      dashPressed
    };
  }

  private getGamepadState(playerId: number): PlayerInputState {
    const pad = this.scene.input.gamepad?.getPad(playerId - 1);
    if (!pad) {
      return {
        left: false,
        right: false,
        up: false,
        down: false,
        leftPressed: false,
        rightPressed: false,
        jumpPressed: false,
        attackPressed: false,
        specialPressed: false,
        dashPressed: false
      };
    }

    const axisX = pad.axes.length > 0 ? pad.axes[0].getValue() : 0;
    const axisY = pad.axes.length > 1 ? pad.axes[1].getValue() : 0;
    const left = axisX < -0.4 || pad.left;
    const right = axisX > 0.4 || pad.right;
    const up = axisY < -0.4 || pad.up;
    const down = axisY > 0.4 || pad.down;

    return {
      left,
      right,
      up,
      down,
      leftPressed: pad.justPressed(14),
      rightPressed: pad.justPressed(15),
      jumpPressed: pad.justPressed(12),
      attackPressed: pad.justPressed(0),
      specialPressed: pad.justPressed(1),
      dashPressed: pad.justPressed(4)
    };
  }
}
