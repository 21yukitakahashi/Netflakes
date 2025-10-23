// ==================== CONFIGURATION ====================
const CONFIG = {
  API_KEY: '4e677baabbee6c14b748aa4c9c936109',
  BASE_URL: 'https://api.themoviedb.org/3',
  IMG_URL: 'https://image.tmdb.org/t/p/original',
  SERVERS: {
    'vidsrc.cc': 'https://vidsrc.cc/v2/embed',
    'vidsrc.me': 'https://vidsrc.net/embed',
    'player.videasy.net': 'https://player.videasy.net'
  }
};

// ==================== STATE ====================
let currentItem = null;
let searchTimeout = null;

// ==================== API ====================
async function fetchTrending(type, page = 1) {
  try {
    const res = await fetch(`${CONFIG.BASE_URL}/trending/${type}/week?api_key=${CONFIG.API_KEY}&page=${page}`);
    const data = await res.json();
    return Array.isArray(data.results) ? data.results : [];
  } catch (err) {
    console.error(`Error fetching trending ${type}:`, err);
    return [];
  }
}

async function fetchTrendingAnime() {
  try {
    let all = [];
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(`${CONFIG.BASE_URL}/trending/tv/week?api_key=${CONFIG.API_KEY}&page=${page}`);
      const data = await res.json();
      const filtered = (data.results || []).filter(item =>
        item.original_language === 'ja' && (item.genre_ids || []).includes(16)
      );
      all = all.concat(filtered);
    }
    return all;
  } catch (err) {
    console.error('Error fetching trending anime:', err);
    return [];
  }
}

async function searchContent(query) {
  try {
    const res = await fetch(`${CONFIG.BASE_URL}/search/multi?api_key=${CONFIG.API_KEY}&query=${encodeURIComponent(query)}`);
    const data = await res.json();
    return (data.results || []).filter(item => item.poster_path);
  } catch (err) {
    console.error('Error searching content:', err);
    return [];
  }
}

// ==================== UI ====================
function displayBanner(item) {
  const banner = document.getElementById('banner');
  const title = document.getElementById('banner-title');
  const desc = document.getElementById('banner-description');
  const playBtn = document.getElementById('banner-play-btn');
  const infoBtn = document.getElementById('banner-info-btn');

  banner.style.backgroundImage = item?.backdrop_path
    ? `url(${CONFIG.IMG_URL}${item.backdrop_path})`
    : 'none';
  title.textContent = item.title || item.name || '';
  desc.textContent = item.overview || 'No description available.';

  playBtn.onclick = () => showDetails(item);
  infoBtn.onclick = () => showDetails(item);
}

function displayList(items, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  items.forEach(item => container.appendChild(createMediaCard(item)));
}

function createMediaCard(item) {
  const card = document.createElement('div');
  card.className = 'media-card';
  card.setAttribute('role', 'button');
  card.setAttribute('tabindex', '0');
  card.setAttribute('aria-label', (item.title || item.name || 'Open') + ' details');

  const img = document.createElement('img');
  img.src = `${CONFIG.IMG_URL}${item.poster_path}`;
  img.alt = item.title || item.name || 'Poster';
  img.loading = 'lazy';

  const overlay = document.createElement('div');
  overlay.className = 'media-card-overlay';

  const title = document.createElement('div');
  title.className = 'media-card-title';
  title.textContent = item.title || item.name;

  const rating = document.createElement('div');
  rating.className = 'media-card-rating';
  rating.innerHTML = `<i class="fas fa-star" aria-hidden="true"></i> ${Number(item.vote_average || 0).toFixed(1)}`;

  overlay.appendChild(title);
  overlay.appendChild(rating);
  card.appendChild(img);
  card.appendChild(overlay);

  const open = () => showDetails(item);
  card.onclick = open;
  card.onkeydown = (e) => (e.key === 'Enter' || e.key === ' ') && open();

  return card;
}

// ==================== MODAL ====================
function showDetails(item) {
  currentItem = item;

  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalDescription = document.getElementById('modal-description');
  const modalImage = document.getElementById('modal-image');
  const modalRating = document.getElementById('modal-rating');
  const modalYear = document.getElementById('modal-year');
  const modalType = document.getElementById('modal-type');
  const modalGenres = document.getElementById('modal-genres');

  modalTitle.textContent = item.title || item.name || '';
  modalDescription.textContent = item.overview || 'No description available.';
  modalImage.src = `${CONFIG.IMG_URL}${item.poster_path}`;
  modalImage.alt = (item.title || item.name || '') + ' poster';
  modalRating.textContent = Number(item.vote_average || 0).toFixed(1);

  const year = item.release_date || item.first_air_date;
  modalYear.textContent = year ? new Date(year).getFullYear() : 'N/A';

  const type = item.media_type === 'movie' ? 'Movie' : 'TV Show';
  modalType.textContent = type;

  // Render genres if available from list result
  modalGenres.innerHTML = '';
  if (Array.isArray(item.genre_ids) && item.genre_ids.length) {
    item.genre_ids.slice(0, 6).forEach(() => {
      const tag = document.createElement('span');
      tag.className = 'genre-tag';
      tag.textContent = 'Genre';
      modalGenres.appendChild(tag);
    });
  }

  changeServer();
  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  const modal = document.getElementById('modal');
  const modalVideo = document.getElementById('modal-video');
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  modalVideo.src = '';
  document.body.style.overflow = 'auto';
}

