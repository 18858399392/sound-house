const paths = {
 play:'<path d="m9 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',pause:'<path d="M8 5v14M16 5v14" stroke-width="3.5"/>',
 close:'<path d="m6 6 12 12M6 18 18 6"/>',plus:'<path d="M12 5v14M5 12h14"/>',check:'<path d="m5 12 4 4L20 5"/>',
 settings:'<path d="m9 3-.7 3-3 .8-2.2 2.7 2 2.5-.7 3.2 2.9 1.7.8 3.1h3.8l.9-3.1 2.8-1.7-.7-3.2 2.1-2.5L16 6.8 13 6l-.7-3Z" transform="translate(2 0)"/><circle cx="12" cy="11.5" r="3"/>',
 sliders:'<path d="M4 4v7m0 4v5m8-16v3m0 4v9m8-16v10m0 4v2M1 11h6m2-4h6m2 7h6"/>',
 landscape:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m3 15 5-5 5 5 3-3 5 5"/><circle cx="16" cy="8" r="1"/>',
 spaces:'<circle cx="12" cy="12" r="9"/><path d="m16.5 7.5-2.8 6.2-6.2 2.8 2.8-6.2Z"/><path d="M12 3v2m9 7h-2m-7 9v-2M3 12h2"/>',
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
 heart:'<path d="M20.8 5.5c-2.5-2.5-6-1.3-8.8 1.5-2.8-2.8-6.3-4-8.8-1.5C-.1 8.8 3 13 12 20c9-7 12.1-11.2 8.8-14.5Z"/>',
 bookmark:'<path d="M6 3h12v18l-6-4-6 4Z"/>', timer:'<circle cx="12" cy="13" r="8"/><path d="M12 9v5l3 2M9 2h6m-3 0v3m6 2 2-2"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M3 17v4h18v-4"/>',volume:'<path d="M3 9v6h4l5 4V5L7 9ZM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
 right:'<path d="m9 6 6 6-6 6"/>',left:'<path d="m14 6-6 6 6 6"/>',up:'<path d="m6 15 6-6 6 6"/>',
 spark:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
 share:'<path d="M12 16V3m-5 5 5-5 5 5M5 12H3v9h18v-9h-2"/>',
 copy:'<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
 trash:'<path d="M3 6h18M6 6l1 15h10l1-15M9 6V3h6v3M10 10v7m4-7v7"/>',
 device:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',
 wifi:'<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0"/><circle cx="12" cy="20" r=".7"/>',
 cabin:'<path d="m3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.2"/>',
};
export const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.sliders}</svg>`;
export const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
