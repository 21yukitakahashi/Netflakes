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
let isInlineSearchActive = false; // Para sa pag-track ng state ng inline search

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
    return (data.results || []).filter(item =>
      (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path
    );
  } catch (err)
 {
    console.error('Error searching content:', err);
    return [];
  }
}

async function fetchDetails(type, id) {
  try {
    const res = await fetch(`${CONFIG.BASE_URL}/${type}/${id}?api_key=${CONFIG.API_KEY}`);
    const data = await res.json();
    data.media_type = type;
    return data;
  } catch (err) {
    console.error(`Error fetching details for ${type} ${id}:`, err);
    return null;
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

// May 3D TILT EFFECT
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

  // === 3D TILT JAVASCRIPT ===
  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { width, height } = rect;
    // Ang '10' ay ang max rotation in degrees
    const rotateX = (y - height / 2) / (height / 2) * -10; 
    const rotateY = (x - width / 2) / (width / 2) * 10;   
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
  });

  card.addEventListener('mouseleave', () => {
    card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
  });
  // === END NG 3D TILT JAVASCRIPT ===

  return card;
}

// ==================== INLINE SEARCH (Desktop) ====================

/**
 * Gumagawa ng item para sa inline search dropdown
 */
function createSearchResultItem(item) {
  const itemElement = document.createElement('div');
  itemElement.className = 'search-result-item';
  
  // Gumamit ng mas maliit na image (w92) para mabilis mag-load
  const img = document.createElement('img');
  img.src = item.poster_path ? `https://image.tmdb.org/t/p/w92${item.poster_path}` : 'https://via.placeholder.com/45x60?text=N/A';
  img.alt = item.title || item.name;
  img.loading = 'lazy';
  
  const info = document.createElement('div');
  info.className = 'search-result-info';
  
  const title = document.createElement('h4');
  title.textContent = item.title || item.name;
  
  const year = document.createElement('p');
  const date = item.release_date || item.first_air_date;
  year.textContent = date ? new Date(date).getFullYear() : 'N/A';
  
  info.appendChild(title);
  info.appendChild(year);
  itemElement.appendChild(img);
  itemElement.appendChild(info);
  
  // Pag-clinic, ipapakita ang details at isasara ang search
  itemElement.onclick = () => {
    showDetails(item);
    toggleInlineSearch(false); // Piliting isara
  };
  
  return itemElement;
}

/**
 * Logic para sa inline search (pag-type)
 */
async function searchTMDB_Inline() {
  const query = document.getElementById('inline-search-input').value.trim();
  const resultsContainer = document.getElementById('inline-search-results');
  
  clearTimeout(searchTimeout);
  
  if (!query) {
    resultsContainer.innerHTML = '';
    resultsContainer.classList.remove('visible');
    return;
  }
  
  resultsContainer.classList.add('visible');
  resultsContainer.innerHTML = '<div class="inline-search-results-feedback"><i class="fas fa-spinner fa-spin"></i> Searching...</div>'; // Loading indicator
  
  searchTimeout = setTimeout(async () => {
    const list = await searchContent(query);
    resultsContainer.innerHTML = ''; // Clear loading
    
    if (!list.length) {
      resultsContainer.innerHTML = '<div class="inline-search-results-feedback">No results found.</div>';
      return;
    }
    
    // Ipakita lang ang top 5 results sa dropdown
    list.slice(0, 5).forEach(item => {
        resultsContainer.appendChild(createSearchResultItem(item));
    });
  }, 450);
}

/**
 * I-toggle ang "effect" (pag-click sa icon)
 */
function toggleInlineSearch(forceState) {
  const container = document.getElementById('search-container');
  const input = document.getElementById('inline-search-input');
  const icon = document.getElementById('search-btn-icon');
  const results = document.getElementById('inline-search-results');
  
  // Gagamitin ang forceState (true/false) kung meron, kung wala, ita-toggle
  const newState = (forceState !== undefined) ? forceState : !container.classList.contains('active');
  
  if (newState) {
    // Buksan
    container.classList.add('active');
    icon.classList.remove('fa-search');
    icon.classList.add('fa-times'); // Palitan ng 'X' icon
    input.focus();
    isInlineSearchActive = true;
  } else {
    // Isara
    container.classList.remove('active');
    icon.classList.remove('fa-times');
    icon.classList.add('fa-search'); // Ibalik sa search icon
    input.value = '';
    input.blur();
    results.innerHTML = '';
    results.classList.remove('visible');
    isInlineSearchActive = false;
  }
}

