const ldb    = window['ldb'];
ldb.set      = ldb['set'];
ldb.get      = ldb['get'];
const $      = window['$'];

const socket = window['io']();
socket.on('multilogin', () => {
    socket.reconnectAttempts = socket.maxReconnectAttempts;
});
const UDPsocket = socket;

const chat            = document.getElementById("chat");
const chatForm        = document.getElementById("chat-form");
const chatInput       = document.getElementById("chat-input");
const chatText        = document.getElementById("chat-text");
const explosions      = document.getElementById("explosions");
const lList           = document.getElementById("l-list");
const respawnButton   = document.getElementById("respawn-button");
const respawnDiv      = document.getElementById("respawn-div");
const sendButton      = document.getElementById("send-button");
const spaceDiv        = document.getElementById("space-div");
const landedDiv       = document.getElementById("landed-div");
const loading         = document.getElementById("loading");
const loadBar         = document.getElementById("loadBar");
const map             = document.getElementById("map").getContext("2d");

const lBoard = new LBoard();
const dataChannelSettings = {
  'input': {
    ordered: false,
    maxRetransmits: 0,
    ID: 3
  },
  'sync': {
   ordered: false,
   maxRetransmits: 0,
   ID: 4
 }
}

var w, h, halfW, halfH, camera, dt = 0.625, minimap = {draw: () => {}};
var player, ship, seed, synchronizing, syncTimeout, frame, rand;
var pt = Date.now(), mouseX = 1, mouseY = 1, tcpPing, syncPing = {value: 100}, inputPing = {value: 100}, halfPing = 50;
var syncID = 0, webRTC, syncChannel = {}, inputChannel = {send: () => {}};

const app = new PIXI.Application(10, 10);
const container = new PIXI.Container();
const background = new PIXI.Container();
const info = new PIXI.Container();
const shipContainer = new PIXI.projection.Container2d();
const stats = new PIXI.Text('', {fontSize: '12pt', fill: 0xFFFFFF});
info.addChild(stats);
app.stage.addChild(background);
app.stage.addChild(container);
app.stage.addChild(shipContainer);
app.stage.addChild(info);

// Add the render view object into the page
spaceDiv.appendChild(app.view);

onResize = () => {
  chat.width = innerHeight;
  w = innerWidth;
  h = innerHeight;
  halfW = w * 0.5;
  halfH = h * 0.5;
  
  app.renderer.resize(w, h);
  Interface.resize();
};
window.addEventListener('resize', onResize);
onResize();

const images = {
  player: PIXI.Texture.fromImage('client/ship.png'),
  playerBullet: PIXI.Texture.fromImage('client/laserShot.png'),
  trail: PIXI.Texture.fromImage('client/trail.png'),
  particle: PIXI.Texture.fromImage('client/particle.png'),
  star: PIXI.Texture.fromImage('client/star.png'),
  planet: PIXI.Texture.fromImage('client/planet.png'),
  LightMap: PIXI.Texture.fromImage('client/LightMap.png'),
  ShadowMap: PIXI.Texture.fromImage('client/ShadowMap.png'),
  spaceStation: PIXI.Texture.fromImage('client/spaceStation.png')
}
const shipExp = new Explosion(images.particle, Explosion.shipSettings);

//=========================================================================================================//
//=======================================<<<<<<  START POINT  >>>>>>=======================================//
//=========================================================================================================//
MyPlayer.addSocketListeners1(socket);
socket.on('connect', emitSignIn);

function emitSignIn() {
  const info = document.getElementById("data");
  
  const infoObject = JSON.parse(info.innerText);

  if (seed) {
    syncID = 0;
    infoObject.id = player.ID;
    socket.emit('reconnect', infoObject);
    return;
  }
  socket.emit('signIn', infoObject);
  
  if (!window.authenticated) {
    const note = document.createElement('div');
    document.body.appendChild(note);
    note.classList.add('note');
    note.title = note.alt = 'You can`t save progress if you are playing as guest';
  }
}

function onSyncMessage(event) {
  const data = JSON.parse(event.data);
  
  if(data['type'] === 'ping') {
    syncPing.check(data['data']);
    return;
  }
  if(data['ID'] <= syncID) {
    return;
  }
  syncID = data['ID'];

  for (var i = 0, len = data['data'].length; i < len; i++) {
    const pack = data['data'][i], ID = pack['ID'];

    GameBody.updateList(ID, pack, syncID);
  }

  GameBody.clearList(syncID);

  startSync();
}

function onInputMessage(event) {
  const data = JSON.parse(event.data);
  inputPing.check(data['data']);
}

function onConnectionEstablished() {
  syncChannel = window.webRTC.channels['sync'];
  inputChannel = window.webRTC.channels['input'];
  syncChannel.onmessage = onSyncMessage;
  inputChannel.onmessage = onInputMessage;

  syncPing = new Ping(ID => {
    syncChannel.send(JSON.stringify({'type': 'ping', 'data': ID}));
  });
  inputPing = new Ping(ID => {
    inputChannel.send(JSON.stringify({'type': 'ping', 'data': ID}));
  });
}

