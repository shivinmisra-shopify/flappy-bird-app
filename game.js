// Get the canvas and its drawing context
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

// Load bird image
const birdImage = new Image();
birdImage.src = 'shoppy.png';

// Game state
let gameRunning = true;
let score = 0;
let gameStarted = false;

// Bird properties
const bird = {
    x: 80,
    y: 150,
    width: 30,
    height: 24,
    gravity: 0.2,
    velocity: 0,
    jump: -5
};

// Pipe properties
const pipes = [];
const pipeWidth = 60;
const pipeGap = 200;
const pipeSpeed = 1;
const pipeColors = {
    main: '#43a047',
    highlight: '#66bb6a',
    shadow: '#2e7d32',
    cap: '#388e3c',
    capHighlight: '#4caf50',
    capShadow: '#1b5e20'
};
const pipeCapHeight = 20;
const pipeCapOverhang = 5;

// ADDED: Cloud properties
const clouds = [];
const cloudSpeed = 0.3; // Slower than pipes for parallax effect

// Cash properties
const cashItems = [];
const cashWidth = 30;
const cashHeight = 30;
const cashSpawnChance = 0.002; // Reduced to 0.2% chance per frame
const cashSpeed = 1; // Same speed as pipes
const minDistanceBetweenCash = 500; // Minimum distance between cash items

// Load cash image
const cashImage = new Image();
cashImage.src = 'cash-icon.png';

// Add image load handlers
cashImage.onload = function() {
    console.log('Cash image loaded successfully');
};

cashImage.onerror = function() {
    console.error('Failed to load cash image');
};

// Initialize clouds
function initClouds() {
    // Create several clouds at random positions
    for (let i = 0; i < 5; i++) {
        createCloud(Math.random() * canvas.width);
    }
}

// Create a new cloud
function createCloud(x) {
    const cloudSize = Math.random() * 0.5 + 0.7; // Random size between 0.7 and 1.2
    const cloudY = Math.random() * (canvas.height * 0.6); // Only in top 60% of screen

    clouds.push({
        x: x,
        y: cloudY,
        width: 80 * cloudSize,
        height: 40 * cloudSize,
        speed: cloudSpeed * (Math.random() * 0.4 + 0.8), // Slight speed variation
        opacity: Math.random() * 0.3 + 0.6, // Random opacity
        pixelSize: Math.floor(Math.random() * 2) + 4 // Random pixel size (4-5px)
    });
}

let frameCount = 0;

// Score animation variables
let scoreAnimation = {
    active: false,
    x: 0,
    y: 0,
    timer: 0,
    value: 0
};

// Jump when screen is clicked - also starts the game
canvas.addEventListener('click', function() {
    if (!gameStarted) {
        gameStarted = true;
    }
    bird.velocity = bird.jump;
});

// Also jump when spacebar is pressed - also starts the game
document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
        if (!gameStarted) {
            gameStarted = true;
        }
        bird.velocity = bird.jump;
    }
});

// Function to draw a realistic-looking pipe
function drawPipe(x, y, width, height, isTop) {
    // Main pipe body
    ctx.fillStyle = pipeColors.main;
    ctx.fillRect(x, y, width, height);

    // Pipe highlight (left side)
    ctx.fillStyle = pipeColors.highlight;
    ctx.fillRect(x, y, 10, height);

    // Pipe shadow (right side)
    ctx.fillStyle = pipeColors.shadow;
    ctx.fillRect(x + width - 10, y, 10, height);

    // Pipe cap
    if (isTop) {
        // Cap for top pipe (at bottom of pipe)
        const capY = y + height - pipeCapHeight;

        // Cap main body
        ctx.fillStyle = pipeColors.cap;
        ctx.fillRect(x - pipeCapOverhang, capY, width + pipeCapOverhang * 2, pipeCapHeight);

        // Cap highlight
        ctx.fillStyle = pipeColors.capHighlight;
        ctx.fillRect(x - pipeCapOverhang, capY, width + pipeCapOverhang * 2, 5);

        // Cap shadow
        ctx.fillStyle = pipeColors.capShadow;
        ctx.fillRect(x - pipeCapOverhang, capY + pipeCapHeight - 5, width + pipeCapOverhang * 2, 5);
    } else {
        // Cap for bottom pipe (at top of pipe)
        const capY = y;

        // Cap main body
        ctx.fillStyle = pipeColors.cap;
        ctx.fillRect(x - pipeCapOverhang, capY - pipeCapHeight, width + pipeCapOverhang * 2, pipeCapHeight);

        // Cap highlight
        ctx.fillStyle = pipeColors.capHighlight;
        ctx.fillRect(x - pipeCapOverhang, capY - pipeCapHeight, width + pipeCapOverhang * 2, 5);

        // Cap shadow
        ctx.fillStyle = pipeColors.capShadow;
        ctx.fillRect(x - pipeCapOverhang, capY - 5, width + pipeCapOverhang * 2, 5);
    }
}

