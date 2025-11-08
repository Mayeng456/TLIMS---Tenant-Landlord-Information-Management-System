// Final/landlord.js (COMPLETE CODE with Proxy Fix and Edit Map Fix)

// Safe landlord ID getter
function getLandlordId() {
    if (typeof LANDLORD_ID !== 'undefined' && LANDLORD_ID) {
        return LANDLORD_ID;
    }
    console.warn('❌ No landlord ID available');
    return null;
}

// ===== SAFE DOM ACCESS HELPERS =====
function safeGetElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`⚠️ Element not found: #${id}`);
    }
    return element;
}

function safeSetText(elementOrId, text) {
    const element = typeof elementOrId === 'string' ? safeGetElement(elementOrId) : elementOrId;
    if (element && 'textContent' in element) {
        element.textContent = text;
        return true;
    }
    return false;
}

function safeSetHTML(elementOrId, html) {
    const element = typeof elementOrId === 'string' ? safeGetElement(elementOrId) : elementOrId;
    if (element && 'innerHTML' in element) {
        element.innerHTML = html;
        return true;
    }
    return false;
}

function safeSetDisplay(elementOrId, displayValue) {
    const element = typeof elementOrId === 'string' ? safeGetElement(elementOrId) : elementOrId;
    if (element && 'style' in element) {
        element.style.display = displayValue;
        return true;
    }
    return false;
}

function safeSetValue(elementOrId, value) {
    const element = typeof elementOrId === 'string' ? safeGetElement(elementOrId) : elementOrId;
    if (element && 'value' in element) {
        element.value = value != null ? value : '';
        return true;
    }
    return false;
}

function safeAddEventListener(elementOrId, event, handler) {
    const element = typeof elementOrId === 'string' ? safeGetElement(elementOrId) : elementOrId;
    if (element && 'addEventListener' in element) {
        element.addEventListener(event, handler);
        return true;
    }
    return false;
}

