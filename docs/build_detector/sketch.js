let parts = [];
let placedParts = [];
let draggingPart = null;

// Radii for concentric detector layers
let layerRadii = [60, 100, 140, 180, 220];

// Responsive sizing variables
let canvasSize;
let scaleFactor;
let baseSize = 600; // Original design size

// UI Buttons (will be scaled)
let fireButton = {x: 10, y: 10, w: 120, h: 40};
let clearButton = {x: 140, y: 10, w: 100, h: 40};

// Particle simulation variables
let activeParticles = [];
let particleTrails = [];
let permanentTrails = []; // Trails that stay until cleared
let particlePaths = []; // Store actual particle paths for curved tracks

// Button helper functions
function isPointInButton(x, y, button) {
  return x >= button.x && x <= button.x + button.w && 
         y >= button.y && y <= button.y + button.h;
}

function scaleUIElements() {
  // Scale button positions and sizes
  fireButton.x = 10 * scaleFactor;
  fireButton.y = 10 * scaleFactor;
  fireButton.w = 120 * scaleFactor;
  fireButton.h = 40 * scaleFactor;
  
  clearButton.x = 140 * scaleFactor;
  clearButton.y = 10 * scaleFactor;
  clearButton.w = 100 * scaleFactor;
  clearButton.h = 40 * scaleFactor;
  
  // Scale layer radii
  for (let i = 0; i < layerRadii.length; i++) {
    layerRadii[i] = [60, 100, 140, 180, 220][i] * scaleFactor;
  }
}

function windowResized() {
  // Recalculate canvas size with orientation-aware layout
  let isPortrait = windowHeight > windowWidth;
  
  let maxWidth, maxHeight;
  
  if (isPortrait) {
    // Portrait: instructions on top
    maxWidth = windowWidth * 0.95;
    maxHeight = windowHeight * 0.70; // Leave space for top instructions
  } else {
    // Landscape: instructions on side
    maxWidth = windowWidth * 0.70; // Leave space for side instructions
    maxHeight = windowHeight * 0.95;
  }
  
  canvasSize = min(maxWidth, maxHeight);
  scaleFactor = canvasSize / baseSize;
  
  // Resize canvas
  resizeCanvas(canvasSize, canvasSize);
  
  // Rescale UI elements
  scaleUIElements();
  
  // Update part positions
  let toolboxY = canvasSize * 0.91;
  if (parts.length > 0) {
    parts[0].x = canvasSize * 0.45; parts[0].y = toolboxY;  // Magnet
    parts[1].x = canvasSize * 0.567; parts[1].y = toolboxY; // ECAL
    parts[2].x = canvasSize * 0.683; parts[2].y = toolboxY; // HCAL
    parts[3].x = canvasSize * 0.8; parts[3].y = toolboxY;   // Muon
    parts[4].x = canvasSize * 0.917; parts[4].y = toolboxY; // Tracker
  }
}

function drawButtons() {
  // Fire particle button
  fill(100, 255, 100);
  stroke(50);
  strokeWeight(2 * scaleFactor);
  rect(fireButton.x, fireButton.y, fireButton.w, fireButton.h, 5 * scaleFactor);
  
  fill(0);
  noStroke();
  textAlign(CENTER);
  textSize(max(12, 14 * scaleFactor)); // Minimum 12px for readability
  textStyle(BOLD);
  text("Fire Particle", fireButton.x + fireButton.w/2, fireButton.y + fireButton.h/2 + 5 * scaleFactor);
  
  // Clear tracks button
  fill(255, 100, 100);
  stroke(50);
  strokeWeight(2 * scaleFactor);
  rect(clearButton.x, clearButton.y, clearButton.w, clearButton.h, 5 * scaleFactor);
  
  fill(0);
  noStroke();
  textAlign(CENTER);
  textSize(max(12, 14 * scaleFactor)); // Minimum 12px for readability
  textStyle(BOLD);
  text("Clear Tracks", clearButton.x + clearButton.w/2, clearButton.y + clearButton.h/2 + 5 * scaleFactor);
  
  strokeWeight(1); // Reset stroke weight
}

