import os

class Config:
    # Flask configuration
    DEBUG = os.getenv('DEBUG', 'False') == 'True'
    TESTING = os.getenv('TESTING', 'False') == 'True'
    
    # Database configuration
    DATABASE = os.getenv('DATABASE', 'cold_mailer.db')
    
    # SMTP configuration
    SMTP_HOST = os.getenv('SMTP_HOST', '')
    SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
    SMTP_USERNAME = os.getenv('SMTP_USERNAME', '')
    SMTP_PASSWORD = os.getenv('SMTP_PASSWORD', '')
    
    # Email configuration
    FROM_EMAIL = os.getenv('FROM_EMAIL', '')
    FROM_NAME = os.getenv('FROM_NAME', 'Cold Mailer')
    REPLY_TO = os.getenv('REPLY_TO', '')
    
    # Application URLs
    BASE_URL = os.getenv('BASE_URL', 'http://localhost:5000')
    
    # Maintenance
    MAINTENANCE_MODE = os.getenv('MAINTENANCE_MODE', 'False') == 'True'