// ==================== MODAL (Details) ====================
async function showDetails(item) {
  const searchModal = document.getElementById('search-modal');
  if (searchModal.classList.contains('active')) {
    closeSearchModal();
  }

  currentItem = item;

  const modalContainer = document.getElementById('modal-container');
  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modal-title');
  const modalDescription = document.getElementById('modal-description');
  const modalImage = document.getElementById('modal-image');
  const modalRating = document.getElementById('modal-rating');
  const modalYear = document.getElementById('modal-year');
  const modalType = document.getElementById('modal-type');
  const modalGenres = document.getElementById('modal-genres');
  const modalBackdrop = document.getElementById('modal-backdrop-image');

  modalTitle.textContent = item.title || item.name || '';
  modalDescription.textContent = item.overview || 'No description available.';
  modalImage.src = `${CONFIG.IMG_URL}${item.poster_path}`;
  modalImage.alt = (item.title || item.name || '') + ' poster';
  modalBackdrop.src = item.backdrop_path ? `${CONFIG.IMG_URL}${item.backdrop_path}` : '';
  modalRating.textContent = Number(item.vote_average || 0).toFixed(1);

  const year = item.release_date || item.first_air_date;
  modalYear.textContent = year ? new Date(year).getFullYear() : 'N/A';

  let media_type = item.media_type;
  if (!media_type) {
    media_type = item.title ? 'movie' : 'tv';
  }
  currentItem.media_type = media_type;
  modalType.textContent = media_type === 'movie' ? 'Movie' : 'TV Show';

  let detailedItem = item;
  if (!item.genres && item.id) {
        console.log("Genres missing, attempting to fetch full details...");
        detailedItem = await fetchDetails(media_type, item.id) || item;
  }

  modalGenres.innerHTML = '';
  let genres = detailedItem.genres || []; 
  if (genres.length > 0) {
      genres.slice(0, 4).forEach(genre => {
        const tag = document.createElement('span');
        tag.className = 'genre-tag';
        tag.textContent = genre.name;
        modalGenres.appendChild(tag);
      });
  } else if (Array.isArray(item.genre_ids)) {
      console.log("Using genre_ids as fallback for genres.");
      item.genre_ids.slice(0, 4).forEach(() => {
          const tag = document.createElement('span');
          tag.className = 'genre-tag';
          tag.textContent = 'Genre'; // Placeholder
          modalGenres.appendChild(tag);
      });
    } else {
      console.log("No genre data found.");
    }

  modalContainer.classList.remove('is-movie', 'is-tv'); 
  document.getElementById('server-controls').style.display = 'flex';
  document.getElementById('modal-tv-controls').style.display = 'none';

  changeServer();

  modal.classList.add('active');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  console.log("closeModal called.");
  const modal = document.getElementById('modal');
  const modalVideo = document.getElementById('modal-video');
  modal.classList.remove('active');
  modal.setAttribute('aria-hidden', 'true');
  modalVideo.src = '';
  document.body.style.overflow = 'auto';

  document.getElementById('season-select').innerHTML = '';
  document.getElementById('episode-select').innerHTML = '';
  document.getElementById('modal-container').classList.remove('is-movie', 'is-tv');
  currentItem = null;
}

function changeServer() {
  if (!currentItem) {
    console.warn("changeServer called but currentItem is null.");
    return;
  }
  const server = document.getElementById('server').value;

  let type = currentItem.media_type;
  if (!type) {
      type = currentItem.title ? 'movie' : 'tv';
      console.warn("media_type missing on currentItem, guessing as:", type);
  } else {
      type = type === 'movie' ? 'movie' : 'tv';
  }

  const baseURL = CONFIG.SERVERS[server];
  if (!baseURL) {
    console.error("Invalid server selected:", server);
    return;
  }

  let embedURL = '';
  console.log(`[changeServer] Building URL: Server=${server}, Type=${type}, ID=${currentItem.id}`);

  if (server === 'vidsrc.cc') {
    embedURL = `${baseURL}/${type}/${currentItem.id}`;
  } else if (server === 'vidsrc.me') {
    embedURL = `${baseURL}/${type}/?tmdb=${currentItem.id}`;
  } else if (server === 'player.videasy.net') {
    embedURL = `${baseURL}/${type}/${currentItem.id}`;
  } else {
      console.error("[changeServer] Unknown server logic for:", server);
      return;
  }

  console.log("[changeServer] Setting iframe src to:", embedURL);
  document.getElementById('modal-video').src = embedURL;
}


