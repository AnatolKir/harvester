# Authentication & User Management System Guide

## Overview

The TikTok Domain Harvester now uses a **Magic Link authentication system with Admin approval** for secure, password-free access control.

## For Administrators

### Initial Setup

1. **Admin Email**: Set in Vercel environment variables:

   ```
   ADMIN_EMAILS=rick@highlyeducated.com
   ```

2. **Access Admin Dashboard**:
   - Navigate to: `https://data.highlyeducated.com/admin/users`
   - View pending users, approve/reject with optional reasons

### Managing Users

1. **Review Requests**: Check dashboard or email notifications
2. **Approve Users**: Click "Approve" for trusted team members
3. **Reject Users**: Click "Reject" with optional reason
4. **Monitor Access**: All users shown with status, role, and approval history

## For Team Members

### Getting Access

1. **Request Access**:
   - Go to `https://data.highlyeducated.com/auth/request-access`
   - Enter your full name and email
   - Submit request

2. **Wait for Approval**:
   - Admin receives notification
   - You'll get email once approved

3. **Sign In**:
   - Go to `https://data.highlyeducated.com/auth/login`
   - Enter email address
   - Click "Send Magic Link"
   - Check email for secure link (expires in 1 hour)
   - Click link to sign in

### Using Magic Links

- **No passwords needed** - just your email
- **Links expire in 1 hour** for security
- **One-time use** - each link works once
- **Automatic login** - clicking link signs you in

## System Configuration

### Environment Variables (Vercel)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Admin Emails (comma-separated)
ADMIN_EMAILS=rick@highlyeducated.com

# Email Alerts (Resend)
RESEND_API_KEY=your_resend_key
ALERTS_EMAIL_FROM=hello@data.highlyeducated.com
ALERTS_EMAIL_TO=rick@highlyeducated.com
ALERTS_DRY_RUN=false
```

### SMTP Configuration (Supabase)

- **Host**: smtp.resend.com
- **Port**: 465
- **Username**: resend
- **Password**: Your Resend API key
- **Sender**: hello@data.highlyeducated.com

## Database Schema

### user_profiles Table

- **id**: Unique identifier
- **user_id**: Links to auth.users
- **email**: User's email address
- **role**: 'admin' or 'user'
- **status**: 'pending', 'approved', or 'rejected'
- **approved_by**: Admin who approved
- **approved_at**: Approval timestamp
- **rejected_reason**: Optional rejection reason

## Security Features

1. **Admin-only Approval**: Only admins can approve new users
2. **Row-Level Security**: Users see only appropriate data
3. **Magic Links**: More secure than passwords
4. **Email Verification**: Built into Supabase
5. **Audit Trail**: Track who approved/rejected users

## Troubleshooting

### User Can't Sign In

- Check user status in admin dashboard
- Verify email is approved
- Ensure magic link hasn't expired (1 hour)

### Not Receiving Emails

- Check spam folder
- Verify SMTP settings in Supabase
- Confirm Resend domain is verified
- Check rate limits (Supabase free: 2/hour)

### Admin Access Issues

- Verify email in ADMIN_EMAILS env var
- Check user_profiles table for admin role
- Ensure status is 'approved'

## API Endpoints

- `POST /api/admin/notify-access-request` - Notifies admin of new user
- `GET /api/admin/users` - Fetches all users (admin only)
- `POST /api/admin/users` - Approve/reject users (admin only)

## Pages

- `/auth/login` - Main login page (magic link or password)
- `/auth/request-access` - New user access request
- `/auth/magic-link` - Dedicated magic link page
- `/admin/users` - Admin user management dashboard

## Costs

- **Supabase**: $25/month for Pro (custom SMTP)
- **Resend**: $20/month for 10,000 emails
- **Total Auth Cost**: ~$45/month

## Support

For issues or questions, contact the admin at rick@highlyeducated.com

---

_Last Updated: January 2025_
