const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle = document.getElementById('modalTitle');
const modalBody = document.getElementById('modalBody');
const closeModalButton = document.getElementById('closeModal');
const toast = document.getElementById('toast');
const tickerTrack = document.getElementById('tickerTrack');
const tickerNext = document.getElementById('tickerNext');
const bottomDock = document.getElementById('bottomDock');
const collapseDockButton = document.getElementById('collapseDockButton');
const expandDockButton = document.getElementById('expandDockButton');

let lastTrigger = null;
let baseScale = 1;
let tickerIndex = 0;

const tickerMessages = [
  'Next Community Coffee Morning · Friday 30 May, 10am',
  'July orders must be received by Friday 29 May',
  'Open this Saturday until 12pm',
  'Friendly support, supplies and local help at Mile End'
];

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function openPanel(templateId, trigger) {
  const template = document.getElementById(templateId);
  if (!template) return;
  closeSubmenus();
  lastTrigger = trigger;
  modalBody.innerHTML = '';
  modalBody.appendChild(template.content.cloneNode(true));
  const titleSource = modalBody.querySelector('h3');
  modalTitle.textContent = titleSource ? titleSource.textContent : 'Details';
  modalBackdrop.hidden = false;
  closeModalButton.focus();
}

function closeModal() {
  modalBackdrop.hidden = true;
  if (lastTrigger) lastTrigger.focus();
}

function renderTicker() {
  tickerTrack.style.opacity = '0';
  tickerTrack.style.transform = 'translateY(6px)';
  setTimeout(() => {
    tickerTrack.textContent = tickerMessages[tickerIndex];
    tickerTrack.style.opacity = '1';
    tickerTrack.style.transform = 'translateY(0)';
  }, 120);
}

function nextTicker() {
  tickerIndex = (tickerIndex + 1) % tickerMessages.length;
  renderTicker();
}

function setScale(value) {
  baseScale = Math.max(0.9, Math.min(1.16, value));
  document.documentElement.style.setProperty('--base-scale', baseScale.toFixed(2));
}

function closeSubmenus(exceptId = null) {
  document.querySelectorAll('.submenu-stack').forEach((submenu) => {
    if (submenu.id !== exceptId) submenu.hidden = true;
  });
  document.querySelectorAll('[data-submenu]').forEach((button) => {
    if (button.dataset.submenu !== exceptId) button.setAttribute('aria-expanded', 'false');
  });
}

function toggleSubmenu(id, trigger) {
  if (bottomDock.classList.contains('collapsed')) return;
  const submenu = document.getElementById(id);
  if (!submenu) return;
  const willOpen = submenu.hidden;
  closeSubmenus(id);
  submenu.hidden = !willOpen;
  trigger.setAttribute('aria-expanded', String(willOpen));
}

function collapseDock() {
  closeSubmenus();
  bottomDock.classList.add('collapsed');
  bottomDock.classList.remove('expanded');
  expandDockButton.focus();
}

function expandDock() {
  bottomDock.classList.remove('collapsed');
  bottomDock.classList.add('expanded');
  collapseDockButton.focus();
}

document.querySelectorAll('[data-panel]').forEach((button) => {
  button.addEventListener('click', () => openPanel(button.dataset.panel, button));
});

document.querySelectorAll('[data-submenu]').forEach((button) => {
  button.addEventListener('click', () => toggleSubmenu(button.dataset.submenu, button));
});

document.querySelectorAll('[data-toast]').forEach((button) => {
  button.addEventListener('click', () => showToast(button.dataset.toast));
});

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    if (action === 'grow-text') {
      setScale(baseScale + 0.04);
      return;
    }
    if (action === 'shrink-text') {
      setScale(baseScale - 0.04);
      return;
    }
    if (action === 'toggle-contrast') {
      document.body.classList.toggle('high-contrast');
      button.setAttribute('aria-pressed', String(document.body.classList.contains('high-contrast')));
    }
  });
});

closeModalButton.addEventListener('click', closeModal);

modalBackdrop.addEventListener('click', (event) => {
  if (event.target === modalBackdrop) closeModal();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (!modalBackdrop.hidden) {
      closeModal();
      return;
    }
    closeSubmenus();
  }
});

document.addEventListener('click', (event) => {
  if (!bottomDock.contains(event.target)) closeSubmenus();
});

tickerNext.addEventListener('click', nextTicker);
collapseDockButton.addEventListener('click', collapseDock);
expandDockButton.addEventListener('click', expandDock);

setInterval(nextTicker, 5500);
renderTicker();
