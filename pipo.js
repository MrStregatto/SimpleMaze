//#region global variables
// Game flow
let gameStarted = false;
let gameOver = false;
let pop;

// menu
let menu;

// board
let board;
let boardWidth = 640;
let boardHeight = 360;
/** @type {CanvasRenderingContext2D} */
let context;

// score values
// TODO: cambiare questo in timer
let scoreSaved = false;
let score = 0;
let scoreX = boardWidth / 5;
let scoreY = 45;

// time per Delta
let lastTime = 0;

// immagini di game over e timer
const endImage = new Image();
endImage.src = "asd.jpg";
const endSound = new Audio("yay.mp3");
let gameEnd = false;
let timeleft = 13

// rserve per definizione tasti
const keys = {};

// mappa
let levelMap = [] // serve per inserire la maPpa nella pagina
const tileSize = 16;

//#endregion



//#region classes

//#region player
// player variables
let playerWidth = 16; // width/height ratio = 408/228 == 17/12
let playerHeight = 16;
let playerXPos = boardWidth / 2;
let playerYPos = boardHeight / 2;

let moveDirX = 0;
let moveDirY = 0;
let blockMovement = false;

let moveRight, moveLeft, moveUp, moveDown;

const playerSpeed = 400; // velocità massima
const playerAcceleration = 2400;
let currentSpeed = 0;

// controllo dello squisshhh
const squishDuration = 0.15;
const squishAmount = 0.3;
let squishTimer = 0;
let squishPower = 0;
let squishDirX = 0;
let squishDirY = 0;


// class
let player = {
    x: playerXPos,
    y: playerYPos,
    width: playerWidth,
    height: playerHeight,
    center: playerWidth / playerHeight
}
//#endregion


// Maze variables
const mapButtons = [];
const exits = [];
let doorsOpen = false;
let currentLevel = 0;

//#endregion

// caricamento finestra
window.onload = function () {
    board = document.getElementById("board");
    board.height = boardHeight;
    board.width = boardWidth;
    context = board.getContext("2d");

    setupInput();
    startGame();
    update();
}

// funzione che aggiorna  l'immagine per ogni frame
function update(time = 0) {

    // calcolo delta
    const deltaTime = Math.min((time - lastTime) / 1000, 0.025);
    const timeInSeconds = time / 1000;

    lastTime = time;
    requestAnimationFrame(update);

    if (gameOver) {
        context.drawImage(endImage, 0, 0, board.width, board.height)
        return;
    }
    if (!gameStarted) {
        return;
    }

    handleInput();

    if (currentLevel === levels.length - 1) {
    timeleft -= deltaTime;
    if (timeleft <= 0) endGame();
}


    updateMovement(deltaTime);
    updateMapButtonsCollisions();
    updateExitCollisions();

    player.x = Math.max(0, Math.min(player.x, board.width - player.width));
    player.y = Math.max(0, Math.min(player.y, board.height - player.height));

    context.clearRect(0, 0, board.width, board.height);

    removeMapButtons();

    drawMap();
    drawExits();
    drawMapButtons();
    drawPlayer();

}

//#region game flow

function startGame(mode) {
    // selezione livello
    loadLevel(0);
    timeleft = 13;
    score = 0;
    gameOver = false;
    gameStarted = true;
}


function nextLevel() {
    if (currentLevel + 1 < levels.length) loadLevel(currentLevel + 1);
    else endGame();
}

function endGame() {
    if (gameOver) return;
    endSound.play()
    console.log("Buh!");
    gameOver = true;
}

//#endregion

//#region player methods
// restituisce true se il movimento è stato fermato da un muro
function movePlayer(dx, dy) {
    let blocked = false;
    const newPlayerX = player.x + dx;
    const newPlayerY = player.y + dy;

    if (!collidesWithWalls(newPlayerX, player.y, player.width, player.height)) {
        player.x = newPlayerX;
    }
    else if(dx > 0){
        const col = Math.floor((newPlayerX + player.width - 1) / tileSize);
        player.x = col * tileSize - player.width;
        blocked = true;
    }
    else if (dx < 0){
        const col = Math.floor(newPlayerX / tileSize);
        player.x = (col +1) * tileSize;
        blocked = true;
    }

    if (!collidesWithWalls(player.x, newPlayerY, player.width, player.height)) {
        player.y = newPlayerY;
    }
    else if(dy > 0){
        const row = Math.floor((newPlayerY + player.height - 1) / tileSize);
        player.y = row * tileSize - player.height;
        blocked = true;
    }
    else if (dy < 0){
        const row = Math.floor(newPlayerY / tileSize);
        player.y = (row +1) * tileSize;
        blocked = true;
    }

    return blocked;
}

function handleInput(){
    moveRight = keys["ArrowRight"] || keys["KeyD"];
    moveLeft = keys["ArrowLeft"] || keys["KeyA"];
    moveUp = keys["ArrowUp"] || keys["KeyW"];
    moveDown = keys["ArrowDown"] || keys["KeyS"];

    // mentre si muove i tasti vengono ignorati
    if (blockMovement) return;

    if (moveRight) moveDirX = 1;
    else if (moveLeft) moveDirX = -1;
    else if (moveUp) moveDirY = -1;
    else if (moveDown) moveDirY = 1;

    if (moveDirX !== 0 || moveDirY !== 0) {
        blockMovement = true;
        currentSpeed = 0;
    }
}

