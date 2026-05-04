# Deploy Folder — Barakah Foundation

This folder contains all files and scripts needed to deploy Barakah Foundation on a cPanel hosting server.

## 📦 Contents

### Documentation
- **DEPLOY_INSTRUCTIONS.md** — Complete cPanel deployment guide (START HERE!)
- **README.md** — This file

### Configuration Files
- **.env.template** — Environment variables template (copy to backend/.env)
- **.env.production** — Frontend production environment

### Directories
- **public_html/** — Frontend files for web root
  - `.htaccess` — Apache routing and security configuration
- **uploads/** — File storage for member attachments
  - `.htaccess` — Prevents script execution

### Scripts
- **cpanel-setup.sh** — Automated setup script for cPanel
- **schema.sql** — Database schema (created in root)
- **migrations/** — Database schema updates

## 🚀 Quick Start (3 Steps)

### Step 1: Read Documentation
```bash
cat DEPLOY_INSTRUCTIONS.md
```

### Step 2: Run Setup Script
```bash
bash cpanel-setup.sh
```

### Step 3: Follow On-Screen Instructions
The script will guide you through:
- Checking prerequisites
- Installing dependencies
- Building frontend
- Configuring environment
- Setting up database
- Setting permissions

## 📋 Pre-Deployment Checklist

Before uploading to cPanel:

- [ ] Read **DEPLOY_INSTRUCTIONS.md**
- [ ] Have MySQL credentials ready
- [ ] Have domain name ready
- [ ] Have SSH access enabled
- [ ] Node.js installed on server (check with hosting provider)
- [ ] Port 8080 available (or change in .env)

## 🔧 Files to Copy After Setup

After running `cpanel-setup.sh`:

```bash
# Copy frontend build to web root
cp -r frontend/dist/* ~/public_html/

# Copy routing configuration
cp deploy/public_html/.htaccess ~/public_html/

# Copy upload folder security
cp deploy/uploads/.htaccess ~/uploads/
```

## 🌐 Web Server Configuration

### For Apache (cPanel Standard)
The `.htaccess` files handle:
- **React Router**: All routes → index.html
- **API Proxy**: /api/ → Backend (port 8080)
- **Security**: Headers, clickjacking prevention
- **Caching**: Static assets cached 1 year
- **Compression**: gzip for CSS/JS

### For Nginx (Advanced)
See **DEPLOY_INSTRUCTIONS.md** for Nginx configuration

## 📊 Environment Variables

Edit **backend/.env** after setup:

```env
DATABASE_URL=mysql://user:password@localhost/database
HOST=127.0.0.1
PORT=8080
JWT_SECRET=<32+ character random string>
LOG_LEVEL=info
```

**IMPORTANT**: 
- Never commit .env to version control
- Keep .env permissions restricted (chmod 600)
- Use strong, unique JWT_SECRET

## 🗄️ Database Setup

### Option A: cPanel phpMyAdmin (Easiest)
1. Login to cPanel
2. Go to Databases → phpMyAdmin
3. Create database and user
4. Import: `deploy/schema.sql`
5. Import: `migrations/001_update_member_deposits_status.sql`

### Option B: SSH Command Line
```bash
mysql -u user -p database < deploy/schema.sql
mysql -u user -p database < migrations/001_update_member_deposits_status.sql
```

## 🚀 Starting the Backend

Choose one method:

### Method 1: Direct (Compiled Rust)
```bash
cd backend
./target/release/barakah_foundation &
```

### Method 2: Node.js Wrapper
```bash
node server.js &
```

### Method 3: PM2 (Recommended for cPanel)
```bash
npm install -g pm2
pm2 start "cd backend && ./target/release/barakah_foundation"
pm2 save
pm2 startup
```

## 📁 cPanel Directory Layout

```
$HOME/barakah_foundation/          ← Main app folder
├── frontend/dist/                 → Copy to ~/public_html/
├── backend/                       → Backend server
│   ├── .env                       ← PRIVATE (chmod 600)
│   └── target/release/
│       └── barakah_foundation     ← Binary (keep running)
├── public_html/                   → Copy to ~/public_html/
│   ├── .htaccess
│   ├── index.html
│   └── assets/
├── uploads/                       → Copy to ~/uploads/
│   └── .htaccess
├── logs/
│   └── backend.log                ← Monitor this
├── deploy/                        ← This folder (deployment tools)
├── BACKEND.md
└── FRONTEND.md
```

## 🔐 Security Setup

### Post-Deployment Checklist
- [ ] Enable HTTPS (Let's Encrypt via cPanel)
- [ ] Change default admin password
- [ ] Generate new JWT_SECRET
- [ ] Restrict .env file permissions (chmod 600)
- [ ] Block access to sensitive files (.env, .sh, .sql)
- [ ] Enable firewall
- [ ] Regular backups (daily recommended)
- [ ] Monitor error logs

### Default Credentials (CHANGE IMMEDIATELY!)
```
Email: admin@barakah.org
Password: Admin@1234
Role: admin
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check error log
tail -f logs/backend.log

# Verify database connection
mysql -u user -p -e "SELECT 1;"

# Check if port is in use
netstat -tulpn | grep 8080
```

### Frontend shows blank page
```bash
# Check .htaccess exists
ls -la public_html/.htaccess

# Verify dist folder
ls -la frontend/dist/

# Clear browser cache (Ctrl+Shift+R)
```

### API requests fail (401)
```bash
# Check JWT_SECRET in backend/.env
cat backend/.env | grep JWT_SECRET

# Login again to get new token
# Check token in browser DevTools > Storage > localStorage
```

### Database connection error
```bash
# Test MySQL connection
mysql -h 127.0.0.1 -u user -p database -e "SHOW TABLES;"

# Check DATABASE_URL format
cat backend/.env | grep DATABASE_URL
```

## 📝 Log Files

Monitor these logs for issues:

```bash
# Backend logs
tail -f logs/backend.log

# Frontend logs (browser DevTools)
# Open: https://yourdomain.com
# Press: F12 > Console tab

# Server logs (cPanel File Manager)
~/logs/
```

## 🔄 Updates & Maintenance

### Update Database Schema
```bash
# When new migrations are released
mysql -u user -p database < migrations/new_migration.sql
```

### Restart Backend
```bash
# Kill old process
pkill barakah_foundation

# Start new
cd backend
./target/release/barakah_foundation &
```

### Backup Database
```bash
# Backup database
mysqldump -u user -p database > backup_$(date +%Y%m%d).sql

# Backup files
tar -czf backup_$(date +%Y%m%d).tar.gz \
    ~/barakah_foundation/uploads \
    ~/barakah_foundation/backend \
    ~/barakah_foundation/frontend/dist
```

## 📞 Support

### Check Documentation
- **Backend**: `../BACKEND.md`
- **Frontend**: `../FRONTEND.md`
- **Deployment**: `DEPLOY_INSTRUCTIONS.md` (this folder)

### Monitor Logs
```bash
# Real-time log monitoring
tail -f logs/backend.log

# Search for errors
grep ERROR logs/backend.log
```

### Common Issues
See **DEPLOY_INSTRUCTIONS.md** → Troubleshooting section

## 📚 File Reference

| File | Purpose | Who Uses |
|------|---------|----------|
| .env | Backend configuration | Backend app |
| .env.production | Frontend configuration | Frontend app |
| schema.sql | Database structure | MySQL |
| migrations/*.sql | Database updates | MySQL |
| .htaccess | Web server routing | Apache |
| cpanel-setup.sh | Installation script | Administrator |

## ✅ Deployment Checklist

- [ ] Extract deployment package
- [ ] Read DEPLOY_INSTRUCTIONS.md
- [ ] Run cpanel-setup.sh
- [ ] Create database and user
- [ ] Import SQL files
- [ ] Configure backend/.env
- [ ] Copy files to public_html/
- [ ] Start backend service
- [ ] Test https://yourdomain.com
- [ ] Change admin password
- [ ] Enable HTTPS
- [ ] Set up backups
- [ ] Monitor logs

---

**Need help?** See **DEPLOY_INSTRUCTIONS.md** for detailed guide.

**Version**: 1.0  
**Last Updated**: May 2026