function startGame() {
  ship = player.body;
  camera = new Camera();
  $(window).focus(centerCamera);

  window.webRTC = new WebRTC(UDPsocket, onConnectionEstablished, dataChannelSettings);
  minimap = new Minimap(map);
  
  tcpPing = new Ping(ID => {
    socket.emit('pingg', ID);
    halfPing = tcpPing.value * 0.5;
  });

  Orb.station.loadInterface();

  pt = Date.now();
  app.ticker.add(mainLoop);

  document.onmousemove = event => {
    mouseX = event.clientX;
    mouseY = event.clientY;
  };
  
  document.onkeydown = event => {
    if (!player.alife) {
      return;
    }

    switch (event.keyCode) {
      case 68:
      case 39:
      if (!ship.pressingRight) {
        socket.emit('input', {'inputID': 'right', 'state': true});
        ship.pressingRight = true;
        player.startInputFromKeyboard();
      }
      break;
      case 83:
      case 40:
      if (!ship.pressingDown) {
        player.pressDown(true);
      }
      break;
      case 65:
      case 37:
      if (!ship.pressingLeft) {
        socket.emit('input', {'inputID': 'left', 'state': true});
        ship.pressingLeft = true;
        player.startInputFromKeyboard();
      }
      break;
      case 87:
      case 38:
      if (!ship.pressingUp) {
        player.pressUp(true);
      }
      break;
      case 32:
      if (!ship.pressingAttack) {
        player.pressAttack(true);
      }
      break;
    }
  };

  document.onkeyup = event => {
    if (!player.alife) {
      return;
    }

    switch (event.keyCode) {
      case 68:
      case 39:
      socket.emit('input', {'inputID': 'right', 'state': false});
      ship.pressingRight = false;
      player.startInputFromKeyboard();
      break;
      case 83:
      case 40:
      player.pressDown(false);
      break;
      case 65:
      case 37:
      socket.emit('input', {'inputID': 'left', 'state': false});
      ship.pressingLeft = false;
      player.startInputFromKeyboard();
      break;
      case 87:
      case 38:
      player.pressUp(false);
      break;
      case 32:
      player.pressAttack(false);
      break;
    }
  };
  
  document.onmousedown = event => {
    if (!player.alife) {
      return;
    }

    switch (event.button) {
      case 0:
      if (Orb.station.hover) {
        player.destination = Orb.station;
      } else {
        player.pressUp(true, event)
      }
      break;
      case 1:
      player.pressAttack(true);
      break;
      case 2:
      player.pressDown(true);
      break;
    }
  };

  document.onmouseup = event => {
    if (!player.alife) {
      return;
    }

    switch (event.button) {
      case 0:
      player.pressUp(false, event);
      break;
      case 1:
      player.pressAttack(false);
      break;
      case 2:
      player.pressDown(false);
      break;
    }
  };
}

function mainLoop() {
  const now = Date.now();
  dt = Math.min(21, (now - pt) * 0.025);
  pt = now;

  update();

  stats.text = 
  `  ${(25 / dt).toFixed()} fps
  sync ping:  ${syncPing.value.toFixed()} ms
  input ping:  ${inputPing.value.toFixed()} ms
  tcp ping: ${tcpPing.value.toFixed()} ms
  ${Player.count} player${(Player.count === 1 ? ' ' : 's ')}on the server
  money: $${player.money}`;
}

function update() {
  Item.update();
  Controller.update();
  Explosion.update();
  Orb.update();
  camera.update();
}

sendButton.onclick = chatForm.onsubmit = e => {
  e.preventDefault();
  if (chatInput.value.length === 0) {
    return;
  }

  if (chatInput.value[0] === '/') {
    evalServer( chatInput.value.slice(1) );
  } else {
    socket.emit('sendMsgToServer', chatInput.value);
  }

  $("#chat-text")['slideDown']();
  chatInput.value = '';
};

respawnButton.onclick = () => {
  socket.emit('respawn');
};

function startSync() {
  synchronizing = true;
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(stopSync, 67);
}

function stopSync() {
  synchronizing = false;
}

function centerCamera() {
  pt = Date.now();
  [ship.x, ship.y] = [ship.trueX, ship.trueY];
  camera.lookAt(ship);
}

function showSpaceUI() {
  spaceDiv.style.display = 'inline-block';
  landedDiv.style.display = 'none';
}

function showLandedUI() {
  landedDiv.style.display = 'inline-block';
  spaceDiv.style.display = 'none';
}

function evalServer(msg) {
  socket.emit('evalServer', msg);
}

Math.TWO_PI = Math.PI * 2;
Math.HALF_PI = Math.PI * 0.5;
Math.ang = d => {
  if (d > Math.PI) {
    d -= Math.TWO_PI;
  } else if (d < -Math.PI) {
    d += Math.TWO_PI;
  }
  return d;
}
String.prototype.replaceAll = function(search, replacement) {
    return this.replace(new RegExp(search, 'g'), replacement);
};