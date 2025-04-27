let mic;
let fft;
let pg; // Off-screen graphics buffer for feedback

let isRunning = false; // To control start/stop

// --- Smoothing ---
let smoothedAmp = 0;
let smoothedBass = 0;
let smoothedMid = 0;
let smoothedTreble = 0;
const smoothingFactor = 0.1; // Lower = smoother, slower reaction

// --- Beat Detection ---
let bassEnergyHistory = []; // Store recent bass energy levels
const historyLength = 30; // How many frames to average over
let avgBassEnergy = 0;
let beatThreshold = 1.3; // Trigger beat if current energy is 1.3x the average
let beatCutoff = 40; // Minimum bass energy to register a beat (avoid quiet noise)
let beatDetectedThisFrame = false;
let beatFlashAlpha = 0; // For screen flash effect

// --- Lasers ---
let lasers = [];
const laserColorHue = 0; // Base hue for lasers (Red)

// --- Feedback ---
const feedbackFade = 80; // Lower = longer trails, higher = shorter (0-255 alpha)
const feedbackScale = 1.005; // Slight zoom/warp effect

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100); // HSB mode, Alpha enabled
  noStroke();

  // Create the off-screen buffer with the same size as the canvas
  pg = createGraphics(width, height);
  pg.colorMode(HSB, 360, 100, 100, 100); // Use same color mode for buffer

  // Initialize beat detection history
  for (let i = 0; i < historyLength; i++) {
    bassEnergyHistory.push(0);
  }

  // Prompt the user to start audio
  textAlign(CENTER, CENTER);
  textSize(32);
  fill(0, 0, 100); // White text
  text("Click to Start", width / 2, height / 2);
}

function startAudio() {
  mic = new p5.AudioIn();
  mic.start(() => {
    console.log("Mic started successfully");
    isRunning = true;
  }, (err) => {
    console.error("Mic start error:", err);
    alert("Could not start microphone. Please check permissions.");
  });

  fft = new p5.FFT(0.8, 128); // Smoothing, FFT bins
  fft.setInput(mic);

  console.log("Audio setup complete (pending mic start)");
}

function detectBeat(bassEnergy) {
    // Calculate average bass energy from history
    let sum = 0;
    for (let i = 0; i < bassEnergyHistory.length; i++) {
        sum += bassEnergyHistory[i];
    }
    avgBassEnergy = sum / bassEnergyHistory.length;

    // Check for beat condition
    if (bassEnergy > avgBassEnergy * beatThreshold && bassEnergy > beatCutoff) {
        beatDetectedThisFrame = true;
        beatFlashAlpha = 80; // Trigger flash effect
    } else {
        beatDetectedThisFrame = false;
    }

    // Update history (add current, remove oldest)
    bassEnergyHistory.push(bassEnergy);
    if (bassEnergyHistory.length > historyLength) {
        bassEnergyHistory.shift(); // Remove the oldest entry
    }
}