// ADDED: Function to draw a pixelated cloud with rounded edges
function drawPixelatedCloud(cloud) {
    const { x, y, width, height, opacity, pixelSize } = cloud;

    // Cloud shape defined as a grid where 1 means "draw pixel"
    // This is a rough approximation of a cloud shape
    const cloudShape = [
        [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0],
        [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
        [0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0]
    ];

    // Calculate scaling to fit cloud shape to desired width and height
    const scaleX = width / (cloudShape[0].length * pixelSize);
    const scaleY = height / (cloudShape.length * pixelSize);

    // Draw each pixel of the cloud
    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;

    for (let row = 0; row < cloudShape.length; row++) {
        for (let col = 0; col < cloudShape[row].length; col++) {
            if (cloudShape[row][col] === 1) {
                // Position of this pixel
                const pixelX = x + col * pixelSize * scaleX;
                const pixelY = y + row * pixelSize * scaleY;

                // Draw a rounded rectangle for each "pixel"
                ctx.beginPath();
                const radius = pixelSize * 0.3; // Rounded corner radius
                const adjustedPixelSize = pixelSize * 0.9; // Slightly smaller for spacing

                // Draw rounded rectangle
                ctx.beginPath();
                ctx.moveTo(pixelX + radius, pixelY);
                ctx.lineTo(pixelX + adjustedPixelSize * scaleX - radius, pixelY);
                ctx.quadraticCurveTo(pixelX + adjustedPixelSize * scaleX, pixelY, pixelX + adjustedPixelSize * scaleX, pixelY + radius);
                ctx.lineTo(pixelX + adjustedPixelSize * scaleX, pixelY + adjustedPixelSize * scaleY - radius);
                ctx.quadraticCurveTo(pixelX + adjustedPixelSize * scaleX, pixelY + adjustedPixelSize * scaleY, pixelX + adjustedPixelSize * scaleX - radius, pixelY + adjustedPixelSize * scaleY);
                ctx.lineTo(pixelX + radius, pixelY + adjustedPixelSize * scaleY);
                ctx.quadraticCurveTo(pixelX, pixelY + adjustedPixelSize * scaleY, pixelX, pixelY + adjustedPixelSize * scaleY - radius);
                ctx.lineTo(pixelX, pixelY + radius);
                ctx.quadraticCurveTo(pixelX, pixelY, pixelX + radius, pixelY);
                ctx.closePath();

                ctx.fill();
            }
        }
    }
}

// Create a new pipe
function createPipe() {
    // Random height for top pipe
    const topHeight = Math.floor(Math.random() * (canvas.height - pipeGap - 150)) + 50;

    pipes.push({
        // Top pipe (hanging from top)
        top: {
            x: canvas.width,
            y: 0,
            width: pipeWidth,
            height: topHeight
        },
        // Bottom pipe (standing from bottom)
        bottom: {
            x: canvas.width,
            y: topHeight + pipeGap,
            width: pipeWidth,
            height: canvas.height - topHeight - pipeGap
        },
        passed: false
    });
}

// Check if bird hit something
function checkCollision() {
    // Hit the ground or ceiling (with 5px forgiveness at the top)
    if (bird.y <= -5 || bird.y + bird.height >= canvas.height) {
        return true;
    }

    // Check each pipe with a slightly forgiving collision
    for (let i = 0; i < pipes.length; i++) {
        const pipe = pipes[i];

        // Check if bird overlaps with top or bottom pipe
        if (
            bird.x + bird.width - 5 > pipe.top.x &&
            bird.x + 5 < pipe.top.x + pipe.top.width &&
            (
                // Top pipe collision (with forgiveness)
                (bird.y + 5 < pipe.top.height) ||
                // Bottom pipe collision (with forgiveness)
                (bird.y + bird.height - 5 > pipe.bottom.y)
            )
        ) {
            return true;
        }
    }

    return false;
}

// Create a new cash item
function createCash() {
    // Don't create new cash if there's already one on screen
    if (cashItems.length > 0) {
        return;
    }

    // Find the most recent pipe to position cash between its gap
    const lastPipe = pipes[pipes.length - 1];
    if (!lastPipe) {
        return;
    }

    // Calculate the middle of the pipe gap
    const gapMiddle = lastPipe.top.y + (pipeGap / 2);

    // Add some random variation to the Y position, but keep it within the gap
    const yVariation = pipeGap * 0.3; // 30% of the gap size for variation
    const y = gapMiddle + (Math.random() * yVariation - yVariation/2);

    // Generate a value that's a multiple of 100 between 100-500
    const value = (Math.floor(Math.random() * 5) + 1) * 100;

    const newCash = {
        x: canvas.width,
        y: y,
        width: cashWidth,
        height: cashHeight,
        value: value,
        collected: false
    };

    cashItems.push(newCash);
}

// Draw cash items
function drawCash() {
    if (cashItems.length === 0) {
        return;
    }

    cashItems.forEach(cash => {
        if (!cash.collected) {
            // Draw cash image if loaded, otherwise draw a placeholder
            if (cashImage.complete) {
                ctx.drawImage(cashImage, cash.x, cash.y, cash.width, cash.height);
            } else {
                // Fallback to a yellow rectangle if image isn't loaded
                ctx.fillStyle = '#FFD700';
                ctx.fillRect(cash.x, cash.y, cash.width, cash.height);
            }

            // Draw cash value
            ctx.fillStyle = '#FFD700';
            ctx.font = '12px Arial';
            ctx.fillText(`$${cash.value}`, cash.x, cash.y - 5);
        }
    });
}

// Update cash positions
function updateCash() {
    // Only try to spawn new cash if there are no cash items on screen
    if (cashItems.length === 0 && Math.random() < cashSpawnChance) {
        createCash();
    }

    // Update existing cash positions
    for (let i = cashItems.length - 1; i >= 0; i--) {
        cashItems[i].x -= cashSpeed;

        // Remove cash that's off screen or collected
        if (cashItems[i].x + cashItems[i].width < 0 || cashItems[i].collected) {
            cashItems.splice(i, 1);
        }
    }
}

// Check collision with cash
function checkCashCollision() {
    cashItems.forEach(cash => {
        if (!cash.collected &&
            bird.x < cash.x + cash.width &&
            bird.x + bird.width > cash.x &&
            bird.y < cash.y + cash.height &&
            bird.y + bird.height > cash.y) {

            cash.collected = true;
            score += cash.value;

            // Create score animation for cash collection
            scoreAnimation = {
                active: true,
                x: cash.x,
                y: cash.y,
                timer: 60,
                value: cash.value
            };
        }
    });
}

// Update game state
function update() {
    if (!gameRunning) return;

    // ADDED: Update clouds
    for (let i = 0; i < clouds.length; i++) {
        clouds[i].x -= clouds[i].speed;

        // If cloud moves off screen, create a new one on the right
        if (clouds[i].x + clouds[i].width < 0) {
            clouds.splice(i, 1);
            createCloud(canvas.width);
            i--; // Adjust index after removal
        }
    }

    // Only update bird physics if game has started
    if (gameStarted) {
        // Update bird position
        bird.velocity += bird.gravity;
        bird.y += bird.velocity;

        // Add a velocity cap to prevent falling too fast
        if (bird.velocity > 7) {
            bird.velocity = 7;
        }

        // Create new pipes periodically - only after game has started
        frameCount++;
        if (frameCount % 180 === 0) {
            createPipe();
        }

        // Move pipes and check if passed
        for (let i = 0; i < pipes.length; i++) {
            pipes[i].top.x -= pipeSpeed;
            pipes[i].bottom.x -= pipeSpeed;

            // Check if bird passed a pipe
            if (!pipes[i].passed && pipes[i].top.x + pipeWidth < bird.x) {
                pipes[i].passed = true;
                score += 100;

                // Trigger score animation
                scoreAnimation.active = true;
                scoreAnimation.x = canvas.width / 2;
                scoreAnimation.y = 100;
                scoreAnimation.timer = 30; // frames the animation will last
                scoreAnimation.value = 100;
            }
        }

        // Remove pipes that moved off screen
        if (pipes.length > 0 && pipes[0].top.x + pipeWidth < 0) {
            pipes.shift();
        }

        // Check for collisions
        if (checkCollision()) {
            gameRunning = false;
        }

        // Update cash
        updateCash();

        // Check cash collisions
        checkCashCollision();
    }
    else {
        // Make bird hover slightly up and down when waiting
        bird.y = 150 + Math.sin(Date.now() / 300) * 5; // Gentle hovering effect
    }

    // Update score animation
    if (scoreAnimation.active) {
        scoreAnimation.timer--;
        scoreAnimation.y -= 1; // Move animation upward
        if (scoreAnimation.timer <= 0) {
            scoreAnimation.active = false;
        }
    }
}

// Draw everything
function draw() {
    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background gradient (subtle sky effect)
    const skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    skyGradient.addColorStop(0, '#64b5f6');   // Lighter blue at top
    skyGradient.addColorStop(1, '#bbdefb');   // Lighter blue at bottom
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // CHANGED: Draw pixelated clouds
    for (let i = 0; i < clouds.length; i++) {
        drawPixelatedCloud(clouds[i]);
    }

    // Draw pipes using the detailed pipe function
    for (let i = 0; i < pipes.length; i++) {
        const pipe = pipes[i];

        // Draw top pipe
        drawPipe(pipe.top.x, pipe.top.y, pipe.top.width, pipe.top.height, true);

        // Draw bottom pipe
        drawPipe(pipe.bottom.x, pipe.bottom.y, pipe.bottom.width, pipe.bottom.height, false);
    }

    // Draw bird using the image if it's loaded, otherwise draw a rectangle
    if (birdImage.complete) {
        ctx.drawImage(birdImage, bird.x, bird.y, bird.width, bird.height);
    } else {
        // Fallback to rectangle if image isn't loaded
        ctx.fillStyle = '#FF0000';
        ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
    }

    // Draw score
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(canvas.width/2 - 70, 10, 140, 40);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(score + ' pts', canvas.width/2, 38);
    ctx.textAlign = 'left'; // Reset text alignment

    // Draw score animation when active
    if (scoreAnimation.active) {
        ctx.fillStyle = 'rgba(255, 215, 0, ' + (scoreAnimation.timer / 30) + ')';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('+' + scoreAnimation.value, scoreAnimation.x, scoreAnimation.y);
        ctx.textAlign = 'left'; // Reset text alignment
    }

    // Draw cash items
    drawCash();

    // Always show start instructions until game begins
    if (!gameStarted) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(canvas.width/2 - 140, 100, 280, 60);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Click or press SPACE to start', canvas.width/2, 130);
        ctx.textAlign = 'left';
    }

    // Game over message
    if (!gameRunning) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = '30px Arial';
        ctx.fillText('Game Over!', canvas.width/2 - 80, canvas.height/2 - 30);

        // Display final score more prominently
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(score + ' pts', canvas.width/2, canvas.height/2 + 20);
        ctx.textAlign = 'left';

        ctx.font = '20px Arial';
        ctx.fillText('Click to restart', canvas.width/2 - 70, canvas.height/2 + 60);
    }
}

// Game loop - runs continuously
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Restart game
canvas.addEventListener('click', function() {
    if (!gameRunning) {
        // Reset game
        bird.y = 150;
        bird.velocity = 0;
        pipes.length = 0;
        score = 0;
        frameCount = 0;
        gameRunning = true;
        gameStarted = false;
        scoreAnimation.active = false;

        // Clear and reinitialize clouds when restarting
        clouds.length = 0;
        initClouds();
        cashItems.length = 0; // Clear cash items
    }
});

// Initialize clouds before starting the game
initClouds();

// Start the game loop immediately
gameLoop();