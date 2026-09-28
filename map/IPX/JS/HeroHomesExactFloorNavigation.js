/* Hero Homes — exact floor navigation */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded',()=>{
    document.querySelectorAll('.Cutout path[data-link]').forEach(path=>{
      if(path.dataset.hhNavWired)return;
      path.dataset.hhNavWired='1';
      path.addEventListener('click',e=>{
        e.preventDefault();e.stopImmediatePropagation();
        const name=path.getAttribute('data-name')||'';
        const link=path.getAttribute('data-link')||'';
        let m=name.match(/^(.+?)_Floor_(\d+)$/i);
        let tower=m?m[1]:((link.match(/Tower-(?:C-)?([0-9A-Z]+)\.html/i)||[])[1]||'');
        let floor=m?Number(m[2]):Number(path.getAttribute('floorNumber'));
        if(!Number.isInteger(floor)||floor<1||floor>32)return;
        if(!/^\d+A?$/i.test(tower)) {
          const lm=link.match(/Tower-(?:C-)?([0-9A-Z]+)\.html/i); if(lm)tower=lm[1];
        }
        if(!tower)return;
        sessionStorage.setItem('selectedTower',tower);
        sessionStorage.setItem('heroHomesTower',tower);
        sessionStorage.setItem('selectedFloor',String(floor));
        sessionStorage.setItem('heroHomesFloor',String(floor));
        const sep=link.includes('?')?'&':'?';
        setTimeout(()=>location.href=link+sep+'floor='+encodeURIComponent(floor),0);
      },true);
    });
  });
})();