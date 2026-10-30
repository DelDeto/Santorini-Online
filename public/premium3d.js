import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

/**
 * Premium island atmosphere and optional, budget-aware post effects.
 * Entirely original procedural rendering; does not rely on remote image assets.
 */
export function createPremiumEnvironment({scene,camera,renderer,container,sun,seaMaterial,mobile}) {
 const owned=[];
 const skyGeometry=new THREE.SphereGeometry(65,48,24);
 const skyMaterial=new THREE.ShaderMaterial({
  side:THREE.BackSide,depthWrite:false,
  uniforms:{
   uSun:{value:new THREE.Vector3(-.38,.57,.49)},
   uTime:{value:0},
   uWarmth:{value:.22}
  },
  vertexShader:[
   'varying vec3 vDirection;',
   'void main(){',
   'vDirection=normalize((modelMatrix*vec4(position,0.0)).xyz);',
   'vec4 p=modelViewMatrix*vec4(position,1.0);',
   'gl_Position=projectionMatrix*p;',
   '}'
  ].join('\n'),
  fragmentShader:[
   'uniform vec3 uSun;uniform float uTime,uWarmth;',
   'varying vec3 vDirection;',
   'float n(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
   'float smoothNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);',
   'return mix(mix(n(i),n(i+vec2(1.,0.)),f.x),mix(n(i+vec2(0.,1.)),n(i+vec2(1.,1.)),f.x),f.y);}',
   'void main(){vec3 d=normalize(vDirection);',
   'float horizon=smoothstep(-.21,.75,d.y);',
   'vec3 low=mix(vec3(.65,.88,.89),vec3(.91,.84,.70),uWarmth*.65);',
   'vec3 high=mix(vec3(.28,.55,.77),vec3(.23,.43,.68),uWarmth);',
   'vec3 sky=mix(low,high,horizon);',
   'vec2 cloudUV=vec2(atan(d.z,d.x),d.y)*vec2(2.5,5.0);',
   'float clouds=smoothNoise(cloudUV*2.4+vec2(uTime*.002,0.));',
   'clouds=.55*clouds+.45*smoothNoise(cloudUV*5.1);',
   'float mask=smoothstep(.61,.78,clouds)*smoothstep(.03,.24,d.y);',
   'sky=mix(sky,vec3(1.,.97,.89),mask*.42);',
   'float sunDot=max(dot(d,normalize(uSun)),0.);',
   'float disk=pow(sunDot,450.);',
   'float glow=pow(sunDot,14.);',
   'sky+=vec3(1.,.74,.43)*glow*(.18+.25*uWarmth)+vec3(1.,.93,.76)*disk*.4;',
   'gl_FragColor=vec4(sky,1.);',
   '}'
  ].join('\n')
 });
 const sky=new THREE.Mesh(skyGeometry,skyMaterial);
 sky.frustumCulled=false;scene.add(sky);owned.push(skyGeometry,skyMaterial);
 const groundLight=new THREE.AmbientLight(0xf4f2e6,.21);scene.add(groundLight);
 const rim=new THREE.DirectionalLight(0xb5f0fa,.64);
 rim.position.set(5,3,-7);scene.add(rim);
 // Soft contact shading under island/pieces: no heavy screen-space AO pass.
 const contactMat=new THREE.MeshBasicMaterial({color:0x103849,transparent:true,opacity:.21,depthWrite:false,side:THREE.DoubleSide});
 const contactGeo=new THREE.CircleGeometry(4.25,64);
 const contact=new THREE.Mesh(contactGeo,contactMat);contact.rotation.x=-Math.PI/2;
 contact.position.y=-.919;contact.scale.set(1.04,.98,1);contact.renderOrder=0;
 scene.add(contact);owned.push(contactGeo,contactMat);
 // Wisps of sea spray and foam, subtle and always outside the playable island.
 const foamM=new THREE.MeshBasicMaterial({color:0xd6fff5,transparent:true,opacity:.24,side:THREE.DoubleSide,depthWrite:false});
 const foamMeshes=[];
 for(let i=0;i<3;i++){
  const radius=4.07+i*.29;
  const g=new THREE.RingGeometry(radius,radius+.027,128);
  const ring=new THREE.Mesh(g,foamM);ring.rotation.x=-Math.PI/2;ring.position.y=-.887+i*.004;
  ring.renderOrder=1;scene.add(ring);foamMeshes.push(ring);owned.push(g);
 }
 owned.push(foamM);
 let composer=null,bloom=null,renderPass=null,outputPass=null;
 let requested='auto',activeQuality='eco',currentW=0,currentH=0;
 const powerSave=!!navigator.connection?.saveData;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 function qualityFor(mode){
  if(mode==='eco')return 'eco';
  if(mode==='hd' && !mobile && !powerSave)return 'hd';
  return !mobile&&!powerSave&&!reduced?'hd':'eco';
 }
 function createComposer(){
  if(composer)return;
  composer=new EffectComposer(renderer);
  renderPass=new RenderPass(scene,camera);composer.addPass(renderPass);
  bloom=new UnrealBloomPass(new THREE.Vector2(Math.max(1,currentW),Math.max(1,currentH)),.13,.24,.91);
  composer.addPass(bloom);outputPass=new OutputPass();composer.addPass(outputPass);
  composer.setSize(Math.max(1,currentW),Math.max(1,currentH));
 }
 function removeComposer(){
  if(!composer)return;
  bloom?.dispose();outputPass?.dispose?.();
  composer.dispose();composer=null;bloom=null;outputPass=null;renderPass=null;
 }
 function setQuality(mode){
  requested=['auto','eco','hd'].includes(mode)?mode:'auto';
  activeQuality=qualityFor(requested);
  if(activeQuality==='hd')createComposer();else removeComposer();
  return activeQuality;
 }
 function resize(w,h){
  currentW=w;currentH=h;
  if(composer)composer.setSize(w,h);
 }
 function update(t){
  skyMaterial.uniforms.uTime.value=t;
  if(!reduced){
   foamMeshes.forEach((ring,i)=>{ring.material.opacity=.19+.035*Math.sin(t*.00062+i*.8);});
  }
 }
 function render(){
  if(composer)composer.render();
  else renderer.render(scene,camera);
 }
 function dispose(){
  removeComposer();
  scene.remove(sky,groundLight,rim,contact,...foamMeshes);
  for(const item of owned)item.dispose();
 }
 setQuality('auto');
 return {update,render,resize,setQuality,dispose,get quality(){return activeQuality;}};
}