function setup() {
  // Calculate responsive canvas size accounting for instructions
  let isPortrait = windowHeight > windowWidth;
  
  let maxWidth, maxHeight;
  
  if (isPortrait) {
    // Portrait: instructions on top, use full width
    maxWidth = windowWidth * 0.95;
    maxHeight = windowHeight * 0.70; // Leave space for top instructions
  } else {
    // Landscape: instructions on side, leave space on left
    maxWidth = windowWidth * 0.70; // Leave space for side instructions
    maxHeight = windowHeight * 0.95;
  }
  
  // Keep square aspect ratio, choose smaller dimension
  canvasSize = min(maxWidth, maxHeight);
  scaleFactor = canvasSize / baseSize;
  
  createCanvas(canvasSize, canvasSize);
  
  // Attach canvas to the designated container
  let canvas = document.querySelector('canvas');
  let container = document.getElementById('canvas-container');
  if (container && canvas) {
    container.appendChild(canvas);
  }
  
  // Scale UI elements
  scaleUIElements();
  
  // Create draggable parts (tracker, ECAL, HCAL, muon, magnet)
  let toolboxY = canvasSize * 0.91; // Position at 91% of canvas height
  parts.push(new Part("Magnet", color(255, 50, 150), canvasSize * 0.45, toolboxY));
  parts.push(new Part("ECAL", color(255, 200, 0), canvasSize * 0.567, toolboxY));
  parts.push(new Part("HCAL", color(255, 100, 0), canvasSize * 0.683, toolboxY));
  parts.push(new Part("Muon\n chamber", color(100, 255, 100), canvasSize * 0.8, toolboxY));
  parts.push(new Part("Tracker", color(0, 200, 255), canvasSize * 0.917, toolboxY));
}

function draw() {
  background(240);
  
  // Draw detector outline
  noFill();
  stroke(150);
  for (let r of layerRadii) {
    ellipse(canvasSize/2, canvasSize/2, 2*r, 2*r);
  }
  
  // Draw placed parts
  for (let p of placedParts) {
    if (p) { // Only draw if part exists (not undefined)
      p.drawAt(canvasSize/2, canvasSize/2);
    }
  }
  
  // Draw permanent particle trails (curved paths)
  for (let path of particlePaths) {
    path.display();
  }
  
  // Update and draw active particles
  for (let i = activeParticles.length - 1; i >= 0; i--) {
    let particle = activeParticles[i];
    particle.update();
    particle.display();
    
    if (particle.isFinished()) {
      // Move particle's actual path to permanent display when particle finishes
      particlePaths.push(particle.path);
      activeParticles.splice(i, 1);
    }
  }
  
  // Draw temporary interaction effects (these still fade)
  for (let i = particleTrails.length - 1; i >= 0; i--) {
    let trail = particleTrails[i];
    trail.alpha -= 2; // Fade out
    if (trail.alpha <= 0) {
      particleTrails.splice(i, 1);
    } else {
      trail.display();
    }
  }
  
  // Draw detector parts toolbox with frame
  drawDetectorToolbox();
  
  // Draw draggable toolbox parts
  for (let p of parts) {
    p.display();
  }
  
  // Draw on-screen buttons
  drawButtons();
  
  // Draw particle legend
  drawParticleLegend();
  
//   // Instructions
//   noStroke();
//   fill(50);
//   textAlign(CENTER);
//   text("Press SPACE to simulate a particle collision →", width/2, 40);
//   text("Press C to clear all tracks", width/2, 60);
  
  // Draw collision point indicator
  if (frameCount % 60 < 30) { // Blinking effect
    fill(255, 0, 0, 100);
    noStroke();
    ellipse(canvasSize/2, canvasSize/2, 8 * scaleFactor, 8 * scaleFactor);
  }
}

function mousePressed() {
  // Check for button clicks first
  if (isPointInButton(mouseX, mouseY, fireButton)) {
    fireParticle();
    return; // Don't process drag if button was clicked
  }
  
  if (isPointInButton(mouseX, mouseY, clearButton)) {
    clearTracks();
    return; // Don't process drag if button was clicked
  }
  
  // Check for draggable parts
  for (let p of parts) {
    if (p.isMouseOver()) {
      draggingPart = p;
    }
  }
}

