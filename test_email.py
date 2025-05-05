import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

def test_smtp_email():
    # Email settings
    smtp_host = "smtp.gmail.com"
    smtp_port = 587
    smtp_username = "your-email@gmail.com"  # REPLACE WITH YOUR EMAIL
    smtp_password = "your-app-password"     # REPLACE WITH YOUR APP PASSWORD
    
    # Create message
    msg = MIMEMultipart()
    msg['From'] = smtp_username
    msg['To'] = smtp_username  # Sending to yourself
    msg['Subject'] = "Test Email from Cold Mailer"
    
    # Email body
    body = "This is a test email from Cold Mailer application. If you received this, the SMTP configuration is working correctly!"
    msg.attach(MIMEText(body, 'plain'))
    
    try:
        # Connect to server
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        
        # Login
        print("Attempting to log in...")
        server.login(smtp_username, smtp_password)
        print("Login successful!")
        
        # Send email
        print("Sending email...")
        server.send_message(msg)
        print("Email sent successfully!")
        
        # Quit server
        server.quit()
        return True
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    print("Testing SMTP email sending...")
    result = test_smtp_email()
    print(f"Test completed with result: {'Success' if result else 'Failed'}")