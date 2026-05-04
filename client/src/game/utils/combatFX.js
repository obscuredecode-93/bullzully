/**
 * @fileoverview Shared visual feedback helpers for combat events.
 *
 * These three functions are imported by every enemy and boss file so the same
 * flash/shake/number logic isn't copy-pasted six times. Keeping them here also
 * makes it trivial to tune the feel game-wide (e.g., change the flash duration
 * for all enemies in one place).
 *
 * All functions are pure side-effects — they return nothing and never mutate
 * game state. They only create short-lived visual objects.
 *
 * @module utils/combatFX
 */

// ============================================================
// HIT FLASH
// ============================================================

/**
 * Briefly tints a sprite white to give visual confirmation of a successful hit.
 *
 * NOTE: Phaser tints are multiplicative — multiplying every colour channel by
 * 0xffffff (i.e., 1.0) leaves the original colours intact, so clearTint() after
 * the delay effectively "restores" the sprite to its normal appearance.
 *
 * @param {Phaser.Scene}                scene  - The active scene (needed for time.delayedCall).
 * @param {Phaser.GameObjects.Sprite}   sprite - The sprite to flash.
 */
export function flashWhite(scene, sprite) {
  // Guard: if the entity was destroyed in the same frame (e.g., overkill damage),
  // don't try to tint a dead sprite.
  if (!sprite?.active) return;

  sprite.setTint(0xffffff);

  // 100ms is long enough to be clearly visible at 60fps without lingering.
  scene.time.delayedCall(100, () => {
    // Check again inside the callback — the sprite may have died during those 100ms.
    if (sprite.active) sprite.clearTint();
  });
}

// ============================================================
// FLOATING DAMAGE NUMBERS
// ============================================================

/**
 * Spawns a damage number that floats upward and fades out above a hit target.
 *
 * Numbers are intentionally jittered by ±10px on the X axis so successive hits
 * don't stack directly on top of each other and remain individually readable.
 *
 * @param {Phaser.Scene} scene  - Active scene (provides add.text and tweens).
 * @param {number}       x     - World-space X of the hit point.
 * @param {number}       y     - World-space Y of the hit point (number spawns 16px above this).
 * @param {number}       damage - Raw damage value; displayed as Math.ceil to avoid "0.9" etc.
 * @param {boolean}      [bullz=false] - If true, renders larger in gold to signal a BULLZ-boosted hit.
 */
export function showDamageNumber(scene, x, y, damage, bullz = false) {
  // Don't spawn a number for zero-damage events (e.g., guarded hits on ZullbullyKnight).
  if (!damage || damage <= 0) return;

  const label = Math.ceil(damage).toString();

  const t = scene.add.text(
    // Horizontal jitter prevents stacking when rapid hits land in the same frame.
    x + Phaser.Math.Between(-10, 10),
    y - 16,
    label,
    {
      fontSize:        bullz ? '14px' : '10px',  // BULLZ hits are visually larger.
      color:           bullz ? '#ffcc00' : '#ffffff', // Gold for BULLZ, white for normal.
      fontFamily:      "'Press Start 2P'",
      stroke:          '#000000',
      strokeThickness: bullz ? 4 : 3, // Thicker outline on larger text for readability.
    }
  )
    .setDepth(30)   // Render above sprites (depth 8–10) and HUD elements (depth 15–25).
    .setOrigin(0.5);

  scene.tweens.add({
    targets:  t,
    y:        t.y - 48,  // Floats 48px upward over 800ms — clears the sprite head area.
    alpha:    0,
    duration: 800,
    ease:     'Power1',  // Decelerates toward the end so the number "hangs" briefly.
    onComplete: () => t.destroy(),
  });
}

// ============================================================
// DEATH SHAKE
// ============================================================

/**
 * Applies a sharp camera shake when an enemy dies.
 *
 * Intensity 0.015 / duration 200ms was chosen to feel decisive without being
 * disorienting. Boss deaths use their own stronger shakes (defined inline)
 * because they warrant a bigger reaction.
 *
 * @param {Phaser.Scene} scene - Active scene (provides cameras.main).
 */
export function shakeOnDeath(scene) {
  // 0.015 = sharp but not nauseating. Boss shakes go up to 0.02.
  scene.cameras.main.shake(200, 0.015);
}
