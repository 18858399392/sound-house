import { sounds, soundById, scenes, sceneById, categories, image, configForSound } from './data.js';
import { SoundMixer } from './mixer.js';
import { loadStore, saveStore, shareURL, readShared, newId, cleanMix } from './storage.js';
import { media, canCache, formatBytes } from './offline.js';
import { SceneView } from './scene-view.js';
import { InstallManager } from './install.js';
import { icon, escape } from './icons.js';
const $ = selector => document.querySelector(selector), $$ = selector => [...document.querySelectorAll(selector)];
$$('[data-icon]').forEach(el => el.innerHTML = icon(el.dataset.icon));
const store = loadStore(), mixer = new SoundMixer(), installer = new InstallManager();
let currentScene = sceneById.get(store.scene) || scenes[0], requestedIndex = scenes.indexOf(currentScene), sceneRequest = 0;
let category = 'all', query = '', soundTab = 'mix', signature = null, renameId = null, deleted = null;
let persistTimeout, toastTimeout, inventoryTimeout, storageWarned = false, lastFocus = null, persistenceRequested = false;
let timer = null, timerMode = 'sleep', minutes = 30;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const sceneView = new SceneView($('#stage'), delta => { store.gestureSeen = true; $('#gesture-hint').hidden = true; void selectScene(scenes[(requestedIndex + delta + scenes.length) % scenes.length].id); }, message => toast(message));