// Helper: safely escape HTML to prevent XSS
function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', function() {
    // Section switching
    const sections = document.querySelectorAll('section');
    const menuBtns = document.querySelectorAll('.menu button[data-section]');
    
    // === NEW LEAFLET VARIABLES ===
    let currentLeafletMap = null;
    let currentMarker = null;
    let selectedLat = 0;
    let selectedLng = 0;
    
    // Element selectors for map controls
    const mapModal = safeGetElement('mapModal');
    // Global map target variables
    let mapTargetLatId = 'prop-lat';
    let mapTargetLngId = 'prop-lng';
    let mapTargetStatusId = 'coordStatus'; 
    
    const mapSearchInput = safeGetElement('mapSearchInput');
    const mapSearchButton = safeGetElement('mapSearchButton');
    const btnSaveMapLocation = safeGetElement('btnSaveMapLocation');
    
    // === NEW LEAFLET MAP FUNCTIONS (Refactored to accept target IDs) ===
    
    // 1. OPEN MAP MODAL & INITIALIZE LEAFLET
    function openMapModal(targetLatId, targetLngId, targetStatusId) {
        safeSetDisplay(mapModal, 'flex');
        
        // Set the current targets
        mapTargetLatId = targetLatId;
        mapTargetLngId = targetLngId;
        mapTargetStatusId = targetStatusId;
        
        const initialLatInput = safeGetElement(mapTargetLatId);
        const initialLngInput = safeGetElement(mapTargetLngId);
        
        // Use the coordinates from the targeted form field for initialization
        const initialLat = parseFloat(initialLatInput.value) || 7.8229; 
        const initialLng = parseFloat(initialLngInput.value) || 123.4357; 
        
        // I-reset ang status
        safeSetText('mapStatus', 'Select a point on the map.');
        btnSaveMapLocation.disabled = true;

        // Kinahanglan ang timeout para ma-render ang Leaflet sa husto
        setTimeout(() => {
            if (currentLeafletMap) {
                currentLeafletMap.remove(); // Limpyohan daan ang daan nga map instance
            }

            // Initialize ang map
            currentLeafletMap = L.map('mapContainer').setView([initialLat, initialLng], 15);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }).addTo(currentLeafletMap);

            // Kuhaon ang marker kon naa nay existing coordinates
            if (parseFloat(initialLatInput.value) !== 0 && parseFloat(initialLngInput.value) !== 0) {
                 currentMarker = L.marker([initialLat, initialLng]).addTo(currentLeafletMap);
                 selectedLat = initialLat;
                 selectedLng = initialLng;
                 safeSetText('mapStatus', `Current Location: ${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`);
                 btnSaveMapLocation.disabled = false;
            } else {
                 currentMarker = null;
                 selectedLat = 0;
                 selectedLng = 0;
            }
            
            currentLeafletMap.invalidateSize(); // Ensure it renders correctly

            // Click listener para mo-marka sa location
            currentLeafletMap.on('click', function(e) {
                const { lat, lng } = e.latlng;
                
                // Kuhaon ang daan nga marker
                if (currentMarker) {
                    currentLeafletMap.removeLayer(currentMarker);
                }
                
                // I-butang ang bag-o nga marker
                currentMarker = L.marker([lat, lng]).addTo(currentLeafletMap);
                selectedLat = lat;
                selectedLng = lng;
                
                safeSetText('mapStatus', `Selected: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                btnSaveMapLocation.disabled = false;
            });
            
            // Search function using Server-side Proxy (CRITICAL FIX)
            mapSearchButton.onclick = async () => {
                const query = mapSearchInput.value.trim();
                if (!query) return;
                try {
                    const response = await fetch(`geocode_proxy.php?q=${encodeURIComponent(query)}`);
                    const data = await response.json();
                    
                    if (data && data.length > 0 && data[0].lat && data[0].lon) {
                        const newLat = parseFloat(data[0].lat);
                        const newLng = parseFloat(data[0].lon);
                        currentLeafletMap.setView([newLat, newLng], 16);
                        safeSetText('mapStatus', `Search centered on: ${data[0].display_name}`);
                    } else {
                        safeSetText('mapStatus', 'Location not found.');
                    }
                } catch (error) {
                    console.error('Search error:', error);
                    safeSetText('mapStatus', 'Search failed (Network/Proxy Error).');
                }
            };
            
        }, 100);
    }
    
    // 2. SAVE MAP LOCATION (CRITICAL)
    safeAddEventListener(btnSaveMapLocation, 'click', () => {
        if (selectedLat !== 0 && selectedLng !== 0) {
            
            // I-save ang coordinates sa dynamic hidden fields
            safeSetValue(mapTargetLatId, selectedLat.toFixed(8));
            safeSetValue(mapTargetLngId, selectedLng.toFixed(8));
            
            // I-update ang status sa dynamic target modal
            const targetStatusEl = safeGetElement(mapTargetStatusId);
            safeSetText(targetStatusEl, `Coordinates: ${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`);
            targetStatusEl.classList.remove('hidden');
            
            safeSetDisplay(mapModal, 'none');
        } else {
            alert('Please select a location on the map first.');
        }
    });

    // 3. CLOSE MAP MODAL
    safeAddEventListener('closeMapModal', 'click', () => safeSetDisplay(mapModal, 'none'));
    safeAddEventListener('btnCancelMap', 'click', () => safeSetDisplay(mapModal, 'none'));
    
    // End of New Map Functions

    menuBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            menuBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            sections.forEach(s => s.classList.add('hidden'));
            
            const targetSection = document.getElementById(this.dataset.section);
            if (targetSection) {
                targetSection.classList.remove('hidden');
            }
            
            if (this.dataset.section === 'listings') {
                loadListings();
            }
            
            if (this.dataset.section === 'messages') {
                displayConversations();
                setTimeout(() => {
                    const first = document.querySelector('.conversation-item');
                    if (first && !document.querySelector('.conversation-item.active')) first.click();
                }, 200);
            }
            
            if (this.dataset.section === 'notifications') {
                loadNotifications();
            }

            if (this.dataset.section === 'inquiries') {
                loadInquiries();
            }

            if (this.dataset.section === 'analytics') { 
                 loadAnalytics();
             }
        });
    });

// ... (pagkahuman sa menuBtns.forEach)

// I-DUGANG NI: Para sa tabs (ALL, PENDING, etc.) sa Inquiries page
const inquiryTabs = document.querySelectorAll('#inquiries .tabs .tab');
const inquirySections = document.querySelectorAll('#inquiries .inquiry-list');

inquiryTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetTab = tab.dataset.tab;

        // I-update ang active tab
        inquiryTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        // Ipakita ang saktong section
        inquirySections.forEach(section => {
            if (section.dataset.tab === targetTab) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        });
    });
});

// I-DUGANG NI: Event delegation para sa Approve/Decline buttons
safeAddEventListener('inquirySections', 'click', function(e) {
    if (e.target.classList.contains('btn-approve')) {
        const bookingId = e.target.dataset.id;
        if (confirm('Are you sure you want to approve this booking?')) {
            handleBookingAction(bookingId, 'approve');
        }
    }
    if (e.target.classList.contains('btn-decline')) {
        const bookingId = e.target.dataset.id;
        if (confirm('Are you sure you want to decline this booking?')) {
            handleBookingAction(bookingId, 'decline');
        }
    }
});


    // === MAP LOCATION BUTTON HANDLER (ADD MODAL) ===
    safeAddEventListener('btnLocate', 'click', function(e) {
        e.preventDefault();
        
        // I-set ang current location input value ngadto sa map search input
        const locationInput = safeGetElement('prop-location');
        if (mapSearchInput && locationInput) {
            mapSearchInput.value = locationInput.value.trim();
        }

        openMapModal('prop-lat', 'prop-lng', 'coordStatus'); // Pass targets
    });
    
    // === MAP LOCATION BUTTON HANDLER (EDIT MODAL - NEW) ===
    safeAddEventListener('btnEditLocate', 'click', function(e) {
        e.preventDefault();
        
        // I-set ang current location input value ngadto sa map search input
        const locationInput = safeGetElement('edit-prop-location');
        if (mapSearchInput && locationInput) {
            mapSearchInput.value = locationInput.value.trim();
        }

        openMapModal('edit-prop-lat', 'edit-prop-lng', 'editCoordStatus'); // Pass targets
    });


    // === INITIALIZE DASHBOARD & NOTIFICATIONS ===
    loadNotifications();
    loadDashboardSummary(); // I-load dayon ang stats sa dashboard

    // CRITICAL: Ensure Lucide is called
    if (typeof lucide !== "undefined" && typeof lucide.createIcons === "function") {
        lucide.createIcons();
    }

    // Poll every 30 seconds
    setInterval(() => {
        const activeBtn = document.querySelector('.menu button.active');
        if (activeBtn && ['dashboard', 'notifications'].includes(activeBtn.dataset.section)) {
            console.log('Checking for new notifications...');
            loadNotifications();
        }
        if (activeBtn && activeBtn.dataset.section === 'dashboard') {
            loadDashboardSummary();
        }
    }, 30000);

    // Final/landlord.js (loadDashboardSummary)

    async function loadDashboardSummary() {
        const landlordId = getLandlordId();
        if (!landlordId) return; // Exit kung wala naka-login

        try {
            const response = await fetch('get_landlord_summary.php');
            const data = await response.json();

            if (data.success) {
                const summary = data.summary;

                // 1. I-update ang Top Stats
                safeSetText('stat-total', summary.total_properties);
                safeSetText('stat-available', summary.available_properties);
                safeSetText('stat-occupancy', summary.occupancy_rate);
                safeSetText('stat-occupied', summary.occupied_properties);
                safeSetText('stat-total2', summary.total_properties); // Occupancy denominator
                // FIXED: Gikuha na ang safeSetText('stat-income', ...) nga linya
                safeSetText('stat-inquiries', summary.pending_bookings);
                safeSetText('stat-pending-inquiries', summary.pending_bookings);

                // 2. I-update ang Version Metrics
                safeSetText('v-tenants', summary.total_tenants); 
                safeSetText('v-new-tenants', summary.new_tenants_month); 
                safeSetText('v-rating', `${summary.avg_rating}/5.0`); 
                safeSetText('v-response', `${summary.response_rate}%`); 
                safeSetText('v-messages', summary.new_messages); 
                safeSetText('v-views', summary.todays_views); 
                
                // 3. I-update ang Recent Activity Log (unchanged logic)
                const activityLog = document.querySelector('.activity-log');
                if (activityLog) {
                    const header = activityLog.querySelector('h3');
                    activityLog.innerHTML = ''; // Limpyohan
                    if (header) activityLog.appendChild(header); // Ibalik ang header

                    if (summary.recent_activity.length === 0) {
                        activityLog.innerHTML += '<p style="padding: 10px; color: #555;">No recent activities.</p>';
                    } else {
                        summary.recent_activity.forEach(notif => {
                            const item = createActivityItem(notif); // Gamiton ang existing function
                            item.addEventListener('click', () => handleNotifClick(notif));
                            activityLog.appendChild(item);
                        });
                    }
                }
                
                // 4. I-update ang sidebar badges
                updateBadge(summary.new_messages, 'msgBadge');
                updateBadge(summary.pending_bookings, 'inquiryBadge');

            } else {
                console.error('Failed to load summary:', data.error);
            }

        } catch (error) {
            console.error('Fetch summary error:', error);
        }
    }

    // Load properties via AJAX
    function loadListings() {
        const landlordId = getLandlordId();
        const listingsGrid = safeGetElement('listingsGrid');
        
        if (!listingsGrid) { return; }
        if (!landlordId) {
            safeSetHTML(listingsGrid, '<p>Please log in to view properties.</p>');
            return;
        }

        // Gi-usab ang parameter ngadto sa 'landlord_id' aron ma-filter sa get_all_properties.php
        fetch(`get_all_properties.php?landlord_id=${landlordId}`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    displayListings(data.properties);
                } else {
                    console.error('Error loading listings:', data.error);
                    safeSetHTML(listingsGrid, '<p>No properties found or error loading.</p>');
                }
            })
            .catch(error => {
                console.error('Fetch error:', error);
                safeSetHTML(listingsGrid, '<p>Error loading properties.</p>');
            });
    }

    // ===============================================================
    // ==  BAG-O NGA FUNCTIONS PARA SA INQUIRIES
    // ===============================================================

    let allBookings = []; // I-save ang data para sa filtering

    async function loadInquiries() {
        const inquirySections = safeGetElement('inquirySections');
        if (!inquirySections) {
            console.warn('Inquiry section not found');
            return;
        }

        try {
            const response = await fetch('get_landlord_inquiries.php');
            const data = await response.json();

            if (data.success) {
                allBookings = data.bookings;
                displayInquiries('all'); // Ipakita daan tanan
            } else {
                inquirySections.innerHTML = `<p style="color: red; padding: 10px;">Error: ${data.error}</p>`;
            }
        } catch (error) {
            console.error('Fetch inquiries error:', error);
            inquirySections.innerHTML = `<p style="color: red; padding: 10px;">Network Error: ${error.message}</p>`;
        }
    }

    function displayInquiries(filterStatus) {
        const allList = safeGetElement('inquirySections').querySelector('[data-tab="all"]');
        const pendingList = safeGetElement('inquirySections').querySelector('[data-tab="pending"]');
        const confirmedList = safeGetElement('inquirySections').querySelector('[data-tab="confirmed"]');
        const declinedList = safeGetElement('inquirySections').querySelector('[data-tab="declined"]');

        // Limpyohan daan tanan lists
        allList.innerHTML = '';
        pendingList.innerHTML = '';
        confirmedList.innerHTML = '';
        declinedList.innerHTML = '';

        if (allBookings.length === 0) {
            allList.innerHTML = '<p style="padding: 10px; color: #555;">No booking requests found.</p>';
            return;
        }

        let count = 0;
        allBookings.forEach(booking => {
            const card = createInquiryCard(booking);
            
            // Ibutang sa saktong list
            if (booking.status === 'pending') {
                pendingList.appendChild(card.cloneNode(true));
            } else if (booking.status === 'confirmed') {
                confirmedList.appendChild(card.cloneNode(true));
            } else if (booking.status === 'declined') {
                declinedList.appendChild(card.cloneNode(true));
            }
            allList.appendChild(card); // Ibutang tanan sa "ALL"
            count++;
        });

        if (count === 0) {
             allList.innerHTML = '<p style="padding: 10px; color: #555;">No booking requests found.</p>';
        }
        
        // Ensure sub-lists show a message if empty
        if (pendingList.children.length === 0) pendingList.innerHTML = '<p style="padding: 10px; color: #555;">No pending requests.</p>';
        if (confirmedList.children.length === 0) confirmedList.innerHTML = '<p style="padding: 10px; color: #555;">No confirmed bookings.</p>';
        if (declinedList.children.length === 0) declinedList.innerHTML = '<p style="padding: 10px; color: #555;">No declined requests.</p>';
    }

    function createInquiryCard(booking) {
        const card = document.createElement('div');
        card.className = `card inquiry-card status-${booking.status}`;
        
        let actionsHtml = '';
        if (booking.status === 'pending') {
            actionsHtml = `
                <button class="btn green btn-approve" data-id="${booking.booking_id}">Approve</button>
                <button class="btn red btn-decline" data-id="${booking.booking_id}">Decline</button>
            `;
        }

        card.innerHTML = `
            <h4>${escapeHtml(booking.tenant_name)}</h4>
            <p><strong>Property:</strong> ${escapeHtml(booking.property_title)}</p>
            <p><strong>Status:</strong> <span class_name="status-text">${escapeHtml(booking.status)}</span></p>
            <small>Requested on: ${new Date(booking.created_at).toLocaleString()}</small>
            <div class="modal-actions" style="justify-content: flex-start; margin-top: 10px;">
                ${actionsHtml}
            </div>
        `;
        return card;
    }

    async function handleBookingAction(bookingId, action) {
        const endpoint = action === 'approve' ? 'approve_booking.php' : 'decline_booking.php';
        
        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ booking_id: bookingId })
            });

            const data = await response.json();
            
            if (data.success) {
                alert(data.message);
                loadInquiries(); // I-refresh ang list
                loadDashboardSummary(); // I-refresh ang dashboard stats
            } else {
                alert(`Error: ${data.error || 'Failed to process request'}`);
            }
        } catch (error) {
            console.error('Booking action error:', error);
            alert(`Network Error: ${error.message}`);
        }
    }
    // Display properties in grid
    function displayListings(properties) {
        const grid = document.getElementById('listingsGrid');
        if (!grid) return;
        grid.innerHTML = '';

        if (!properties || properties.length === 0) {
            grid.innerHTML = '<p>No properties added yet.</p>';
            document.getElementById('btnAddFromGrid')?.addEventListener('click', () => {
                safeSetDisplay('modalAdd', 'flex');
            });
            return;
        }

        properties.forEach(prop => {
            const card = createListingCard(prop);
            grid.appendChild(card);
        });
    }

    // Create a single listing card
    function createListingCard(prop) {
        const div = document.createElement('div');
        div.className = 'listing-card';

        const statusMap = {
            'available': 'Available Now', 'rented': 'Rented', 'maintenance': 'Maintenance'
        };
        const displayStatus = statusMap[prop.status] || prop.status;
        const statusClass = prop.status || 'available';
        // Ang photos na full URL na ni gikan sa get_all_properties.php
        const photos = Array.isArray(prop.photos) ? prop.photos : [];
        const firstPhoto = photos.length > 0 
            ? photos[0] 
            : 'https://placehold.co/300x200/gray/white?text=No+Image';

        // Gikorektar ang pagkuha sa property ID (naa sa 'property_id' or 'id')
        const propertyId = prop.property_id || prop.id;

        div.innerHTML = `
            <img src="${firstPhoto}" 
                alt="${escapeHtml(prop.title || 'Property')}" 
                class="listing-photo" 
                style="width:100%; height:200px; object-fit:cover; border-radius:8px;">
            <h3 class="mt-2 text-lg font-semibold">${escapeHtml(prop.title || 'Untitled')}</h3>
            <p class="text-sm text-gray-600">
                ${prop.bedrooms || ' '} Bed | ${prop.bathrooms || ' '} Bath
            </p>
            <p class="text-lg font-bold text-green-600">₱${Number(prop.price || 0).toLocaleString()}/mo</p>
            <p class="text-sm text-gray-500 line-clamp-2">
                ${prop.description ? escapeHtml(prop.description.substring(0, 100)) + '...' : 'No description'}
            </p>
            <span class="status ${statusClass}">${displayStatus}</span>
            <div class="actions mt-3 flex gap-2">
                <button class="btn-edit" data-id="${propertyId}">Edit</button>
                <button class="btn-delete" data-id="${propertyId}">Delete</button>
            </div>
        `;

        const editBtn = div.querySelector('.btn-edit');
        const deleteBtn = div.querySelector('.btn-delete');
        
        if (editBtn) {
            editBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const propertyId = e.target.dataset.id;
                window.editProperty(propertyId, e);
            });
        }
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const propertyId = e.target.dataset.id;
                window.deleteProperty(propertyId, e);
            });
        }
        return div;
    }

    // Final/landlord.js (window.editProperty)

    // Edit Property function (CRITICAL AMENITIES FIX + MAP COORDS FIX)
    window.editProperty = function(id, event) {
        if (event) event.stopPropagation();
        if (!id) { alert('Invalid property ID'); return; }
        console.log('Editing property ID:', id);

        fetch(`get_all_properties.php?property_id=${id}`)
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (data.success && data.property) {
                    const property = data.property;
                    
                    safeSetValue('edit-prop-id', property.property_id || property.id || ''); 
                    safeSetValue('edit-prop-title', property.title || '');
                    safeSetValue('edit-prop-location', property.location || '');
                    safeSetValue('edit-prop-type', property.property_type ? property.property_type.toLowerCase() : 'apartment'); 
                    safeSetValue('edit-prop-bedrooms', property.bedrooms || '');
                    safeSetValue('edit-prop-bathrooms', property.bathrooms || ''); 
                    safeSetValue('edit-prop-price', property.price || '');
                    safeSetValue('edit-prop-desc', property.description || '');
                    safeSetValue('edit-prop-status', property.status || 'available');
                    
                    // NEW/FIX: Set Coordinates for eventual update
                    const lat = property.latitude || 0;
                    const lng = property.longitude || 0;
                    
                    safeSetValue('edit-prop-lat', lat); 
                    safeSetValue('edit-prop-lng', lng); 
                    
                    // NEW/FIX: Set and show coordinate status
                    const editCoordStatusEl = safeGetElement('editCoordStatus');
                    if (editCoordStatusEl && (lat !== 0 || lng !== 0)) {
                        safeSetText(editCoordStatusEl, `Coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                        editCoordStatusEl.classList.remove('hidden');
                    } else if (editCoordStatusEl) {
                        safeSetText(editCoordStatusEl, 'Coordinates: N/A (Please locate)');
                        editCoordStatusEl.classList.add('hidden');
                    }
                    
                    let amenitiesString = '';
                    if (property.amenities) {
                        if (Array.isArray(property.amenities)) {
                            amenitiesString = property.amenities.join(', ');
                        } else if (typeof property.amenities === 'string') {
                            amenitiesString = property.amenities;
                        }
                    }
                    
                    safeSetValue('edit-prop-amenities', amenitiesString);
                    
                    const photoPreviews = safeGetElement('edit-photoPreviews');
                    if (photoPreviews) {
                        photoPreviews.innerHTML = '';
                        if (property.photos && property.photos.length > 0) {
                            property.photos.forEach(photo => {
                                const img = document.createElement('img');
                                img.src = photo;
                                Object.assign(img.style, { 
                                    width: '100px', height: '100px', objectFit: 'cover',
                                    margin: '5px', borderRadius: '8px'
                                });
                                photoPreviews.appendChild(img);
                            });
                        } else {
                            safeSetHTML(photoPreviews, '<p class="text-gray-500 text-sm">No photos available</p>');
                        }
                    }
                    safeSetDisplay('modalEdit', 'flex');
                } else {
                    alert('Error loading property data: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(error => {
                console.error('Edit error:', error);
                alert('Error loading property data. Please check if the property exists.');
            });
    };

    // Delete Property function
    window.deleteProperty = function(id, event) {
        if (event) event.stopPropagation();
        if (confirm('Are you sure you want to delete this property?')) {
            console.log('🔄 Starting delete for property ID:', id);
            
            const button = event?.target || document.querySelector(`[onclick*="deleteProperty(${id})"]`);
            const originalText = button?.textContent || 'Delete';
            
            if (button) {
                button.textContent = 'Deleting...';
                button.disabled = true;
            }

            const landlordId = getLandlordId();
            if (!landlordId) { alert('Error: Could not verify landlord.'); return; }

            fetch('delete_property.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ property_id: id, landlord_id: landlordId }) 
            })
            .then(response => {
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    alert('✅ Property deleted successfully!');
                    loadListings();
                } else {
                    alert('❌ Error: ' + (data.error || 'Failed to delete property'));
                }
            })
            .catch(error => {
                console.error('💥 Delete error:', error);
                alert('❌ Error: ' + error.message);
            })
            .finally(() => {
                if (button) {
                    button.textContent = originalText;
                    button.disabled = false;
                }
            });
        }
    };

    // Edit Modal Handling
    safeAddEventListener('closeEditModal', 'click', () => safeSetDisplay('modalEdit', 'none'));
    safeAddEventListener('btnCancelEdit', 'click', () => safeSetDisplay('modalEdit', 'none'));

   // Final/landlord.js (btnSaveEdit Event Listener)

    safeAddEventListener('btnSaveEdit', 'click', function() {
        const formData = new FormData();
        const propertyId = safeGetElement('edit-prop-id').value;
        
        const propLocation = safeGetElement('edit-prop-location')?.value; 

        if (!propLocation) {
            alert('Location is required!');
            return;
        }
        if (!safeGetElement('edit-prop-title').value.trim()) {
            alert('Title is required!');
            return;
        }

        formData.append('property_id', propertyId);
        formData.append('prop-title', safeGetElement('edit-prop-title').value);
        formData.append('prop-location', propLocation); 
        
        // FIX #2: Ipadala ang Property Type, Bedrooms, ug Bathrooms
        formData.append('prop-type', safeGetElement('edit-prop-type').value); // NEW: Send Property Type
        formData.append('prop-bedrooms', safeGetElement('edit-prop-bedrooms').value);
        formData.append('prop-bathrooms', safeGetElement('edit-prop-bathrooms').value); // NEW: Send Bathrooms
        formData.append('prop-lat', safeGetElement('edit-prop-lat').value); // NEW: Send Latitude
        formData.append('prop-lng', safeGetElement('edit-prop-lng').value); // NEW: Send Longitude
        
        formData.append('prop-price', safeGetElement('edit-prop-price').value);
        formData.append('prop-desc', safeGetElement('edit-prop-desc').value);
        
        // CRITICAL FIX: Kuhaon ang comma-separated value sa text field
        const amenitiesValue = safeGetElement('edit-prop-amenities').value;
        formData.append('amenities', amenitiesValue);
        
        const dbStatus = safeGetElement('edit-prop-status').value;
        const uiStatus = dbStatus === 'available' ? 'Available Now' : (dbStatus === 'rented' ? 'Currently Occupied' : 'Coming Soon');
        formData.append('prop-status', uiStatus);
        
        // Gikuha ang Checkbox logic
        
        const photoFiles = safeGetElement('edit-prop-photos').files;
        for (let i = 0; i < photoFiles.length; i++) {
            formData.append('prop-photos[]', photoFiles[i]);
        }
        
        const saveBtn = this;
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        fetch('update_property.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                alert('Property updated successfully!');
                safeSetDisplay('modalEdit', 'none');
                loadListings();
            } else {
                alert('Error: ' + (data.error || 'Failed to update property'));
            }
        })
        .catch(error => {
            console.error('Update error:', error);
            alert('Error updating property: ' + error.message);
        })
        .finally(() => {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        });
    });

    // Add Modal Handling
    safeAddEventListener('btnAddListing', 'click', (e) => {
        e.stopPropagation();
        safeSetDisplay('modalAdd', 'flex');
        resetAddModal();
    });

    safeAddEventListener('closeModalX', 'click', () => safeSetDisplay('modalAdd', 'none'));
    
    // safeAddEventListener('btnCancelModal', 'click', () => safeSetDisplay('modalAdd', 'none')); 

    let currentStep = 1;
    const steps = document.querySelectorAll('.step');

    safeAddEventListener('nextStep', 'click', () => goToStep(2));
    safeAddEventListener('nextStep2', 'click', () => goToStep(3));
    safeAddEventListener('prevStep', 'click', () => goToStep(1)); 
    safeAddEventListener('prevStep2', 'click', () => goToStep(2)); 

    function goToStep(stepNum) {
        steps.forEach((step, index) => {
            if (step) step.classList.toggle('step-active', index + 1 === stepNum);
        });
        currentStep = stepNum;
    }

    // Photo Upload
    const photoInput = safeGetElement('prop-photos');
    const photoPreviews = safeGetElement('photoPreviews');

    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            const validFiles = files.slice(0, 3); 
            if (photoPreviews) photoPreviews.innerHTML = '';

            if (files.length > 3) {
                alert('Maximum 3 photos allowed. Only the first 3 will be uploaded.');
            }

            if (validFiles.length === 0) {
                safeSetHTML(photoPreviews, '<p class="text-gray-500 text-sm">No photos selected (optional)</p>');
                return;
            }

            validFiles.forEach(file => {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    const img = document.createElement('img');
                    img.src = ev.target.result;
                    img.alt = 'Property preview';
                    photoPreviews.appendChild(img);
                };
                reader.readAsDataURL(file);
            });

            const dataTransfer = new DataTransfer();
            validFiles.forEach(f => dataTransfer.items.add(f));
            photoInput.files = dataTransfer.files;
        });
    }

    // Save New Listing
    safeAddEventListener('btnSaveListing', 'click', function () {
        const title = safeGetElement('prop-title').value.trim();
        const location = safeGetElement('prop-location').value.trim();
        const price = safeGetElement('prop-price').value;
        const bedrooms = safeGetElement('prop-bedrooms').value;
        const desc = safeGetElement('prop-desc').value;
        const status = safeGetElement('prop-status').value;
        const amenities = safeGetElement('prop-amenities').value;
        const lat = safeGetElement('prop-lat').value;
        const lng = safeGetElement('prop-lng').value;


        if (!title || !location || !price || !bedrooms) {
            alert('Please fill in all required fields: Title, Location, Price, Bedrooms');
            return;
        }
        
        if (parseFloat(lat) === 0 || parseFloat(lng) === 0) {
             alert('Please use the "Locate" button to set the property coordinates on the map.');
             return;
        }

        const formData = new FormData();
        formData.append('prop-title', title);
        formData.append('prop-location', location);
        formData.append('prop-price', price);
        formData.append('prop-bedrooms', bedrooms);
        formData.append('prop-desc', desc);
        formData.append('prop-status', status);
        formData.append('amenities', amenities);
        formData.append('prop-lat', lat);
        formData.append('prop-lng', lng);


        const photoFiles = safeGetElement('prop-photos').files;
        for (let i = 0; i < photoFiles.length; i++) {
            formData.append('prop-photos[]', photoFiles[i]);
        }

        const saveBtn = this;
        const oldText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        fetch('add_property.php', {
            method: 'POST',
            body: formData
        })
            .then(r => r.json())
            .then(data => {
                if (data.success) {
                    alert(data.message || 'Property added successfully!');
                    safeSetDisplay('modalAdd', 'none');
                    resetAddModal();
                    loadListings();
                } else {
                    alert('Error: ' + (data.error || 'Unknown error'));
                }
            })
            .catch(err => {
                console.error(err);
                alert('Network error. Please try again.');
            })
            .finally(() => {
                saveBtn.disabled = false;
                saveBtn.textContent = oldText;
            });
    });

    function resetAddModal() {
        safeSetValue('prop-title', '');
        safeSetValue('prop-location', '');
        safeSetValue('prop-bedrooms', '2');
        safeSetValue('prop-price', '800');
        safeSetValue('prop-desc', '');
        safeSetValue('prop-status', 'Available Now');
        safeSetValue('prop-amenities', '');
        safeSetValue('prop-photos', '');
        
        safeSetValue('prop-lat', '0');
        safeSetValue('prop-lng', '0');
        safeSetDisplay(safeGetElement('coordStatus'), 'hidden'); // Tago-on ang status
        
        safeSetHTML('photoPreviews', '<p class="text-gray-500 text-sm">No photos selected (optional)</p>');
        goToStep(1);
    }
    
    // ===== NOTIFICATIONS =====
    async function loadNotifications() {
        const notifList = document.getElementById('notifList');
        if (!notifList) return; // Exit kung wala sa page

        const landlordId = getLandlordId();
        if (!landlordId) { return; }

        try {
            const response = await fetch(`notifications.php?user_id=${landlordId}`);
            if (!response.ok) {
                updateBadge(0, 'notifBadge');
                return;
            }
            const data = await response.json();

            if (!data.success || !data.notifications || data.notifications.length === 0) {
                updateBadge(0, 'notifBadge');
                clearActivityAndList(); // Naa na ni sa loadDashboardSummary
                return;
            }

            const unreadCount = data.unread_count || 0;
            updateBadge(unreadCount, 'notifBadge');

            // I-update ang dynamic badge sa notification page
            const dynamicBadge = safeGetElement('notifBadgeDynamic');
            if (dynamicBadge) dynamicBadge.textContent = `${unreadCount} unread`;

            notifList.innerHTML = ''; // Limpyohan daan
            data.notifications.slice(0, 10).forEach(notif => {
                const card = createNotifCard(notif);
                card.addEventListener('click', () => handleNotifClick(notif));
                notifList.appendChild(card);
            });

        } catch (error) {
            console.warn('Failed to load notifications:', error);
            updateBadge(0, 'notifBadge');
        }
    }

    // Gi-update para modawat ug ID
    function updateBadge(count, badgeId) {
        const badge = document.getElementById(badgeId);
        if (!badge) return;
        badge.textContent = count > 0 ? `${count}` : '0';
        badge.style.display = count > 0 ? 'inline' : 'none';
    }

    // Gi-updated para dili i-delete ang header
    function clearActivityAndList() {
        const activityLog = document.querySelector('.activity-log');
        const notifList = document.getElementById('notifList');
        
        if (activityLog) {
            const header = activityLog.querySelector('h3');
            activityLog.innerHTML = '';
            if (header) activityLog.appendChild(header);
            activityLog.innerHTML += '<p style="padding: 10px; color: #555;">No recent activities.</p>';
        }
        if (notifList) {
            notifList.innerHTML = '<p style="padding: 10px; color: #555;">No notifications yet.</p>';
        }
    }

    function createActivityItem(notif) {
        const div = document.createElement('div');
        const isRead = notif.is_read == 1; // Kuhaon ang read status
        let icon = '🔔'; 
        let styleClass = ''; 

        if (notif.type === 'message') { 
            icon = '💬'; 
            styleClass = 'blue'; 
        } else if (notif.type === 'booking') { 
            icon = '🏠'; 
            styleClass = 'green'; 
        } else {
            icon = '🔄'; // Gamiton ang laing icon para sa uban
            styleClass = 'orange'; 
        }
        
        // DIRI ANG BAG-O NGA LOGIC: I-set ang styleClass ngadto sa 'gray' kung nabasa na
        if (isRead) {
            styleClass = 'gray'; 
        }

        div.className = `activity ${styleClass}`;
        // Wala na ta nag-set og inline style color, ang CSS na ang bahala sa contrast.

        div.innerHTML = `
            <i class="icon">${icon}</i>
            <p>${escapeHtml(notif.description)}</p>
            <small style="color: #6c757d;">${new Date(notif.created_at).toLocaleTimeString()}</small>
        `; // Nagdugang ko'g timestamp
        
        div.setAttribute('role', 'button');
        return div;
    }

    function createNotifCard(notif) {
        const isRead = notif.is_read == 1;
        let icon = 'bell';
        let color = 'blue';
        let priority = 'medium';
        if (notif.type === 'message') { icon = 'mail'; color = 'blue'; priority = 'medium'; }
        if (notif.type === 'booking') { icon = 'home'; color = 'green'; priority = 'high'; }

        const card = document.createElement('div');
        card.className = `notif-card ${isRead ? '' : priority}`;
        card.style.opacity = isRead ? 0.7 : 1;
        card.innerHTML = `
            <div class="notif-icon ${color}">${icon === 'bell' ? '🔔' : (icon === 'mail' ? 'Mail' : '🏠')}</div>
            <div class="notif-content">
            <h4>${escapeHtml(notif.title)}
                <span class="priority ${priority}">
                ${priority}
                </span>
            </h4>
            <p>${escapeHtml(notif.description)}</p>
            <span class="time">${new Date(notif.created_at).toLocaleString()}</span>
            </div>
        `;
        if (!isRead) {
            card.setAttribute('role', 'button');
        }
        return card;
    }

    function handleNotifClick(notif) {
        if (notif.is_read == 1) return; // Ayaw na i-mark read kung read na
        
        markNotificationRead(notif.id);
        if (notif.type === 'message') {
            const msgBtn = document.querySelector('.menu button[data-section="messages"]');
            if (msgBtn) msgBtn.click();
        }
    }

    async function markNotificationRead(id) {
        const landlordId = getLandlordId();
        if (!landlordId) return;

        try {
            const response = await fetch(`mark_read.php?id=${id}&user_id=${landlordId}`, { method: 'POST' });
            const data = await response.json();
            if (data.success) {
                loadNotifications(); // I-refresh ang list
            }
        } catch (error) {
            console.error('Mark read error:', error);
        }
    }

    if (Notification.permission !== 'granted') {
        Notification.requestPermission();
    }

    // ===== MESSAGES (DATABASE-RELIANT) =====
    
    // GIKUHA ANG 'initialChats'
    let chats = {};
    let currentChat = null;
    const landlordId = getLandlordId();

    const chatTitle = document.getElementById("chatTitle");
    const chatSubtitle = document.getElementById("chatSubtitle");
    const chatAvatar = document.getElementById("chatAvatar");
    const messageHistory = document.getElementById("messageHistory");
    const messageInput = document.getElementById("messageInput");
    const sendMessageBtn = document.getElementById("sendMessageBtn");

    function getColor(name) {
        if (!name || typeof name !== 'string') return 'bg-gray-500';
        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
        return colors[name.length % colors.length];
    }

    function getInitials(name) {
        if (!name || typeof name !== 'string') return '?';
        return name.split(' ').map(word => word[0]).join('').slice(0, 2).toUpperCase();
    }

    async function loadChats() {
        if (!landlordId) {
            console.warn('No landlordId set - cannot load chats.');
            chats = {};
            return;
        }

        try {
            const response = await fetch(`get_landlord_messages.php?landlord_id=${landlordId}`);
            
            if (!response.ok) {
                console.log('Messages endpoint not available.');
                chats = {};
                return;
            }
            
            const data = await response.json();
            if (data.success && data.messages && data.messages.length > 0) {
                const grouped = {};
                data.messages.forEach(msg => {
                    const tid = msg.receiver_id.toString(); 
                    if (!grouped[tid]) grouped[tid] = [];
                    grouped[tid].push(msg);
                });

                chats = {};
                Object.keys(grouped).forEach(tid => {
                    const msgs = grouped[tid].sort((a, b) => new Date(a.sent_at) - new Date(b.sent_at));
                    
                    // FIX: Kuhaon ang Tenant Name ug Property Title gikan sa unang message sa thread
                    const msgSample = msgs[0];
                    const tenantName = msgSample.tenant_name || 'Unknown Tenant';
                    const propertyTitle = msgSample.property_title || 'General Inquiry';
                    let title = tenantName; // Tenant Name
                    
                    chats[tid] = {
                        title: title, // Kani ang Tenant Name
                        subtitle: propertyTitle, // Kani ang Property Name
                        tenant: tenantName,
                        color: getColor(tenantName),
                        initials: getInitials(tenantName),
                        messages: msgs.map(m => {
                            let text = m.message_text;
                            let from = "tenant";
                            if (text.startsWith("You: ")) { 
                                from = "landlord";
                                text = text.substring(5);
                            }
                            return {
                                from: from,
                                text: text,
                                time: new Date(m.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                                created_at: m.sent_at,
                                read: m.is_read == 1
                            };
                        })
                    };
                });
            } else {
                chats = {}; 
                console.log('No messages found from database.');
            }
        } catch (error) {
            console.log('Failed to load chats:', error.message);
            chats = {};
        }
    }

    async function displayConversations() {
        await loadChats(); 

        const list = document.getElementById('conversationList');
        if (!list) {
            console.warn('No conversations list found');
            return;
        }
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
            const unreadCount = chat.messages.filter(m => m.from === 'tenant' && !m.read).length;
            const unread = unreadCount > 0;
            
            item.innerHTML = `
            <div class="flex items-center justify-between w-full">
                <div class="flex items-center">
                <div class="conversation-avatar ${chat.color}">${chat.initials}</div>
                <div class="flex-1 min-w-0">
                    <strong class="block text-sm font-medium text-gray-900 truncate">${chat.tenant}</strong>
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
        const conversationItems = document.querySelectorAll(".conversation-item");
        if (conversationItems.length === 0) {
            return;
        }

        conversationItems.forEach(item => {
            item.addEventListener("click", async () => {
                document.querySelectorAll(".conversation-item").forEach(i => {
                    if (i && i.classList) i.classList.remove("active", "bg-blue-50");
                });
                
                if (item && item.classList) item.classList.add("active", "bg-blue-50");
                
                const chatKey = item.dataset?.chat; 
                if (!chatKey) return;
                
                currentChat = chatKey; 
                const chatData = chats[chatKey];
                if (!chatData) return;

                // FIX #5: Display Tenant Name (sa taas) / Property Name (sa ubos)
                safeSetText(chatTitle, chatData.tenant); // Tenant Name
                safeSetText(chatSubtitle, `Property: ${chatData.subtitle}`); // Property Name
                
                if (chatAvatar && 'className' in chatAvatar && 'textContent' in chatAvatar) {
                    chatAvatar.textContent = chatData.initials;
                   chatAvatar.className = `chat-avatar ${chatData.color} text-white font-semibold`;
                }

                const messageHistory = safeGetElement('messageHistory');
                if (messageHistory) {
                    messageHistory.innerHTML = ""; 
                    if(chatData.messages.length === 0) {
                         messageHistory.innerHTML = '<div class="empty-chat" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6b7280;"><div class="empty-icon" style="font-size: 3rem; margin-bottom: 1rem;">💬</div><p>No messages yet. Start the conversation!</p></div>';
                    } else {
                        chatData.messages.forEach(msg => {
                            const div = document.createElement("div");
                            div.classList.add("message", "mb-2");
                            
                            // === CRITICAL ALIGNMENT FIX IN JS (Landlord Side) ===
                            const isLandlord = msg.from === "landlord";
                            
                            // 1. Apply Alignment Class (CSS/Tailwind)
                            div.classList.add(isLandlord ? "sent" : "received");
                            
                            // 2. Apply Message Bubble Style (Inline CSS for maximum enforcement)
                            // Landlord Message (Sent) - RIGHT (Light Blue)
                            const sentStyle = 'background-color: #eff6ff; color: #1f2937; border: 1px solid #cce5ff; border-bottom-right-radius: 4px; margin-left: auto; max-width: 85%;';
                            // Tenant Message (Received) - LEFT (White)
                            const receivedStyle = 'background-color: white; color: #1f2937; border: 1px solid #e5e7eb; border-bottom-left-radius: 4px; margin-right: auto; max-width: 85%;';

                            const bubbleStyle = isLandlord ? sentStyle : receivedStyle;
                            
                            // 3. Apply Bubble Style to the bubble div
                            div.innerHTML = `
                                <div class="message-bubble" style="${bubbleStyle}">
                                    <p>${escapeHtml(msg.text)}</p>
                                </div>
                                <span class="message-time">${msg.time}</span>
                            `;
                            // === END CRITICAL ALIGNMENT FIX ===
                            
                            messageHistory.appendChild(div);
                        });
                    }
                    messageHistory.scrollTop = messageHistory.scrollHeight;
                }

                const chatWindow = document.getElementById('chatWindow');
                if (chatWindow) {
                    chatWindow.classList.remove('hidden');
                }
                const chatInput = document.getElementById('chatInputContainer');
                if (chatInput) {
                    chatInput.classList.remove('hidden');
                }
            });
        });
    }

    safeAddEventListener(sendMessageBtn, "click", sendMessage);
    safeAddEventListener(messageInput, "keypress", e => {
        if (e.key === "Enter") sendMessage();
    });

   // Final/landlord.js (loadAnalytics)

    async function loadAnalytics() {
        const kpiContainer = document.getElementById('analyticsKpis');
        if (!kpiContainer) {
            console.warn('Analytics KPI container not found.');
            return;
        }

        try {
            const response = await fetch('get_landlord_summary.php');
            const data = await response.json();

            if (data.success) {
                const summary = data.summary;

                safeSetText('kpi-occupancy', summary.occupancy_rate);
                safeSetText('kpi-pending', summary.pending_bookings);
                safeSetText('kpi-tenants', summary.total_tenants);
                
            } else {
                console.error('Failed to load analytics:', data.error);
                safeSetHTML(kpiContainer, '<p class="text-red-500 p-4">Error loading analytics data.</p>');
            }
        } catch (error) {
            console.error('Fetch analytics error:', error);
            safeSetHTML(kpiContainer, '<p class="text-red-500 p-4">Network error loading analytics data.</p>');
        }
    } 

    async function sendMessage() {
        if (!messageInput || !messageHistory) return;
        const msgText = messageInput.value.trim();
        if (!msgText || !currentChat) return;

        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        if (messageHistory.querySelector('.empty-chat')) {
            messageHistory.innerHTML = '';
        }

        const msgDiv = document.createElement("div");
        msgDiv.classList.add("message", "sent", "text-right", "mb-2");
        
        // Gigamit na ang styling gikan sa landlord.css
        msgDiv.innerHTML = `
            <div class="message-bubble">
                <p>${escapeHtml(msgText)}</p>
            </div>
            <span class="message-time">${timeStr}</span>
        `;
        
        messageHistory.appendChild(msgDiv);
        messageInput.value = "";
        messageHistory.scrollTop = messageHistory.scrollHeight;

        if (!landlordId) {
             alert('Error: Landlord ID not found. Cannot send message.');
             msgDiv.remove(); 
             return;
        }

        const formData = new FormData();
        formData.append('landlord_id', landlordId);
        formData.append('tenant_id', currentChat); 
        formData.append('message', msgText); 
        formData.append('sent_by', 'landlord'); 
        // Wala nay 'name' ug 'email' nga gi-send.

        try {
            const response = await fetch('send_message.php', { method: 'POST', body: formData });
            const data = await response.json();
            if (data.success) {
                // I-refresh ang chat ug i-click ang active conversation aron ma-update ang history
                await displayConversations();
                const activeItem = document.querySelector(`.conversation-item[data-chat="${currentChat}"]`);
                if (activeItem) {
                    activeItem.click(); 
                }
            } else {
                alert('Error: ' + (data.error || 'Failed to send message'));
                msgDiv.remove();
            }
        } catch (error) {
            console.error('Send message error:', error);
            alert('Network error: ' + error.message);
            msgDiv.remove();
        }
    }

    // Search
    safeAddEventListener("searchInput", "input", e => {
        const term = e.target.value.toLowerCase();
        document.querySelectorAll(".conversation-item").forEach(item => {
            const tenant = item.querySelector("strong")?.textContent.toLowerCase() || '';
            const preview = item.querySelector("span.text-xs.text-gray-500")?.textContent.toLowerCase() || '';
            item.style.display = (tenant.includes(term) || preview.includes(term)) ? "flex" : "none";
        });
    });

    // Initialize messages if on messages page
    const messagesPage = document.getElementById('messages');
    if (messagesPage && !messagesPage.classList.contains('hidden')) {
        displayConversations();
        setTimeout(() => {
            const first = document.querySelector('.conversation-item');
            if (first && !document.querySelector('.conversation-item.active')) first.click();
        }, 200);
    }
    
    // ===== LOGOUT MODAL =====
    const modalLogout = document.getElementById('modalLogout');

    safeAddEventListener('btnLogout', 'click', function openLogout(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        console.log('Logout button → show modal (Landlord ID:', getLandlordId(), ')');
        if (!modalLogout) return;
        modalLogout.style.cssText = `display: flex !important; visibility: visible !important; opacity: 1 !important; z-index: 9999 !important; position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important;`;
        safeSetDisplay('modalAdd', 'none');
    });

    safeAddEventListener('closeLogoutModal', 'click', () => safeSetDisplay(modalLogout, 'none'));
    safeAddEventListener('btnCancelLogout', 'click', () => safeSetDisplay(modalLogout, 'none'));
    safeAddEventListener('btnConfirmLogout', 'click', () => window.location.href = 'logout.php');
    
    if(modalLogout) {
        modalLogout.addEventListener('click', e => {
            if (e.target === modalLogout) safeSetDisplay(modalLogout, 'none');
        });
    }
    
    // Call reset on initial load
    resetAddModal();
});