function updateMovement(deltaTime){
    if (squishTimer > 0) squishTimer -= deltaTime;
    if (!blockMovement) return;

    currentSpeed = Math.min(currentSpeed + playerAcceleration * deltaTime, playerSpeed);
    const step = currentSpeed * deltaTime;
    if (movePlayer(moveDirX * step, moveDirY * step)) {
        if (currentSpeed > playerSpeed * 0.3) {
            squishTimer = squishDuration;
            squishPower = currentSpeed / playerSpeed;
            squishDirX = moveDirX;
            squishDirY = moveDirY;
        }
        moveDirX = 0;
        moveDirY = 0;
        blockMovement = false;
    }
}
//#endregion

//#region map logics

function loadLevel(index) {
    currentLevel = index;
    levelMap = levels[index].map;
    mapButtons.length = 0;
    exits.length = 0;
    doorsOpen = false;
    squishTimer = 0;
    moveDirX = 0;
    moveDirY = 0;
    blockMovement = false;

    for (let row = 0; row < levelMap.length; row++) {
        for (let col = 0; col < levelMap[row].length; col++) {
            if (levelMap[row][col] === 'p') {
                player.x = col * tileSize;
                player.y = row * tileSize;
            }
            else if (levelMap[row][col] === 'b') {
                mapButtons.push({ x: col * tileSize, y: row * tileSize, width: tileSize, height: tileSize });
            }
            else if (levelMap[row][col] === 'e') {
                exits.push({ x: col * tileSize, y: row * tileSize, width: tileSize, height: tileSize });
            }
        }

    }
}




function removeMapButtons(){
        for (let i = mapButtons.length - 1; i >= 0; i--) {
        if (mapButtons[i].hp <= 0) mapButtons.splice(i, 1);
    }
}




//#endregion


//#region drawses
function drawPlayer() {
    context.fillStyle = "#ff1dc7";
    let x = player.x, y = player.y, w = player.width, h = player.height;

    if (squishTimer > 0) {
        const s = squishAmount * squishPower * (squishTimer / squishDuration);
        if (squishDirX !== 0) {
            w = player.width * (1 - s);
            h = player.height * (1 + s);
            x = squishDirX > 0 ? player.x + player.width - w : player.x;
            y = player.y - (h - player.height) / 2;
        } else {
            h = player.height * (1 - s);
            w = player.width * (1 + s);
            y = squishDirY > 0 ? player.y + player.height - h : player.y;
            x = player.x - (w - player.width) / 2;
        }
    }

    context.fillRect(x, y, w, h);
}

function drawMap() {
    for (let row = 0; row < levelMap.length; row++) {
        for (let col = 0; col < levelMap[row].length; col++) {
            const char = levelMap[row][col];
            const x = col * tileSize;
            const y = row * tileSize;

            if (char === 'd' && !doorsOpen) {
                context.fillStyle = "#fd9125";
                context.fillRect(x, y, tileSize, tileSize);
            }

            if (char === 'x') {
                // Disegna muro
                context.fillStyle = "#cecccc";
                context.fillRect(x, y, tileSize, tileSize);
            }
        }
    }
}

function drawExits() {
    context.fillStyle = "#fcf157";
    for (const exit of exits) {
        context.fillRect(exit.x, exit.y, exit.width, exit.height);
    }
}

function drawMapButtons() {
    context.fillStyle = "#07f880";
    for (const mapButton of mapButtons) {
        context.fillRect(mapButton.x, mapButton.y, mapButton.width, mapButton.height);
    }
}

//#endregion



//#region collisions

function collidesWithWalls(x, y, w, h) {
    const left = Math.floor(x / tileSize);
    const right = Math.floor((x + w - 1) / tileSize);
    const top = Math.floor(y / tileSize);
    const bottom = Math.floor((y + h - 1) / tileSize);

    for (let row = top; row <= bottom; row++) {
        for (let col = left; col <= right; col++) {
            const tile = levelMap[row] && levelMap[row][col];
            if (tile === 'x' || (tile === 'd' && !doorsOpen)) return true;
        }
    }
    return false;
}

function overlaps(a, b) {
    return a.x < b.x + b.width &&
        a.x + a.width > b.x &&
        a.y < b.y + b.height &&
        a.y + a.height > b.y;
}


function updateExitCollisions() {
    for (const exit of exits) {
        if (overlaps(player, exit)) {
            nextLevel();
            return;
        }
    }
}

function updateMapButtonsCollisions() {
   for (const mapButton of mapButtons) {
        if (overlaps(player, mapButton)) {
            doorsOpen = true;
        }
    }
}

//#endregion



//#region varie

function setupInput() {
    document.addEventListener("keydown", (e) => {
        keys[e.code] = true;

        // Impedisce alla pagina di scorrere con le frecce o la barra spaziatrice
        if (["ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
            e.preventDefault();
        }

    });

    document.addEventListener("keyup", (e) => {
        keys[e.code] = false;
    });
}





//#endregion
