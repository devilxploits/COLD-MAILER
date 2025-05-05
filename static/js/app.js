// app.js - Core functions for Cold Mailer application

// Local Storage keys
const STORAGE_KEYS = {
    CAMPAIGNS: 'coldmailer_campaigns',
    SETTINGS: 'coldmailer_settings',
    SMTP: 'coldmailer_smtp',
    TRACKING: 'coldmailer_tracking'
};

// Initialize storage
function initializeStorage() {
    // Check if storage is already initialized
    if (!localStorage.getItem(STORAGE_KEYS.CAMPAIGNS)) {
        localStorage.setItem(STORAGE_KEYS.CAMPAIGNS, JSON.stringify([]));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify({
            defaultFromName: '',
            defaultReplyTo: ''
        }));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.SMTP)) {
        localStorage.setItem(STORAGE_KEYS.SMTP, JSON.stringify({
            host: '',
            port: 587,
            username: '',
            password: '',
            useTls: true
        }));
    }
    
    if (!localStorage.getItem(STORAGE_KEYS.TRACKING)) {
        localStorage.setItem(STORAGE_KEYS.TRACKING, JSON.stringify({
            events: []
        }));
    }
}

// Get data from storage
function getFromStorage(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) || null;
    } catch (error) {
        console.error(`Error fetching data from storage (${key}):`, error);
        return null;
    }
}

// Save data to storage
function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.error(`Error saving data to storage (${key}):`, error);
        showAlert(`Storage error: ${error.message}. Your data may not be saved.`, 'danger');
        return false;
    }
}

// Get all campaigns
function getCampaigns() {
    return getFromStorage(STORAGE_KEYS.CAMPAIGNS) || [];
}

// Get a single campaign by ID
function getCampaign(id) {
    const campaigns = getCampaigns();
    return campaigns.find(campaign => campaign.id === id) || null;
}

// Save a campaign
function saveCampaign(campaign) {
    const campaigns = getCampaigns();
    const existingIndex = campaigns.findIndex(c => c.id === campaign.id);
    
    if (existingIndex >= 0) {
        campaigns[existingIndex] = campaign;
    } else {
        campaigns.push(campaign);
    }
    
    return saveToStorage(STORAGE_KEYS.CAMPAIGNS, campaigns);
}

// Delete a campaign
function deleteCampaign(id) {
    const campaigns = getCampaigns();
    const updatedCampaigns = campaigns.filter(c => c.id !== id);
    return saveToStorage(STORAGE_KEYS.CAMPAIGNS, updatedCampaigns);
}

// Get SMTP settings
function getSmtpSettings() {
    return getFromStorage(STORAGE_KEYS.SMTP) || {
        host: '',
        port: 587,
        username: '',
        password: '',
        useTls: true
    };
}

// Save SMTP settings
function saveSmtpSettings(settings) {
    return saveToStorage(STORAGE_KEYS.SMTP, settings);
}

// Get application settings
function getSettings() {
    return getFromStorage(STORAGE_KEYS.SETTINGS) || {
        defaultFromName: '',
        defaultReplyTo: ''
    };
}

// Save application settings
function saveSettings(settings) {
    return saveToStorage(STORAGE_KEYS.SETTINGS, settings);
}

// Get tracking data
function getTrackingData() {
    return getFromStorage(STORAGE_KEYS.TRACKING) || { events: [] };
}

// Save tracking event
function saveTrackingEvent(event) {
    const trackingData = getTrackingData();
    trackingData.events.push(event);
    return saveToStorage(STORAGE_KEYS.TRACKING, trackingData);
}

// Register email open
function registerOpen(campaignId, trackingId) {
    const event = {
        type: 'open',
        campaignId,
        trackingId,
        timestamp: new Date().toISOString()
    };
    
    return saveTrackingEvent(event);
}

// Register link click
function registerClick(campaignId, trackingId, url) {
    const event = {
        type: 'click',
        campaignId,
        trackingId,
        url,
        timestamp: new Date().toISOString()
    };
    
    return saveTrackingEvent(event);
}

