import Phaser from 'phaser';
import { stageRegistry } from '../game/content';
import { InputManager } from '../game/inputManager';
import { GAME_HEIGHT, GAME_WIDTH } from '../game/physics';
import type { StageData } from '../game/types';

export class StageSelectScene extends Phaser.Scene {
  private inputManager!: InputManager;
  private selectionIndex = 0;
  private stageNameText?: Phaser.GameObjects.Text;
  private stageHintText?: Phaser.GameObjects.Text;
  private previewPanels: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super('StageSelect');
  }

  create() {
    this.inputManager = new InputManager(this);

    const stages = stageRegistry.getAllStages();
    if (stages.length === 0) {
      return;
    }

    this.add
      .text(GAME_WIDTH / 2, 60, 'Stage Select', {
        fontSize: '34px',
        color: '#ffffff'
      })
      .setOrigin(0.5);

    this.stageNameText = this.add
      .text(GAME_WIDTH / 2, 140, stages[this.selectionIndex].displayName, {
        fontSize: '22px',
        color: '#cfd6ff'
      })
      .setOrigin(0.5);

    this.stageHintText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 80, 'Left/Right to choose. Attack to confirm. Special to go back.', {
        fontSize: '16px',
        color: '#9aa4ff'
      })
      .setOrigin(0.5);

    this.createPreviewPanels(stages);
    this.updatePreview(stages[this.selectionIndex]);

    this.events.once('shutdown', () => {
      this.inputManager?.destroy();
    });
  }

  update() {
    const stages = stageRegistry.getAllStages();
    if (stages.length === 0) {
      return;
    }

    const input = this.inputManager.getState(1);
    if (input.leftPressed) {
      this.selectionIndex = (this.selectionIndex - 1 + stages.length) % stages.length;
      this.updatePreview(stages[this.selectionIndex]);
    }
    if (input.rightPressed) {
      this.selectionIndex = (this.selectionIndex + 1) % stages.length;
      this.updatePreview(stages[this.selectionIndex]);
    }
    if (input.attackPressed) {
      const stage = stages[this.selectionIndex];
      this.registry.set('stageId', stage.id);
      this.scene.start('Match');
    }
    if (input.specialPressed) {
      this.scene.start('CharacterSelect');
    }
  }

  private createPreviewPanels(stages: StageData[]) {
    const panelWidth = 560;
    const panelHeight = 240;
    const panelX = GAME_WIDTH / 2;
    const panelY = 290;

    const base = this.add.rectangle(panelX, panelY, panelWidth, panelHeight, 0x0f1324);
    const overlay = this.add.rectangle(panelX, panelY, panelWidth - 40, panelHeight - 40, 0x182042);
    const platform = this.add.rectangle(panelX, panelY + 60, panelWidth - 140, 16, 0x1b2440);

    this.previewPanels = [base, overlay, platform];
    this.updatePreview(stages[this.selectionIndex]);
  }

  private updatePreview(stage: StageData) {
    this.stageNameText?.setText(stage.displayName);
    const colors = stage.backgroundLayers.map((layer) => layer.color);
    this.previewPanels.forEach((panel, index) => {
      const color = colors[index] ?? colors[colors.length - 1] ?? '#0f1324';
      panel.setFillStyle(Number.parseInt(color.replace('#', ''), 16));
    });
  }
}
