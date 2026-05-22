class Player extends Controller {
  constructor(socket, name, money, orb=null) {
    super(socket.id, money);

    WebRTC.channels[socket.id] = {'send': () => {}, player: this}; //TODELETE

    Object.assign(this, {
      level: 1,
      body: new SpaceShip(socket.id, this, Orb.station.x, Orb.station.y, 0, 0),
      alife: true,
      angleSyncId: 0,
      authenticated: false,
      _money: money,
      name: name || 'guest',
      remoteReceived: false,
      socket: socket,
      u_ID: null,
      landed: false,
      orb,
      dataChanged: false,
      items: {
        inventory: [],
        crafting: [],
        result: [],
        hand: []
      },
      itemStates: {
        'weapons': [],
        'engines': [],
        'other': [],
        'inventory': [],
        'crafting': [],
        'result': [],
        'hand': []
      },
      visibleItems: {},
      visibleOthers: [],
      invisibleOthers: [],
      syncDataOthers: []
    });

    this.body.distToStation = 0;

    this.items.inventory.size = this.body.inventorySize;
    this.items.crafting.size = 9;
    this.items.result.size = 1;
    this.items.hand.size = 1;
  }

  update25() {
    super.update25();

    this.interactWithOthers();
  }

  update15() {
    super.update15();

    this.checkItems();
  }

  update2() {
    super.update2();

    this.updateVisibleLists();
  }

  update1() {
    super.update1();

    this.body.checkDistToStation();
  }

  buy(level) {
    if (this.seed + 1 === level) {
      this.socket.emit('changeShip', 'same');
      return;
    }
    if (!this.body.isEmpty) {
      this.socket.emit('changeShip', 'notEmpty');
      return;
    }

    this.seed = level - 1;

    this.body.setSlotCounts( SpaceShip.getSlotCounts(level) );

    this.body.setHP( SpaceShip.getMaxHP(level) );

    this.money -= SpaceShip.getPrice(level);

    io.emit('changeShip', {'ID': this.ID, 'level': level});
  }

  sell() {
    const item = this.items.hand[0];

    if (!item) {
      return;
    }

    this.delItem(0, this.items.hand, 'hand', item['amount']);
    this.money += Item.getPrice(item['type']) * item['amount'];
  }

  interactWithOthers() {
    for (var i = 0; i < this.visibleOthers.length; i++) {
      this.visibleOthers[i].interactWithPlayer(this);
    }
  }

  checkItems() {
    for (var i in this.visibleItems) {
      const item = this.visibleItems[i];
      if (this.body.getSqrDistance(item) < 25000) {
        this.collectItem(item);
        break;
      }
    }
  }

  updateVisibleLists() {
    const ship = this.body;

    for (var i = 0; i < this.visibleOthers.length; i++) {
      const body = this.visibleOthers[i].body;
      if (!body.isNear(ship)) {
        const other = this.visibleOthers.splice(i, 1)[0];
        this.invisibleOthers.push(other);
        this.syncDataOthers.splice(i, 1);

        //body.controller.onPlayerCome(this);
      }
    }
    for (var i = 0; i < this.invisibleOthers.length; i++) {
      const body = this.invisibleOthers[i].body;
      if (body.isNear(ship)) {
        const other = this.invisibleOthers.splice(i, 1)[0];
        this.visibleOthers.push(other);
        this.syncDataOthers.push(body.syncInfo);

        //body.controller.onPlayerRetreat(this);
      }
    }
  }

  initVisibleLists() {
    const ship = this.body;

    for (var i in GameBody.list) {
      const body = GameBody.list[i];
      if (body.isNear(ship)) {
        this.visibleOthers.push(body.controller);
        this.syncDataOthers.push(body.syncInfo);

        //body.controller.onPlayerCome(this);
      } else {
        this.invisibleOthers.push(body.controller);
      }
    }
  }

  clearVisibleLists() {
    this.visibleOthers = [];
    this.invisibleOthers = [];
    this.syncDataOthers = [];
  }

  authenticate(u_id) {
    if (!u_id) {
        this.initGuestInventory();
        this.emitInfo();
        this.land(this.orb);
        return;
    }

    this.authenticated = true;
    this.u_ID = u_id;

    var prevPlayer;
    for (var i in WebRTC.channels) {
        const p = WebRTC.channels[i].player;

        if (p !== this && p.u_ID === this.u_ID) {
            prevPlayer = p;
            p.socket.disconnect();
            break;
        }
    }

    this.load(prevPlayer);
  }

  land(orb, timeOut) {
    if (!orb) return;

    this.landed = true;
    setTimeout(() => Player.delFromLists(this.ID), timeOut);
    this.orb = orb;
    io.state.players[this.ID] = orb.ID;
    io.emit('land', {'player': this.ID, 'orb': orb.ID});
  }

  takeOff() {
    if (this.body.maxSpeed === 0) {
      return;
    }

    this.landed = false;
    this.body.x = this.orb.x;
    this.body.y = this.orb.y;
    Player.addToLists(this);
    io.emit('takeOff', {'player': this.allFirstInfo, 'orb': this.orb.ID});
    io.state.players[this.ID] = null;
    this.orb = null;
  }

  die() {
    super.die();
    this.alife = false;
    this.money = (this.money * 0.5) | 0;
    this.clearVisibleLists();
  }

  respawn() {
    const ship = this.body;

    this.alife = true;

    ship.reset();
    ship.x = Orb.station.x;
    ship.y = Orb.station.y;

    io.emit('respawned', this.allFirstInfo);

    Player.addToLists(this);
  }

  onInputMessage(channel, evt) {
    const data = JSON.parse(evt.data);

    if (data['type'] === 'ping') {
      channel.send(evt.data);
    } else if (+data['angle']) {
      this.body.targetAngle = (+data['angle']) % Math.TWO_PI;
    } else {
      this.body.targetAngle = null;
    }
  }

  collectItem(item) {

    //Ищем место в инвентаре, в которое положим предмет:
    for (var i = 0, j = -1, it, foundIt, len = this.body.inventorySize; i < len; i++) {
      it = this.items.inventory[i];
      if (it) {

        //Если нашлась ячейка, в которой есть точно такие же предметы, и их кол-во меньше максимального...
        if (item.type === it['type'] && it['amount'] < Item.getStackSize(it['type'])) {
          j = i;
          foundIt = it;
          break;
        }

       //Если нашлась первая пустая ячейка и мы еще ни разу не зашли в предыдущее (↑) условие...
      } else if (j === -1) {
        j = i;
      }
    }

    //Если в инвентаре есть свободное место, то добавляем предмет в найденную ранее ячейку:
    if (j !== -1) {
      item.collect();

      this.addItem(j, this.items.inventory, {'type': item.type, 'amount': 1}, 'inventory', 1);

      Item.checkEquipment(item.type);

      this.socket.emit('collect', {'player': this.ID, 'item': {'ID': item.ID, 'index': j} } );
      this.socket.broadcast.emit('collect', {'player': this.ID, 'item': {'ID': item.ID} } );
    }
  }

  moveItem({'start': start, 'end': end, 'startComp': startCompID, 'endComp': endCompID, 'amount': amount}) {
    const startComp = this.getCompartment(startCompID);
    const endComp = this.getCompartment(endCompID);

    if (!startComp || !endComp) return;

    const startCell = startComp[start];

    if (!startCell || (start === end && startCompID === endCompID) || start < 0 || end < 0
        || start >= startComp.size || end >= endComp.size || !Item.compatible(startCell['type'], endCompID)) {
      return;
    }

    const endCell = endComp[end];

    if (!endCell || startCell.type === endCell.type && endCell.amount < Item.getStackSize(endCell.type)) {
        if (!amount || amount < 0 || amount > startCell.amount) {
          return;
        }

        this.addItem(end, endComp, startCell, endCompID, amount);
        this.delItem(start, startComp, startCompID, amount);

    } else if ( Item.compatible(endCell['type'], startCompID) ) {
      this.swapItems(startComp, endComp, start, end, startCompID, endCompID);
    }
  }

  getCompartment(ID) {
    switch (ID) {
      case 'inventory': return this.items.inventory;
      case 'weapons': return this.body.weapons;
      case 'engines': return this.body.engines;
      case 'other': return this.body.other;
      case 'crafting': return this.items.crafting;
      case 'result': return this.items.result;
      case 'hand': return this.items.hand;
    }
  }

  addItem(index, compartment, item, compID, amount) {
    if (compID === 'engines' || compID === 'other' || compID === 'weapons') {
      this.body.setEquipment(compID, index, item);

      this.socket.broadcast.emit('updEquipmnt', {'ship': this.ID, 'compID': compID, 'index': index, 'item': item});
    }

    if (!compartment[index]) {
      this.changeItemState(compID, index, compartment[index] ? 'changed' : 'added');
      compartment[index] = {'type': item['type'], 'amount': amount || item['amount']};
    } else {
      compartment[index]['amount'] += amount;
      this.changeItemState(compID, index, 'changed');
    }
  }

  delItem(index, compartment, compID, amount) {
    if (compID === 'engines' || compID === 'other' || compID === 'weapons') {
      this.body.delEquipment(compID, index);

      this.socket.broadcast.emit('updEquipmnt', {'ship': this.ID, 'compID': compID, 'index': index, 'item': null});
    }

    const res = compartment[index]['amount'] - amount;
    if (!res) {
      delete compartment[index];
      this.changeItemState(compID, index, 'deleted');
    } else {
      compartment[index]['amount'] = res;
      this.changeItemState(compID, index, 'changed');
    }
  }

  swapItems(comp1, comp2, index1, index2, comp1ID, comp2ID) {
    const item1 = comp1[index1];
    const item2 = comp2[index2];

    this.delItem(index1, comp1, comp1ID, item1['amount']);
    this.delItem(index2, comp2, comp2ID, item2['amount']);
    this.addItem(index1, comp1, item2, comp1ID, item2['amount']);
    this.addItem(index2, comp2, item1, comp2ID, item1['amount']);
  }

  changeItemState(compId, index, state) {
    this.dataChanged = true;

    switch (state) {
      case 'added':
      if (this.itemStates[compId][index] === 'deleted') {
        this.itemStates[compId][index] = 'changed';
      } else {
        this.itemStates[compId][index] = 'added';
      }
      break;
      case 'changed':
      if (!this.itemStates[compId][index]) {
        this.itemStates[compId][index] = 'changed';
      }
      break;
      case 'deleted':
      if (this.itemStates[compId][index] === 'added') {
        delete this.itemStates[compId][index];  
      } else {
        this.itemStates[compId][index] = 'deleted';
      }
      break;
    }
  }

  initGuestInventory() {
    const engine = {'type': 3, 'amount': 1};
    const other = {'type': 4, 'amount': 1};
    this.body.setEquipment('engines', 0, engine);
    this.body.setEquipment('other', 0, other);
    this.body.weapons[0] = {'type': 2, 'amount': 1};
    this.body.engines[0] = engine;
    this.body.other[0] = other;

    this.body.setSlotCounts([1, 1, 1]);

    this.seed = 0;

    this.body.setHP( SpaceShip.getMaxHP(this.seed + 1) );
  }

  load(prevPlayer) {
    if (prevPlayer) {
      const checkIfSaving = setInterval(() => {
        if (!prevPlayer.saving) {
          clearInterval(checkIfSaving);
          this.doLoad();
        }
      }, 1000);
    } else {
      this.doLoad();
    }
  }

  doLoad() {
    var finished = 0;

    this.loadItems(() => { if (++finished === 2) { this.emitInfo(); this.land(this.orb); } } );
    this.loadInfo( () => { if (++finished === 2) { this.emitInfo(); this.land(this.orb); } } );
  }

  save() {
    if ( !(this.dataChanged && this.authenticated) ) return;

    this.saving = true; //it will be true all the time while player is saving

    var finished = 0;

    this.saveItems(() => { if (++finished === 2) { this.saving = null; } } );
    this.saveInfo( () => { if (++finished === 2) { this.saving = null; } } );
  }

  loadItems(endCallback) {
    endCallback = endCallback || (()=>{});

    DB.prepare('SELECT place, position, type, amount FROM items WHERE player = ?')
    .bind(this.u_ID)
    .raw()
    .then(res => {
        for (var i = 0, len = res.length; i < len; i++) {
            const row = res[i];
            const item = {
                'place': row[0],
                'position': row[1],
                'type': row[2],
                'amount': row[3]
            }
            const it = {'type': item['type'], 'amount': item['amount']};
            Item.checkEquipment(item['type']);

            switch (item['place']) {
                case 0: this.body.weapons[item['position']] = it; break;
                case 1:
                    this.body.setEquipment('engines', item['position'], it);
                    this.body.engines[item['position']] = it;
                    break;
                case 2:
                    this.body.setEquipment('other', item['position'], it);
                    this.body.other[item['position']] = it;
                    break;
                case 3: this.items.inventory[item['position']] = it; break;
                case 4: this.items.crafting[item['position']] = it; break;
                case 5: this.items.result[item['position']] = it; break;
                case 6: this.items.hand[item['position']] = it; break;
            }
        }

        endCallback();
    }).catch(err => {
        endCallback();
        console.error('loadItems error:', err);
    })
  }

  saveItems(endCallback) {
    endCallback = endCallback || (()=>{});

    const strings = {insertStr: '', deleteStr: '', updateTypeStr: '', updateAmountStr: ''};

    

    for (var i = 0, len = this.body.weapons.size; i < len; i++) {
      const item = this.body.weapons[i];
      const state = this.itemStates['weapons'][i];
      this.addToSqlString(strings, item, state, '0', i);
    }
    for (var i = 0, len = this.body.engines.size; i < len; i++) {
      const item = this.body.engines[i];
      const state = this.itemStates['engines'][i];
      this.addToSqlString(strings, item, state, '1', i);
    }
    for (var i = 0, len = this.body.other.size; i < len; i++) {
      const item = this.body.other[i];
      const state = this.itemStates['other'][i];
      this.addToSqlString(strings, item, state, '2', i);
    }
    for (var i = 0, len = this.items.inventory.size; i < len; i++) {
      const item = this.items.inventory[i];
      const state = this.itemStates['inventory'][i];
      this.addToSqlString(strings, item, state, '3', i);
    }
    for (var i = 0, len = this.items.crafting.size; i < len; i++) {
      const item = this.items.crafting[i];
      const state = this.itemStates['crafting'][i];
      this.addToSqlString(strings, item, state, '4', i);
    }
    for (var i = 0, len = this.items.result.size; i < len; i++) {
      const item = this.items.result[i];
      const state = this.itemStates['result'][i];
      this.addToSqlString(strings, item, state, '5', i);
    }
    for (var i = 0, len = this.items.hand.size; i < len; i++) {
      const item = this.items.hand[i];
      const state = this.itemStates['hand'][i];
      this.addToSqlString(strings, item, state, '6', i);
    }



    if (!strings.updateTypeStr.length && !strings.updateAmountStr.length && !strings.insertStr.length && !strings.deleteStr.length) {
      endCallback();
      return;
    }

    var finished = 0;

    if (strings.updateTypeStr.length || strings.updateAmountStr.length) {
        finished--;

        //console.log(strings.updateTypeStr + ' ' + strings.updateAmountStr);
        DB.prepare(`UPDATE items SET (type, amount) = 
                        (CASE (place, position) ${strings.updateTypeStr} ELSE type END, 
                        CASE (place, position) ${strings.updateAmountStr} ELSE amount END)
                        WHERE player = ?`)
        .bind(this.u_ID)
        .raw()
        .then(res => {
            if (++finished === 0) {
                endCallback();
            }
        }).catch(err => {
            if (++finished === 0) {
                endCallback();
            }
            console.error('saveItems UPDATE error:', err);
        });
    }

    if (strings.insertStr.length) {
        finished--;

        strings.insertStr = strings.insertStr.slice(1);//console.log(strings.insertStr);
        DB.prepare('INSERT INTO items(player, place, position, type, amount) VALUES' + strings.insertStr)
        .raw()
        .then(res => {
            if (++finished === 0) {
                endCallback();
            }
        }).catch(err => {
            if (++finished === 0) {
                endCallback();
            }
            console.error('saveItems INSERT error:', err);
        });
    }

    if (strings.deleteStr.length) {
        finished--;

        strings.deleteStr = strings.deleteStr.slice(1);//console.log(strings.deleteStr);

        DB.prepare('DELETE FROM items WHERE (player, place, position) IN (' + strings.deleteStr + ')')
        .raw()
        .then(res => {
            if (++finished === 0) {
                endCallback();
            }
        }).catch(err => {
            if (++finished === 0) {
                endCallback();
            }
            console.error('saveItems DELETE error:', err);
        });
    }
  }

  addToSqlString(strings, item, state, place, pos) {
    switch (state) {
      case 'added':
        strings.insertStr += `,('${this.u_ID}', ${place}, ${pos}, '${item.type}', ${item.amount})`;
        break;
      case 'deleted':
        strings.deleteStr += `,('${this.u_ID}', ${place}, ${pos})`;
        break;
      case 'changed':
        strings.updateTypeStr += `WHEN (${place}, ${pos}) THEN '${item.type}'`;
        strings.updateAmountStr += `WHEN (${place}, ${pos}) THEN '${item.amount}'`;
        break;
    }
  }

  loadInfo(endCallback) {
    endCallback = endCallback || (()=>{});

    DB.prepare('SELECT money, orb, ship FROM players WHERE p_id = ?')
    .bind(this.u_ID)
    .raw()
    .then(res => {
        var row = res[0];
        row = {
            'money': row[0],
            'orb': row[1],
            'ship': row[2]
        }

        this.money = row['money']; // cheat line
        if (!this.orb) this.orb = Orb.list[row['orb']];

        const ship = row['ship'].split('|');
        this.seed = +ship[0];
        this.body.setSlotCounts( ship.slice(1) );

        this.body.setHP( SpaceShip.getMaxHP(this.seed + 1) );

        endCallback();
    }).catch(err => {
        endCallback();
        console.error('loadInfo error:', err);
    });
  }

  saveInfo(endCallback) {
    endCallback = endCallback || (()=>{});

    const shipInfo = [this.seed, this.body.weapons.size, this.body.engines.size, this.body.other.size].join('|');
    DB.prepare('UPDATE players SET (money, orb, ship) = (?, ?, ?) WHERE p_id = ?')
    .bind(this.money, this.orb && this.orb.ID || null, shipInfo, this.u_ID)
    .raw()
    .then(res => {
        endCallback();
    }).catch(err => {
        endCallback();
        console.error('saveInfo error:', err);
    });
  }

  emitInfo() {
    const playerData = this.allFirstInfo;

    Player.addSocketListeners(this.socket);

    this.socket.emit('init', {
      'allInfo': Controller.info,
      'items': Item.info,
      'myID': this.ID,
      'myItems': {
        'inventory': this.items.inventory,
        'crafting': this.items.crafting,
        'result': this.items.result,
        'hand': this.items.hand
      }
    });
    this.socket.broadcast.emit('playerJoined', playerData);
  }

  craft() {
    if (this.items.result[0]) {
      return;
    }

    var crafting = 0;
    
    const levels = {};

    for (var i = 0, len = this.items.crafting.size; i < len; i++) {
      const item = this.items.crafting[i];
      
      if (item) {
        const category = Item.getCategory(item['type']);

        crafting += item['amount'];
       
        if (category in levels) {
          levels[category].level += item['amount'] * Item.getLevel(item['type']);
          levels[category].amount += item['amount'];
        } else {
          levels[category] = {
            level: Item.getLevel(item['type']),
            amount: item['amount'],
            subcategory: Item.getSubCategory(item['type'])
          };
        }
      }
    }

    if (crafting < 2) {
      return;
    }

    var level = Math.max( ...Object.values(levels).map(value => value.level) );

    //result item category index
    const category = Object.keys(levels).find(key => levels[key].level === level);

    //result item subcategory
    const subcategory = levels[category].subcategory;

    //result level
    level /= 1 + (levels[category].amount - 1) * 0.5;
    level = Math.round(level);

    //result item  stats
    const stats = {};
    for (let i = 0, len = this.items.crafting.size; i < len; i++) {
      const item = this.items.crafting[i];

      if (item) {
        if (Item.getCategory(item['type']) === category) {
          const stats1 = Item.getStats(item['type']);

          for (let j in stats1) {
            if (j in stats) {
              stats[j] += stats1[j];
            } else {
              stats[j] = stats1[j];
            }
          }
        }
        
        this.delItem(i, this.items.crafting, 'crafting', item['amount']);
      }
    }
    for (let i in stats) {
      stats[i] /= 1 + (levels[category].amount - 1) * 0.8;
      stats[i] = +stats[i].toFixed(2);
    }

    if (category == 'engine' && stats['spd'] > 50) {
        stats['spd'] = 50;
    }

    const ID = Item.createID(category, subcategory, level, stats);
    const item = {'type': ID, 'amount': 1};

    this.addItem(0, this.items.result, item, 'result', 1);

    switch (category) {
      case 'weapon': Weapon.check(ID); break;
      case 'engine': Engine.check(ID); break;
      case 'other': Other.check(ID); break;
    }

    this.socket.emit('crafted', item);
  }

  get firstInfo() {
    return this.info;
  }

  get info() {
    return {
      'ID': this.ID,
      'seed': this.seed,
      'name': this.name,
      'money': this.money
    };
  }

  get money() {
    return this._money;
  }

  set money(value) {
    this._money = value;
    this.dataChanged = true;
  }

  static addToVisibleLists(newBody) {
    for (var i in Player.list) {
      const player = Player.list[i];

      if (i === newBody.ID) {
        continue;
      }

      if (newBody.isNear(player.body)) {
        player.visibleOthers.push(newBody.controller);
        player.syncDataOthers.push(newBody.syncInfo);

        //newBody.controller.onPlayerCome(player);
      } else {
        player.invisibleOthers.push(newBody.controller);
      }
    }
  }

  static delFromVisibleLists(deadBody) {
    for (var i in Player.list) {
      const player = Player.list[i];

      if(i === deadBody.ID) {
        continue;
      }

      var index;

      if ((index = player.visibleOthers.indexOf(deadBody.controller)) > -1) {
        player.visibleOthers.splice(index, 1);
        player.syncDataOthers.splice(index, 1);

        //deadBody.controller.onPlayerRetreat(player);
      } else if ((index = player.invisibleOthers.indexOf(deadBody.controller)) > -1) {
        player.invisibleOthers.splice(index, 1);
      }
    }
  }

  static onReconnect(socket, data) {//console.log('connected',socket.id);
    const orb = Orb.list[io.state.players[socket.id]];

    const player = Player.create(socket, data, orb);

    if (!orb) {
        socket.emit('takeOff');
    }
  }

  static onConnect(socket, data) {//console.log('connected',socket.id);
    socket.once('ready', () => Player.create(socket, data) );

    socket.emit('seed', seed);
  }

  static create(socket, data, orb=null) {
    const ID = socket.id, player = new Player(socket, data['name'], 0, orb);
    new WebRTC(socket, player);

    player.initVisibleLists();
    // Player.addToVisibleLists(player.body);

    player.authenticate(data['u_id'], socket);

    return player;
  }

  static addSocketListeners(socket) {
    const ID = socket.id, player = Player.list[socket.id], ship = player.body;

    socket.on('hit', data => {
      const target = GameBody.list[data['target']];
      if (!target) {
        return;
      }

      const bullData = data['bullet'].split('|');
      const weaponIndex = bullData[0] + '|';
      const sendedBullID = +bullData[1];

      for (var i = 0; i !== 5; ((i *= -1) >= 0) && i++) {
        const bullID = weaponIndex + (sendedBullID + i);

        if ( !(bullID in ship.bullets) ) {
          continue;
        }

        const bullet = ship.bullets[bullID];

        const [x, y] = bullet.position;

        if (Math.abs(x - target.x) > 256 && Math.abs(y - target.y) > 256) {
          continue;
        }

        socket.broadcast.emit('hitInfo', {
          'ship': ID,
          'bullet': data['bullet'],
          'target': data['target']
        });

        if ( target.hit(bullet.damage) ) {
          player.money += target.controller.money;

          io.emit('money', { 
            'money': player.money,
            'ID': ID
          });
        }

        delete ship.bullets[bullet.ID];

        break;
      }
    });

    socket.on('input', data => {
      switch(data['inputID']) {
        case 'left':
        ship.pressingLeft = !!data['state'];
        break;
        case 'right':
        ship.pressingRight = !!data['state'];
        break;
        case 'up':
        ship.pressingUp = !!data['state'];
        break;
        case 'down':
        ship.pressingDown = !!data['state'];
        break;
        case 'fire':
        ship.pressingAttack = !!data['state'];
        break;
      }
      socket.broadcast.emit('input', {
        'ID': ID,
        'data': data
      });
    });

    socket.on('landing', data => {
      const orb = Orb.list[data];
      if (orb && !player.landed && ship.getSqrDistance(orb) < 10000) {
        player.land(orb, 1000);
        player.dataChanged = true;
      }
    });

    socket.on('takingOff', () => {
      if (player.landed) {
        player.takeOff();
        player.dataChanged = true;
      }
    });

    socket.on('moveItem', data => {
      if (player.orb === Orb.station) {
        player.moveItem(data);
      }
    });

    socket.on('craft', () => {
      if (player.orb === Orb.station) {
        player.craft();
      }
    });

    socket.on('buy', data => {
      if (player.orb === Orb.station && player.money >= SpaceShip.getPrice(data) ) {
        player.buy(data);
      }
    });

    socket.on('sell', () => {
      if (player.orb === Orb.station) {
        player.sell();
      }
    });

    socket.on('sendMsgToServer', data => {
      if (data.length) {
        const str = player.name + ': ' + data;
        io.emit('addToChat', str);
      }
    });

    socket.on('respawn', () => {
      if (!player.alife) {
        player.respawn();
      }
    });

    socket.on('pingg', data => {
      socket.emit('pongg', data);
    });
  }

  static addToLists(player) {
    Controller.list[player.ID] = player;
    Player.list[player.ID] = player;
    GameBody.list[player.ID] = player.body;

    player.initVisibleLists();
    Player.addToVisibleLists(player.body);
  }

  static delFromLists(ID) {
    const p = Player.list[ID];
    if (p) {
      p.clearVisibleLists();
      Player.delFromVisibleLists(p.body);
      delete Player.list[ID];
    }

    delete Controller.list[ID];
    delete GameBody.list[ID];
  }

  static onDisconnect(socket) {
    const channel = WebRTC.channels[socket.id];
    var p;

    if (channel) {
      p = channel.player;
      delete WebRTC.channels[socket.id];
    }

    p.save();

    Player.delFromLists(socket.id);

    if (p && p.pc) {
      p.pc.close();
    }
    socket.broadcast.emit('remove', socket.id);
  }
}
Player.list = {};
