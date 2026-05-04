# Barakah Foundation — cPanel Deployment Guide

## 📋 Prerequisites

1. **cPanel Account** with SSH access
2. **Database Access**: MySQL/MariaDB available
3. **Node.js**: v16+ or v18+ installed on server
4. **npm**: Included with Node.js
5. **Rust** (Optional): Only if compiling backend from source

## 🚀 Quick Start (5 Steps)

### Step 1: Upload Files
```bash
# Extract the deployment package to your cPanel server
# Recommended location: $HOME/barakah_foundation/

unzip deploy-package.zip
cd barakah_foundation
```

### Step 2: Install Dependencies
```bash
# Install frontend dependencies
cd frontend
npm install
npm run build
cd ..

# Backend (if using pre-compiled binary, skip this)
# cd backend && cargo build --release
```

### Step 3: Create Database
```bash
# Login to cPanel > MySQL Databases
# Or via SSH:
mysql -u your_user -p
CREATE DATABASE barakah_foundation;
USE barakah_foundation;
SOURCE deploy/schema.sql;
SOURCE migrations/001_update_member_deposits_status.sql;
exit;
```

### Step 4: Configure Environment
```bash
# Backend environment
cp deploy/.env.production backend/.env
# Edit backend/.env with your database credentials

# Frontend environment
cp deploy/.env.production frontend/.env.production
# Edit frontend/.env.production with your API base URL
```

### Step 5: Start Services
```bash
# Start backend
cd backend
./target/release/barakah_foundation &

# Or if using Node.js wrapper
node server.js &

cd ..
```

---

## 📁 Directory Structure for cPanel

```
$HOME/barakah_foundation/          # Main application directory
├── backend/
│   ├── target/release/
│   │   └── barakah_foundation     # Compiled binary (if Rust)
│   ├── src/
│   ├── .env                       # Database credentials (private)
│   ├── Cargo.toml
│   └── Cargo.lock
│
├── frontend/
│   ├── dist/                      # Production build (nginx/Apache serves this)
│   ├── src/
│   ├── node_modules/
│   ├── package.json
│   └── .env.production
│
├── public_html/                   # Frontend served from here
│   ├── .htaccess                  # URL rewriting for React Router
│   ├── index.html
│   └── assets/                    # CSS, JS, images from dist/
│
├── uploads/                       # File storage (member attachments)
│   └── .htaccess                  # Prevent direct execution
│
├── logs/                          # Application logs
│   ├── backend.log
│   └── frontend.log
│
├── deploy/
│   ├── schema.sql                 # Database schema
│   ├── .env.production            # Environment template
│   └── DEPLOY_INSTRUCTIONS.md
│
├── migrations/
│   └── 001_update_member_deposits_status.sql
│
└── BACKEND.md                     # Documentation
└── FRONTEND.md
```

---

## 🗄️ Database Setup

### Option A: cPanel GUI
1. Go to **Databases > MySQL Databases**
2. Create new database: `barakah_foundation`
3. Create user: `barakah_user`
4. Grant all privileges
5. Import SQL files via **phpMyAdmin**:
   - `deploy/schema.sql` (full schema)
   - `migrations/001_update_member_deposits_status.sql` (updates)

### Option B: SSH Command Line
```bash
mysql -u root -p << EOF
CREATE DATABASE barakah_foundation;
CREATE USER 'barakah_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT ALL PRIVILEGES ON barakah_foundation.* TO 'barakah_user'@'localhost';
FLUSH PRIVILEGES;
EOF

# Import schema
mysql -u barakah_user -p barakah_foundation < deploy/schema.sql
mysql -u barakah_user -p barakah_foundation < migrations/001_update_member_deposits_status.sql
```

---

## ⚙️ Environment Configuration

### Backend (.env)
```env
DATABASE_URL=mysql://barakah_user:password@localhost/barakah_foundation
HOST=127.0.0.1
PORT=8080
JWT_SECRET=your_very_long_secret_key_here_minimum_32_chars
LOG_LEVEL=info
```

**Important**: 
- Set `HOST=127.0.0.1` (local only, nginx/Apache proxies requests)
- Use strong `JWT_SECRET` (min 32 characters)
- Don't expose `.env` file publicly

### Frontend (.env.production)
```env
VITE_API_BASE=/api
```

---

## 🌐 Web Server Setup

### Option A: Nginx (Recommended)
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;
    
    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Frontend
    root /home/user/barakah_foundation/public_html;
    index index.html;
    
    # React Router - rewrite all routes to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Static assets - cache with long expiry
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API proxy to backend
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Block access to sensitive files
    location ~ /\.env {
        deny all;
    }
    
    location ~ /uploads/.*\.php$ {
        deny all;
    }
}
```

### Option B: Apache (.htaccess)
Create `public_html/.htaccess`:
```apache
<IfModule mod_rewrite.c>
    RewriteEngine On
    
    # Remove .html extension
    RewriteCond %{REQUEST_FILENAME} !-f
    RewriteCond %{REQUEST_FILENAME} !-d
    RewriteRule ^(.*)$ index.html [L]
    
    # API proxy to backend (if using mod_proxy)
    ProxyPreserveHost On
    ProxyPass /api/ http://127.0.0.1:8080/
    ProxyPassReverse /api/ http://127.0.0.1:8080/
