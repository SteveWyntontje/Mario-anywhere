/* eslint-disable */
// couple page scrolling behavior to player
class PageScrollCoupling {
  constructor(Matter, engine) {
    this.player = null;
    const optimalYMin = 0.25 * window.innerHeight;
    const optimalYMax = 0.75 * window.innerHeight;

    Matter.Events.on(engine, 'afterUpdate', () => {
      if (this.player) {
        const currScrollY = window.scrollY;
        const playerY = this.player.position.y;
        if (playerY - currScrollY < optimalYMin) {
          const scrollY = this.player.position.y - optimalYMin;
          window.scrollTo({ top: scrollY, behavior: 'instant' });
        } else if (playerY - currScrollY > optimalYMax) {
          const scrollY = this.player.position.y - optimalYMax;
          window.scrollTo({ top: scrollY, behavior: 'instant' });
        }
      }
    });
  }

  setPlayer(player) {
    this.player = player;
  }
}
