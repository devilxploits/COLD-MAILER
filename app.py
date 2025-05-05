import os
import logging
import json
import uuid
from datetime import datetime
from flask import Flask, render_template, request, jsonify, redirect, url_for, send_file
from flask_cors import CORS
from utils.email_sender import send_campaign_emails
from utils.tracking import generate_tracking_pixel, register_tracking_data

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "default-secret-key")
CORS(app)  # Enable CORS for API endpoints

# Routes for main pages
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/dashboard')
def dashboard():
    return render_template('dashboard.html')

@app.route('/campaigns')
def campaigns():
    return render_template('campaigns.html')

@app.route('/new-campaign')
def new_campaign():
    return render_template('new_campaign.html')

@app.route('/settings')
def settings():
    return render_template('settings.html')

# API Routes
@app.route('/api/campaigns', methods=['POST'])
def create_campaign():
    try:
        data = request.json
        campaign_id = str(uuid.uuid4())
        campaign_data = {
            'id': campaign_id,
            'name': data.get('name'),
            'subject': data.get('subject'),
            'from_name': data.get('from_name'),
            'from_email': data.get('from_email'),
            'reply_to': data.get('reply_to'),
            'content_type': data.get('content_type'),
            'content': data.get('content'),
            'recipients': data.get('recipients', []),
            'created_at': datetime.now().isoformat(),
            'status': 'draft',
            'tracking': {
                'opens': 0,
                'clicks': 0,
                'replies': 0,
                'bounces': 0
            }
        }
        
        return jsonify({
            'success': True,
            'campaign': campaign_data
        })
    except Exception as e:
        logger.error(f"Error creating campaign: {str(e)}")
        return jsonify({
            'success': False,
            'message': f"Failed to create campaign: {str(e)}"
        }), 500

