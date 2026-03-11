function ensureToastStack() {
  let stack = document.querySelector('.toast-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'toast-stack';
    stack.setAttribute('aria-live', 'polite');
    stack.setAttribute('aria-atomic', 'true');
    document.body.appendChild(stack);
  }
  return stack;
}

export function showToast(message, type = 'info', duration = 3200) {
  const stack = ensureToastStack();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  stack.appendChild(toast);

  window.requestAnimationFrame(() => {
    toast.classList.add('is-visible');
  });

  const removeToast = () => {
    toast.classList.remove('is-visible');
    window.setTimeout(() => toast.remove(), 180);
  };

  window.setTimeout(removeToast, duration);
  return removeToast;
}

export function setStatus(element, message, type = 'info') {
  if (!element) {
    showToast(message, type === 'pending' ? 'info' : type);
    return;
  }

  element.className = `form-status ${type}`;
  element.hidden = false;
  element.textContent = message;
}

export function clearStatus(element) {
  if (!element) return;
  element.hidden = true;
  element.textContent = '';
  element.className = 'form-status';
}

export function confirmAction({
  title,
  description,
  confirmLabel = 'Подтвердить',
  cancelLabel = 'Отмена',
  danger = false
}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content modal-content--compact" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <div class="modal-productLabel">Подтверждение</div>
        <h3 id="confirm-title">${title}</h3>
        <p>${description}</p>
        <div class="modal-actions modal-actions--split">
          <button type="button" class="${danger ? 'btn btn-danger' : 'btn btn-primary'}" data-confirm="yes">${confirmLabel}</button>
          <button type="button" class="btn-outline" data-confirm="no">${cancelLabel}</button>
        </div>
      </div>
    `;

    const cleanup = (result) => {
      document.removeEventListener('keydown', onKeyDown);
      overlay.remove();
      resolve(result);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        cleanup(false);
      }
    };

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        cleanup(false);
      }
    });

    overlay.querySelector('[data-confirm="yes"]')?.addEventListener('click', () => cleanup(true));
    overlay.querySelector('[data-confirm="no"]')?.addEventListener('click', () => cleanup(false));
    document.addEventListener('keydown', onKeyDown);
    document.body.appendChild(overlay);
    overlay.querySelector('[data-confirm="yes"]')?.focus();
  });
}