function mouseDragged() {
  if (draggingPart) {
    draggingPart.x = mouseX;
    draggingPart.y = mouseY;
  }
}

function mouseReleased() {
  if (draggingPart) {
    // Snap to closest ring if dropped near detector center
    let d = dist(mouseX, mouseY, canvasSize/2, canvasSize/2);
    for (let i = 0; i < layerRadii.length; i++) {
      if (abs(d - layerRadii[i]) < 20 * scaleFactor) {
        placedParts[i] = draggingPart;
        draggingPart = null;
        return;
      }
    }
    draggingPart = null;
  }
}

function keyPressed() {
  if (key === " ") {
    fireParticle();
  } else if (key === "c" || key === "C") {
    clearTracks();
  }
}

function touchStarted() {
  // Handle touch events the same way as mouse events for buttons
  if (isPointInButton(mouseX, mouseY, fireButton)) {
    fireParticle();
    return false; // Prevent default touch behavior
  }
  
  if (isPointInButton(mouseX, mouseY, clearButton)) {
    clearTracks();
    return false; // Prevent default touch behavior
  }
  
  // Handle dragging for touch devices
  for (let p of parts) {
    if (p.isMouseOver()) {
      draggingPart = p;
      return false; // Prevent default touch behavior
    }
  }
}

function clearTracks() {
  permanentTrails = [];
  particleTrails = [];
  particlePaths = [];
  console.log("All tracks cleared!");
}

function drawParticleLegend() {
  let legendWidth = 140 * scaleFactor;
  let legendHeight = 120 * scaleFactor;
  let legendX = canvasSize - legendWidth - (10 * scaleFactor);
  let legendY = 10 * scaleFactor;
  
  // Legend background
  fill(255, 255, 255, 200);
  stroke(100);
  strokeWeight(1);
  rect(legendX, legendY, legendWidth, legendHeight);
  
  // Legend title
  fill(0);
  noStroke();
  textAlign(LEFT);
  textSize(max(12, 14 * scaleFactor));
  textStyle(BOLD);
  text("Particle Types:", legendX + (5 * scaleFactor), legendY + (20 * scaleFactor));
  
  textSize(max(10, 12 * scaleFactor));
  textStyle(NORMAL);
  
  let lineY = legendY + (35 * scaleFactor);
  let lineSpacing = 15 * scaleFactor;
  
  // Photon entry
  stroke(255, 255, 0);
  strokeWeight(3 * scaleFactor);
  line(legendX + (5 * scaleFactor), lineY, legendX + (25 * scaleFactor), lineY);
  fill(0);
  noStroke();
  text("Photon (neutral)", legendX + (30 * scaleFactor), lineY + (4 * scaleFactor));
  
  lineY += lineSpacing;
  // Electron entry
  stroke(0, 255, 0);
  strokeWeight(3 * scaleFactor);
  line(legendX + (5 * scaleFactor), lineY, legendX + (25 * scaleFactor), lineY);
  fill(0);
  noStroke();
  text("Electron (+)", legendX + (30 * scaleFactor), lineY + (4 * scaleFactor));
  
  lineY += lineSpacing;
  // Muon entry
  stroke(0, 255, 255);
  strokeWeight(3 * scaleFactor);
  line(legendX + (5 * scaleFactor), lineY, legendX + (25 * scaleFactor), lineY);
  fill(0);
  noStroke();
  text("Muon (-)", legendX + (30 * scaleFactor), lineY + (4 * scaleFactor));
  
  lineY += lineSpacing;
  // Hadron entry
  stroke(255, 0, 255);
  strokeWeight(3 * scaleFactor);
  line(legendX + (5 * scaleFactor), lineY, legendX + (25 * scaleFactor), lineY);
  fill(0);
  noStroke();
  text("Hadron (±)", legendX + (30 * scaleFactor), lineY + (4 * scaleFactor));
  
  // Magnetic field note
  textSize(max(9, 12 * scaleFactor));
  fill(100);
  text("Magnetic field:", legendX + (5 * scaleFactor), lineY + (24 * scaleFactor));
  text("into the page (⊗)", legendX + (5 * scaleFactor), lineY + (36 * scaleFactor));
  
  strokeWeight(1); // Reset stroke weight
}

