# Lien Rights Automation

## Overview
Automated weekly checks for lien rights expiration alerts. Sends email notifications to owners/admins when jobs are approaching their 90-day lien rights deadline.

## How It Works

### 1. GitHub Actions Workflow
- **Schedule**: Every Monday at 9:00 AM UTC (4:00 AM EST)
- **File**: `.github/workflows/lien-rights-check.yml`
- **Trigger**: Automatic (weekly) or manual via GitHub Actions UI

### 2. Backend Endpoint
- **Procedure**: `crm.sendLienRightsAlert`
- **File**: `server/routers.ts` (line 1779)
- **Logic**: 
  - Queries all jobs with status "invoiced" and lien rights expiring within 30 days
  - Categorizes as "warning" (15-30 days) or "critical" (0-14 days)
  - Sends email to all owners and admins with job details

### 3. Email Notifications
- **Service**: Built-in notification API
- **Template**: `server/lienRightsNotification.ts`
- **Recipients**: All users with role "owner" or "admin"
- **Content**: 
  - List of jobs approaching deadline
  - Days remaining for each job
  - Direct links to job pages in CRM

## Setup Instructions

### Option 1: GitHub Actions (Recommended)
1. The workflow file is already in place (`.github/workflows/lien-rights-check.yml`)
2. Set up a GitHub Secret for API authentication:
   - Go to repository Settings → Secrets and variables → Actions
   - Add secret: `CRON_API_KEY` (optional - for additional security)
3. The workflow will run automatically every Monday

### Option 2: Manual Trigger
- Go to GitHub Actions tab
- Select "Weekly Lien Rights Check"
- Click "Run workflow"

### Option 3: External Cron Service
If you prefer an external service (e.g., cron-job.org, EasyCron):

```bash
# Endpoint to call
POST https://ndespanels.com/api/trpc/crm.sendLienRightsAlert

# Headers
Content-Type: application/json

# Body
{
  "crmUrl": "https://ndespanels.com"
}
```

## Testing

### Manual Test from Dashboard
1. Log in as Owner or Admin
2. Go to Dashboard
3. Click "Send Lien Rights Alert" button
4. Check email for notification

### Test via API
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"crmUrl": "https://ndespanels.com"}' \
  https://ndespanels.com/api/trpc/crm.sendLienRightsAlert
```

## Monitoring

### Check Workflow Runs
- GitHub → Actions tab → "Weekly Lien Rights Check"
- View run history and logs

### Email Delivery
- Emails are sent via the notification API
- Check server logs for delivery status
- Verify recipients receive emails

## Troubleshooting

### Workflow Not Running
- Check GitHub Actions is enabled for the repository
- Verify the cron schedule syntax
- Check workflow file permissions

### No Emails Sent
- Verify notification API credentials are configured
- Check server environment variables
- Ensure there are jobs with approaching deadlines

### Wrong Recipients
- Verify user roles in database (must be "owner" or "admin")
- Check email addresses are valid in users table

## Customization

### Change Schedule
Edit `.github/workflows/lien-rights-check.yml`:
```yaml
schedule:
  - cron: '0 9 * * 1'  # Monday 9 AM UTC
  # Change to: '0 9 * * 3' for Wednesday
  # Change to: '0 14 * * 1' for Monday 2 PM UTC
```

### Change Alert Thresholds
Edit `server/lienRightsNotification.ts`:
```typescript
// Current: 30 days warning, 14 days critical
// Modify getUrgencyLevel() function
```

### Add More Recipients
Modify query in `sendLienRightsAlertNotification()` to include other roles.

## Status
✅ **Active** - Automated weekly checks enabled