</IfModule>

# Security headers
<IfModule mod_headers.c>
    Header set X-Frame-Options "SAMEORIGIN"
    Header set X-Content-Type-Options "nosniff"
    Header set X-XSS-Protection "1; mode=block"
</IfModule>

# Disable directory listing
Options -Indexes
```

Create `uploads/.htaccess`:
```apache
# Block execution of scripts in uploads folder
<FilesMatch "\.php$">
    Deny from all
</FilesMatch>

# Allow image/document access
<FilesMatch "\.(jpg|jpeg|png|gif|pdf|doc|docx)$">
    Allow from all
</FilesMatch>
```

---

## 🔧 Running Services

### Option A: Direct Binary (Rust)
```bash
# Build backend
cd backend
cargo build --release

# Run in background
nohup ./target/release/barakah_foundation > logs/backend.log 2>&1 &

# Or with systemd (recommended)
sudo systemctl enable barakah
sudo systemctl start barakah
```

### Option B: Node.js Wrapper
Create `server.js`:
```javascript
const { spawn } = require('child_process');
const path = require('path');

const backend = spawn('./backend/target/release/barakah_foundation', [], {
  cwd: __dirname,
  stdio: 'inherit',
  detached: true
});

backend.on('error', (err) => {
  console.error('Failed to start backend:', err);
});

console.log('Backend started with PID:', backend.pid);
process.exit(0);
```

```bash
node server.js &
```

### Option C: PM2 (Process Manager)
```bash
npm install -g pm2

# Create ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'barakah-backend',
    script: './backend/target/release/barakah_foundation',
    env: {
      DATABASE_URL: 'mysql://user:pass@localhost/barakah_foundation',
      JWT_SECRET: 'your_secret_key'
    },
    error_file: 'logs/backend-error.log',
    out_file: 'logs/backend-out.log'
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 🔐 Security Checklist

- [ ] Change default admin password (Password: Admin@1234)
- [ ] Set strong JWT_SECRET (minimum 32 characters)
- [ ] Enable HTTPS with SSL certificate (Let's Encrypt)
- [ ] Restrict `.env` file access (deny in .htaccess)
- [ ] Block script execution in `uploads/` folder
- [ ] Set database user with minimal required privileges
- [ ] Enable firewall and restrict SSH access
- [ ] Regular database backups (daily recommended)
- [ ] Monitor error logs for suspicious activity
- [ ] Update dependencies regularly

---

## 📊 Backups

### Automated Daily Backup
Create `backup.sh`:
```bash
#!/bin/bash

BACKUP_DIR="/home/user/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="barakah_foundation"
DB_USER="barakah_user"

mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u $DB_USER -p -B $DB_NAME > $BACKUP_DIR/db_$DATE.sql

# File backup
tar -czf $BACKUP_DIR/files_$DATE.tar.gz \
    /home/user/barakah_foundation/uploads \
    /home/user/barakah_foundation/backend \
    /home/user/barakah_foundation/frontend/dist

# Keep only last 7 days
find $BACKUP_DIR -type f -mtime +7 -delete
```

Add to crontab:
```bash
crontab -e
# Add line:
0 2 * * * /home/user/barakah_foundation/backup.sh
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
tail -f logs/backend.log

# Verify database connection
mysql -u barakah_user -p barakah_foundation -e "SELECT 1;"

# Check port is available
netstat -tulpn | grep 8080

# Check environment variables
echo $DATABASE_URL
```

### Frontend shows blank page
```bash
# Clear browser cache (Ctrl+Shift+R)
# Check JavaScript console for errors
# Verify public_html/.htaccess exists
# Check dist/ folder is properly built

# Rebuild frontend
cd frontend
npm run build
```

### API requests failing (401 Unauthorized)
```bash
# Check JWT_SECRET is set correctly
# Clear localStorage in browser
# Login again to get new token
# Check token expiration in browser DevTools
```

### Database connection error
```bash
# Verify credentials in .env
# Check MySQL service is running
sudo systemctl status mysql

# Test connection
mysql -h 127.0.0.1 -u barakah_user -p -e "USE barakah_foundation; SHOW TABLES;"
```

---

## 📞 Support & Updates

### Check Logs
```bash
# Backend logs
tail -f logs/backend.log

# Frontend logs (browser console)
Open Developer Tools (F12) > Console tab

# System logs
sudo journalctl -u barakah -f
```

### Update Database Schema
```bash
# When new migrations are released
mysql -u barakah_user -p barakah_foundation < migrations/new_migration.sql
```

### Restart Services
```bash
# Via systemd
sudo systemctl restart barakah

# Or PM2
pm2 restart barakah-backend

# Or manually
pkill barakah_foundation
./backend/target/release/barakah_foundation &
```

---

## 📚 Additional Resources

- **Backend**: See `BACKEND.md` for API documentation
- **Frontend**: See `FRONTEND.md` for UI documentation
- **Database**: See `deploy/schema.sql` for database structure
- **Troubleshooting**: Check application error logs first

---

**Last Updated**: May 2026
**Version**: 1.0
