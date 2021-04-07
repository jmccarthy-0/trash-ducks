import * as THREE from "three";
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js'
import { Water } from "three/examples/jsm/objects/Water2.js";

function main() {
    // Renderer
    const canvas = document.querySelector("#canvas");
    const renderer = new THREE.WebGLRenderer({
        canvas
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Scene
    const scene = new THREE.Scene(); {
    const envColor = 0xCCCCCC; // white
    const near = .5;
    const far = 2;
    scene.background = new THREE.Color(envColor);
    scene.fog = new THREE.Fog(envColor, near, far);
    }

    // Camera
    const fov = 75;
    const aspect = canvas.clientWidth / canvas.clientHeight;
    const near = 0.1;
    const far = 5;
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

    camera.position.y = .4;
    camera.position.z = 1.3;
    camera.lookAt(0, 0, 0);

    //Orbit Controls
    const control = new OrbitControls( camera, canvas);
    control.enableZoom = false;
    control.maxPolarAngle = 1.5;


    // Loading Manager
    const manager = new THREE.LoadingManager();

    manager.onLoad = function ( ) {
	       console.log( 'Loading complete!');
           document.getElementById('loader').style.display = "none";
    };

    manager.onProgress = function () {
	       console.log( 'Loading' );
    };


    //Audio
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const audio = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader(manager);
    audioLoader.load('/inc/audio/ambience.wav', (buffer) => {
        audio.setBuffer( buffer );
	    audio.setLoop( true );
	    audio.setVolume( 0.4 );
    });

    document.getElementById('audioBtn').addEventListener('click', ()=> {
        if (audio.isPlaying) {
            audio.pause();
        } else {
            audio.play();
        }
    })



    // Raycaster
    const raycaster = new THREE.Raycaster();
    let mouse = new THREE.Vector2();

    // Lights
    const color = 0xFFFFFF;
    const intensity = 1;
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(-1, 2, 1);
    scene.add(light);

    const skyColor = 0xB1E1FF;
    const groundColor = 0xB97A20;
    const hemisLight = new THREE.HemisphereLight(skyColor, groundColor, 1);
    scene.add(hemisLight);


    // Textures


    //Geometry
    const complexPlane = new THREE.PlaneBufferGeometry(10, 10, 200, 200);
    const basicPlane = new THREE.PlaneBufferGeometry(10, 10, 1, 1);
    // const water = new THREE.MeshPhongMaterial({
    //     color: 0x006994,
    //     side: THREE.DoubleSide,
    // });
    //const waterGeo = new THREE.Mesh(plane, water);
    let flow = {
        x: .5,
        y: -.5
    }

    const waterGeo = new Water( basicPlane, {
    				color: 0x89845A,
    				scale: 4,
    				flowDirection: new THREE.Vector2(flow.x,flow.y),
    				textureWidth: 1024,
    				textureHeight: 1024
    			} );
    waterGeo.name = "Water";
    waterGeo.rotation.x = Math.PI / -2;
    scene.add(waterGeo);

    //Soil
    const dirt = new THREE.MeshBasicMaterial({
        color: 0x89845A,
        side: THREE.DoubleSide
    });

    const dirtGeo = new THREE.Mesh(complexPlane, dirt);
    dirtGeo.rotation.x = Math.PI / -2;
    dirtGeo.position.y = -.2;
    dirtGeo.name="Soil";
    scene.add(dirtGeo);

    //GLTF Scene
    const gltfLoader = new GLTFLoader(manager);
    const url = "/inc/assets/ducktrash01.gltf";
    let gltfCollection;
    gltfLoader.load(url, (gltf) => {
        gltfCollection = gltf.scene;
        scene.add(gltfCollection);
        //console.log(gltfCollection.children);
    });


    const bVal = .2;
    const geometry = new THREE.BoxGeometry(bVal, bVal, bVal);
    const material = new THREE.MeshPhongMaterial({
        color: 0x44aa88
    });


    // Cans

    let cans = [];


    // Functions
    function animate() {
        if (gltfCollection) {
            gltfCollection.children[0].rotation.y -= .002;
        }

        renderer.render(scene, camera);
        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    function updateMousePosition(e) {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        return mouse.clone();
    }

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
    }

    function createNewCan(plane) {
        let point = {
            x: plane.point.x,
            y: plane.point.y,
            z: plane.point.z
        };

        let can = gltfCollection.children.find(child => child.name == "can");

        let newCan = can.clone();
        newCan.position.set(point.x, .5, point.z);
        scene.add(newCan);
        gsap.to(newCan.position, {
            duration: 1,
            ease: "back.inOut(1.7)",
            y: 0,
            onComplete: () => {
                cans.push(newCan);
                console.log(cans);
                if (cans.length > 49) {
                    scene.remove(cans.shift());
                }
            }
        });
    }

    // Event Listeners
    let prevMouse;

    window.addEventListener('resize', () => {
        const canvas = renderer.domElement;
        renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    });

    let drag;
    document.addEventListener('pointerdown', (e) => {

        prevMouse = updateMousePosition(e);
        drag = false;
    }, false);

    document.addEventListener('pointermove', () => {
        drag = true
    });

    document.addEventListener('pointerup', (e) => {
        console.log('yass');
        updateMousePosition(e);
        let deltaX = Math.abs(mouse.x - prevMouse.x);
        let deltaY = Math.abs(mouse.y - prevMouse.y);

        if (deltaX < .04 && deltaY < .03) {
            drag = false;
        }

        if (!drag && gltfCollection) {
            let soil = checkRaycastIntersection();
            if (soil) {
                console.log(cans);
                createNewCan(soil);
            }
        }
    });

}

main();
