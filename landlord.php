<?php
session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'landlord') {
    header("Location: login.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Landlord Dashboard - TLIMS</title>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest"></script>
<link rel="stylesheet" href="tenant.css"> <link rel="stylesheet" href="landlord.css"> <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />

<style>
    /* Minimal modal styles for compatibility */
    .modal {
      display: none; position: fixed; top: 0; left: 0;
      width: 100%; height: 100%; background: rgba(0, 0, 0, 0.5);
      justify-content: center; align-items: center; z-index: 1000;
    }
    .modal-content {
      background: white; padding: 20px; border-radius: 8px;
      width: 90%; max-width: 400px; position: relative;
    }
    .modal-content h3 { margin-top: 0; }
    .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
    .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; }
    .btn.green { background: #28a745; color: white; }
    .btn.red { background: #dc3545; color: white; }
    .btn:hover { opacity: 0.9; }
    .close-modal {
      position: absolute; top: 10px; right: 15px;
      font-size: 18px; font-weight: bold; cursor: pointer;
    }
    /* Quick CSS to hide Font Awesome Icons as we migrate */
    .menu button i.fas { display: none; }
    
    /* NEW MAP STYLES */
    #mapContainer { 
        height: 300px; 
        width: 100%; 
        border-radius: 8px; 
        margin-top: 10px;
    }
    
    /* Leaflet map MUST have height */
    #mapModal .modal-content {
        max-width: 800px !important;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
    }
    
    /* FIX: I-taas ang z-index aron mag-una sa Edit Modal (z-index: 1000) */
    #mapModal {
        z-index: 1001 !important; 
    }
</style>

</head>

<body>
<div class="sidebar" id="sidebar">
    <div class="sidebar-header border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div class="logo-block flex items-center gap-2"> 
            <div class="logo-circle w-8 h-8 bg-blue-600 text-white rounded-full flex justify-center items-center font-bold text-base min-w-8">T</div>
            <div class="title-block">
                <h2 class="text-gray-800 text-base font-bold m-0">TLIMS</h2> 
                <p class="text-xs text-gray-500 mt-0 font-medium">Landlord Portal</p>
            </div>
        </div>
        <button class="menu-toggle" id="menuToggle" aria-label="Toggle Menu" style="display:none;"><i data-lucide="menu"></i></button>
    </div>

   

  <nav class="menu">
    <button data-section="dashboard" class="active">
      <i data-lucide="home" class="w-5 h-5"></i> Dashboard
    </button>
    <button data-section="listings">
      <i data-lucide="building" class="w-5 h-5"></i> Manage Listings
    </button>
    <button data-section="inquiries">
      <i data-lucide="clipboard-list" class="w-5 h-5"></i> Inquiries
      <span id="inquiryBadge" class="badge">0</span>
    </button>
    <button data-section="messages">
      <i data-lucide="message-square" class="w-5 h-5"></i> Messages
      <span id="msgBadge" class="badge">0"></span>
    </button>
    <button data-section="analytics">
      <i data-lucide="bar-chart" class="w-5 h-5"></i> Analytics
    </button>
    <button data-section="notifications">
      <i data-lucide="bell" class="w-5 h-5"></i> Notifications
      <span id="notifBadge" class="badge">0 unread</span>
    </button>
  </nav>

  <button id="btnLogout" class="logout">
      <i data-lucide="log-out" class="w-5 h-5"></i> Logout
    </button>