function draw() {
  if (!isRunning) {
    background(0);
    fill(0, 0, 100);
    textAlign(CENTER, CENTER);
    textSize(32);
    text("Click to Start", width / 2, height / 2);
    return;
  }

  // --- 1. Audio Analysis ---
  fft.analyze();
  let amplitude = mic.getLevel();
  let bass = fft.getEnergy("bass");
  let mid = fft.getEnergy("mid");
  let treble = fft.getEnergy("treble");

  // Smooth values
  smoothedAmp = lerp(smoothedAmp, amplitude, smoothingFactor);
  smoothedBass = lerp(smoothedBass, bass, smoothingFactor);
  smoothedMid = lerp(smoothedMid, mid, smoothingFactor);
  smoothedTreble = lerp(smoothedTreble, treble, smoothingFactor);

  // --- 2. Beat Detection ---
  detectBeat(bass); // Pass the raw (unsmoothed) bass for sharper detection

  // --- 3. Draw Feedback Layer ---
  // Draw the previous frame (stored in pg) onto the main canvas, slightly faded and scaled
  push();
  translate(width / 2, height / 2); // Scale/rotate from center
  scale(feedbackScale);
  rotate(radians(smoothedMid * 0.01)); // Subtle rotation based on mids
  translate(-width / 2, -height / 2);
  tint(0, 0, 100, feedbackFade); // Apply fade using white tint with alpha
  image(pg, 0, 0, width, height);
  noTint(); // Reset tint
  pop();


  // --- 4. Draw Current Frame Elements (onto main canvas) ---
  // Dim background slightly (allows feedback to show through)
  background(0, 0, 0, 10); // Very low alpha black background


  // Beat Flash Effect
  if (beatFlashAlpha > 0) {
    fill(0, 0, 100, beatFlashAlpha); // White flash
    rect(0, 0, width, height);
    beatFlashAlpha = lerp(beatFlashAlpha, 0, 0.15); // Fade out flash quickly
  }


  // Central pulsing circle (Reacts to beat)
  let circleSizeTarget = map(smoothedBass, 0, 255, height * 0.1, height * 0.6);
  if (beatDetectedThisFrame) {
       circleSizeTarget *= 1.2; // Pulse bigger on beat
  }
   let circleSize = lerp(circleSize, circleSizeTarget, 0.2); // Smooth size change
  let circleHue = map(smoothedTreble, 0, 255, 180, 360);
  fill(circleHue, 80, 90, 40); // Semi-transparent fill
  stroke(circleHue, 80, 100, 80); // Brighter stroke
  strokeWeight(map(smoothedAmp, 0, 0.5, 1, 5));
  ellipse(width / 2, height / 2, circleSize, circleSize);
  noStroke(); // Reset stroke


  // --- Laser Logic ---
  if (beatDetectedThisFrame) {
    let numLasers = floor(random(3, 8)); // Add 3-7 lasers on a beat
    for (let i = 0; i < numLasers; i++) {
      lasers.push({
        angle: random(TWO_PI), // Random direction
        maxLength: random(height * 0.4, height * 1.2), // Max length
        currentLength: 0, // Start retracted
        speed: random(20, 50), // How fast it extends
        brightness: 100,
        weight: random(1, 4),
        hue: map(smoothedTreble, 0, 255, 0, 60) // Yellow/Orange based on treble
      });
    }
  }

  // Update and Draw Lasers
  push();
  translate(width / 2, height / 2); // Draw lasers from center
  for (let i = lasers.length - 1; i >= 0; i--) {
    let l = lasers[i];

    // Extend laser
    l.currentLength += l.speed;

    // Fade laser (optional - start fading after reaching max length)
    if (l.currentLength >= l.maxLength) {
        l.currentLength = l.maxLength; // Cap length
        l.brightness -= 4; // Start fading
    }


    // Draw the laser line
    if (l.brightness > 0) {
        strokeWeight(l.weight);
        stroke(l.hue, 90, l.brightness, 90); // HSB Laser color
        let x2 = cos(l.angle) * l.currentLength;
        let y2 = sin(l.angle) * l.currentLength;
        line(0, 0, x2, y2);
    }

    // Remove faded lasers
    if (l.brightness <= 0) {
      lasers.splice(i, 1);
    }
  }
  pop();
  noStroke(); // Reset stroke

  // --- Glitch Effects (Keep or Modify) ---
  let glitchProbability = map(smoothedBass, 100, 255, 0.01, 0.15); // Reduced probability
  let shouldGlitch = random(1) < glitchProbability || (beatDetectedThisFrame && random(1) < 0.5); // Glitch sometimes on beat too

  if (shouldGlitch) {
       push();
       // Apply glitch transforms (jitter, tint, etc.) - Keep your previous code here or adapt
        // Example: Jitter
        let offsetX = random(-15, 15) * (smoothedAmp * 4);
        let offsetY = random(-15, 15) * (smoothedAmp * 4);
        translate(offsetX, offsetY);

        // Draw the main visuals AGAIN slightly shifted for a glitch effect
        // (This is a simple approach, more complex glitches involve manipulating pixel data)
         tint(0, 0, 100, 15); // Faint white ghosting during glitch
         image(pg, 0, 0, width, height); // Draw previous frame again, slightly shifted
         noTint();

       pop(); // Restore from glitch transform
   }


  // --- 5. Capture Frame for Next Feedback Iteration ---
  // Copy the entire current canvas content into the off-screen buffer 'pg'
  pg.copy(canvas, 0, 0, width, height, 0, 0, width, height);

} // End of draw()

// --- Helper Functions (Keep mousePressed, startAudio, windowResized) ---

function mousePressed() {
  if (!isRunning) {
    if (getAudioContext().state !== 'running') {
      getAudioContext().resume().then(() => {
        console.log("AudioContext resumed!");
        startAudio();
      });
    } else {
      startAudio();
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  // IMPORTANT: Resize the graphics buffer too!
  pg = createGraphics(width, height);
  pg.colorMode(HSB, 360, 100, 100, 100); // Re-apply color mode
  console.log("Resized canvas and feedback buffer");
}
