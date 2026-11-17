const picker = document.getElementById('ballPicker');
const choose = document.getElementById('pickerProBtn');
const dialog = document.getElementById('desktopCourse');
const levels = document.getElementById('levelSelect');
dialog.querySelector('.course-slots').append(levels);
levels.style.display = 'flex';
choose.textContent = 'CHOOSE HOLE';
choose.addEventListener('click', () => dialog.showModal());
dialog.querySelector('.course-close').addEventListener('click', () => dialog.close());
levels.addEventListener('click', event => {
  if (!event.target.closest('.lvl-btn')) return;
  dialog.close();
  picker.classList.add('hidden');
  document.getElementById('instructions').classList.remove('visible');
});
const daily = document.getElementById('modeDaily');
dialog.querySelector('.course-slots').append(daily);
daily.addEventListener('click', () => { dialog.close(); picker.classList.add('hidden'); });
// Stop game shortcuts while keyboard users are choosing a course.
window.addEventListener('keydown', event => {
  if (dialog.open) event.stopImmediatePropagation();
}, true);
document.getElementById('controlsBtn').addEventListener('click', function () {
  document.getElementById('keyDisplay').classList.toggle('visible');
  this.classList.toggle('open');
  this.textContent = this.classList.contains('open') ? 'CLOSE' : 'CONTROLS';
});
