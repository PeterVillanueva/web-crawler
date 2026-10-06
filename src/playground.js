const effects = ['highlight', 'link', 'grow', 'tilt', 'outline', 'fall'];
const effectLabels = { highlight: 'Highlighted a discovery', link: 'Found a new connection', grow: 'An idea just got bigger', tilt: 'A different perspective', outline: 'Marked something worth keeping', fall: 'This one slipped away' };

export function createPlayground(container, { gsap, reducedMotion }) {
  const stage = container.querySelector('.document-stage');
  const scroll = container.querySelector('.document-scroll');
  const mount = container.querySelector('.spider-mount');
  const tag = container.querySelector('.spider-tag');
  const state = container.querySelector('#crawl-state');
  const pauseButton = container.querySelector('#pause');
  const resetButton = container.querySelector('#reset');
  const count = container.querySelector('#touch-count');
  const progress = container.querySelector('#progress-count');
  const cue = container.querySelector('.scroll-cue');
  const words = [...container.querySelectorAll('.crawlable')];
  const originals = new Map(words.map(word => [word, { html: word.innerHTML, style: word.getAttribute('style') }]));
  const seen = new Set(), tweens = new Set();
  let paused = false, activeUntil = 0, lastTouch = 0, lastPick = 0, target = null, previousTime = 0, ignoreNextScroll = false;
  let bag = [], x = stage.clientWidth*.55, y = stage.clientHeight*.48, heading = -.45;
  const animate = (element, vars) => {
    const tween = gsap.to(element, { ...vars, onComplete() { tweens.delete(tween); vars.onComplete?.(); } });
    tweens.add(tween); return tween;
  };
  function onScroll() {
    const fraction = scroll.scrollTop / Math.max(1, scroll.scrollHeight-scroll.clientHeight);
    progress.textContent = `${Math.round(fraction*100)}%`;
    cue.style.opacity = scroll.scrollTop > 20 ? '0' : '1';
    if (ignoreNextScroll) { ignoreNextScroll=false; return; }
    if (!paused) { activeUntil = performance.now()+2600; state.textContent = 'Following the thread…'; }
  }
  function nextEffect() {
    if (!bag.length) bag = effects.map(value=>({value,order:Math.random()})).sort((a,b)=>a.order-b.order).map(({value})=>value);
    return bag.pop();
  }
  function react(word, now) {
    seen.add(word); const effect = nextEffect(); word.dataset.effect = effect;
    count.textContent = String(seen.size).padStart(3,'0');
    state.textContent = effectLabels[effect]; lastTouch = now;
    const rect = word.getBoundingClientRect(), bounds = stage.getBoundingClientRect();
    if (!reducedMotion) {
      const ring = document.createElement('span'); ring.className='effect-ring'; ring.setAttribute('aria-hidden','true');
      ring.style.left=`${rect.left-bounds.left+rect.width/2-15}px`; ring.style.top=`${rect.top-bounds.top+rect.height/2-15}px`;
      stage.append(ring); animate(ring,{scale:2.8,opacity:0,duration:.65,onComplete:()=>ring.remove()});
    }
    const duration = reducedMotion ? 0 : .45;
    if (effect==='highlight') animate(word,{backgroundColor:'#d7fb50',color:'#263017',duration});
    if (effect==='link') {
      const link=document.createElement('a');link.href='/about.html#discovery';link.textContent=word.textContent;link.className='touch-link';
      word.replaceChildren(link);
    }
    if (effect==='grow') animate(word,{fontSize:parseFloat(getComputedStyle(word).fontSize)*1.22,duration,ease:'back.out(2)'});
    if (effect==='tilt') animate(word,{rotation:(Math.random()>.5?1:-1)*(8+Math.random()*8),duration,ease:'back.out(2)'});
    if (effect==='outline') animate(word,{outline:'1px solid #738644',outlineOffset:'4px',duration});
    if (effect==='fall') {
      if (reducedMotion) { word.style.opacity='.25'; return; }
      const ghost=document.createElement('span');ghost.className='fallen-copy';ghost.textContent=word.textContent;ghost.setAttribute('aria-hidden','true');
      const style=getComputedStyle(word);
      Object.assign(ghost.style,{left:`${rect.left-bounds.left}px`,top:`${rect.top-bounds.top}px`,font:style.font,color:style.color,letterSpacing:style.letterSpacing});
      stage.append(ghost);word.style.opacity='.18';
      animate(ghost,{y:stage.clientHeight+100,x:(Math.random()-.5)*100,rotation:(Math.random()-.5)*95,opacity:0,duration:1.5,ease:'power2.in',onComplete:()=>ghost.remove()});
    }
  }
  function togglePause() {
    paused=!paused;
    pauseButton.setAttribute('aria-pressed',String(paused));
    pauseButton.setAttribute('aria-label',paused?'Resume crawler':'Pause crawler');
    pauseButton.querySelector('.control-text').textContent=paused?'Resume':'Pause';
    pauseButton.querySelector('.pause-glyph').textContent=paused?'▷':'Ⅱ';
    state.textContent=paused?'Taking a little break':'Ready to explore';
    tweens.forEach(t=>paused?t.pause():t.resume());
    if (!paused) activeUntil=performance.now()+1800;
  }
  function reset() {
    tweens.forEach(t=>t.kill());tweens.clear();
    stage.querySelectorAll('.fallen-copy,.effect-ring').forEach(e=>e.remove());
    words.forEach(word=>{ const original=originals.get(word);gsap.set(word,{clearProps:'all'});word.innerHTML=original.html;if(original.style)word.setAttribute('style',original.style);else word.removeAttribute('style');delete word.dataset.effect; });
    seen.clear();bag=[];target=null;lastTouch=0;ignoreNextScroll=scroll.scrollTop!==0;scroll.scrollTop=0;count.textContent='000';progress.textContent='0%';cue.style.opacity='1';
    activeUntil=0;x=stage.clientWidth*.55;y=stage.clientHeight*.48;heading=-.45;
    state.textContent=paused?'Taking a little break':'Ready to explore';
  }
  scroll.addEventListener('scroll',onScroll,{passive:true});
  pauseButton.addEventListener('click',togglePause);resetButton.addEventListener('click',reset);
  const lifecycle = new AbortController();
  if (document.modelContext?.registerTool) {
    const tool = {
      name: 'control_crawler', title: 'Control the crawler playground',
      description: 'Pause, resume, or reset the visible spider simulation. Reset clears every text effect and returns the document to the top.',
      inputSchema: {type:'object',properties:{action:{type:'string',enum:['pause','resume','reset']}},required:['action'],additionalProperties:false},
      annotations:{readOnlyHint:false,untrustedContentHint:false},
      execute(input) {
        if (!input || Object.keys(input).length!==1 || !['pause','resume','reset'].includes(input.action)) throw new Error('Expected an action of pause, resume, or reset.');
        if(input.action==='reset')reset();
        else if((input.action==='pause')!==paused)togglePause();
        return {paused,elementsDiscovered:seen.size,progress:progress.textContent};
      }
    };
    try { Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{}); } catch { /* Optional browser capability. */ }
  }
  function update(now, contactPoints) {
    const dt = Math.min((now-previousTime)/1000,.04); previousTime=now;
    const active=!paused && now<activeUntil;
    if(active) {
      const bounds=stage.getBoundingClientRect();
      const visible=words.filter(word=>{const r=word.getBoundingClientRect();return !seen.has(word)&&r.top>bounds.top+18&&r.bottom<bounds.bottom-15;});
      if(!target || seen.has(target) || now-lastPick>1100 || !visible.includes(target)) {
        target=visible[Math.floor(Math.random()*visible.length)]||null;lastPick=now;
      }
      if(target) {
        const rect=target.getBoundingClientRect();
        const tx=Math.max(55,Math.min(stage.clientWidth-55,rect.left-bounds.left+rect.width/2));
        const ty=Math.max(50,Math.min(stage.clientHeight-45,rect.top-bounds.top+rect.height/2+28));
        const dx=tx-x,dy=ty-y;
        if(Math.abs(dx)+Math.abs(dy)>5) heading=Math.atan2(-dx,-dy)*.55;
        const ease=reducedMotion?1:1-Math.exp(-dt*4.8);x+=dx*ease;y+=dy*ease;
      }
      if(now-lastTouch>470) {
        const contacts = contactPoints?.(x,y) || [{x,y:y-28}];
        // A reaction only occurs where an animated foot or head overlaps a real text box.
        const hit=visible.find(word=>{const r=word.getBoundingClientRect();return contacts.some(p=>p.x>=r.left-bounds.left-5&&p.x<=r.right-bounds.left+5&&p.y>=r.top-bounds.top-5&&p.y<=r.bottom-bounds.top+5);});
        if(hit) react(hit,now);
      }
    }
    x=Math.max(40,Math.min(stage.clientWidth-40,x));y=Math.max(40,Math.min(stage.clientHeight-40,y));
    mount.style.left=`${x}px`;mount.style.top=`${y}px`;
    tag.style.left=`${Math.min(stage.clientWidth-98,x+45)}px`;tag.style.top=`${Math.min(stage.clientHeight-24,y+85)}px`;
    return { active, paused, heading };
  }
  return { update, dispose() {lifecycle.abort();tweens.forEach(t=>t.kill());scroll.removeEventListener('scroll',onScroll);pauseButton.removeEventListener('click',togglePause);resetButton.removeEventListener('click',reset);} };
}
