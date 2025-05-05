# Cold Mailer

A comprehensive cold emailing platform built with Flask and Vanilla JavaScript, allowing you to create and manage email campaigns with tracking capabilities.

## Features

- Create and manage email campaigns
- Track email opens and clicks
- Support for plain text and HTML emails
- Recipient list import (CSV or direct input)
- Local storage for data persistence
- Customizable SMTP settings
- Mobile-responsive design

## Deployment

### Local Development

1. Clone the repository
2. Install dependencies:
   ```
   pip install -r requirements_render.txt
   ```
3. Run the application:
   ```
   python main.py
   ```
   or with gunicorn:
   ```
   gunicorn --bind 0.0.0.0:5000 main:app
   ```

### Deploying to Render

1. Create a new Web Service in Render
2. Connect your repository
3. Set the following:
   - Environment: Python
   - Build Command: `pip install -r requirements_render.txt`
   - Start Command: `gunicorn main:app --bind 0.0.0.0:$PORT`
4. Add environment variables:
   - `SESSION_SECRET`: A strong secret key for Flask
   - `FLASK_ENV`: Set to `production`
   - `SENDGRID_API_KEY`: (Optional) If you want to use SendGrid for email delivery

## SMTP Configuration

For sending emails, you'll need to configure SMTP settings in the application. For example, with Gmail:

- SMTP Host: smtp.gmail.com
- SMTP Port: 587
- SMTP Username: your.email@gmail.com
- SMTP Password: Your Gmail app password (not your regular password)
- Use TLS: Yes

Note: For Gmail, you need to generate an App Password rather than using your account password.

## Created By

Cold Mailer by Aman Singh 2025