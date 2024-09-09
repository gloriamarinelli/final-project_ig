import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/* SCENE SETUP */
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.shadowMap.enabled = true;
camera.position.set(0, 5, 17);
new OrbitControls(camera, renderer.domElement);

const skyColor = 0x000011;
const fogOpacity = 0.01;
scene.fog = new THREE.FogExp2(skyColor, fogOpacity);

const loader = new GLTFLoader();

/* MUSIC */
const backgroundMusic = document.getElementById("background-music");
backgroundMusic.play();

/* LIGHTS */
function createLight() {
  const light = new THREE.DirectionalLight(0xffffff, 0.8);
  light.position.y = 5;
  light.position.z = 1;
  light.castShadow = true;
  scene.add(new THREE.AmbientLight(0xffffff, 1));
  scene.add(light);
}

createLight();

/* TIME & LIVES */
let lives = 3;
let startTime = Date.now();
let elapsedTime = 0;

const livesBox = document.createElement("div");
livesBox.style.position = "absolute";
livesBox.style.top = "10px";
livesBox.style.left = "10px";
livesBox.style.display = "flex";
document.body.appendChild(livesBox);

const timerDisplay = document.createElement("div");
timerDisplay.style.position = "absolute";
timerDisplay.style.top = "40px";
timerDisplay.style.left = "10px";
timerDisplay.style.color = "white";
timerDisplay.style.fontSize = "24px";
document.body.appendChild(timerDisplay);

function updateTimeLives() {
  elapsedTime = (Date.now() - startTime) / 1000;
  timerDisplay.innerHTML = `Time: ${elapsedTime.toFixed(0)}s`;

  livesBox.innerHTML = "";

  for (let i = 0; i < lives; i++) {
    const heart = document.createElement("img");
    heart.src = "textures/heart.webp";
    heart.style.width = "32px";
    heart.style.height = "32px";
    livesBox.appendChild(heart);
  }
}

/*STARS AND PLANETS*/
function createStars(numStars) {
  const stars = new THREE.BufferGeometry();
  const starPositions = new Float32Array(numStars * 3); //x, y, z values

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 10,
    map: new THREE.TextureLoader().load("textures/star.png"),
    blending: THREE.AdditiveBlending, //blend with the bg
    transparent: false,
    depthWrite: false,
  });

  for (let i = 0; i < numStars; i++) {
    const x = Math.random() * 500 - 250;
    const y = Math.random() * 500 - 250;
    const z = Math.random() * 500 - 250;

    starPositions[i * 3] = x;
    starPositions[i * 3 + 1] = y;
    starPositions[i * 3 + 2] = z;
  }

  stars.setAttribute("position", new THREE.BufferAttribute(starPositions, 3)); //geometry with star positions
  const starSystem = new THREE.Points(stars, material);

  scene.add(starSystem);
}

createStars(1800);

function createPlanet(size, texture, position) {
  const geometry = new THREE.SphereGeometry(size, 32, 32); //32, 32 num. segments that affect smoothness of the surface
  const material = new THREE.MeshStandardMaterial({
    map: new THREE.TextureLoader().load(texture),
  });
  const planet = new THREE.Mesh(geometry, material);

  planet.position.set(position.x, position.y, position.z);
  planet.castShadow = true;

  planet.rotationSpeed = {
    x: Math.random() * 0.01,
    y: Math.random() * 0.01,
    z: Math.random() * 0.01,
  };

  return planet;
}

const planetTextures = [
  "textures/planet1.jpg",
  "textures/planet2.jpg",
  "textures/planet3.jpg",
  "textures/planet4.jpg",
];

const planets = [];
const numPlanets = Math.floor(Math.random() * 11) + 30;

for (let i = 0; i < numPlanets; i++) {
  const size = Math.random() * 30 + 10;

  const texture =
    planetTextures[Math.floor(Math.random() * planetTextures.length)];

  const position = {
    x: THREE.MathUtils.randFloatSpread(400),
    y: THREE.MathUtils.randFloatSpread(400),
    z: THREE.MathUtils.randFloatSpread(400) - 50,
  };

  const planet = createPlanet(size, texture, position);
  scene.add(planet);
  planets.push(planet);
}

