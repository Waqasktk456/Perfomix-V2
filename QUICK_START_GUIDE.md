# Performance Ratings System - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Run SQL Migration (YOU DO THIS)
```bash
# Open your MySQL client and run:
mysql -u root -p saas_perfomix < create_performance_ratings_table.sql

# Or use your preferred MySQL tool (phpMyAdmin, MySQL Workbench, etc.)
```

This will:
- Create the `performance_ratings` table
- Add rating columns to `evaluations` table
- Insert default ratings for all existing organizations

### Step 2: Restart Backend Server
```bash
cd server
node index.js
```

Look for this in the logs:
```
Mounted: /api/performance-ratings → performanceRatingRoutes
```

### Step 3: Test the System

#### Access Admin UI
1. Open browser: `http://localhost:3000/performance-ratings`
2. You should see the Performance Ratings Configuration page
3. Try creating a new rating
4. Try editing an existing rating

#### Test Performance Pages
1. Go to Performance Report page
2. View an employee's performance
3. Check that the rating (Excellent, Good, etc.) displays correctly
4. The color should match your database configuration

---

## 📋 What Was Changed

### Files You Need to Know About

**Admin Configuration:**
- `/performance-ratings` - New page to manage ratings

**Updated Pages (now use database ratings):**
- Staff Dashboard
- Line Manager Performance
- Performance Report
- Individual Report
- PDF Exports

**Backend:**
- New API: `/api/performance-ratings`
- All CRUD operations available

---

## 🎨 How to Customize Ratings

### Example: Add a "Outstanding" Rating

1. Go to `/performance-ratings`
2. Click "Add New Rating"
3. Fill in:
   - Name: Outstanding
   - Min Score: 95
   - Max Score: 100
   - Color: Pick a color (e.g., Gold)
   - Display Order: 0 (shows first)
4. Click "Create"

The system will:
- Validate no overlaps
- Check coverage
- Save to database
- Clear cache
- Apply immediately to all pages

---

## 🔍 Troubleshooting

### "Failed to fetch ratings"
- Check backend is running
- Check `/api/performance-ratings` endpoint
- Check browser console for errors

### "Coverage has gaps"
- Ratings must cover 0-100 without gaps
- Example: If you have 0-59 and 70-100, there's a gap at 60-69
- Fix by adjusting ranges

### "Rating range overlaps"
- Two ratings can't have overlapping scores
- Example: 80-90 and 85-95 overlap
- Fix by adjusting ranges

### Ratings not showing on pages
- Clear browser cache
- Check that backend is running
- Check browser console for errors
- Verify SQL migration ran successfully

---

## 📊 Default Configuration

After running the SQL migration, each organization will have:

```
Excellent:         90.00 - 100.00  (Green)
Very Good:         80.00 - 89.99   (Light Green)
Good:              70.00 - 79.99   (Yellow)
Satisfactory:      60.00 - 69.99   (Orange)
Needs Improvement: 0.00  - 59.99   (Red)
```

You can modify these or create your own!

---

## 🎯 Common Use Cases

### Use Case 1: Change "Excellent" threshold to 95
1. Go to `/performance-ratings`
2. Click "Edit" on Excellent rating
3. Change Min Score from 90 to 95
4. Adjust "Very Good" Max Score to 94.99
5. Save

### Use Case 2: Add more granular ratings
1. Split "Good" into "Good" and "Above Average"
2. Good: 70-74.99
3. Above Average: 75-79.99
4. Adjust colors as needed

### Use Case 3: Different colors for branding
1. Edit each rating
2. Use color picker to match your brand
3. Background color can be lighter shade
4. Save changes

---

## 💡 Pro Tips

1. **Use Display Order** - Controls how ratings appear in lists
2. **Test Coverage** - Use the validate button to check ranges
3. **Cache is Smart** - Ratings cached for 5 minutes for performance
4. **Historical Data** - Old evaluations keep their original ratings
5. **Per Organization** - Each org can have different scales

---

## 🆘 Need Help?

Check these files for detailed information:
- `COMPLETED_IMPLEMENTATION.md` - Full implementation details
- `PERFORMANCE_RATINGS_IMPLEMENTATION.md` - Technical documentation
- `IMPLEMENTATION_SUMMARY.md` - Quick reference

---

## ✅ Verification Checklist

After running SQL migration:

- [ ] Backend starts without errors
- [ ] Can access `/performance-ratings` page
- [ ] Can see default ratings listed
- [ ] Can create a new rating
- [ ] Can edit a rating
- [ ] Can delete a rating
- [ ] Staff dashboard shows correct rating
- [ ] Performance report shows correct rating
- [ ] PDF export includes correct rating
- [ ] Multiple organizations have separate ratings

---

## 🎉 You're Done!

The performance ratings system is now fully database-driven. No more hardcoded thresholds!

**Benefits:**
- ✅ Consistent ratings everywhere
- ✅ Easy to customize per organization
- ✅ No code changes needed
- ✅ Fast (cached)
- ✅ Validated automatically

**Next:** Run the SQL migration and start testing!
