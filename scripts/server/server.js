/*
# 1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39
#11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18
export DATABASE_URL=alpostgres://alex-pc:1234@localhost/alex-pc
*/
// import { httpServerHandler } from 'cloudflare:node';
// import https from 'https';
// import fs from 'fs';
// import pg from 'pg';
// const { Client } = pg;

// import express from 'express';
// const app      = express();

// const key = fs.readFileSync('/bundle/certs/key.pem');
// const cert = fs.readFileSync('/bundle/certs/cert.pem');
// const httpsOptions = {
    // 'key': key,
    // 'cert': cert
// };
// const serv = https.createServer(httpsOptions, app);
// // const serv     = http.Server(app);

// const port     = process.env.PORT || 4444;

// import passport from 'passport';
// import flash from 'connect-flash';

// import cookieParser from 'cookie-parser';
// import bodyParser from 'body-parser';
// import session from 'express-session';
// const store        = new session.MemoryStore();

// import { Server } from './socket.io/dist/index.js';
// const io = new Server(serv, {
//     transports: ['polling', 'websocket', 'webtransport']
// });
// import { Http3Server } from '@fails-components/webtransport';

// import CircularJSON from 'circular-json';

// import passport_ from './passport.cjs';
// passport_(passport);

// //=============================== INIT DB =======================================================

// // client = Client({
// //     connectionString: process.env.DATABASE_URL,
// //     ssl: false,
// // });
// // await client.connect();
// // await client.query(`
// //   CREATE TABLE IF NOT EXISTS my_table (
// //     id SERIAL PRIMARY KEY,
// //     name TEXT NOT NULL,
// //     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
// //   );
// // `);

// //===============================================================================================

// // set up our express application
// app.use( cookieParser() ); // read cookies (needed for auth)
// app.use( bodyParser.urlencoded({
//   extended: true
// }) );
// app.use( bodyParser.json() );

// app.set('view engine', 'ejs'); // set up ejs for templating

// // required for passport
// app.use( session({ 
//   store: store,
//   secret: process.env.SESSION_SECRET || 'sytbgefgbgvxhbzbhyusjyedghxgxhjchjhcxhcgxhcbhhjchilinkyggfvng',
//   resave: true,
//   saveUninitialized: true
// }) );
// app.use( passport.initialize() );
// app.use( passport.session() ); // persistent login sessions
// app.use( flash() ); // use connect-flash for flash messages stored in session

// // routes ======================================================================
// import routes from './routes.js';
// routes(app, passport); // load our routes and pass in our app and fully configured passport

// app.use('/client', express.static(import.meta.dirname + '/client') );

// // launch ======================================================================
// serv.listen(port);
// console.log('The magic happens on port ' + port);

Math.TWO_PI = Math.PI * 2;
Math.HALF_PI = Math.PI * 0.5;

const seed = 200;
// const DEBUG = port != process.env.PORT;
// const pendingCandidates = [];
// const dataChannelSettings = {
//   'udp': {
//     ordered: false,
//     maxRetransmits: 0
//   }
// };

// io.on('connection', socket => {
//   console.log(`connected with transport ${socket.conn.transport.name}, id: ${socket.id}`);

//   socket.conn.on('upgrade', (transport) => {
//     console.log(`transport upgraded to ${transport.name}, id: ${socket.id}`);
//   });

//   socket.once('UDPsocketID', id => {
//     console.log(`binding udp socket ${id} to tcp socket ${socket.id}`);
//     socket.UDPsocket = io.sockets.sockets.get(id);
//     if (socket.signedInData) {
//         Player.onConnect(socket, socket.signedInData);
//     }
//   });

//   socket.once('signIn', data => {
//     console.log(`player connected ${socket.id}`);
//     socket.signedInData = data;
//     if (socket.UDPsocket) {
//         Player.onConnect(socket, data);
//     }
//   });

//   if (DEBUG) {
//     socket.on('evalServer', data => {
//       const res = eval(data);
//       socket.emit('evalAnswer', CircularJSON.stringify(res) );
//     });
//   }

//   socket.on('disconnect', () => {
//     Player.onDisconnect(socket);
//   });
// });


// const h3Server = new Http3Server({
//   port,
//   host: '0.0.0.0',
//   secret: 'wqzwaxsdfcfdgffvgh',
//   cert,
//   privKey: key,
// });

// h3Server.startServer();

// (async () => {
//   const stream = await h3Server.sessionStream('/socket.io/');
//   const sessionReader = stream.getReader();

//   while (true) {
//     const { done, value } = await sessionReader.read();
//     if (done) {
//       break;
//     }
//     io.engine.onWebTransportSession(value);
//   }
// })();


// Universe.start();

// Controller.setIntervals();

// setInterval(() => {
//   store.all((err, sessions) => {
//     for (var i = 0; i < sessions.length; i++) {
//       store.get(sessions[i], () => {});
//     }
//   });

//   Item.clearEquipment();
// }, 1000 * 60 * 5);

Math.ang = d => {
  if (d > Math.PI) {
    d -= Math.TWO_PI;
  } else if (d < -Math.PI) {
    d += Math.TWO_PI;
  }
  return d;
}





















/*
echo <some_secret> | npx wrangler secret put BETTER_AUTH_SECRET
npx wrangler d1 create blasterworld-db
npx wrangler d1 migrations create blasterworld-db create_game_tables
npx auth generate --config src/worker/auth-config.js
npx prisma init --datasource-provider sqlite
npx prisma migrate diff --from-empty --to-schema ./prisma/schema.prisma --script --output migrations/2027_create_game_tables.sql
npx wrangler d1 migrations apply blasterworld-db --local
npx wrangler d1 migrations apply blasterworld-db --remote
.minimize/debugall.sh
*/
import { Hono } from 'hono';
import { auth } from './auth';
import { env } from 'cloudflare:workers';