/*BASE WITH PHISICS*/
class Box extends THREE.Mesh {
  constructor({
    width,
    height,
    depth,
    color = 0xffffff,
    position = { x: 0, y: 0, z: 0 },
    texture = null,
  }) {
    const material = texture
      ? new THREE.MeshStandardMaterial({ map: texture })
      : new THREE.MeshStandardMaterial({ color });

    const geometry = new THREE.BoxGeometry(width, height, depth);

    super(geometry, material);

    this.dimensions = { width, height, depth };
    this.position.set(position.x, position.y, position.z);

    this.updateCollisionBounds();
  }

  updateCollisionBounds() {
    this.right = this.position.x + this.dimensions.width / 2;
    this.left = this.position.x - this.dimensions.width / 2;

    this.bottom = this.position.y - this.dimensions.height / 2;
    this.top = this.position.y + this.dimensions.height / 2;

    this.front = this.position.z + this.dimensions.depth / 2;
    this.back = this.position.z - this.dimensions.depth / 2;
  }
}

const baseTexture = new THREE.TextureLoader().load("textures/base2.png");
const base = new Box({
  width: 17,
  height: 1,
  depth: 30,
  color: baseTexture,
  position: { x: 0, y: -2, z: 0 },
  texture: baseTexture,
});
base.receiveShadow = true;
scene.add(base);

/* CHARACTER */
class Character {
  constructor(gltf) {
    this.model = gltf.scene;
    this.model.position.set(0, -0.2, 10);
    this.model.scale.set(1.3, 1.3, 1.3);
    this.model.castShadow = true;
    this.model.rotation.y = Math.PI;
    this.speed = { x: 0, y: 0, z: 0 };
    this.gravity = -0.001;

    scene.add(this.model);

    this.isJumping = false;
    this.jumpStart = 0;
    this.jumpDuration = 1500;

    this.model.traverse((object) => {
      if (object.isBone) {
        if (object.name === "J_momo_L_026") this.leftLeg = object;
        if (object.name === "J_momo_R_031") this.rightLeg = object;
        if (object.name === "J_ude_L_017") this.leftArm = object;
        if (object.name === "J_ude_R_022") this.rightArm = object;
        if (object.name === "J_root_04") this.rootBone = object;
      }
    });

    if (this.rootBone) {
      this.rootBone.position.y = -1; //feet on the base
    }
  }

  update(base) {
    this.applyGravity();
    this.collisionBase(base);
    this.updatePosition();
    this.animateBones();
  }

  applyGravity() {
    if (!this.isJumping) {
      this.speed.y += this.gravity;
    }
  }

  collisionBase(base) {
    if (this.speed.y <= 0 && detectCollision({ character: this, base: base })) {
      this.speed.y = -0.2; //feet on the base
      this.model.position.y = base.top + this.model.scale.y / 2;
      this.isJumping = false;
    }
  }

  updatePosition() {
    this.model.position.x += this.speed.x;
    this.model.position.y += this.speed.y;
    this.model.position.z += this.speed.z;
  }

  animateBones() {
    const time = Date.now() * 0.005;

    if (this.isJumping) {
      const jumpProgress = (Date.now() - this.jumpStart) / this.jumpDuration;

      if (jumpProgress < 0.5) {
        // % of the jump completed
        //ascending
        if (this.leftLeg && this.rightLeg) {
          this.leftLeg.rotation.x = (-Math.PI / 4) * jumpProgress * 2;
          this.rightLeg.rotation.x = (-Math.PI / 4) * jumpProgress * 2;
        }
      } else {
        //descending
        if (this.leftLeg && this.rightLeg) {
          this.leftLeg.rotation.x =
            (-Math.PI / 4) * (1 - (jumpProgress - 0.5) * 2);
          this.rightLeg.rotation.x =
            (-Math.PI / 4) * (1 - (jumpProgress - 0.5) * 2);
        }
      }

      if (jumpProgress < 0.5) {
        this.speed.y = 0.15 * (1 - jumpProgress * 2);
      } else {
        this.speed.y = -0.15 * (jumpProgress * 2 - 1);
      }

      if (jumpProgress >= 1) {
        this.isJumping = false;
      }
    } else {
      if (
        movement.ArrowLeft.active ||
        movement.ArrowRight.active ||
        movement.ArrowUp.active ||
        movement.ArrowDown.active
      ) {
        if (this.leftLeg && this.rightLeg) {
          this.leftLeg.rotation.x = Math.sin(time) * 0.5; //0.5 amplitude
          this.rightLeg.rotation.x = Math.cos(time) * 0.5;
        }

        if (this.leftArm && this.rightArm) {
          this.leftArm.rotation.x = Math.cos(time) * 0.3; //0.3 amplitude
          this.rightArm.rotation.x = Math.sin(time) * 0.3;
        }
      } else {
        if (this.leftLeg && this.rightLeg) {
          this.leftLeg.rotation.x = 0;
          this.rightLeg.rotation.x = 0;
        }

        if (this.leftArm && this.rightArm) {
          this.leftArm.rotation.x = 0;
          this.rightArm.rotation.x = 0;
        }
      }
    }
  }
}

