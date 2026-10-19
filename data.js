export const image = key => `assets/images/${key}.webp`;
const sound = (id, name, category, picture, description, tags = '') => ({
  id, name, category, picture, description, tags,
  src: `assets/sounds/${category}/${id}.${category === 'noise' ? 'wav' : 'mp3'}`,
});
export const categories = [
  ['all', '全部声音'], ['rain', '听雨'], ['nature', '山野'], ['animals', '生灵'],
  ['places', '人间'], ['things', '日常'], ['transport', '旅途'], ['noise', '纯净噪音'],
];
export const sounds = [
  sound('rain-on-window', '窗上雨', 'rain', 'rain', '雨珠沿着玻璃，慢慢走。', '雨声 窗户 读书 睡眠'),
  sound('light-rain', '绵绵细雨', 'rain', 'alley', '一场不必撑伞的小雨。', '小雨 睡眠'),
  sound('heavy-rain', '倾盆大雨', 'rain', 'rain', '让雨声替你隔开喧闹。', '暴雨 白噪音'),
  sound('thunder', '远处的雷', 'rain', 'rain', '云层深处，一声低低的回响。', '雷声 雷雨'),
  sound('rain-on-leaves', '雨落青叶', 'rain', 'forest', '听见每一片叶子的回应。', '雨声 树叶'),
  sound('river', '山间溪流', 'nature', 'forest', '流水绕过石头，也绕过心事。', '水声 溪水'),
  sound('waves', '海浪轻拍', 'nature', 'sea', '一来一往，把时间交给海。', '大海 海边 睡眠'),
  sound('campfire', '篝火噼啪', 'nature', 'fire', '火星升起来，夜色柔软下来。', '炉火 壁炉 火焰'),
  sound('wind', '旷野微风', 'nature', 'sea', '风经过时，什么也不用想。', '风声'),
  sound('wind-in-trees', '风过林梢', 'nature', 'forest', '树梢之间，藏着绿色的潮汐。', '树林 竹林'),
  sound('waterfall', '深林瀑布', 'nature', 'forest', '水落山间，回声悠长。', '流水 水声'),
  sound('droplets', '檐下水滴', 'nature', 'chime', '一滴，又一滴，落在安静里。', '滴水 雨后'),
  sound('jungle', '雨林深处', 'nature', 'forest', '闭上眼，走进更深的绿意。', '森林 热带'),
  sound('birds', '清晨鸟鸣', 'animals', 'forest', '天亮了，枝头先醒过来。', '鸟叫 山林'),
  sound('crickets', '夏夜虫鸣', 'animals', 'pond', '小时候的夏夜，一直都在。', '蟋蟀 虫叫 夜晚'),
  sound('frog', '池塘蛙声', 'animals', 'pond', '池塘边，夏天正热闹。', '青蛙 乡村'),
  sound('cat-purring', '猫咪呼噜', 'animals', 'cat', '小小的呼噜，是安心的声音。', '宠物 猫叫'),
  sound('cafe', '街角咖啡馆', 'places', 'cafe', '杯盏轻响，人声恰好遥远。', '咖啡厅 交谈 专注'),
  sound('library', '安静图书馆', 'places', 'library', '在书页之间，给自己一点时间。', '自习室 晚自习 读书'),
  sound('night-village', '乡村入夜', 'places', 'pond', '远处人家，近处晚风。', '村庄 乡下 夜晚'),
  sound('temple', '山寺清音', 'places', 'temple', '山色空蒙，心也慢下来。', '寺庙 寺院 冥想'),
  sound('keyboard', '键盘轻敲', 'things', 'keyboard', '把眼前这一件事，慢慢做好。', '打字 工作 专注'),
  sound('paper', '翻动书页', 'things', 'library', '下一页，也许有新的风景。', '翻书 纸张 阅读'),
  sound('clock', '老钟滴答', 'things', 'clock', '时间有自己的步调。', '时钟 钟表'),
  sound('wind-chimes', '檐下风铃', 'things', 'chime', '风轻轻一碰，就有了回音。', '铃铛 清音'),
  sound('boiling-water', '炉上煮水', 'things', 'tea', '等一壶水开，等自己慢下来。', '茶屋 沸水 烧水'),
  sound('singing-bowl', '一钵清音', 'things', 'tea', '让这一声，慢慢散开。', '颂钵 冥想'),
  sound('ceiling-fan', '旧时风扇', 'things', 'fan', '老风扇转着，午后很长。', '电扇 风声 睡眠'),
  sound('vinyl-effect', '黑胶底噪', 'things', 'studio', '留一点旧唱片里的温度。', '唱片 留声机'),
  sound('typewriter', '复古打字机', 'things', 'typewriter', '每一下落键，都有分量。', '写作 打字'),
  sound('train', '远方列车', 'transport', 'railway', '轨道的尽头，是另一段故事。', '火车 旅行'),
  sound('inside-a-train', '夜行车厢', 'transport', 'train', '窗外在远行，心里有归处。', '火车 车内 睡眠'),
  sound('rowing-boat', '湖上摇橹', 'transport', 'boat', '轻轻划开，一湖安静。', '划船 船桨 水声'),
  sound('white-noise', '白噪音', 'noise', 'studio', '均匀细密，遮住周围的杂声。', '睡眠 专注'),
  sound('pink-noise', '粉噪音', 'noise', 'studio', '柔和沙沙声，少一点高频。', '睡眠 专注'),
  sound('brown-noise', '棕噪音', 'noise', 'studio', '低沉绵长，让空间安静下来。', '布朗噪音 睡眠 专注'),
  sound('cicadas', '夏日蝉鸣', 'animals', 'bamboo', '竹影摇动，夏天有了声音。', '蝉 知了 夏日 午后'),
  sound('tea-cup', '茶杯轻落', 'things', 'tea', '杯盏轻轻一碰，日子慢下来。', '茶具 陶瓷 杯子 品茶'),
  sound('bamboo', '竹林风声', 'nature', 'bamboo', '竹叶沙沙，竹节偶尔轻响。', '竹林 叶子 风声 夏日'),
];
export const playback = {
  thunder: { mode: 'event', gap: [32, 85], seconds: 32 },
  paper: { mode: 'event', gap: [15, 38], seconds: 12 },
  'tea-cup': { mode: 'event', gap: [20, 48], seconds: 7 },
  'singing-bowl': { mode: 'event', gap: [38, 75], seconds: 30 },
  'wind-chimes': { mode: 'event', gap: [18, 45], seconds: 20 },
};
export const configForSound = id => playback[id] || {
  mode: 'loop', seconds: ['river','waves','light-rain','jungle','bamboo','cafe','library'].includes(id) ? 60 : id === 'clock' ? 24 : 48,
  blend: id === 'clock' || id === 'keyboard' || id === 'typewriter' ? .08 : 1.4,
};
export const soundById = new Map(sounds.map(s => [s.id, s]));
export const scenes = [
  { id: 'rain', title: '雨夜书房', en: 'THE RAINY STUDY', picture: 'rain', mood: '雨天 · 阅读', line: '窗外的雨，刚好盖过世界的喧嚣。', description: '一盏暖灯，一本没读完的书。\n今晚，让雨声陪你多坐一会儿。', weather: 'rain', mix: { 'rain-on-window': .64, paper: .16, thunder: .12 } },
  { id: 'tea', title: '山间茶屋', en: 'TEA IN THE MOUNTAINS', picture: 'tea', mood: '放空 · 品茶', line: '等一壶水开，也等心慢下来。', description: '山色入窗，水声入耳。\n把赶路的心，暂且放一放。', weather: 'steam', mix: { river: .32, 'boiling-water': .32, 'tea-cup': .21 } },
  { id: 'study', title: '灯下晚自习', en: 'ONE MORE CHAPTER', picture: 'library', mood: '专注 · 学习', line: '世界已经安静，留一盏灯给自己。', description: '书页轻响，笔尖不停。\n眼前的这一页，就值得全心全意。', weather: 'none', mix: { library: .46, paper: .24, keyboard: .13 } },
  { id: 'alley', title: '老街雨巷', en: 'RAIN DOWN THE LANE', picture: 'alley', mood: '雨天 · 漫想', line: '青石板上的雨，落得很慢。', description: '雨打屋檐，灯映长巷。\n好像走了很远，又好像回到了从前。', weather: 'rain', mix: { 'light-rain': .62, 'night-village': .22, droplets: .18 } },
  { id: 'forest', title: '林间清晨', en: 'WHERE THE FOREST WAKES', picture: 'forest', mood: '自然 · 休憩', line: '走进绿意里，听见自己的呼吸。', description: '溪水越过苔石，鸟鸣落在枝头。\n今天，从一片安静的绿开始。', weather: 'mist', mix: { river: .48, birds: .3, 'wind-in-trees': .25 } },
  { id: 'sea', title: '海边黄昏', en: 'A LITTLE CLOSER TO THE SEA', picture: 'sea', mood: '放松 · 发呆', line: '让潮汐带走一些不必着急的事。', description: '日落没有催促，海风也是。\n就坐在这里，等下一阵浪来。', weather: 'sea', mix: { waves: .64, wind: .18 } },
  { id: 'fire', title: '星下篝火', en: 'WARMTH UNDER THE STARS', picture: 'fire', mood: '夜晚 · 放松', line: '夜色很深，火光很暖。', description: '火星轻轻升起，虫鸣从林间传来。\n此刻，你不必去任何地方。', weather: 'embers', mix: { campfire: .62, crickets: .22 } },
  { id: 'tv', title: '电视伴眠', en: 'THE TV IS STILL ON', picture: 'tv', mood: '怀旧 · 伴眠', line: '电视映着微光，只剩轻柔的沙沙声。', description: '柔和底噪与旧风扇，陪着安静的夜晚。\n像小时候那样，安心地歇一会儿。', weather: 'television', mix: { 'pink-noise': .35, 'ceiling-fan': .12, 'vinyl-effect': .06 } },
  { id: 'bamboo', title: '竹影夏昼', en: 'A SLOW SUMMER AFTERNOON', picture: 'bamboo', mood: '夏日 · 小憩', line: '竹影摇过窗，午后很长。', description: '风扇轻转，远处蝉鸣。\n就让这个下午，慢一点过去。', weather: 'bamboo', mix: { bamboo: .48, cicadas: .23, 'ceiling-fan': .18 } },
  { id: 'classroom', title: '午后课堂', en: 'A DROWSY AFTERNOON CLASS', picture: 'classroom', mood: '午后 · 小憩', line: '日光落在书页上，教室安静下来。', description: '只有均匀轻柔的白噪音，没有人说话。\n想起那个撑着下巴的下午。', weather: 'classroom', mix: { 'white-noise': .35 } },
  { id: 'snow', title: '雪日小屋', en: 'SNOW OUTSIDE, WARMTH WITHIN', picture: 'snow', mood: '冬日 · 看雪', line: '窗外下着雪，屋里有一点暖。', description: '雪落在远山和松枝上，屋里有安静的炉火。\n看着雪，慢慢坐一会儿。', weather: 'snow', mix: { wind: .2, campfire: .3, 'brown-noise': .08 } },
  { id: 'meditation', title: '静坐冥想', en: 'A MOMENT BETWEEN BREATHS', picture: 'meditation', mood: '呼吸 · 静坐', line: '不赶时间，只跟着一呼一吸。', description: '晨光、湖面，还有慢慢散开的钵声。\n自然呼吸，不必勉强跟随节奏。', weather: 'meditation', mix: { waves: .24, 'singing-bowl': .16, 'wind-in-trees': .1 } },
];
export const sceneById = new Map(scenes.map(s => [s.id, s]));
export const sceneForSound = s => scenes.find(x => x.picture === s.picture) || {
  id: s.picture, title: s.name, en: 'YOUR QUIET MOMENT', picture: s.picture,
  line: s.description, description: '把熟悉的声音，调成喜欢的模样。', weather: s.category === 'rain' ? 'rain' : 'none',
};
