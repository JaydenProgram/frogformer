let board;
let boardWidth = 576;
let boardHeight = 360;
let context;

// frog
let frogWidth = 32;
let frogHeight = 32;
let frogX = boardWidth * 2 / 8 - frogWidth;
let frogY = boardHeight - frogHeight*2.5;
let frogImage;

let frog = {
    img: null,
    x: frogX,
    y: frogY,
    width: frogWidth,
    height: frogHeight,
    velocityY: 0,
    jumping: false,
};

//floor
let floorImage;
let floorWidth = boardWidth;
let floorHeight = boardHeight;
let floorX = 0;
let floorY = 0;

let floor = {
    img: null,
    x1: floorX, // First copy of the floor
    x2: floorWidth -1, // Second copy, starting at the end of the first
    y: floorY,
    width: floorWidth,
    height: floorHeight,
};

// spikes
let spikeArray = [];
let spikeWidth = 16;
let spikeHeight = 16;
let spikeX = boardWidth;
let spikeY = frogY + frog.height / 2;

//trampolines
let trampolineWidth = 28;
let trampolineHeight = 28;

//platforms
let platformWidth = 32;
let platformHeight = 8;
let platformY = frogY - frogHeight;

let spikeImage;
let trampolineImage;
let platformImage;

// sprites
const spriteWidth = 32;
const spriteHeight = 32;
let frameX = 0;
let frameY = 0;
let walkingFrog;
let jumpingFrog;
let doubleJumpingFrog;

// physics
let lastTime = 0;
let accumulatedTime = 0; // To accumulate time between frames
const frameDuration = 100; // Duration in milliseconds to switch frames
let velocityX = -300; // Adjusted pipes moving left speed (in pixels per second)
let gravity = 0.4;
let jumpStrength = -7;


//game
let gameState = "menu";
let gameOver = false;
let minDelay = 200;  // Minimum delay of 500 milliseconds
let maxDelay = 2000; // Maximum delay of 3000 milliseconds

//score
let score = 0;
let highScore = localStorage.getItem('highscore') ? parseInt(localStorage.getItem('highscore')) : 0;



window.onload = function () {
    board = document.getElementById("board");
    board.width = boardWidth;
    board.height = boardHeight;
    context = board.getContext("2d");

    // Load images
    loadImages();
    document.addEventListener("keydown", moveFrog);
};

function loadImages() {
    floorImage = loadImage("images/background/platformerBg.png", (img) => {
        floor.img = img;
        requestAnimationFrame(update);
    });

    walkingFrog = loadImage("images/frogWalk.png");
    jumpingFrog = loadImage("images/frogJump.png");
    doubleJumpingFrog = loadImage("images/frogDoubleJump.png");
    spikeImage = loadImage("images/spikes.png", () => {
        let initialDelay = Math.random() * maxDelay; // Initial random delay
        setTimeout(placeSpikes, initialDelay);
        setTimeout(placePlatforms, 1500);
        requestAnimationFrame(update);
    });
    trampolineImage = loadImage("images/trampoline.png");
    platformImage = loadImage("images/brown-platform.png");
}

function loadImage(src, onLoad) {
    const img = new Image();
    img.src = src;
    img.onload = () => {
        if (onLoad) onLoad(img);
    };
    return img;
}

function update(currentTime) {
    requestAnimationFrame(update);

// Clear the canvas
    context.clearRect(0, 0, board.width, board.height);

    if (gameState === "menu") {
        drawHomeScreen(currentTime);
        return;
    }

    if (gameState === "gameOver") {
        drawGameOverScreen();

        if (score > highScore) {
            localStorage.setItem('highscore', score);
            highScore = score; // Update highScore variable
        }
        return;
    }

    // Calculate the time delta between frames (in seconds)
    let deltaTime = (currentTime - lastTime) / 1000; // convert ms to seconds
    lastTime = currentTime;



    // Update floor positions for infinite scrolling
    floor.x1 += velocityX * deltaTime;
    floor.x2 += velocityX * deltaTime;

    //frog
    frog.velocityY += gravity * deltaTime * 60;

    frog.y = Math.min(frog.y + frog.velocityY * deltaTime * 60, boardHeight - frogHeight*2.5);

    // Check if the frog is on the ground (landing)
    if (frog.y >= boardHeight - frogHeight * 2.5) {
        frog.y = boardHeight - frogHeight * 2.5; // Snap frog to the ground level
        frog.jumping = false; // Allow frog to jump again
        frog.velocityY = 0; // Reset vertical velocity when on the ground
    }

    // When the first copy of the floor goes off-screen, reset it to the right
    if (floor.x1 + floor.width <= 0) {
        floor.x1 = floor.x2 + floor.width -1;
    }
    // When the second copy of the floor goes off-screen, reset it to the right
    if (floor.x2 + floor.width <= 0) {
        floor.x2 = floor.x1 + floor.width -1;
    }

    // Draw both copies of the floor
    context.drawImage(floor.img, floor.x1, floor.y, floor.width, floor.height);
    context.drawImage(floor.img, floor.x2, floor.y, floor.width, floor.height);


    // Accumulate the time
    accumulatedTime += deltaTime;

    // Determine which sprite to draw based on the frog's state
    if (frog.jumping) {
        frog.img = jumpingFrog; // Use static image for jumping
        context.drawImage(frog.img, frog.x, frog.y, frog.width, frog.height);
    } else {
        frog.img = walkingFrog; // Switch to walking frog sprite

        // Accumulate the time for walking sprite animation
        accumulatedTime += deltaTime;
        if (accumulatedTime >= frameDuration / 1000) {
            frameX = (frameX + 1) % 11; // Loop through 11 frames (adjust as needed)
            accumulatedTime = 0; // Reset the accumulated time
        }

        // Draw the walking sprite
        context.drawImage(frog.img, frameX * spriteWidth, frameY * spriteHeight, spriteWidth, spriteHeight, frog.x, frog.y, frog.width, frog.height);
    }


    // Draw and update spikes
    for (let i = 0; i < spikeArray.length; i++) {
        let spike = spikeArray[i];
        spike.x += velocityX * deltaTime; // Move spike based on velocity and time passed

        if (!spike.passed && frog.x > spike.x + spike.width && !spike.isTrampoline && !spike.isPlatform) {
            score ++;
            spike.passed = true;
        } else if (!spike.passed && frog.x > spike.x + spike.width) {
            spike.passed = true;
        }

        context.drawImage(spike.img, spike.x, spike.y, spike.width, spike.height);
        if (detectCollision(frog, spike) && !spike.isTrampoline && !spike.isPlatform) {
            gameState = "gameOver";
        } else if (detectCollision(frog, spike) && spike.isTrampoline) {
            trampolineJump();
        } else if (detectCollision(frog, spike) && frog.velocityY >= 0) {
            frog.jumping = false;
            frog.y = spike.y - frog.height; // Position the frog on top of the platform
            frog.velocityY = 0;
        }
        // Remove spikes that go off-screen
        if (spike.x + spike.width < 0) {
            spikeArray.splice(i, 1);
            i--; // Adjust index since we removed an element
        }

    }

    while (spikeArray.length > 0 && spikeArray[0].x < -spikeWidth) {
        spikeArray.shift();
    }

    context.fillStyle = "white";
    context.font = "45px sans-serif";
    context.fillText(score, 5, 45);

}