function toast(message, undo = false) {
  const node=$('#toast');clearTimeout(toastTimeout);
  if(node.hidePopover&&node.matches(':popover-open'))node.hidePopover();
  const host=$('dialog[open]')||document.body;if(node.parentElement!==host)host.appendChild(node);
  node.innerHTML = escape(message) + (undo ? '<button data-action="undo">撤销</button>' : '');node.hidden=false;
  if(node.showPopover)node.showPopover();else ($('dialog[open]')||document.body).appendChild(node);
  toastTimeout=setTimeout(()=>{if(node.hidePopover&&node.matches(':popover-open'))node.hidePopover();node.hidden=true;},undo?6500:4300);
}
function recipe(name = currentScene.title) { return { id: newId(), name, scene: currentScene.id, focus: null, mix: { ...mixer.mix } }; }
function writeStore() {
  store.scene = currentScene.id; store.last = recipe(); store.master = mixer.master;
  if (!saveStore(store) && !storageWarned) { storageWarned = true; toast('此浏览器未能保存设置，可用分享链接保留配方。'); }
}
function persist() { clearTimeout(persistTimeout); persistTimeout = setTimeout(writeStore, 120); }
window.addEventListener('pagehide', writeStore);
function openDialog(id) {
  lastFocus = document.activeElement; $$('dialog[open]').forEach(el => el.close());
  $('#' + id).showModal();
}
function closeDialogs() { $$('dialog[open]').forEach(el => el.close()); }
$$('dialog').forEach(dialog => {
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return; const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (dialog.id === 'sounds-dialog' || dialog.id === 'saved-dialog') mixer.stopPreview();
    if (!$('dialog[open]') && lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
  });
});
function setMotion() {
  document.body.classList.toggle('motion-off', !store.motion || reduced.matches);
  $('[data-action="motion"]').setAttribute('aria-checked', String(store.motion)); $('#motion-switch').classList.toggle('active', store.motion);
}
reduced.addEventListener('change', setMotion);
function sceneMetadata() {
  $('#scene-title').textContent = currentScene.title; $('#scene-line').textContent = currentScene.line; $('#scene-eyebrow').textContent = currentScene.en;
  $('#scene-position').innerHTML = `${String(scenes.indexOf(currentScene)+1).padStart(2,'0')} <i>/ ${String(scenes.length).padStart(2,'0')}</i>`;
  $$('.scene-card').forEach(el => { el.classList.toggle('active', el.dataset.scene === currentScene.id); el.setAttribute('aria-pressed', String(el.dataset.scene === currentScene.id)); });
  if ('mediaSession' in navigator) try { navigator.mediaSession.metadata = new MediaMetadata({ title: currentScene.title, artist: '声音小屋', album: '给自己，留一点安静', artwork: [{ src: new URL('assets/icon-512.png', location.href).href, sizes: '512x512', type: 'image/png' }] }); } catch {}
}
async function selectScene(id, mix = null) {
  const next = sceneById.get(id); if (!next) return;
  const token = ++sceneRequest; requestedIndex = scenes.indexOf(next); $('#stage').classList.add('is-loading');
  const ready = await sceneView.show(next);
  if (token !== sceneRequest) return;
  $('#stage').classList.remove('is-loading');
  if (!ready) { requestedIndex = scenes.indexOf(currentScene); return; }
  currentScene = next; mixer.setMix(mix || next.mix); sceneMetadata(); persist();
}
async function safePlay() {
  if (!Object.keys(mixer.mix).length) { toast('先选一种喜欢的声音。'); openSounds('library'); return; }
  try { await mixer.play(); } catch (error) { toast(error.message || '声音未能启动，请再点播放。'); }
}
function renderScenes() {
  $('#scene-grid').innerHTML = scenes.map(s => `<button class="scene-card${s.id===currentScene.id?' active':''}" data-scene="${s.id}" aria-pressed="${s.id===currentScene.id}" aria-label="切换到${s.title}"><img src="${image(s.picture)}" alt="${s.title}实景" loading="lazy" width="420" height="420"><span class="scene-card-title"><strong>${s.title}</strong><small>${s.mood}</small></span></button>`).join('');
}
function soundRow(s) {
  const selected = s.id in mixer.mix, favorite = store.favorites.includes(s.id);
  return `<article class="sound-row" data-sound-row="${s.id}"><img src="${image(s.picture)}" alt="${s.name}对应画面" loading="lazy" width="90" height="102"><div class="sound-details"><div class="sound-name-line"><strong>${s.name}</strong><button class="favorite-button${favorite?' active':''}" data-favorite="${s.id}" aria-label="${favorite?'取消收藏':'收藏'}${s.name}" aria-pressed="${favorite}">${icon('heart')}</button></div><small>${configForSound(s.id).mode==='event'?'间歇点缀 · ':''}${s.description}</small></div><button class="row-button${mixer.previewId===s.id?' active':''}" data-preview="${s.id}" aria-label="${mixer.previewId===s.id?'停止试听':'单独试听'}${s.name}">${icon(mixer.previewId===s.id?'pause':'play')}</button><button class="row-button${selected?' selected':''}" data-add="${s.id}" aria-label="${selected?'移除':'加入混音：'}${s.name}" aria-pressed="${selected}">${icon(selected?'check':'plus')}</button></article>`;
}
function renderLibrary() {
  const filtered = sounds.filter(s => (category === 'all' || s.category === category) && `${s.name} ${s.description} ${s.tags}`.includes(query));
  const ordered = [...filtered.filter(s=>s.id in mixer.mix), ...filtered.filter(s=>!(s.id in mixer.mix))];
  $('#sound-list').innerHTML = ordered.map(soundRow).join(''); $('#search-empty').hidden = !!filtered.length;
  $$('.category-button').forEach(el=>{el.classList.toggle('active',el.dataset.category===category);el.setAttribute('aria-pressed',String(el.dataset.category===category));});
  $('#favorite-list').innerHTML = sounds.filter(s=>store.favorites.includes(s.id)).map(soundRow).join('');
  $('#favorite-empty').hidden = !!store.favorites.length;
}
function showSoundTab(tab) {
  soundTab = tab; mixer.stopPreview(); $('#mix-pane').hidden = tab !== 'mix'; $('#library-pane').hidden = tab !== 'library';
  $$('[data-sound-tab]').forEach(el=>el.classList.toggle('active',el.dataset.soundTab===tab));
  if (tab === 'library') renderLibrary();
}
function openSounds(tab = 'mix') { showSoundTab(tab); renderMix(); openDialog('sounds-dialog'); }
function layerHTML(id) {
  const s=soundById.get(id), value=Math.round(mixer.mix[id]*100);
  return `<div class="layer" data-layer="${id}"><img src="${image(s.picture)}" alt="" width="92" height="104"><div class="layer-info"><div class="layer-title"><span>${s.name}</span><output data-level-output="${id}">${value}%</output></div><input type="range" min="0" max="100" value="${value}" data-level="${id}" aria-label="${s.name}音量"><div class="layer-status" data-layer-status="${id}"></div></div><button class="close-button" data-remove="${id}" aria-label="移除${s.name}">${icon('close')}</button></div>`;
}
function renderMix() {
  const ids=Object.keys(mixer.mix), key=ids.join('|');
  if (signature !== key) { signature=key; $('#mix-layers').innerHTML=ids.map(layerHTML).join(''); renderLibrary(); }
  $('#mix-empty').hidden=!!ids.length;
  for (const id of ids) {
    const value=Math.round(mixer.mix[id]*100);
    $$(`[data-level="${id}"]`).forEach(el=>{if(document.activeElement!==el)el.value=value;el.style.setProperty('--value',value+'%');});
    $$(`[data-level-output="${id}"]`).forEach(el=>el.textContent=value+'%');
    const el=$(`[data-layer-status="${id}"]`); if(!el)continue;
    const error=mixer.errors.has(id), accent=configForSound(id).mode==='event';
    const text=error?mixer.errors.get(id):mixer.loading.includes(id)?'首次载入中，稍后会自动保存…':mixer.playing?(accent?'间歇点缀，留一点呼吸':'持续铺底'):accent?'间歇点缀':'等待播放';
    el.classList.toggle('error',error); const html=escape(text)+(error?`<button class="retry-button" data-retry="${id}">重试</button>`:'');
    if(el.innerHTML!==html)el.innerHTML=html;
  }
}
function updatePlayer() {
  const count=Object.keys(mixer.mix).length, running=mixer.playing && mixer.nodes.size && mixer.context?.state==='running';
  const failed = mixer.playing && !mixer.nodes.size && !mixer.loading.length && mixer.errors.size;
  document.body.classList.toggle('is-playing',!!running); $('#play-button').innerHTML=icon(mixer.playing&&!failed?'pause':'play'); $('#play-button').setAttribute('aria-label',failed?'重试播放':mixer.playing?'暂停声音':'播放声音');
  $('#mix-count').textContent=count; $('#tab-mix-count').textContent=count;
  $('#play-state').textContent=mixer.previewId?`单独试听 · ${soundById.get(mixer.previewId).name}`:mixer.loading.length?`${running?'正在播放 · ':''}正在载入 ${mixer.loading.length} 层声音…`:mixer.errors.size?(failed?'连接暂时中断，点播放重试':`${mixer.nodes.size} 层正在播放 · 部分声音可重试`):running?`${count} 层声音 · 此刻，只管放松`:count?`${count} 层声音，等你入座`:'选一种声音，布置自己的安静';
  const master=$('#master-volume'), value=Math.round(mixer.master*100); if(document.activeElement!==master)master.value=value; master.style.setProperty('--value',value+'%'); $('#master-output').textContent=value+'%';
  $$('[data-preview]').forEach(el=>{const active=el.dataset.preview===mixer.previewId;el.classList.toggle('active',active);el.innerHTML=icon(active?'pause':'play');el.setAttribute('aria-label',`${active?'停止试听':'单独试听'}${soundById.get(el.dataset.preview).name}`);});
  $('#atmosphere').style.setProperty('--weather-level',String(.12+Math.min(.7,(mixer.mix['rain-on-window']||mixer.mix['light-rain']||.5))*.6));
  if('mediaSession' in navigator)try{navigator.mediaSession.playbackState=running||mixer.previewId?'playing':'paused';}catch{}
  renderMix();persist();
}
async function toggleSound(id) {
  const next={...mixer.mix}; if(id in next)delete next[id];else{if(Object.keys(next).length>=8){toast('已经有 8 层声音，先移除一层再添加。');return;}next[id]=configForSound(id).mode==='event'?.24:.45;}
  mixer.setMix(next); if(id in next&&!mixer.playing)await safePlay();
}
function renderSaved() {
  $('#recipe-list').innerHTML=store.recipes.map(r=>`<article class="recipe-card"><button class="close-button recipe-delete" data-delete="${escape(r.id)}" aria-label="删除${escape(r.name)}">${icon('trash')}</button><h3>${escape(r.name)}</h3><p>${Object.keys(r.mix).map(id=>soundById.get(id)?.name).filter(Boolean).join(' · ')}</p><div><button class="secondary-button" data-recipe="${escape(r.id)}">${icon('play')}进入空间</button><button class="text-button" data-share="${escape(r.id)}">${icon('share')}分享</button><button class="recipe-rename" data-rename="${escape(r.id)}">改名</button></div></article>`).join('');
  $('#recipe-empty').hidden=!!store.recipes.length;renderLibrary();
}
function openSave(id=null) {
  if(!id&&!Object.keys(mixer.mix).length){toast('先添加一种声音，再保存配方。');return;}
  if(!id&&store.recipes.length>=30){toast('已保存30个配方，删除一个后再保存。');return;}
  renameId=id;const target=store.recipes.find(r=>r.id===id);$('#recipe-name').value=target?.name||currentScene.title;
  $('#save-summary').textContent=Object.keys(target?.mix||mixer.mix).map(id=>soundById.get(id).name).join(' · ');
  openDialog('save-dialog');setTimeout(()=>{$('#recipe-name').focus();$('#recipe-name').select();},120);
}
function openShare(target) {try{$('#share-url').value=shareURL(target);openDialog('share-dialog');}catch(e){toast(e.message);}}
function timeText(ms) {const sec=Math.max(0,Math.ceil(ms/1000));return `${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;}
function renderTimer() {
  $('#timer-options').innerHTML=(timerMode==='sleep'?[15,30,60,90]:[15,25,45,60]).map(n=>`<button data-minutes="${n}" class="${n===minutes?'active':''}">${n} 分钟</button>`).join('');
  $$('[data-timer-mode]').forEach(el=>el.classList.toggle('active',el.dataset.timerMode===timerMode));$('#custom-minutes').value=minutes;
  $('#timer-description').textContent=timerMode==='sleep'?'结束前10秒，声音会慢慢淡出。':'一轮结束后暂停声音，休息5分钟，再由你开始下一轮。';tickTimer();
}
function tickTimer() {
  const left=timer?timer.deadline-Date.now():minutes*60000;$('#timer-time').textContent=timeText(left);$('#timer-pill').hidden=!timer;$('#timer-pill').textContent=timeText(left);
  $('[data-action="timer-stop"]').hidden=!timer;$('[data-action="timer-start"]').textContent=timer?'重新计时':timerMode==='focus'?'开始专注':'开始定时';
  $('#timer-state').textContent=timer?(timer.phase==='break'?'休息中，看看远处。':'定时已开启，安心听一会儿。'):'选一个时长，把时间交给声音。';$('#settings-timer').textContent=timer?`${timer.phase==='break'?'休息':'定时'}剩余 ${timeText(left)}`:'睡前听一会儿，或专心做一件事';
  if(!timer)return;if(timer.mode==='sleep'&&left<=10000&&!timer.fading){timer.fading=true;mixer.pause(Math.max(0,left/1000));}
  if(left<=0){if(timer.mode==='focus'&&timer.phase!=='break'){mixer.pause(1);timer={mode:'focus',phase:'break',deadline:Date.now()+300000};toast('这一轮专注完成，休息5分钟。');}else{const rest=timer.phase==='break';timer=null;mixer.pause(1);toast(rest?'休息结束，准备好后再开始下一轮。':'定时结束，愿你休息得很好。');}tickTimer();}
}
setInterval(tickTimer,500);document.addEventListener('visibilitychange',tickTimer);
const sceneURLs=s=>[image(s.picture),...Object.keys(s.mix).map(id=>soundById.get(id).src)];
function currentURLs(){return [image(currentScene.picture),...Object.keys(mixer.mix).map(id=>soundById.get(id).src)];}
async function refreshInventory() {
  try {
    const inventory=await media.inventory();$('#cache-size').textContent=formatBytes(inventory.bytes);$('#cache-count').textContent=`已保存 ${inventory.count} / ${inventory.files.length} 份声音与画面`;
    $('#all-download-size').textContent=formatBytes(inventory.total);$('#storage-bar').style.width=`${inventory.total?inventory.bytes/inventory.total*100:0}%`;$('#settings-cache').textContent=inventory.count?`${formatBytes(inventory.bytes)} 已保存在本机`:'听过的素材自动保存';
    $('#offline-scenes').innerHTML=scenes.map(s=>{const urls=sceneURLs(s),cached=urls.filter(url=>inventory.keys.has(new URL(url,location.href).href)).length;return `<div class="offline-scene"><img src="${image(s.picture)}" alt="" loading="lazy" width="84" height="84"><span>${s.title}<small>${cached===urls.length?'已离线保存':cached?`已保存 ${cached} / ${urls.length} 份素材`:'尚未完整保存'}</small></span><button data-download-scene="${s.id}" ${cached===urls.length?'disabled':''}>${cached===urls.length?'已保存':'保存'}</button></div>`;}).join('');
    $('#offline-environment').textContent=canCache()?'联网时点播放即可聆听，无需提前保存。听过的素材会自动保存到本机；想断网听完整场景，可以在下方保存。':'联网时可直接聆听。当前普通 HTTP 预览不支持离线保存，请使用正式 HTTPS 网址或电脑 localhost。';
    $$('[data-action="download-current"],[data-action="download-all"],[data-action="persist"],[data-download-scene]').forEach(el=>{if(!canCache()||media.controller)el.disabled=true;else if(!el.dataset.downloadScene)el.disabled=false;});
    if(navigator.storage?.persisted){const persisted=await navigator.storage.persisted();$('#persist-state').textContent=persisted?'浏览器已允许持久保存。主动清理网站数据仍会删除缓存。':'保存完成后断网也能听。可以申请保留离线数据，减少被系统自动清理的可能。';}
  }catch{$('#cache-size').textContent='暂时无法读取';$('#cache-count').textContent='联网后可以再次打开离线设置。';}
}
function updateDownload() {
  const progress=media.progress;$('#download-progress').hidden=!progress;
  if(progress){$('#download-progress-bar').max=progress.total||1;$('#download-progress-bar').value=progress.completed;$('#download-progress-text').textContent=`${progress.active?'正在保存':progress.done?'保存完成':'已暂停，可继续'} ${progress.completed} / ${progress.total}`;$('[data-action="download-cancel"]').hidden=!progress.active;}
  clearTimeout(inventoryTimeout);inventoryTimeout=setTimeout(()=>void refreshInventory(),200);
}
async function download(urls) {
  if(canCache()&&!persistenceRequested){persistenceRequested=true;void media.requestPersistence().then(()=>refreshInventory()).catch(()=>{});}
  try {await media.download(urls);if(media.progress?.done)toast('保存完成，断网后也能听这些声音。');}
  catch(error){toast(error.message||'保存未完成，再次保存会跳过已完成的素材。');}
  finally{void refreshInventory();}
}
function renderInstall() {
  const steps=$('#install-steps'),button=$('#install-button');button.hidden=true;steps.innerHTML='';
  $('#settings-install').textContent=installer.installed?'已作为应用独立打开':'放到主屏幕，像应用一样打开';
  if(installer.installed){$('#install-state').textContent='你已经在声音小屋应用中。保存喜欢的场景，就能离线再次打开。';return;}
  if(!installer.secure){$('#install-state').textContent='当前是普通 HTTP 局域网预览，暂不具备完整安装与离线能力。正式 HTTPS 地址就绪后，手机可以安装到主屏幕。';return;}
  if(installer.promptEvent){$('#install-state').textContent='安装后从主屏幕独立打开，已保存的声音可以离线聆听。';button.hidden=false;return;}
  $('#install-state').textContent=installer.ios?'在 Safari 中，按下面几步把小屋放到主屏幕。':'在支持安装的浏览器中，打开菜单选择安装应用或添加到主屏幕。';
  steps.innerHTML=(installer.ios?['点浏览器的分享按钮；部分布局需先点“更多”。','选择“添加到主屏幕”。','如有“作为网页 App 打开”，将它开启，再点“添加”。']:['打开浏览器右上角菜单。','选择“安装应用”或“添加到主屏幕”，按系统提示完成。','从主屏幕打开小屋，在离线设置中保存喜欢的声音。']).map(s=>`<li>${s}</li>`).join('');
}
installer.addEventListener('change',renderInstall);media.addEventListener('change',updateDownload);media.addEventListener('storagewarning',()=>toast('当前可继续在线播放；本机空间不足或保存受限，暂时未能保留离线副本。'));

document.addEventListener('click',async event=>{
  const button=event.target.closest('button');if(!button)return;const d=button.dataset;
  if('close'in d){button.closest('dialog').close();return;}
  if(d.scene){closeDialogs();await selectScene(d.scene);return;}
  if(d.soundTab){showSoundTab(d.soundTab);return;}
  if(d.preview){try{await mixer.preview(d.preview);}catch(e){toast(e.message||'试听失败，请联网后重试。');}return;}
  if(d.add){await toggleSound(d.add);return;}
  if(d.remove){const next={...mixer.mix};delete next[d.remove];mixer.setMix(next);return;}
  if(d.retry){mixer.retry(d.retry);return;}
  if(d.favorite){store.favorites=store.favorites.includes(d.favorite)?store.favorites.filter(x=>x!==d.favorite):[...store.favorites,d.favorite];renderLibrary();persist();return;}
  if(d.category){category=d.category;renderLibrary();return;}
  if(d.recipe){const target=store.recipes.find(r=>r.id===d.recipe);if(target)try{closeDialogs();mixer.init();await mixer.context.resume();await selectScene(target.scene,target.mix);await safePlay();}catch(e){toast(e.message||'暂时无法播放，请换用新版浏览器。');}return;}
  if(d.delete){const index=store.recipes.findIndex(r=>r.id===d.delete);if(index>=0){deleted={index,recipe:store.recipes[index]};store.recipes.splice(index,1);renderSaved();persist();toast('配方已删除。',true);}return;}
  if(d.rename){openSave(d.rename);return;}
  if(d.share){const target=store.recipes.find(r=>r.id===d.share);if(target)openShare(target);return;}
  if(d.timerMode){timerMode=d.timerMode;minutes=timerMode==='sleep'?30:25;renderTimer();return;}
  if(d.minutes){minutes=Number(d.minutes);renderTimer();return;}
  if(d.downloadScene){await download(sceneURLs(sceneById.get(d.downloadScene)));return;}
  switch(d.action){
    case'play':if(mixer.playing&&(mixer.nodes.size||mixer.loading.length))mixer.pause();else await safePlay();break;
    case'previous':await selectScene(scenes[(requestedIndex+scenes.length-1)%scenes.length].id);break;
    case'next':await selectScene(scenes[(requestedIndex+1)%scenes.length].id);break;
    case'scenes':renderScenes();openDialog('scenes-dialog');break;
    case'settings':renderInstall();openDialog('settings-dialog');void refreshInventory();break;
    case'sounds':openSounds();break;
    case'library':openSounds('library');break;
    case'clear':mixer.setMix({});break;
    case'reset-search':category='all';query='';$('#sound-search').value='';renderLibrary();break;
    case'saved':renderSaved();openDialog('saved-dialog');break;
    case'save':openSave();break;
    case'undo':if(deleted){store.recipes.splice(deleted.index,0,deleted.recipe);deleted=null;renderSaved();persist();toast('配方已恢复');}break;
    case'copy-share':try{await navigator.clipboard.writeText($('#share-url').value);toast('配方链接已复制');}catch{$('#share-url').focus();$('#share-url').select();toast('链接已选中，请长按或按 Ctrl+C 复制。');}break;
    case'motion':store.motion=!store.motion;setMotion();persist();toast(store.motion?reduced.matches?'系统已启用减少动态，画面保持静止。':'轻动态已开启':'轻动态已关闭');break;
    case'about':openDialog('about-dialog');break;
    case'offline':openDialog('offline-dialog');updateDownload();await refreshInventory();break;
    case'download-current':await download(currentURLs());break;
    case'download-all':try{await download((await media.manifest()).files.map(f=>f.url));}catch(e){toast(e.message);}break;
    case'download-cancel':media.cancel();break;
    case'cache-clear':try{await media.clear();toast('离线素材已清除，个人配方已保留。');await refreshInventory();}catch(e){toast(e.message);}break;
    case'persist':try{const result=await media.requestPersistence();toast(result.granted?'浏览器已允许持久保存离线数据。':'浏览器暂未授予持久存储，已保存内容仍可使用。');await refreshInventory();}catch{toast('此浏览器暂不支持持久存储申请。');}break;
    case'install':renderInstall();openDialog('install-dialog');break;
    case'install-start':try{const accepted=await installer.install();toast(accepted?'已发起安装，请按系统提示完成。':'可以稍后从浏览器菜单安装。');renderInstall();}catch{toast('可从浏览器菜单选择安装或添加到主屏幕。');}break;
    case'timer':renderTimer();openDialog('timer-dialog');break;
    case'timer-start':{const value=Number($('#custom-minutes').value);if(!Number.isInteger(value)||value<1||value>240){toast('请输入1到240之间的整数分钟数。');break;}if(!Object.keys(mixer.mix).length){toast('先添加一种声音，再开始定时。');break;}minutes=value;timer={mode:timerMode,phase:timerMode==='focus'?'focus':'sleep',deadline:Date.now()+value*60000};if(!mixer.playing)await safePlay();tickTimer();toast(`已开启${value}分钟${timerMode==='focus'?'专注':'定时'}`);break;}
    case'timer-stop':timer=null;tickTimer();toast('定时已取消');break;
    default:break;
  }
});
document.addEventListener('input',event=>{
  const el=event.target;if(el.dataset.level)mixer.setVolume(el.dataset.level,Number(el.value)/100);
  if(el.id==='master-volume')mixer.setMaster(Number(el.value)/100);
  if(el.id==='sound-search'){query=el.value.trim();renderLibrary();}
  if(el.id==='custom-minutes'){const value=Number(el.value);if(Number.isInteger(value)&&value>=1&&value<=240){minutes=value;if(!timer)$('#timer-time').textContent=timeText(minutes*60000);$$('[data-minutes]').forEach(b=>b.classList.toggle('active',Number(b.dataset.minutes)===value));}}
});
document.addEventListener('keydown',event=>{
  if(event.isComposing||event.target.closest('input,textarea,dialog'))return;
  if(event.code==='Space'&&!event.target.closest('button,a')){event.preventDefault();if(mixer.playing)mixer.pause();else void safePlay();}
  if(!$('dialog[open]')&&['ArrowDown','ArrowRight','ArrowUp','ArrowLeft'].includes(event.key)){event.preventDefault();const delta=['ArrowDown','ArrowRight'].includes(event.key)?1:-1;void selectScene(scenes[(requestedIndex+delta+scenes.length)%scenes.length].id);}
});
$('#save-form').addEventListener('submit',event=>{event.preventDefault();const name=$('#recipe-name').value.trim();if(!name){toast('给这个声音空间起个名字吧。');return;}if(renameId){const r=store.recipes.find(r=>r.id===renameId);if(r)r.name=name;}else store.recipes.unshift(recipe(name));closeDialogs();renderSaved();writeStore();toast(renameId?'名称已更新':'配方已保存');renameId=null;});
function importShare(){try{const shared=readShared(location.hash);if(shared){mixer.pause();void selectScene(shared.scene,shared.mix);toast(`已载入「${shared.name}」，点播放开始。`);return true;}}catch(e){toast(e.message);}return false;}
window.addEventListener('hashchange',importShare);
window.addEventListener('online',()=>{ mixer.recover(); if(!sceneView.current)void sceneView.show(currentScene,true); });
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&navigator.onLine)mixer.recover(); });
$('#category-list').innerHTML=categories.map(([id,name])=>`<button class="category-button${id==='all'?' active':''}" data-category="${id}" aria-pressed="${id==='all'}">${name}</button>`).join('');
$('#library-count').textContent=sounds.length;$('#gesture-hint').hidden=store.gestureSeen;
renderScenes();renderLibrary();renderSaved();setMotion();renderTimer();renderInstall();
mixer.addEventListener('change',updatePlayer);mixer.setMaster(store.master);mixer.setMix(store.last?cleanMix(store.last.mix):currentScene.mix);sceneMetadata();
if(!importShare())void sceneView.show(currentScene,true);
if('mediaSession'in navigator)for(const[action,handler]of[['play',()=>void safePlay()],['pause',()=>mixer.pause()],['stop',()=>mixer.pause()]])try{navigator.mediaSession.setActionHandler(action,handler);}catch{}
if('serviceWorker'in navigator&&window.isSecureContext)navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'}).catch(()=>toast('离线功能暂未启用，联网后重新打开可以再试。'));
void refreshInventory();
window.soundHouse={version:'2.4.1',mixer,media,installer,get scene(){return currentScene;},get timer(){return timer;},get motion(){return sceneView.motion;},tickTimer,selectScene};