function drawDetectorToolbox() {
  let toolboxX = 20 * scaleFactor;
  let toolboxY = canvasSize * 0.875; // 87.5% down the canvas
  let toolboxW = canvasSize - (40 * scaleFactor); // Full width minus margins
  let toolboxH = 70 * scaleFactor;
  
  // Draw rectangle around detector parts area
  stroke(100);
  strokeWeight(2 * scaleFactor);
  fill(255, 255, 255, 50); // Light transparent background
  rect(toolboxX, toolboxY, toolboxW, toolboxH);
  
  // Label for detector parts
  fill(0);
  noStroke();
  textAlign(LEFT);
  textSize(max(12, 14 * scaleFactor));
  textStyle(BOLD);
  text("Detector Layers:", toolboxX + (5 * scaleFactor), toolboxY + (25 * scaleFactor));
  
  strokeWeight(1); // Reset stroke weight
}

// Enhanced particle simulation
function fireParticle() {
  let types = ["photon", "muon", "hadron", "electron"];
  let particleType = random(types);
  console.log("Particle fired:", particleType);
  
  // Create new particle from center with random direction
  let particle = new Particle(particleType, canvasSize/2, canvasSize/2);
  activeParticles.push(particle);
}

// --- Part class ---
class Part {
  constructor(name, c, x, y) {
    this.name = name;
    this.c = c;
    this.x = x;
    this.y = y;
  }
  
  display() {
    fill(this.c);
    ellipse(this.x, this.y, 40 * scaleFactor, 40 * scaleFactor);
    fill(0);
    textAlign(CENTER);
    textSize(max(10, 12 * scaleFactor));
    text(this.name, this.x, this.y + 30 * scaleFactor);
  }
  
  isMouseOver() {
    return dist(mouseX, mouseY, this.x, this.y) < 20 * scaleFactor;
  }
  
  drawAt(cx, cy) {
    noFill();
    stroke(this.c);
    strokeWeight(8 * scaleFactor);
    ellipse(cx, cy, 2*layerRadii[placedParts.indexOf(this)], 2*layerRadii[placedParts.indexOf(this)]);
    strokeWeight(1);
  }
  
  showInteraction(particle, r) {
    noStroke();
    fill(this.c);
    if (this.name === "ECAL" && particle === "photon") {
      ellipse(width/2, height/2, r/2, r/2);
    }
    if (this.name === "Muon" && particle === "muon") {
      ellipse(width/2, height/2, r/3, r/3);
    }
    if (this.name === "HCAL" && particle === "hadron") {
      ellipse(width/2, height/2, r/2, r/2);
    }
  }
}

// --- Particle class ---
class Particle {
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.startX = x;
    this.startY = y;
    
    // Random direction from center (collision simulation)
    this.angle = random(TWO_PI);
    this.speed = 3;
    this.vx = cos(this.angle) * this.speed;
    this.vy = sin(this.angle) * this.speed;
    
    this.finished = false;
    this.interactions = [];
    this.insideMagnet = false;
    this.fringingSteps = 0; // Counter for fringe field effect
    this.maxFringingSteps = 100; // How long the fringe effect lasts
    
    // Charge and magnetic properties
    if (type === "photon") {
      this.charge = 0; // Neutral - not affected by magnetic field
      this.color = color(255, 255, 0); // Yellow
    } else if (type === "muon") {
      this.charge = -1; // Negatively charged
      this.color = color(0, 255, 255); // Cyan
    } else if (type === "electron") {
      this.charge = 1; // Positively charged (as requested)
      this.color = color(0, 255, 0); // Green
    } else { // hadron (assume charged hadron like pion)
      this.charge = random() > 0.5 ? 1 : -1; // Randomly positive or negative
      this.color = color(255, 0, 255); // Magenta
    }
    
