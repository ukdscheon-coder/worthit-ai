(()=>{
  const scrollToTarget=id=>{
    const el=document.getElementById(id);
    if(!el)return;
    const offset=126;
    window.scrollTo({top:Math.max(0,el.getBoundingClientRect().top+window.scrollY-offset),behavior:'smooth'});
  };
  document.addEventListener('click',event=>{
    const mode=event.target.closest('.mode[data-target]');
    if(mode){
      event.preventDefault();
      document.querySelectorAll('.mode').forEach(btn=>btn.classList.toggle('active',btn===mode));
      scrollToTarget(mode.dataset.target);
      return;
    }
    const chip=event.target.closest('.topic-chip[data-topic]');
    if(chip){
      chip.scrollIntoView({behavior:'smooth',inline:'center',block:'nearest'});
    }
  },true);
})();
