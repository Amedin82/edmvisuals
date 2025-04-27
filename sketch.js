Okay, let's enhance the visualizer using Approach 1: "AI-Inspired" Advanced Procedural Generation. We'll focus on integrating:

Perlin Noise (noise()): To create a more dynamic, flowing background texture instead of just fading black.

A Simple Particle System: Particles will emanate from the center, reacting to the music's amplitude and beats.

We'll build upon the previous code that includes the feedback loop, lasers, and beat detection.

Updated sketch.js:

let mic;
let fft;
let pg; // Off-screen graphics buffer for feedback

let isRunning = false;

// --- Smoothing ---
let smoothedAmp = 0;
let smoothedBass = 0;
let smoothedMid = 0;
let smoothedTreble = 0;
const smoothingFactor = 0.1;

// --- Beat Detection ---
let bassEnergyHistory = [];
const historyLength = 30;
let avgBassEnergy = 0;
let beatThreshold = 1.3;
let beatCutoff = 40;
let beatDetectedThisFrame = false;
let beatFlashAlpha = 0;

// --- Lasers ---
let lasers = [];
const laserColorHue = 0;

// --- Feedback ---
const feedbackFade = 80;
const feedbackScale = 1.005;

// --- Noise ---
let noiseOffset = 0; // To animate noise over time
const noiseScale = 0.01; // How zoomed in the noise field is

// --- Particles ---
let particles = [];
const maxParticles = 300; // Limit total particles for performance

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100);
  noStroke();

  pg = createGraphics(width, height);
  pg.colorMode(HSB, 360, 100, 100, 100);

  for (let i = 0; i < historyLength; i++) {
    bassEnergyHistory.push(0);
  }

  textAlign(CENTER, CENTER);
  textSize(32);
  fill(0, 0, 100);
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

  fft = new p5.FFT(0.8, 128);
  fft.setInput(mic);
  console.log("Audio setup complete (pending mic start)");
}

function detectBeat(bassEnergy) {
    let sum = 0;
    for (let i = 0; i < bassEnergyHistory.length; i++) sum += bassEnergyHistory[i];
    avgBassEnergy = sum / bassEnergyHistory.length;

    if (bassEnergy > avgBassEnergy * beatThreshold && bassEnergy > beatCutoff) {
        beatDetectedThisFrame = true;
        beatFlashAlpha = 80;
    } else {
        beatDetectedThisFrame = false;
    }

    bassEnergyHistory.push(bassEnergy);
    if (bassEnergyHistory.length > historyLength) bassEnergyHistory.shift();
}

// --- Particle Class ---
class Particle {
  constructor(x, y, initialVel, hue, size) {
    this.pos = createVector(x, y);
    this.vel = initialVel;
    this.acc = createVector(0, 0); // Optional acceleration
    this.lifespan = 100; // Alpha value (0-100)
    this.baseHue = hue;
    this.size = size;
  }

  update() {
    // Optional: Apply noise-based acceleration for wandering
    let noiseAngle = noise(this.pos.x * 0.01, this.pos.y * 0.01, frameCount * 0.005) * TWO_PI * 4;
    let noiseForce = p5.Vector.fromAngle(noiseAngle);
    noiseForce.mult(0.05); // Adjust strength of noise influence
    //this.acc.add(noiseForce); // Uncomment to add wandering

    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= 1.5; // Fade rate
    this.acc.mult(0); // Reset acceleration each frame
  }

  display() {
    noStroke();
    // Color fades from its initial hue to maybe white or a different hue
    let currentHue = this.baseHue; // Keep original hue
    // let currentHue = map(this.lifespan, 100, 0, this.baseHue, (this.baseHue + 60) % 360); // Shift hue over life
    fill(currentHue, 90, 100, this.lifespan);
    ellipse(this.pos.x, this.pos.y, this.size, this.size);
  }

  isDead() {
    return this.lifespan <= 0;
  }
}
// --- End Particle Class ---


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

  smoothedAmp = lerp(smoothedAmp, amplitude, smoothingFactor);
  smoothedBass = lerp(smoothedBass, bass, smoothingFactor);
  smoothedMid = lerp(smoothedMid, mid, smoothingFactor);
  smoothedTreble = lerp(smoothedTreble, treble, smoothingFactor);

  // --- 2. Beat Detection ---
  detectBeat(bass);

  // --- 3. Draw Feedback Layer ---
  push();
  translate(width / 2, height / 2);
  scale(feedbackScale);
  rotate(radians(smoothedMid * 0.01));
  translate(-width / 2, -height / 2);
  tint(0, 0, 100, feedbackFade);
  image(pg, 0, 0, width, height);
  noTint();
  pop();

  // --- 4. Draw Current Frame Elements ---

  // Noise Background (Replaces simple background)
  loadPixels(); // Allow direct pixel manipulation
  noiseOffset += 0.005; // Speed of noise evolution
  let noiseBright = map(smoothedAmp, 0, 0.4, 5, 15); // Background brightness reacts to amplitude
  let noiseHueShift = map(smoothedMid, 0, 255, 0, 60); // Background hue shifts slightly with mids

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let index = (x + y * width) * 4;
      let noiseVal = noise(x * noiseScale, y * noiseScale + noiseOffset); // Get noise value
      let bright = map(noiseVal, 0, 1, 0, noiseBright); // Map noise to brightness
      let hue = (240 + noiseHueShift) % 360; // Base blue hue, shifted by mids
      let c = color(hue, 90, b
