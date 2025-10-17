export function formatPrice(num) {
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function escapeHtml(text='') {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderProductList(container, products) {
  container.innerHTML = products.map(product => `
    <article class="card" data-id="${product.id}">
      <div class="card-media">
        <img src="${product.image}" alt="${escapeHtml(product.name)}" onerror="this.src='https://via.placeholder.com/400x250?text=No+image'">
      </div>
      <div class="card-body">
        <h3>${escapeHtml(product.name)}</h3>
        <p class="price">${formatPrice(product.price)} ₽</p>
        <p class="muted small">${product.year ? product.year : ''} ${product.mileage ? '• ' + product.mileage : ''}</p>
        <div class="card-actions">
          <a class="btn" href="product.html?id=${product.id}">Подробнее</a>
        </div>
      </div>
    </article>
  `).join('');
}

export function renderProductDetail(container, product) {
  if (!product) {
    container.innerHTML = '<p>Автомобиль не найден.</p>';
    return;
  }
  container.innerHTML = `
    <div class="product-grid">
      <div class="product-media">
        <img src="${product.image}" alt="${escapeHtml(product.name)}" class="car-lg" onerror="this.src='https://via.placeholder.com/600x400?text=No+image'">
      </div>
      <div class="product-info">
        <h1>${escapeHtml(product.name)}</h1>
        <p class="price large">${formatPrice(product.price)} ₽</p>
        <p><strong>Год выпуска:</strong> ${product.year || '-'}</p>
        <p><strong>Пробег:</strong> ${product.mileage || '-'}</p>
        <p><strong>Кузов:</strong> ${product.body || '-'}</p>
        <p><strong>Двигатель:</strong> ${product.engine || '-'}</p>
        <p><strong>Разгон 0-100 км/ч:</strong> ${product.acceleration || '-'}</p>
        <div class="card-actions">
          <a class="btn" id="request-btn">Оставить заявку</a>
          <button class="btn-outline" id="call-btn">Позвонить</button>
        </div>
        <section class="description">
          <h3>Описание</h3>
          <p>${escapeHtml(product.description)}</p>
        </section>
      </div>
    </div>
  `;
  const req = container.querySelector('#request-btn');
  if (req) req.addEventListener('click', () => alert('Заявка отправлена (демо). Менеджер свяжется с вами.'));
  const call = container.querySelector('#call-btn');
  if (call) call.addEventListener('click', () => alert('Позвоните: +7 (000) 000-00-00'));
}

