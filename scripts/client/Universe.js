class Universe {
	static start() {
		Uint8ClampedArray.prototype.setPixel = function(pos, r, g, b, a) {
            pos *= 4;
            this[pos    ] = r;
		    this[pos + 1] = g;
		    this[pos + 2] = b;
		    this[pos + 3] = a;
		}
		Uint8ClampedArray.prototype.getPixel = function(pos) {
            pos *= 4;

            return {
	            r: this[pos    ],
			    g: this[pos + 1],
			    b: this[pos + 2],
			    a: this[pos + 3]
			};
		}

		Universe.orbCount = rand.next(3, 5);

        Orb.station = new SpaceStation(images.spaceStation, null, rand.next(Math.TWO_PI), rand.next() > 0.5 ? 1 : -1, 1000);

        var mainPlanet;
		for (var i = 1; i < Universe.orbCount; i++) {
			const planet = new Planet(images.planet, {x: 0, y: 0}, rand.next(Math.TWO_PI), rand.next() > 0.5 ? 1 : -1, i * 5000);

            if (i === 1) {
                mainPlanet = planet;
            }
		}

        Orb.station.parent = mainPlanet;

        delete Orb.list[Orb.station.ID];        // it is necessary because we need to make station update
        Orb.list[Orb.station.ID] = Orb.station; // after it`s parent in the for-in loop in the Orb.update method

        Orb.star = new Star(images.star);
        
        for (var i in Orb.list) {
            if (Orb.list[i] instanceof Planet) {
                Orb.list[i].parent = Orb.star;
            }
        }

		Universe.orbCount = (Universe.orbCount + 2) | 0;

		ldb.get('seed', value => {
			if (value === seed) {
                Universe.loadStep = 1 / (Universe.orbCount + 2);
				Universe.load();
			} else {
                Universe.loadStep = 1 / (Universe.orbCount + 4);
                Universe.clearOldData(Universe.generate);
			}
		});
	}

    static clearOldData(callback) {
        const dBOpenRequest = window.indexedDB.open('d2', 1);

        dBOpenRequest.onsuccess = event => {
            const db = dBOpenRequest.result;
            db.transaction('s', 'readwrite').objectStore('s').clear();

            callback();
        };
    }

	static async load() {
		Universe.loadBackground();
        await Universe.progress();

        Universe.loadForeground();
        await Universe.progress();

		for (var i in Orb.list) {
			Orb.list[i].load();
            await Universe.progress();
		}

        Universe.endLoad();
	}

	static async generate() {
        ldb.set('_s_0', 'client/ship.png');

		await Universe.generateBackground()
        .then(Universe.generateForeground)
        .then(Orb.generate);

		ldb.set('seed', seed);

        Universe.endLoad();
	}

	static loadBackground() {
		ldb.get('background', dataUri => {
			Universe.setTexture(dataUri);
		});
	}

    static loadForeground(index) {
        index = index || 0;

        ldb.get('foreground' + index, dataUri => {
            if (index + 1 < Universe.FOREGROUND_COUNT) {
                Universe.loadForeground(index + 1);
            }

            Universe.setForegroundTexture( LZString.decompress(dataUri) );
        });
    }

	static generateBackground() {
        return new Promise( (resolve, reject) => {
            setTimeout(() => {
        		const [width, height] = Universe.backgroundUniforms['size'];
        		
                Universe.createTexture(width)
                .then(buffer => {

            		// create off-screen canvas element
            		const canvas = document.createElement('canvas');
            		const ctx = canvas.getContext('2d');

            		canvas.width = width;
            		canvas.height = height;

            		// create imageData object
            		const idata = ctx.createImageData(width, height);

            		// set our buffer as source
            		idata.data.set(buffer);

            		// update canvas with new data
            		ctx.putImageData(idata, 0, 0);

            		const dataUri = canvas.toDataURL(); // produces a PNG file

            		Universe.setTexture(dataUri);

            		ldb.set('background', dataUri);

                    resolve();
                });
            }, 0);
        });
	}

    static generateForeground(index) {
        return new Promise( (resolve, reject) => {
            setTimeout(async () => {
                index = index || 0;

                const size = 2048;
                
                const canvas  = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = size;
                canvas.height = size;
                
                Universe.createForeground(size, ctx, index);

                const dataUri = canvas.toDataURL('image/jpeg', 0.25); // produces a JPEG file

                Universe.setForegroundTexture(dataUri);

                ldb.set('foreground' + index, LZString.compress(dataUri) );

                if (index + 1 < Universe.FOREGROUND_COUNT) {
                    Universe.generateForeground(index + 1);
                }

                await Universe.progress();

                resolve();
            }, 0);
        });
    }

	static createTexture(W) {
        return new Promise( (resolve, reject) => {
    		Universe.createNebula(W)
            .then(data => Universe.drawNebula(data) )
            .then(data => Universe.drawStars(data) )
            .then(data => resolve(data) );
        });
	}

    static createNebula(W) {
        return new Promise( (resolve, reject) => {
            setTimeout(async () => {
                var a, b;
                const roughness = rand.next() * 15 + 2;
                var val = [];
                for (var i = 0; i <= W; i++) {
                    val[i] = [];
                }
                val[0][0] = val[0][W] = val[W][0] = val[W][W] = rand.next() * ((400 * roughness) | 0) * 0.01;
                var max = -Number.MAX_VALUE, min = Number.MAX_VALUE;
                var l2, i0, j0;
                var k1 = 2 * roughness / W * 0.01, k2 = 1.41 * roughness / W * 0.01;
                var M, N, K, P;
                for (var l = W >> 1; l != 0; l >>= 1) {
                    l2 = l << 1;
                    for (var i = l; i <= W; i += l2)
                        for (var j = l; j <= W; j += l2)
                        {
                            M = val[i - l][j - l];
                            N = val[i + l][j - l];
                            K = val[i - l][j + l];
                            P = val[i + l][j + l];
                            val[i][j] = (M + N + K + P) * 0.25 + (rand.next() * 200 - 100) * l * k1;
                            if (min > val[i][j])
                                min = val[i][j];
                            if (max < val[i][j])
                                max = val[i][j];
                        }
                    for (var i = l; i <= W; i += l2)
                        for (var j = l; j <= W; j += l2) {
                            i0 = i - l;
                            j0 = j - l;

                            M = i - l2 < 0 ? val[W - l][j] : val[i - l2][j];

                            N = val[i0][j0];

                            K = val[i][j];

                            P = val[i0][j + l];

                            val[i - l][j] = (M + N + K + P) * 0.25 + (rand.next() * 2 * l - l) * k2;
                            if (min > val[i0][j])
                                min = val[i0][j];
                            if (max < val[i0][j])
                                max = val[i0][j];

                            M = j - l2 < 0 ? val[i][W - l] : val[i][j - l2];

                            N = val[i0][j0];

                            K = val[i][j];

                            P = val[i + l][j0];

                            val[i][j - l] = (M + N + K + P) * 0.25 + (rand.next() * 2 * l - l) * k2;
                            if (min > val[i][j0])
                                min = val[i][j0];
                            if (max < val[i][j0])
                                max = val[i][j0];
                        }

                    for (var i = l; i <= W; i += l2)
                        val[W][i] = val[0][i];

                    for (var i = l; i <= W; i += l2)
                        val[i][W] = val[i][0];
                }

                await Universe.progress();

                resolve([W, min, max, val]);
            }, 0);
        });
    }

    static drawNebula([W, min, max, val]) {
        return new Promise( (resolve, reject) => {
            setTimeout(async () => {
                var rand1 = Math.pow(2, rand.next() * 4 - 2.5) * 150, rand2 = Math.pow(2, rand.next() * 4 - 2.5) * 150, rand3;
                do {
                    rand3 = Math.pow(2, rand.next() * 4 - 2.5) * 150;
                } while (Math.abs(rand1 - rand2) < 0.5 && Math.abs(rand3 - rand2) < 0.5 && Math.abs(rand3 - rand1) < 0.5);
                var delta = 1 / (max - min);
                const c = new Uint8ClampedArray(W * W * 4);
                for (var i = 0; i < W; i++) {
                    for (var j = 0; j < W; j++) {
                        const pos = i + j * W, tmp = ((val[i][j]) - min) * delta;
                        var col = tmp * tmp * tmp * tmp;
                        c.setPixel(pos, (col * rand1) | 0, (col * rand2) | 0, (col * rand3) | 0, 255);
                    }
                }
                val = null;

                await Universe.progress();

                resolve([W, c]);
            }, 0);
        });
    }

    static drawStars([W, c]) {
        return new Promise( (resolve, reject) => {
            setTimeout(async () => {
                var a, b, R, G, B, random = (rand.next() + 1) * W * 10; //very small stars amount

                for (var i = 0; i < random; i++) {
                    a = (rand.next() * W) | 0;
                    b = (rand.next() * W) | 0;

                    const col = c.getPixel(a + b * W);
                    var bri = col.r + col.g + col.b;
                    bri *= bri / 256;

                    c.setPixel(a + b * W, bri + col.r, bri + col.g, bri + col.b, 255);
                }

                random = (rand.next() + 1) * W; //small stars amount

                for (var i = 0; i < random; i++) {
                    a = rand.next(W) | 0;
                    b = rand.next(W) | 0;

                    const col = c.getPixel(a + b * W);
                    const bri = rand.next() * 256;

                    c.setPixel(a + b * W, bri + col.r, bri + col.g, bri + col.b, 255);
                }
                
                random = (rand.next() + 2) * W * 0.03; //big stars amount
                
                for (var i = 0; i < random; i++) {
                    var size = (rand.next() * 18 + 2) | 0;
                    a = (size * 2 + 1 + rand.next() * (W - size * 4 - 1)) | 0;
                    b = (size * 2 + 1 + rand.next() * (W - size * 4 - 1)) | 0;
                    R = (rand.next() * 105 + 151) | 0;
                    G = (rand.next() * 105 + 151) | 0;
                    B = (rand.next() * 105 + 151) | 0;
                
                    if (rand.next() > 0.5) {
                        for (var j = 1; j < size; j++) {
                            var k = ((255 - j * 255 / size) | 0) / 511;
                            var cr = (c.getPixel(a + j + b * W).r + R * k) | 0;
                            var cg = (c.getPixel(a + j + b * W).g + G * k) | 0;
                            var cb = (c.getPixel(a + j + b * W).b + B * k) | 0;
                            if (cr > 255)
                                cr = 255;
                            if (cg > 255)
                                cg = 255;
                            if (cb > 255)
                                cb = 255;
                            c.setPixel(a + j + b * W, cr, cg, cb, 255);
                            cr = (c.getPixel(a - j + b * W).r + R * k) | 0;
                            cg = (c.getPixel(a - j + b * W).g + G * k) | 0;
                            cb = (c.getPixel(a - j + b * W).b + B * k) | 0;
                            if (cr > 255)
                                cr = 255;
                            if (cg > 255)
                                cg = 255;
                            if (cb > 255)
                                cb = 255;
                            c.setPixel(a - j + b * W, cr, cg, cb, 255);
                            cr = (c.getPixel(a + (b + j) * W).r + R * k) | 0;
                            cg = (c.getPixel(a + (b + j) * W).g + G * k) | 0;
                            cb = (c.getPixel(a + (b + j) * W).b + B * k) | 0;
                            if (cr > 255)
                                cr = 255;
                            if (cg > 255)
                                cg = 255;
                            if (cb > 255)
                                cb = 255;
                            c.setPixel(a + (b + j) * W, cr, cg, cb, 255);
                            cr = (c.getPixel(a + (b - j) * W).r + R * k) | 0;
                            cg = (c.getPixel(a + (b - j) * W).g + G * k) | 0;
                            cb = (c.getPixel(a + (b - j) * W).b + B * k) | 0;
                            if (cr > 255)
                                cr = 255;
                            if (cg > 255)
                                cg = 255;
                            if (cb > 255)
                                cb = 255;
                            c.setPixel(a + (b - j) * W, cr, cg, cb, 255);
                        }
                    } else {
                        const size1 = size / Math.sqrt(2);
                        for (var j = 1; j <= size1; j++) {
                            var k = ((255 - j * 360 / size) | 0) / 511;
                            var cr = (c.getPixel(a + j + (b + j) * W).r + R * k) | 0;
                            var cg = (c.getPixel(a + j + (b + j) * W).g + G * k) | 0;
                            var cb = (c.getPixel(a + j + (b + j) * W).b + B * k) | 0;
                            if (cr > 255)
                                cr = 255;
                            if (cg > 255)
                                cg = 255;
                            if (cb > 255)
                                cb = 255;
                            c.setPixel(a + j + (b + j) * W, cr, cg, cb, 255);
                            cr = (c.getPixel(a + j + (b - j) * W).r + R * k) | 0;
                            cg = (c.getPixel(a + j + (b - j) * W).g + G * k) | 0;
                            cb = (c.getPixel(a + j + (b - j) * W).b + B * k) | 0;
                            if (cr > 255)
                                cr = 255;
                            if (cg > 255)
                                cg = 255;
                            if (cb > 255)
                                cb = 255;
                            c.setPixel(a + j + (b - j) * W, cr, cg, cb, 255);
                            cr = (c.getPixel(a - j + (b + j) * W).r + R * k) | 0;
                            cg = (c.getPixel(a - j + (b + j) * W).g + G * k) | 0;
                            cb = (c.getPixel(a - j + (b + j) * W).b + B * k) | 0;
                            if (cr > 255)
                                cr = 255;
                            if (cg > 255)
                                cg = 255;
                            if (cb > 255)
                                cb = 255;
                            c.setPixel(a - j + (b + j) * W, cr, cg, cb, 255);
                            cr = (c.getPixel(a - j + (b - j) * W).r + R * k) | 0;
                            cg = (c.getPixel(a - j + (b - j) * W).g + G * k) | 0;
                            cb = (c.getPixel(a - j + (b - j) * W).b + B * k) | 0;
                            if (cr > 255)
                                cr = 255;
                            if (cg > 255)
                                cg = 255;
                            if (cb > 255)
                                cb = 255;
                            c.setPixel(a - j + (b - j) * W, cr, cg, cb, 255);
                        }
                    }
                    /////////////////////////////////////////////////////////////////////////////////
                    for (var j = a - size; j <= a + size; j++) {
                        for (var k = b - size; k <= b + size; k++) {
                            const sqrC = (j - a) * (j - a) + (k - b) * (k - b);
                            if (sqrC < size * size) {
                                const C = Math.sqrt(sqrC);
                                var cr = (c.getPixel(j + k * W).r + R * size * 0.125 / C - 32) | 0;
                                var cg = (c.getPixel(j + k * W).g + G * size * 0.125 / C - 32) | 0;
                                var cb = (c.getPixel(j + k * W).b + B * size * 0.125 / C - 32) | 0;
                                const col = c.getPixel(j + k * W);
                                if (cr > 255)
                                    cr = 255;
                                cr = Math.max(cr, col.r);
                                if (cg > 255)
                                    cg = 255;
                                cg = Math.max(cg, col.g);
                                if (cb > 255)
                                    cb = 255;
                                cb = Math.max(cb, col.b);
                                c.setPixel(j + k * W, cr, cg, cb, 255);
                            }
                        }
                    }
                    c.setPixel(a + b * W, 255, 255, 255, 255);
                }

                await Universe.progress();

                resolve(c);
            }, 0);
        });
    }

    static createForeground(size, ctx, index) {
        const k = index / (Universe.FOREGROUND_COUNT - 1);
        const minR = 1 + (3 - 1) * k;
        const maxR = 3 + (7 - 3) * k;

        const count = 30 + (300 - 30) * (1 - k);
        for (var i = 0; i < count; i++) {
            ctx.save();

            const radius = +(Math.random() * (maxR - minR) + minR).toFixed();
            const x = +(Math.random() * (size - 2 * maxR) + maxR).toFixed();
            const y = +(Math.random() * (size - 2 * maxR) + maxR).toFixed();
            ctx.translate(x, y);
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
            gradient.addColorStop(0, 'white');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.fillRect(-radius, -radius, 2 * radius, 2 * radius);

            ctx.restore();
        }
    }

	static setTexture(dataUri) {
        Universe.background = new PIXI.Sprite();

        Universe.background.pluginName = 'picture';

        background.addChildAt(Universe.background, 0);

        Universe.background.texture = PIXI.Texture.fromImage(dataUri);

        Universe.background.texture.baseTexture.mipmap = false;

        //Create our Pixi filter using our custom shader code
        Universe.background['shader'] = new PIXI.Filter('', Universe.shaderCode, Universe.backgroundUniforms);
    }

    static setForegroundTexture(dataUri) {
        const fore = new PIXI.Sprite();

        fore.pluginName = 'picture';

        Universe.foreground.push(fore);

        background.addChild(fore);

        fore.texture = PIXI.Texture.fromImage(dataUri);

        const uniforms = {
            'pos': [0, 0],
            'size': [2048, 2048]
        };
        Universe.foregroundUniforms.push(uniforms);

        //Create our Pixi filter using our custom shader code
        fore['shader'] = new PIXI.Filter('', Universe.foregroundShaderCode, uniforms);
    }

    static async progress() {
        loadBar.value += Universe.loadStep;
        await sleep(1);
    }

    static endLoad() {
        loading.remove();
        socket.emit('ready');//console.log('ready', socket.id);
    }

}
Universe.FOREGROUND_COUNT = 3;
Universe.foreground = [];
Universe.foregroundUniforms = [];
Universe.shaderCode = document.getElementById("backgroundShader").innerHTML;
Universe.foregroundShaderCode = document.getElementById("foregroundShader").innerHTML;
Universe.orbCount = 0;

Universe.backgroundUniforms = {
    'pos': [0, 0],
    'size': [2048, 2048]
};

async function sleep(ms) {
    return new Promise(res => setTimeout(res, ms) );
}
