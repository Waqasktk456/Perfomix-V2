# Notification Module - Installation & Setup Guide

## 🔧 Backend Setup

### 1. Install Dependencies
```bash
cd server
npm install node-cron
```

### 2. Run Database Migration
Execute the SQL schema to create notification tables:

**Option A - Using MySQL Command Line:**
```bash
mysql -u root -p saas_perfomix < database/notifications_schema.sql
```

**Option B - Using phpMyAdmin or MySQL Workbench:**
1. Open phpMyAdmin or MySQL Workbench
2. Select the `saas_perfomix` database
3. Open the file: `server/database/notifications_schema.sql`
4. Execute the SQL queries

### 3. Restart the Server
```bash
cd server
yarn start
```

The cron job will automatically start and run daily at 9:00 AM to send deadline reminders.

---

## 🎨 Frontend Setup

### 1. Install Lucide React Icons
```bash
cd client
npm install lucide-react
```

### 2. Start the Client
```bash
cd client
npm start
```

---

## ✅ Verify Installation

### Backend Verification:
1. Server should start without errors
2. Check console for: `✓ Cron jobs initialized`
3. Check console for: `Mounted: /api/notifications → notificationRoutes`

### Frontend Verification:
1. You should see a bell icon (🔔) in the top-right header
2. The bell should show a red badge with unread count when you have notifications
3. Clicking the bell should show a dropdown with recent notifications

---

## 🧪 Testing the Notification System

### Test 1: Team Assignment Notification
1. As **Admin**, go to **Evaluation Cycle**
2. Create a new cycle or open an existing draft cycle
3. Assign a team to a Line Manager
4. ✅ The Line Manager should receive a notification

### Test 2: Evaluation Submitted Notification
1. As **Line Manager**, complete an evaluation for a staff member
2. Click "Submit" (not "Save Draft")
3. ✅ The Staff member should receive a notification

### Test 3: Manager Completion Notification
1. As **Line Manager**, complete ALL evaluations assigned to you
2. Submit the last evaluation
3. ✅ The Admin should receive a notification about completion

### Test 4: Cycle Activation Notification
1. As **Admin**, activate an evaluation cycle
2. ✅ All Line Managers and Staff should receive notifications

### Test 5: Manual Reminder (Coming in future update)
- Admin can send custom reminders to selected Line Managers
- API endpoint: `POST /api/notifications/send-reminder`

### Test 6: Automatic Deadline Reminders
- Automatically sends reminders at 7, 3, and 1 days before deadline
- Runs via cron job daily at 9:00 AM
- For testing, you can modify the cron schedule in `server/services/cronJobs.js`

---

## 📍 Notification Bell Location

The notification bell is now visible in the **top-right corner** of the header, between the search bar and the language selector:

```
[Search Bar] | [🔔3] | [English ▼] | [Profile]
```

---

## 🎯 API Endpoints

All notification endpoints are available at `/api/notifications`:

- `GET /api/notifications` - Get all notifications
- `GET /api/notifications/unread-count` - Get unread count
- `GET /api/notifications/:id` - Get specific notification
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/mark-all-read` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification
- `POST /api/notifications/send-reminder` - Send manual reminder (Admin only)

---

## 🎨 Notification Priority Colors

- **🔴 Urgent** (Red border) - 1 day deadline reminders
- **🟠 High** (Orange border) - Team assignments, 3-day reminders
- **🟢 Normal** (Green border) - General notifications
- **⚫ Low** (Gray border) - Information updates

---

## 🐛 Troubleshooting

### Bell icon not showing?
1. Make sure you installed `lucide-react`: `npm install lucide-react`
2. Clear browser cache
3. Check browser console for errors

### No notifications appearing?
1. Verify database tables were created (check `notifications` table)
2. Test by assigning a team to trigger a notification
3. Check browser network tab for API calls to `/api/notifications`

### Server error on startup?
1. Make sure you ran the database migration
2. Check that `node-cron` is installed
3. Verify the notification routes are properly mounted

---

## 📝 Notes

- Notifications are stored in the database
- Unread count updates every 30 seconds automatically
- Notifications older than 30 days (read) can be cleaned up via cron job
- The bell icon will appear for ALL roles (Admin, Line Manager, Staff)
