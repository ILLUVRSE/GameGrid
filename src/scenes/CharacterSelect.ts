import Phaser from 'phaser';
import { characterList } from '../game/characters';
import { InputManager } from '../game/inputManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/physics';
import type { PlayerSelection } from '../game/types';

const PLAYER_COLORS = [0x4cc9f0, 0xf72585, 0x3a86ff, 0xffbe0b];

interface SlotState {
  playerId: number;
  active: boolean;
  locked: boolean;
  selectionIndex: number;
  panel: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  stats: Phaser.GameObjects.Text;
}

export class CharacterSelectScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private slots: SlotState[] = [];

  constructor() {
    super('CharacterSelect');
  }

  create() {
    this.inputManager = new InputManager(this);

    this.add
      .text(GAME_WIDTH / 2, 60, 'Character Select', {
        fontSize: '34px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    const slotWidth = 200;
    const spacing = 20;
    const startX = (GAME_WIDTH - (slotWidth * 4 + spacing * 3)) / 2;

    for (let i = 0; i < 4; i += 1) {
      const x = startX + i * (slotWidth + spacing) + slotWidth / 2;
      const panel = this.add
        .rectangle(x, 200, slotWidth, 200, 0x1a2035, 0.9)
        .setStrokeStyle(2, PLAYER_COLORS[i]);
      const label = this.add
        .text(x, 170, `P${i + 1}: Press Attack`, {
          fontSize: '16px',
          color: '#ffffff'
        })
        .setOrigin(0.5);
      const stats = this.add
        .text(x, 260, '', {
          fontSize: '13px',
          color: '#c7cbff',
          align: 'center'
        })
        .setOrigin(0.5);

      this.slots.push({
        playerId: i + 1,
        active: i < 2,
        locked: false,
        selectionIndex: i % characterList.length,
        panel,
        label,
        stats
      });
    }

    this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT - 80,
        'Move to select. Attack to lock. Special to start (P1).',
        {
          fontSize: '16px',
          color: '#9aa4ff'
        }
      )
      .setOrigin(0.5);

    this.updateSlotDisplays();
  }

  update() {
    this.slots.forEach((slot) => {
      const input = this.inputManager.getState(slot.playerId);

      if (!slot.active) {
        if (input.attackPressed) {
          slot.active = true;
        } else {
          return;
        }
      }

      if (slot.locked) {
        if (input.specialPressed) {
          slot.locked = false;
        }
        return;
      }

      if (input.leftPressed) {
        slot.selectionIndex = (slot.selectionIndex - 1 + characterList.length) %
          characterList.length;
      }
      if (input.rightPressed) {
        slot.selectionIndex = (slot.selectionIndex + 1) % characterList.length;
      }
      if (input.attackPressed) {
        slot.locked = true;
      }

      this.updateSlotDisplay(slot);
    });

    const readyPlayers = this.slots.filter((slot) => slot.active && slot.locked);
    const inputP1 = this.inputManager.getState(1);
    if (readyPlayers.length >= 2 && inputP1.specialPressed) {
      const selections: PlayerSelection[] = readyPlayers.map((slot, index) => ({
        playerId: slot.playerId,
        characterId: characterList[slot.selectionIndex].id,
        color: PLAYER_COLORS[(slot.playerId - 1) % PLAYER_COLORS.length]
      }));
      this.registry.set('selections', selections);
      this.scene.start('Match');
    }
  }

  private updateSlotDisplays() {
    this.slots.forEach((slot) => this.updateSlotDisplay(slot));
  }

  private updateSlotDisplay(slot: SlotState) {
    if (!slot.active) {
      slot.label.setText(`P${slot.playerId}: Press Attack`);
      slot.stats.setText('');
      slot.panel.setAlpha(0.5);
      return;
    }

    const character = characterList[slot.selectionIndex];
    slot.label.setText(`P${slot.playerId}: ${character.displayName}${slot.locked ? ' ✓' : ''}`);
    slot.panel.setAlpha(1);

    slot.stats.setText(
      `Speed: ${character.stats.speed}\nJump: ${character.stats.jumpForce}\nWeight: ${character.stats.weight}`
    );
  }
}