// Calculate campaign statistics
function calculateCampaignStats(campaignId) {
    const campaign = getCampaign(campaignId);
    if (!campaign) return null;
    
    const trackingData = getTrackingData();
    const recipientCount = campaign.recipients.length;
    
    // Get events for this campaign
    const campaignEvents = trackingData.events.filter(event => event.campaignId === campaignId);
    
    // Count unique opens (by tracking ID)
    const uniqueOpens = new Set();
    campaignEvents.forEach(event => {
        if (event.type === 'open') {
            uniqueOpens.add(event.trackingId);
        }
    });
    
    // Count unique clicks (by tracking ID)
    const uniqueClicks = new Set();
    campaignEvents.forEach(event => {
        if (event.type === 'click') {
            uniqueClicks.add(event.trackingId);
        }
    });
    
    return {
        sent: recipientCount,
        opens: uniqueOpens.size,
        openRate: recipientCount > 0 ? (uniqueOpens.size / recipientCount * 100).toFixed(1) : 0,
        clicks: uniqueClicks.size,
        clickRate: recipientCount > 0 ? (uniqueClicks.size / recipientCount * 100).toFixed(1) : 0
    };
}

// Format date for display
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Show alert
function showAlert(message, type = 'info', duration = 5000) {
    // Create alert container if it doesn't exist
    let alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        alertContainer = document.createElement('div');
        alertContainer.id = 'alertContainer';
        document.body.appendChild(alertContainer);
    }
    
    // Create alert element
    const alertId = 'alert-' + Date.now();
    const alertHtml = `
        <div id="${alertId}" class="alert alert-${type} alert-dismissible fade show custom-alert" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHtml);
    
    // Show the alert with animation
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.classList.add('show');
        }
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.classList.remove('show');
            setTimeout(() => {
                alertElement.remove();
            }, 300); // wait for fade out animation
        }
    }, duration);
}

// Calculate local storage usage
function calculateStorageUsage() {
    let total = 0;
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += (localStorage[key].length * 2) / 1024; // in KB (UTF-16 = 2 bytes per char)
        }
    }
    return total;
}

// Export data
function exportAllData() {
    const exportData = {
        campaigns: getCampaigns(),
        settings: getSettings(),
        smtp: getSmtpSettings(),
        tracking: getTrackingData()
    };
    
    const dataStr = JSON.stringify(exportData);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = 'coldmailer_export_' + new Date().toISOString().slice(0, 10) + '.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
}

// Import data
function importData(jsonData) {
    try {
        const data = JSON.parse(jsonData);
        
        if (data.campaigns) {
            saveToStorage(STORAGE_KEYS.CAMPAIGNS, data.campaigns);
        }
        
        if (data.settings) {
            saveToStorage(STORAGE_KEYS.SETTINGS, data.settings);
        }
        
        if (data.smtp) {
            saveToStorage(STORAGE_KEYS.SMTP, data.smtp);
        }
        
        if (data.tracking) {
            saveToStorage(STORAGE_KEYS.TRACKING, data.tracking);
        }
        
        return true;
    } catch (error) {
        console.error('Error importing data:', error);
        return false;
    }
}

// Clear all data
function clearAllData() {
    localStorage.removeItem(STORAGE_KEYS.CAMPAIGNS);
    localStorage.removeItem(STORAGE_KEYS.SETTINGS);
    localStorage.removeItem(STORAGE_KEYS.SMTP);
    localStorage.removeItem(STORAGE_KEYS.TRACKING);
    
    // Re-initialize storage with empty values
    initializeStorage();
    
    return true;
}

// Create a UUID (for tracking and campaign IDs)
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Generate tracking pixel HTML for a given campaign and recipient
function generateTrackingPixel(campaignId, trackingId) {
    const trackingUrl = `${window.location.origin}/tracking/${campaignId}/${trackingId}`;
    return `<img src="${trackingUrl}" width="1" height="1" alt="" style="display: none;" />`;
}

// Helper to process email lists
function processEmailList(text) {
    if (!text) return [];
    
    // Split by newline, comma, or semicolon
    const emails = text.split(/[\n,;]+/)
        .map(email => email.trim())
        .filter(email => email && isValidEmail(email));
    
    return [...new Set(emails)]; // Remove duplicates
}

// Validate email format
function isValidEmail(email) {
    const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(email).toLowerCase());
}

// Initialize storage when the app loads
document.addEventListener('DOMContentLoaded', function() {
    initializeStorage();
});
