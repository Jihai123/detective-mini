import * as Phaser from 'phaser';

export function drawWorkbenchBackground(scene: Phaser.Scene): void {
  scene.cameras.main.setBackgroundColor('#05070f');
  const g = scene.add.graphics();
  g.fillGradientStyle(0x0a1120, 0x0a1120, 0x111827, 0x111827, 1);
  g.fillRect(0, 0, 1440, 900);
  g.fillStyle(0x0b1324, 0.9);
  g.fillRoundedRect(24, 18, 1392, 864, 18);
  g.lineStyle(2, 0x22314d, 0.9);
  g.strokeRoundedRect(24, 18, 1392, 864, 18);
}

export function drawPanel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, title: string): void {
  scene.add.rectangle(x + 4, y + 5, w, h, 0x010308, 0.35).setOrigin(0, 0);
  scene.add.rectangle(x, y, w, h, 0x10192c, 0.93).setOrigin(0, 0).setStrokeStyle(1, 0x334155);
  scene.add.text(x + 16, y + 12, title, {
    fontSize: '21px',
    color: '#e2e8f0',
    fontStyle: 'bold'
  });
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  color: number,
  onClick: () => void,
  disabled = false
): Phaser.GameObjects.Container {
  const box = scene.add.rectangle(0, 0, w, h, disabled ? 0x334155 : color, 1).setOrigin(0, 0).setStrokeStyle(1, 0x64748b);
  const text = scene.add.text(14, 10, label, {
    fontSize: '16px',
    color: disabled ? '#94a3b8' : '#f8fafc',
    fontStyle: 'bold'
  });

  const c = scene.add.container(x, y, [box, text]);
  if (!disabled) {
    box.setInteractive({ useHandCursor: true });
    box.on('pointerover', () => box.setFillStyle(Phaser.Display.Color.IntegerToColor(color).brighten(8).color));
    box.on('pointerout', () => box.setFillStyle(color));
    box.on('pointerdown', () => box.setFillStyle(Phaser.Display.Color.IntegerToColor(color).darken(12).color));
    box.on('pointerup', () => {
      box.setFillStyle(color);
      onClick();
    });
  }
  return c;
}

export function fadeInScene(scene: Phaser.Scene): void {
  scene.cameras.main.fadeIn(220, 0, 0, 0);
}