function changeServer() {
  if (!currentItem) return;
  const server = document.getElementById('server').value;
  const type = currentItem.media_type === 'movie' ? 'movie' : 'tv';
  const baseURL = CONFIG.SERVERS[server];

  let embedURL = '';
  if (server === 'vidsrc.cc') {
    embedURL = `${baseURL}/${type}/${currentItem.id}`;
  } else if (server === 'vidsrc.me') {
    embedURL = `${baseURL}/${type}/?tmdb=${currentItem.id}`;
  } else if (server === 'player.videasy.net') {
    embedURL = `${baseURL}/${type}/${currentItem.id}`;
  }
  document.getElementById('modal-video').src = embedURL;
}

// ==================== SEARCH ====================
function openSearchModal() {
  const m = document.getElementById('search-modal');
  const input = document.getElementById('search-input');
  m.classList.add('active');
  m.setAttribute('aria-hidden', 'false');
  input.focus();
  document.body.style.overflow = 'hidden';
}
function closeSearchModal() {
  const m = document.getElementById('search-modal');
  const input = document.getElementById('search-input');
  const results = document.getElementById('search-results');
  m.classList.remove('active');
  m.setAttribute('aria-hidden', 'true');
  input.value = '';
  results.innerHTML = '';
  document.body.style.overflow = 'auto';
}

async function searchTMDB() {
  const query = document.getElementById('search-input').value.trim();
  const results = document.getElementById('search-results');
  const loading = document.getElementById('search-loading');
  const empty = document.getElementById('search-empty');

  clearTimeout(searchTimeout);

  if (!query) {
    results.innerHTML = '';
    loading.style.display = 'none';
    empty.style.display = 'none';
    return;
  }

  loading.style.display = 'flex';
  empty.style.display = 'none';
  results.innerHTML = '';

  searchTimeout = setTimeout(async () => {
    const list = await searchContent(query);
    loading.style.display = 'none';
    if (!list.length) {
      empty.style.display = 'flex';
      return;
    }
    list.forEach(item => results.appendChild(createMediaCard(item)));
  }, 450);
}

// ==================== CAROUSEL ====================
function scrollCarousel(listId, direction) {
  const list = document.getElementById(listId);
  const amount = 400;
  list.scrollBy({ left: direction * amount, behavior: 'smooth' });
}

// ==================== MOBILE MENU ====================
function toggleMobileMenu() {
  const menu = document.getElementById('mobile-menu');
  const isActive = menu.classList.toggle('active');
  menu.setAttribute('aria-hidden', String(!isActive));
}

// ==================== NAVBAR SCROLL EFFECT ====================
function handleNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (window.scrollY > 50) navbar.classList.add('scrolled');
  else navbar.classList.remove('scrolled');
}

// ==================== INIT ====================
async function init() {
  const loading = document.getElementById('loading-screen');

  try {
    const [movies, tvShows, anime] = await Promise.all([
      fetchTrending('movie'),
      fetchTrending('tv'),
      fetchTrendingAnime()
    ]);

    const pool = [...movies, ...tvShows].filter(i => i.backdrop_path);
    const randomItem = pool[Math.floor(Math.random() * pool.length)] || movies[0] || tvShows[0];
    if (randomItem) displayBanner(randomItem);

    displayList(movies, 'movies-list');
    displayList(tvShows, 'tvshows-list');
    displayList(anime, 'anime-list');

    setTimeout(() => loading.classList.add('hidden'), 400);
  } catch (err) {
    console.error('Initialization error:', err);
    loading.innerHTML = '<p>Error loading content. Please refresh the page.</p>';
  }
}

// ==================== EVENTS ====================
window.addEventListener('scroll', handleNavbarScroll);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeSearchModal();
    document.getElementById('mobile-menu').classList.remove('active');
  }
});
document.addEventListener('click', (e) => {
  // close mobile menu when clicking a link
  if (e.target.closest('.mobile-nav-link')) toggleMobileMenu();
});

// Start app
init();
