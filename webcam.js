let detector;
let detectorConfig;
let poses;
let video;
let skeleton = true;
let elbowAngle = 999;
let backAngle = 0;
let reps = 0;
let upPosition = false;
let downPosition = false;
let highlightBack = false;
let backWarningGiven = false;
let edges;

async function init() {
  detectorConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
  };

  detector = await poseDetection.createDetector(
    poseDetection.SupportedModels.MoveNet,
    detectorConfig
  );

  edges = {
    "5,7": "m",
    "7,9": "m",
    "6,8": "c",
    "8,10": "c",
    "5,6": "y",
    "5,11": "m",
    "6,12": "c",
    "11,12": "y",
    "11,13": "m",
    "13,15": "m",
    "12,14": "c",
    "14,16": "c",
  };

  await getPoses();
}

function videoReady() {
  // Video initialized
}

async function setup() {
  createCanvas(1000, 1000);
  video = createCapture(VIDEO, videoReady);
  video.hide();

  var msg = new SpeechSynthesisUtterance("Loading, please wait...");
  window.speechSynthesis.speak(msg);

  await init();
}

async function getPoses() {
  if (detector && video) {
    poses = await detector.estimatePoses(video.elt);
  }
  requestAnimationFrame(getPoses); // smoother than setTimeout
}

function draw() {
  background(220);
  translate(width, 0);
  scale(-1, 1);
  image(video, 0, 0, width, height);

  drawKeypoints();
  if (skeleton) drawSkeleton();

  fill(255);
  strokeWeight(2);
  stroke(51);
  textSize(40);

  if (poses && poses.length > 0) {
    let pushupString = `Push-ups completed: ${reps}`;
    text(pushupString, 100, 90);
  } else {
    text("Loading, please wait...", 100, 90);
  }
}

function drawKeypoints() {
  if (!poses || poses.length === 0) return;

  let count = 0;
  for (let kp of poses[0].keypoints) {
    const { x, y, score } = kp;
    if (score > 0.3) {
      count++;
      fill(255);
      stroke(0);
      strokeWeight(4);
      circle(x, y, 16);
    }
  }

  if (count === 17) {
    // full body visible
  }

  updateArmAngle();
  updateBackAngle();
  inUpPosition();
  inDownPosition();
}

function drawSkeleton() {
  if (!poses || poses.length === 0) return;

  let confidence_threshold = 0.5;

  for (const [key] of Object.entries(edges)) {
    let [p1, p2] = key.split(",").map((v) => parseInt(v));

    const kp1 = poses[0].keypoints[p1];
    const kp2 = poses[0].keypoints[p2];

    if (!kp1 || !kp2) continue;

    if (kp1.score > confidence_threshold && kp2.score > confidence_threshold) {
      if (
        highlightBack &&
        (p2 === 11 || (p1 === 6 && p2 === 12) || p2 === 13 || p1 === 12)
      ) {
        strokeWeight(3);
        stroke(255, 0, 0);
        line(kp1.x, kp1.y, kp2.x, kp2.y);
      } else {
        strokeWeight(2);
        stroke("rgb(0, 255, 0)");
        line(kp1.x, kp1.y, kp2.x, kp2.y);
      }
    }
  }
}

function updateArmAngle() {
  if (!poses || poses.length === 0) return;

  let leftWrist = poses[0].keypoints[9];
  let leftElbow = poses[0].keypoints[7];
  let leftShoulder = poses[0].keypoints[5];

  if (!leftWrist || !leftElbow || !leftShoulder) return;

  if (
    leftWrist.score > 0.3 &&
    leftElbow.score > 0.3 &&
    leftShoulder.score > 0.3
  ) {
    let angle =
      (Math.atan2(leftWrist.y - leftElbow.y, leftWrist.x - leftElbow.x) -
        Math.atan2(
          leftShoulder.y - leftElbow.y,
          leftShoulder.x - leftElbow.x
        )) *
      (180 / Math.PI);

    elbowAngle = angle;
  }
}

function updateBackAngle() {
  if (!poses || poses.length === 0) return;

  let leftShoulder = poses[0].keypoints[5];
  let leftHip = poses[0].keypoints[11];
  let leftKnee = poses[0].keypoints[13];

  if (!leftShoulder || !leftHip || !leftKnee) return;

  if (leftShoulder.score > 0.3 && leftHip.score > 0.3 && leftKnee.score > 0.3) {
    let angle =
      (Math.atan2(leftKnee.y - leftHip.y, leftKnee.x - leftHip.x) -
        Math.atan2(leftShoulder.y - leftHip.y, leftShoulder.x - leftHip.x)) *
      (180 / Math.PI);
    angle = angle % 180;
    backAngle = angle;

    if (backAngle < 20 || backAngle > 160) {
      highlightBack = false;
      backWarningGiven = false;
    } else {
      highlightBack = true;
      if (!backWarningGiven) {
        var msg = new SpeechSynthesisUtterance("Keep your back straight");
        window.speechSynthesis.speak(msg);
        backWarningGiven = true;
      }
    }
  }
}

function inUpPosition() {
  if (elbowAngle > 170 && elbowAngle < 200) {
    if (downPosition) {
      var msg = new SpeechSynthesisUtterance(String(reps + 1));
      window.speechSynthesis.speak(msg);
      reps++;
    }
    upPosition = true;
    downPosition = false;
  }
}

function inDownPosition() {
  if (!poses || poses.length === 0) return;

  let elbowAboveNose = poses[0].keypoints[0].y > poses[0].keypoints[7].y;

  if (
    !highlightBack &&
    elbowAboveNose &&
    Math.abs(elbowAngle) > 70 &&
    Math.abs(elbowAngle) < 100
  ) {
    if (upPosition) {
      var msg = new SpeechSynthesisUtterance("Up");
      window.speechSynthesis.speak(msg);
    }
    downPosition = true;
    upPosition = false;
  }
}
