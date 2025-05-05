import smtplib
from email.message import EmailMessage

def send_simple_test(username, password, test_email):
    """Super-minimalist test without any helper functions or classes"""
    
    # Setup
    host = "smtp.gmail.com"
    port = 587
    
    # Create a simple message
    msg = EmailMessage()
    msg['Subject'] = 'Simple Test'
    msg['From'] = username
    msg['To'] = test_email
    msg.set_content('Simple test email')
    
    # Print each character and its code for debugging
    print("Password length:", len(password))
    for i, c in enumerate(password):
        print(f"Character at position {i}: '{c}' - Unicode: {ord(c)}")
    
    # Fix password by replacing any non-ASCII characters
    fixed_password = ""
    for c in password:
        if ord(c) < 128:
            fixed_password += c
        else:
            fixed_password += " "  # Replace with space
    
    print(f"Original password: '{password}'")
    print(f"Fixed password: '{fixed_password}'")
    
    try:
        # Connect to the server
        server = smtplib.SMTP(host, port)
        server.starttls()
        
        # Try with original password
        try:
            print("Attempting login with original password...")
            server.login(username, password)
            print("Login successful with original password!")
        except Exception as e:
            print(f"Login failed with original password: {str(e)}")
            
            # Try with fixed password
            try:
                print("Attempting login with fixed password...")
                server.login(username, fixed_password)
                print("Login successful with fixed password!")
                
                # Try sending email
                try:
                    server.send_message(msg)
                    print("Email sent successfully!")
                except Exception as e:
                    print(f"Failed to send email: {str(e)}")
            except Exception as e:
                print(f"Login failed with fixed password: {str(e)}")
        
        # Close the connection
        server.quit()
        
    except Exception as e:
        print(f"Failed to connect to server: {str(e)}")

# Test with the given credentials
if __name__ == "__main__":
    username = "your-email@gmail.com"  # REPLACE WITH YOUR EMAIL
    password = "your-app-password"     # REPLACE WITH YOUR APP PASSWORD
    test_email = "recipient@example.com"  # REPLACE WITH YOUR TEST EMAIL
    
    # Use this tool to diagnose password encoding issues
    send_simple_test(username, password, test_email)