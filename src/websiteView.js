const initWebsiteView = (engine, player) => {
  const optimalYMin = 0.25 * window.innerHeight;
  const optimalYMax = 0.75 * window.innerHeight;

  Matter.Events.on(engine, 'afterUpdate', () => {
    const currScrollY = window.scrollY;
    const playerY = player.position.y;
    if (playerY - currScrollY < optimalYMin) {
      const scrollY = player.position.y - optimalYMin;
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    } else if (playerY - currScrollY > optimalYMax) {
      const scrollY = player.position.y - optimalYMax;
      window.scrollTo({ top: scrollY, behavior: 'instant' });
    }
  });
};

export { initWebsiteView };
