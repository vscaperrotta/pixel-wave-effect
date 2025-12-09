const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Config
const numPoints = 20;
const dotRadius = 1;
const maxRippleRadius = 150;
const rippleSpeed = 0.1;
const rippleDotRadius = 1;
const spawnInterval = 5000;
const shockwaveThickness = 25;
const minDistance = 100;

let randomPoints = [];
let ripples = [];
let usedPoints = new Set();
let continuousSpawnInterval = null;

function distance(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function generateValidPoint() {
  let attempts = 0;
  const maxAttempts = 100;

  while (attempts < maxAttempts) {
    const newPoint = {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height
    };

    let valid = true;
    for (const point of randomPoints) {
      if (distance(newPoint.x, newPoint.y, point.x, point.y) < minDistance) {
        valid = false;
        break;
      }
    }

    if (valid) {
      return newPoint;
    }

    attempts++;
  }

  // Fallback if no valid point found after N attempts
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height
  };
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  generateRandomPoints();
}

function generateRandomPoints() {
  randomPoints = [];
  usedPoints = new Set();

  for (let i = 0; i < numPoints; i++) {
    randomPoints.push(generateValidPoint());
  }

  startGradualRipples();
}

function spawnRipple(index) {
  const point = randomPoints[index];
  ripples.push({
    x: point.x,
    y: point.y,
    radius: 0,
    alpha: 1,
    pointIndex: index
  });
  usedPoints.add(index);
}

function startGradualRipples() {
  // Cleanup previous interval
  if (continuousSpawnInterval) {
    clearInterval(continuousSpawnInterval);
  }

  ripples = [];
  let currentIndex = 0;

  const initialSpawn = setInterval(() => {
    if (currentIndex >= randomPoints.length) {
      clearInterval(initialSpawn);

      // Continuous loop
      continuousSpawnInterval = setInterval(() => {
        const availableIndices = [];
        for (let i = 0; i < randomPoints.length; i++) {
          if (!usedPoints.has(i)) {
            availableIndices.push(i);
          }
        }

        if (availableIndices.length === 0) {
          usedPoints.clear();
          for (let i = 0; i < randomPoints.length; i++) {
            availableIndices.push(i);
          }
        }

        const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
        spawnRipple(randomIndex);
        randomPoints[randomIndex] = generateValidPoint();

      }, spawnInterval);
      return;
    }

    spawnRipple(currentIndex);
    currentIndex++;
  }, 1000);
}

function animate() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const gridSpacing = 10;
  const intensityMap = new Map();

  // Update ripples
  for (let i = ripples.length - 1; i >= 0; i--) {
    const ripple = ripples[i];

    ripple.radius += rippleSpeed;
    ripple.alpha = 1 - (ripple.radius / maxRippleRadius);

    if (ripple.radius >= maxRippleRadius) {
      ripples.splice(i, 1);
      if (ripple.pointIndex !== undefined) {
        usedPoints.delete(ripple.pointIndex);
      }
      continue;
    }
  }

  // Calculate combined intensity for each grid point
  const halfThickness = shockwaveThickness / 2;

  ripples.forEach(ripple => {
    const shockwaveAlpha = ripple.alpha * 0.8;

    const minX = ripple.x - ripple.radius - shockwaveThickness;
    const maxX = ripple.x + ripple.radius + shockwaveThickness;
    const minY = ripple.y - ripple.radius - shockwaveThickness;
    const maxY = ripple.y + ripple.radius + shockwaveThickness;

    for (let x = Math.floor(minX / gridSpacing) * gridSpacing; x <= maxX; x += gridSpacing) {
      for (let y = Math.floor(minY / gridSpacing) * gridSpacing; y <= maxY; y += gridSpacing) {
        const dist = distance(ripple.x, ripple.y, x, y);
        const distFromRing = Math.abs(dist - ripple.radius);

        if (distFromRing <= halfThickness) {
          const normalizedDist = distFromRing / halfThickness;
          const pointAlpha = shockwaveAlpha * (1 - normalizedDist);

          const key = `${x},${y}`;

          // Ripples add together
          const current = intensityMap.get(key) || 0;
          intensityMap.set(key, Math.min(1, current + pointAlpha));
        }
      }
    }
  });

  // Render
  intensityMap.forEach((intensity, key) => {
    const [x, y] = key.split(',').map(Number);
    ctx.fillStyle = `rgba(255, 255, 255, ${intensity})`;
    ctx.beginPath();
    ctx.arc(x, y, rippleDotRadius, 0, Math.PI * 2);
    ctx.fill();
  });

  requestAnimationFrame(animate);
}

window.addEventListener('load', () => {
  resizeCanvas();
  animate();
});

window.addEventListener('resize', resizeCanvas);