    // Create a path object to store the actual trajectory (after color is set)
    this.path = new ParticlePath(this.color, this.type);
    this.path.addPoint(this.x, this.y);
  }
  
  update() {
    if (this.finished) return;
    
    // Check if we're inside a magnetic field
    let distFromCenter = dist(this.x, this.y, canvasSize/2, canvasSize/2);
    let wasInsideMagnet = this.insideMagnet;
    this.insideMagnet = false;
    
    // Check if we're in a magnet layer
    for (let i = 0; i < placedParts.length; i++) {
      let part = placedParts[i];
      if (part && part.name === "Magnet") {
        if (distFromCenter <= layerRadii[i]) {
          this.insideMagnet = true;
          break;
        }
      }
    }
    
    // Apply magnetic field effect to charged particles
    if (this.charge !== 0) {
      let magneticStrength = 0.05; // Adjust this to make curves stronger/weaker
      
      if (this.insideMagnet) {
        // Curve in one direction inside magnet
        let perpAngle = atan2(this.vy, this.vx) - PI/2; // Changed from +PI/2 to -PI/2
        this.vx += cos(perpAngle) * magneticStrength * this.charge;
        this.vy += sin(perpAngle) * magneticStrength * this.charge;
        this.fringingSteps = 0; // Reset fringing counter when inside
      } else if (wasInsideMagnet || this.fringingSteps > 0) {
        // Apply fringe field effect - curve in opposite direction when exiting magnet
        if (wasInsideMagnet) {
          this.fringingSteps = this.maxFringingSteps; // Start fringing effect
        }
        
        if (this.fringingSteps > 0) {
          // Fringe field strength decreases with distance from magnet
          let fringeStrength = magneticStrength * 1.2 * (this.fringingSteps / this.maxFringingSteps);
          let perpAngle = atan2(this.vy, this.vx) + PI/2; // Changed to +PI/2 (opposite of main field)
          this.vx += cos(perpAngle) * fringeStrength * this.charge;
          this.vy += sin(perpAngle) * fringeStrength * this.charge;
          this.fringingSteps--;
        }
      }
      
      // Normalize speed to keep constant velocity magnitude
      let currentSpeed = sqrt(this.vx * this.vx + this.vy * this.vy);
      if (currentSpeed > 0) {
        this.vx = (this.vx / currentSpeed) * this.speed;
        this.vy = (this.vy / currentSpeed) * this.speed;
      }
    }
    
    // Move in the current direction
    this.x += this.vx;
    this.y += this.vy;
    
    // Record the new position in the path
    this.path.addPoint(this.x, this.y);
    
    // Check for interactions with detector layers
    for (let i = 0; i < placedParts.length; i++) {
      let part = placedParts[i];
      if (part && abs(distFromCenter - layerRadii[i]) < 5 * scaleFactor) {
        // Check if we haven't already interacted with this layer
        if (!this.interactions.includes(i)) {
          this.interactions.push(i);
          this.createInteraction(part, i);
        }
      }
    }
    
    // Particle disappears when it reaches canvas edge
    if (this.x < 0 || this.x > canvasSize || this.y < 0 || this.y > canvasSize) {
      this.finished = true;
      // Don't add trail here - it will be added in draw() when particle finishes
    }
  }
  
  display() {
    // Draw particle
    fill(this.color);
    noStroke();
    ellipse(this.x, this.y, 8 * scaleFactor, 8 * scaleFactor);
    
    // Draw current path (live trail)
    this.path.display();
  }
  
  createInteraction(part, layerIndex) {
    let shouldInteract = false;
    let interactionColor = part.c;
    
    // Determine if particle interacts with this detector layer
    if (this.type === "photon" || this.type === "electron") {
      // Photons and electrons get absorbed in all dense materials except tracker
      if (part.name !== "Tracker") {
        shouldInteract = true;
        this.finished = true; // Photon/electron gets absorbed
      }
    } else if (this.type === "hadron") {
      // Hadrons get absorbed in HCAL, Magnet, and Muon chamber
      if (part.name === "HCAL" || part.name === "Magnet" || part.name === "Muon") {
        shouldInteract = true;
        this.finished = true; // Hadron gets absorbed
      } else if (part.name === "ECAL") {
        shouldInteract = true;
        // Hadron interacts with ECAL but doesn't get fully absorbed (some energy loss)
      }
    } else if (this.type === "muon") {
      // Muons pass through most detectors but leave signals
      if (part.name === "Muon") {
        shouldInteract = true;
        // Muon passes through but leaves a signal in muon chamber
      }
    }    
    if (shouldInteract) {
      // Create visual interaction effect
      for (let i = 0; i < 20; i++) {
        let angle = random(TWO_PI);
        let radius = random(10, 30);
        let fx = this.x + cos(angle) * radius;
        let fy = this.y + sin(angle) * radius;
        particleTrails.push(new InteractionEffect(fx, fy, interactionColor));
      }
    }
  }
  
  isFinished() {
    return this.finished;
  }
}

