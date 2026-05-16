# Galactic Battles

<img width="1920" height="1032" alt="image" src="https://github.com/user-attachments/assets/1229018a-c614-44e4-89fe-c0fe18f6f437" />

[Game website](https://blasterworld.alexkach99.workers.dev/profile_)

This is multiplayer 2D space shooter made with JavaScript. Currently there is only web version for PC.

In this game almost all of the textures are procedurally generated, including those of: space background with stars and nebulae; planets; main star in the star system; spaceships; equipment (weapons, engines and repair robots).

Players can battle with each other or with NPC. There are infinite number of different NPC enemy spaceships. The more far away you are from the space station, the stronger are NPC around you. NPC can drop parts of equipment that you can use to craft new equipment at the space station. There are also infinite number of equipment with different sprites. Also you can earn money by killing enemies or selling items and use that money to buy new ships.

You can register an account and your progress will be saved in the database or play as guest without saving progress.

This game was made around 2017. Originally it was hosted on Heroku and was working on NodeJS with Electron and headless Chromium on the server. This was made in order to use WebRTC to reduce latency. But recently I moved it to Cloudflare Workers and noticed that even without WebRTC the latency is very small. So now it uses only simple WebSockets without WebRTC.
