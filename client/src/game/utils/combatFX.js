/**
 * combatFX — shared visual helpers for hit feedback.
 * Imported by enemy/boss entities so the same code isn't duplicated 6 times.
 */

/** White flash on the sprite for 100ms, then restores to no tint. */
export function flashWhite(scene, sprite) {
  if (!sprite?.active) return;
  sprite.setTint(0xffffff);
  scene.time.delayedCall(100, () => { if (sprite.active) sprite.clearTint(); });
}

/**
 * Floating damage number.
 * @param {boolean} bullz - if true, renders larger in gold (BULLZ-boosted hit)
 */
export function showDamageNumber(scene, x, y, damage, bullz = false) {
  if (!damage || damage <= 0) return;
  const label = Math.ceil(damage).toString();
  const t = scene.add.text(
    x + Phaser.Math.Between(-10, 10),
    y - 16,
    label,
    {
      fontSize: bullz ? '14px' : '10px',
      color: bullz ? '#ffcc00' : '#ffffff',
      fontFamily: "'Press Start 2P'",
      stroke: '#000000',
      strokeThickness: bullz ? 4 : 3,
    }
  ).setDepth(30).setOrigin(0.5);

  scene.tweens.add({
    targets: t,
    y: t.y - 48,
    alpha: 0,
    duration: 800,
    ease: 'Power1',
    onComplete: () => t.destroy(),
  });
}

/** Camera shake when an enemy dies. */
export function shakeOnDeath(scene) {
  scene.cameras.main.shake(200, 0.015);
}
