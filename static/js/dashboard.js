// dashboard.js - Dashboard functionality

document.addEventListener('DOMContentLoaded', function() {
    // Initialize dashboard
    loadDashboardStats();
    
    // Set up an interval to refresh data (every 30 seconds)
    setInterval(loadDashboardStats, 30000);
});

// Load overall dashboard statistics
function loadDashboardStats() {
    const campaigns = getCampaigns();
    
    if (campaigns.length === 0) {
        document.getElementById('stats-cards').style.display = 'none';
        document.getElementById('empty-state').style.display = 'block';
        return;
    }
    
    document.getElementById('stats-cards').style.display = 'flex';
    document.getElementById('empty-state').style.display = 'none';
    
    // Calculate overall stats
    let totalSent = 0;
    let totalOpens = 0;
    let totalClicks = 0;
    let totalReplies = 0;
    
    // Campaign data for charts
    const campaignNames = [];
    const openRates = [];
    const deliveryData = {
        inbox: 0,
        spam: 0,
        bounced: 0
    };
    
    campaigns.forEach(campaign => {
        const recipients = campaign.recipients ? campaign.recipients.length : 0;
        totalSent += recipients;
        
        // Get tracking data for this campaign
        const stats = calculateCampaignStats(campaign.id);
        if (stats) {
            totalOpens += stats.opens;
            totalClicks += stats.clicks;
            
            // For chart data (only include sent campaigns with recipients)
            if (campaign.status === 'sent' && recipients > 0) {
                campaignNames.push(campaign.name);
                openRates.push(parseFloat(stats.openRate));
                
                // Simulate delivery data (in a real app, this would be from tracking data)
                // We'll assume most emails go to inbox for the demo
                const inboxCount = Math.floor(recipients * 0.85);
                const spamCount = Math.floor(recipients * 0.1);
                const bouncedCount = recipients - inboxCount - spamCount;
                
                deliveryData.inbox += inboxCount;
                deliveryData.spam += spamCount;
                deliveryData.bounced += bouncedCount;
            }
        }
        
        // Replies (simulated for demo)
        if (campaign.tracking && typeof campaign.tracking.replies === 'number') {
            totalReplies += campaign.tracking.replies;
        }
    });
    
    // Update stat cards
    document.getElementById('total-sent').textContent = totalSent;
    document.getElementById('total-opens').textContent = totalOpens;
    document.getElementById('total-clicks').textContent = totalClicks;
    document.getElementById('total-replies').textContent = totalReplies;
    
    // Create/update charts
    createOpenRateChart(campaignNames, openRates);
    createDeliveryStatusChart(deliveryData);
    
    // Update recent campaigns table
    updateRecentCampaignsTable(campaigns);
}

// Create open rate chart
function createOpenRateChart(campaignNames, openRates) {
    const ctx = document.getElementById('openRateChart').getContext('2d');
    
    // Check if chart already exists and destroy it
    if (window.openRateChart) {
        window.openRateChart.destroy();
    }
    
    // Limit to last 5 campaigns for readability
    const displayLimit = 5;
    const displayNames = campaignNames.slice(-displayLimit);
    const displayRates = openRates.slice(-displayLimit);
    
    window.openRateChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: displayNames,
            datasets: [{
                label: 'Open Rate (%)',
                data: displayRates,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Open Rate (%)'
                    }
                }
            }
        }
    });
}

// Create delivery status chart
function createDeliveryStatusChart(deliveryData) {
    const ctx = document.getElementById('deliveryStatusChart').getContext('2d');
    
    // Check if chart already exists and destroy it
    if (window.deliveryStatusChart) {
        window.deliveryStatusChart.destroy();
    }
    
    window.deliveryStatusChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Inbox', 'Spam/Promotions', 'Bounced'],
            datasets: [{
                data: [
                    deliveryData.inbox,
                    deliveryData.spam,
                    deliveryData.bounced
                ],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(255, 99, 132, 0.7)'
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// Update recent campaigns table
function updateRecentCampaignsTable(campaigns) {
    const recentCampaigns = document.getElementById('recent-campaigns');
    if (!recentCampaigns) return;
    
    // Sort campaigns by creation date (newest first)
    const sortedCampaigns = [...campaigns].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // Take the 5 most recent campaigns
    const displayCampaigns = sortedCampaigns.slice(0, 5);
    
    if (displayCampaigns.length === 0) {
        recentCampaigns.innerHTML = `<tr><td colspan="7" class="text-center">No campaigns found</td></tr>`;
        return;
    }
    
    let html = '';
    displayCampaigns.forEach(campaign => {
        const stats = calculateCampaignStats(campaign.id);
        const openRate = stats ? stats.openRate : '0';
        
        html += `
            <tr>
                <td>${campaign.name}</td>
                <td>${stats ? stats.sent : 0}</td>
                <td>${stats ? stats.opens : 0}</td>
                <td>${openRate}%</td>
                <td>${stats ? stats.clicks : 0}</td>
                <td>${campaign.tracking && campaign.tracking.replies ? campaign.tracking.replies : 0}</td>
                <td><span class="badge bg-${getStatusBadgeClass(campaign.status)}">${campaign.status}</span></td>
            </tr>
        `;
    });
    
    recentCampaigns.innerHTML = html;
}

// Get appropriate badge class for campaign status
function getStatusBadgeClass(status) {
    switch (status) {
        case 'draft': return 'secondary';
        case 'sending': return 'warning';
        case 'sent': return 'success';
        case 'failed': return 'danger';
        default: return 'info';
    }
}
