// All effect positions use the photograph's coordinates, before object-fit cropping.
// One bounded canvas, no network dependencies, and no work while motion is disabled.
const W = 1536, H = 1024, TAU = Math.PI * 2;
const fract = n => n - Math.floor(n);
const seed = n => fract(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const polygon = (ctx, points) => {
  ctx.beginPath(); points.forEach(([x,y],i) => ctx[i ? 'lineTo' : 'moveTo'](x*W,y*H)); ctx.closePath();
};

export class SceneMotion {
  constructor(host) {
    this.host = host; this.canvas = document.createElement('canvas');
    this.canvas.className = 'scene-motion'; this.canvas.setAttribute('aria-hidden','true');
    host.replaceChildren(this.canvas); this.ctx = this.canvas.getContext('2d', {alpha:true});
    this.scene = null; this.image = null; this.frame = 0; this.elapsed = 0; this.last = 0; this.frames = 0;
    this.preference = matchMedia('(prefers-reduced-motion: reduce)');
    this.resizeObserver = new ResizeObserver(() => this.resize()); this.resizeObserver.observe(host);
    this.bodyObserver = new MutationObserver(() => this.sync());
    this.bodyObserver.observe(document.body,{attributes:true,attributeFilter:['class']});
    document.addEventListener('visibilitychange', () => this.sync());
    this.preference.addEventListener('change', () => this.sync());
    this.glow = document.createElement('canvas'); this.glow.width = this.glow.height = 96;
    const g = this.glow.getContext('2d'), gradient = g.createRadialGradient(48,48,0,48,48,48);
    gradient.addColorStop(0,'#fff'); gradient.addColorStop(.3,'#ffffffb0'); gradient.addColorStop(1,'#ffffff00');
    g.fillStyle=gradient; g.fillRect(0,0,96,96); this.resize();
  }
  setScene(scene,image,suppressed=false) {
    this.suppressed = suppressed;
    this.scene = scene; this.image = image; this.elapsed = 0;
    this.host.dataset.effect = scene.id; this.clear(); this.sync();
  }
  resize() {
    const {width,height} = this.host.getBoundingClientRect();
    if(width<1 || height<1) return;
    this.dpr = Math.min(devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.round(width*this.dpr); this.canvas.height = Math.round(height*this.dpr);
    this.scale = Math.max(width/W,height/H);
    this.offsetX = (width-W*this.scale)*(width<768 ? .58 : .5);
    this.offsetY = (height-H*this.scale)*.5;
    if(this.scene) this.draw(this.elapsed);
  }
  get enabled() { return this.ctx && this.scene && !this.suppressed && !document.hidden && !document.body.classList.contains('motion-off') && !this.preference.matches; }
  sync() {
    if(!this.enabled) {
      cancelAnimationFrame(this.frame); this.frame=0; this.last=0; this.clear(); return;
    }
    if(!this.frame) { this.last=0; this.frame=requestAnimationFrame(time=>this.tick(time)); }
  }
  tick(time) {
    if(!this.enabled) { this.sync(); return; }
    if(!this.last || time-this.last>=1000/30-1) {
      this.elapsed += this.last ? Math.min((time-this.last)/1000,.1) : 0;
      this.last=time; this.draw(this.elapsed); this.frames++;
    }
    this.frame=requestAnimationFrame(time=>this.tick(time));
  }
  clear() { if(this.ctx) {this.ctx.setTransform(1,0,0,1,0,0);this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);} }
  draw(t) {
    this.clear(); if(!this.enabled) return;
    const c=this.ctx; c.setTransform(this.dpr*this.scale,0,0,this.dpr*this.scale,this.dpr*this.offsetX,this.dpr*this.offsetY);
    c.save();
    const kind=this.scene.picture;
    if(kind==='rain') this.rain(c,t,false);
    else if(kind==='tea') this.tea(c,t);
    else if(kind==='library') this.study(c,t);
    else if(kind==='alley') this.alley(c,t);
    else if(kind==='forest') this.forest(c,t);
    else if(kind==='sea') this.sea(c,t);
    else if(kind==='fire') this.fire(c,t);
    else if(kind==='train') this.train(c,t);
    else if(kind==='bamboo') this.bamboo(c,t);
    else if(this.scene.weather==='rain') this.rain(c,t,false);
    else this.dust(c,t,32,[.2,.1,.9,.75],'224,225,200');
    c.restore();
  }
  halo(c,x,y,rx,ry,color,alpha) {
    c.save(); c.globalAlpha=alpha; c.translate(x*W,y*H); c.scale(rx*W,ry*H);
    const g=c.createRadialGradient(0,0,0,0,0,1);g.addColorStop(0,`rgba(${color},1)`);g.addColorStop(1,`rgba(${color},0)`);
    c.fillStyle=g;c.fillRect(-1,-1,2,2);c.restore();
  }
  dust(c,t,count,box,color) {
    const [x,y,right,bottom]=box;
    for(let i=0;i<count;i++) {
      const a=seed(i+1), b=seed(i+101), phase=fract(b+t*(.009+a*.012));
      const px=(x+(right-x)*a)*W+Math.sin(t*.33+i)*13;
      const py=(bottom-(bottom-y)*phase)*H;
      const opacity=Math.sin(phase*Math.PI)*(.15+seed(i+8)*.4);
      c.fillStyle=`rgba(${color},${opacity})`;c.beginPath();c.ellipse(px,py,1+seed(i+300)*2,1+seed(i+300)*2,0,0,TAU);c.fill();
    }
  }
  fallingRain(c,t,count,box,speed=1) {
    const [x,y,right,bottom]=box;
    for(let i=0;i<count;i++) {
      const a=seed(i+3),b=seed(i+800),depth=.3+seed(i+55)*.7;
      const phase=fract(b+t*(.7+depth*.6)*speed);
      const px=(x+a*(right-x))*W-phase*20,py=(y+phase*(bottom-y))*H;
      c.strokeStyle=`rgba(204,231,231,${.13+depth*.25})`;c.lineWidth=.5+depth*.8;
      c.beginPath();c.moveTo(px,py);c.lineTo(px-3-depth*4,py+12+depth*26);c.stroke();
    }
  }
  glass(c,t,box,count=45) {
    const [x,y,right,bottom]=box;
    for(let i=0;i<count;i++) {
      const a=seed(i+99),b=seed(i+54),phase=fract(b+t*(.016+seed(i+5)*.035));
      const px=(x+a*(right-x))*W+Math.sin(phase*6+i)*2,py=(y+phase*(bottom-y))*H;
      const r=1.5+seed(i+7)*3.5;
      c.strokeStyle='rgba(230,245,247,.28)';c.lineWidth=r*.55;c.lineCap='round';
      c.beginPath();c.moveTo(px,py-12-r*9);c.bezierCurveTo(px-2,py-10,px+1,py-r*2,px,py);c.stroke();
      c.fillStyle='rgba(10,27,30,.21)';c.beginPath();c.ellipse(px,py,r,r*1.55,0,0,TAU);c.fill();
      c.strokeStyle='rgba(238,249,247,.55)';c.lineWidth=.7;c.beginPath();c.ellipse(px-.4,py-.8,r*.65,r*1.1,-.3,Math.PI,TAU);c.stroke();
    }
  }
  rain(c,t) {
    polygon(c,[[.19,0],[.79,0],[.79,.8],[.33,.8],[.33,.67],[.19,.52]]);c.clip();
    this.fallingRain(c,t,170,[.19,-.08,.8,.83],.7);this.glass(c,t,[.2,0,.79,.8],68);
  }
  steam(c,t,x,y,phase=0) {
    // Soft overlapping wisps originate at the kettle/cup, not the middle of the screen.
    for(let i=0;i<33;i++) {
      const p=fract(i/33+t*.13+phase),rise=p*220;
      const sway=Math.sin(p*8+t*.65+phase*7)*(.4+p)*19;
      const size=9+p*27;
      c.globalAlpha=Math.sin(p*Math.PI)*.115;
      c.drawImage(this.glow,x*W+sway-size,y*H-rise-size,size*2,size*2.8);
    }
    c.globalAlpha=1;
  }
  fog(c,t,x,y,span,strength=.13) {
    for(let i=0;i<8;i++) {
      const dx=Math.sin(t*.12+i*1.8)*.045,dy=Math.cos(t*.08+i)*.013;
      this.halo(c,x+span*(i/7-.5)+dx,y+dy,.115,.04,'231,239,228',strength*(.65+Math.sin(t*.2+i)*.2));
    }
  }
  tea(c,t) {
    this.fog(c,t,.65,.38,.5,.095);
    this.steam(c,t,.614,.592,0);this.steam(c,t,.486,.624,.52);
    this.halo(c,.541,.11,.09,.13,'255,187,94',.055+Math.sin(t*.7)*.017);
  }
  study(c,t) {
    this.halo(c,.637,.515,.18,.29,'255,184,81',.065+Math.sin(t*.65)*.018);
    this.dust(c,t,76,[.32,.15,.76,.69],'255,222,161');
    // Slow, broad tree shadows passing over the window; lamp remains steady.
    c.save();polygon(c,[[.32,.02],[.89,.02],[.89,.46],[.32,.46]]);c.clip();
    for(let i=0;i<6;i++){c.fillStyle=`rgba(4,20,18,${.025+Math.sin(t*.35+i)*.012})`;c.beginPath();c.ellipse((.38+i*.085)*W+Math.sin(t*.4+i)*7,.24*H,25,170,.4,0,TAU);c.fill();}c.restore();
  }
  alley(c,t) {
    this.fallingRain(c,t,225,[.12,.05,.89,1],1.05);
    c.save();polygon(c,[[.46,.43],[.58,.43],[.87,1],[.17,1]]);c.clip();
    for(let i=0;i<40;i++) {
      const a=seed(i+21),b=seed(i+44),p=fract(t*(.4+a*.4)+b),y=.5+seed(i+63)*.5;
      const x=.51+(a-.5)*(.06+(y-.43)*1.2),r=(5+(y-.45)*35)*p;
      c.lineWidth=.7;c.strokeStyle=`rgba(218,225,212,${(1-p)*.36})`;c.beginPath();c.ellipse(x*W,y*H,r,r*.23,0,0,TAU);c.stroke();
    }
    for(let i=0;i<13;i++) {const y=.57+i*.033;c.fillStyle=`rgba(255,184,77,${.035+.035*Math.sin(t*2.4+i*1.9)})`;c.fillRect((.47+Math.sin(i*4)*.02)*W,y*H,(.03+i*.001)*W,2+Math.sin(t+i));}c.restore();
  }
  water(c,t,points,top,bottom,amplitude,speed=1,opacity=.7,vertical=1.1) {
    if(!this.image?.complete) return;
    c.save();polygon(c,points);c.clip();
    const start=top*H,end=bottom*H;
    for(let y=start;y<end;y+=5) {
      const envelope=Math.min(1,(y-start)/25,(end-y)/25),dx=Math.sin(y*.045-t*speed)*amplitude*envelope;
      c.globalAlpha=opacity*envelope;
      c.drawImage(this.image,0,y,W,5,dx,y+Math.sin(t*speed+y*.025)*vertical*envelope,W,5.5);
    }
    c.restore();
  }
  forest(c,t) {
    if(!this.image?.complete) return;
    // Only the two photographed falling-water columns move. The forest,
    // sunlight, pool, foreground stream and rocks remain completely still.
    c.save();
    const side=new Path2D();side.moveTo(.575*W,.376*H);side.lineTo(.585*W,.373*H);side.lineTo(.579*W,.496*H);side.lineTo(.569*W,.502*H);side.closePath();
    // Clip both paths together using one Path2D to keep the gap/cliff static.
    const main=new Path2D();
    [[.502,.382],[.551,.381],[.549,.417],[.542,.461],[.539,.503],[.49,.503],[.493,.458],[.492,.422]].forEach(([x,y],i)=>main[i?'lineTo':'moveTo'](x*W,y*H));main.closePath();main.addPath(side);c.clip(main);
    for(let pass=0;pass<2;pass++) {
      const phase=fract(t*.65+pass*.5),shift=phase*15,blend=Math.sin(phase*Math.PI)**2;
      for(let y=.377*H;y<.504*H;y+=3) {
        const edge=Math.max(0,Math.min(1,(y-.377*H)/14,(.504*H-y)/14));
        c.globalAlpha=.48*blend*edge;
        c.drawImage(this.image,.48*W,y-shift,.115*W,3,.48*W,y,.115*W,3);
      }
    }
    c.restore();
  }
  sea(c,t) {
    // A restrained shimmer of the existing water texture, with no painted
    // wave stripes or flashing rectangles. Horizon, boat and sand stay fixed.
    this.water(c,t,[[0,.448],[1,.448],[1,.56],[.65,.645],[.3,.72],[0,.775]],.448,.775,.55,.38,.22,.16);
  }
  fire(c,t) {
    // Keep the real flame silhouette intact; just a little local warmth and
    // three faint embers instead of warping the photograph or filling the sky.
    this.halo(c,.555,.738,.09,.13,'255,113,32',.021+Math.sin(t*1.15)*.004+Math.sin(t*1.83)*.002);
    for(let i=0;i<3;i++) {
      const p=fract(t*(.07+seed(i+61)*.02)+seed(i+80));
      const x=(.556+(seed(i+30)-.5)*.025)*W+Math.sin(p*4+i)*p*5,y=(.733-p*.085)*H;
      const a=Math.sin(p*Math.PI)*.16,r=.65*(1-p)+.25;
      c.fillStyle=`rgba(255,190,101,${a})`;c.beginPath();c.ellipse(x,y,r,r*1.2,0,0,TAU);c.fill();
    }
  }
  train(c,t) {
    c.save();polygon(c,[[.345,.06],[.925,.06],[.925,.59],[.348,.59]]);c.clip();
    for(let i=0;i<17;i++) {
      const phase=fract(t*(.04+seed(i+25)*.035)+seed(i+6));
      const x=(.34+phase*.62)*W,y=(.27+seed(i+49)*.27)*H;
      const glow=c.createLinearGradient(x-65,y,x+15,y);glow.addColorStop(0,'#ffb96000');glow.addColorStop(.85,'#ffd29a99');glow.addColorStop(1,'#ffd29a00');
      c.globalAlpha=.25+seed(i+16)*.5;c.fillStyle=glow;c.fillRect(x-65,y,80,2+seed(i+3)*5);
    }
    c.globalAlpha=1;this.glass(c,t,[.35,.07,.925,.6],76);this.fallingRain(c,t,65,[.35,.06,.93,.59],.3);c.restore();
    this.halo(c,.62,.64,.13,.19,'255,182,82',.04+Math.sin(t*2.6)*.012);
  }
  bamboo(c,t) {
    // Animate the real bamboo texture, with a fixed lower railing/interior.
    this.water(c,t,[[.26,0],[1,0],[1,.64],[.265,.64]],0,.64,5.5,.75);
    this.halo(c,.62,.28,.26,.4,'231,244,167',.04+Math.sin(t*.6)*.025);
    this.dust(c,t,31,[.3,.03,.92,.66],'245,242,190');
    c.save();polygon(c,[[.25,.79],[1,.79],[1,1],[.25,1]]);c.clip();
    for(let i=0;i<14;i++){const x=(.3+seed(i+12)*.7)*W+Math.sin(t*.5+i)*8,y=(.8+seed(i+5)*.2)*H;c.fillStyle='rgba(20,42,15,.065)';c.beginPath();c.ellipse(x,y,5,42,-.9+Math.sin(t*.45+i)*.12,0,TAU);c.fill();}c.restore();
  }
}
