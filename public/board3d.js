import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Real-time, raycastable three-dimensional Santorini tabletop, original procedural assets. */
export function createBoard3D(container,onCell){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#83cbd9');scene.fog=new THREE.FogExp2('#83cbd9',.014);
 const camera=new THREE.PerspectiveCamera(38,1,.1,100);
 camera.position.set(8.7,11.8,11.7);camera.lookAt(0,.6,0);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 const mobile=matchMedia('(max-width:700px)').matches;
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,mobile?1.35:1.8));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.37;
 container.appendChild(renderer.domElement);
 const orbit=new OrbitControls(camera,renderer.domElement);
 orbit.enableDamping=true;orbit.dampingFactor=.08;orbit.enablePan=false;
 orbit.minDistance=8.8;orbit.maxDistance=20;orbit.minPolarAngle=.35;orbit.maxPolarAngle=1.2;
 orbit.target.set(0,.4,0);orbit.update();
 const hemi=new THREE.HemisphereLight(0xf2feff,0x859377,2.15);scene.add(hemi);
 const sun=new THREE.DirectionalLight(0xffead0,3.1);sun.position.set(-7,14,9);sun.castShadow=true;
 sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);sun.shadow.normalBias=.012;sun.shadow.radius=3;sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;
 sun.shadow.bias=-.0006;scene.add(sun);
 const fill=new THREE.DirectionalLight(0xa4e3f1,1.15);fill.position.set(8,7,-6);scene.add(fill);
 const mat=(color,roughness=.85,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});

 const sea=mat('#0a8e9e',.32), cliff=mat('#d2b68c'),stone=mat('#f2f1e8'),edge=mat('#ddd4bd'),grass=mat('#b5d3b7'),
 blue=mat('#187fbb',.27),darkBlue=mat('#11538b',.34),windowMat=mat('#3c91ad',.32),white=mat('#fffff5'),sand=mat('#e7cc9d'),
 rock=mat('#a6a095'),olive=mat('#456e51'),oliveLight=mat('#78956a'),bronze=mat('#d2b37a',.42,.2),terracotta=mat('#b66d57');
 const tiles=[],pieces=new THREE.Group();scene.add(pieces);
 const cache=new Map(),materials=new Set();
 const cached=(key,create)=>{if(!cache.has(key))cache.set(key,create());return cache.get(key)};
 function mesh(geo,material,x,y,z,parent=scene){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function cube(w,h,d,material,x,y,z,parent=scene){return mesh(cached('rounded:'+w+':'+h+':'+d,()=>new RoundedBoxGeometry(w,h,d,3,Math.min(.06,w/5,h/5,d/5))),material,x,y,z,parent);}
 const seaGeometry=new THREE.PlaneGeometry(100,100,48,48);
 const seaMaterial=new THREE.ShaderMaterial({
  uniforms:{time:{value:0},deep:{value:new THREE.Color('#086982')},light:{value:new THREE.Color('#3bbdc6')}},
  vertexShader:['uniform float time;','varying vec3 vWorld;',
   'void main(){vec3 p=position;','p.z += .06*sin(p.x*1.08+time*.55)*cos(p.y*1.4-time*.3);',
   'vec4 w=modelMatrix*vec4(p,1.0);vWorld=w.xyz;gl_Position=projectionMatrix*viewMatrix*w;}'].join('\n'),
  fragmentShader:['uniform float time;uniform vec3 deep,light;','varying vec3 vWorld;',
   'void main(){float a=sin(vWorld.x*2.1+time*.5)*cos(vWorld.z*2.5-time*.36);',
   'float coast=1.-smoothstep(3.0,8.0,length(vWorld.xz));',
   'vec3 col=mix(deep,light,clamp(.21+coast*.51+a*.07,0.,1.));',
   'float sparkle=pow(max(0.,sin(vWorld.x*7.0+time)*sin(vWorld.z*5.2-time*.7)),18.);',
   'gl_FragColor=vec4(col+vec3(.14,.22,.23)*sparkle,1.0);}'].join('\n')
 });
 const seaPlane=mesh(seaGeometry,seaMaterial,0,-.94,0);seaPlane.rotation.x=-Math.PI/2;seaPlane.castShadow=false;seaPlane.receiveShadow=false;
 // Irregular limestone cliff around the inset playing grid.
 const shoreShape=new THREE.Shape(),n=40;
 for(let i=0;i<=n;i++){const t=i/n*Math.PI*2,r=3.72+Math.sin(t*7)*.10+Math.sin(t*3)*.16+Math.sin(t*13)*.045;
 const x=r*Math.cos(t),y=r*Math.sin(t);if(i===0)shoreShape.moveTo(x,y);else shoreShape.lineTo(x,y);}
 const cliffGeo=new THREE.ExtrudeGeometry(shoreShape,{depth:.68,steps:1,bevelEnabled:true,bevelThickness:.14,bevelSize:.07,bevelSegments:2});
 cliffGeo.rotateX(-Math.PI/2);
 mesh(cliffGeo,cliff,0,-.62,0);
 cube(5.90,.24,5.90,sand,0,.05,0);
 cube(5.53,.11,5.53,grass,0,.24,0);
 for(let r=0;r<5;r++)for(let c=0;c<5;c++){
  const x=(c-2)*1.05,z=(r-2)*1.05;
  const tile=cube(1.011,.065,1.011,mat((r+c)%2?'#bdd4bd':'#b0ccb5'),x,.33,z);
  tile.userData={row:r,col:c};tiles.push(tile);
  cube(.93,.012,.015,sand,x,.369,z-.493);
 }
 // Foam softly outlines the island, decorative details stay off the playable cells.
 const foam=new THREE.MeshBasicMaterial({color:0xd9ffff,transparent:true,opacity:.28,depthWrite:false,side:THREE.DoubleSide});materials.add(foam);
 for(let q=0;q<3;q++){const ring=mesh(new THREE.RingGeometry(3.84+q*.18,3.88+q*.18,90),foam,0,-.81+q*.006,0);ring.rotation.x=-Math.PI/2;ring.castShadow=false;}
 function tree(x,z,scale) {
  const g=new THREE.Group();g.position.set(x,.23,z);g.scale.setScalar(scale);scene.add(g);
  mesh(new THREE.CylinderGeometry(.05,.08,.57,10),rock,0,.31,0,g);
  for(const [cx,cy,cz,rad] of [[0,.69,0,.29],[-.19,.61,.13,.25],[.19,.64,-.10,.26]]) {
   const leaf=mesh(new THREE.SphereGeometry(rad,10,8),olive,cx,cy,cz,g);leaf.scale.set(1.2,.64,.95);
   const highlight=mesh(new THREE.SphereGeometry(rad*.57,8,7),oliveLight,cx-.08,cy+.11,cz-.07,g);highlight.scale.y=.54;
  }
 }
 tree(-3.03,-2.04,.8);tree(3.13,-1.93,.86);tree(-3.07,2.10,.77);tree(3.06,2.05,.9);
 for(let i=0;i<18;i++){const a=i*2.399,r=3.27+.17*Math.sin(i*1.8),x=Math.cos(a)*r,z=Math.sin(a)*r;
  if(Math.max(Math.abs(x),Math.abs(z))<2.88)continue;
  const pebble=mesh(new THREE.IcosahedronGeometry(.07+(i%4)*.022,0),i%3?cliff:rock,x,.19,z);pebble.scale.y=.55;
 }
 function pottery(x,z) {
  const g=new THREE.Group();g.position.set(x,.22,z);scene.add(g);
  const path=[[.04,0],[.15,.03],[.17,.12],[.13,.24],[.1,.32],[.10,.38],[.13,.39]].map(([r,y])=>new THREE.Vector2(r,y));
  mesh(new THREE.LatheGeometry(path,18),terracotta,0,0,0,g);
  const handle=mesh(new THREE.TorusGeometry(.10,.019,6,16),bronze,.14,.25,0,g);handle.rotation.y=Math.PI/2;
 }
 pottery(3.18,.15);pottery(-3.10,-.20);
 let highlights=new THREE.Group();scene.add(highlights);
 const tileAt=(r,c)=>({x:(c-2)*1.05,z:(r-2)*1.05});
 const glowMove=new THREE.MeshBasicMaterial({color:0x5cf0dc,transparent:true,opacity:.63,depthWrite:false});
 const glowBuild=new THREE.MeshBasicMaterial({color:0xffc86b,transparent:true,opacity:.77,depthWrite:false});
 const glowSelected=new THREE.MeshBasicMaterial({color:0xfdf29d,transparent:true,opacity:.9,depthWrite:false});
 const tweens=[];
 function ring(row,col,y,material){
  const {x,z}=tileAt(row,col);
  const m=mesh(new THREE.RingGeometry(.39,.47,30),material,x,y,z,highlights);
  m.rotation.x=-Math.PI/2;m.castShadow=false;m.renderOrder=6;
 }

 // Hand-sculpted volumes: plaster arches, rounded stone cornices, cobalt shutters.
 function tower(group,row,col,h,isDome){
  const {x,z}=tileAt(row,col);
  const g=new THREE.Group();g.userData={row,col};g.position.set(x,0,z);group.add(g);
  for(let level=0;level<Math.min(3,h);level++){
   const y=.395+level*.53;
   cube(.93,.455,.93,stone,0,y+.225,0,g);
   cube(.985,.052,.985,white,0,y+.473,0,g);
   cube(.96,.052,.96,edge,0,y+.065,0,g);
   for(const dx of [-.355,.355]){
    mesh(cached('pillar',()=>new THREE.CylinderGeometry(.052,.065,.36,12)),white,dx,y+.275,.389,g);
    mesh(cached('cap',()=>new THREE.CylinderGeometry(.076,.076,.047,12)),white,dx,y+.463,.389,g);
   }
   // Carved arched doorway, with vivid Santorini-blue shutters.
   const arch=new THREE.Shape();
   arch.moveTo(-.105,-.16);arch.lineTo(-.105,.025);
   arch.absarc(0,.025,.105,Math.PI,0,true);arch.lineTo(.105,-.16);arch.closePath();
   const entrance=mesh(cached('arch',()=>new THREE.ShapeGeometry(arch,12)),darkBlue,0,y+.251,.477,g);
   entrance.castShadow=false;
   cube(.06,.25,.027,blue,-.165,y+.23,.49,g);
   cube(.06,.25,.027,blue,.165,y+.23,.49,g);
   cube(.26,.040,.085,white,0,y+.084,.50,g);
   // Blue-glazed side window, carved ledges and small rooftop urns.
   cube(.018,.166,.19,windowMat,.472,y+.30,-.055,g);
   cube(.024,.023,.22,white,.484,y+.204,-.055,g);
   cube(.62,.013,.025,sand,0,y+.121,.478,g);
   for(const dx of [-.35,.35])for(const dz of [-.35,.35]){
    const stoneDetail=mesh(cached('ornament',()=>new THREE.SphereGeometry(.061,10,8)),white,dx,y+.509,dz,g);
    stoneDetail.scale.y=.68;
   }
  }
  if(isDome){
   // Half-sphere with blue glazed terracotta ribs and a finial.
   const y=.395+3*.53+.475;
   const dome=mesh(cached('dome',()=>new THREE.SphereGeometry(.405,28,14,0,Math.PI*2,0,Math.PI/2)),blue,0,y,0,g);
   dome.scale.y=.88;
   mesh(cached('dome-base',()=>new THREE.CylinderGeometry(.411,.422,.08,28)),darkBlue,0,y+.015,0,g);
   const cap=mesh(cached('topring',()=>new THREE.TorusGeometry(.33,.013,6,28)),bronze,0,y+.14,0,g);cap.rotation.x=Math.PI/2;
   mesh(cached('finial',()=>new THREE.SphereGeometry(.055,12,8)),white,0,y+.40,0,g);
  }
  return g;
 }
 function connect(a,b,material,r=.035,parent){
  const d=new THREE.Vector3().subVectors(new THREE.Vector3(...b),new THREE.Vector3(...a));
  const m=mesh(new THREE.CylinderGeometry(r*.75,r,d.length(),10),material,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,parent);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return m;
 }
 function worker(group,p,row,col,level,index=0){
  const {x,z}=tileAt(row,col);
  const w=new THREE.Group();w.position.set(x,.42+level*.53,z);group.add(w);
  const robe=p===0?mat('#267eae',.64):mat('#c47162',.68);
  const acc=p===0?mat('#1d577a',.81):mat('#824b4d',.79);
  const skin=mat('#ead3b5',.78);
  const hair=mat('#595048',.85);
  // Stone plinth, carved hem and a draped, flaring marble-resin robe.
  mesh(cached('pawn-base',()=>new THREE.CylinderGeometry(.245,.26,.085,24)),edge,0,.05,0,w);
  mesh(cached('pawn-ring',()=>new THREE.CylinderGeometry(.215,.23,.035,24)),bronze,0,.104,0,w);
  const profile=[[.21,.13],[.24,.17],[.23,.28],[.195,.39],[.155,.51],[.162,.59],[.12,.65]]
    .map(([r,y])=>new THREE.Vector2(r,y));
  mesh(cached('robe-profile',()=>new THREE.LatheGeometry(profile,28)),robe,0,0,0,w);
  const shoulder=mesh(cached('shoulder',()=>new THREE.SphereGeometry(.16,16,12)),robe,0,.58,0,w);
  shoulder.scale.set(1.12,.58,.93);
  for(let j=0;j<12;j++){
    const a=j/12*Math.PI*2,nx=Math.cos(a),nz=Math.sin(a);
    connect([nx*.12,.53,nz*.12],[nx*.222,.18,nz*.222],j%3?robe:acc,.010,w);
  }
  mesh(cached('neck',()=>new THREE.CylinderGeometry(.064,.064,.098,12)),skin,0,.69,0,w);
  const head=mesh(cached('head',()=>new THREE.SphereGeometry(.127,18,14)),skin,0,.817,.01,w);
  head.scale.set(.9,1.07,.89);
  const hairCap=mesh(cached('hair-cap',()=>new THREE.SphereGeometry(.134,16,10)),p?hair:acc,0,.9,0,w);hairCap.scale.y=.51;
  mesh(cached('nose',()=>new THREE.SphereGeometry(.03,10,8)),skin,0,.815,.127,w).scale.set(.55,1,.62);
  for(const sign of [-1,1])mesh(cached('eye',()=>new THREE.SphereGeometry(.009,8,6)),hair,sign*.048,.848,.124,w);
  const wreath=mesh(cached('wreath',()=>new THREE.TorusGeometry(.12,.013,7,26)),bronze,0,.915,0,w);wreath.rotation.x=Math.PI/2;
  for(const side of [-1,1]){
   connect([side*.13,.57,0],[side*.26,.45,.02],robe,.053,w);
   connect([side*.26,.45,.02],[side*.19,.29,.13],skin,.038,w);
   mesh(cached('hand',()=>new THREE.SphereGeometry(.042,10,8)),skin,side*.19,.29,.13,w);
  }
  const sash=mesh(cached('sash',()=>new THREE.TorusGeometry(.16,.022,7,26)),acc,0,.46,0,w);sash.rotation.x=Math.PI/2;
  mesh(cached('brooch',()=>new THREE.SphereGeometry(.038,10,8)),bronze,0,.56,.17,w);
  if(index===1)mesh(cached('helmet',()=>new THREE.ConeGeometry(.09,.16,11)),bronze,0,1.025,0,w);
  else {const cape=cube(.23,.33,.057,acc,0,.38,-.15,w);cape.rotation.x=-.10;}
  w.userData={row,col,p,index};return w;
 }

 const current={state:null};
 const towers=new Map(),figures=new Map();
 function samePos(a,b){return !!a&&!!b&&a.row===b.row&&a.col===b.col;}
 function update(g,targets=[],selected=null,buildMode=false){
  const previous=current.state;
  const changed=!previous||previous.revision!==g.revision;
  if(changed){
   for(let row=0;row<5;row++)for(let col=0;col<5;col++){
    const key=row+','+col,height=g.board[row][col],old=previous?.board[row]?.[col]??0;
    if(height===old)continue;
    const previousTower=towers.get(key);
    if(previousTower){pieces.remove(previousTower);towers.delete(key);}
    if(height){
     const group=tower(pieces,row,col,height,height===4);
     towers.set(key,group);
     if(previous&&height>old){
      group.scale.y=.81;
      tweens.push({obj:group,start:performance.now(),duration:560,type:'rise'});
     }
    }
   }
   for(let p=0;p<2;p++)for(let i=0;i<2;i++){
    const key=p+':'+i,location=g.workers[p]?.[i],before=previous?.workers[p]?.[i];
    let figure=figures.get(key);
    if(!location){if(figure){pieces.remove(figure);figures.delete(key);}continue;}
    if(!figure){figure=worker(pieces,p,location.row,location.col,g.board[location.row][location.col],i);figures.set(key,figure);}
    const goal=tileAt(location.row,location.col),goalY=.42+g.board[location.row][location.col]*.53;
    figure.userData={row:location.row,col:location.col,p,index:i};
    if(before&&!samePos(before,location)){
     tweens.push({obj:figure,start:performance.now(),duration:540,type:'move',
      x:figure.position.x,z:figure.position.z,y:figure.position.y,
      toX:goal.x,toZ:goal.z,toY:goalY});
    }else{figure.position.set(goal.x,goalY,goal.z);}
    if(!before){figure.scale.setScalar(.12);tweens.push({obj:figure,start:performance.now(),duration:420,type:'spawn'});}
   }
   current.state=structuredClone(g);
  }
  while(highlights.children.length)highlights.remove(highlights.children[0]);
  const addRing=(row,col,material)=>{
   const {x,z}=tileAt(row,col);
   const y=.413+g.board[row][col]*.53;
   const ring=mesh(cached('legal-ring',()=>new THREE.RingGeometry(.32,.45,36)),material,x,y,z,highlights);
   ring.rotation.x=-Math.PI/2;ring.castShadow=false;ring.receiveShadow=false;ring.renderOrder=6;
  };
  for(const t of targets)addRing(t.row,t.col,buildMode?glowBuild:glowMove);
  if(selected){const w=g.workers[selected.p]?.[selected.i];if(w)addRing(w.row,w.col,glowSelected);}
 }
 function clicked(event){
  if(!down||Math.hypot(event.clientX-down.x,event.clientY-down.y)>8)return;
  const rect=renderer.domElement.getBoundingClientRect();
  const pos=new THREE.Vector2((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);
  const raycaster=new THREE.Raycaster();raycaster.setFromCamera(pos,camera);
  const hits=raycaster.intersectObjects([...tiles,...pieces.children],true);
  for(const hit of hits){
   let obj=hit.object;
   while(obj&&!Number.isInteger(obj.userData?.row))obj=obj.parent;
   if(obj){onCell(obj.userData.row,obj.userData.col);break;}
  }
 }
 let down=null;
 renderer.domElement.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
 renderer.domElement.addEventListener('pointerup',clicked);
 const resize=new ResizeObserver(()=>{const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);camera.position.set(8.2*(w/h<.90?1.31:1),10.4*(w/h<.90?1.31:1),11.3*(w/h<.90?1.31:1));orbit.update();});
 resize.observe(container);
 function setView(){const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight),f=w/h<.90?1.31:1;camera.position.set(8.2*f,10.4*f,11.3*f);orbit.target.set(0,.5,0);orbit.update();}
 let active=true;
 function loop(time){
  if(!active)return;requestAnimationFrame(loop);orbit.update();seaMaterial.uniforms.time.value=time*.001;
  for(let i=tweens.length-1;i>=0;i--){const tw=tweens[i],t=Math.min(1,(time-tw.start)/tw.duration),e=1-Math.pow(1-t,3);
   if(!tw.obj.parent){tweens.splice(i,1);continue;}
   if(tw.type==='move'){tw.obj.position.x=tw.x+(tw.toX-tw.x)*e;tw.obj.position.z=tw.z+(tw.toZ-tw.z)*e;tw.obj.position.y=tw.y+(tw.toY-tw.y)*e+Math.sin(Math.PI*t)*.24;}
   else if(tw.type==='rise')tw.obj.scale.y=.81+.19*e;else tw.obj.scale.setScalar(.12+.88*e);
   if(t===1)tweens.splice(i,1);
  }
  renderer.render(scene,camera);
 }
 requestAnimationFrame(loop);
 return {update,resetCamera:setView,destroy(){active=false;resize.disconnect();orbit.dispose();seaMaterial.dispose();seaGeometry.dispose();for(const geo of cache.values())geo.dispose();renderer.dispose();renderer.domElement.remove();}};
}