</div>
<main class="main">

    <section id="dashboard">
        <div class="welcome-box">
            <div>
                <h1 class="text-blue-600 text-2xl font-bold mb-1">Welcome Back, Landlord!</h1>
                <p class="text-sm text-gray-600">Here's your property management overview and recent activities</p>
            </div>
        </div>

        <div class="card-container grid grid-cols-1 md:grid-cols-4 gap-4">
            <div class="card blue border-blue-600">
              <h4>Total Properties</h4>
              <h3 class="text-blue-600 text-3xl font-bold mb-1"><span id="stat-total">0</span></h3>
              <p class="text-sm font-semibold text-gray-800">(<span id="stat-available">0</span> available)</p>
            </div>
            <div class="card green border-green-600">
              <h4>Occupancy Rate</h4>
              <h3 class="text-green-600 text-3xl font-bold mb-1"><span id="stat-occupancy">0</span>%</h3>
              <p class="text-sm font-semibold text-gray-800">(<span id="stat-occupied">0</span>/<span id="stat-total2">0</span> occupied)</p>
            </div>
            <div class="card red border-red-600">
              <h4>Active Inquiries</h4>
              <h3 class="text-red-600 text-3xl font-bold mb-1"><span id="stat-inquiries">0</span></h3>
              <p class="text-sm font-semibold text-gray-800">(<span id="stat-pending-inquiries">0</span> pending bookings)</p>
            </div>
        </div>
        
        <div class="version-metrics flex gap-4 mt-4">
            <div class="v-card blue">
              <h4>Tenant Management</h4>
              <p>Total Tenants: <span id="v-tenants">...</span></p>
              <p>New This Month: <span id="v-new-tenants">...</span></p>
            </div>
            <div class="v-card green">
              <h4>Performance</h4>
              <p>Avg Rating: <span id="v-rating">...</span></p>
              <p>Response Rate: <span id="v-response">...</span></p>
            </div>
            <div class="v-card orange">
              <h4>Recent Activity</h4>
              <p>New Messages: <span id="v-messages">0</span></p>
              <p>Today's Views: <span id="v-views">...</span></p>
            </div>
        </div>

        <div class="activity-log">
            <h3>Recent Activity Log</h3>
        </div>
    </section>

    <section id="listings" class="hidden">
      <div class="header">
        <h2>Manage Listings</h2>
        <button id="btnAddListing" class="btn green">+ Add Property</button>
      </div>
      <div id="listingsGrid" class="grid">
        </div>
    </section>

    <section id="inquiries" class="hidden">
        <h2>Student Inquiries & Bookings</h2>
        <div class="tabs">
            <button class="tab active" data-tab="all">ALL</button>
            <button class="tab" data-tab="pending">PENDING</button>
            <button class="tab" data-tab="confirmed">CONFIRMED</button>
            <button class="tab" data-tab="declined">DECLINED</button>
        </div>

        <div id="inquirySections">
            <div class="inquiry-list" data-tab="all"></div>
            <div class="inquiry-list hidden" data-tab="pending"></div>
            <div class="inquiry-list hidden" data-tab="confirmed"></div>
            <div class="inquiry-list hidden" data-tab="declined"></div>
        </div>
    </section>

    <section id="messages" class="hidden">
        <div class="messages-container">
            <div class="conversations-sidebar">
                <div class="conversations-header">
                    <h2>Messages</h2>
                    <p class="subtitle">Chat with tenants about your property inquiries</p>
                </div>
                <div class="search-container">
                    <input type="text" id="searchInput" placeholder="Search conversations..." class="search-input">
                </div>
                <div class="conversations-list">
                    <h3 class="conversations-title">Conversations</h3>
                    <div id="conversationList" class="conversation-items"></div>
                </div>
            </div>
            <div id="chatWindow" class="chat-area hidden">
                <div class="chat-header">
                    <div class="chat-avatar" id="chatAvatar"></div>
                    <div class="chat-info">
                        <h3 id="chatTitle"></h3>
                        <p id="chatSubtitle"></p>
                    </div>
                </div>
                <div id="messageHistory" class="message-history"></div>
                <div id="chatInputContainer" class="message-input-container hidden">
                    <input type="text" id="messageInput" placeholder="Type your message..." class="message-input">
                    <button id="sendMessageBtn" class="send-button">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </section>



    <section id="analytics" class="hidden">
      <div class="analytics-header">
        <h2>Analytics & Performance</h2>
        <p>Comprehensive insights into your property performance and tenant analytics</p>
      </div>
      
    