let character;
loader.load("models/digimon.glb", (gltf) => {
  character = new Character(gltf);
});

/* MONSTER */
class Monster {
  constructor(gltf) {
    this.model = gltf.scene;
    this.model.position.set(0, -1.5, -12);
    this.model.scale.set(150, 150, 150);
    this.model.castShadow = true;
    this.model.receiveShadow = true;
    this.tentacleBones = [];
    this.bigTentacle = null;
    this.balls = [];

    this.spawnRate = 1;
    this.maxBalls = 20;
    this.spawnInterval = 2000;
    this.lastSpawn = Date.now();

    this.model.traverse((object) => {
      if (object.isBone && object.name.includes("Stalk")) {
        this.tentacleBones.push(object);
      }
    });
    //https://threejs.org/editor/

    this.bigTentacle = this.tentacleBones.reduce((biggest, bone) => {
      return biggest && bone.scale.length() > biggest.scale.length()
        ? bone
        : biggest;
    }, null);

    scene.add(this.model);
  }

  animateTentacles() {
    const time = Date.now() * 0.001;

    this.tentacleBones.forEach((bone, index) => {
      const angle = -Math.sin(time + index) * 1; //creating a waving effect
      bone.rotation.z = angle;
    });

    if (this.bigTentacle) {
      const bigTentacleAngle = Math.sin(time) * 1.5; //larger oscillation amplitude (1.5)
      this.bigTentacle.rotation.z = bigTentacleAngle;
    }

    this.handleBallSpawing();
  }

  handleBallSpawing() {
    const currentTime = Date.now();

    if (currentTime - this.lastSpawn >= this.spawnInterval) {
      //time passed from last ball to create new balls
      this.throwBalls();

      this.spawnRate = Math.min(this.spawnRate + 1, this.maxBalls);

      this.lastSpawn = currentTime;
    }

    this.balls.forEach((ball) => {
      ball.update();
    });
  }

  throwBalls() {
    for (let i = 0; i < this.spawnRate; i++) {
      const tentacle = this.tentacleBones[i % this.tentacleBones.length]; //loop through tentacles

      const tentaclePosition = new THREE.Vector3();
      tentacle.getWorldPosition(tentaclePosition);

      const direction = character.model.position
        .clone() //copy character position
        .sub(tentaclePosition)
        .normalize(); //length of 1

      const ball = new Ball(tentaclePosition, direction);
      this.balls.push(ball);
    }
  }
}

let monster;
loader.load("models/space_turnip.glb", (gltf) => {
  monster = new Monster(gltf);
});

/* HIT SOUND */
const hitSound = new Audio("music/sword-slash-with-metallic-impact-185435.mp3");

function playHitSound() {
  hitSound.play().catch((error) => {
    console.error("Error:", error);
  });
}

/* BALLS */
const balls = [];

class Ball {
  constructor(position, direction) {
    this.speed = 0.1;
    this.direction = direction;

    const geometry = new THREE.SphereGeometry(0.3, 8, 8);
    const ballTexture = new THREE.TextureLoader().load("textures/green.jpg");
    const material = new THREE.MeshBasicMaterial({ map: ballTexture });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    scene.add(this.mesh);

    this.boundingSphere = new THREE.Sphere(this.mesh.position, 0.1);
    this.collision = false;
  }

