// @ts-nocheck

let video;
let classifier;
let mappings;

let label = "Loading MobileNet...";
let confidence = 0;
let currentRecord = null;
let jsonStatus = "Loading JSON...";

// Memory system
let history = [];
let lastRecordedLabel = "";
let lastRecordTime = 0;
let clearButton;

const MAX_MEMORIES = 25;
const MEMORY_LIFETIME = 30000;
const RECORD_COOLDOWN = 2000;

function preload() {
  classifier = ml5.imageClassifier("MobileNet");

  mappings = loadJSON(
    "finalImageNetLabelsAndEmojis.json",
    function (data) {
      console.log("JSON loaded:", data);
      jsonStatus = "JSON loaded";
    },
    function (error) {
      console.error("JSON error:", error);
      jsonStatus = "JSON failed";
    },
  );
}

function setup() {
  createCanvas(640, 760);

  video = createCapture(VIDEO);
  video.size(640, 480);
  video.hide();

  clearButton = createButton("CLEAR MEMORY");
  clearButton.mousePressed(clearMemory);
  clearButton.style("background", "#222");
  clearButton.style("color", "#fff");
  clearButton.style("border", "1px solid #888");
  clearButton.style("padding", "10px 18px");
  clearButton.style("cursor", "pointer");
  clearButton.style("font-family", "monospace");
  clearButton.position(20, 720);

  classifier.classifyStart(video, gotResults);
}

function draw() {
  background(15);

  // LIVE WEBCAM
  // Cinematic crop — maintains natural proportions
  let sourceWidth = 640;
  let sourceHeight = 350 * (480 / 350);
  let sourceY = (480 - 350) / 2;

  image(video, 0, 0, 640, 350, 0, 65, 640, 350);
  fill(255);
  textAlign(LEFT, BASELINE);
  textSize(12);
  text("LIVE INPUT / MOBILENET", 20, 375);

  // MODEL OUTPUT
  textSize(15);
  text("Prediction: " + label, 20, 405, 600);
  text("Confidence: " + (confidence * 100).toFixed(1) + "%", 20, 435);

  // JSON TRANSLATION
  let category = currentRecord ? currentRecord.workshopCategory : "Unknown";

  let parent = currentRecord ? currentRecord.wordnetParent : "Unknown";

  let emoji = currentRecord ? currentRecord.emoji : "❓";

  fill(130, 220, 160);
  textSize(12);
  text("JSON TRANSLATION", 20, 470);

  fill(255);
  textSize(14);
  text("WordNet: " + parent, 20, 495, 480);
  text("Category: " + category, 20, 520);

  // Confidence-responsive emoji
  let emojiSize = map(confidence, 0, 1, 30, 110);

  textAlign(CENTER, CENTER);
  textSize(emojiSize);
  text(emoji, 545, 480);

  textAlign(LEFT, BASELINE);

  // MEMORY ARCHIVE
  stroke(65);
  line(20, 550, 620, 550);
  noStroke();

  fill(130, 220, 160);
  textSize(12);
  text("MEMORY ARCHIVE / PAST PREDICTIONS", 20, 575);

  fill(150);
  textSize(11);
  text(history.length + " memories", 20, 595);

  drawMemories();

  if (history.length === 0) {
    fill(130);
    textSize(13);
    text("Waiting for previous classifications...", 20, 650);
  }
}

function gotResults(results) {
  if (!results || results.length === 0) return;

  label = results[0].label;
  confidence = results[0].confidence;

  currentRecord = findMatchingRecord(label);

  recordMemory();
}

// JSON MATCHING
function findMatchingRecord(predictedLabel) {
  if (!mappings) return null;

  let records = Array.isArray(mappings) ? mappings : Object.values(mappings);

  let normalized = predictedLabel.toLowerCase().trim();
  let firstTerm = normalized.split(",")[0].trim();

  let match = records.find(
    (record) =>
      record.label && record.label.toLowerCase().trim() === normalized,
  );

  if (!match) {
    match = records.find(
      (record) =>
        record.label &&
        record.label
          .toLowerCase()
          .split(",")
          .some((term) => term.trim() === firstTerm),
    );
  }

  return match || null;
}

// RECORD MEMORY
function recordMemory() {
  let now = millis();

  // Only record a changed label after cooldown
  if (label === lastRecordedLabel) return;
  if (now - lastRecordTime < RECORD_COOLDOWN) return;

  lastRecordedLabel = label;
  lastRecordTime = now;

  let emoji = currentRecord ? currentRecord.emoji : "❓";

  let memory = {
    label: label,
    emoji: emoji,
    confidence: confidence,
    x: random(35, 605),
    y: random(620, 700),
    age: 0,
    createdAt: now,
    drift: random(-0.3, 0.3),
    phase: random(TWO_PI),
  };

  history.push(memory);

  if (history.length > MAX_MEMORIES) {
    history.shift();
  }
}

// DRAW FLOATING MEMORIES
function drawMemories() {
  let now = millis();

  for (let i = history.length - 1; i >= 0; i--) {
    let memory = history[i];

    memory.age = now - memory.createdAt;

    // Remove expired memories
    if (memory.age > MEMORY_LIFETIME) {
      history.splice(i, 1);
      continue;
    }

    let opacity = map(memory.age, 0, MEMORY_LIFETIME, 255, 0);

    let size = map(memory.confidence, 0, 1, 20, 55);

    memory.x += memory.drift;

    let floatingY = memory.y + sin(now * 0.001 + memory.phase) * 8;

    push();
    textAlign(CENTER, CENTER);
    textSize(size);

    // Fade emoji particles
    drawingContext.globalAlpha = opacity / 255;
    text(memory.emoji, memory.x, floatingY);
    drawingContext.globalAlpha = 1;

    pop();
  }
}

// CLEAR MEMORY
function clearMemory() {
  history = [];
  lastRecordedLabel = "";
  lastRecordTime = millis();
}
