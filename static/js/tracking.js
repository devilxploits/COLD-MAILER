// tracking.js - Email tracking functionality

// Register a tracking event (open or click)
function registerTrackingEvent(campaignId, trackingId, eventType, url = null) {
    const event = {
        type: eventType,
        campaignId,
        trackingId,
        url,
        timestamp: new Date().toISOString()
    };
    
    return saveTrackingEvent(event);
}

// Generate a tracking pixel for HTML emails
function generateTrackingPixel(campaignId, trackingId) {
    // Generate a URL to the tracking endpoint
    const trackingUrl = `/tracking/${campaignId}/${trackingId}`;
    
    // Create a 1x1 transparent tracking pixel
    return `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none" />`;
}

// Modify links in HTML content to include tracking
function addTrackingToLinks(html, campaignId, trackingId) {
    // Simple regex to find links in HTML
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi;
    
    // Replace each link with a tracking link
    return html.replace(linkRegex, function(match, url, text) {
        const trackingUrl = `/click/${campaignId}/${trackingId}/${encodeURIComponent(url)}`;
        return match.replace(url, trackingUrl);
    });
}

// Create a tracking object for a recipient
function createRecipientTracking(campaignId, email) {
    return {
        email,
        trackingId: generateUUID(),
        sentAt: new Date().toISOString(),
        opens: [],
        clicks: []
    };
}

// Update tracking for a specific campaign and recipient
function updateRecipientTracking(campaignId, trackingId, eventType, data = {}) {
    const campaigns = getCampaigns();
    const campaignIndex = campaigns.findIndex(c => c.id === campaignId);
    
    if (campaignIndex === -1) return false;
    
    // Find the recipient with this tracking ID
    let found = false;
    const campaign = campaigns[campaignIndex];
    
    // Make sure tracking data structure exists
    if (!campaign.recipientTracking) {
        campaign.recipientTracking = [];
    }
    
    // Find the recipient tracking entry
    const trackingIndex = campaign.recipientTracking.findIndex(
        t => t.trackingId === trackingId
    );
    
    if (trackingIndex === -1) return false;
    
    // Update the tracking data based on event type
    const tracking = campaign.recipientTracking[trackingIndex];
    
    if (eventType === 'open') {
        tracking.opens.push({
            timestamp: new Date().toISOString(),
            ip: data.ip || '',
            userAgent: data.userAgent || ''
        });
        found = true;
    } else if (eventType === 'click') {
        tracking.clicks.push({
            timestamp: new Date().toISOString(),
            url: data.url || '',
            ip: data.ip || '',
            userAgent: data.userAgent || ''
        });
        found = true;
    }
    
    if (found) {
        // Update the campaign in localStorage
        campaigns[campaignIndex] = campaign;
        saveToStorage(STORAGE_KEYS.CAMPAIGNS, campaigns);
        return true;
    }
    
    return false;
}

// Get tracking data for a specific campaign
function getCampaignTrackingData(campaignId) {
    const campaign = getCampaign(campaignId);
    if (!campaign) return null;
    
    const trackingData = getTrackingData();
    
    // Filter events for this campaign
    const events = trackingData.events.filter(event => event.campaignId === campaignId);
    
    // Group events by tracking ID
    const recipientEvents = {};
    
    events.forEach(event => {
        if (!recipientEvents[event.trackingId]) {
            recipientEvents[event.trackingId] = {
                opens: [],
                clicks: []
            };
        }
        
        if (event.type === 'open') {
            recipientEvents[event.trackingId].opens.push({
                timestamp: event.timestamp
            });
        } else if (event.type === 'click') {
            recipientEvents[event.trackingId].clicks.push({
                timestamp: event.timestamp,
                url: event.url
            });
        }
    });
    
    return {
        campaign,
        events,
        recipientEvents
    };
}

// Get tracking statistics for all campaigns
function getAllCampaignsTrackingStats() {
    const campaigns = getCampaigns();
    const trackingData = getTrackingData();
    
    const stats = campaigns.map(campaign => {
        // Filter events for this campaign
        const campaignEvents = trackingData.events.filter(
            event => event.campaignId === campaign.id
        );
        
        // Count unique opens and clicks
        const uniqueOpens = new Set();
        const uniqueClicks = new Set();
        
        campaignEvents.forEach(event => {
            if (event.type === 'open') {
                uniqueOpens.add(event.trackingId);
            } else if (event.type === 'click') {
                uniqueClicks.add(event.trackingId);
            }
        });
        
        const recipientCount = campaign.recipients ? campaign.recipients.length : 0;
        
        return {
            id: campaign.id,
            name: campaign.name,
            sentCount: recipientCount,
            openCount: uniqueOpens.size,
            openRate: recipientCount > 0 ? (uniqueOpens.size / recipientCount * 100).toFixed(1) : '0.0',
            clickCount: uniqueClicks.size,
            clickRate: recipientCount > 0 ? (uniqueClicks.size / recipientCount * 100).toFixed(1) : '0.0'
        };
    });
    
    return stats;
}
