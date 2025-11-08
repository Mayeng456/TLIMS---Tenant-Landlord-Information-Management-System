// Final/tenant.js (COMPLETE CODE with all fixes)

document.addEventListener("DOMContentLoaded", () => {
// ==================== ICON INIT ====================
if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
  lucide.createIcons();
}

// ==================== GLOBAL VARIABLES ====================
const tenantId = typeof TENANT_ID !== 'undefined' ? TENANT_ID : null;
const tenantName = typeof TENANT_NAME !== 'undefined' ? TENANT_NAME : 'Tenant';

let allProperties = []; // Store for filtering
let favorites = []; // Store for favorites (gikan sa DB)
let chats = {}; // Store for messages (gikan sa DB)
let currentChat = null;

// NEW: JHCSC Coordinates (KINAHANGLAN MO-VALIDATE UG MOPALIT UG SAKTO NGA COORDS)
const JHCSC_LAT = 7.8229;  
const JHCSC_LNG = 123.4357; 

// ==================== ELEMENTS ====================
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menuToggle");
const pages = document.querySelectorAll(".page");
const links = document.querySelectorAll(".menu a");
const searchInput = document.getElementById("searchInput");
const priceSelect = document.getElementById("priceSelect");
const sortSelect = document.getElementById("sortSelect");
// REMOVED: const chips = document.querySelectorAll(".chip");
const propertyCount = document.getElementById("propertyCount");
const detailsModal = document.getElementById("detailsModal");
const contactModal = document.getElementById("contactModal");
const logoutBtn = document.getElementById("btnLogout"); // CHANGED to ID
const favoritesGrid = document.getElementById('favoritesGrid');
const contactForm = document.getElementById("contactForm");
const landlordNameEl = document.getElementById("landlordName");
const propertyTitleEl = document.getElementById("propertyTitle");

// Message page elements
const chatTitle = document.getElementById("chatTitle");
const chatSubtitle = document.getElementById("chatSubtitle");
const chatAvatar = document.getElementById("chatAvatar");
const messageHistory = document.getElementById("messageHistory");
const messageInput = document.getElementById("messageInput");
const sendMessageBtn = document.getElementById("sendMessageBtn");

// Badge elements
const msgBadge = document.getElementById('msgBadge');
const notifBadge = document.getElementById('notifBadge');
const modalLogout = document.getElementById('modalLogout'); // NEW

// LEAFLET HELPER FUNCTION (UPDATED LOGIC)
function setupTenantMap(mapId, lat, lng) {
    // FIX: Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        document.getElementById(mapId).innerHTML = '<p class="text-red-500 p-4">Map library not loaded. Check console for errors.</p>';
        return;
    }

    const mapElement = document.getElementById(mapId);
    if (!mapElement) return;

    // Clear the map container contents and size it
    mapElement.innerHTML = '';
    mapElement.style.height = '300px';

    if (!lat || !lng || parseFloat(lat) === 0 || parseFloat(lng) === 0) {
        // --- Custom Message When Coordinates are Missing ---
        mapElement.style.height = '150px'; // Mas gamay kung walay map
        mapElement.classList.add('bg-gray-100', 'p-4', 'flex', 'flex-col', 'items-center', 'justify-center');
        mapElement.innerHTML = `
            <div class="text-center">
                <i data-lucide="map-pin-off" class="w-8 h-8 text-red-500 mb-2"></i>
                <p class="text-gray-700 font-semibold">Location Map Unavailable</p>
                <p class="text-gray-500 text-sm">The landlord has not yet marked the precise location.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    // Kon naa nay coordinates, init ang map
    mapElement.classList.remove('bg-gray-100', 'p-4', 'flex', 'flex-col', 'items-center', 'justify-center');
    
    // Initialize map 
    const map = L.map(mapId).setView([lat, lng], 15);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    
    L.marker([lat, lng]).addTo(map)
        .bindPopup('Property Location')
        .openPopup();

    setTimeout(() => {
        map.invalidateSize(); 
    }, 50);
}

// ===============================================================
// ==  REVIEWS LOGIC (REMOVED)
// ===============================================================
function loadReviews(propertyId) {
    // Empty function since reviews are removed
    const reviewListEl = document.getElementById('detailsReviews');
    if (reviewListEl) {
        reviewListEl.innerHTML = ''; // Ensure the whole section is cleared/removed
    }
}
// ===============================================================


function openPropertyDetails(propertyId) {
    const property = allProperties.find(p => p.property_id == propertyId);
    if (!property) {
      showToast('Property details not found.', 'error');
      return;
    }

    if (!detailsModal) {
      console.error('Details modal not found');
      return;
    }

    // Kinahanglan i-set ang display to flex una bago i-init ang map
    detailsModal.style.display = 'flex'; 
    // loadReviews(propertyId); // REMOVED: No need to call this anymore

    document.getElementById('detailsTitle').textContent = property.title || 'Unknown Property';
    
    // 1. I-PREPARE ANG PHOTOS ARRAY
    const photos = Array.isArray(property.photos) ? property.photos : [];
    const firstPhoto = photos.length > 0 ? photos[0] : 'https://placehold.co/400x300?text=No+Image';
    
    // 2. MAIN IMAGE (Ang una nga photo)
    document.getElementById('detailsImage').src = firstPhoto;
    
    document.getElementById('detailsPrice').textContent = `₱${(property.price || 0).toLocaleString()} / month`;
    document.getElementById('detailsArea').textContent = property.location || 'Unknown location';
    document.getElementById('detailsDescription').textContent = property.description || 'No description available';
// DIRI ANG KAUSABAN:
const propLat = parseFloat(property.latitude);
const propLng = parseFloat(property.longitude);

let distanceText = 'N/A';
if (propLat !== 0 && propLng !== 0) {
    const distance = calculateDistance(propLat, propLng, JHCSC_LAT, JHCSC_LNG);
    distanceText = `${distance.toFixed(1)} km from JHCSC`;
} else {
    distanceText = 'Location Map Unavailable (Landlord has not marked coordinates)';
}
document.getElementById('detailsDistance').textContent = distanceText; 
document.getElementById('detailsLandlord').textContent = property.landlord_name || 'Unknown Landlord';
    
    // Find or create button container (unchanged logic)
    const landlordInfoDiv = document.getElementById('detailsLandlord').parentElement;
    let buttonContainer = landlordInfoDiv.querySelector('.modal-actions-container');
    if (!buttonContainer) {
        buttonContainer = document.createElement('div');
        buttonContainer.className = 'modal-actions-container flex gap-2 mt-2';
        landlordInfoDiv.appendChild(buttonContainer);
    }
    buttonContainer.innerHTML = ''; 

    // Contact Button (unchanged logic)
    const contactBtn = document.createElement('button');
    contactBtn.className = 'btn bg-green-500 text-white px-4 py-2 rounded text-sm contact-landlord-btn';
    contactBtn.textContent = 'Contact Landlord';
    contactBtn.setAttribute('data-id', property.property_id);
    buttonContainer.appendChild(contactBtn);

    // Book Now Button (unchanged logic)
    const bookBtn = document.createElement('button');
    bookBtn.className = 'btn bg-blue-600 text-white px-4 py-2 rounded text-sm book-now-btn';
    bookBtn.textContent = 'Book Now';
    bookBtn.setAttribute('data-id', property.property_id);
    buttonContainer.appendChild(bookBtn);

    // 3. THUMBNAILS RENDERING
    const thumbnailsDiv = document.getElementById('detailsThumbnails');
    if (photos.length > 0) {
        thumbnailsDiv.innerHTML = photos.map((url, index) => 
            `<img src="${url}" class="w-16 h-16 rounded object-cover cursor-pointer thumbnail ${index === 0 ? 'border-2 border-blue-500' : ''}" data-image="${url}">`
        ).join('');
    } else {
        thumbnailsDiv.innerHTML = '<p class="text-gray-500 text-sm">No additional photos available.</p>';
    }

    // Amenities (unchanged logic)
    const amenitiesDiv = document.getElementById('detailsAmenities');
    const amenities = (Array.isArray(property.amenities) ? property.amenities : (property.amenities || '').split(','));
    amenitiesDiv.innerHTML = amenities.map(a => 
      `<span class="bg-gray-100 px-2 py-1 rounded text-sm">${String(a).trim()}</span>`
    ).join('');

    // Thumbnail Click Listener (unchanged logic)
    document.querySelectorAll('#detailsModal .thumbnail').forEach(thumb => {
      thumb.addEventListener('click', function() {
        document.getElementById('detailsImage').src = this.getAttribute('data-image');
        document.querySelectorAll('#detailsModal .thumbnail').forEach(t => t.classList.remove('border-2', 'border-blue-500'));
        this.classList.add('border-2', 'border-blue-500');
      });
    });
    
    // --- MAP INTEGRATION (NEW) ---
    const mapContainer = document.getElementById('tenantMapDisplay');
    if (mapContainer) {
         // I-set ang unique ID para sa Leaflet
         mapContainer.innerHTML = '<div id="propertyLeafletMap" style="height: 100%; width: 100%;"></div>';
         
         // I-pass ang coordinates gikan sa property object
         setupTenantMap('propertyLeafletMap', property.latitude, property.longitude);
    }
    // --- END MAP INTEGRATION ---


    lucide.createIcons();
    attachStaticModalEvents();
  }

  // FINAL FIX: Simplified Contact Modal - Removed dropdowns
  function openContactLandlord(propertyId, propertyTitle, landlordName, landlordId) {
    if (!contactModal) {
      console.error('Contact modal not found');
      return;
    }
    
    // FIX: Tago-on ang Details Modal aron dili mag-overlap
    if (detailsModal) {
        detailsModal.style.display = 'none';
    }

    if (landlordNameEl) landlordNameEl.textContent = landlordName || 'Landlord';
    if (propertyTitleEl) propertyTitleEl.textContent = propertyTitle || 'Property';

    contactForm.reset();
    
    // I-set ang hidden values para sa form submission
    let hiddenPropId = contactForm.querySelector('input[name="property_id"]');
    if (!hiddenPropId) {
        hiddenPropId = document.createElement('input');
        hiddenPropId.type = 'hidden';
        hiddenPropId.name = 'property_id';
        contactForm.appendChild(hiddenPropId);
    }
    hiddenPropId.value = propertyId;

    let hiddenLandlordId = contactForm.querySelector('input[name="landlord_id"]');
    if (!hiddenLandlordId) {
        hiddenLandlordId = document.createElement('input');
        hiddenLandlordId.type = 'hidden';
        hiddenLandlordId.name = 'landlord_id';
        contactForm.appendChild(hiddenLandlordId);
    }
    hiddenLandlordId.value = landlordId || 0; 

    let hiddenTenantId = contactForm.querySelector('input[name="tenant_id"]');
    if (!hiddenTenantId) {
        hiddenTenantId = document.createElement('input');
        hiddenTenantId.type = 'hidden';
        hiddenTenantId.name = 'tenant_id';
        contactForm.appendChild(hiddenTenantId);
    }
    hiddenTenantId.value = tenantId;
    
    // I-prefill ang user info gikan sa Session
    document.getElementById('yourName').value = tenantName;
    document.getElementById('yourEmail').value = ''; 
    document.getElementById('message').value = `Hi, I'm interested in "${propertyTitle}".`;

    contactModal.style.display = 'flex';
    lucide.createIcons();
    
    contactForm.removeEventListener('submit', handleContactSubmit);
    contactForm.addEventListener('submit', handleContactSubmit);
    
    attachStaticModalEvents();
  }
    // ==================== UTILITY FUNCTIONS ====================
  function getInitials(name) {
    if (!name || typeof name !== 'string') return '?';
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  }

  function getColor(name) {
    if (!name || typeof name !== 'string') return 'bg-gray-500';
    const colors = ["bg-blue-500", "bg-green-500", "bg-indigo-500", "bg-purple-500", "bg-pink-500", "bg-red-500", "bg-orange-500", "bg-yellow-500"];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  }
  /**
 * Nagkuwenta sa distance tali sa duha ka lat/lng points gamit ang Haversine formula
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2 (JHCSC)
 * @param {number} lon2 - Longitude 2 (JHCSC)
 * @returns {number} Distance in kilometers (km)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius sa Yuta sa km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c); // Distance in km
}
  // FIX: Function to update sidebar badges
  function updateBadge(element, count) {
      if (element) {
          element.textContent = count > 0 ? count : '';
          element.style.display = count > 0 ? 'inline' : 'none';
      }
  }

// BAG-O NGA FUNCTION PARA I-LOAD ANG DASHBOARD
async function loadDashboardSummary() {
    // Pangitaon ang mga elements nga ilisdan
    const totalPropsEl = document.querySelector('.card.blue h3');
    const activeBooksEl = document.querySelector('.card.green h3');
    const pendingInqEl = document.querySelector('.card.orange h3');
    const activityListEl = document.querySelector('.activity'); // Ang container

    if (!totalPropsEl || !activityListEl) {
        // I-set ang polling interval to load badges even if on another page
        loadBadges(); 
        return;
    }

    try {
        const response = await fetch('get_tenant_summary.php');
        const data = await response.json();

        if (data.success) {
            const summary = data.summary;

            // 1. I-update ang Stats
            totalPropsEl.textContent = summary.total_properties;
            activeBooksEl.textContent = summary.active_bookings;
            pendingInqEl.textContent = summary.pending_inquiries;
            
            // I-update ang badges gikan sa summary
            await loadBadges(); 

            // 2. I-update ang Recent Activity
            activityListEl.innerHTML = '<h3 class="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>'; // Limpyohan ug ibalik ang header
            if (summary.recent_activity.length === 0) {
                activityListEl.innerHTML += '<p class="text-gray-500 p-3">No recent activity.</p>';
                return;
            }

            summary.recent_activity.forEach(activity => {
                const item = document.createElement('div');
                let colorClass = 'blue'; // default
                if (activity.type === 'booking') colorClass = 'green';
                if (activity.type === 'message') colorClass = 'orange';

                const timeAgo = new Date(activity.created_at).toLocaleString();

                item.className = `activity-item ${colorClass}`;
                item.innerHTML = `
                    <div class="flex-1 ml-1">
                        <strong class="text-${colorClass}-600">${activity.title}</strong>
                        <p>${activity.description}</p>
                    </div>
                    <span class="text-xs text-gray-600">${timeAgo}</span>
                `;
                activityListEl.appendChild(item);
            });

        } else {
            console.error('Failed to load summary:', data.error);
            activityListEl.innerHTML = '<p class="text-red-500">Error loading activity.</p>';
        }

    } catch (error) {
        console.error('Fetch summary error:', error);
        activityListEl.innerHTML = '<p class="text-red-500">Could not load activity.</p>';
    }
}

// FIX: New function to load ONLY BADGES for polling
async function loadBadges() {
    if (!tenantId) return;

    // Load Message Badge
    try {
        const msgResponse = await fetch(`get_tenant_messages.php?tenant_id=${tenantId}`);
        const msgData = await msgResponse.json();
        if (msgData.success) {
            updateBadge(msgBadge, msgData.unread_count);
        }
    } catch (error) {
        console.error('Error polling messages:', error);
    }
    
    // Load Notification Badge
    try {
        const notifResponse = await fetch('notifications.php');
        const notifData = await notifResponse.json();
        if (notifData.success) {
            updateBadge(notifBadge, notifData.unread_count);
        }
    } catch (error) {
        console.error('Error polling notifications:', error);
    }
}


// FIX: Automatic Polling every 15 seconds
if (tenantId) {
    loadBadges(); // Load immediately on init
    setInterval(() => {
        loadBadges();
        // Optional: reload dashboard summary if on dashboard page
        if (!document.getElementById('dashboard').classList.contains('hidden')) {
             loadDashboardSummary();
        }
    }, 15000); // Poll every 15 seconds
}


async function loadNotifications() {
    const notificationList = document.getElementById('notificationList');
    const unreadCountEl = document.getElementById('unreadCount');

    if (!notificationList) return; 

    try {
        const response = await fetch('notifications.php');
        const data = await response.json();

        if (!data.success) {
            notificationList.innerHTML = '<p class="text-gray-500">Could not load notifications.</p>';
            return;
        }

        // 1. I-update ang counts
        if (unreadCountEl) unreadCountEl.textContent = data.unread_count;
        updateBadge(notifBadge, data.unread_count); // I-update ang sidebar badge

        // 2. I-display ang notifications
        if (data.notifications.length === 0) {
            notificationList.innerHTML = '<p class="text-gray-500">No notifications yet.</p>';
            return;
        }

        notificationList.innerHTML = ''; // Limpyohan daan
        data.notifications.forEach(notif => {
            const item = document.createElement('div');
            const isRead = notif.is_read == 1;
            const priority = notif.type === 'booking' ? 'high' : (notif.type === 'message' ? 'medium' : 'low');
            const icon = notif.type === 'booking' ? 'home' : (notif.type === 'message' ? 'mail' : 'bell');

            item.className = `notification-item ${priority} flex items-start p-2 rounded border`;
            item.setAttribute('data-priority', priority);
            item.setAttribute('data-read', isRead);

            item.innerHTML = `
              <div class="icon-section mr-2">
                  <i data-lucide="${icon}"></i>
              </div>
              <div class="content-section flex-1">
                  <div class="title-line flex justify-between items-center">
                      <h3 class="title font-semibold ${isRead ? 'text-gray-600' : 'text-gray-800'}">${notif.title}</h3>
                      <div class="priority-badge ${priority}-badge text-xs font-bold">${priority}</div>
                  </div>
                  <p class="description ${isRead ? 'text-gray-500' : 'text-gray-600'}">${notif.description}</p>
                  <span class="timestamp text-xs text-gray-400">${new Date(notif.created_at).toLocaleString()}</span>
              </div>
              <div class="status-dot ${isRead ? 'read-dot bg-green-500' : 'unread-dot bg-red-500'} w-3 h-3 rounded-full mt-2"></div>
            `;

            // Add click listener para i-mark as read
            if (!isRead) {
                item.style.cursor = 'pointer';
                item.addEventListener('click', async () => {
                    try {
                        // FIX: Markahan ang notification ID
                        await fetch(`mark_read.php?id=${notif.id}`); 
                        loadNotifications(); // I-refresh ang list human ma-click
                    } catch (e) {
                        console.error('Failed to mark read');
                    }
                });
            }

            notificationList.appendChild(item);
        });

        lucide.createIcons(); // I-render ang bag-ong icons

    } catch (error) {
        console.error('Failed to load notifications:', error);
        notificationList.innerHTML = '<p class="text-red-500">Error loading notifications.</p>';
    }
}


  // ==================== SIDEBAR NAVIGATION ====================
  menuToggle?.addEventListener("click", () => {
    sidebar.classList.toggle("expanded");
  });

  links.forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const targetPage = link.dataset.page;

      links.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      pages.forEach(page => {
        page.id === targetPage ? page.classList.remove("hidden") : page.classList.add("hidden");
      });

      if (targetPage === 'notificationsPage') {
        loadNotifications(); // I-load ang tinuod nga data
      }
      if (targetPage === 'browsePage') {
        fetchProperties();
      }
      if (targetPage === 'favoritesPage') {
        displayFavorites();
      }
      if (targetPage === 'messagesPage') {
        displayConversations();
        setTimeout(() => {
          const first = document.querySelector('.conversation-item');
          if (first && !document.querySelector('.conversation-item.active')) first.click();
        }, 200);
      }
      if (window.innerWidth <= 768) sidebar.classList.remove("expanded");
    });
  });

  // ==================== FAVORITES (DATABASE) ====================
  
  // 1. Load favorites gikan sa DB
  async function loadFavorites() {
    if (!tenantId) {
        console.warn('No tenant ID, cannot load favorites.');
        favorites = []; // Siguraduhon nga blangko
        return;
    }
    try {
        const response = await fetch('get_favorites.php');
        const data = await response.json();
        if (data.success) {
            favorites = data.favorites; // favorites is now an array of IDs [1, 5, 12]
        } else {
            console.error('Failed to load favorites:', data.error);
            favorites = [];
        }
    } catch (error) {
        console.error('Error fetching favorites:', error);
        favorites = [];
    }
    // I-update dayon ang UI
    updateFavoriteIcons();
    updateFavoritesBadge();
  }

// Final/tenant.js

  // 2. I-toggle ang favorite sa DB (CRITICAL FIX)
  async function toggleFavorite(propertyId) {
    if (!tenantId) {
        alert('Please log in to save favorites.');
        return;
    }
    
    // 1. Optimistic UI update (HIMOON NATO KINI DAAN)
    const isCurrentlyFavorite = favorites.includes(propertyId);
    
    // I-UPDATE ANG LOCAL ARRAY
    if (isCurrentlyFavorite) {
        favorites = favorites.filter(id => id !== propertyId);
    } else {
        favorites.push(propertyId);
    }
    
    // 2. I-UPDATE DAYON ANG ICONS SA SCREEN
    updateFavoriteIcons();
    updateFavoritesBadge();
    lucide.createIcons(); // I-render ang icons nga nausab
    
    // 3. Server Request
    try {
        const response = await fetch('toggle_favorite.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ property_id: propertyId })
        });
        const data = await response.json();
        
        if (!data.success) {
            // I-revert ang optimistic UI kung mag-error
            if (isCurrentlyFavorite) {
                favorites.push(propertyId); // Ibalik
            } else {
                favorites = favorites.filter(id => id !== propertyId); // Kuhaon balik
            }
            alert('Failed to update favorites. Please try again.');
            // I-revert ang icons
            updateFavoriteIcons();
            updateFavoritesBadge();
            lucide.createIcons();
        } else {
            console.log(`Favorite ${data.action}: ${propertyId}`);
            // Kung successful, i-refresh ang favorites page kung bukas
            if (document.getElementById('favoritesPage') && !document.getElementById('favoritesPage').classList.contains('hidden')) {
                displayFavorites();
            }
        }
    } catch (error) {
        console.error('Toggle favorite error:', error);
        alert('Network error updating favorites.');
        // I-revert ang icons kung network error
        if (isCurrentlyFavorite) {
            favorites.push(propertyId);
        } else {
            favorites = favorites.filter(id => id !== propertyId);
        }
        updateFavoriteIcons();
        updateFavoritesBadge();
        lucide.createIcons();
    }
  }
// Final/tenant.js

  // 3. I-update ang colors sa heart icons (FINAL, FINAL FIX)
  function updateFavoriteIcons() {
    document.querySelectorAll('.property-card').forEach(card => {
      const iconContainer = card.querySelector('.favorite-icon');
      if (!iconContainer) return;
      
      const propertyId = parseInt(card.getAttribute('data-property-id'));
      const isFavorite = favorites.includes(propertyId);
      
      // I-set ang icon element mismo (either the i tag or the generated SVG)
      let heartElement = iconContainer.querySelector('i') || iconContainer.querySelector('svg');
      if (!heartElement) return;

      if (isFavorite) {
        // I-set ang CSS Classes
        heartElement.classList.remove('text-gray-400');
        heartElement.classList.add('text-red-500');

        // CRITICAL FIX: I-set ang fill attribute direkta sa SVG/container
        if (heartElement.tagName === 'svg' || heartElement.hasAttribute('data-lucide')) {
            heartElement.setAttribute('fill', 'currentColor');
            heartElement.setAttribute('stroke', '#ef4444'); // Tailwind red-500
        }
      } else {
        // I-kuha ang CSS Classes
        heartElement.classList.remove('text-red-500');
        heartElement.classList.add('text-gray-400');
        
        // CRITICAL FIX: I-remove ang fill attribute
        if (heartElement.tagName === 'svg' || heartElement.hasAttribute('data-lucide')) {
            heartElement.removeAttribute('fill');
            heartElement.setAttribute('stroke', 'currentColor');
        }
      }
    });
  }

  // 4. I-update ang badge count
  function updateFavoritesBadge() {
    const badge = document.getElementById('favoritesBadge');
    if (badge) badge.textContent = favorites.length;
  }

  // 5. I-display ang favorites page
  function displayFavorites() {
    if (!favoritesGrid) return;
    
    favoritesGrid.innerHTML = '';
    
    if (favorites.length === 0) {
        favoritesGrid.innerHTML = '<p class="text-center text-gray-500 col-span-3">You have not saved any favorites yet.</p>';
    } else {
        favorites.forEach(propertyId => {
          const property = allProperties.find(p => p.property_id == propertyId);
          if (property) {
            const card = createPropertyCard(property);
            favoritesGrid.appendChild(card);
          } else {
            console.warn('Favorite ID not found in data:', propertyId);
          }
        });
    }
    
    const favoritesCountEl = document.getElementById('favoritesCount');
    if (favoritesCountEl) favoritesCountEl.textContent = `${favorites.length} properties saved for later`;
    
    // I-update ang icons sulod sa favorites grid
    updateFavoriteIcons();
    lucide.createIcons();
  }

  // ==================== FETCH PROPERTIES ====================
  async function fetchProperties() {
    try {
      const response = await fetch('get_all_properties.php'); 
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      
      const data = await response.json();

      if (data.success) {
        allProperties = data.properties; // Set for filtering
        
        await loadFavorites();
        
        displayLandlordProperties(allProperties);
      } else {
        console.error('API error:', data.error);
        document.getElementById('propertyGrid').innerHTML = `<p class="text-center text-red-500 col-span-3">Error: ${data.error}</p>`;
      }
    } catch (error) {
      console.error('Fetch failed:', error);
      document.getElementById('propertyGrid').innerHTML = `<p class="text-center text-red-500 col-span-3">Fetch Error: ${error.message}.</p>`;
    }
  }

  if (document.getElementById('browsePage') && !document.getElementById('browsePage').classList.contains('hidden')) {
    fetchProperties();
  } else {
    fetchProperties(); 
  }
  
  // ==================== DISPLAY & CREATE CARDS ====================
  function displayLandlordProperties(properties) {
    const propertiesGrid = document.getElementById('propertyGrid');
    if (!propertiesGrid) return;
    propertiesGrid.innerHTML = '';

    if (properties.length === 0) {
      propertiesGrid.innerHTML = '<p class="text-center text-gray-500 col-span-3">No properties available.</p>';
      return;
    }

    properties.forEach(property => {
      const propertyCard = createPropertyCard(property);
      propertiesGrid.appendChild(propertyCard);
    });

    if (propertyCount) {
      propertyCount.textContent = `${properties.length} Properties Found`;
    }

    updateFavoriteIcons(); // I-apply ang heart colors
    lucide.createIcons();
  }

  function createPropertyCard(property) {
    const card = document.createElement('div');
    const propId = property.property_id || property.id;
    card.className = 'property-card relative bg-white rounded-lg shadow overflow-hidden';
    card.setAttribute('data-property-id', propId);
    
    const photos = Array.isArray(property.photos) ? property.photos : (property.images ? JSON.parse(property.images) : []);
    const firstPhoto = photos && photos.length > 0 ? 
                      photos[0] : 'https://placehold.co/400x300?text=No+Image';

    const locationSnippet = property.location ? `${property.location.substring(0, 30)}...` : 'Unknown location';
    
    const rawAmenities = property.amenities;
    let amenitiesArray = [];
    if (Array.isArray(rawAmenities)) {
        amenitiesArray = rawAmenities;
    } else if (typeof rawAmenities === 'string') {
        amenitiesArray = rawAmenities.split(',').map(a => a.trim()).filter(a => a);
    }
    
    const amenitiesHtml = amenitiesArray.slice(0, 3).map(amenity => {
        let icon = 'tag'; 
        if (amenity.toLowerCase().includes('wifi')) icon = 'wifi';
        else if (amenity.toLowerCase().includes('parking')) icon = 'parking';
        else if (amenity.toLowerCase().includes('laundry')) icon = 'washing-machine';
        else if (amenity.toLowerCase().includes('kitchen')) icon = 'utensils';
        
        return `<span class="flex items-center gap-1 text-xs"><i data-lucide="${icon}" class="h-3 w-3"></i> ${amenity}</span>`;
    }).join('');

    // ===============================================================
    // == CRITICAL FIX: DYNAMIC STATUS BADGE PARA SA TENANT CARD
    // ===============================================================
    let statusDisplay = 'Available';
    let statusColorClass = 'bg-green-500'; 
    
    // Check sa tinuod nga status gikan sa DB (property.status)
    if (property.status === 'coming soon') {
        statusDisplay = 'Coming Soon';
        statusColorClass = 'bg-blue-500'; // Blue for Coming Soon
    } else if (property.status === 'available') {
        statusDisplay = 'Available';
        statusColorClass = 'bg-green-500'; // Green for Available
    } else {
        // Rent / Maintenance, which should not appear in the browse list normally, but handled for safety
        statusDisplay = 'Unavailable';
        statusColorClass = 'bg-red-500';
    }


    card.innerHTML = `
      <div class="relative">
        <img src="${firstPhoto}" alt="${property.title}" class="w-full h-48 object-cover">
        <div class="badge-overlay absolute top-2 left-2 
              ${statusColorClass} 
              text-white text-xs font-semibold px-2 py-1 rounded">
          ${statusDisplay}
        </div>
        <button class="favorite-icon absolute top-2 right-2 bg-white p-2 rounded-full shadow-md">
          <i data-lucide="heart" class="w-5 h-5 text-gray-400"></i>
        </button>
      </div>
      <div class="p-4">
        <h3 class="text-lg font-semibold truncate">${property.title}</h3>
        <p class="text-sm text-gray-600 mb-2 truncate">${property.bedrooms || 1} Bed • ${locationSnippet}</p>

        <div class="flex flex-wrap gap-2 text-sm text-gray-700 mb-4">
          ${amenitiesHtml || '<span class="text-xs">No amenities listed</span>'}
        </div>

        <div class="flex justify-between items-center">
          <span class="text-xl font-bold text-gray-800">₱${(property.price || 0).toLocaleString()}</span>
          <button class="btn bg-blue-500 text-white px-3 py-2 rounded text-sm view-details" data-id="${propId}">Details</button>
        </div>
      </div>
    `;
    return card;
  }
// ==================== EVENT DELEGATION ====================
  document.addEventListener('click', e => {
    // ... (Existing code for bookBtn, detailsBtn, contactBtn) ...
    
    // View Details
    const bookBtn = e.target.closest('.book-now-btn');
    if (bookBtn) {
        const propertyId = parseInt(bookBtn.getAttribute('data-id'));
        if (confirm('Are you sure you want to send a booking request for this property?')) {
            handleBooking(propertyId);
        }
    }

    const detailsBtn = e.target.closest('.view-details');
    if (detailsBtn) {
      const propertyId = parseInt(detailsBtn.getAttribute('data-id'));
      openPropertyDetails(propertyId);
    }

    // Contact Landlord (gikan sa details modal)
    const contactBtn = e.target.closest('.contact-landlord-btn');
    if (contactBtn) {
        const propertyId = parseInt(contactBtn.getAttribute('data-id'));
        const property = allProperties.find(p => p.property_id == propertyId);
        if (property) {
            openContactLandlord(property.property_id, property.title, property.landlord_name || 'Landlord', property.landlord_id);
        }
    }

 
// Final/tenant.js - around line 361

    // Favorite toggle (CRITICAL FIX: E-ensure ang icon update)
    const favIcon = e.target.closest('.favorite-icon');
    if (favIcon) {
      const card = favIcon.closest('.property-card');
      const propertyId = parseInt(card.getAttribute('data-property-id'));
      
      if(propertyId) {
          // 1. Tawgon ang toggleFavorite (mo-update na sa local array ug mo-send sa server)
          toggleFavorite(propertyId);
          
          // 2. TAWAGON DIRI ANG LUCIDE ARON I-RE-RENDER ANG SVG ATTRIBUTES.
          // Kini ang pinakasiguro nga paagi para sa automatic update.
          setTimeout(() => {
              updateFavoriteIcons();
              lucide.createIcons();
          }, 50); // Small delay to ensure DOM is ready for re-render
      }
    }
  });

// ... (rest of the code)

  // Final/tenant.js

  async function handleContactSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(contactForm);
    
    if (!tenantId) {
        alert('You must be logged in to send a message.');
        return;
    }
    formData.set('tenant_id', tenantId);

    formData.append('your_name', document.getElementById('yourName').value);
    formData.append('your_email', document.getElementById('yourEmail').value);
    formData.append('sent_by', 'tenant');
    formData.append('subject', 'General Inquiry'); // STATIC SUBJECT

    await sendContactMessage(formData);
  }

  async function sendContactMessage(formData) {
    try {
        const response = await fetch('send_message.php', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
             const text = await response.text();
             console.error('Invalid response from server:', text);
             throw new Error('Server sent an invalid response.');
        }

        const data = await response.json();

        if (data.success) {
            showToast(data.message || 'Message sent successfully! Check your messages.');
            contactModal.style.display = 'none';
            contactForm.reset();
            
            if (document.getElementById('messagesPage') && !document.getElementById('messagesPage').classList.contains('hidden')) {
                displayConversations();
            }
            loadBadges(); // Update badges after sending message
        } else {
            showToast(`Error: ${data.error || 'Failed to send message'}`, 'error');
        }
    } catch (error) {
        console.error('Send message error:', error.message);
        showToast(`Failed to send message: ${error.message}.`, 'error');
    }
  }
  
  // ==================== REVIEWS LOGIC (continued) ====================
  // Helper to attach event handlers for static modal elements
  function attachStaticModalEvents() {
    const closeDetailsBtn = document.getElementById('closeDetailsModal');
    if (closeDetailsBtn) closeDetailsBtn.onclick = () => { 
        detailsModal.style.display = 'none'; 
        // OPTIONAL: Clear the map to save resources when closed
        const mapElement = document.getElementById('propertyLeafletMap');
        if (mapElement && mapElement._leaflet_id) {
            // Check if map is initialized before removal
            const mapInstance = L.DomUtil.get(mapElement.id)?._leaflet_id;
            if (mapInstance) {
                mapElement.remove();
            }
        }
    };

    const closeContactBtn = document.getElementById('closeContactModal');
    if (closeContactBtn) closeContactBtn.onclick = () => { contactModal.style.display = 'none'; };

    const cancelContactBtn = document.getElementById('cancelContact');
    if (cancelContactBtn) cancelContactBtn.onclick = () => { contactModal.style.display = 'none'; };

    if (detailsModal) detailsModal.onclick = (e) => { 
        if (e.target === detailsModal) {
            detailsModal.style.display = 'none'; 
             // OPTIONAL: Clear the map when overlay is clicked
            const mapElement = document.getElementById('propertyLeafletMap');
             if (mapElement && mapElement._leaflet_id) {
                const mapInstance = L.DomUtil.get(mapElement.id)?._leaflet_id;
                if (mapInstance) {
                    mapElement.remove();
                }
            }
        }
    };
    if (contactModal) contactModal.onclick = (e) => { if (e.target === contactModal) contactModal.style.display = 'none'; };
  }
  attachStaticModalEvents();

  async function handleBooking(propertyId) {
    if (!tenantId) {
        showToast('You must be logged in to book a property.', 'error');
        return;
    }

    const property = allProperties.find(p => p.property_id == propertyId);
    if (!property) {
        showToast('Property data not found.', 'error');
        return;
    }

    if (!property.landlord_id) {
         showToast('Cannot book: Landlord ID is missing.', 'error');
         return;
    }

    try {
        const response = await fetch('book_property.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tenant_id: tenantId,
                property_id: property.property_id,
                landlord_id: property.landlord_id,
                property_title: property.title
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast(data.message || 'Booking request sent!');
            detailsModal.style.display = 'none'; 
            loadDashboardSummary(); 
            loadBadges(); // Update badges after booking
        } else {
            showToast(`Booking failed: ${data.error || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('Book property error:', error);
        showToast('Network error: ' + error.message, 'error');
    }
}

  // ==================== SEARCH + FILTER (CHIPS REMOVED) ====================
  function filterProperties() {
    let filtered = [...allProperties];

    const searchValue = searchInput ? searchInput.value.toLowerCase() : '';
    if (searchValue) {
      filtered = filtered.filter(p => 
          (p.title && p.title.toLowerCase().includes(searchValue)) ||
          (p.location && p.location.toLowerCase().includes(searchValue))
      );
    }

    const priceFilter = priceSelect ? priceSelect.value : '';
    filtered = filtered.filter(p => {
      const price = parseInt(p.price) || 0;
      if (priceFilter === "low") return price <= 10000;
      if (priceFilter === "mid") return price > 10000 && price <= 15000;
      if (priceFilter === "high") return price > 15000;
      return true;
    });

    displayLandlordProperties(filtered);
    if (propertyCount) propertyCount.textContent = `${filtered.length} Properties Found`;
  }

  searchInput?.addEventListener("input", filterProperties);
  priceSelect?.addEventListener("change", filterProperties);
  // Removed chips logic: chips.forEach(chip => chip.addEventListener...)

  // ==================== TOAST FUNCTION ====================
  function showToast(message, type = 'success') {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `fixed bottom-6 right-6 px-4 py-2 rounded-lg shadow-lg z-50 ${
      type === 'error' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
    }`;
    toast.style.opacity = 1;
    setTimeout(() => { if(toast) toast.style.opacity = 0 }, 3000);
  }

  // ==================== LOGOUT (MODAL IMPLEMENTATION) ====================
  logoutBtn?.addEventListener('click', function openLogout(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!modalLogout) return;
    // Pwersaon ang pag-display sa modal
    modalLogout.style.cssText = `display: flex !important; visibility: visible !important; opacity: 1 !important; z-index: 9999 !important; position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;`;
});

document.getElementById('closeLogoutModal')?.addEventListener('click', () => {
    if (modalLogout) modalLogout.style.display = 'none';
});
document.getElementById('btnCancelLogout')?.addEventListener('click', () => {
    if (modalLogout) modalLogout.style.display = 'none';
});
document.getElementById('btnConfirmLogout')?.addEventListener('click', () => {
    window.location.href = 'logout.php';
});

if(modalLogout) {
    modalLogout.addEventListener('click', e => {
        if (e.target === modalLogout) modalLogout.style.display = 'none';
    });
}


document.getElementById('markAllReadBtn')?.addEventListener('click', async function() {
  try {
      const response = await fetch('mark_read.php?all=true'); 
      const data = await response.json();
      if (data.success) {
          showToast('All notifications marked as read!');
          loadNotifications(); 
          loadBadges();
      } else {
          showToast(data.error || 'Failed to mark all as read.', 'error');
      }
  } catch (error) {
      showToast('Network error.', 'error');
  }
});

  // ==================== MESSAGES PAGE (DATABASE-RELIANT) ====================
  
  async function loadChats() {
    if (!tenantId) {
      chats = {};
      return;
    }

    try {
      const response = await fetch(`get_tenant_messages.php?tenant_id=${tenantId}`);
      const data = await response.json();
      
      updateBadge(msgBadge, data.unread_count || 0); // FIX: Update badge here

      if (data.success && data.messages.length > 0) {
        const grouped = {};
        data.messages.forEach(msg => {
          const lid = msg.landlord_id.toString(); 
          if (!grouped[lid]) grouped[lid] = [];
          grouped[lid].push(msg);
        });

        chats = {};
        Object.keys(grouped).forEach(lid => {
          const msgs = grouped[lid].sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
          const landlordName = msgs[0].landlord_name || 'Unknown Landlord';
          const propertyTitle = msgs[0].property_title || 'General Inquiry'; // FIX: Get Property Title
          let title = landlordName; // Landlord Name
          
          chats[lid] = {
            title: title, // Landlord Name (used for chatTitle in logic below)
            landlord: landlordName,
            property: propertyTitle, // Property Title
            color: getColor(landlordName),
            initials: getInitials(landlordName),
            messages: msgs.map(m => {
              let text = m.message_text;
              let from = "landlord"; 
              
              if (text.startsWith("You: ")) { 
                from = "user"; 
                text = text.substring(5);
              } else if (m.receiver_id == tenantId) {
                from = "landlord"; 
              }
              
              return {
                from: from,
                text: text,
                time: new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                created_at: m.sent_at,
                read: m.is_read == 1 || from === 'user' 
              };
            })
          };
        });
      } else {
        chats = {};
      }
    } catch (error) {
      console.error('Failed to load chats:', error);
      chats = {};
    }
  }

  async function displayConversations() {
    await loadChats(); 

    const list = document.getElementById('conversationList');
    if (!list) return;
    list.innerHTML = '';
    
    if (Object.keys(chats).length === 0) {
      list.innerHTML = '<p class="text-center text-gray-500 p-4">No conversations yet.</p>';
      const chatWindow = document.getElementById('chatWindow');
      if (chatWindow) chatWindow.classList.add('hidden');
      const chatInput = document.getElementById('chatInputContainer');
      if (chatInput) chatInput.classList.add('hidden');
      return;
    }

    Object.entries(chats).sort(([,a], [,b]) => {
      const timeA = a.messages.length > 0 ? new Date(a.messages[a.messages.length - 1].created_at) : new Date(0);
      const timeB = b.messages.length > 0 ? new Date(b.messages[b.messages.length - 1].created_at) : new Date(0);
      return timeB - timeA;
    }).forEach(([key, chat]) => {
      const item = document.createElement('div');
      item.className = 'conversation-item flex items-center p-3 hover:bg-gray-50 cursor-pointer';
      item.dataset.chat = key; 
      
      const lastMsg = chat.messages[chat.messages.length - 1];
      const preview = lastMsg ? (lastMsg.text.length > 30 ? lastMsg.text.substring(0, 30) + '...' : lastMsg.text) : 'No messages yet';
      const time = lastMsg ? lastMsg.time : '';
      
      // FIX: Kuhaon ang unread count gikan sa messages nga gikan sa Landlord ug is_read=0
      const unreadCount = chat.messages.filter(m => m.from === 'landlord' && m.read === false).length;
      const unread = unreadCount > 0;
      
      item.innerHTML = `
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center">
            <div class="w-10 h-10 ${chat.color} text-white rounded-full flex justify-center items-center font-semibold mr-3 text-sm">${chat.initials}</div>
            <div class="flex-1 min-w-0">
              <strong class="block text-sm font-medium text-gray-900 truncate">${chat.landlord}</strong>
              <span class="text-xs text-gray-500 truncate">${preview}</span>
            </div>
          </div>
          <div class="flex flex-col items-end ml-2">
            <span class="text-xs text-gray-400">${time}</span>
            ${unread ? `<div class="w-2 h-2 bg-blue-500 rounded-full mt-1"></div>` : ''}
          </div>
        </div>
      `;
      list.appendChild(item);
    });
    bindConversationClicks();
  }

  function bindConversationClicks() {
    document.querySelectorAll(".conversation-item").forEach(item => {
      item.addEventListener("click", async () => {
        document.querySelectorAll(".conversation-item").forEach(i => i.classList.remove("active", "bg-blue-50"));
        item.classList.add("active", "bg-blue-50");
        
        const chatKey = item.dataset.chat; 
        currentChat = chatKey;
        const chatData = chats[chatKey];
        if (!chatData) return;
        
        // FIX: Messages Header (Landlord Name / Property Title)
        if(chatTitle) chatTitle.textContent = chatData.landlord; // Landlord Name
        if(chatSubtitle) chatSubtitle.textContent = chatData.property; // Property Title

        // Mark as read when clicking on the chat
        if (tenantId) {
          try {
            await fetch(`mark_read.php?tenant_id=${tenantId}&landlord_id=${chatKey}`);
            // Update local state and refresh badges/list
            chatData.messages.forEach(msg => { if (msg.from === "landlord") msg.read = true; });
            loadBadges(); // Update sidebar badge
            displayConversations(); // Re-render list to remove dot
            
          } catch (error) {
            console.error('Failed to mark as read:', error);
          }
        }

        if(chatAvatar) {
            chatAvatar.textContent = chatData.initials;
            chatAvatar.className = `w-10 h-10 ${chatData.color} text-white rounded-full flex justify-center items-center font-semibold`;
        }
        
        if(messageHistory) {
            messageHistory.innerHTML = "";
            chatData.messages.forEach(msg => {
              const div = document.createElement("div");
              div.classList.add("message", "mb-2");
              
              if (msg.from === "user") div.classList.add("text-right", "sent");
              else div.classList.add("received");
              
              const msgClass = msg.from === "user" ? "inline-block bg-blue-100 px-2 py-1 rounded" : "inline-block bg-gray-100 px-2 py-1 rounded";
              
              div.innerHTML = `
                <div class="message-bubble">
                    <p>${msg.text}</p>
                </div>
                <span class="timestamp text-xs text-gray-400 block">${msg.time}</span>
              `;
              messageHistory.appendChild(div);
            });
            messageHistory.scrollTop = messageHistory.scrollHeight;

            const chatInput = document.getElementById('chatInputContainer');
            if (chatInput) chatInput.classList.remove('hidden');
            const chatWindow = document.getElementById('chatWindow');
            if (chatWindow) chatWindow.classList.remove('hidden');
        }
        
        lucide.createIcons();
      });
    });
  }

  sendMessageBtn?.addEventListener("click", sendMessage);
  messageInput?.addEventListener("keypress", e => {
    if (e.key === "Enter") sendMessage();
  });

  async function sendMessage() {
    const msgText = messageInput.value.trim();
    if (!msgText || !currentChat) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", "sent", "text-right", "mb-2");
    
    msgDiv.innerHTML = `
      <div class="message-bubble">
        <p>${msgText}</p>
      </div>
      <span class="timestamp text-xs text-gray-400 block">${timeStr}</span>
    `;
    
    messageHistory.appendChild(msgDiv);
    messageInput.value = "";
    messageHistory.scrollTop = messageHistory.scrollHeight;

    if (!tenantId) {
        alert('Error: Tenant ID not found. Cannot send message.');
        msgDiv.remove();
        return;
    }

    const formData = new FormData();
    formData.append('landlord_id', currentChat); 
    formData.append('tenant_id', tenantId);
    formData.append('message', msgText);
    formData.append('your_name', tenantName); 
    formData.append('your_email', ''); 
    formData.append('subject', 'General Inquiry'); // STATIC SUBJECT

    formData.append('sent_by', 'tenant');

    try {
      const response = await fetch('send_message.php', { method: 'POST', body: formData });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
           const text = await response.text();
           console.error('Invalid response from server:', text);
           throw new Error('Server sent an invalid response.');
      }
      
      const data = await response.json();

      if (data.success) {
        await displayConversations();
        const activeItem = document.querySelector(`.conversation-item[data-chat="${currentChat}"]`);
        if (activeItem) activeItem.click();
        loadBadges(); // Update badges after sending
      } else {
        showToast('Error: ' + (data.error || 'Failed to send message'), 'error');
        msgDiv.remove();
      }
    } catch (error) {
      console.error('Send message error:', error);
      showToast('Network error: ' + error.message, 'error');
      msgDiv.remove();
    }
  }

  // Search conversations
  document.getElementById("searchConvo")?.addEventListener("input", e => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll(".conversation-item").forEach(item => {
      const landlord = item.querySelector("strong")?.textContent.toLowerCase() || '';
      const preview = item.querySelector("span.text-xs.text-gray-500")?.textContent.toLowerCase() || '';
      item.style.display = (landlord.includes(term) || preview.includes(term)) ? "flex" : "none";
    });
  });

  // ==================== INITIAL PAGE LOAD ====================
  const defaultPage = document.getElementById("dashboard");
  if (defaultPage) defaultPage.classList.remove("hidden");
    loadDashboardSummary(); 
    
  // CRITICAL FIX: Ensure Logout Modal is hidden on load
  const modalLogoutOnLoad = document.getElementById('modalLogout');
  if (modalLogoutOnLoad) {
      modalLogoutOnLoad.style.display = 'none'; 
  }
  
}); // END OF DOMContentLoaded