import {
  BoxGeometry,
  Math as ThreeMath,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  TextureLoader,
  WebGLRenderer,
  Vector3
} from './lib/three';
import VRControls from './lib/VRControls';
import WebXRPolyfill from 'webxr-polyfill';
import IMG_SQUARE from './square_small.jpeg';

let currentSession = null;

class FallbackPositioner {
  constructor() {
    this.focalLat = 0.0;
    this.focalLon = 0.0;
    this.userInteracting = false;
    this.userInteractionOffsetX = 0.0;
    this.userInteractionOffsetY = 0.0;

    this.target = new Vector3( 0, 0, 0 );

    document.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    document.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    document.addEventListener('pointerup', (e) => this.handlePointerUp(e));
  }

  updateCamera(camera) {
    this.focalLat = Math.max( - 85, Math.min( 85, this.focalLat ) );
    const phi = ThreeMath.degToRad( 90 - this.focalLat );
    const theta = ThreeMath.degToRad( this.focalLon );
    this.target.x = 500 * Math.sin( phi ) * Math.cos( theta );
    this.target.y = 500 * Math.cos( phi );
    this.target.z = 500 * Math.sin( phi ) * Math.sin( theta );
    camera.lookAt( this.target );
  }

  handlePointerDown(event) {
    this.userInteracting = true;
    this.userInteractionOffsetX = event.clientX;
    this.userInteractionOffsetY = event.clientY;
  }

  handlePointerMove (event) {
    if (this.userInteracting) {
      const clientX = event.clientX;
      const clientY = event.clientY;
      const deltaX = clientX - this.userInteractionOffsetX;
      const deltaY = clientY - this.userInteractionOffsetY;
      this.focalLat += deltaY * 0.1;
      this.focalLon += -deltaX * 0.1;
      this.userInteractionOffsetX = clientX;
      this.userInteractionOffsetY = clientY;
      console.log('deltaX: %o; detlaY: %o; focalLat: %o; focalLon: %o',
        deltaX, deltaY, this.focalLat, this.focalLon);
    }
  }

  handlePointerUp() {
    this.userInteracting = false;
  }
}

class DevicePositioner {
  constructor(display) {
    this.display = display;
  }

  updateCamera(camera) {
    // console.log(this.display.pose);
  }
}

function createCube() {
  const geometry = new BoxGeometry(1, 1, 1);
  const material = new MeshBasicMaterial({color: 0x006600});
  const cube = new Mesh(geometry, material);
  cube.rotation.x = 45;
  cube.rotation.y = 45;
  return cube;
}

function createViewer(textureLoader) {
  const geometry = new SphereGeometry(500, 60, 40);
  geometry.scale(-1, 1, 1);
  const material = new MeshBasicMaterial({
    map: textureLoader.load(IMG_SQUARE)
  });

  const viewer = new Mesh(geometry, material);
  viewer.rotation.y = -Math.PI / 2;
  return viewer;
}

function beginXRSession(device) {
  if (currentSession === null) {
    device.requestSession({immersive: true}).then((session) => {
      console.log('session started.');
      currentSession = session;
      runExperience(device, session);
    });
  } else {
    console.log('Ending session.');
    currentSession.end();
  }
}

function runExperience(device, session) {
  const scene = new Scene();
  const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);


  const textureLoader = new TextureLoader();

  const vrControls = new VRControls(camera);
  let positioner = new FallbackPositioner();

  // if (navigator.getVRDisplays) {
  //   navigator.getVRDisplays().then((displays) => {
  //     console.log('Displays: %o', displays);
  //     positioner = new DevicePositioner(displays[0]);
  //   });
  // } else {
  //   console.warn('navigator.getVRDisplays not available.');
  // }

  const canvas = document.createElement('canvas');
  // document.body.appendChild(canvas);
  const gl = canvas.getContext('webgl', {
    compatibleXRDevice: session.device
  });
  const renderer = new WebGLRenderer({
    canvas: canvas,
    context: gl
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.vr.enabled = true;
  renderer.vr.setDevice(device);
  renderer.vr.setSession(session);

  document.body.appendChild(renderer.domElement);

  console.log('Renderer installed.');

  scene.add(createViewer(textureLoader));
  const cube = createCube();
  cube.position.x = -5;
  scene.add(cube);

  console.log('Cube installed.');

  renderer.setAnimationLoop(() => {
    vrControls.update();

    positioner.updateCamera(camera);

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
  });
  // const animate = () => {
  //   requestAnimationFrame(animate);
  //   vrControls.update();

  //   positioner.updateCamera(camera);

  //   cube.rotation.x += 0.01;
  //   cube.rotation.y += 0.01;
  //   renderer.render(scene, camera);
  // }
  // animate();
}

function main() {
  const polyfill = new WebXRPolyfill(window);

  if (navigator.xr && navigator.xr.requestDevice) {
    console.log('navigator.xr exists.');
    navigator.xr.requestDevice().then((device) => {
      device.supportsSession({immersive: true}).then(() => {
        var enterXrBtn = document.createElement("button");
        enterXrBtn.innerHTML = "Enter VR";
        enterXrBtn.addEventListener("click", () => beginXRSession(device));
        document.body.appendChild(enterXrBtn);
      });
    });
  } else {
    console.log('navigator.xr not found :(');
  }

}

main();
