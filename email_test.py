import sys
import smtplib
import email.message
from email.utils import formataddr

def encode_header_value(value):
    """Encode a header value to ASCII only, replacing non-ASCII characters."""
    return value.encode('ascii', 'replace').decode('ascii')

def send_test_email(host, port, username, password, test_email, use_tls=True):
    print(f"Trying to send test email to {test_email}")
    
    try:
        # Create a message without using any complex MIME classes
        msg = email.message.EmailMessage()
        
        # Add headers manually and ensure they are ASCII only
        msg['Subject'] = encode_header_value('Test Email from Cold Mailer')
        # Format the From field to show a name instead of just the email address
        from_name = "Cold Mailer"
        msg['From'] = encode_header_value(formataddr((from_name, username)))
        msg['To'] = encode_header_value(test_email)
        # Add Reply-To header
        msg['Reply-To'] = encode_header_value("support@weburex.com")
        
        # Add content (plain text only)
        msg.set_content('This is a test email from Cold Mailer. If you can see this, your SMTP configuration is working correctly!')
        
        # Debug the final message headers
        print(f"Message headers: {dict(msg.items())}")
        
        # Convert the entire message to a string and back to analyze
        msg_str = msg.as_string()
        print(f"First 100 chars of message as string: {msg_str[:100]}")
        
        # Connect to server
        if use_tls:
            print(f"Connecting to {host}:{port} with TLS")
            server = smtplib.SMTP(host, port)
            server.set_debuglevel(1)  # Enable debug output
            server.starttls()
        else:
            print(f"Connecting to {host}:{port} without TLS")
            server = smtplib.SMTP_SSL(host, port)
            server.set_debuglevel(1)  # Enable debug output
        
        # Login
        print(f"Logging in as {username}")
        server.login(username, password)
        
        # Send email using the simpler sendmail method instead of send_message
        from_addr = username
        to_addrs = [test_email]
        print(f"Sending from {from_addr} to {to_addrs}")
        server.sendmail(from_addr, to_addrs, msg_str)
        
        # Quit server
        server.quit()
        
        print("Email sent successfully!")
        return True
    except Exception as e:
        print(f"Error: {str(e)}")
        
        # Print more detailed information
        import traceback
        traceback.print_exc()
        
        return False

if __name__ == "__main__":
    # Email settings from command line or use defaults
    host = "smtp.gmail.com"
    port = 587
    username = "your-email@gmail.com"  # REPLACE WITH YOUR EMAIL
    password = "your-app-password"     # REPLACE WITH YOUR APP PASSWORD
    test_email = "recipient@example.com"  # REPLACE WITH YOUR TEST EMAIL
    
    # If arguments are provided, use them
    if len(sys.argv) > 1:
        host = sys.argv[1]
    if len(sys.argv) > 2:
        port = int(sys.argv[2])
    if len(sys.argv) > 3:
        username = sys.argv[3]
    if len(sys.argv) > 4:
        password = sys.argv[4]
    if len(sys.argv) > 5:
        test_email = sys.argv[5]
    
    send_test_email(host, port, username, password, test_email)