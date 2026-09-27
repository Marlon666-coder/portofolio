/* =====================================================================
 *  MRV ENGINE — GLSL SHADER LIBRARY (GLSL ES 3.00)
 *  All shaders of the scene live here. `MRV.Shaders.build(defs)`
 *  returns the source strings with quality #defines injected.
 * ===================================================================== */
(function (MRV) {
  'use strict';

  const NOISE = /* glsl */`
vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1./6.,1./3.);
  const vec4 D=vec4(0.,.5,1.,2.);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.+1.;
  vec4 s1=floor(b1)*2.+1.;
  vec4 sh=-step(h,vec4(0.));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.);
  m=m*m;
  return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float fbm(vec3 p){
  float f=0.,a=.5;
  for(int i=0;i<FBM_OCT;i++){ f+=a*snoise(p); p=p*2.03+vec3(1.7,9.2,3.1); a*=.5; }
  return f;
}
`;

  /* ---------------- generic vertex shaders ---------------- */
  const VS_FULLSCREEN = `
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv=aPos*.5+.5; gl_Position=vec4(aPos,0.,1.); }`;

  const VS_BILLBOARD = `
layout(location=0) in vec2 aCorner;
uniform mat4 uVP; uniform vec3 uPos, uRight, uUp; uniform float uSize;
out vec2 vC;
void main(){ vC=aCorner; vec3 w=uPos+(uRight*aCorner.x+uUp*aCorner.y)*uSize; gl_Position=uVP*vec4(w,1.); }`;

  /* ---------------- sky / nebula ---------------- */
  const FS_SKY = `
in vec2 vUv; out vec4 o;
uniform mat4 uInvVP; uniform vec3 uCamPos, uSunDir, uNebA, uNebB, uNebC;
uniform float uTime, uReveal, uNebula, uSunGlow;
${NOISE}
void main(){
  vec4 w=uInvVP*vec4(vUv*2.-1.,1.,1.);
  vec3 dir=normalize(w.xyz/w.w-uCamPos);
  float n1=fbm(dir*1.5+vec3(0.,0.,uTime*.003));
  float n2=fbm(dir*3.4+n1*.9+10.);
  float neb=smoothstep(-.15,.75,n1*.65+n2*.5);
  float bq=dir.y*2.1+dir.x*.5+n1*.7; float band=exp(-bq*bq);
  vec3 col=mix(uNebA,uNebB,smoothstep(-.4,.6,n2))*neb*(.25+.75*band);
  col+=uNebC*pow(max(n2+.1,0.),3.)*band*1.2;
  col*=.5+.5*smoothstep(-.35,.35,snoise(dir*7.+n1*2.));
  float sd=max(dot(dir,uSunDir),0.);
  col+=vec3(1.,.5,.18)*(pow(sd,60.)*.9+pow(sd,8.)*.12)*uSunGlow;
  o=vec4(col*uNebula*uReveal,1.);
}`;

  /* ---------------- stars (sky locked) ---------------- */
  const VS_STARS = `
layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aData;
uniform mat4 uVP; uniform vec3 uCamPos; uniform float uTime, uReveal, uPx;
out vec3 vCol; out float vA;
void main(){
  gl_Position=uVP*vec4(uCamPos+aPos,1.);
  float tw=.65+.35*sin(uTime*(1.+aData.y*3.)+aData.y*60.);
  float rev=smoothstep(aData.y*.75,aData.y*.75+.25,uReveal);
  gl_PointSize=max(aData.x*uPx,1.);
  vCol=mix(vec3(.62,.78,1.),vec3(1.,.84,.68),aData.z);
  vA=aData.w*tw*rev;
}`;
  const FS_POINT = `
in vec3 vCol; in float vA; out vec4 o;
void main(){
  vec2 c=gl_PointCoord*2.-1.; float d=dot(c,c);
  if(d>1.) discard;
  float a=exp(-d*5.)+exp(-d*40.)*.8;
  o=vec4(vCol*vA*a,1.);
}`;

  /* ---------------- dust (infinite wrapped field) ---------------- */
  const VS_DUST = `
layout(location=0) in vec3 aPos;
layout(location=1) in vec4 aData;
uniform mat4 uVP; uniform vec3 uCamPos; uniform float uBox, uPx, uAlpha, uTime;
out vec3 vCol; out float vA;
void main(){
  vec3 base=aPos+vec3(0.,uTime*.15*aData.y,0.);
  vec3 rel=mod(base-uCamPos+uBox*.5,uBox)-uBox*.5;
  vec4 cp=uVP*vec4(uCamPos+rel,1.);
  gl_Position=cp;
  float fade=1.-smoothstep(uBox*.28,uBox*.5,length(rel));
  gl_PointSize=clamp(aData.x*uPx*14./max(cp.w,.5),1.,40.);
  vCol=mix(vec3(.45,.7,1.),vec3(.8,.6,1.),aData.z);
  vA=uAlpha*fade*aData.w*smoothstep(0.,3.,cp.w);
}`;

  /* ---------------- lit mesh (planet) ---------------- */
  const VS_MESH = `
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
uniform mat4 uVP, uModel;
out vec3 vW, vN, vO;
void main(){
  vec4 w=uModel*vec4(aPos,1.);
  vW=w.xyz; vN=mat3(uModel)*aNormal; vO=aPos;
  gl_Position=uVP*w;
}`;
  const FS_PLANET = `
in vec3 vW, vN, vO; out vec4 o;
uniform vec3 uCamPos, uLightPos; uniform float uReveal, uTime;
${NOISE}
void main(){
  vec3 N=normalize(vN), L=normalize(uLightPos-vW), V=normalize(uCamPos-vW);
  float bands=fbm(vec3(vO.y*5.,vO.x*.7+uTime*.004,vO.z*.7));
  float storm=snoise(vO*3.2);
  vec3 base=mix(vec3(.06,.1,.28),vec3(.32,.18,.46),smoothstep(-.45,.45,bands));
  base=mix(base,vec3(.1,.45,.55),smoothstep(.35,.8,storm)*.6);
  float diff=max(dot(N,L),0.);
  float ndv=max(dot(N,V),0.);
  float rim=pow(1.-ndv,3.);
  vec3 col=base*(diff*1.25+.015)+vec3(.3,.6,1.)*rim*(.12+diff*.9);
  o=vec4(col*uReveal,1.);
}`;

  /* ---------------- planetary ring ---------------- */
  const VS_RING = `
layout(location=0) in vec3 aPos;
layout(location=2) in vec2 aUv;
uniform mat4 uVP, uModel;
out vec2 vUv; out vec3 vW;
void main(){ vec4 w=uModel*vec4(aPos,1.); vW=w.xyz; vUv=aUv; gl_Position=uVP*w; }`;
  const FS_PLANET_RING = `
in vec2 vUv; in vec3 vW; out vec4 o;
uniform float uReveal;
void main(){
  float r=vUv.x;
  float b=.5+.5*sin(r*90.)*sin(r*37.+1.);
  float a=smoothstep(0.,.08,r)*smoothstep(1.,.85,r)*(.25+.75*b);
  o=vec4(vec3(.5,.55,.8)*a*.22*uReveal,1.);
}`;
  /* holographic / energy ring (weapon + core) */
  const FS_HOLO_RING = `
in vec2 vUv; in vec3 vW; out vec4 o;
uniform vec3 uColor; uniform float uIntensity, uTime, uDashes, uSpeed;
void main(){
  float edge=smoothstep(0.,.25,vUv.x)*smoothstep(1.,.75,vUv.x);
  float dash=step(.35,fract(vUv.y*uDashes+uTime*uSpeed));
  float tick=step(.92,fract(vUv.y*uDashes*4.));
  float g=edge*(.35+.65*dash)+tick*.4*edge;
  o=vec4(uColor*g*uIntensity,1.);
}`;

  /* ---------------- sun ---------------- */
  const VS_SUN = `
layout(location=0) in vec3 aPos;
uniform mat4 uVP; uniform vec3 uCenter; uniform float uRadius, uTime, uShake, uPulse;
out vec3 vObj, vW;
${NOISE}
void main(){
  vec3 n=aPos;
  float d=snoise(n*3.+uTime*.3)*.012+snoise(n*9.-uTime*2.)*uShake*.025;
  vec3 w=uCenter+n*uRadius*(1.+d)*uPulse;
  vObj=n; vW=w;
  gl_Position=uVP*vec4(w,1.);
}`;
  const FS_SUN = `
in vec3 vObj, vW; out vec4 o;
uniform vec3 uCamPos, uCenter, uImpactDir;
uniform float uTime, uWave, uCrack, uCrackR, uCritical, uHeat;
${NOISE}
void main(){
  vec3 n=normalize(vObj);
  vec3 V=normalize(uCamPos-vW);
  float ndv=max(dot(normalize(vW-uCenter),V),0.);
  float t=uTime*(1.+uCritical*3.);
  vec3 q=n*2.2;
  float warp=fbm(q+vec3(t*.05,-t*.04,t*.03));
  float cells=fbm(q*2.6+warp*1.6+vec3(0.,t*.08,0.));
  float gran=snoise(n*30.+warp*2.+t*.3)*.5+.5;
  float heat=clamp(.55+cells*.65+(gran-.5)*.3+uHeat*.06,0.,1.);
  vec3 c1=vec3(.35,.03,.0),c2=vec3(1.,.28,.02),c3=vec3(1.,.62,.16),c4=vec3(1.3,1.15,.8);
  vec3 col=mix(c1,c2,smoothstep(.0,.45,heat));
  col=mix(col,c3,smoothstep(.45,.78,heat));
  col=mix(col,c4,smoothstep(.82,1.,heat));
  col*=(.35+.65*pow(ndv,.5))*1.05;
  col+=vec3(1.,.4,.06)*pow(1.-ndv,2.5)*.9;
  // impact
  float d=acos(clamp(dot(n,uImpactDir),-1.,1.));
  float spot=exp(-d*d*140.)*uWave*3.5;
  float ripple=(sin(d*38.-t*16.)*.5+.5)*exp(-d*2.5)*uWave*smoothstep(0.,.06,d);
  float cr=pow(1.-abs(snoise(n*6.+warp*1.3)),14.);
  float cr2=pow(1.-abs(snoise(n*14.-warp*2.)),18.);
  float mask=smoothstep(uCrackR,uCrackR-.45,d)*uCrack;
  vec3 energy=vec3(.45,.9,1.);
  col+=energy*(cr*1.+cr2*.7)*mask*4.;
  col+=mix(energy,vec3(1.),.6)*spot+vec3(1.,.6,.3)*ripple*.45;
  col*=1.+uCritical*1.1;
  col=mix(col,vec3(2.2,1.9,1.6)*(.85+.15*sin(t*45.)),uCritical*uCritical*.3);
  o=vec4(col,1.);
}`;
  const FS_CORONA = `
in vec2 vC; out vec4 o;
uniform float uTime, uIntensity, uSR; uniform vec3 uColor;
${NOISE}
void main(){
  vec2 p=vC*uSR; float r=length(p);
  float e=max(r-1.,0.);
  float g=exp(-e*2.6)*.4+exp(-e*11.)*.9;
  vec2 dir=p/max(r,1e-4);
  float n=fbm(vec3(dir*2.2,r*1.3-uTime*.25));
  float n2=snoise(vec3(dir*7.,r*2.-uTime*.5));
  float rays=pow(clamp(n*.5+.55,0.,1.),3.)*exp(-e*1.5)*1.1+pow(clamp(n2*.5+.5,0.,1.),6.)*exp(-e*2.6)*.7;
  float edge=smoothstep(uSR,uSR*.72,r);
  vec3 col=mix(uColor,vec3(1.,.85,.6),exp(-e*6.))*(g+rays)*edge*uIntensity;
  o=vec4(col,1.);
}`;

  /* ---------------- generic glow sprite ---------------- */
  const FS_GLOW = `
in vec2 vC; out vec4 o;
uniform vec3 uColor; uniform float uIntensity, uCore, uRays;
void main(){
  float d=length(vC);
  if(d>1.) discard;
  float g=exp(-d*d*6.)*.55+exp(-d*d*uCore);
  g+=(exp(-abs(vC.y)*70.)*exp(-abs(vC.x)*2.5)+exp(-abs(vC.x)*70.)*exp(-abs(vC.y)*2.5)*.6)*uRays;
  g*=smoothstep(1.,.55,d);
  o=vec4(uColor*g*uIntensity,1.);
}`;

  /* ---------------- spaceship ---------------- */
  const VS_SHIP = `
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNormal;
layout(location=3) in vec4 aColor;
uniform mat4 uVP, uModel;
out vec3 vW, vN, vO; out vec4 vCol;
void main(){
  vec4 w=uModel*vec4(aPos,1.);
  vW=w.xyz; vN=mat3(uModel)*aNormal; vO=aPos; vCol=aColor;
  gl_Position=uVP*w;
}`;
  const FS_SHIP = `
in vec3 vW, vN, vO; in vec4 vCol; out vec4 o;
uniform vec3 uCamPos, uSunPos, uSunCol, uFxPos, uFxCol;
uniform float uEngine, uFxInt, uReveal, uTime;
void main(){
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 V=normalize(uCamPos-vW);
  vec3 L=normalize(uSunPos-vW);
  float diff=max(dot(N,L),0.);
  vec3 H=normalize(L+V);
  float spec=pow(max(dot(N,H),0.),90.);
  vec3 R=reflect(-V,N);
  vec3 env=mix(vec3(.015,.02,.05),vec3(.12,.1,.26),R.y*.5+.5)+uSunCol*pow(max(dot(R,L),0.),10.)*.35;
  float fres=pow(1.-max(dot(N,V),0.),4.);
  float seamZ=step(.46,abs(fract(vO.z*1.35+.5)-.5));
  float seamX=step(.475,abs(fract(vO.x*2.2+.5)-.5));
  vec3 base=vCol.rgb*(1.-max(seamZ,seamX)*.55);
  vec3 col=base*(diff*uSunCol*1.2+.03)+uSunCol*spec*1.6+env*base*1.1+vec3(.25,.65,1.)*fres*.4;
  vec3 Lf=uFxPos-vW; float df=length(Lf);
  col+=uFxCol*uFxInt*max(dot(N,Lf/max(df,1e-3)),0.)*(base+.2)/(1.+df*df*.25);
  col+=vCol.rgb*vCol.a*uEngine*(2.6+.4*sin(uTime*40.));
  o=vec4(col*uReveal,1.);
}`;

  /* ---------------- energy beam ribbon ---------------- */
  const VS_BEAM = `
layout(location=0) in vec2 aCorner;
uniform mat4 uVP; uniform vec3 uA, uB, uCamPos; uniform float uWidth, uHead;
out vec2 vC; out float vLen;
void main(){
  vec3 dir=uB-uA;
  float along=aCorner.x*uHead;
  vec3 p=uA+dir*along;
  vec3 side=normalize(cross(dir,uCamPos-p));
  p+=side*aCorner.y*uWidth;
  vC=vec2(along,aCorner.y); vLen=length(dir);
  gl_Position=uVP*vec4(p,1.);
}`;
  const FS_BEAM = `
in vec2 vC; in float vLen; out vec4 o;
uniform float uTime, uIntensity, uHead; uniform vec3 uColor;
${NOISE}
void main(){
  float v=vC.y;
  float core=exp(-v*v*30.);
  float glow=exp(-v*v*3.5);
  float n=snoise(vec3(vC.x*vLen*.12-uTime*28.,v*2.,uTime*2.))*.5+.5;
  float n2=snoise(vec3(vC.x*vLen*.5-uTime*60.,v*5.,1.))*.5+.5;
  float hq=(vC.x-uHead)*60.; float head=smoothstep(uHead,uHead-.015,vC.x)+exp(-hq*hq)*2.;
  float start=smoothstep(0.,.004,vC.x);
  vec3 col=vec3(1.)*core*(2.6+n2)+uColor*glow*(.5+.9*n);
  o=vec4(col*head*start*uIntensity,1.);
}`;

  /* ---------------- expanding shells (plasma / shock) ---------------- */
  const VS_SHELL = `
layout(location=0) in vec3 aPos;
uniform mat4 uVP; uniform vec3 uCenter; uniform float uRadius, uTime, uDisp;
out vec3 vN, vW; out float vD;
${NOISE}
void main(){
  vec3 n=aPos;
  float d=fbm(n*2.2+vec3(uTime*.25))*uDisp;
  vec3 w=uCenter+n*uRadius*(1.+d);
  vN=n; vW=w; vD=d;
  gl_Position=uVP*vec4(w,1.);
}`;
  const FS_SHELL = `
in vec3 vN, vW; in float vD; out vec4 o;
uniform vec3 uCamPos, uCenter, uColorA, uColorB;
uniform float uTime, uIntensity, uDissolve, uMode;
${NOISE}
void main(){
  vec3 V=normalize(uCamPos-vW);
  float ndv=abs(dot(normalize(vW-uCenter),V));
  if(uMode>.5){
    float rim=pow(1.-ndv,3.);
    float n=snoise(vN*5.+uTime)*.5+.5;
    o=vec4(uColorA*rim*(.6+.4*n)*uIntensity,1.);
    return;
  }
  float f=fbm(vN*3.5+vec3(0.,0.,uTime*.4))*.5+.5;
  float f2=snoise(vN*9.-uTime*.6)*.5+.5;
  float m=smoothstep(uDissolve-.12,uDissolve+.12,f*.8+f2*.3);
  float edge=pow(1.-ndv,1.2);
  vec3 col=mix(uColorA,uColorB,f2*f);
  col*=(.05+edge*edge*1.5)*m*(.5+f*.9);
  o=vec4(col*uIntensity,1.);
}`;

  /* ---------------- flat shock ring / grid (plane geometry) ---------------- */
  const VS_PLANE = `
layout(location=0) in vec3 aPos;
uniform mat4 uVP, uModel;
out vec3 vL, vW;
void main(){ vL=aPos; vec4 w=uModel*vec4(aPos,1.); vW=w.xyz; gl_Position=uVP*w; }`;
  const FS_SHOCKRING = `
in vec3 vL, vW; out vec4 o;
uniform float uIntensity, uWidth, uTime; uniform vec3 uColorA, uColorB;
${NOISE}
void main(){
  float r=length(vL.xz);
  if(r>1.) discard;
  vec2 dir=vL.xz/max(r,1e-4);
  float n=snoise(vec3(dir*4.,uTime*.5))*.5+.5;
  float w=uWidth*(.6+.8*n);
  float rq=(r-.9)/w; float ring=exp(-rq*rq);
  float inner=smoothstep(.2,.9,r)*.08;
  float fade=smoothstep(1.,.93,r);
  vec3 col=mix(uColorB,uColorA,ring)*(ring*1.6+inner)*fade*(.5+.7*n);
  o=vec4(col*uIntensity,1.);
}`;
  const FS_GRID = `
in vec3 vL, vW; out vec4 o;
uniform vec3 uCamPos, uColor; uniform float uTime, uIntensity, uScroll;
void main(){
  vec2 g=vW.xz*.22+vec2(0.,uTime*.25+uScroll);
  vec2 gd=abs(fract(g-.5)-.5)/fwidth(g);
  float line=1.-min(min(gd.x,gd.y),1.);
  vec2 g2=vW.xz*.044+vec2(0.,(uTime*.25+uScroll)*.2);
  vec2 gd2=abs(fract(g2-.5)-.5)/fwidth(g2);
  float line2=1.-min(min(gd2.x,gd2.y),1.);
  float dist=length(vW.xz-uCamPos.xz);
  float fade=exp(-dist*.013)*smoothstep(2.,25.,dist);
  float pq=fract(vW.z*.012+uTime*.08)-.5; float pulse=exp(-pq*pq*300.);
  vec3 col=uColor*(line*.25+line2*.55+pulse*line*.9)*fade;
  o=vec4(col*uIntensity,1.);
}`;

  /* ---------------- GPU analytic particle system ----------------
   * One program, many behaviours selected by uType. Positions are a
   * pure function of (seed, time) so no CPU simulation is needed. */
  const VS_FX = `
layout(location=0) in vec2 aCorner;
layout(location=4) in vec4 aA;
layout(location=5) in vec4 aB;
uniform mat4 uVP; uniform vec3 uCamPos, uRight, uUp, uOrigin, uTarget;
uniform int uType; uniform float uTime, uScale, uIntensity; uniform vec4 uParam;
out vec2 vC; out vec3 vCol; out float vA; out float vSeed; flat out int vShape;
const float PI=3.14159265;
${NOISE}
void main(){
  vec3 dir=aA.xyz; float s=aA.w;
  vec3 p=uOrigin; float size=.1; vec3 col=vec3(1.); float a=1.; int shape=0;
  bool streak=false; vec3 sdir=vec3(0.,1.,0.); float slen=0.;
  if(uType==0){ // solar prominence particles
    float cyc=3.+aB.x*4.; float ph=fract(uTime/cyc+s*7.);
    vec3 t1=normalize(cross(dir,vec3(0.,1.,.3)));
    float h=sin(ph*PI)*(.04+.22*aB.y*aB.y)*(1.+uParam.x*1.5);
    p=uOrigin+normalize(dir+t1*(ph-.5)*.25*aB.z)*uScale*(1.+h);
    size=uScale*(.02+.035*aB.w)*(1.+uParam.x*.6);
    a=sin(ph*PI); col=mix(vec3(1.4,.45,.08),vec3(1.6,1.,.4),aB.z);
  } else if(uType==1){ // spiral particles along the beam
    vec3 D=uTarget-uOrigin; float L=length(D); vec3 f=D/max(L,1e-3);
    vec3 t1=normalize(cross(f,vec3(0.,1.,.001))); vec3 t2=cross(f,t1);
    float u=fract(s+uTime*(.5+aB.x*.8));
    a=step(u,uParam.x)*sin(u*PI)*(.4+aB.y);
    float ang=s*50.+u*L*.5*(aB.z>.5?1.:-1.)-uTime*7.;
    float rad=uScale*(.3+aB.w*1.3);
    p=uOrigin+D*u+(t1*cos(ang)+t2*sin(ang))*rad;
    size=uScale*(.06+.1*aB.x); col=mix(vec3(.4,.85,1.6),vec3(1.8),aB.y);
  } else if(uType==2){ // impact sparks
    vec3 nrm=normalize(uTarget);
    vec3 d=normalize(dir+nrm*1.4);
    float ph=fract(uTime*(.8+aB.x)+s);
    p=uOrigin+d*ph*uScale*(.6+aB.y*1.8);
    a=(1.-ph)*(1.-ph); size=uScale*(.02+.03*aB.z);
    col=mix(vec3(1.8,1.,.4),vec3(.6,1.3,1.8),aB.w)*1.6;
    streak=true; sdir=d; slen=uScale*.18*(1.-ph)+size;
  } else if(uType==3){ // charge particles converging to the emitter
    float ph=fract(uTime*(.45+aB.x*.6)+s);
    float r0=uScale*(1.+aB.y*3.);
    p=uOrigin+dir*r0*pow(1.-ph,2.);
    a=smoothstep(0.,.3,ph)*(1.-smoothstep(.92,1.,ph));
    size=uScale*(.025+.04*aB.z); col=mix(vec3(.3,.85,1.6),vec3(1.2,1.4,1.6),aB.w)*1.5;
    streak=true; sdir=-dir; slen=size*3.+uScale*.6*(1.-ph);
  } else if(uType==4){ // explosion fire
    float spd=mix(.15,1.,pow(aB.x,.7));
    float ex=1.-exp(-uTime*(.55+aB.y*.9)*1.2);
    vec3 turb=vec3(snoise(dir*2.+vec3(s*10.)),snoise(dir*2.+vec3(17.,s,3.)),snoise(dir*2.+vec3(5.,31.,s)));
    p=uOrigin+(dir*(.35+spd*2.3*ex)+turb*.35*ex)*uScale;
    float life=2.5+aB.z*4.; float age=uTime/life;
    a=smoothstep(0.,.05,uTime)*(1.-smoothstep(.35,1.,age));
    float big=step(.93,aB.w);
    size=uScale*(.03+.07*aB.w+big*.22)*(.5+ex*1.2);
    float hot=exp(-uTime*(.6+spd*1.2));
    col=mix(vec3(.55,.08,.02),vec3(1.,.45,.1)*1.6,clamp(hot*1.6,0.,1.));
    col=mix(col,vec3(2.6,2.3,2.),hot*hot);
    if(s>.88) col=mix(col,vec3(.4,.7,1.5),.6*(1.-hot));
    a*=(big>.5?.3:1.)*.07;
    shape=1;
  } else if(uType==5){ // debris streaks + solar fragments
    float spd=1.2+aB.x*3.;
    float ex=(1.-exp(-uTime*.9))/.9;
    p=uOrigin+dir*uScale*(.9+spd*ex*.9);
    float life=2.+aB.y*3.5; float age=uTime/life;
    a=(1.-smoothstep(.2,1.,age))*smoothstep(0.,.02,uTime);
    float vel=spd*exp(-uTime*.9);
    if(aB.z>.82){
      size=uScale*(.03+.05*aB.w); col=vec3(2.,1.1,.4)*(.5+exp(-uTime*.8)); shape=1;
    } else {
      streak=true; sdir=dir; slen=uScale*(.06+vel*.22); size=uScale*.01*(1.+aB.w);
      col=mix(vec3(2.4,1.6,.8),vec3(1.2,.3,.05),clamp(uTime*.4,0.,1.))*.6;
    }
  } else if(uType==6){ // lingering embers
    float ex=1.-exp(-uTime*(.25+aB.x*.4));
    vec3 drift=vec3(snoise(dir*3.+uTime*.1),snoise(dir*3.+9.+uTime*.1),snoise(dir*3.+19.+uTime*.1));
    p=uOrigin+(dir*(.8+aB.y*3.2)*ex+drift*.4)*uScale;
    float life=6.+aB.z*6.;
    a=smoothstep(.3,1.2,uTime)*(1.-smoothstep(.3,1.,uTime/life))*(.5+.5*sin(uTime*(3.+aB.w*6.)+s*30.));
    size=uScale*(.006+.012*aB.w); col=mix(vec3(1.5,.6,.15),vec3(.5,.8,1.5),step(.7,aB.x));
  } else if(uType==7){ // holographic core emission
    float ph=fract(uTime*(.12+aB.x*.15)+s);
    float ang=s*6.2831+ph*(2.+aB.y*3.);
    float r=uScale*(.35+ph*(.6+aB.z*1.2));
    p=uOrigin+vec3(cos(ang)*r,(ph*2.4-.6)*uScale,sin(ang)*r);
    a=sin(ph*PI)*(.5+.5*aB.w);
    size=uScale*(.012+.02*aB.w);
    col=aB.y<.45?vec3(.3,.85,1.4):(aB.y<.8?vec3(.7,.4,1.4):vec3(1.4,.6,.2));
  } else { // 8: ambient floating particles
    vec3 box=uParam.xyz;
    vec3 base=(aB.xyz-.5)*box;
    base.y=mod(base.y+uTime*(.3+aB.w*.6)+box.y*.5,box.y)-box.y*.5;
    p=uOrigin+base+vec3(sin(uTime*.3+s*20.),0.,cos(uTime*.25+s*13.))*.6;
    a=(.25+.5*aB.w)*smoothstep(box.y*.5,box.y*.3,abs(base.y));
    size=.04+.08*aB.w;
    col=mix(vec3(.3,.8,1.3),vec3(.7,.5,1.3),s);
  }
  vec3 w;
  if(streak){
    vec3 side=normalize(cross(sdir,uCamPos-p));
    w=p-sdir*(aCorner.x*.5+.5)*slen+side*aCorner.y*size;
  } else {
    w=p+(uRight*aCorner.x+uUp*aCorner.y)*size;
  }
  gl_Position=uVP*vec4(w,1.);
  vC=aCorner; vCol=col; vA=a*uIntensity; vSeed=s; vShape=shape;
}`;
  const FS_FX = `
in vec2 vC; in vec3 vCol; in float vA; in float vSeed; flat in int vShape; out vec4 o;
void main(){
  float d=length(vC);
  if(d>1.) discard;
  float g;
  if(vShape==1){
    float ang=atan(vC.y,vC.x);
    g=pow(smoothstep(1.,0.,d),1.6)*(.75+.25*sin(ang*5.+vSeed*40.));
  } else {
    g=(exp(-d*d*5.)+exp(-d*d*40.)*.6)*smoothstep(1.,.7,d);
  }
  o=vec4(vCol*vA*g,1.);
}`;

  /* CPU-simulated particles (engine trails) */
  const VS_CPU = `
layout(location=0) in vec2 aCorner;
layout(location=4) in vec4 aP;
layout(location=5) in vec4 aC;
uniform mat4 uVP; uniform vec3 uRight, uUp;
out vec2 vC; out vec4 vCol;
void main(){ vC=aCorner; vCol=aC; vec3 w=aP.xyz+(uRight*aCorner.x+uUp*aCorner.y)*aP.w; gl_Position=uVP*vec4(w,1.); }`;
  const FS_CPU = `
in vec2 vC; in vec4 vCol; out vec4 o;
void main(){ float d=dot(vC,vC); if(d>1.) discard; float g=exp(-d*4.)*smoothstep(1.,.6,d); o=vec4(vCol.rgb*vCol.a*g,1.); }`;

  /* ---------------- hologram morph particles ---------------- */
  const VS_HOLO = `
layout(location=0) in vec3 aStart;
layout(location=1) in vec3 aT1;
layout(location=2) in vec3 aT2;
layout(location=3) in vec4 aR;
uniform mat4 uVP; uniform float uTime, uP0, uP1, uDisperse, uHolo, uPx, uAlpha;
out vec3 vCol; out float vA;
float stag(float u,float r){ return smoothstep(0.,1.,clamp(u*1.6-r*.6,0.,1.)); }
void main(){
  float t=uTime;
  vec3 sc=aStart+vec3(sin(t*.7+aR.x*20.),cos(t*.6+aR.y*20.),sin(t*.5+aR.z*20.))*.5;
  float k0=stag(uP0,aR.x);
  float k1=stag(uP1,aR.y);
  vec3 tgt=mix(aT1,aT2,k1);
  float travel=k0*(1.-k0)*4.+k1*(1.-k1)*4.;
  vec3 p=mix(sc,tgt,k0);
  p+=vec3(sin(t*3.+aR.z*30.),cos(t*2.7+aR.w*30.),sin(t*2.+aR.x*9.))*.35*travel;
  p+=vec3(sin(t*6.+aR.w*50.),cos(t*5.+aR.x*50.),0.)*.01;
  float band=step(.965,fract(sin(floor(p.y*7.)*12.9898+floor(t*9.))*43758.5453));
  p.x+=band*.18*k0*(1.-uDisperse);
  vec3 away=normalize(aStart+vec3(0.,0.,.001));
  p+=(away*14.+vec3(0.,0.,8.))*uDisperse*uDisperse*(.4+aR.z);
  vec4 cp=uVP*vec4(p,1.);
  gl_Position=cp;
  gl_PointSize=clamp(uPx*(1.3+aR.w*1.1)*(1.+travel*1.2)*(12./max(cp.w,.1)),1.,48.);
  vec3 fire=mix(vec3(1.7,.6,.15),vec3(2.,1.35,.6),aR.z);
  vec3 holo=mix(vec3(.25,.9,1.7),vec3(.65,.5,1.7),aR.x*aR.x);
  holo=mix(holo,vec3(1.7,1.9,2.),step(.93,aR.y));
  vCol=mix(fire,holo,uHolo);
  float scan=.75+.25*sin(p.y*40.-t*6.);
  vA=uAlpha*scan*(1.-uDisperse)*(.6+.4*aR.w)*(1.+band);
}`;

  /* ---------------- holographic flame core ---------------- */
  const VS_FLAME = `
layout(location=0) in vec3 aPos;
uniform mat4 uVP, uModel; uniform float uTime, uSeed;
out vec3 vW, vN, vO; out float vF;
${NOISE}
void main(){
  vec3 n=aPos; float t=uTime+uSeed*10.;
  float fl=snoise(vec3(n.x*1.8,n.y*1.8-t*1.3,n.z*1.8+uSeed));
  float fl2=snoise(n*4.+t*.7);
  vec3 p=n*(1.+fl*.16+fl2*.06);
  float up=max(n.y,0.);
  p.y+=up*up*(.7+.4*fl);
  p.xz*=1.-up*.35;
  vec4 w=uModel*vec4(p,1.);
  vW=w.xyz; vN=normalize(mat3(uModel)*n); vO=p; vF=fl;
  gl_Position=uVP*w;
}`;
  const FS_FLAME = `
in vec3 vW, vN, vO; in float vF; out vec4 o;
uniform vec3 uCamPos, uCyan, uPurple, uOrange; uniform float uTime, uIntensity;
void main(){
  vec3 N=normalize(vN), V=normalize(uCamPos-vW);
  float fres=pow(1.-abs(dot(N,V)),2.2);
  float scan=.55+.45*sin(vO.y*34.-uTime*5.);
  float bands=smoothstep(.45,.5,fract(vO.y*5.-uTime*.6))*smoothstep(.55,.5,fract(vO.y*5.-uTime*.6));
  vec3 col=mix(uCyan,uPurple,clamp(vO.y*.45+.5+vF*.35,0.,1.));
  col=mix(col,uOrange,smoothstep(-.1,-1.,vO.y)*.65);
  float I=(fres*1.7+.08)*scan+bands*.5;
  o=vec4(col*I*uIntensity,1.);
}`;
  const FS_LABEL = `
in vec2 vC; out vec4 o;
uniform sampler2D uTex; uniform vec3 uColor; uniform float uIntensity, uTime;
void main(){
  vec2 uv=vC*.5+.5; uv.y=1.-uv.y;
  float g=step(.985,fract(uTime*.9))*.03;
  vec4 t=texture(uTex,uv+vec2(g,0.));
  float scan=.8+.2*sin(uv.y*120.+uTime*6.);
  o=vec4(uColor*(t.r*1.8+t.g*.6)*scan*uIntensity,1.);
}`;

  /* ---------------- post processing ---------------- */
  const FS_BRIGHT = `
in vec2 vUv; out vec4 o;
uniform sampler2D uTex; uniform vec2 uTexel; uniform float uThreshold;
void main(){
  vec3 c=(texture(uTex,vUv+uTexel*vec2(-.5,-.5)).rgb+texture(uTex,vUv+uTexel*vec2(.5,-.5)).rgb+
          texture(uTex,vUv+uTexel*vec2(-.5,.5)).rgb+texture(uTex,vUv+uTexel*vec2(.5,.5)).rgb)*.25;
  float l=max(c.r,max(c.g,c.b));
  float k=smoothstep(uThreshold,uThreshold+.7,l);
  o=vec4(min(c*k,vec3(40.)),1.);
}`;
  const FS_BLUR = `
in vec2 vUv; out vec4 o;
uniform sampler2D uTex; uniform vec2 uDir;
void main(){
  vec3 c=texture(uTex,vUv).rgb*.227027;
  c+=(texture(uTex,vUv+uDir*1.384615).rgb+texture(uTex,vUv-uDir*1.384615).rgb)*.316216;
  c+=(texture(uTex,vUv+uDir*3.230769).rgb+texture(uTex,vUv-uDir*3.230769).rgb)*.07027;
  o=vec4(c,1.);
}`;
  const FS_STREAK = `
in vec2 vUv; out vec4 o;
uniform sampler2D uTex; uniform vec2 uDir;
void main(){
  vec3 c=vec3(0.); float ws=0.;
  for(int i=-8;i<=8;i++){ float w=exp(-abs(float(i))*.28); c+=texture(uTex,vUv+uDir*float(i)).rgb*w; ws+=w; }
  o=vec4(c/ws,1.);
}`;
  const FS_COMPOSITE = `
in vec2 vUv; out vec4 o;
uniform sampler2D uScene, uBloomA, uBloomB, uStreak;
uniform vec2 uRes, uRadialCenter, uHeatCenter;
uniform vec3 uFlashColor;
uniform float uTime, uExposure, uFlash, uRadial, uAberr, uGrain, uVignette, uHeat, uHeatRadius, uFade, uBloom, uStreakAmt;
float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
vec3 aces(vec3 x){ return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.); }
void main(){
  vec2 uv=vUv;
  if(uHeat>0.){
    vec2 d=(uv-uHeatCenter)*vec2(uRes.x/uRes.y,1.);
    float r=length(d);
    float m=uHeat*smoothstep(uHeatRadius*1.7,uHeatRadius*.95,r)*smoothstep(uHeatRadius*.75,uHeatRadius*1.,r);
    uv+=vec2(sin(uv.y*90.+uTime*7.),cos(uv.x*80.-uTime*6.))*.0022*m;
  }
  vec3 col;
  if(uRadial>.0005){
    vec2 dir=uv-uRadialCenter; vec3 acc=vec3(0.);
    for(int i=0;i<RB_SAMPLES;i++){ float k=float(i)/float(RB_SAMPLES); acc+=texture(uScene,uv-dir*k*uRadial).rgb; }
    col=acc/float(RB_SAMPLES);
  } else col=texture(uScene,uv).rgb;
  if(uAberr>0.){
    vec2 off=(uv-.5)*uAberr;
    col.r=mix(col.r,texture(uScene,uv+off).r,.7);
    col.b=mix(col.b,texture(uScene,uv-off).b,.7);
  }
  col+=(texture(uBloomA,uv).rgb*.4+texture(uBloomB,uv).rgb*.6)*uBloom;
  col+=texture(uStreak,uv).rgb*vec3(.35,.65,1.)*uStreakAmt;
  col*=uExposure;
  col+=uFlashColor*uFlash*2.5;
  col=aces(col);
  vec2 q=uv-.5;
  col*=mix(1.,smoothstep(.95,.2,length(q*vec2(1.,.85))),uVignette);
  col+=(hash(uv*uRes+fract(uTime*7.1)*100.)-.5)*uGrain;
  col=mix(col,vec3(0.),uFade);
  o=vec4(col,1.);
}`;

  function header(defs) {
    let s = '#version 300 es\nprecision highp float;\nprecision highp int;\n';
    for (const k in defs) s += '#define ' + k + ' ' + defs[k] + '\n';
    return s;
  }

  MRV.Shaders = {
    build(defs) {
      const h = header(defs);
      const S = (vs, fs) => ({ vs: h + vs, fs: h + fs });
      return {
        sky: S(VS_FULLSCREEN, FS_SKY),
        stars: S(VS_STARS, FS_POINT),
        dust: S(VS_DUST, FS_POINT),
        planet: S(VS_MESH, FS_PLANET),
        planetRing: S(VS_RING, FS_PLANET_RING),
        holoRing: S(VS_RING, FS_HOLO_RING),
        sun: S(VS_SUN, FS_SUN),
        corona: S(VS_BILLBOARD, FS_CORONA),
        glow: S(VS_BILLBOARD, FS_GLOW),
        ship: S(VS_SHIP, FS_SHIP),
        beam: S(VS_BEAM, FS_BEAM),
        shell: S(VS_SHELL, FS_SHELL),
        shockRing: S(VS_PLANE, FS_SHOCKRING),
        grid: S(VS_PLANE, FS_GRID),
        fx: S(VS_FX, FS_FX),
        cpu: S(VS_CPU, FS_CPU),
        holo: S(VS_HOLO, FS_POINT),
        flame: S(VS_FLAME, FS_FLAME),
        label: S(VS_BILLBOARD, FS_LABEL),
        bright: S(VS_FULLSCREEN, FS_BRIGHT),
        blur: S(VS_FULLSCREEN, FS_BLUR),
        streak: S(VS_FULLSCREEN, FS_STREAK),
        composite: S(VS_FULLSCREEN, FS_COMPOSITE)
      };
    }
  };
})(window.MRV = window.MRV || {});
