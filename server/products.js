export function formatPrice(num) {
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeAttr(text = '') {
  return escapeHtml(text).replace(/'/g, '&#39;');
}

export function formatMileage(value) {
  if (!value) return 'Пробег не указан';
  return escapeHtml(String(value).trim());
}

function renderEmptyState(message) {
  return `
    <div class="empty-state">
      <h3>Ничего не найдено</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderCard(product) {
  return `
    <article class="card" data-id="${product.id}">
      <div class="card-media">
        <img
          src="${escapeAttr(product.image || 'https://via.placeholder.com/400x250?text=No+image')}"
          alt="${escapeAttr(product.name)}"
          loading="lazy"
          onerror="this.src='https://via.placeholder.com/400x250?text=No+image'"
        >
      </div>
      <div class="card-body">
        <div class="card-topline">
          <span class="card-chip">${escapeHtml(product.body || 'Автомобиль')}</span>
          <span class="card-chip">${escapeHtml(product.year || 'Год не указан')}</span>
        </div>
        <h3>${escapeHtml(product.name)}</h3>
        <p class="price"><span class="price__value">${formatPrice(product.price)}</span><span class="price__currency">₽</span></p>
        <div class="card-meta">
          <span>${formatMileage(product.mileage)}</span>
          <span>${escapeHtml(product.engine || 'Двигатель уточняется')}</span>
        </div>
        <div class="card-actions">
          <a class="btn" href="product.html?id=${product.id}">Подробнее</a>
        </div>
      </div>
    </article>
  `;
}

export function renderProductList(container, products, options = {}) {
  const emptyMessage = options.emptyMessage || 'Попробуйте изменить параметры фильтра и посмотреть другие автомобили.';

  if (!products.length) {
    container.innerHTML = renderEmptyState(emptyMessage);
    return;
  }

  container.innerHTML = products.map(renderCard).join('');
}

