class Item {
	constructor(type, ID, x, y) {
		this.ID = ID;
		this.x = x;
		this.y = y;
		this.type = type;

		Item.list[ID] = this;

		setTimeout(() => {
            this.collect();
            io.emit('collect', {'item': {'ID': this.ID} } );
        }, Item.LIFE_TIME);
	}

	collect() {
		const ID = this.ID;

		delete Item.list[ID];

		for (var i in Player.list) {
			const player = Player.list[i];

			if (player.visibleItems[ID]) {
				delete player.visibleItems[ID];
			}
		}
	}

	checkPlayers() {
		const ID = this.ID;

		for (var i in Player.list) {
			const player = Player.list[i], ship = player.body;

			if ( ship.isNear(this) ) {
				if (!player.visibleItems[ID]) {
					player.visibleItems[ID] = this;
				}
			} else if (player.visibleItems[ID]) {
				delete player.visibleItems[ID];
			}
		}
	}

	get info() {
		return {'type': this.type, 'ID': this.ID, 'x': this.x, 'y': this.y};
	}

	static get info() {
		const pack = [];

		for (var i in Item.list) {
			pack.push(Item.list[i].info);
		}

		return pack;
	}

	static checkPlayers() {
		for (var i in Item.list) {
			Item.list[i].checkPlayers();
		}
	}

	static getStackSize(ID) {
		if (ID in Item.catalog) {
			return Item.catalog[ID].stackSize;
		} else if ( Item.getCategory(ID) === 'material') {
			return 16;
		}

		return 1;
	}

	static compatible(ID, compartment) {
		if (compartment in Item.forAll) {
			return true;
		}

		if (Item.getSubCategory(ID) === 'element') {
			return false;
		}

		if (ID in Item.catalog) {
			for (var i = 0, len = Item.catalog[ID].compartments.length; i < len; i++) {
				if (Item.catalog[ID].compartments[i] === compartment) {
					return true;
				}
			}
		}

		switch ( Item.getCategory(ID) ) {
			case 'weapon': return compartment === 'weapons';
			case 'engine': return compartment === 'engines';
			case 'other': return compartment === 'other';
		}

		return false;
	}

	static getPrice(ID) {
		var k;
		switch ( Item.getCategory(ID) ) {
			case 'weapon':
			case 'engine':
			case 'other':
			k = 100;
			break;
			default: k = 10;
		}

		if (Item.getSubCategory(ID) === 'element') {
			k *= 0.5;
		}

		return Item.getLevel(ID) * k;
	}

	static getCategory(ID) {
		if (ID in Item.catalog) {
			return Item.catalog[ID].category;
		}

		return Item.categories[ ID.split('|')[0] ][0];
	}

	static getSubCategory(ID) {
		if (ID in Item.catalog) {
			return Item.catalog[ID].subcategory;
		}

		const data = ID.split('|');

		return Item.categories[ data[0] ][1][ data[1] ] || 'element';
	}

	static getLevel(ID) {
		if (ID in Item.catalog) {
			return Item.catalog[ID].level;
		}

		return +ID.split('|')[2];
	}

	static getStats(ID) {
		var values;

		if (ID in Item.catalog) {
			values = Item.catalog[ID].stats;
		} else {
			values = ID.split('|').slice(3);
		}

		if (values.length === 0) {
			return {};
		}

		const category = Item.getCategory(ID);
		const subcategory = Item.getSubCategory(ID);
		const keys = Item.stats[category][subcategory];

		return Object.assign( ...keys.map( (v, i) => ( { [v]: +values[i] } ) ) );
	}

	static createID(category, subcategory, level, stats) {
		const catID = Item.categories.findIndex( val => val[0] === category );
		var subcatID = Item.categories[catID][1].findIndex( val => val === subcategory );

		if (subcatID === -1) {
			subcatID = 0;
		}

		return [catID, subcatID, level].concat( Object.values(stats) ).join('|');
	}

	static checkEquipment(ID) {
		if (Item.getSubCategory(ID) === 'element') {
			return;
		}

		switch ( Item.getCategory(ID) ) {
			case 'weapon': Weapon.check(ID); break;
			case 'engine': Engine.check(ID); break;
			case 'other': Other.check(ID); break;
		}
	}

	static clearEquipment() {
		Item.clear(Weapon);
		Item.clear(Engine);
		Item.clear(Other);
	}

	static clear(Equipment) {
		eq: for (var ID in Equipment.catalog) {
			if (Equipment.catalog[ID] === Equipment.default) {
				continue;
			}

			var toDelete = true;
			const predicate = item => item && item['type'] === ID;
			
			for (var j in WebRTC.channels) {
				const player = WebRTC.channels[j].player, ship = player.body;

				if (
					player.items.inventory.find(predicate) ||
					player.items.crafting.find(predicate) ||
					player.items.result.find(predicate) ||
					player.items.hand.find(predicate) ||
					ship.weapons.find(predicate) ||
					ship.engines.find(predicate) ||
					ship.other.find(predicate) 
				) {
					toDelete = false;
					continue eq;
				}
			}

			for (var j in GameBody.list) {
				const ship = GameBody.list[j], cont = ship.controller;

				//We don`t need to check asteroids and players (we have already checked players above)
				if (!(ship instanceof SpaceShip) || (cont instanceof Player)) {
					continue;
				}

				if (
					ship.weapons.find(predicate) ||
					ship.engines.find(predicate) ||
					ship.other.find(predicate) 
				) {
					toDelete = false;
					continue eq;
				}
			}
			
			if (toDelete) {
				delete Equipment.catalog[ID];
			}
		}
	}

}
Item.LIFE_TIME = 1000 * 60 * 5;
Item.list = {};

Item.forAll = {
	'inventory': null,
	'crafting': null,
	'hand': null
};

Item.categories = [
['material', ['material']],
['weapon', ['moving-shot', 'instant-shot']],
['engine', ['engine']],
['other', ['repair bot']]
];

Item.stats = {
	'material': {
		'element': [],
		'material': []
	},
	'weapon': {
		'element': ['dmg', 'fireRate', 'bullSpd', 'bullLifeTime'],
		'moving-shot': ['dmg', 'fireRate', 'bullSpd', 'bullLifeTime'],
		'instant-shot': ['dmg', 'fireRate']
	},
	'engine': {
		'element': ['spd', 'accel', 'angAccel'],
		'engine': ['spd', 'accel', 'angAccel']
	},
	'other': {
		'element': ['repairSpd'],
		'repair bot': ['repairSpd']
	}
}

Item.catalog = [
	{//0 (metal)
		stackSize: 16,
		compartments: [],
		category: 'material',
		subcategory: 'element',
		level: 1,
		stats: []
	},
	{//1 (stone)
		stackSize: 16,
		compartments: [],
		category: 'material',
		subcategory: 'element',
		level: 1,
		stats: []
	},
	{//2 (laser gun)
		stackSize: 1,
		compartments: ['weapons'],
		category: 'weapon',
		subcategory: 'moving-shot',
		level: 1,
		stats: [15, 0.075, 15, 1500]
	},
	{//3 (plasma engine)
		stackSize: 1,
		compartments: ['engines'],
		category: 'engine',
		subcategory: 'engine',
		level: 1,
		stats: [15, 2, 0.04]
	},
	{//4 (repair bot)
		stackSize: 1,
		compartments: ['other'],
		category: 'other',
		subcategory: 'repair bot',
		level: 1,
		stats: [5]
	}
	];