// ==================== SEARCH MODAL (Mobile) ====================
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
    results.innerHTML = ''; // Clear muna
    // Ang 3D tilt ay automatic na maa-apply dahil sa createMediaCard
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

// ==================== SCROLL ANIMATION ====================
function initScrollObserver() {
  const animatedElements = document.querySelectorAll('.scroll-animate');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // Para isang beses lang mangyari
      }
    });
  }, {
    threshold: 0.1 // 10% ng item ay dapat visible
  });

  animatedElements.forEach(el => {
    observer.observe(el);
  });
}

// ==================== INIT ====================
async function init() {
  console.log("[init] Starting initialization...");
  const loading = document.getElementById('loading-screen');

  const pendingItemId = localStorage.getItem('pendingItemId');
  const pendingItemType = localStorage.getItem('pendingItemType');

  if (pendingItemId && pendingItemType) {
    console.log(`[init] Found pending item: type=${pendingItemType}, id=${pendingItemId}`);
    localStorage.removeItem('pendingItemId');
    localStorage.removeItem('pendingItemType');

    const item = await fetchDetails(pendingItemType, pendingItemId);
    if (item) {
      console.log("[init] Pending item details fetched. Hiding loading and showing details.");
      loading.classList.add('hidden');
      await showDetails(item);
      console.log("[init] Stopping init early after showing pending item.");
      return;
    } else {
      console.warn("[init] Failed to fetch details for pending item. Continuing normal load.");
    }
  }

  try {
    console.log("[init] Starting initial data fetch (Movies, TV, Anime)...");
    const [movies, tvShows, anime] = await Promise.all([
      fetchTrending('movie'),
      fetchTrending('tv'),
      fetchTrendingAnime()
    ]);
    console.log("[init] Initial data fetch complete.");

    const pool = [...movies, ...tvShows].filter(i => i.backdrop_path);
    const randomItem = pool[Math.floor(Math.random() * pool.length)] || movies[0] || tvShows[0];
    if (randomItem) {
      console.log("[init] Displaying banner...");
      displayBanner(randomItem);
    }

    console.log("[init] Displaying lists...");
    displayList(movies, 'movies-list');
    displayList(tvShows, 'tvshows-list');
    displayList(anime, 'anime-list');
    console.log("[init] Lists displayed.");
    
    // Tawagin ang scroll observer pagkatapos mag-load ng lists
    initScrollObserver();

    if (!loading.classList.contains('hidden')) {
      console.log("[init] Hiding loading screen...");
      setTimeout(() => loading.classList.add('hidden'), 100);
    } else {
      console.log("[init] Loading screen was already hidden.");
    }

  } catch (err) {
    console.error('[init] Initialization error:', err);
    loading.innerHTML = '<p>Error loading content. Please refresh the page.</p>';
    setTimeout(() => {
      if (!loading.classList.contains('hidden')) {
        loading.classList.add('hidden');
      }
    }, 1000);
  }
}
// END INIT

// ==================== EVENTS ====================
// Event listener para sa 'handleNavbarScroll'
window.addEventListener('scroll', handleNavbarScroll); 

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeModal();
    closeSearchModal();
    document.getElementById('mobile-menu').classList.remove('active');
    toggleInlineSearch(false); // Isara rin ang inline search
  }
});
document.addEventListener('click', (e) => {
  if (e.target.closest('.mobile-nav-link')) toggleMobileMenu();
});

document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM fully loaded. Setting up event listeners.");

  const serverSelect = document.getElementById('server');
  if (serverSelect) {
    serverSelect.addEventListener('change', changeServer);
  } else {
    console.error("! Element #server not found!");
  }

  // Bagong listener para sa search button
  const searchBtn = document.getElementById('search-btn-trigger');
  if (searchBtn) {
    searchBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Pigilan ang click na lumabas
      // Titingnan kung desktop o mobile
      if (window.innerWidth > 768) {
        toggleInlineSearch(); // Gamitin ang bagong inline search sa desktop
      } else {
        openSearchModal(); // Gamitin ang lumang modal sa mobile
      }
    });
  } else {
    console.error("! Element #search-btn-trigger not found!");
  }

  // Listener para isara ang search pag-clinic sa labas
  document.addEventListener('click', (e) => {
    const container = document.getElementById('search-container');
    // Isasara lang kung active at ang clinic ay sa LABAS ng container
    if (isInlineSearchActive && container && !container.contains(e.target)) {
      toggleInlineSearch(false); // Piliting isara
    }
  });
  
  initScrollObserver();
  
  console.log("Starting App Initialization...");
  init();
});