  update() {
    this.mesh.position.add(this.direction.clone().multiplyScalar(this.speed));

    this.boundingSphere.center.copy(this.mesh.position);

    this.checkCollision();
  }

  checkCollision() {
    if (!character || this.collision) return;

    const characterBoundingSphere = new THREE.Sphere(
      character.model.position,
      character.model.scale.x * 0.5
    );

    if (this.boundingSphere.intersectsSphere(characterBoundingSphere)) {
      console.log("Hit");

      this.collision = true;

      playHitSound();

      scene.remove(this.mesh);
      const index = balls.indexOf(this);
      if (index > -1) {
        balls.splice(index, 1);
      }

      lives--;

      if (lives <= 0) {
        window.location.href = "game_over.html";
      }
    }
  }
}

function updateBallsArray() {
  balls.forEach((ball) => {
    ball.update();
  });
}

/* MOVEMENT */
const movement = {
  ArrowLeft: {
    active: false,
  },
  ArrowRight: {
    active: false,
  },
  ArrowUp: {
    active: false,
  },
  ArrowDown: {
    active: false,
  },
};

function movementArrow(e, isPressed) {
  switch (e.code) {
    case "ArrowLeft":
      movement.ArrowLeft.active = isPressed;
      break;
    case "ArrowRight":
      movement.ArrowRight.active = isPressed;
      break;
    case "ArrowUp":
      movement.ArrowUp.active = isPressed;
      break;
    case "ArrowDown":
      movement.ArrowDown.active = isPressed;
      break;
  }
}

function characterJump(e) {
  if (e.code === "Space") {
    if (
      character &&
      !character.isJumping &&
      detectCollision({ character: character, base: base })
    ) {
      character.isJumping = true;
      character.jumpStart = Date.now();
      character.speed.y = 0.001;
      console.log("Jump");
    }
  }
}

window.addEventListener("keydown", (e) => {
  movementArrow(e, true);
  characterJump(e);
});

window.addEventListener("keyup", (e) => {
  movementArrow(e, false);
});

/* COLLISION DETECTION */
function detectCollision({ character, base }) {
  const char = character instanceof Character ? character.model : character;

  const charLeft = char.position.x - char.scale.x / 2;
  const charRight = char.position.x + char.scale.x / 2;
  const charBottom = char.position.y - char.scale.y / 2;
  const charTop = char.position.y + char.scale.y / 2;
  const charBack = char.position.z - char.scale.z / 2;
  const charFront = char.position.z + char.scale.z / 2;

  const baseLeft = base.left;
  const baseRight = base.right;
  const baseBottom = base.bottom;
  const baseTop = base.top;
  const baseBack = base.back;
  const baseFront = base.front;

  const collisionX = charRight >= baseLeft && charLeft <= baseRight;
  const collisionZ = charFront >= baseBack && charBack <= baseFront;
  const collisionY = charTop >= baseBottom && charBottom <= baseTop;

  return collisionX && collisionZ && collisionY;
}

function isOutOfBounds(character) {
  return character.model.position.y < -3;
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);

  if (character) {
    if (character instanceof Character) {
      character.speed.x = 0;
      character.speed.z = 0;

      if (movement.ArrowLeft.active) {
        character.speed.x = -0.04;
      } else if (movement.ArrowRight.active) {
        character.speed.x = 0.04;
      }

      if (movement.ArrowUp.active) {
        character.speed.z = -0.04;
      } else if (movement.ArrowDown.active) {
        character.speed.z = 0.04;
      }

      character.update(base);
    }
  }

  if (monster) {
    monster.animateTentacles();
  }

  if (character && isOutOfBounds(character)) {
    console.log("Character out of bounds");
    window.location.href = "game_over.html";
  }

  planets.forEach((planet) => {
    planet.rotation.x += planet.rotationSpeed.x;
    planet.rotation.y += planet.rotationSpeed.y;
    planet.rotation.z += planet.rotationSpeed.z;
  });

  updateBallsArray();

  updateTimeLives();
}

animate();
