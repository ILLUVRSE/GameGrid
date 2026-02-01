import Phaser from 'phaser';
import { characterRegistry } from '../game/content';
import { InputManager } from '../game/inputManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/physics';
import type { PlayerSelection } from '../game/types';

const PLAYER_COLORS = [0x4cc9f0, 0xf72585, 0x3a86ff, 0xffbe0b];
const STAT_LABELS = ['SPD', 'JMP', 'WGT'];

interface SlotState {
  playerId: number;
  active: boolean;
  locked: boolean;
  selectionIndex: number;
  panel: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  franchise: Phaser.GameObjects.Text;
  portrait: Phaser.GameObjects.Image;
  statBars: Phaser.GameObjects.Rectangle[];
  statLabels: Phaser.GameObjects.Text[];
}

export class CharacterSelectScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private slots: SlotState[] = [];
  private statMax = { speed: 1, jump: 1, weight: 1 };

  constructor() {
    super('CharacterSelect');
  }

  create() {
    this.inputManager = new InputManager(this);

    const characters = characterRegistry.getAllCharacters();
    if (characters.length === 0) {
      return;
    }

    this.statMax = characters.reduce(
      (acc, character) => ({
        speed: Math.max(acc.speed, character.stats.speed),
        jump: Math.max(acc.jump, character.stats.jump),
        weight: Math.max(acc.weight, character.stats.weight)
      }),
      this.statMax
    );

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
        .rectangle(x, 210, slotWidth, 230, 0x1a2035, 0.9)
        .setStrokeStyle(2, PLAYER_COLORS[i]);
      const label = this.add
        .text(x, 155, `P${i + 1}: Press Attack`, {
          fontSize: '16px',
          color: '#ffffff'
        })
        .setOrigin(0.5);
      const franchise = this.add
        .text(x, 178, '', {
          fontSize: '12px',
          color: '#9aa4ff'
        })
        .setOrigin(0.5);
      const portrait = this.add
        .image(x, 214, 'ui-portrait-default')
        .setDisplaySize(52, 52)
        .setOrigin(0.5);

      const statBars: Phaser.GameObjects.Rectangle[] = [];
      const statLabels: Phaser.GameObjects.Text[] = [];
      const barWidth = 90;
      const barHeight = 6;
      const barStartY = 248;

      STAT_LABELS.forEach((labelText, index) => {
        const y = barStartY + index * 18;
        const labelTextObj = this.add
          .text(x - barWidth / 2 - 18, y, labelText, {
            fontSize: '10px',
            color: '#c7cbff'
          })
          .setOrigin(0, 0.5);
        const background = this.add
          .rectangle(x, y, barWidth, barHeight, 0x2b3557)
          .setOrigin(0.5, 0.5);
        const fill = this.add
          .rectangle(x - barWidth / 2, y, barWidth, barHeight, PLAYER_COLORS[i])
          .setOrigin(0, 0.5);
        statLabels.push(labelTextObj);
        statBars.push(background, fill);
      });

      this.slots.push({
        playerId: i + 1,
        active: i < 2,
        locked: false,
        selectionIndex: i % characters.length,
        panel,
        label,
        franchise,
        portrait,
        statBars,
        statLabels
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

    this.events.once('shutdown', () => {
      this.inputManager?.destroy();
    });
  }

  update() {
    const characters = characterRegistry.getAllCharacters();
    if (characters.length === 0) {
      return;
    }

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
        slot.selectionIndex = (slot.selectionIndex - 1 + characters.length) % characters.length;
      }
      if (input.rightPressed) {
        slot.selectionIndex = (slot.selectionIndex + 1) % characters.length;
      }
      if (input.attackPressed) {
        slot.locked = true;
      }

      this.updateSlotDisplay(slot);
    });

    const readyPlayers = this.slots.filter((slot) => slot.active && slot.locked);
    const inputP1 = this.inputManager.getState(1);
    if (readyPlayers.length >= 2 && inputP1.specialPressed) {
      const selections: PlayerSelection[] = readyPlayers.map((slot) => ({
        playerId: slot.playerId,
        characterId: characters[slot.selectionIndex].id,
        color: PLAYER_COLORS[(slot.playerId - 1) % PLAYER_COLORS.length]
      }));
      this.registry.set('selections', selections);
      this.scene.start('StageSelect');
    }
  }

  private updateSlotDisplays() {
    this.slots.forEach((slot) => this.updateSlotDisplay(slot));
  }

  private updateSlotDisplay(slot: SlotState) {
    const characters = characterRegistry.getAllCharacters();
    if (characters.length === 0) {
      return;
    }

    if (!slot.active) {
      slot.label.setText(`P${slot.playerId}: Press Attack`);
      slot.franchise.setText('');
      slot.portrait.setTexture('ui-portrait-default');
      slot.panel.setAlpha(0.5);
      slot.statBars.forEach((bar) => bar.setVisible(false));
      slot.statLabels.forEach((label) => label.setVisible(false));
      return;
    }

    const character = characters[slot.selectionIndex];
    slot.label.setText(`P${slot.playerId}: ${character.displayName}${slot.locked ? ' ✓' : ''}`);
    slot.franchise.setText(character.franchise);
    slot.portrait.setTexture(character.ui.portraitIcon);
    slot.panel.setAlpha(1);

    slot.statBars.forEach((bar) => bar.setVisible(true));
    slot.statLabels.forEach((label) => label.setVisible(true));

    const barWidth = 90;
    const speedRatio = character.stats.speed / this.statMax.speed;
    const jumpRatio = character.stats.jump / this.statMax.jump;
    const weightRatio = character.stats.weight / this.statMax.weight;
    const ratios = [speedRatio, jumpRatio, weightRatio];

    ratios.forEach((ratio, index) => {
      const fillBar = slot.statBars[index * 2 + 1];
      fillBar.setSize(barWidth * ratio, fillBar.height);
    });
  }
}
