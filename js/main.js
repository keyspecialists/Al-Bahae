
// ====== Site Interactions ======
document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu
  const burger = document.querySelector('.burger');
  const menu = document.querySelector('.menu');
  if (burger && menu){
    burger.addEventListener('click', () => menu.classList.toggle('open'));
    menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>menu.classList.remove('open')));
  }

  // Reveal on scroll
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target);} });
  },{threshold:.12});
  document.querySelectorAll('.reveal').forEach(el=>io.observe(el));

  // Active link highlight
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.menu a').forEach(a=>{
    if (a.getAttribute('href')===path) a.classList.add('active');
  });
});
