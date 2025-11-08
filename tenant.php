<?php
session_start();
if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'tenant') {
    header("Location: login.php");
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TLIMS Tenant Dashboard</title>
<script src="https://cdn.tailwindcss.com"></script>
<script src="https://unpkg.com/lucide@latest"></script>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css" />

<link rel="stylesheet" href="tenant.css">
</head>
<body>

<div class="sidebar" id="sidebar">
    <div class="sidebar-header border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div class="logo-block flex items-center gap-2"> 
            <div class="logo-circle w-8 h-8 bg-blue-600 text-white rounded-full flex justify-center items-center font-bold text-base min-w-8">T</div>
            <div class="title-block">
                <h2 class="text-gray-800 text-base font-bold m-0">TLIMS</h2> 
                <p class="text-xs text-gray-500 mt-0 font-medium">Tenant Portal</p>
            </div>
        </div>
        <button class="menu-toggle" id="menuToggle" aria-label="Toggle Menu" style="display:none;"><i data-lucide="menu"></i></button>
    </div>

  

    <nav class="menu flex-grow px-0 py-2">
        <a href="#" data-page="dashboard" class="active">
            <i data-lucide="home" class="w-5 h-5"></i> 
            <span>Dashboard</span>
        </a>
        <a href="#" data-page="browsePage">
            <i data-lucide="search" class="w-5 h-5"></i> 
            <span>Browse Properties</span>
        </a>
        <a href="#" data-page="favoritesPage">
            <i data-lucide="heart" class="w-5 h-5"></i> 
            <span>Favorites</span>
            <span class="badge" id="favoritesBadge">0</span>
        </a>
     <a href="#" data-page="messagesPage" id="messagesLink">
        <i data-lucide="message-square" class="w-5 h-5"></i> 
        <span>Messages</span>
        <span class="badge" id="msgBadge">0</span> 
     </a>

        <a href="#" data-page="notificationsPage">
            <i data-lucide="bell" class="w-5 h-5"></i> 
            <span>Notifications</span>
            <span class="badge" id="notifBadge">0</span> 
        </a>
    </nav>

    <div class="bottom">
       
        <a href="#" class="logout" id="btnLogout">
            <i data-lucide="log-out" class="w-5 h-5"></i> 
            <span>Logout</span>
        </a>
    </div>
</div>

<div class="main" id="mainContent">

    <div id="dashboard" class="page">
        <div class="welcome-box">
            <div>
                <h1 class="text-blue-600 text-2xl font-bold mb-1">Welcome Back, Tenant!</h1>
                <p class="text-sm text-gray-600">Here's your overview of tenant housing activities</p>
            </div>
            <div class="summary flex gap-4">
            </div>
        </div>

        <div class="card-container grid grid-cols-1 md:grid-cols-3 gap-4">
            <div class="card blue border-blue-600">
                <h3 class="text-blue-600 text-3xl font-bold mb-1">6</h3>
                <p class="text-sm font-semibold text-gray-800">Total Properties</p>
                <span class="text-xs text-gray-500">Available near JHCSC</span>
            </div>
            <div class="card green border-green-600">
                <h3 class="text-green-600 text-3xl font-bold mb-1">2</h3>
                <p class="text-sm font-semibold text-gray-800">Active Bookings</p>
                <span class="text-xs text-gray-500">Confirmed reservations</span>
            </div>
            <div class="card orange border-orange-600">
                <h3 class="text-orange-600 text-3xl font-bold mb-1">3</h3>
                <p class="text-sm font-semibold text-gray-800">Pending Inquiries</p>
                <span class="text-xs text-gray-500">Awaiting response</span>
            </div>
        </div>
        <div class="activity">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>

                <div class="activity-item green">
                    <div class="flex-1 ml-1">
                        <strong class="text-green-600">Booking Confirmed</strong>
                        <p>Sunshine Boarding House - Room 201</p>
                    </div>
                    <span class="text-xs text-gray-600">2 hours ago</span>
                </div>
         <div class="activity-item blue">
                    <div class="flex-1 ml-1">
                        <strong class="text-blue-600">Property Favorited</strong>
                        <p>Added Modern Student Suites to favorites</p>
                    </div>
                    <span class="text-xs text-gray-600">1 day ago</span>
                </div>
                
                <div class="activity-item orange">
                    <div class="flex-1 ml-1">
                        <strong class="text-orange-600">New Message</strong>
                        <p>Landlord replied to your inquiry</p>
                    </div>
                    <span class="text-xs text-gray-600">2 days ago</span>
                </div>
            </div>
    </div>

<div id="browsePage" class="page p-4 hidden">

  <h2 class="text-lg font-semibold mb-4">Browse Rooms</h2>

  <div class="filters-card bg-white rounded-lg shadow p-4 mb-4">
    <div class="filters-row flex flex-wrap gap-2 mb-2">
      <input type="text" id="searchInput" placeholder="Search properties..."
        class="border border-gray-300 rounded px-3 py-2 flex-1"/>

      <select id="priceSelect" class="border border-gray-300 rounded px-3 py-2">
        <option value="">All Prices</option>
        <option value="low">Below ₱10,000</option>
        <option value="mid">₱10,000 - ₱15,000</option>
        <option value="high">Above ₱15,000</option>
      </select>

      <button class="advanced-btn flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-2 rounded">
        <i data-lucide="sliders-horizontal"></i> Advanced Filters
      </button>
    </div>

    </div>

  <div class="results-header flex justify-between items-center mb-4">
    <span id="propertyCount" class="font-semibold">3 Properties Found</span>
    <span class="starting text-gray-500">Starting from <span id="minPrice">₱8,500</span></span>
  </div>

  <div class="property-grid grid grid-cols-1 md:grid-cols-3 gap-4" id="propertyGrid">
    </div>
</div>

<div id="contactModal" class="modal hidden fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-70">
  <div class="bg-white rounded-lg shadow-lg w-11/12 md:w-1/2 lg:w-1/3 p-6 relative">
    <span id="closeContactModal" class="absolute top-2 right-3 text-gray-500 text-xl cursor-pointer">&times;</span>

    <h2 class="text-lg font-semibold mb-2">Contact Landlord</h2>
    <p class="text-sm text-gray-600 mb-4">
      Send a message to <span id="landlordName" class="font-medium"></span> about 
      "<span id="propertyTitle" class="font-medium"></span>"
    </p>

    <form id="contactForm" class="space-y-3">
      
      <div>
        <label class="block text-sm font-medium">Your Name *</label>
        <input type="text" id="yourName" name="your_name" class="border w-full px-3 py-2 rounded" required>
      </div>

      <div>
        <label class="block text-sm font-medium">Your Email *</label>
        <input type="email" id="yourEmail" name="your_email" class="border w-full px-3 py-2 rounded" required>
      </div>

      <div>
        <label class="block text-sm font-medium">Message *</label>
        <textarea id="message" name="message" class="border w-full px-3 py-2 rounded" rows="4" required></textarea>
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <button type="button" id="cancelContact" class="px-4 py-2 bg-gray-200 rounded">Cancel</button>
        <button type="submit" class="px-4 py-2 bg-green-500 text-white rounded">Send Message</button>
      </div>
    </form>
  </div>
</div>

<div id="detailsModal" class="modal hidden fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 overflow-y-auto">
  <div class="bg-white rounded-lg shadow-lg w-11/12 md:w-3/4 lg:w-1/2 p-6 relative overflow-y-auto max-h-[90vh]">
    <span id="closeDetailsModal" class="absolute top-2 right-3 text-gray-500 text-xl cursor-pointer">&times;</span>

    <h2 id="detailsTitle" class="text-xl font-semibold mb-2"></h2>
    <p class="text-sm text-gray-500 mb-4">Detailed information about this property including amenities, photos, location, and booking options.</p>

    <img id="detailsImage" src="" alt="Property Image" class="w-full h-64 object-cover rounded mb-3">

    <div id="detailsThumbnails" class="flex gap-2 mb-4"></div>

    <p id="detailsPrice" class="text-green-600 text-lg font-bold mb-1"></p>
    <p id="detailsArea" class="text-gray-600 text-sm mb-1"></p>
    <p id="detailsRating" class="text-gray-700 text-sm mb-4"></p>

    <h3 class="font-semibold mb-1">Description</h3>
    <p id="detailsDescription" class="text-gray-700 text-sm mb-4"></p>

    <h3 class="font-semibold mb-1">Amenities & Features</h3>
    <div id="detailsAmenities" class="flex flex-wrap gap-2 text-sm text-gray-700 mb-4"></div>

    <h3 class="font-semibold mb-1">Location & Transport</h3>
    <p id="detailsDistance" class="text-gray-700 text-sm mb-4"></p>
    
    <h3 class="font-semibold mb-1">Property Location Map</h3>
    <div id="tenantMapDisplay" style="height: 300px; width: 100%; border-radius: 8px; margin-bottom: 20px;">
        <p class="text-gray-500 text-sm p-4">Loading map...</p>
    </div>
    
    <div class="flex justify-between items-center mt-4">
      <div>
        <p class="text-sm text-gray-600">Landlord:</p>
        <p id="detailsLandlord" class="font-medium"></p>
      </div>
    </div>
  </div>
</div>

        <div id="favoritesPage" class="page hidden p-4">
    <div class="page-header flex justify-between items-center mb-4">
        <h1 class="text-xl font-bold">Your Favorite Rooms</h1>
        <div class="header-status flex items-center gap-2 text-gray-600">
            <p id="favoritesCount">0 properties saved for later</p>
            <i data-lucide="heart" class="status-icon"></i>
        </div>
    </div>
    <div class="properties-grid grid grid-cols-1 md:grid-cols-3 gap-4" id="favoritesGrid">
        </div>
</div>


  <div id="messagesPage" class="page hidden px-2 py-4">
  <div class="message-header flex justify-between items-center mb-4">
    <div>
      <h1 class="text-xl font-bold">Messages</h1>
      <p class="text-gray-600 text-sm">Chat with landlords about your property inquiries</p>
    </div>

  </div>

  

  <div class="messages-container flex gap-3 h-[600px]">
    <div id="conversationList" class="conversation-list w-1/3 bg-white rounded-lg shadow p-2 flex flex-col gap-2 overflow-y-auto">
      <div class="tabs flex mb-2">
        <button class="tab active px-3 py-1 rounded bg-blue-100 text-blue-700 font-semibold">
          Conversations
        </button>
      </div>

      <div class="search-bar flex items-center gap-2 mb-2 p-2 border border-gray-200 rounded">
        <i data-lucide="search" class="w-4 h-4 text-gray-400"></i>
        <input id="searchConvo" type="text" placeholder="Search conversations..." class="flex-1 text-sm outline-none"/>
      </div>

      </div>

    <div id="chatWindow" class="chat-window flex-1 bg-white rounded-lg shadow flex flex-col hidden">
    <div class="chat-header flex justify-between items-center p-3 border-b border-gray-200">
  <div class="chat-info flex items-center gap-2">
    <div id="chatAvatar" class="avatar-sm w-10 h-10 bg-gray-300 text-white rounded-full flex justify-center items-center font-semibold">?</div>
    <div class="name-status">
      <strong id="chatTitle" class="block text-gray-800">Select a Conversation</strong>
      <small id="chatSubtitle" class="text-gray-500 text-xs">No chat selected</small>
    </div>
  </div>
  <div class="chat-actions flex gap-2 text-gray-600">
    <i data-lucide="phone" class="w-5 h-5 cursor-pointer"></i>
    <i data-lucide="video" class="w-5 h-5 cursor-pointer"></i>
    <i data-lucide="more-vertical" class="w-5 h-5 cursor-pointer"></i>
  </div>
</div>

     <div id="messageHistory" class="message-history flex-1 p-3 overflow-y-auto">
  <div class="empty-chat" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #6b7280;">
    <div class="empty-icon" style="font-size: 3rem; margin-bottom: 1rem;">💬</div>
    <p>Select a conversation to view messages</p>
  </div>
</div>

      <div id="chatInputContainer" class="chat-input flex p-3 border-t border-gray-200 gap-2 hidden">
    <input id="messageInput" type="text" placeholder="Type a message..."
               class="flex-1 border border-gray-300 rounded px-3 py-2 text-sm outline-none"/>
        <button id="sendMessageBtn" class="bg-blue-500 text-white px-3 py-2 rounded flex items-center justify-center">
          <i data-lucide="send" class="w-4 h-4"></i>
          
        </button>
      </div>
    </div>
  </div>
</div>

<div id="notificationsPage" class="page hidden p-4">
    <div class="page-header flex justify-between items-center mb-4">
        <div>
            <h1 class="text-lg font-semibold mb-1">Notifications</h1>
            <p class="subtitle text-gray-600">Stay updated with important messages and activities.</p>
        </div>
        <div class="unread-count text-sm text-gray-600">
            <span id="unreadCount">2</span> unread
        </div>
    </div>

    <div class="notification-list flex flex-col gap-2" id="notificationList">
        <div class="notification-item high flex items-start p-2 rounded border" data-priority="high" data-read="false">
            <div class="icon-section mr-2">
                <i data-lucide="home"></i>
            </div>
            <div class="content-section flex-1">
                <div class="title-line flex justify-between items-center">
                    <h3 class="title font-semibold text-gray-800">Booking Confirmed</h3>
                    <div class="priority-badge high-badge text-xs font-bold text-red-500">high</div>
                </div>
                <p class="description text-gray-600">Your booking for Downtown Studio has been confirmed by the landlord.</p>
                <span class="timestamp text-xs text-gray-400">2 hours ago</span>
            </div>
            <div class="status-dot unread-dot w-3 h-3 rounded-full bg-red-500 mt-2"></div>
        </div>

        <div class="notification-item medium flex items-start p-2 rounded border" data-priority="medium" data-read="false">
            <div class="icon-section mr-2">
                <i data-lucide="mail"></i>
            </div>
            <div class="content-section flex-1">
                <div class="title-line flex justify-between items-center">
                    <h3 class="title font-semibold text-gray-800">New Message</h3>
                    <div class="priority-badge medium-badge text-xs font-bold text-yellow-500">medium</div>
                </div>
                <p class="description text-gray-600">Sarah Johnson sent you a message about the property viewing.</p>
                <span class="timestamp text-xs text-gray-400">1 day ago</span>
            </div>
            <div class="status-dot unread-dot w-3 h-3 rounded-full bg-yellow-500 mt-2"></div>
        </div>

        <div class="notification-item low flex items-start p-2 rounded border" data-priority="low" data-read="true">
            <div class="icon-section mr-2">
                <i data-lucide="user"></i>
            </div>
            <div class="content-section flex-1">
                <div class="title-line flex justify-between items-center">
                    <h3 class="title font-semibold text-gray-800">Profile Updated</h3>
                    <div class="priority-badge low-badge text-xs font-bold text-green-500">low</div>
                </div>
                <p class="description text-gray-600">Your profile information has been successfully updated.</p>
                <span class="timestamp text-xs text-gray-400">3 days ago</span>
            </div>
            <div class="status-dot read-dot w-3 h-3 rounded-full bg-green-500 mt-2"></div>
        </div>

        <div class="notification-item low flex items-start p-2 rounded border" data-priority="low" data-read="true">
            <div class="icon-section mr-2">
                <i data-lucide="map-pin"></i>
            </div>
            <div class="content-section flex-1">
                <div class="title-line flex justify-between items-center">
                    <h3 class="title font-semibold text-gray-800">New Listing Alert</h3>
                    <div class="priority-badge low-badge text-xs font-bold text-green-500">low</div>
                </div>
                <p class="description text-gray-600">A new property matching your search criteria is now available.</p>
                <span class="timestamp text-xs text-gray-400">4 days ago</span>
            </div>
            <div class="status-dot read-dot w-3 h-3 rounded-full bg-green-500 mt-2"></div>
        </div>
    </div>


    <div class="quick-actions mt-4">
        <h2 class="font-semibold mb-2">Quick Actions</h2>
        <div class="action-buttons flex gap-2">
            <button id="markAllReadBtn" class="action-btn px-3 py-1 rounded bg-blue-500 text-white text-sm">Mark All as Read</button>
            <button id="filterBtn" class="action-btn px-3 py-1 rounded bg-gray-200 text-gray-700 text-sm">Filter by Type</button>
        
</div>
    </div>
</div>

<div class="modal" id="modalLogout">
    <div class="bg-white rounded-lg shadow-lg w-11/12 md:w-1/3 p-6 relative">
        <span id="closeLogoutModal" class="absolute top-2 right-3 text-gray-500 text-xl cursor-pointer">&times;</span>
        <h3>Confirm Logout</h3>
        <p>Are you sure you want to log out?</p>
        <div class="flex justify-end gap-2 mt-4">
            <button class="px-4 py-2 bg-gray-200 rounded" id="btnCancelLogout">Cancel</button>
            <button class="px-4 py-2 bg-red-600 text-white rounded" id="btnConfirmLogout">Logout</button>
        </div>
    </div>
</div>
<script>
        // I-pass ang PHP Session data ngadto sa JavaScript
        const TENANT_ID = <?php echo $_SESSION['user_id'] ?? 'null'; ?>;
        const TENANT_NAME = <?php echo json_encode($_SESSION['fullname'] ?? 'Tenant'); ?>;
    </script>
    
    <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>

    <script src="tenant.js" defer></script>

</body>
</html>