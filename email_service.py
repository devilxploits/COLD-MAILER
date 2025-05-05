import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage
from string import Template
from flask import current_app

def test_email_connection(host, port, username, password, from_email):
    """Test SMTP connection with the provided credentials"""
    try:
        server = smtplib.SMTP(host, port)
        server.ehlo()
        server.starttls()
        server.login(username, password)
        server.quit()
        return {"success": True}
    except Exception as e:
        return {"success": False, "error": str(e)}

def send_campaign_email(to_email, recipient_name, subject, body_template, tracking_id, contact_data):
    """Send an email for a campaign with tracking"""
    try:
        host = os.getenv('SMTP_HOST', '')
        port = int(os.getenv('SMTP_PORT', '587'))
        username = os.getenv('SMTP_USERNAME', '')
        password = os.getenv('SMTP_PASSWORD', '')
        from_email = os.getenv('FROM_EMAIL', '')
        from_name = os.getenv('FROM_NAME', 'Cold Mailer')
        base_url = os.getenv('BASE_URL', 'http://localhost:5000')
        
        if not all([host, port, username, password, from_email, to_email]):
            raise ValueError("Missing required email configuration or recipient")
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        # Use a nice from name instead of just the email address
        from email.utils import formataddr
        msg['From'] = formataddr((from_name, from_email))
        msg['To'] = to_email
        # Add Reply-To header using the reply_to field from settings if available
        reply_to = os.getenv('REPLY_TO', from_email)
        msg['Reply-To'] = reply_to
        
        # Replace placeholders in the template
        template = Template(body_template)
        
        # Prepare contact data for template substitution
        template_data = {
            'first_name': recipient_name,
            'tracking_pixel': f'<img src="{base_url}/track/open/{tracking_id}" width="1" height="1" alt=""/>'
        }
        
        # Add all contact data fields
        for key, value in contact_data.items():
            if key not in template_data:
                template_data[key] = value
        
        # Replace all placeholders
        html_content = template.safe_substitute(template_data)
        
        # Process any links to add click tracking
        # This is a simple implementation - in a production app, you'd want to use
        # a proper HTML parser to modify links
        import re
        def add_tracking_to_link(match):
            url = match.group(2)
            return f'<a href="{base_url}/track/click/{tracking_id}?url={url}"'
        
        html_content = re.sub(r'(<a\s+href=")([^"]+)"', add_tracking_to_link, html_content)
        
        # Attach HTML content
        part = MIMEText(html_content, 'html')
        msg.attach(part)
        
        # Connect to SMTP server and send
        server = smtplib.SMTP(host, port)
        server.ehlo()
        server.starttls()
        server.login(username, password)
        server.sendmail(from_email, to_email, msg.as_string())
        server.quit()
        
        return {"status": "sent"}
    except Exception as e:
        print(f"Error sending email: {str(e)}")
        return {"status": "error", "error": str(e)}