<div id="analyticsKpis" class="stats analytics-kpis">
        <div class="card kpi-card blue">
            <h4>Occupancy Rate</h4>
            <h3 class="text-3xl font-bold text-blue-600"><span id="kpi-occupancy">0</span>%</h3>
        </div>
        <div class="card kpi-card orange">
            <h4>Pending Bookings</h4>
            <h3 class="text-3xl font-bold text-orange-600"><span id="kpi-pending">0</span></h3>
        </div>
        <div class="card kpi-card purple">
            <h4>Total Tenants</h4>
            <h3 class="text-3xl font-bold text-purple-600"><span id="kpi-tenants">0</span></h3>
        </div>
      </div>

      <div class="analytics-chart mt-4">
        <h3>Property Performance Trend</h3>
        <p style="margin-top: 20px; font-style: italic; color: #555;">
            Detailed charts for historical income and occupancy are coming soon.
        </p>
        </div>
    </section>

    <section id="notifications" class="hidden">
        <div class="notif-header">
            <h2>Notifications</h2>
            <span id="notifBadgeDynamic" class="notif-badge">0 unread</span>
        </div>
        <p class="notif-subtitle">Stay updated with important messages and activities.</p>
        <div id="notifList" class="notif-list"></div>
    </section>

    <div class="modal" id="modalAdd">
        <div class="modal-content add-property-modal">
            <span id="closeModalX" class="close-modal">&times;</span>
            <h3>Add New Property</h3>
            <p class="modal-subtitle">Fill in the details for your new rental property</p>
            <div class="step step-active" data-step="1">
                <label>Property Title *</label>
                <input type="text" id="prop-title" name="prop-title" placeholder="e.g., Downtown Student Apartment" required>
                
                <label>Property Type *</label>
                <select id="prop-type" name="prop-type" required>
                    <option value="apartment">Apartment/Unit</option>
                    <option value="boarding house">Boarding House</option>
                    <option value="bed spacer">Bed Spacer</option>
                    <option value="condo">Condo Unit</option>
                    <option value="house">Dormitory</option>
                </select>

                <label>Location *</label>
                <div class="flex gap-2"> <input type="text" id="prop-location" name="prop-location" placeholder="e.g., University District" required class="flex-1">
                    <button type="button" id="btnLocate" class="btn blue px-3 py-2 text-sm" style="background:#2563eb; color:white;">Locate</button>
                </div>
                
                <input type="hidden" id="prop-lat" name="prop-lat" value="0">
                <input type="hidden" id="prop-lng" name="prop-lng" value="0">
                <p id="coordStatus" class="text-xs text-gray-500 mt-1 hidden">Coordinates: N/A</p>
                <div class="form-row">
                    <div>
                        <label>Monthly Rent (₱) *</label>
                        <input type="number" id="prop-price" min="0" value="800" required>
                    </div>
                    <div>
                        <label>Bedrooms</label>
                        <input type="number" id="prop-bedrooms" min="0" value="2">
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="btn" id="nextStep">Next</button>
                </div>
            </div>
            <div class="step" data-step="2">
                <label>Description</label>
                <textarea id="prop-desc" placeholder="Describe your property..." rows="4"></textarea>
                <label>Availability Status</label>
                <select id="prop-status">
                    <option>Available Now</option>
                    <option>Currently Occupied</option>
                    <option>Coming Soon</option>
                </select>
                <div class="modal-actions">
                    <button class="btn" id="prevStep">Previous</button>
                    <button class="btn" id="nextStep2">Next</button>
                </div>
            </div>
            <div class="step" data-step="3">
                <label>Amenities (comma-separated)</label>
                <input type="text" id="prop-amenities" placeholder="WiFi, Parking, Laundry" />
                <label style="margin-top: 20px;">Photos (Up to 3)</label>
                <input type="file" id="prop-photos" accept="image/*" multiple />
                <div id="photoPreviews" class="photo-previews"></div>
                <p class="photo-hint">You can add 0–3 photos.</p>
                <div class="modal-actions">
                    <button class="btn" id="prevStep2">Previous</button>
                    <button class="btn green" id="btnSaveListing">Add Property</button>
                </div>
            </div>
        </div>
    </div>
    
    <div class="modal" id="mapModal" style="display: none;">
        <div class="modal-content add-property-modal">
            <span id="closeMapModal" class="close-modal">&times;</span>
            <h3>Map Locator</h3>
            <p class="modal-subtitle">Click the map to mark the exact property location (Latitude/Longitude).</p>
            
            <input type="text" id="mapSearchInput" placeholder="Search address to center map (e.g., General Santos City)" />
            <button type="button" id="mapSearchButton" class="btn blue px-3 py-2 text-sm" style="background:#2563eb; color:white; margin-bottom: 15px;">Search</button>

            <div id="mapContainer"></div>

            <p id="mapStatus" class="text-sm font-semibold mt-3 text-red-600">Select a point on the map.</p>
            <div class="modal-actions">
                <button class="btn" id="btnCancelMap">Cancel</button>
                <button class="btn green" id="btnSaveMapLocation" disabled>Save Location</button>
            </div>
        </div>
    </div>
    
    <div id="modalEdit" class="modal">
      <div class="modal-content">
        <span id="closeEditModal" class="close-modal">&times;</span>
        <h2>Edit Property</h2>
        <input type="hidden" id="edit-prop-id">
        <input type="text" id="edit-prop-title" placeholder="Property Title" required>
        
        <label>Location *</label>
        <div class="flex gap-2"> 
            <input type="text" id="edit-prop-location" name="edit-prop-location" placeholder="e.g., University District" required class="flex-1">
            <button type="button" id="btnEditLocate" class="btn blue px-3 py-2 text-sm" style="background:#2563eb; color:white;">Locate</button>
        </div>
        
        <input type="hidden" id="edit-prop-lat" name="edit-prop-lat" value="0">
        <input type="hidden" id="edit-prop-lng" name="edit-prop-lng" value="0">
        <p id="editCoordStatus" class="text-xs text-gray-500 mt-1 hidden">Coordinates: N/A</p>

        <select id="edit-prop-type">
          <option value="apartment">Apartment</option>
          <option value="boarding house">Boarding House</option>
          <option value="bed spacer">Bed Spacer</option>
          <option value="condo">Condo</option>
          <option value="house">House</option>
        </select>
        <input type="number" id="edit-prop-bedrooms" placeholder="Bedrooms" min="1" required>
        <input type="number" id="edit-prop-bathrooms" placeholder="Bathrooms" min="1" required>
        <input type="number" id="edit-prop-price" placeholder="Monthly Price" min="1" required>
        <textarea id="edit-prop-desc" placeholder="Description"></textarea>
        <select id="edit-prop-status">
          <option value="available">Available</option>
          <option value="rented">Rented</option>
          <option value="maintenance">Maintenance</option>
        </select>
        
        <label>Amenities (comma-separated)</label>
        <input type="text" id="edit-prop-amenities" placeholder="e.g., WiFi, Parking, Laundry">
        <input type="file" id="edit-prop-photos" multiple accept="image/*">
        <div id="edit-photoPreviews"></div>
        <div class="modal-actions">
          <button id="btnCancelEdit">Cancel</button>
          <button id="btnSaveEdit" class="btn green">Save Changes</button>
        </div>
      </div>
    </div>
    <div class="modal" id="modalLogout">
        <div class="modal-content">
            <span id="closeLogoutModal" class="close-modal">&times;</span>
            <h3>Confirm Logout</h3>
            <p>Are you sure you want to logout?</p>
            <div class="modal-actions">
                <button class="btn" id="btnCancelLogout">Cancel</button>
                <button class="btn red" id="btnConfirmLogout">Logout</button>
            </div>
        </div>
    </div>

</main>

  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
  <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
  <script> 
    const LANDLORD_ID = <?php echo isset($_SESSION['user_id']) ? $_SESSION['user_id'] : 'null'; ?>;
    console.log('Landlord ID:', LANDLORD_ID);
  </script>
  <script src="landlord.js?v=4.0"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</body>

</html>