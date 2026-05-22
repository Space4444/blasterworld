class Player extends Controller {
  constructor(pack, trailTexture) {
    const {'controller': controlPack, 'body': bodyPack} = pack;

    const ID = controlPack['ID'];
    const name = controlPack['name'];
    const money = controlPack['money'];
    const seed = controlPack['seed'];

    super(ID, 1);

    Object.assign(this, {
      seed,
      name,
      alife: true,
      _money: money,
      destination: null,
      landing: false,
      takingOff: false,
      landed: false
    });

    if (this instanceof MyPlayer) {
      this.body = new MyShip(ID, bodyPack, this, seed, trailTexture);
    } else { 
      this.body = new JetSpaceShip(ID, bodyPack, this, seed, trailTexture);
    }

    this.nameText = new PIXI.Text(this.name, {fontSize: '14pt', fill: this instanceof MyPlayer ? 0xFFFFFF : 0xFFFF00});
    this.nameText.anchor.set(0.5);

    this.body.info.addChild(this.nameText);
    this.nameText.y = this.body.radius + 13;

    lBoard.add(this.name, this.money);

    Player.count++;
  }

  update() {
    if (this.landing) {
      this.land();
    }

    if (this.takingOff) {
      this.takeOff();
    }
  }

  collectItem(item) {
    Item.list[item['ID']].moveTo(this.body);
  }

  startLanding(orb) {
    this.orb = Orb.list[orb];
    this.landing = true;
    this.beginT = Date.now();
    this.beginX = this.body.x;
    this.beginY = this.body.y;
  }

  land() {
    const phase = (Date.now() - this.beginT) / 1000;

    if (phase >= 1) {
      this.stopLanding();
    } else {
      this.takeOnOff(phase);
      this.moveToOrb(phase);
    }
  }

  stopLanding() {
    this.landing = false;
    this.landed = true;
  }

  startTakingOff() {
    this.takingOff = true;
    this.beginT = Date.now();
    this.beginX = this.body.trueX = this.orb.x;
    this.beginY = this.body.trueY = this.orb.y;
  }

  takeOff() {
    const phase = (Date.now() - this.beginT) / 1000;
    
    if (phase >= 1) {
      this.stopTakingOff();
    } else {
      this.takeOnOff(1 - phase);
    }
  }

  stopTakingOff() {
    this.destination = null;
    this.orb = null;
    this.takingOff = false;
    this.landed = false;
    this.body.sprite.alpha = 1;
    this.body.sprite.scale.x = this.body.sprite.scale.y = 1;
  }

  takeOnOff(phase) {
    this.body.sprite.alpha = 1 - phase;
    this.body.sprite.scale.x = this.body.sprite.scale.y = 1 - phase * (1 - this.orb.depth);
  }

  moveToOrb(phase) {
    const landX = ((this.orb.x + camera.x - halfW) * this.orb.depth) + halfW - camera.x;
    const landY = ((this.orb.y + camera.y - halfH) * this.orb.depth) + halfH - camera.y;

    this.body.x = this.beginX + (landX - this.beginX) * phase;
    this.body.y = this.beginY + (landY - this.beginY) * phase;
  }

  setLanded(orb) {
    if (orb) {
      this.orb = Orb.list[orb];
      this.body.sprite.alpha = 0;
      this.body.sprite.scale.x = this.body.sprite.scale.y = this.orb.depth;
    } else {
      this.orb = null;
      this.body.sprite.alpha = 1;
      this.body.sprite.scale.x = this.body.sprite.scale.y = 1;
    }
  }

  remove() {
    this.die();

    Player.count--;
  }
  
  die() {
    super.die();

    this.pressingAttack = false;
    this.alife = false;

    lBoard.del(this.name, this.money);
  }
  
  respawn(data) {
    this.alife = true;
    this.body.alife = true;

    lBoard.add(this.name, this.money);
    
    clearTimeout(this.syncHPTimeout);

    const ship = this.body;

    ship.reset();

    this.money = data['controller']['money'];
    
    ship.trueX = ship.x = ship.x1 = ship.x2 = data['body']['x'];
    ship.trueY = ship.y = ship.y1 = ship.y2 = data['body']['y'];
    
    GameBody.list[ship.ID] = ship;    
  }

  get money() {
    return this._money;
  }
  set money(value) {
    if (this.alife) {
      lBoard.update(this.name, this.money, value);
    }
    this._money = value;
  }

  static takeOff(data) {
    if (!data) {
        if (player.orb) player.startTakingOff();
        return;
    }

    var p = Player.list[data['player']['controller']['ID']];
    if (!p) {
      p = new Player(data['player'], images.player, images.playerBullet, images.trail, shipExp);
      p.setLanded(data['orb']);
    }

    if (!p.orb) {
      p.setLanded(data['orb']);
    }

    p.startTakingOff();
  }
}
Player.count = 0;
