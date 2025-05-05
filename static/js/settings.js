// settings.js - Settings page functionality

document.addEventListener('DOMContentLoaded', function() {
    // Load current settings
    loadSettings();
    
    // Setup event handlers for settings forms
    setupSettingsForms();
    
    // Setup storage management
    setupStorageManagement();
});

// Load current settings from localStorage
function loadSettings() {
    const settings = getSettings();
    const useCustomSmtp = localStorage.getItem('useCustomSmtp') === 'true';
    
    // Apply settings if available
    if (settings) {
        const fromNameField = document.getElementById('default-from-name');
        const replyToField = document.getElementById('default-reply-to');
        
        if (fromNameField && settings.defaultFromName) {
            fromNameField.value = settings.defaultFromName;
        }
        
        if (replyToField && settings.defaultReplyTo) {
            replyToField.value = settings.defaultReplyTo;
        }
    }
    
    // Set up SMTP settings
    const smtpSettings = getSmtpSettings();
    if (smtpSettings) {
        document.getElementById('default-smtp-host').value = smtpSettings.host || '';
        document.getElementById('default-smtp-port').value = smtpSettings.port || '587';
        document.getElementById('default-smtp-username').value = smtpSettings.username || '';
        document.getElementById('default-smtp-password').value = smtpSettings.password || '';
        document.getElementById('default-use-tls').checked = smtpSettings.useTls !== false;
        document.getElementById('default-delay-seconds').value = smtpSettings.delaySeconds || '0';
        
        // Set test email if available
        if (smtpSettings.testEmail) {
            document.getElementById('default-test-email').value = smtpSettings.testEmail;
        }
    } else {
        // Default values if no settings exist
        document.getElementById('default-smtp-host').value = 'smtp.gmail.com';
        document.getElementById('default-smtp-port').value = '587';
        document.getElementById('default-smtp-username').value = '';
        document.getElementById('default-smtp-password').value = '';
        document.getElementById('default-use-tls').checked = true;
        document.getElementById('default-delay-seconds').value = '0';
        document.getElementById('default-test-email').value = '';
    }
    
    // Set up SMTP test button
    const testSmtpButton = document.getElementById('test-smtp-button');
    if (testSmtpButton) {
        testSmtpButton.addEventListener('click', function() {
            testSmtpConnection();
        });
    }
    
    // Update storage usage display
    updateStorageUsage();
}

// Test SMTP connection
function testSmtpConnection() {
    const smtpHost = document.getElementById('default-smtp-host').value.trim();
    const smtpPort = document.getElementById('default-smtp-port').value.trim();
    const smtpUsername = document.getElementById('default-smtp-username').value.trim();
    const smtpPassword = document.getElementById('default-smtp-password').value.trim();
    const useTls = document.getElementById('default-use-tls').checked;
    
    if (!smtpHost || !smtpPort || !smtpUsername || !smtpPassword) {
        showAlert('Please fill out all SMTP fields', 'warning');
        return;
    }
    
    // Show a loading state
    const testButton = document.getElementById('test-smtp-button');
    const originalText = testButton.innerHTML;
    testButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
    testButton.disabled = true;
    
    // Get test email from the dedicated test email field
    const testEmail = document.getElementById('default-test-email').value.trim();
    if (!testEmail) {
        testButton.innerHTML = originalText;
        testButton.disabled = false;
        showAlert('Please enter a Test Email Address for testing', 'warning');
        return;
    }
    
    // First, try our debug endpoint to identify encoding issues
    const requestData = {
        smtp_settings: {
            host: smtpHost,
            port: parseInt(smtpPort, 10),
            username: smtpUsername,
            password: smtpPassword,
            use_tls: useTls
        },
        test_email: testEmail
    };
    
    // Debug the data
    console.log("Sending to debug endpoint", requestData);
    
    // First send to debug endpoint
    fetch('/debug-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(debugData => {
        console.log("Debug response:", debugData);
        
        // If there are any non-ASCII characters, alert the user
        if (debugData.success && (
            debugData.data.host.has_non_ascii || 
            debugData.data.username.has_non_ascii || 
            debugData.data.test_email.has_non_ascii
        )) {
            console.warn("Non-ASCII characters detected in data", debugData.data);
            showAlert('Warning: Non-ASCII characters detected in your input. This might cause encoding issues.', 'warning');
        }
        
        // Now proceed with the actual SMTP test
        return fetch('/api/smtp/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
    })
    .then(response => response.json())
    .then(data => {
        testButton.innerHTML = originalText;
        testButton.disabled = false;
        
        if (data.success) {
            showAlert('SMTP connection successful! Test email sent.', 'success');
            
            // Save settings including the test email
            saveSmtpSettings({
                host: smtpHost,
                port: parseInt(smtpPort, 10),
                username: smtpUsername,
                password: smtpPassword,
                useTls: useTls,
                testEmail: testEmail,
                delaySeconds: parseInt(document.getElementById('default-delay-seconds').value.trim() || '0', 10)
            });
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

// Set up event handlers for settings forms
function setupSettingsForms() {
    // SMTP settings form
    const smtpForm = document.getElementById('smtp-settings-form');
    if (smtpForm) {
        smtpForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const host = document.getElementById('default-smtp-host').value.trim();
            const port = document.getElementById('default-smtp-port').value.trim();
            const username = document.getElementById('default-smtp-username').value.trim();
            const password = document.getElementById('default-smtp-password').value.trim();
            const useTls = document.getElementById('default-use-tls').checked;
            const delaySeconds = parseInt(document.getElementById('default-delay-seconds').value.trim() || '0', 10);
            const testEmail = document.getElementById('default-test-email').value.trim();
            
            if (!host || !port || !username || !password) {
                showAlert('Please fill out all SMTP fields', 'warning');
                return;
            }
            
            saveSmtpSettings({
                host: host,
                port: parseInt(port, 10),
                username: username,
                password: password,
                useTls: useTls,
                delaySeconds: delaySeconds,
                testEmail: testEmail
            });
            
            showAlert('SMTP settings saved', 'success');
        });
    }
    
    // Reply-to settings form
    const replyToForm = document.getElementById('reply-to-settings-form');
    if (replyToForm) {
        replyToForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const settings = getSettings();
            settings.defaultReplyTo = document.getElementById('default-reply-to').value.trim();
            
            saveSettings(settings);
            showAlert('Reply-to settings saved', 'success');
        });
    }
    
    // Sender settings form
    const senderForm = document.getElementById('sender-settings-form');
    if (senderForm) {
        senderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const settings = getSettings();
            settings.defaultFromName = document.getElementById('default-from-name').value.trim();
            
            saveSettings(settings);
            showAlert('Sender settings saved', 'success');
        });
    }
}

