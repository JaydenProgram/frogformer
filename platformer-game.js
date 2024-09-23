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
    jumpCount: 0,
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
let trampolineAnim = false;

//platforms
let platformWidth = 32;
let platformHeight = 8;
let platformY = frogY - frogHeight;

//items
let itemsArray = [];
let itemWidth = 32;
let itemHeight = 32;
let itemY ;

//images
let spikeImage;
let trampolineImage;
let platformImage;
let itemImage;
let appleImage;

// sprites
const spriteWidth = 32;
const spriteHeight = 32;
let frameX = 0;
let frameY = 0;
let frogFrameX = 0;
let frogFrameY = 0;
let itemFrameX = 0;
let itemFrameY = 0;
let walkingFrog;
let jumpingFrog;
let doubleJumpingFrog;
let jumpTrampoline;

// physics
let lastTime = 0;
let frogAccumulatedTime = 0;
let itemAccumulatedTime = 0;
let accumulatedTime = 0;
const frameDuration = 100; // Duration in milliseconds to switch frames
let velocityX = -300; // Adjusted pipes moving left speed (in pixels per second)
let gravity = 0.4;
let jumpStrength = -7;


// boost
let originalVelocityX = velocityX; // Store the original velocity
let boostDuration = 500; // Duration of the boost in milliseconds
let boostActive = false; // Flag to track if the boost is active
let boostEndTime = 0; // Time when the boost ends

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
    jumpTrampoline = loadImage("images/trampolineJump.png");
    platformImage = loadImage("images/brown-platform.png");
    itemImage = loadImage("images/bananas.png", () => {
      setTimeout(spawnItem, 1500);
        requestAnimationFrame(update);
    });
    appleImage = loadImage("images/apples.png", () => {
        setTimeout(spawnItem, 1500);
        requestAnimationFrame(update);
    });
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
        frog.jumpCount = 0;
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


    // Save the current context state
    context.save();

    // Set shadow properties for the glow effect if boost is active
    if (boostActive) {
        context.shadowColor = 'rgba(255, 0, 0, 0.8)'; // Red glow color
        context.shadowBlur = 20; // Size of the glow
        context.shadowOffsetX = 0; // No offset in X direction
        context.shadowOffsetY = 0; // No offset in Y direction
    } else {
        // Reset shadow properties to avoid glow effect when not active
        context.shadowColor = 'transparent'; // No shadow
    }

    // Determine which sprite to draw based on the frog's state
    if (frog.jumping) {
        frog.img = jumpingFrog; // Use static image for jumping
        context.drawImage(frog.img, frog.x, frog.y, frog.width, frog.height);
    } else {
        frog.img = walkingFrog; // Switch to walking frog sprite
        frogAccumulatedTime += deltaTime;
        if (frogAccumulatedTime >= frameDuration / 1000) {
            frogFrameX = (frogFrameX + 1) % 12; // Loop through frog frames
            frogAccumulatedTime = 0; // Reset the frog animation timer
        }

        context.drawImage(frog.img, frogFrameX * spriteWidth, frogFrameY * spriteHeight, spriteWidth, spriteHeight, frog.x, frog.y, frog.width, frog.height);
    }

    context.restore();

    if (boostActive && currentTime >= boostEndTime) {
        velocityX = originalVelocityX; // Reset to original velocity
        boostActive = false; // Disable boost
    }


    // Add this after the floor drawing code in the update function
    for (let i = 0; i < itemsArray.length; i++) {
        let item = itemsArray[i];
        itemY = frogY - frogHeight * Math.random() * 5;
        item.x += velocityX * deltaTime; // Move item based on velocity
        itemAccumulatedTime += deltaTime;
        if (itemAccumulatedTime >= frameDuration / 1000) {
            itemFrameX = (itemFrameX + 1) % 17; // Loop through item frames
            itemAccumulatedTime = 0; // Reset item animation timer
        }

        context.drawImage(item.img, itemFrameX * spriteWidth, itemFrameY * spriteHeight, spriteWidth, spriteHeight, item.x, item.y, item.width, item.height);

        if (detectCollision(frog, item)) {
            if (!item.powerUp) {
                score += 2; // Increment score for normal items
            } else {
                frog.jumpCount = Math.max(0, frog.jumpCount - 1); // Prevent jumpCount from going negative
                velocityX -= 200; // Increase velocity for the power-up
                boostActive = true; // Activate the boost
                boostEndTime = performance.now() + boostDuration; // Set end time for the boost
            }

            itemsArray.splice(i, 1); // Remove the item after processing
        }

    }

    while (itemsArray.length > 0 && itemsArray[0].x < -itemWidth) {
        itemsArray.shift();
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
            frog.jumpCount = 0;
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
    if (gameState !== "playing") {
        return;
    }

    if (Math.random() < 0.3) {
        let trampolines = {
            img: trampolineImage,
            x: spikeX,
            y: spikeY - trampolineHeight/2,
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



    let randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;

    // Schedule the next spike spawn after the random delay
    setTimeout(placeSpikes, randomDelay);
}

function placePlatforms() {
    if (gameState !== "playing") {
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

    let randomDelay = Math.random() * (maxDelay * 2 - minDelay) + minDelay;

    // Schedule the next spike spawn after the random delay
    setTimeout(placePlatforms, randomDelay);
}

function moveFrog(e) {
    if (e.code === "Enter") {
        if (gameState === "menu" || gameState === "gameOver") {
            resetGame(); // Reset game variables
            gameState = "playing"; // Start the game
        }
    }

    if (gameState === "playing" && e.code === "Space") {
        if (frog.jumpCount < 2) {
            frog.velocityY = jumpStrength;
            frog.jumpCount++;
            frog.jumping = true;
            frog.img = (frog.jumpCount === 2) ? doubleJumpingFrog : jumpingFrog;
        }
    }
}

function spawnItem () {
    if (gameState === "gameOver") {
        return;
    }
    let itemY = frogY - frogHeight * Math.random() * 5; // Set itemY here, instead of in update()

    if (Math.random() < 0.1) {
        let apples = {
            img: appleImage,
            x: spikeX,
            y: itemY,
            width: itemWidth,
            height: itemHeight,
            powerUp: true,
        }
        itemsArray.push(apples)
    } else {
        let bananas = {
            img: itemImage,
            x: spikeX,
            y: itemY,
            width: itemWidth,
            height: itemHeight,
            powerUp: false,
        }
        itemsArray.push(bananas)
    }

    let randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;

    setTimeout(spawnItem, randomDelay);
}


function trampolineJump () {
    if (gameState === "gameOver") {
        return;
    }

    frog.jumping = true;
    frog.jumpCount = 1;
    frog.velocityY = 2 * jumpStrength;
    trampolineAnim = true;
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
    context.fillText(`GAME OVER : ${score}`, 50, 100);
    context.fillStyle = "white";
    context.font = "24px sans-serif";
    context.fillText("Press Enter to Restart", 100, 200);
}


function resetGame() {
    spikeArray = [];
    itemsArray = [];
    frog.y = frogY;
    frog.velocityY = 0; // Reset vertical velocity
    frog.jumping = false;
    frog.jumpCount = 0; // Reset jump count
    score = 0; // Reset score
    gameState = "playing"; // Ensure we set the game state
    lastTime = 0; // Reset lastTime for deltaTime calculation
    accumulatedTime = 0; // Reset accumulated time for frog animation
    // Reset positions of any other game elements as needed
}

function detectCollision (a, b) {
    return  a.x < b.x + b.width &&
            a.x + a.width > b.x &&
            a.y < b.y +b.height &&
            a.y + a.height > b.y;
}