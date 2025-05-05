import smtplib
import logging
import threading
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formataddr

logger = logging.getLogger(__name__)

def prepare_email(recipient, subject, from_name, from_email, reply_to, content, content_type):
    """
    Prepare an email message with proper headers and content
    """
    msg = MIMEMultipart('alternative')
    msg['Subject'] = subject
    # Use formataddr to display the sender's name instead of email address
    msg['From'] = formataddr((from_name, from_email))
    msg['To'] = recipient['email']
    
    if reply_to:
        msg['Reply-To'] = reply_to
    
    if content_type == 'plain':
        msg.attach(MIMEText(content, 'plain'))
    else:  # HTML content
        msg.attach(MIMEText(recipient['content'], 'html'))
    
    return msg

def send_email_smtp(msg, smtp_host, smtp_port, smtp_username, smtp_password, use_tls=True):
    """
    Send an email using SMTP
    """
    try:
        if use_tls:
            server = smtplib.SMTP(smtp_host, smtp_port)
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(smtp_host, smtp_port)
            
        server.login(smtp_username, smtp_password)
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return False

def process_campaign_sending(campaign_id, recipients, subject, from_name, from_email, reply_to, 
                             content_type, smtp_host, smtp_port, smtp_username, smtp_password, use_tls, delay_seconds=0):
    """
    Process the actual sending of emails for a campaign
    
    Args:
        campaign_id: Unique identifier for the campaign
        recipients: List of recipients for the emails
        subject: Email subject line
        from_name: Sender name to display
        from_email: Sender email address
        reply_to: Reply-to email address
        content_type: Type of content (html or plain)
        smtp_host: SMTP server hostname
        smtp_port: SMTP server port
        smtp_username: SMTP username
        smtp_password: SMTP password
        use_tls: Whether to use TLS
        delay_seconds: Number of seconds to delay between sending each email (default: 0)
    """
    from utils.tracking import update_campaign_stats
    import time
    
    sent_count = 0
    failed_count = 0
    
    for recipient in recipients:
        try:
            msg = prepare_email(
                recipient=recipient,
                subject=subject,
                from_name=from_name,
                from_email=from_email,
                reply_to=reply_to,
                content=recipient.get('content', ''),
                content_type=content_type
            )
            
            success = send_email_smtp(
                msg=msg,
                smtp_host=smtp_host,
                smtp_port=smtp_port,
                smtp_username=smtp_username,
                smtp_password=smtp_password,
                use_tls=use_tls
            )
            
            if success:
                sent_count += 1
                logger.info(f"Email sent to {recipient['email']} successfully")
            else:
                failed_count += 1
                logger.error(f"Failed to send email to {recipient['email']}")
            
            # If delay is specified and this is not the last recipient, wait
            if delay_seconds > 0 and recipient != recipients[-1]:
                logger.info(f"Waiting {delay_seconds} seconds before sending next email...")
                time.sleep(delay_seconds)
                
        except Exception as e:
            logger.error(f"Error sending to {recipient['email']}: {str(e)}")
            failed_count += 1
    
    # Update campaign statistics
    update_campaign_stats(campaign_id, {
        'sent': sent_count,
        'failed': failed_count
    })
    
    logger.info(f"Campaign {campaign_id} completed: {sent_count} sent, {failed_count} failed")

def send_campaign_emails(campaign_id, recipients, subject, from_name, from_email, reply_to, 
                         content_type, smtp_host, smtp_port, smtp_username, smtp_password, use_tls=True, delay_seconds=0):
    """
    Start a background thread to send campaign emails
    
    Args:
        campaign_id: Unique identifier for the campaign
        recipients: List of recipients for the emails
        subject: Email subject line
        from_name: Sender name to display
        from_email: Sender email address
        reply_to: Reply-to email address
        content_type: Type of content (html or plain)
        smtp_host: SMTP server hostname
        smtp_port: SMTP server port
        smtp_username: SMTP username
        smtp_password: SMTP password
        use_tls: Whether to use TLS (default: True)
        delay_seconds: Number of seconds to delay between sending each email (default: 0)
    """
    # Start a background thread to handle the actual sending
    thread = threading.Thread(
        target=process_campaign_sending,
        args=(
            campaign_id, recipients, subject, from_name, from_email, reply_to, 
            content_type, smtp_host, smtp_port, smtp_username, smtp_password, use_tls, delay_seconds
        )
    )
    thread.daemon = True
    thread.start()
    
    logger.info(f"Started email campaign with delay of {delay_seconds} seconds between emails")
    return True
