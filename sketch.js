let mic;
let fft;

let isRunning = false; // To control start/stop

// Variables to store smoothed audio data
let smoothedAmp = 0;
let smoothedBass = 0;
let smoothedMid = 0;
let smoothedTreble = 0;
const smoothingFactor = 0.1; // How much smoothing (0-1, lower is smoother)

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 100); // Use HSB color mode for easier hue changes
  noStroke();

  // Prompt the user to start audio
  textAlign(CENTER, CENTER);
  textSize(32);
  fill(255);
  text("Click to Start", width / 2, height / 2);
}

function startAudio() {
  // Create an audio input
  mic = new p5.AudioIn();
  mic.start(() => {
    console.log("Mic started successfully");
    isRunning = true; // Set running flag only after mic starts
  }, (err) => {
    console.error("Mic start error:", err);
    alert("Could not start microphone. Please check permissions.");
  });


  // Create an FFT object to analyze the audio
  fft = new p5.FFT(0.8, 128); // Smoothing, FFT bins (power of 2, 128 is decent)
  fft.setInput(mic);

  console.log("Audio setup complete (pending mic start)");
}


function draw() {
  // Only run drawing logic if audio has successfully started
  if (!isRunning) {
      // Optionally keep displaying the "Click to Start" message or just do nothing
      background(0); // Keep background black
      fill(255);
      textAlign(CENTER, CENTER);
      textSize(32);
      text("Click to Start", width/2, height/2);
      return; // Stop the draw function here if not running
  }

  // --- Basic Trippy Background ---
  // Semi-transparent background for trails/feedback effect
  background(0, 0, 0, 15); // Black background with low opacity

  // --- Audio Analysis ---
  fft.analyze(); // Analyze the frequency spectrum

  let amplitude = mic.getLevel(); // Overall volume (0 to 1.0 approx)
  let bass = fft.getEnergy("bass"); // Energy in bass frequencies (0-255)
  let mid = fft.getEnergy("mid"); // Energy in mid frequencies (0-255)
  let treble = fft.getEnergy("treble"); // Energy in treble frequencies (0-255)

  // Smooth the values to prevent excessive jittering
  smoothedAmp = lerp(smoothedAmp, amplitude, smoothingFactor);
  smoothedBass = lerp(smoothedBass, bass, smoothingFactor);
  smoothedMid = lerp(smoothedMid, mid, smoothingFactor);
  smoothedTreble = lerp(smoothedTreble, treble, smoothingFactor);


  // --- Simple Visual Mapping ---
  // Example 1: Central pulsing circle (Bass drives size, Treble drives color)
  let circleSize = map(smoothedBass, 0, 255, height * 0.1, height * 0.8);
  let circleHue = map(smoothedTreble, 0, 255, 180, 360); // Cyan to Red range
  fill(circleHue, 90, 90, 50); // Hue, Saturation, Brightness, Alpha
  ellipse(width / 2, height / 2, circleSize, circleSize);

  // Example 2: Rotating rectangles (Mid drives rotation speed, Amp drives scale)
  let numRects = 8;
  let rectScale = map(smoothedAmp, 0, 0.5, 0.5, 2); // Scale based on amplitude
  let rotationSpeed = map(smoothedMid, 0, 255, 0.001, 0.05);

  push(); // Isolate transformations
  translate(width / 2, height / 2); // Move origin to center
  scale(rectScale); // Scale based on amplitude
  rotate(frameCount * rotationSpeed); // Rotate over time based on mid-range

  fill(240, 80, 100, 30); // Blueish color, semi-transparent
  for (let i = 0; i < numRects; i++) {
    rotate(TWO_PI / numRects);
    rect(0, height * 0.1, height * 0.05, height * 0.3); // Draw rectangles radiating out
  }
  pop(); // Restore previous transformation state

} // End of draw()

// Function to handle starting audio on user click
function mousePressed() {
  if (!isRunning) {
    // Check if audio context needs resuming (required in some browsers)
    if (getAudioContext().state !== 'running') {
        getAudioContext().resume().then(() => {
            console.log("AudioContext resumed!");
            startAudio(); // Now attempt to start the audio input
        });
    } else {
        startAudio(); // Audio context already running, proceed
    }
  }
}

// Adjust canvas size if window is resized
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