// --- Trail class ---
class Trail {
  constructor(x1, y1, x2, y2, c) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.color = c;
    this.alpha = 255;
  }
  
  display() {
    stroke(red(this.color), green(this.color), blue(this.color), this.alpha);
    strokeWeight(2);
    line(this.x1, this.y1, this.x2, this.y2);
  }
}

// --- Permanent Trail class ---
class PermanentTrail {
  constructor(x1, y1, x2, y2, c) {
    this.x1 = x1;
    this.y1 = y1;
    this.x2 = x2;
    this.y2 = y2;
    this.color = c;
  }
  
  display() {
    stroke(red(this.color), green(this.color), blue(this.color), 200);
    strokeWeight(2);
    line(this.x1, this.y1, this.x2, this.y2);
  }
}

// --- Interaction Effect class ---
class InteractionEffect {
  constructor(x, y, c) {
    this.x = x;
    this.y = y;
    this.color = c;
    this.alpha = 255;
    this.size = random(3, 8);
  }
  
  display() {
    fill(red(this.color), green(this.color), blue(this.color), this.alpha);
    noStroke();
    ellipse(this.x, this.y, this.size, this.size);
  }
}

// --- Particle Path class ---
class ParticlePath {
  constructor(color, particleType) {
    this.points = [];
    this.color = color;
    this.particleType = particleType;
  }
  
  addPoint(x, y) {
    this.points.push({x: x, y: y});
  }
  
  display() {
    if (this.points.length < 2) return;
    
    stroke(red(this.color), green(this.color), blue(this.color), 200);
    strokeWeight(2);
    noFill();
    
    if (this.particleType === "photon") {
      // Draw dashed line for photons
      this.drawDashedPath();
    } else {
      // Draw solid line for other particles
      beginShape();
      for (let i = 0; i < this.points.length; i++) {
        vertex(this.points[i].x, this.points[i].y);
      }
      endShape();
    }
  }
  
  drawDashedPath() {
    let dashLength = 8;
    let gapLength = 8;
    let totalLength = 0;
    
    // First, calculate total path length and create accumulated distance array
    let accumulatedDistances = [0];
    for (let i = 0; i < this.points.length - 1; i++) {
      let segmentLength = dist(this.points[i].x, this.points[i].y, 
                              this.points[i + 1].x, this.points[i + 1].y);
      totalLength += segmentLength;
      accumulatedDistances.push(totalLength);
    }
    
    // Now draw dashes along the total path
    let currentDistance = 0;
    let dashOn = true;
    
    while (currentDistance < totalLength) {
      let nextDistance = currentDistance + (dashOn ? dashLength : gapLength);
      if (nextDistance > totalLength) nextDistance = totalLength;
      
      if (dashOn) {
        // Find start and end points for this dash
        let startPoint = this.getPointAtDistance(currentDistance, accumulatedDistances);
        let endPoint = this.getPointAtDistance(nextDistance, accumulatedDistances);
        
        if (startPoint && endPoint) {
          line(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
        }
      }
      
      currentDistance = nextDistance;
      dashOn = !dashOn;
    }
  }
  
  getPointAtDistance(targetDistance, accumulatedDistances) {
    // Find which segment contains this distance
    for (let i = 0; i < accumulatedDistances.length - 1; i++) {
      if (targetDistance <= accumulatedDistances[i + 1]) {
        let segmentStart = accumulatedDistances[i];
        let segmentEnd = accumulatedDistances[i + 1];
        let segmentLength = segmentEnd - segmentStart;
        
        if (segmentLength === 0) return this.points[i];
        
        let ratio = (targetDistance - segmentStart) / segmentLength;
        
        return {
          x: lerp(this.points[i].x, this.points[i + 1].x, ratio),
          y: lerp(this.points[i].y, this.points[i + 1].y, ratio)
        };
      }
    }
    
    return this.points[this.points.length - 1];
  }
}
