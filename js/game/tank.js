TankState = {
    WaitingTurn: 1,
    Moving: 2,
    Shooting: 3,
    WaitingCollision: 4
};

function Tank(game, spriteName, boozSpriteName, x, y, fuelSpriteName, fuelX, fuelY, maxFuel, fuelBurn, tankSpeed, groundMaterial, healthSpriteName, healthSpriteName2, playerIndex) {
    var that = this;

    //Init tank
    this.booz = game.add.sprite(x + 2, y, boozSpriteName);
    this.sprite = game.add.sprite(x, y, spriteName);

    game.physics.p2.enable(this.sprite);

    this.body = this.sprite.body;
    this.body.collideWorldBounds = true;
    this.body.fixedRotation = true;
    this.body.clearShapes();
    this.body.addCapsule(28, 8, 0, 0, Phaser.Math.degToRad(90));
    this.body.mass = 1;

    this.sprite.animations.add('left', [0, 1, 2, 3], 10, true);
    this.sprite.animations.add('right', [5, 6, 7, 8], 10, true);

    this.booz.anchor.setTo(0, 0.5);
    this.booz.scale.setTo(0.4, 0.5);

    this.decHealthPosX = 15;
    this.decHealthPosY = 25;

	this.healthSprite2 = game.add.sprite(x - this.decHealthPosX, y - this.decHealthPosY, healthSpriteName2);
    this.healthSprite2.visible = true;
    this.healthSprite2.scale.setTo(0.1, 0.09);
	
    this.healthSprite = game.add.sprite(x - this.decHealthPosX, y - this.decHealthPosY, healthSpriteName);
    this.healthSprite.visible = true;
    this.healthSprite.scale.setTo(0.1, 0.09);

    this.fuelSprite = game.add.sprite(fuelX, fuelY, fuelSpriteName);
    this.fuelSprite.fixedToCamera = true;
    this.fuelSprite.visible = false;

    this.fuelText = game.add.text(16, 16, 'Fuel', { fontSize: '32px', fill: 'red' });
    this.fuelText.fixedToCamera = true;
    this.fuelText.visible = false;

    this.material = game.physics.p2.createMaterial('playerMaterial', this.body);
    this.material.friction = 1;
    this.body.setMaterial(this.material);

    this.contactMaterial = game.physics.p2.createContactMaterial(groundMaterial, this.material);
    this.contactMaterial.frictionStiffness = 0.1;    // Stiffness of the resulting FrictionEquation that this ContactMaterial generate.
    this.contactMaterial.frictionRelaxation = 50000000000;     // Relaxation of the resulting FrictionEquation that this ContactMaterial generate.
    this.contactMaterial.surfaceVelocity = 0;        // Will add surface velocity to this material. If bodyA rests on top if bodyB, and the surface velocity is positive, bodyA will slide to the right.
    this.contactMaterial.friction = 0.9;     // Friction to use in the contact of these two materials.


    this.collisionGroup = game.physics.p2.createCollisionGroup();
    this.body.setCollisionGroup(this.collisionGroup);

    this.arrowKeys = game.input.keyboard.createCursorKeys();

    //Init values
    var originalFuelSpriteWidth = this.fuelSprite.width;
    this.currentFuel = this.maxFuel = maxFuel;
    this.fuelBurn = fuelBurn;
    this.speed = tankSpeed;
    this.state = TankState.WaitingTurn;
    this.turn = false;
    this.OnTurnEnd = null;


    // Setup a canvas to draw the trajectory on the screen
    this.trajectoryBmp = game.add.bitmapData(worldWidth, worldHeight);
    this.trajectoryBmp.context.fillStyle = 'rgb(255, 255, 255)';
    this.trajectoryBmp.context.strokeStyle = 'rgb(255, 255, 255)';
    game.add.image(0, 0, this.trajectoryBmp);


    //Methods
    this.DrawTrajectory = function () {
        var BULLET_SPEED = 900;

        // Clear the bitmap
        this.trajectoryBmp.context.clearRect(0, 0, worldWidth, worldHeight);

        // Set fill style to white
        this.trajectoryBmp.context.fillStyle = 'rgba(255, 255, 255, 0.5)';

        // Calculate a time offset. This offset is used to alter the starting
        // time of the draw loop so that the dots are offset a little bit each
        // frame. It gives the trajectory a "marching ants" style animation.
        var MARCH_SPEED = 20; // Smaller is faster
        this.timeOffset = this.timeOffset + 1 || 0;
        this.timeOffset = this.timeOffset % MARCH_SPEED;

        // Just a variable to make the trajectory match the actual track a little better.
        // The mismatch is probably due to rounding or the physics engine making approximations.
        var correctionFactor = 0.99;

        // Draw the trajectory
        // http://en.wikipedia.org/wiki/Trajectory_of_a_projectile#Angle_required_to_hit_coordinate_.28x.2Cy.29
        var theta = -this.booz.rotation;
        var x = 0, y = 0;
        for (var t = 0 + this.timeOffset / (1000 * MARCH_SPEED / 60) ; t < 0.5; t += 0.03) {
            x = BULLET_SPEED * t * Math.cos(theta) * correctionFactor;
            y = BULLET_SPEED * t * Math.sin(theta) * correctionFactor - 0.5 * 800 * t * t;
            this.trajectoryBmp.context.fillRect(x + this.booz.x, this.booz.y - y, 3, 3);
            if (y < -15) break;
        }

        this.trajectoryBmp.dirty = true;
    }

    this.TakeDamage = function (dmg){

        if (this.healthSprite.width <= 0)
            this.Destroy();
        else
            this.healthSprite.width -= dmg;
    };

    this.Destroy = function () {
        this.sprite.kill();
        this.booz.kill();
        this.healthSprite.kill();
		this.healthSprite2.kill();
        players[playerIndex].tanksArray.splice(players[playerIndex].tanksArray.indexOf(this), 1);
    };


    this.AttractCameraFocus = function () {
        game.camera.follow(null);  // Unfollow the target
        var tween = game.add.tween(game.camera).to({ x: this.sprite.x - (game.camera.width / 2), y: this.sprite.y - (game.camera.height / 2) }, 500, Phaser.Easing.Quadratic.InOut, true);
        tween.onComplete.add(function () {
            game.camera.follow(this.sprite);
        }, this);

    };

    this.Collides = function (collisionGroups) {
        this.body.collides(collisionGroups);
    };

    this.HasFuel = function () {
        return this.currentFuel > 0;
    };

    this.UpdateFuel = function (delta) {
        delta = delta || this.fuelBurn;

        this.currentFuel -= delta;
        this.fuelSprite.width = originalFuelSpriteWidth * (this.currentFuel / this.maxFuel);
    };

    this.MoveLeft = function (speed) {
        speed = speed || this.speed;

        this.UpdateFuel();
        this.body.moveLeft(speed);
        this.sprite.animations.play('left');
    };

    this.MoveRight = function (speed) {
        speed = speed || this.speed;

        this.UpdateFuel();
        this.body.moveRight(speed);
        this.sprite.animations.play('right');
    };

    this.Stop = function () {
        this.body.velocity.x = 0;
        this.sprite.animations.stop();
    };

    this.TransitionTo = function (state) {
        this.state = state;

        switch (this.state) {
            case TankState.WaitingTurn:
                this.trajectoryBmp.context.clearRect(0, 0, worldWidth, worldHeight);
                this.trajectoryBmp.context.fillStyle = 'rgba(255, 255, 255, 0.5)';
                this.trajectoryBmp.dirty = true;

                this.turn = false;
                if (this.OnTurnEnd)
                    this.OnTurnEnd();
                break;
            case TankState.Moving:
                this.fuelText.visible = true;
                this.fuelSprite.visible = true;
                this.AttractCameraFocus();
                this.currentFuel = this.maxFuel;
                this.fuelSprite.width = originalFuelSpriteWidth;
                instructionsText.text = "Move with arrow keys, Click to aim";
                break;
            case TankState.Shooting:
                this.fuelText.visible = false;
                this.fuelSprite.visible = false;
                this.Stop();
                instructionsText.text = "Aim with mouse, Click to shoot";
                break;
            case TankState.WaitingCollision:
                instructionsText.text = "PEW";
                break;
        };
    };


    var justClicked = false;
    game.input.onDown.add(handleClick, this);
    function handleClick() {
        if (!that.turn)
            return;
        justClicked = true;
    }

    this.Update = function () {
        var deltaTime = game.time.elapsedMS / 10;

        //Hack physics bugfix
        if (this.body.velocity.y < -400)
            this.body.velocity.y = 0;

        this.booz.x = this.sprite.x;
        this.booz.y = this.sprite.y;

        this.healthSprite.x = this.sprite.x - this.decHealthPosX;
        this.healthSprite.y = this.sprite.y - this.decHealthPosY;
		
		this.healthSprite2.x = this.sprite.x - this.decHealthPosX;
        this.healthSprite2.y = this.sprite.y - this.decHealthPosY;

        switch (this.state) {
            case TankState.WaitingTurn:
                if (this.turn)
                    this.TransitionTo(TankState.Moving);
                break;

            case TankState.Moving:
                //if (!this.HasFuel() || game.input.keyboard.isDown(Phaser.Keyboard.SPACEBAR))
                if (!this.HasFuel() || justClicked) {
                    justClicked = false;
                    this.TransitionTo(TankState.Shooting);
                }
                else if (this.arrowKeys.left.isDown)
                    this.MoveLeft();
                else if (this.arrowKeys.right.isDown)
                    this.MoveRight();
                else
                    this.Stop();
                break;

            case TankState.Shooting:
                this.DrawTrajectory();
                this.booz.rotation = game.physics.arcade.angleToPointer(this.booz);
                //if (game.input.mousePointer.isDown) {
                if (justClicked) {
                    justClicked = false;
                    musicFireSound.play();
                    var bullet = new Bullet(game, this.booz.x, this.booz.y, this.booz.rotation);
                    bullet.onExploded = function () {
                        console.log("Pew dinished", that);
                        that.TransitionTo(TankState.WaitingTurn);
                    };
                    this.TransitionTo(TankState.WaitingCollision);
                }
                break;

            case TankState.WaitingCollision:
                break;
        };
    };
}