// Set up storage management
function setupStorageManagement() {
    // Export data button
    const exportBtn = document.getElementById('export-data');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportAllData);
    }
    
    // Import data button
    const importBtn = document.getElementById('import-data');
    if (importBtn) {
        importBtn.addEventListener('click', function() {
            const modal = new bootstrap.Modal(document.getElementById('importDataModal'));
            modal.show();
        });
    }
    
    // Import file handling
    const importFile = document.getElementById('import-file');
    if (importFile) {
        importFile.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const confirmBtn = document.getElementById('confirm-import');
            confirmBtn.disabled = !file;
        });
    }
    
    // Confirm import button
    const confirmImportBtn = document.getElementById('confirm-import');
    if (confirmImportBtn) {
        confirmImportBtn.addEventListener('click', function() {
            const file = document.getElementById('import-file').files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const result = importData(e.target.result);
                    
                    if (result) {
                        bootstrap.Modal.getInstance(document.getElementById('importDataModal')).hide();
                        showAlert('Data imported successfully', 'success');
                        
                        // Reload settings
                        loadSettings();
                    } else {
                        showAlert('Invalid import data format', 'danger');
                    }
                } catch (error) {
                    console.error('Import error:', error);
                    showAlert('Error importing data: ' + error.message, 'danger');
                }
            };
            
            reader.readAsText(file);
        });
    }
    
    // Delete confirmation field
    const deleteConfirmation = document.getElementById('delete-confirmation');
    if (deleteConfirmation) {
        deleteConfirmation.addEventListener('input', function() {
            const confirmBtn = document.getElementById('confirm-clear');
            confirmBtn.disabled = this.value !== 'DELETE';
        });
    }
    
    // Confirm clear button
    const confirmClearBtn = document.getElementById('confirm-clear');
    if (confirmClearBtn) {
        confirmClearBtn.addEventListener('click', function() {
            const confirmation = document.getElementById('delete-confirmation').value;
            
            if (confirmation === 'DELETE') {
                const result = clearAllData();
                
                if (result) {
                    bootstrap.Modal.getInstance(document.getElementById('clearDataModal')).hide();
                    document.getElementById('delete-confirmation').value = '';
                    showAlert('All data has been cleared', 'success');
                    
                    // Reload settings
                    loadSettings();
                } else {
                    showAlert('Error clearing data', 'danger');
                }
            }
        });
    }
}

// Update storage usage display
function updateStorageUsage() {
    const storageUsage = document.getElementById('storage-usage');
    const storageUsageText = document.getElementById('storage-usage-text');
    
    if (!storageUsage || !storageUsageText) return;
    
    const usageKB = calculateStorageUsage();
    const usageMB = usageKB / 1024;
    const percentUsed = Math.min(100, (usageKB / 5120) * 100); // Assuming 5MB limit
    
    storageUsage.style.width = `${percentUsed}%`;
    
    if (usageKB < 1024) {
        storageUsageText.textContent = `${usageKB.toFixed(2)} KB used`;
    } else {
        storageUsageText.textContent = `${usageMB.toFixed(2)} MB used`;
    }
    
    // Change color based on usage
    if (percentUsed > 80) {
        storageUsage.classList.remove('bg-success', 'bg-warning');
        storageUsage.classList.add('bg-danger');
    } else if (percentUsed > 50) {
        storageUsage.classList.remove('bg-success', 'bg-danger');
        storageUsage.classList.add('bg-warning');
    } else {
        storageUsage.classList.remove('bg-warning', 'bg-danger');
        storageUsage.classList.add('bg-success');
    }
}
