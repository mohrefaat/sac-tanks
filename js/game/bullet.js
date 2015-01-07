function Bullet(game, x, y, rotation, damage, speed)
{
    var that = this;
    this.speed = speed || 900;
    this.damage = damage || 5;

    this.sprite = null;//bulletPool.getFirstDead(); //Optimize me later in another life

    if (this.sprite === null || this.sprite === undefined)
    {
        this.sprite = game.add.sprite(x, y, 'bullet');

        bulletPool.add(this.sprite);

        this.sprite.anchor.setTo(0.5, 0.5);
        this.sprite.scale.setTo(0.5, 0.5);
        game.physics.p2.enable(this.sprite);
        this.sprite.body.setCollisionGroup(bulletsCG);

    }
    else
    {
        this.sprite.revive();
        this.sprite.reset(x, y);
    }

    this.body = this.sprite.body;

    //launch bullet
    this.sprite.rotation = rotation;
    this.body.velocity.x = Math.cos(this.sprite.rotation) * this.speed;
    this.body.velocity.y = Math.sin(this.sprite.rotation) * this.speed;

    game.camera.follow(this.sprite);


    //members
    this.onExploded = null;
    

    //Methods
    this.CollisionWithTank = function (tank) {
        return Phaser.Circle.intersectsRectangle(new Phaser.Circle(this.sprite.x, this.sprite.y, explosionRadius * 6), new Phaser.Rectangle(tank.x - tank.width / 2, tank.y - tank.height / 2, tank.width, tank.height));
    };

    this.collided = false;
    console.log(this.collided);
    this.Collided = function()
    {
        if (that.collided)
            return;
        that.collided = true;
        that.sprite.kill();

        var explosion = game.add.sprite(that.sprite.x, that.sprite.y, 'explosion');
        explosion.anchor.setTo(0.5, 0.5);

        var animation = explosion.animations.add('boom', [0, 1, 2, 3], 60, false);

        var groundParticles = game.add.emitter(that.sprite.x, that.sprite.y);
        groundParticles.bounce.setTo(0.5, 0.5);
        //groundParticles.setXSpeed(0, 0);
        //groundParticles.setYSpeed(-50, -100);

        groundParticles.minParticleSpeed.setTo(-150, -250);
        groundParticles.maxParticleSpeed.setTo(150, -350);

        groundParticles.makeParticles('sand', 0, 250, 1, true);
        groundParticles.gravity = 1000;

        groundParticles.start(false, 500, 20);
        setTimeout(function () {
            groundParticles.on = false;
        }, 200);

        explosion.events.onAnimationComplete.addOnce(function () {
            musicBombSound.play();


            map = ApplyExplosion(map, explosionRadius, explosionAccuracy, { x: that.sprite.x, y: that.sprite.y - 20 });
            UpdateGround();
            explosion.kill();

            //Apply damage on tanks in radius
            for (var j = 0; j < players.length; j++)
                for (var i = 0; i < players[j].tanksArray.length; i++)
                    if (that.CollisionWithTank(players[j].tanksArray[i].sprite))
                        players[j].tanksArray[i].TakeDamage(that.damage);
            

            setTimeout(function () {
                groundParticles.destroy();
                if (that.onExploded)
                    that.onExploded();
            }, 800);
        });

        animation.play();
    }

    this.sprite.body.collides(groundCG, this.Collided);


}