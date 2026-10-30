import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

/** Real-time, raycastable three-dimensional Santorini tabletop, original procedural assets. */
export function createBoard3D(container,onCell){
 const scene=new THREE.Scene();scene.background=new THREE.Color('#0c5674');scene.fog=new THREE.Fog('#0c5674',17,35);
 const camera=new THREE.PerspectiveCamera(37,1,.1,100);
 camera.position.set(8.7,11.8,11.7);camera.lookAt(0,.6,0);
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.6;
 container.appendChild(renderer.domElement);
 const orbit=new OrbitControls(camera,renderer.domElement);
 orbit.enableDamping=true;orbit.dampingFactor=.08;orbit.enablePan=false;
 orbit.minDistance=8.8;orbit.maxDistance=20;orbit.minPolarAngle=.35;orbit.maxPolarAngle=1.2;
 orbit.target.set(0,.4,0);orbit.update();
 const hemi=new THREE.HemisphereLight(0xf2feff,0x337b83,2.4);scene.add(hemi);
 const sun=new THREE.DirectionalLight(0xffe9c1,3.2);sun.position.set(-7,14,9);sun.castShadow=true;
 sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;
 sun.shadow.bias=-.0006;scene.add(sun);
 const fill=new THREE.DirectionalLight(0x9cd7fd,.8);fill.position.set(8,7,-6);scene.add(fill);
 const mat=(color,roughness=.85,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
 const sea=mat('#0a7e9e',.31), cliff=mat('#d6b48c'),stone=mat('#f5f3e8'),edge=mat('#ddd1b4'),grass=mat('#a3c7a4'),
 blue=mat('#167bbb',.27), darkBlue=mat('#0c4f8f',.34),windowMat=mat('#74b6d0',.35),white=mat('#ffffff'),sand=mat('#e3c59e');
 const tiles=[],pieces=new THREE.Group();scene.add(pieces);
 function mesh(geo,material,x,y,z,parent=scene){const m=new THREE.Mesh(geo,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function cube(w,h,d,material,x,y,z,parent=scene){return mesh(new THREE.BoxGeometry(w,h,d),material,x,y,z,parent);}
 mesh(new THREE.CircleGeometry(27,80),sea,0,-.72,0).rotation.x=-Math.PI/2;
 const waterTexture=mat('#0e829d',.48);
 for(let n=0;n<4;n++){const ring=mesh(new THREE.RingGeometry(4.55+n*.33,4.60+n*.33,80),waterTexture,0,-.60+n*.002,0);ring.rotation.x=-Math.PI/2;ring.castShadow=false;}
 cube(6.7,.65,6.7,cliff,0,-.36,0);cube(5.74,.21,5.74,sand,0,.04,0);cube(5.29,.10,5.29,grass,0,.175,0);
 for(let r=0;r<5;r++)for(let c=0;c<5;c++){
  const x=(c-2)*1.05,z=(r-2)*1.05;
  const tile=cube(1.012,.07,1.012,mat((r+c)%2?'#b2d3b1':'#a3c8a7'),x,.25,z);
  tile.userData={row:r,col:c};tiles.push(tile);
  // Fine stone seams maintain readability when the camera rotates.
  cube(1.008,.014,.022,mat('#d3dac5'),x,.293,z-.494);
 }
 for(const [x,z] of [[-3,-3],[3,-3],[-3,3],[3,3]]){mesh(new THREE.CylinderGeometry(.11,.13,.36,12),stone,x,.22,z);}
 // Small, off-board miniature scenic details reinforce a physical tabletop.
 for(const [x,z,s] of [[-2.98,-2.2,.7],[2.95,2.38,.8],[-2.9,2.4,.6]]) {
  mesh(new THREE.CylinderGeometry(.08,.13,.23*s,10),stone,x,.2,z);
  const cap=mesh(new THREE.SphereGeometry(.19*s,10,8),mat('#589f7d'),x,.43*s,z);cap.scale.y=.72;
 }
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
