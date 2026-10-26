// 설명서 공통: 인쇄할 때 선생님 칸 펼치기, 사진은 새 창 대신 같은 창 팝업으로 크게 보기
addEventListener('beforeprint', () => document.querySelectorAll('details.teacher').forEach(d => d.open = true));
const zoom = document.createElement('dialog');
zoom.className = 'zoom';
zoom.innerHTML = '<img alt=""><button type="button" class="zoom-close" aria-label="닫기">✕</button>';
document.body.append(zoom);
zoom.addEventListener('click', () => zoom.close());   // 사진·바깥·✕ 어디를 눌러도 닫힘 (Esc도 됨)
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="img/"]');
  if (!a || e.ctrlKey || e.metaKey || e.shiftKey) return;
  e.preventDefault();
  const img = zoom.querySelector('img');
  img.src = a.href; img.alt = a.querySelector('img')?.alt || '';
  zoom.showModal();
});