function placeSpikes() {
    if (gameState === "gameOver") {
        return;
    }

    if (Math.random() < 0.3) {
        let trampolines = {
            img: trampolineImage,
            x: spikeX,
            y: spikeY,
            width: trampolineWidth,
            height: trampolineHeight,
            passed: false,
            isTrampoline: true,
        }
        spikeArray.push(trampolines);
    } else {
        let spikes = {
            img: spikeImage,
            x: spikeX,
            y: spikeY,
            width: spikeWidth,
            height: spikeHeight,
            passed: false,
            isTrampoline: false,
        };
        spikeArray.push(spikes);
    }



    let randomDelay = Math.random() * (maxDelay * 2 - minDelay) + minDelay;

    // Schedule the next spike spawn after the random delay
    setTimeout(placeSpikes, randomDelay);
}

function placePlatforms() {
    if (gameState === "gameOver") {
        return;
    }

    let platforms = {
        img: platformImage,
        x: spikeX,
        y: platformY,
        width: platformWidth,
        height: platformHeight,
        passed: false,
        isTrampoline: false,
        isPlatform: true,
    }
    spikeArray.push(platforms);

    let randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;

    // Schedule the next spike spawn after the random delay
    setTimeout(placePlatforms, randomDelay);
}

function moveFrog (e) {
    if (e.code === "Enter") {
        if (gameState === "menu") {
            gameState = "playing"; // Start the game
            resetGame(); // Reset game variables
        } else if (gameState === "gameOver") {
            gameState = "playing"; // Restart the game
            resetGame();
        }
    }

    if (gameState === "playing" && e.code === "Space" && !frog.jumping) {
        frog.velocityY = jumpStrength;
        frog.jumping = true;
    }
}

function trampolineJump () {
    frog.jumping = true;
    frog.velocityY = 2 * jumpStrength;
}

function drawHomeScreen(currentTime) {

    context.fillStyle = "transparent";
    context.fillRect(0, 0, boardWidth, boardHeight);
    context.fillStyle = "white";
    context.font = "36px sans-serif";
    context.fillText(`Welcome to the Frog Game!`, 50, 100);
    context.fillText(`High Score: ${highScore}`, 50, 140);
    context.font = "24px sans-serif";
    context.fillText("Press Enter to Start", 100, 200);
    frog.img = doubleJumpingFrog; // Switch to walking frog sprite

    let deltaTime = (currentTime - lastTime) / 1000; // convert ms to seconds
    lastTime = currentTime;

    // Accumulate the time for walking sprite animation
    accumulatedTime += deltaTime;
    if (accumulatedTime >= frameDuration / 1000) {
        frameX = (frameX + 1) % 6; // Loop through 11 frames (adjust as needed)
        accumulatedTime = 0; // Reset the accumulated time
    }

    // Draw the walking sprite
    context.drawImage(frog.img, frameX * spriteWidth, frameY * spriteHeight, spriteWidth, spriteHeight, 400, 200, frog.width, frog.height);
}

function drawGameOverScreen() {
    context.fillStyle = "transparent";
    context.fillRect(0, 0, boardWidth, boardHeight);
    context.fillStyle = "white";
    context.font = "36px sans-serif";
    context.fillText("GAME OVER", 50, 100);
    context.fillStyle = "white";
    context.font = "24px sans-serif";
    context.fillText("Press Enter to Restart", 100, 200);


}


function resetGame() {
    spikeArray = [];
    frog.y = frogY;
    score = 0;
    gameState = "playing";
}

function detectCollision (a, b) {
    return  a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y +b.height &&
            a.y + a.height > b.y;
}