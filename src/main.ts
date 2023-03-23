import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Water } from "three/examples/jsm/objects/Water2.js";

import * as dat from 'lil-gui';

import * as CANNON from 'cannon-es';



const main = () => {

  const sceneParams = {
    width: window.innerWidth,
    height: window.innerHeight,
    envColor: 0xCCCCCC, // white
    fogNear: .5,
    fogFar: 2,
  }
  
  //Scene Setup 
  const gui = new dat.GUI();
  
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(sceneParams.envColor);
  scene.fog = new THREE.Fog(sceneParams.envColor, sceneParams.fogNear, sceneParams.fogFar);
  
  const canvas = document.getElementById('webgl') as HTMLCanvasElement;
  
  // Loading Manager
  const manager = new THREE.LoadingManager();

  manager.onLoad = function ( ) {
      console.log( 'Loading complete!');
        //document.getElementById('loader').style.display = "none";
  };

  manager.onProgress = function () {
      console.log( 'Loading' );
  };
  
  
  // Physics
  const world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.allowSleep = true;
  (world.solver as CANNON.GSSolver).iterations = 10;

  const physicsMaterials = {
    duck: new CANNON.Material('duck'),
    can: new CANNON.Material('can'),
    ground: new CANNON.Material('ground'),
  }

  const groundContact = new CANNON.ContactMaterial(
    physicsMaterials.can,
    physicsMaterials.ground,
    {
      friction: .1,
      restitution: .7
    }
  );

  const duckContact = new CANNON.ContactMaterial(
    physicsMaterials.ground,
    physicsMaterials.duck,
    {
      friction: .7,
      restitution: .1
    }
  );

  world.addContactMaterial(duckContact);
  
  // Camera  
  const camera = new THREE.PerspectiveCamera(75, sceneParams.width / sceneParams.height, .1, 5);
  
  camera.position.set(0, .4, 1.3);
  camera.lookAt(0,0,0);
  
  scene.add(camera);
  
  
  
  //Renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
  });
  renderer.setSize(sceneParams.width, sceneParams.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  
  
  // Meshes  
  const complexPlane = new THREE.PlaneGeometry(10, 10, 200, 200);
  const basicPlane = new THREE.PlaneGeometry(10, 10, 1, 1);
  
  const flow = {
      x: .5,
      y: -.5
  }
  
  const water = new Water( basicPlane, {
          color: 0x89845A,
          scale: 4,
          flowDirection: new THREE.Vector2(flow.x,flow.y),
          textureWidth: 1024,
          textureHeight: 1024
        } );
  water.name = "Water";
  water.rotation.x = Math.PI / -2;
  scene.add(water);
  
  // Soil
  const dirt = new THREE.MeshBasicMaterial({
      color: 0x89845A,
      side: THREE.DoubleSide
  });
  
  const dirtGeo = new THREE.Mesh(complexPlane, dirt);
  dirtGeo.rotation.x = Math.PI / -2;
  dirtGeo.position.y = -.2;
  dirtGeo.name="Soil";
  scene.add(dirtGeo);

  const groundShape = new CANNON.Plane();
  const groundBody = new CANNON.Body({
    mass:0,
    position: new CANNON.Vec3(0, -0.075, 0),
    shape: groundShape,
    material: physicsMaterials.ground
  });

  groundBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(-1,0,0),
    Math.PI * .5
  );

  world.addBody(groundBody);
  

  // Cans
  const cannery = {
    cans: [],
    canMesh: null,
    canDim: {
      w: 0,
      h: 0,
      r: 0,
    },

    createNewCan({point}) {
      let can = gltfCollection.children.find(child => child.name == "can");

      // Physics Body
      can.geometry.computeBoundingBox();
    
      const box = can.geometry.boundingBox;
      const radius = (box.max.x - box.min.x) / 2;

      const shape = new CANNON.Cylinder(
        radius,
        radius,
        box.max.y - box.min.y,
        12
      );

      const body = new CANNON.Body({
        shape,
        mass: .04,
        position: new CANNON.Vec3(point.x, .5, point.z),
        material: physicsMaterials.can
      });

      body.sleepSpeedLimit = 1.0;

      world.addBody(body);

      
      // Mesh
      const mesh = cannery.canMesh.clone();
      mesh.position.copy(body.position);
  
      scene.add(mesh);

      cannery.cans.push({mesh, body});
      
      if (cannery.cans.length > 49) {
          const lastCan = cannery.cans.shift();
          lastCan.mesh.geometry.dispose();
          lastCan.mesh.material.dispose();
          scene.remove(lastCan);
      }
    }

  }

  // Duck
  let duck, duckBody;


  //GLTF Scene
  const gltfLoader = new GLTFLoader(manager);
  const duckSceneUrl = "/inc/assets/ducktrash01.gltf";
  let gltfCollection: THREE.Group | null;
  
  gltfCollection = null;


  gltfLoader.load(duckSceneUrl, (gltf) => {
    gltfCollection = gltf.scene;
    scene.add(gltfCollection);
    console.log(gltfCollection.children);

    const sceneMeshes = gltfCollection.children;

    if (sceneMeshes.length > 0) {
      duck = sceneMeshes.find(mesh => mesh.name === "BezierCircle")?.children
                        .find(mesh => mesh.name === "duck001");

      duck.geometry.computeBoundingBox();

      const duckShape = new CANNON.Box(new CANNON.Vec3(
        (duck.geometry.boundingBox.max.x - duck.geometry.boundingBox.min.x) / 2,
        (duck.geometry.boundingBox.max.y - duck.geometry.boundingBox.min.y) / 2,
        (duck.geometry.boundingBox.max.z - duck.geometry.boundingBox.min.z) / 2,
      ));

      duckBody = new CANNON.Body({
        mass:1,
        position: new CANNON.Vec3(
          duck?.position.x,
          duck?.position.y,
          duck?.position.z
        ),
        shape: duckShape,
        material: physicsMaterials.duck
      });
      
      world.addBody(duckBody);

      cannery.canMesh = sceneMeshes.find(mesh => mesh.name == "can");
    }
  });  
  
  
  // Raycaster 
  const raycaster = new THREE.Raycaster();
  let mouse = new THREE.Vector2(0,0);
  
  // Lights
  const color = 0xFFFFFF;
  const intensity = 1;
  const directionalLight = new THREE.DirectionalLight(color, intensity);
  directionalLight.position.set(-1, 2, 1);
  scene.add(directionalLight);
  
  const skyColor = 0xB1E1FF;
  const groundColor = 0xB97A20;
  const hemisLight = new THREE.HemisphereLight(skyColor, groundColor, 1);
  scene.add(hemisLight);
  
  // Animation
  const clock = new THREE.Clock();
  let prevElapsedTime = 0;
  
  const animate = () => {
    const elapsedTime = clock.getElapsedTime();
    const deltaTime = elapsedTime - prevElapsedTime;

    prevElapsedTime = elapsedTime;

    cannery.cans.forEach(({mesh, body}: {mesh: THREE.Mesh, body: CANNON.Body}) => {
      mesh.position.copy(body.position);
      mesh.quaternion.copy(body.quaternion);
    });

    
    
    if (duck && duckBody) {
      //gltfCollection.children[0].rotation.y = - elapsedTime * .3;
      //gltfCollection.children[0].position.y = Math.sin(elapsedTime * 4) * .005;

      duckBody.position.x = -Math.sin(elapsedTime * .3) * .5;
      duckBody.position.y = Math.sin(elapsedTime * 4) * .005;
      duckBody.position.z = Math.cos(elapsedTime * .3) * .5;
      duck.position.copy(duckBody.position);

     
      //console.log(duckBody.velocity);
     
      //duckBody.quaternion.setFromAxisAngle();
      
      duckBody.quaternion.setFromAxisAngle(
        new CANNON.Vec3(0, 1, 0), 
        Math.atan2(duckBody.position.x, duckBody.position.z)
      );

      duck.quaternion.copy(duckBody.quaternion);
    }
  
    world.step(1/60, deltaTime, 10);
    renderer.render(scene, camera);
  
  
    window.requestAnimationFrame(animate);
  }
  
  animate();
  
  
  
  
  
  // Window Events
  window.addEventListener('resize', () => {
    if (sceneParams.width !== window.innerWidth || sceneParams.height !== window.innerHeight) {
      // Scene Settings
      sceneParams.width = window.innerWidth;
      sceneParams.height= window.innerHeight;
  
      // Camera
      camera.aspect = sceneParams.width / sceneParams.height;
      camera.updateProjectionMatrix();
  
      // Renderer
      renderer.setSize(sceneParams.width, sceneParams.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
  
  });

  function checkRaycastIntersection() {
    raycaster.setFromCamera(mouse, camera);
    let intersectObjects = raycaster.intersectObjects(scene.children);
    let plane;
    let canOverlap = false;

    intersectObjects.forEach((item) => {
        switch (item.object.name) {
            case "Water":
                plane = item;
                break;
            case "can":
                canOverlap = true;
                break;
            default:
                break;
        }
    });

    if (!canOverlap) {
      return plane;
    }

    return false;
  }

  document.addEventListener('click', (e) => {
    updateMousePosition(e);

    if (gltfCollection) {
        let groundIntersection = checkRaycastIntersection();
        if (groundIntersection) {
            //console.log(cans);
            //createNewCan(soil);
            cannery.createNewCan(groundIntersection);
        }
    }
  });

  function updateMousePosition(e) {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    return mouse.clone();
}
}

main();
