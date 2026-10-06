import { createPlayground } from './playground.js';

export function createSpider(container, { THREE, gsap, reducedMotion }) {
  const mount = container.querySelector('.spider-mount');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
  catch { container.querySelector('#crawl-state').textContent = '3D unavailable — try another browser'; return () => {}; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  mount.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, .1, 100);
  camera.position.set(0, 7.4, 6.6); camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xf6ffd6, 0x3a4936, 3));
  const key = new THREE.DirectionalLight(0xffffff, 5); key.position.set(-3, 6, 3); scene.add(key);
  const rim = new THREE.DirectionalLight(0xd7fb50, 4); rim.position.set(4, 2, -3); scene.add(rim);
  const spider = new THREE.Group(); scene.add(spider);
  const shell = new THREE.MeshPhysicalMaterial({ color: 0x222a1b, metalness: .62, roughness: .2, clearcoat: 1, clearcoatRoughness: .13 });
  const jointMaterial = new THREE.MeshStandardMaterial({ color: 0x485234, metalness: .5, roughness: .32 });
  const accent = new THREE.MeshStandardMaterial({ color: 0xd7fb50, emissive: 0xbadd36, emissiveIntensity: .5, roughness: .2 });
  function ellipsoid(x, y, z, sx, sy, sz, material) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), material);
    mesh.position.set(x,y,z); mesh.scale.set(sx,sy,sz); spider.add(mesh); return mesh;
  }
  ellipsoid(0,.45,.55,.6,.47,.8,shell);
  ellipsoid(0,.43,-.43,.42,.34,.48,shell);
  ellipsoid(0,.4,-.82,.31,.25,.24,shell);
  [-1,1].forEach(side => {
    ellipsoid(side*.16,.59,-1.01,.072,.08,.045,accent);
    ellipsoid(side*.28,.53,-.93,.04,.045,.04,accent);
    ellipsoid(side*.12,.27,-1.08,.065,.085,.22,jointMaterial);
  });
  ellipsoid(0,.88,.56,.065,.016,.39,accent);
  const legs = [];
  const cylinder = new THREE.CylinderGeometry(1,1,1,10);
  function bone(a,b,width,material) {
    const mesh = new THREE.Mesh(cylinder,material);
    mesh.position.copy(a).add(b).multiplyScalar(.5);
    mesh.scale.set(width,a.distanceTo(b),width*.85);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());
    return mesh;
  }
  for (const side of [-1,1]) for (let i=0;i<4;i++) {
    const leg = new THREE.Group(); spider.add(leg);
    const z = -.64+i*.4;
    const start = new THREE.Vector3(side*.28,.4,z);
    const knee = new THREE.Vector3(side*(1.03+Math.sin(i/3*Math.PI)*.35),.65,z+(i-1.5)*.39);
    const ankle = new THREE.Vector3(side*(1.53+Math.sin(i/3*Math.PI)*.43),.06,z+(i-1.5)*.71);
    leg.add(bone(start,knee,.059,shell),bone(knee,ankle,.035,shell));
    const joint = new THREE.Mesh(new THREE.SphereGeometry(.077,12,10),jointMaterial); joint.position.copy(knee);leg.add(joint);
    legs.push({leg,side,index:i,ankle});
  }
  spider.rotation.y = -.45;
  const playground = createPlayground(container,{gsap,reducedMotion});
  const resize = new ResizeObserver(() => renderer.setSize(mount.clientWidth,mount.clientHeight));
  resize.observe(mount);
  let frame, stopped=false, lastRender=0;
  function contacts(x,y) {
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
    const width=mount.clientWidth,height=mount.clientHeight;
    const points=legs.map(({leg,ankle})=>leg.localToWorld(ankle.clone()));
    points.push(spider.localToWorld(new THREE.Vector3(0,.4,-1.08)));
    return points.map(point=>{point.project(camera);return {x:x+point.x*width/2,y:y-point.y*height/2};});
  }
  const draw = time => {
    if(stopped) return;
    const { active, paused, heading } = playground.update(time,contacts);
    if(!reducedMotion && !paused && !document.hidden) {
      legs.forEach(({leg,side,index})=> {
        leg.rotation.y = Math.sin(time*(active?.014:.003)+index*1.5+side)*(active?.16:.025);
        leg.position.y = active?Math.max(0,Math.sin(time*.014+index*1.5+side))*.1:0;
      });
      spider.position.y = Math.sin(time*(active?.014:.002))*(active?.055:.015);
      spider.rotation.y += (heading-spider.rotation.y)*.08;
    }
    if(!document.hidden && (time-lastRender>32 || reducedMotion)) {renderer.render(scene,camera);lastRender=time;}
    frame=requestAnimationFrame(draw);
  };
  frame=requestAnimationFrame(draw);
  return () => { stopped=true;cancelAnimationFrame(frame);playground.dispose();resize.disconnect();scene.traverse(o=>{if(o.geometry && o.geometry!==cylinder)o.geometry.dispose();});cylinder.dispose();shell.dispose();jointMaterial.dispose();accent.dispose();renderer.dispose();renderer.domElement.remove(); };
}
