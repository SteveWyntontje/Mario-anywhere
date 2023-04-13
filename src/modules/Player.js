/* eslint-disable */
const STATE = {
  stand: 'stand',
  jump: 'jump',
  walk: 'walk',
  fall: 'fall',
  brake: 'brake',
};
class Player {
  isInTheAir = true;
  playerBody = null;
  playerSpriteBody = null;
  lastDir = 1;
  walkCycleIdx = 0;
  walkUpdateIdx = 0;
  walkUpdateEveryNth = 5;
  accelerationX = 0.25;
  maxSpeedX = 5;
  totalJumpForce = 0;
  maxJumpForce = 0.045; // will be set to negative in applyForceUp, but jump force is easier to reason about when it's all positive
  keyLeftIsDown = false;
  keyRightIsDown = false;
  keySpaceIsDown = false;
  keySpaceWasUpAfterJumpStart = false;

  constructor(engine, render, SPRITES) {
    this.engine = engine;
    this.render = render;
    this.walkCycleLength = SPRITES.walk.l.length;
    this.SPRITES = SPRITES;
    this.createBody();
    this.initCollisionDetection();
    this.initKeyboardControls();
    Matter.Events.on(engine, 'afterUpdate', () => {
      this.updateHandler();
    });
  }

  createPlayerSpriteBody(x, y, size) {
    const options = {
      label: 'playerShape',
      render: {
        sprite: {
          texture: this.SPRITES.stand.r,
          xScale: 1,
          yScale: 1,
        },
      },
    };
    const playerShape = Matter.Bodies.rectangle(x, y, size, size, options);
    return playerShape;
  }

  createFloorSensorBody(x, y, size) {
    // create floor sensor so we can distinguish between player standing on top
    // of something and just colliding with another shape
    const sensorW = size -4;
    const sensorH = 10;
    const sensorOptions = {
      label: 'floorSensor',
      render: {fillStyle: 'transparent' },
    };
    const floorSensorBody = Matter.Bodies.rectangle(x, y + size/2 - sensorH/2, sensorW, sensorH, sensorOptions);
    return floorSensorBody;
  }

  createBody() {
    const size = 32; // size of player sprite
    const x = this.render.options.width / 2 - 250;
    const y = size / 2 + 1; // ceiling ends at 0; put top of player at y=1
    this.playerSpriteBody = this.createPlayerSpriteBody(x, y, size);
    const floorSensorBody = this.createFloorSensorBody(x, y, size);

    this.playerBody = Matter.Body.create({
      label: 'player',
      parts: [this.playerSpriteBody, floorSensorBody],
      restitution: 0,
      friction: 0,
      frictionAir: 0, // frictionAir doesn't work so good for slowing down - better do set deceleration ourselves
      inertia: Infinity,
      mass: 1,
    })
    // console.log('this.playerBody:', this.playerBody);
  }

  // when activeCollision is happening, check if one of the collision pairs
  // is the player
  checkInTheAir(evt) {
    evt.pairs.forEach((pair) => {
      let ply;
      if (pair.bodyA.label === 'floorSensor') {
        ply = pair.bodyA;
      } else if (pair.bodyB.label === 'floorSensor') {
        ply = pair.bodyB;
      }
      if (ply) {
        // player is on the ground again
        this.removeActiveCollisionDetection();
        this.isInTheAir = false;
        // prevent any more force from being applied; otherwise, if you jump, keep
        // space down and hit a ceiling before maxForce is applied, force will still
        // be applied when player is already going down
        // totalJumpForce will be adjusted automatically at start of new jump
        this.totalJumpForce = this.maxJumpForce;
      }
    });
  }

  removeActiveCollisionDetection() {
    Matter.Events.off(this.engine, 'collisionActive');
  }

  addActiveCollisionDetection() {
    Matter.Events.on(this.engine, 'collisionActive', (evt) => {
      this.checkInTheAir(evt);
    });
  }

  initCollisionDetection() {
    this.addActiveCollisionDetection();
    Matter.Events.on(this.engine, 'collisionEnd', () => {
      this.isInTheAir = true;
      this.addActiveCollisionDetection();
    });
  }

  getXSpeed() {
    return Matter.Body.getVelocity(this.playerBody).x;
  }

  // set only x-vector of velocity vector; leave y-vector as is
  setXSpeed(xSpeed) {
    const ySpeed = Matter.Body.getVelocity(this.playerBody).y;
    Matter.Body.setVelocity(this.playerBody, { x: xSpeed, y: ySpeed });
  }

  applyForceUp(forceY) {
    const forceUp = -1 * forceY;
    const b = this.playerBody;
    Matter.Body.applyForce(b, { x: b.position.x, y: b.position.y }, { x: 0, y: forceUp });
  }

  jump() {
    // use collision
    // https://github.com/liabru/matter-js/issues/665

    if (!this.isInTheAir) {
      const forceY = 0.03; // will be made negative in applyForceUp
      this.applyForceUp(forceY);
      this.totalJumpForce = forceY;
      this.keySpaceWasUpAfterJumpStart = false;
    }
  }

