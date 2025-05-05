// campaigns.js - Campaign management functionality

document.addEventListener('DOMContentLoaded', function() {
    // Check which page we're on
    const campaignsPage = document.getElementById('campaigns-list');
    const newCampaignForm = document.getElementById('campaign-form');
    
    if (campaignsPage) {
        loadCampaignsList();
        setupCampaignControls();
    }
    
    if (newCampaignForm) {
        setupNewCampaignForm();
    }
});

// Load campaigns for the campaigns list page
function loadCampaignsList() {
    const campaignsList = document.getElementById('campaigns-list');
    const emptyState = document.getElementById('empty-state');
    
    if (!campaignsList) return;
    
    const campaigns = getCampaigns();
    
    if (campaigns.length === 0) {
        campaignsList.innerHTML = `<tr><td colspan="8" class="text-center">No campaigns found</td></tr>`;
        if (emptyState) emptyState.style.display = 'block';
        return;
    }
    
    if (emptyState) emptyState.style.display = 'none';
    
    // Sort campaigns by creation date (newest first)
    campaigns.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    let html = '';
    campaigns.forEach(campaign => {
        const stats = calculateCampaignStats(campaign.id);
        
        html += `
            <tr data-campaign="${campaign.id}">
                <td>${campaign.name}</td>
                <td>${campaign.subject}</td>
                <td>${stats ? stats.sent : 0}</td>
                <td>${stats ? stats.opens : 0} (${stats ? stats.openRate : 0}%)</td>
                <td>${stats ? stats.clicks : 0}</td>
                <td>${formatDate(campaign.created_at)}</td>
                <td><span class="badge bg-${getStatusBadgeClass(campaign.status)}">${campaign.status}</span></td>
                <td>
                    <div class="btn-group btn-group-sm" role="group">
                        <button type="button" class="btn btn-outline-primary view-campaign" data-campaign="${campaign.id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button type="button" class="btn btn-outline-success duplicate-campaign" data-campaign="${campaign.id}">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button type="button" class="btn btn-outline-danger delete-campaign" data-campaign="${campaign.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    
    campaignsList.innerHTML = html;
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

// Setup event handlers for campaign actions
function setupCampaignControls() {
    const campaignsList = document.getElementById('campaigns-list');
    if (!campaignsList) return;
    
    // Campaign search
    const searchField = document.getElementById('campaign-search');
    if (searchField) {
        searchField.addEventListener('input', function() {
            filterCampaigns(this.value);
        });
    }
    
    // Click handlers for campaign actions
    campaignsList.addEventListener('click', function(e) {
        const target = e.target.closest('button');
        if (!target) return;
        
        const campaignId = target.getAttribute('data-campaign');
        
        if (target.classList.contains('view-campaign')) {
            viewCampaign(campaignId);
        } else if (target.classList.contains('duplicate-campaign')) {
            duplicateCampaign(campaignId);
        } else if (target.classList.contains('delete-campaign')) {
            confirmDeleteCampaign(campaignId);
        }
    });
    
    // Resend campaign button in the modal
    const resendBtn = document.getElementById('resend-campaign');
    if (resendBtn) {
        resendBtn.addEventListener('click', function() {
            const campaignId = this.getAttribute('data-campaign');
            if (campaignId) {
                window.location.href = `/new-campaign?duplicate=${campaignId}`;
            }
        });
    }
}

// Filter campaigns by search term
function filterCampaigns(searchTerm) {
    const campaignsList = document.getElementById('campaigns-list');
    if (!campaignsList) return;
    
    const rows = campaignsList.querySelectorAll('tr[data-campaign]');
    searchTerm = searchTerm.toLowerCase();
    
    rows.forEach(row => {
        const campaignName = row.cells[0].textContent.toLowerCase();
        const campaignSubject = row.cells[1].textContent.toLowerCase();
        
        if (campaignName.includes(searchTerm) || campaignSubject.includes(searchTerm)) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// View campaign details
function viewCampaign(campaignId) {
    const campaign = getCampaign(campaignId);
    if (!campaign) {
        showAlert('Campaign not found', 'danger');
        return;
    }
    
    // Update modal with campaign data
    document.getElementById('campaignDetailModalLabel').textContent = campaign.name;
    document.getElementById('detail-name').textContent = campaign.name;
    document.getElementById('detail-subject').textContent = campaign.subject;
    document.getElementById('detail-from-name').textContent = campaign.from_name;
    document.getElementById('detail-reply-to').textContent = campaign.reply_to;
    document.getElementById('detail-status').textContent = campaign.status;
    document.getElementById('detail-created').textContent = formatDate(campaign.created_at);
    document.getElementById('detail-content-type').textContent = campaign.content_type === 'html' ? 'HTML' : 'Plain Text';
    
    // Calculate stats
    const stats = calculateCampaignStats(campaign.id);
    if (stats) {
        document.getElementById('detail-open-rate').style.width = `${stats.openRate}%`;
        document.getElementById('detail-open-rate').textContent = `${stats.openRate}%`;
        document.getElementById('detail-stats').textContent = 
            `Sent: ${stats.sent} | Opens: ${stats.opens} (${stats.openRate}%) | Clicks: ${stats.clicks} (${stats.clickRate}%)`;
    }
    
    // Show content
    const contentContainer = document.getElementById('detail-content');
    if (campaign.content_type === 'html') {
        contentContainer.innerHTML = campaign.content;
    } else {
        contentContainer.innerHTML = `<pre>${campaign.content}</pre>`;
    }
    
    // Show recipients
    const recipientsContainer = document.getElementById('detail-recipients');
    if (campaign.recipients && campaign.recipients.length > 0) {
        let recipientsHtml = '';
        campaign.recipients.forEach((recipient, index) => {
            // In a real app, we'd look up tracking data for each recipient
            // Here we'll just show the email
            recipientsHtml += `
                <tr>
                    <td>${typeof recipient === 'object' ? recipient.email : recipient}</td>
                    <td><span class="badge bg-success">Sent</span></td>
                    <td>-</td>
                    <td>-</td>
                </tr>
            `;
        });
        recipientsContainer.innerHTML = recipientsHtml;
    } else {
        recipientsContainer.innerHTML = `<tr><td colspan="4" class="text-center">No recipients</td></tr>`;
    }
    
    // Set campaign ID on the resend button
    const resendBtn = document.getElementById('resend-campaign');
    if (resendBtn) {
        resendBtn.setAttribute('data-campaign', campaign.id);
    }
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('campaignDetailModal'));
    modal.show();
}

// Duplicate campaign
function duplicateCampaign(campaignId) {
    window.location.href = `/new-campaign?duplicate=${campaignId}`;
}

// Confirm delete campaign
function confirmDeleteCampaign(campaignId) {
    if (confirm('Are you sure you want to delete this campaign? This cannot be undone.')) {
        if (deleteCampaign(campaignId)) {
            showAlert('Campaign deleted successfully', 'success');
            loadCampaignsList(); // Refresh the list
        } else {
            showAlert('Failed to delete campaign', 'danger');
        }
    }
}

// Setup new campaign form
function setupNewCampaignForm() {
    // Load default settings
    loadDefaultSettings();
    
    // Check if we're duplicating a campaign
    const urlParams = new URLSearchParams(window.location.search);
    const duplicateId = urlParams.get('duplicate');
    if (duplicateId) {
        loadCampaignForDuplication(duplicateId);
    }
    
    // Content type toggle
    const plainRadio = document.getElementById('content-type-plain');
    const htmlRadio = document.getElementById('content-type-html');
    
    if (plainRadio && htmlRadio) {
        plainRadio.addEventListener('change', toggleContentType);
        htmlRadio.addEventListener('change', toggleContentType);
    }
    
    // Load SMTP settings from saved values
    loadSmtpSettings();
    
    // File upload for recipients
    const recipientsFile = document.getElementById('recipients-file');
    if (recipientsFile) {
        recipientsFile.addEventListener('change', handleRecipientFileUpload);
    }
    
    // Handle recipient paste
    const recipientsPaste = document.getElementById('recipients-paste');
    if (recipientsPaste) {
        recipientsPaste.addEventListener('input', function() {
            const emails = processEmailList(this.value);
            updateRecipientsPreview(emails);
        });
    }
    
    // Clear recipients button
    const clearRecipientsBtn = document.getElementById('clear-recipients');
    if (clearRecipientsBtn) {
        clearRecipientsBtn.addEventListener('click', function() {
            document.getElementById('recipients-paste').value = '';
            document.getElementById('recipients-file').value = '';
            updateRecipientsPreview([]);
        });
    }
    
    // HTML file upload and preview
    const htmlFile = document.getElementById('html-file');
    if (htmlFile) {
        htmlFile.addEventListener('change', handleHtmlFileUpload);
    }
    
    // HTML content preview
    const htmlContent = document.getElementById('html-content');
    if (htmlContent) {
        htmlContent.addEventListener('input', function() {
            updateHtmlPreview(this.value);
        });
    }
    
    // Test SMTP button
    const testSmtpBtn = document.getElementById('test-smtp');
    if (testSmtpBtn) {
        testSmtpBtn.addEventListener('click', testSmtpConnection);
    }
    
    // Save draft button
    const saveDraftBtn = document.getElementById('save-draft');
    if (saveDraftBtn) {
        saveDraftBtn.addEventListener('click', function() {
            saveCampaignDraft();
        });
    }
    
    // Form submission
    const campaignForm = document.getElementById('campaign-form');
    if (campaignForm) {
        campaignForm.addEventListener('submit', function(e) {
            e.preventDefault();
            sendCampaign();
        });
    }
}

// Toggle between HTML and plain text content
function toggleContentType() {
    const plainEditor = document.getElementById('plain-text-editor');
    const htmlEditor = document.getElementById('html-editor');
    const contentType = document.querySelector('input[name="content-type"]:checked').value;
    
    if (contentType === 'plain') {
        plainEditor.style.display = 'block';
        htmlEditor.style.display = 'none';
    } else {
        plainEditor.style.display = 'none';
        htmlEditor.style.display = 'block';
    }
}

// Load SMTP settings from storage
function loadSmtpSettings() {
    const smtpSettings = getSmtpSettings();
    
    if (smtpSettings) {
        const hostField = document.getElementById('smtp-host');
        const portField = document.getElementById('smtp-port');
        const usernameField = document.getElementById('smtp-username');
        const passwordField = document.getElementById('smtp-password');
        const tlsCheckbox = document.getElementById('use-tls');
        const delayField = document.getElementById('email-delay');
        const testEmailField = document.getElementById('test-email');
        
        if (hostField && smtpSettings.host) hostField.value = smtpSettings.host;
        if (portField && smtpSettings.port) portField.value = smtpSettings.port;
        if (usernameField && smtpSettings.username) usernameField.value = smtpSettings.username;
        if (passwordField && smtpSettings.password) passwordField.value = smtpSettings.password;
        if (tlsCheckbox && typeof smtpSettings.useTls !== 'undefined') tlsCheckbox.checked = smtpSettings.useTls;
        if (delayField && typeof smtpSettings.delaySeconds !== 'undefined') delayField.value = smtpSettings.delaySeconds;
        if (testEmailField && smtpSettings.testEmail) testEmailField.value = smtpSettings.testEmail;
    }
}

// Handle recipient file upload
function handleRecipientFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        const emails = processEmailList(content);
        
        // Update textarea with the emails
        const recipientsPaste = document.getElementById('recipients-paste');
        if (recipientsPaste) {
            recipientsPaste.value = emails.join('\n');
        }
        
        updateRecipientsPreview(emails);
    };
    
    reader.readAsText(file);
}

// Update recipients preview
function updateRecipientsPreview(emails) {
    const previewContainer = document.getElementById('recipients-preview-container');
    const previewTable = document.getElementById('recipients-preview');
    const recipientCount = document.getElementById('recipient-count');
    
    if (!previewContainer || !previewTable || !recipientCount) return;
    
    if (emails.length === 0) {
        previewContainer.style.display = 'none';
        return;
    }
    
    previewContainer.style.display = 'block';
    recipientCount.textContent = `${emails.length} recipients`;
    
    let html = '';
    emails.slice(0, 10).forEach((email, index) => {
        html += `
            <tr>
                <td>${index + 1}</td>
                <td>${email}</td>
            </tr>
        `;
    });
    
    if (emails.length > 10) {
        html += `
            <tr>
                <td colspan="2" class="text-center">... and ${emails.length - 10} more</td>
            </tr>
        `;
    }
    
    previewTable.querySelector('tbody').innerHTML = html;
}

// Handle HTML file upload
function handleHtmlFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const content = e.target.result;
        
        // Update HTML content textarea
        const htmlContent = document.getElementById('html-content');
        if (htmlContent) {
            htmlContent.value = content;
        }
        
        updateHtmlPreview(content);
    };
    
    reader.readAsText(file);
}

// Update HTML preview
function updateHtmlPreview(html) {
    const previewContainer = document.getElementById('html-preview');
    if (!previewContainer) return;
    
    if (!html) {
        previewContainer.innerHTML = `<div class="text-center text-muted">HTML preview will appear here</div>`;
        return;
    }
    
    previewContainer.innerHTML = html;
}

// Test SMTP connection
function testSmtpConnection() {
    const smtpHost = document.getElementById('smtp-host').value.trim();
    const smtpPort = document.getElementById('smtp-port').value.trim();
    const smtpUsername = document.getElementById('smtp-username').value.trim();
    const smtpPassword = document.getElementById('smtp-password').value.trim();
    const useTls = document.getElementById('use-tls').checked;
    
    if (!smtpHost || !smtpPort || !smtpUsername || !smtpPassword) {
        showAlert('Please fill out all SMTP fields', 'warning');
        return;
    }
    
    // Show a loading state
    const testButton = document.getElementById('test-smtp');
    const originalText = testButton.innerHTML;
    testButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
    testButton.disabled = true;
    
    // Get test email from the dedicated test email input field
    const testEmail = document.getElementById('test-email').value.trim();
    if (!testEmail) {
        testButton.innerHTML = originalText;
        testButton.disabled = false;
        showAlert('Please enter a Test Email Address for testing', 'warning');
        return;
    }
    
    // Make API call to test the connection
    fetch('/api/smtp/test', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            smtp_settings: {
                host: smtpHost,
                port: parseInt(smtpPort, 10),
                username: smtpUsername,
                password: smtpPassword,
                use_tls: useTls
            },
            test_email: testEmail
        })
    })
    .then(response => response.json())
    .then(data => {
        testButton.innerHTML = originalText;
        testButton.disabled = false;
        
        if (data.success) {
            showAlert('SMTP connection successful! Test email sent.', 'success');
        } else {
            showAlert(`SMTP connection failed: ${data.message}`, 'danger');
        }
    })
    .catch(error => {
        testButton.innerHTML = originalText;
        testButton.disabled = false;
        showAlert(`Error testing SMTP: ${error.message}`, 'danger');
    });
}

// Load default settings from storage
function loadDefaultSettings() {
    const settings = getSettings();
    const smtp = getSmtpSettings();
    
    // Apply settings if available
    if (settings) {
        const fromNameField = document.getElementById('from-name');
        const replyToField = document.getElementById('reply-to');
        
        if (fromNameField && settings.defaultFromName) {
            fromNameField.value = settings.defaultFromName;
        }
        
        if (replyToField && settings.defaultReplyTo) {
            replyToField.value = settings.defaultReplyTo;
        }
    }
    
    // Apply SMTP settings if available
    if (smtp) {
        const hostField = document.getElementById('smtp-host');
        const portField = document.getElementById('smtp-port');
        const usernameField = document.getElementById('smtp-username');
        const passwordField = document.getElementById('smtp-password');
        const tlsCheckbox = document.getElementById('use-tls');
        
        // Set values from stored settings
        if (hostField && smtp.host) hostField.value = smtp.host;
        if (portField && smtp.port) portField.value = smtp.port;
        if (usernameField && smtp.username) usernameField.value = smtp.username;
        if (passwordField && smtp.password) passwordField.value = smtp.password;
        if (tlsCheckbox && typeof smtp.useTls !== 'undefined') tlsCheckbox.checked = smtp.useTls;
        
        // Set delay value if available
        const delayField = document.getElementById('email-delay');
        if (delayField && typeof smtp.delaySeconds !== 'undefined') delayField.value = smtp.delaySeconds;
        
        // Set test email if available
        const testEmailField = document.getElementById('test-email');
        if (testEmailField && smtp.testEmail) testEmailField.value = smtp.testEmail;
    }
}

// Load campaign for duplication
function loadCampaignForDuplication(campaignId) {
    const campaign = getCampaign(campaignId);
    if (!campaign) {
        showAlert('Campaign not found for duplication', 'danger');
        return;
    }
    
    // Fill in form fields
    document.getElementById('campaign-name').value = campaign.name + ' (Copy)';
    document.getElementById('campaign-subject').value = campaign.subject;
    document.getElementById('from-name').value = campaign.from_name;
    document.getElementById('reply-to').value = campaign.reply_to;
    
    // Set content type
    if (campaign.content_type === 'html') {
        document.getElementById('content-type-html').checked = true;
    } else {
        document.getElementById('content-type-plain').checked = true;
    }
    toggleContentType();
    
    // Set content
    if (campaign.content_type === 'html') {
        document.getElementById('html-content').value = campaign.content;
        updateHtmlPreview(campaign.content);
    } else {
        document.getElementById('plain-content').value = campaign.content;
    }
    
    // Set recipients
    if (campaign.recipients && campaign.recipients.length > 0) {
        let recipientsList;
        if (typeof campaign.recipients[0] === 'object') {
            recipientsList = campaign.recipients.map(r => r.email);
        } else {
            recipientsList = campaign.recipients;
        }
        
        document.getElementById('recipients-paste').value = recipientsList.join('\n');
        updateRecipientsPreview(recipientsList);
    }
    
    showAlert('Campaign loaded for duplication', 'info');
}

// Save campaign as draft
function saveCampaignDraft() {
    const campaignData = collectCampaignData();
    
    if (!campaignData.name) {
        showAlert('Campaign name is required', 'warning');
        return;
    }
    
    campaignData.status = 'draft';
    campaignData.id = generateUUID();
    campaignData.created_at = new Date().toISOString();
    
    if (saveCampaign(campaignData)) {
        showAlert('Campaign saved as draft', 'success');
        
        // Redirect to campaigns list after a short delay
        setTimeout(() => {
            window.location.href = '/campaigns';
        }, 1500);
    } else {
        showAlert('Failed to save campaign', 'danger');
    }
}

// Collect data from campaign form
function collectCampaignData() {
    const contentType = document.querySelector('input[name="content-type"]:checked').value;
    let content = '';
    
    if (contentType === 'plain') {
        content = document.getElementById('plain-content').value;
    } else {
        content = document.getElementById('html-content').value;
    }
    
    const recipientsText = document.getElementById('recipients-paste').value;
    const recipients = processEmailList(recipientsText);
    
    // Use SMTP username as the from_email
    const fromEmail = document.getElementById('smtp-username').value.trim();

    return {
        name: document.getElementById('campaign-name').value.trim(),
        subject: document.getElementById('campaign-subject').value.trim(),
        from_name: document.getElementById('from-name').value.trim(),
        from_email: fromEmail,
        reply_to: document.getElementById('reply-to').value.trim(),
        content_type: contentType,
        content: content,
        recipients: recipients,
        tracking: {
            opens: 0,
            clicks: 0,
            replies: 0,
            bounces: 0
        }
    };
}

// Send campaign
function sendCampaign() {
    const campaignData = collectCampaignData();
    
    // Validate required fields
    if (!campaignData.name || !campaignData.subject || !campaignData.from_name || 
        !campaignData.reply_to || !campaignData.content) {
        showAlert('Please fill out all required fields', 'warning');
        return;
    }
    
    // Validate recipients
    if (!campaignData.recipients || campaignData.recipients.length === 0) {
        showAlert('Please add at least one recipient', 'warning');
        return;
    }
    
    // Get SMTP settings
    const delayValue = document.getElementById('email-delay').value.trim();
    console.log('Email delay value:', delayValue);
    
    const smtpSettings = {
        host: document.getElementById('smtp-host').value.trim(),
        port: parseInt(document.getElementById('smtp-port').value.trim(), 10),
        username: document.getElementById('smtp-username').value.trim(),
        password: document.getElementById('smtp-password').value.trim(),
        use_tls: document.getElementById('use-tls').checked,
        delay_seconds: parseInt(delayValue || '0', 10)
    };
    
    // Log the actual delay that will be used
    console.log('Final email delay in seconds:', smtpSettings.delay_seconds);
    
    // Validate SMTP settings
    if (!smtpSettings.host || !smtpSettings.port || !smtpSettings.username || !smtpSettings.password) {
        showAlert('Please fill out all SMTP fields', 'warning');
        return;
    }
    
    // Show sending modal
    const sendingModal = new bootstrap.Modal(document.getElementById('sendingModal'));
    sendingModal.show();
    
    // Update progress status
    const sendProgress = document.getElementById('send-progress');
    const sendStatus = document.getElementById('send-status');
    
    sendProgress.style.width = '10%';
    sendStatus.textContent = 'Preparing campaign...';
    
    // In a real app, this would be sent to the server
    // For our localStorage demo, we'll simulate the sending process
    
    // Save as a new campaign
    campaignData.id = generateUUID();
    campaignData.created_at = new Date().toISOString();
    campaignData.status = 'sending';
    
    // Save initial state
    saveCampaign(campaignData);
    
    sendProgress.style.width = '20%';
    sendStatus.textContent = 'Sending emails...';
    
    // Make API call to backend to send emails
    fetch('/api/campaigns/send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            campaign: campaignData,
            smtp_settings: smtpSettings
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            sendProgress.style.width = '100%';
            sendStatus.textContent = data.message;
            
            // Update campaign status
            campaignData.status = 'sent';
            saveCampaign(campaignData);
            
            // Show success message and redirect
            setTimeout(() => {
                sendingModal.hide();
                showAlert('Campaign successfully sent!', 'success');
                
                // Save SMTP settings for future use
                saveSmtpSettings({
                    host: smtpSettings.host,
                    port: smtpSettings.port,
                    username: smtpSettings.username,
                    password: smtpSettings.password,
                    useTls: smtpSettings.use_tls,
                    delaySeconds: smtpSettings.delay_seconds
                });
                
                // Redirect to campaigns list
                setTimeout(() => {
                    window.location.href = '/campaigns';
                }, 1000);
            }, 2000);
        } else {
            throw new Error(data.message || 'Failed to send campaign');
        }
    })
    .catch(error => {
        console.error('Error sending campaign:', error);
        
        // Update campaign status
        campaignData.status = 'failed';
        saveCampaign(campaignData);
        
        // Show error message
        sendingModal.hide();
        showAlert(`Error sending campaign: ${error.message}`, 'danger');
    });
}
