import type Phaser from 'phaser';
import { HUD_CONFIG, GAME_WIDTH } from './physics';
import type { PlayerSelection } from './types';

export class MatchHud {
  private scene: Phaser.Scene;
  private texts: Phaser.GameObjects.Text[] = [];
  private stockIcons: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene, selections: PlayerSelection[]) {
    this.scene = scene;
    this.createHud(selections);
  }

  private createHud(selections: PlayerSelection[]) {
    const spacing = GAME_WIDTH / selections.length;
    selections.forEach((selection, index) => {
      const x = spacing * index + spacing * 0.5;
      const label = this.scene.add
        .text(x, HUD_CONFIG.topMargin, `P${selection.playerId}: 0%`, {
          fontSize: '18px',
          color: '#ffffff'
        })
        .setOrigin(0.5, 0);
      this.texts.push(label);

      for (let i = 0; i < 3; i += 1) {
        const icon = this.scene.add
          .rectangle(
            x - 24 + i * HUD_CONFIG.itemSpacing,
            HUD_CONFIG.topMargin + 26,
            10,
            10,
            selection.color
          )
          .setOrigin(0.5, 0);
        this.stockIcons.push(icon);
      }
    });
  }

  updateDamage(index: number, damage: number) {
    const label = this.texts[index];
    if (!label) {
      return;
    }
    label.setText(`${label.text.split(':')[0]}: ${Math.round(damage)}%`);
  }

  updateStocks(playerIndex: number, stocks: number) {
    const start = playerIndex * 3;
    for (let i = 0; i < 3; i += 1) {
      const icon = this.stockIcons[start + i];
      if (icon) {
        icon.setVisible(i < stocks);
      }
    }
  }
}