const { DB } = env;

const router = new Hono({
    strict: false,
});

router.on(['POST', 'GET'], '/auth/*', (c) => {
    return auth.handler(c.req.raw)
});

const app = new Hono({
    strict: false,
});
app.basePath('/api').route('/', router);



import { DurableObject } from 'cloudflare:workers';

var io, rand;
export default {
    async fetch(request, env, ctx) {
        console.log('fetch', request.url);
        if (request.url.endsWith('/websocket')) {
            const upgradeHeader = request.headers.get('Upgrade');
            if (!upgradeHeader || upgradeHeader !== 'websocket') {
                return new Response('Worker expected Upgrade: websocket', {
                    status: 426,
                });
            }

            if (request.method !== 'GET') {
                return new Response('Worker expected GET method', {
                    status: 400,
                });
            }

            let id = env.WEBSOCKET_SERVER.idFromName('foo');
            let stub = env.WEBSOCKET_SERVER.get(id);

            return stub.fetch(request);
        }

        return app.fetch(request, env, ctx);
    },
};

export class WebSocketServer extends DurableObject {
    sockets;
    state;

    constructor(ctx, env) {
        console.log('DurableObject constructor');
        super(ctx, env);
        this.sockets = new Map();
        rand = new Random(seed);
        Universe.start();
        Controller.setIntervals();
        console.log('started');

        
        this.ctx.blockConcurrencyWhile(async () => {
            console.log('loading');
            const state = await this.ctx.storage.get('state');
            this.state = state ?? { players: {} };
            console.log('loaded:', JSON.stringify(this.state));
            this.initState();
        });

        setInterval( () => this.saveState(), 10000);
    }

    async fetch(request) {
        console.log('connecting websocket');
        io = this;
        
        const session = await auth.api.getSession({
            headers: request.headers,
        });

        // waiting for Universe initialization
        await waitFor( () => (Orb.station.x * Orb.station.x + Orb.station.y * Orb.station.y > 6e6) );

        const webSocketPair = new WebSocketPair();
        const [client, server] = Object.values(webSocketPair);

        server.accept();

        const id = crypto.randomUUID();
        const socket = {
            id,
            server,
            callbacks: new Map()
        };
        socket.on = (label, callback) => socket.callbacks.set(label, callback);
        socket.once = (label, callback) => socket.callbacks.set(label, data => {
            callback(data);
            socket.callbacks.delete(label);
        });
        socket.emit = (label, message) => this.socketEmit(socket, label, message);
        socket.disconnect = () => this.handleConnectionClose(socket);
        socket.broadcast = {
            emit: (label, message) => {
                this.socketBroadcastEmit(socket, label, message);
            }
        };
        this.sockets.set(id, socket);

        socket.on('signIn', data => {
            console.log(`player connected ${id}`);
            socket.UDPsocket = socket;
            if (session) {
                const { user } = session;
                data = {
                    name: user.name,
                    u_id: user.id
                };
                Player.onConnect(socket, data);
            } else {
                Player.onConnect(socket, data);
            }
        });

        socket.on('reconnect', data => {
            console.log(`player reconnected ${data.id}`);
            if (!data.id) return;

            this.sockets.delete(id);
            this.sockets.set(data.id, socket);
            socket.id = data.id;
            socket.UDPsocket = socket;
            if (session) {
                const { user } = session;
                data = {
                    name: user.name,
                    u_id: user.id
                };
                Player.onReconnect(socket, data);
            } else {
                Player.onReconnect(socket, data);
            }
        });

        server.addEventListener('message', (event) => {
            this.handleWebSocketMessage(socket, event.data);
        });

        server.addEventListener('close', () => {
            this.handleConnectionClose(socket);
        });

        socket.emit('connect');

        console.log('connected');
        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    async handleWebSocketMessage(socket, message) {
        const {label, data} = JSON.parse(message);
        const callback = socket.callbacks.get(label);
        try {
            callback?.(data);
        } catch(e) {
            console.log('Error on WS message', message, e);
        }
    }

    async handleConnectionClose(socket) {
        console.log('connection closed');
        Player.onDisconnect(socket);
        this.sockets.delete(socket.id);
        socket.server.close(1000, 'Durable Object is closing WebSocket');
        socket.server = { send() {} };
    }

    socketEmit(socket, label, message) {
        socket.server.send( JSON.stringify({label, data: message}) );
    }
    
    socketBroadcastEmit(socket, label, message) { 
        this.sockets.forEach((socket_, id) => {
            if (socket !== socket_) {
                socket_.server.send( JSON.stringify({label, data: message}) );
            }
        });
    }

    emit(label, message) { 
        this.sockets.forEach((socket, id) => {
            socket.server.send( JSON.stringify({label, data: message}) );
        });
    }

    initState() {

    }

    saveState() {
        for (const id in this.state.players) {
            if ( !this.sockets.has(id) ) {
                delete this.state.players[id];
            }
        }
        this.ctx.storage.put('state', this.state);
    }
}

function waitFor(f, time=200) {
    return new Promise( (res, rej) => {
        const r = f();
        if (r) {
            res(r);
        } else {
            setTimeout( () => res( waitFor(f, time) ), time);
        }
    });
}