@app.route('/debug-request', methods=['POST'])
def debug_request():
    """Debug route to examine the request data for encoding issues"""
    try:
        data = request.json
        import json
        
        # Debug the data
        smtp_settings = data.get('smtp_settings', {})
        test_email = data.get('test_email', '')
        
        # Check for non-ASCII characters in each field
        debugInfo = {
            'host': {
                'value': smtp_settings.get('host', ''),
                'has_non_ascii': any(ord(c) > 127 for c in smtp_settings.get('host', ''))
            },
            'username': {
                'value': smtp_settings.get('username', ''),
                'has_non_ascii': any(ord(c) > 127 for c in smtp_settings.get('username', ''))
            },
            'test_email': {
                'value': test_email,
                'has_non_ascii': any(ord(c) > 127 for c in test_email)
            }
        }
        
        return jsonify({
            'success': True,
            'data': debugInfo
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/smtp/test', methods=['POST'])
def test_smtp_connection():
    try:
        # Import core functionality
        import smtplib
        import sys
        import email.message
        
        def encode_header_value(value):
            """Encode a header value to ASCII only, replacing non-ASCII characters."""
            return value.encode('ascii', 'replace').decode('ascii')
        
        data = request.json
        smtp_settings = data.get('smtp_settings', {})
        # Use the provided test email or fall back to the SMTP username
        test_email = data.get('test_email', '')
        if not test_email:
            test_email = smtp_settings.get('username', '')
            
        # IMPORTANT: Test emails never use delay - they should send immediately
        # We explicitly set delay_seconds to 0 regardless of any settings
        
        # Debug: Check the raw password for any problematic characters
        password_raw = smtp_settings.get('password', '')
        logger.info(f"Password length: {len(password_raw)}")
        
        # Log each character to identify potential issues
        for i, c in enumerate(password_raw):
            logger.info(f"Character at position {i}: '{c}' - Unicode: {ord(c)}")
        
        # Fix non-breaking spaces (Unicode 160) - convert to regular spaces (Unicode 32)
        fixed_password = ''
        for c in password_raw:
            if ord(c) == 160:  # Non-breaking space
                fixed_password += ' '  # Regular space
            elif ord(c) < 128:  # ASCII
                fixed_password += c
            else:  # Other non-ASCII
                fixed_password += ' '  # Replace with space
                
        # For debugging
        logger.info(f"Original password with repr: {repr(password_raw)}")
        logger.info(f"Fixed password with repr: {repr(fixed_password)}")
        
        # Use the fixed password (which will convert non-breaking spaces to regular spaces)
        password = fixed_password
        
        # Ensure all values are properly encoded as ASCII strings
        host = encode_header_value(smtp_settings.get('host', ''))
        port = int(smtp_settings.get('port', 587))
        username = encode_header_value(smtp_settings.get('username', ''))
        use_tls = smtp_settings.get('use_tls', True)
        
        # Debug the sanitized data
        logger.info(f"Using host: '{host}', port: {port}, username: '{username}'")
        logger.info(f"Sending to: '{test_email}'")
        
        # Create a completely empty message to avoid any module-specific issues
        msg = email.message.EmailMessage()
        
        # Add headers manually with encoding
        msg['Subject'] = encode_header_value('Test Email from Cold Mailer')
        # Use a nice from name instead of just the email address
        from email.utils import formataddr
        formatted_from = formataddr(("Cold Mailer", username))
        msg['From'] = encode_header_value(formatted_from)
        msg['To'] = encode_header_value(test_email)
        # Use Reply-To header from settings
        reply_to = os.getenv('REPLY_TO', username)
        msg['Reply-To'] = encode_header_value(reply_to)
        
        # Add content (plain text only)
        msg.set_content('This is a test email from Cold Mailer. If you can see this, your SMTP settings are working correctly!')
        
        # Connect to server
        if use_tls:
            logger.info(f"Connecting to {host}:{port} with TLS")
            server = smtplib.SMTP(host, port)
            server.starttls()
        else:
            logger.info(f"Connecting to {host}:{port} without TLS")
            server = smtplib.SMTP_SSL(host, port)
        
        # Login
        logger.info(f"Logging in as {username}")
        server.login(username, password)
        
        # Send email
        msg_str = msg.as_string()
        from_addr = username
        to_addrs = [test_email]
        logger.info(f"Sending from {from_addr} to {to_addrs}")
        server.sendmail(from_addr, to_addrs, msg_str)
        
        # Quit server
        server.quit()
        
        logger.info("Email sent successfully!")
        return jsonify({
            'success': True,
            'message': f"Test email sent successfully to {test_email}"
        })
        
    except Exception as e:
        logger.error(f"Error testing SMTP: {str(e)}")
        
        # Log the full traceback for debugging
        import traceback
        logger.error(traceback.format_exc())
        
        # Handle common errors more gracefully
        error_message = str(e)
        if 'ascii' in error_message and ('ord' in error_message or 'encode' in error_message):
            return jsonify({
                'success': False,
                'message': "Failed due to encoding issues. Please try again with a simpler password without special characters."
            }), 500
        elif 'Authentication' in error_message:
            return jsonify({
                'success': False,
                'message': "Authentication failed. Check your username and password."
            }), 500
        elif 'SMTP connect' in error_message or 'Connection refused' in error_message:
            return jsonify({
                'success': False,
                'message': "Could not connect to the SMTP server. Check your host and port settings."
            }), 500
        else:
            return jsonify({
                'success': False,
                'message': f"Failed to test SMTP: {error_message}"
            }), 500

@app.route('/api/campaigns/send', methods=['POST'])
def send_campaign():
    try:
        # Helper functions for encoding/sanitizing
        def encode_header_value(value):
            """Encode a header value to ASCII only, replacing non-ASCII characters."""
            return value.encode('ascii', 'replace').decode('ascii')
        
        def sanitize_password(pwd):
            """Clean up password to be valid ASCII by removing non-ASCII chars."""
            # Replace any non-ASCII char with regular space
            return ''.join(c if ord(c) < 128 else ' ' for c in pwd)
            
        data = request.json
        campaign_data = data.get('campaign')
        smtp_settings = data.get('smtp_settings')
        
        # Get the delay between emails (new feature)
        delay_seconds = int(smtp_settings.get('delay_seconds', 0))
        logger.info(f"Email delay set to {delay_seconds} seconds between emails")
        
        # Get the recipients for this campaign from the campaign data
        recipients = campaign_data.get('recipients', [])
        recipients_with_tracking = []
        
        # If no recipients, don't send any emails (user must provide recipients)
        if not recipients:
            # Don't add any default recipients - user must specify them
            pass
        else:
            # Process each recipient
            for email in recipients:
                tracking_id = str(uuid.uuid4())
                # Recipient can be string or object
                if isinstance(email, dict):
                    # Object with email property
                    email_address = email.get('email', '')
                else:
                    # Just a string email address
                    email_address = email
                
                # Send to the actual recipient email
                recipients_with_tracking.append({
                    'email': email_address,  # Use the actual recipient email
                    'tracking_id': tracking_id,
                    'first_name': '',
                    'last_name': ''
                })
        
        # Debug: Check the raw password for any problematic characters
        password_raw = smtp_settings.get('password', '')
        logger.info(f"Password length for campaign: {len(password_raw)}")
        for i, c in enumerate(password_raw):
            logger.info(f"Character at position {i}: '{c}' - Unicode: {ord(c)}")
        
        # Fix non-breaking spaces (Unicode 160) - convert to regular spaces (Unicode 32)
        fixed_password = ''
        for c in password_raw:
            if ord(c) == 160:  # Non-breaking space
                fixed_password += ' '  # Regular space
            elif ord(c) < 128:  # ASCII
                fixed_password += c
            else:  # Other non-ASCII
                fixed_password += ' '  # Replace with space
        
        # For debugging
        logger.info(f"Original campaign password with repr: {repr(password_raw)}")
        logger.info(f"Fixed campaign password with repr: {repr(fixed_password)}")
        
        # Ensure all values are properly encoded as ASCII strings
        host = encode_header_value(smtp_settings.get('host', ''))
        port = int(smtp_settings.get('port', 587))
        username = encode_header_value(smtp_settings.get('username', ''))
        
        # Use the fixed password
        password = fixed_password
            
        use_tls = smtp_settings.get('use_tls', True)
        subject = encode_header_value(campaign_data.get('subject', ''))
        reply_to = encode_header_value(campaign_data.get('reply_to', ''))
        
        # Add tracking to content if HTML
        content = campaign_data.get('content', '')
        if campaign_data.get('content_type') == 'html':
            for recipient in recipients_with_tracking:
                # We'll create individual tracking for each recipient
                tracking_pixel = generate_tracking_pixel(campaign_data['id'], recipient['tracking_id'])
                recipient['content'] = content + tracking_pixel
        else:
            # For plain text emails, no tracking pixel (will track opens via links only)
            for recipient in recipients_with_tracking:
                recipient['content'] = content
        
        # Send the emails in a background thread using our custom thread approach
        def send_emails_thread():
            sent_count = 0
            failed_count = 0
            import smtplib
            import email.message
            import time
            
            for recipient in recipients_with_tracking:
                # If this is not the first email and delay is set, wait before sending the next email
                if sent_count > 0 and delay_seconds > 0:
                    logger.info(f"⏱️ DELAY: Waiting {delay_seconds} seconds before sending next email...")
                    # Add more prominent logging before and after the delay
                    print(f"⏱️ EMAIL DELAY: Pausing for {delay_seconds} seconds before sending to: {recipient['email']}")
                    
                    # Special test function to make the delay visible even without real SMTP
                    # This will simulate an email sending process
                    for second in range(delay_seconds):
                        print(f"⏱️ Delay: {second+1}/{delay_seconds} seconds...")
                        time.sleep(1)
                    
                    print(f"⏱️ EMAIL DELAY: Finished waiting, now sending to: {recipient['email']}")
                    logger.info(f"⏱️ DELAY: Finished waiting {delay_seconds} seconds, now sending to {recipient['email']}")
                else:
                    # First email - no delay
                    if sent_count == 0:
                        print(f"📧 First email sends immediately - no delay for first email in campaign")
                        logger.info(f"📧 First email to {recipient['email']} - sending immediately without delay")
                try:
                    # Log that we're processing this email
                    print(f"📧 Processing email to: {recipient['email']}")
                    
                    # Create a completely empty message to avoid any module-specific issues
                    msg = email.message.EmailMessage()
                    
                    # Add headers manually with encoding
                    msg['Subject'] = subject
                    # Use a nice from name instead of just the email address
                    from email.utils import formataddr
                    from_name = campaign_data.get('from_name', 'Cold Mailer')
                    msg['From'] = formataddr((from_name, username))
                    msg['To'] = recipient['email']
                    
                    # Use Reply-To header from settings or fall back to from_email
                    reply_to_value = reply_to if reply_to else os.getenv('REPLY_TO', username)
                    msg['Reply-To'] = reply_to_value
                    
                    # Add content based on type
                    if campaign_data.get('content_type') == 'html':
                        msg.set_content(recipient['content'], subtype='html')
                    else:
                        msg.set_content(content)
                    
                    # Convert to string to handle any encoding issues
                    msg_str = msg.as_string()
                    
                    # Connect to server
                    if use_tls:
                        server = smtplib.SMTP(host, port)
                        server.starttls()
                    else:
                        server = smtplib.SMTP_SSL(host, port)
                    
                    # Login
                    server.login(username, password)
                    
                    # Send email using sendmail to bypass encoding issues
                    from_addr = username
                    to_addrs = [recipient['email']]
                    server.sendmail(from_addr, to_addrs, msg_str)
                    
                    # Quit server
                    server.quit()
                    
                    sent_count += 1
                    logger.info(f"Email sent successfully to {recipient['email']}")
                    
                except Exception as e:
                    failed_count += 1
                    logger.error(f"Failed to send email to {recipient['email']}: {str(e)}")
                    
                    # More detailed logging for debugging
                    import traceback
                    logger.error(traceback.format_exc())
            
            logger.info(f"Campaign {campaign_data['id']} completed: {sent_count} sent, {failed_count} failed")
            
        # Start thread
        import threading
        email_thread = threading.Thread(target=send_emails_thread)
        email_thread.daemon = True
        email_thread.start()
        
        return jsonify({
            'success': True,
            'message': f"Campaign is being sent to {len(recipients_with_tracking)} recipients"
        })
    except Exception as e:
        logger.error(f"Error sending campaign: {str(e)}")
        
        # Log full error details
        import traceback
        logger.error(traceback.format_exc())
        
        # Handle common errors gracefully
        error_message = str(e)
        if 'ascii' in error_message and ('ord' in error_message or 'encode' in error_message):
            return jsonify({
                'success': False,
                'message': "Failed due to encoding issues. Try avoiding special characters."
            }), 500
        elif 'Authentication' in error_message:
            return jsonify({
                'success': False,
                'message': "Authentication failed. Check your username and password."
            }), 500
        elif 'SMTP connect' in error_message or 'Connection refused' in error_message:
            return jsonify({
                'success': False,
                'message': "Could not connect to the SMTP server. Check your host and port settings."
            }), 500
        else:
            return jsonify({
                'success': False,
                'message': f"Failed to send campaign: {error_message}"
            }), 500

@app.route('/tracking/<campaign_id>/<tracking_id>', methods=['GET'])
def track_open(campaign_id, tracking_id):
    """Track email opens via transparent pixel"""
    try:
        register_tracking_data(campaign_id, tracking_id, 'open')
        # Return a 1x1 transparent GIF
        return send_file('static/img/pixel.gif', mimetype='image/gif')
    except Exception as e:
        logger.error(f"Error tracking open: {str(e)}")
        return send_file('static/img/pixel.gif', mimetype='image/gif')

@app.route('/click/<campaign_id>/<tracking_id>/<path:url>', methods=['GET'])
def track_click(campaign_id, tracking_id, url):
    """Track email link clicks and redirect to the original URL"""
    try:
        register_tracking_data(campaign_id, tracking_id, 'click')
        return redirect(url)
    except Exception as e:
        logger.error(f"Error tracking click: {str(e)}")
        return redirect(url)

@app.route('/test-delay/<int:seconds>', methods=['GET'])
def test_delay(seconds):
    """Test route to demonstrate email delay functionality without needing actual SMTP"""
    import threading
    import time
    import uuid
    
    # Safety limit for testing
    if seconds > 10:
        seconds = 10
    
    def send_delayed_emails():
        recipients = [
            {"email": "test1@example.com", "tracking_id": str(uuid.uuid4()), "note": "First email - no delay"},
            {"email": "test2@example.com", "tracking_id": str(uuid.uuid4()), "note": "Second email - with delay"},
            {"email": "test3@example.com", "tracking_id": str(uuid.uuid4()), "note": "Third email - with delay"}
        ]
        
        sent_count = 0
        
        # Process each recipient
        for recipient in recipients:
            # If this is not the first email and delay is set, wait before sending the next email
            if sent_count > 0 and seconds > 0:
                logger.info(f"⏱️ DELAY TEST: Waiting {seconds} seconds before sending next email...")
                print(f"⏱️ DELAY TEST: Pausing for {seconds} seconds before sending to: {recipient['email']}")
                
                # Show countdown
                for second in range(seconds):
                    remaining = seconds - second
                    print(f"⏱️ Delay: {second+1}/{seconds} seconds... ({remaining} seconds remaining)")
                    time.sleep(1)
                
                print(f"⏱️ DELAY TEST: Finished waiting, now processing: {recipient['email']}")
            else:
                # First email - no delay
                print(f"📧 First email sends immediately - no delay for first email in a campaign")
            
            print(f"📧 Would send email to: {recipient['email']} ({recipient['note']})")
            sent_count += 1
            time.sleep(0.5)  # Small delay for simulation
        
        print(f"✅ Test complete: {sent_count} emails would be sent with {seconds} second delay between them (except first email)")
    
    # Start thread
    delay_thread = threading.Thread(target=send_delayed_emails)
    delay_thread.daemon = True
    delay_thread.start()
    
    return f"""
    <html>
    <head>
        <title>Email Delay Test</title>
        <meta http-equiv="refresh" content="2;url=/">
    </head>
    <body>
        <h1>Email Delay Test Started</h1>
        <p>Testing {seconds} second delay between emails for 3 recipients.</p>
        <p>Check the console logs to see the delay in action!</p>
        <p>Redirecting to home page in 2 seconds...</p>
    </body>
    </html>
    """

@app.route('/test-direct-smtp', methods=['GET'])
def test_direct_smtp():
    """A direct test route for SMTP that uses our known working code"""
    import smtplib
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText
    import time
    
    try:
        # Email settings
        smtp_host = "smtp.gmail.com"
        smtp_port = 587
        smtp_username = "your-email@gmail.com"  # REPLACE WITH YOUR EMAIL
        smtp_password = "your-app-password"     # REPLACE WITH YOUR APP PASSWORD
        
        # Use the user's reply-to email as the test recipient
        test_email = os.getenv('REPLY_TO', smtp_username)
        
        # Create message
        msg = MIMEMultipart()
        msg['Subject'] = f"Test Email from Cold Mailer App - {int(time.time())}"
        # Use a nice from name instead of just the email address
        from email.utils import formataddr
        msg['From'] = formataddr(("Cold Mailer App", smtp_username))
        msg['To'] = test_email
        # Use Reply-To header from settings 
        reply_to = os.getenv('REPLY_TO', smtp_username)
        msg['Reply-To'] = reply_to
        
        # Email body with timestamp to uniquely identify this email
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        body = f"""Hello!

This is a simple test message from the Cold Mailer app sent at {timestamp}.

Please reply to this email to confirm you received it.

-------
From: {smtp_username}
To: {test_email}
Time: {timestamp}
"""
        msg.attach(MIMEText(body, 'plain'))
        
        # Set a response header
        headers = []
        
        # Connect to server with debugging enabled
        logger.info(f"Connecting to {smtp_host}:{smtp_port}")
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.set_debuglevel(1)  # Enable verbose debug output
        headers.append(f"Connected to server: {smtp_host}:{smtp_port}")
        
        # EHLO and STARTTLS
        logger.info("Sending EHLO")
        ehlo_resp = server.ehlo()
        headers.append(f"EHLO response: {ehlo_resp}")
        
        logger.info("Starting TLS")
        starttls_resp = server.starttls()
        headers.append(f"STARTTLS response: {starttls_resp}")
        
        # Login
        logger.info(f"Logging in as {smtp_username}")
        login_resp = server.login(smtp_username, smtp_password)
        headers.append(f"Login response: {login_resp}")
        
        # Send email
        logger.info(f"Sending email to {test_email}")
        send_resp = server.send_message(msg)
        
        if not send_resp:
            headers.append("Email accepted by server for delivery")
        else:
            headers.append(f"Server reported issues with recipients: {send_resp}")
        
        # Quit server
        logger.info("Quitting SMTP session")
        quit_resp = server.quit()
        headers.append(f"QUIT response: {quit_resp}")
        
        # Combine all debug info
        debug_info = "<br>".join(headers)
        
        return f"""
        <html>
        <head><title>Direct SMTP Test</title></head>
        <body>
            <h1>Test Email Sent!</h1>
            <p>An email has been sent to: <strong>{test_email}</strong></p>
            <p>Subject: Test Email from Cold Mailer App - {int(time.time())}</p>
            <p>Please check your inbox (and spam/junk folders).</p>
            
            <h2>SMTP Session Details:</h2>
            <div style="background-color: #f0f0f0; padding: 10px; font-family: monospace;">
                {debug_info}
            </div>
            
            <hr>
            <p><a href="/">Back to Home</a></p>
        </body>
        </html>
        """
    except Exception as e:
        logger.error(f"Error in direct SMTP test: {str(e)}")
        
        # Log the full traceback for debugging
        import traceback
        logger.error(traceback.format_exc())
        
        error_details = f"<pre>{traceback.format_exc()}</pre>"
        
        return f"""
        <html>
        <head><title>Direct SMTP Test Failed</title></head>
        <body>
            <h1>Test Email Failed!</h1>
            <p>Error: <strong>{str(e)}</strong></p>
            
            <h2>Error Details:</h2>
            <div style="background-color: #fff0f0; padding: 10px; font-family: monospace;">
                {error_details}
            </div>
            
            <hr>
            <p><a href="/">Back to Home</a></p>
        </body>
        </html>
        """, 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
