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
 function tower(group,row,col,h,isDome){
  const {x,z}=tileAt(row,col);
  const towerGroup=new THREE.Group();towerGroup.userData={row,col};group.add(towerGroup);group=towerGroup;
  for(let level=0;level<Math.min(3,h);level++){
   const base=.34+level*.49;
   const box=cube(.89,.42,.89,stone,x,base+.22,z,group);
   // White inset cornices and columns form the miniature island architecture.
   cube(.94,.07,.94,white,x,base+.05,z,group);
   cube(.96,.055,.96,edge,x,base+.45,z,group);
   const colMat=level%2?white:stone;
   for(const dx of [-.35,.35])for(const dz of [-.35,.35]){
    mesh(new THREE.CylinderGeometry(.051,.06,.40,8),colMat,x+dx,base+.23,z+dz,group);
   }
   const door=cube(.2,.25,.012,windowMat,x,base+.18,z+.454,group);door.castShadow=false;
   door.geometry.translate(0,0,0);
   const arched=mesh(new THREE.SphereGeometry(.11,10,8,0,Math.PI*2,0,Math.PI/2),darkBlue,x,base+.30,z+.460,group);
   arched.scale.set(1,.54,.12);arched.castShadow=false;
  }
  if(isDome){
   const y=.33+Math.min(h===4?3:h,3)*.49+.12;
   const dome=mesh(new THREE.SphereGeometry(.40,24,12,0,Math.PI*2,0,Math.PI/2),blue,x,y,z,group);
   dome.scale.y=.94;
   mesh(new THREE.CylinderGeometry(.41,.41,.08,24),darkBlue,x,y+.02,z,group);
   mesh(new THREE.SphereGeometry(.05,12,8),white,x,y+.40,z,group);
  }
 }
 function worker(group,p,row,col,level){
  const {x,z}=tileAt(row,col);
  const w=new THREE.Group();w.position.set(x,.38+level*.49,z);group.add(w);
  const robe=mat(p===0?'#187fc3':'#df805f',.4),acc=mat(p===0?'#073f83':'#9b4849',.42);
  const foot=mesh(new THREE.CylinderGeometry(.22,.24,.09,20),acc,0,.06,0,w);
  mesh(new THREE.CylinderGeometry(.125,.23,.45,20),robe,0,.31,0,w);
  mesh(new THREE.SphereGeometry(.143,16,12),mat('#f1d7b9'),0,.66,0,w);
  mesh(new THREE.CylinderGeometry(.155,.15,.085,16),acc,0,.79,0,w);
  mesh(new THREE.TorusGeometry(.16,.04,6,20),acc,0,.15,0,w).rotation.x=Math.PI/2;
  w.userData={row,col,p};return w;
 }
 const current={state:null};
 function update(g,targets=[],selected=null,buildMode=false){
  const previous=current.state;current.state=structuredClone(g);
  // Never accumulate GPU objects across many turns.
  const dispose=(group)=>{group.traverse(obj=>{if(obj.geometry)obj.geometry.dispose();});};
  dispose(pieces);while(pieces.children.length)pieces.remove(pieces.children[0]);
  dispose(highlights);scene.remove(highlights);highlights=new THREE.Group();scene.add(highlights);
  for(let r=0;r<5;r++)for(let c=0;c<5;c++){
   const h=g.board[r][c];if(h>0)tower(pieces,r,c,h,h===4);
   if(h>0&&(!previous||previous.board[r][c]!==h)){
    // Building animation is expressed as a brief vertical reveal.
    const last=pieces.children.slice(-1);for(const obj of last){const sy=obj.scale.y;obj.scale.y=.05;tweens.push({obj,initial:.05,target:sy,start:performance.now(),duration:440,type:'build'});}
   }
  }
  for(let p=0;p<2;p++)for(let i=0;i<g.workers[p].length;i++){
   const to=g.workers[p][i],old=previous?.workers[p]?.[i];
   const piece=worker(pieces,p,to.row,to.col,g.board[to.row][to.col]);
   if(old && !eq(old,to)){
    const point=tileAt(old.row,old.col);
    piece.position.x=point.x;piece.position.z=point.z;
    tweens.push({obj:piece,start:performance.now(),duration:480,type:'move',x:point.x,z:point.z,toX:tileAt(to.row,to.col).x,toZ:tileAt(to.row,to.col).z,baseY:piece.position.y});
   }else if(!old){piece.scale.setScalar(.15);tweens.push({obj:piece,start:performance.now(),duration:440,type:'spawn'});}
  }
  for(const t of targets)ring(t.row,t.col,.334+g.board[t.row][t.col]*.49,buildMode?glowBuild:glowMove);
  if(selected){
   const w=g.workers[selected.p]?.[selected.i];if(w)ring(w.row,w.col,.38+g.board[w.row][w.col]*.49,glowSelected);
  }
 }
 function eq(a,b){return a&&b&&a.row===b.row&&a.col===b.col;}
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
 const resize=new ResizeObserver(()=>{const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);});
 resize.observe(container);
 function setView(){camera.position.set(8.7,11.8,11.7);orbit.target.set(0,.45,0);orbit.update();}
 let active=true;
 function loop(time){
  if(!active)return;requestAnimationFrame(loop);orbit.update();
  for(let i=tweens.length-1;i>=0;i--){const tw=tweens[i],t=Math.min(1,(time-tw.start)/tw.duration),e=1-Math.pow(1-t,3);
   if(!tw.obj.parent){tweens.splice(i,1);continue;}
   if(tw.type==='move'){tw.obj.position.x=tw.x+(tw.toX-tw.x)*e;tw.obj.position.z=tw.z+(tw.toZ-tw.z)*e;tw.obj.position.y=tw.baseY+Math.sin(Math.PI*t)*.28;}
   else{tw.obj.scale.setScalar(tw.initial!==undefined?tw.initial+(tw.target-tw.initial)*e:.15+.85*e);}
   if(t===1)tweens.splice(i,1);
  }
  renderer.render(scene,camera);
 }
 requestAnimationFrame(loop);
 return {update,resetCamera:setView,destroy(){active=false;resize.disconnect();orbit.dispose();renderer.dispose();renderer.domElement.remove();}};
}