  moveX(dir) {
    this.setXSpeed(10 * dir);
  }

  updateSpeedX() {
    let newSpeed = 0;
    const currSpeed = this.getXSpeed();

    if (this.keyLeftIsDown) {
      newSpeed = currSpeed - this.accelerationX;
      newSpeed = Math.max(newSpeed, -1 * this.maxSpeedX);
    } else if (this.keyRightIsDown) {
      newSpeed = currSpeed + this.accelerationX;
      newSpeed = Math.min(newSpeed, this.maxSpeedX);
    } else if (currSpeed < 0) {
      // no key pressed, slow down
      newSpeed = currSpeed + this.accelerationX;
      newSpeed = Math.min(newSpeed, 0);
    } else if (currSpeed > 0) {
      // no key pressed, slow down
      newSpeed = currSpeed - this.accelerationX;
      newSpeed = Math.max(newSpeed, 0);
    }

    this.setXSpeed(newSpeed);
    if (newSpeed !== 0) {
      // remember last direction for standing pose
      this.lastDir = newSpeed / Math.abs(newSpeed);
    }
  }

  updateForceY() {
    if (this.keySpaceIsDown && this.isInTheAir && !this.keySpaceWasUpAfterJumpStart) {
      // we need to check if key wasn't released after jump started,
      // otherwise you could re-apply force if max wasn't reached
      const applicableForceLeft = this.maxJumpForce - this.totalJumpForce;
      const forceIncrement = 0.0005;
      if (applicableForceLeft >= forceIncrement) {
        // using Math.min() led to problems with js inaccurate rounding
        // apply default extra force, unless less is left to reach max force
        // const forceIncrement = Math.min(0.001, applicableForceLeft);
        this.applyForceUp(forceIncrement);
        this.totalJumpForce += forceIncrement;
      }
    }
  }

  initKeyboardControls() {
    document.body.addEventListener('keydown', (evt) => {
      const keyCode = evt.code;
      switch (keyCode) {
        case 'Space':
          evt.preventDefault();
          this.keySpaceIsDown = true;
          this.jump();
          break;
        case 'ArrowLeft':
          this.keyLeftIsDown = true;
          break;
        case 'ArrowRight':
          this.keyRightIsDown = true;
          break;
      }
    });

    document.body.addEventListener('keyup', (evt) => {
      const keyCode = evt.code;
      switch (keyCode) {
        case 'Space':
          this.keySpaceIsDown = false;
          this.keySpaceWasUpAfterJumpStart = true;
          break;
        case 'ArrowLeft':
          this.keyLeftIsDown = false;
          break;
        case 'ArrowRight':
          this.keyRightIsDown = false;
          break;
      }
    });
  }

  getWalkTexture(xSpeed) {
    if (xSpeed > 0 && this.keyLeftIsDown) {
      return this.SPRITES.brake.l;
    } else if (xSpeed < 0 && this.keyRightIsDown) {
      return this.SPRITES.brake.r;
    }

    if (this.walkUpdateIdx === 0) {
      this.walkCycleIdx++;
      if (this.walkCycleIdx === this.walkCycleLength) {
        this.walkCycleIdx = 0;
      }
    }
    this.walkUpdateIdx++;
    if (this.walkUpdateIdx === this.walkUpdateEveryNth) {
      this.walkUpdateIdx = 0;
    }
    // xSpeed is never 0, because then we wouldn't be
    // within this function
    const dir = this.mapSpeedToLetter(xSpeed);
    return this.SPRITES.walk[dir][this.walkCycleIdx];
  }

  // map speed to direction letter for images
  mapSpeedToLetter(xSpeed) {
    return xSpeed < 0 ? 'l' : 'r';
  }

  setSprite(state, xSpeed) {
    const currTexture = this.playerSpriteBody.render.sprite.texture;
    let newTexture;
    const lastDirLetter = this.mapSpeedToLetter(this.lastDir);
    switch (state) {
      case STATE.stand:
        newTexture = this.SPRITES.stand[lastDirLetter];
        break;
      case STATE.jump:
        newTexture = this.SPRITES.jump[lastDirLetter];
        break;
      case STATE.fall:
        newTexture = this.SPRITES.fall;
        break;
      case STATE.walk:
        newTexture = this.getWalkTexture(xSpeed);
    }
    if (newTexture && newTexture !== currTexture) {
      this.playerSpriteBody.render.sprite.texture = newTexture;
    }
  }

  updateSprite() {
    const xSpeed = this.getXSpeed();
    if (this.isInTheAir) {
      this.setSprite(STATE.jump, xSpeed);
    } else if (xSpeed === 0) {
      this.setSprite(STATE.stand, xSpeed);
    } else {
      this.setSprite(STATE.walk, xSpeed);
    }
  }

  updateHandler() {
    this.updateSpeedX();
    this.updateForceY();
    this.updateSprite();
  }
}
