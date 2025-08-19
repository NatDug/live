# WeFuel Deployment Guide

This guide provides comprehensive instructions for deploying the WeFuel application to different environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Docker Deployment](#docker-deployment)
4. [PM2 Deployment](#pm2-deployment)
5. [Cloud Deployment](#cloud-deployment)
6. [SSL Configuration](#ssl-configuration)
7. [Monitoring & Logging](#monitoring--logging)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Operating System**: Ubuntu 20.04+ / CentOS 8+ / macOS 10.15+
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 20GB free space
- **CPU**: 2+ cores recommended

### Software Requirements

- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Node.js**: 18.x+ (for PM2 deployment)
- **Git**: Latest version
- **Nginx**: 1.18+ (for reverse proxy)

### Install Docker (Ubuntu)

```bash
# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER

# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker
```

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/wefuel.git
cd wefuel
```

### 2. Configure Environment Variables

```bash
# Copy environment template
cp env.template .env

# Edit environment variables
nano .env
```

**Required Environment Variables:**

```bash
# Application
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-domain.com
API_URL=https://your-domain.com

# Database
MONGODB_URI=mongodb://admin:password123@mongodb:27017/wefuel?authSource=admin
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-secure-password

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Payment Gateways
YOCO_PUBLIC_KEY=pk_live_your-yoco-public-key
YOCO_SECRET_KEY=sk_live_your-yoco-secret-key
OZOW_SITE_CODE=your-ozow-site-code
OZOW_PRIVATE_KEY=your-ozow-private-key
OZOW_API_KEY=your-ozow-api-key

# External Services
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+27123456789

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 3. Generate SSL Certificates (Optional)

For production deployment with HTTPS:

```bash
# Create SSL directory
mkdir -p nginx/ssl

# Generate self-signed certificate (for testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=WeFuel/CN=your-domain.com"
```

For production, use Let's Encrypt or purchase SSL certificates.

## Docker Deployment

### Quick Start

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Deploy the application
./scripts/deploy.sh deploy
```

### Manual Deployment

```bash
# Build and start services
docker-compose up -d --build

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Service Management

```bash
# Stop services
./scripts/deploy.sh stop

# Restart services
./scripts/deploy.sh restart

# View status
./scripts/deploy.sh status

# View logs
./scripts/deploy.sh logs

# Clean up
./scripts/deploy.sh clean
```

### Database Operations

```bash
# Backup database
docker-compose exec mongodb mongodump --out /data/backup

# Restore database
docker-compose exec mongodb mongorestore /data/backup

# Access MongoDB shell
docker-compose exec mongodb mongosh
```

## PM2 Deployment

For non-Docker deployments:

### 1. Install PM2

```bash
npm install -g pm2
```

### 2. Setup Environment

```bash
# Install dependencies
cd server
npm install --production

# Setup environment
cp ../env.template .env
nano .env
```

### 3. Start Application

```bash
# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

### 4. Monitor Application

```bash
# View status
pm2 status

# View logs
pm2 logs

# Monitor resources
pm2 monit

# Restart application
pm2 restart wefuel-api
```

## Cloud Deployment

### AWS EC2 Deployment

1. **Launch EC2 Instance**
   ```bash
   # Connect to instance
   ssh -i your-key.pem ubuntu@your-instance-ip
   
   # Update system
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Docker**
   ```bash
   # Install Docker (see prerequisites section)
   ```

3. **Deploy Application**
   ```bash
   # Clone repository
   git clone https://github.com/your-username/wefuel.git
   cd wefuel
   
   # Configure environment
   cp env.template .env
   nano .env
   
   # Deploy
   ./scripts/deploy.sh deploy
   ```

4. **Configure Security Groups**
   - Port 80 (HTTP)
   - Port 443 (HTTPS)
   - Port 22 (SSH)

### DigitalOcean Droplet Deployment

1. **Create Droplet**
   - Choose Ubuntu 20.04
   - Select plan with 4GB RAM minimum
   - Add SSH key

2. **Deploy Application**
   ```bash
   # Follow same steps as AWS EC2
   ```

3. **Configure Firewall**
   ```bash
   sudo ufw allow 22
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

### Google Cloud Platform

1. **Create VM Instance**
   ```bash
   gcloud compute instances create wefuel-app \
     --zone=us-central1-a \
     --machine-type=e2-standard-2 \
     --image-family=ubuntu-2004-lts \
     --image-project=ubuntu-os-cloud
   ```

2. **Deploy Application**
   ```bash
   # Follow same steps as AWS EC2
   ```

## SSL Configuration

### Let's Encrypt (Recommended)

1. **Install Certbot**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   ```

2. **Obtain Certificate**
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

3. **Auto-renewal**
   ```bash
   sudo crontab -e
   # Add: 0 12 * * * /usr/bin/certbot renew --quiet
   ```

### Custom SSL Certificates

1. **Upload Certificates**
   ```bash
   # Copy certificates to nginx/ssl/
   cp your-cert.pem nginx/ssl/cert.pem
   cp your-key.pem nginx/ssl/key.pem
   ```

2. **Update Nginx Configuration**
   ```bash
   # Edit nginx/nginx.conf
   # Update ssl_certificate and ssl_certificate_key paths
   ```

3. **Restart Services**
   ```bash
   docker-compose restart nginx
   ```

## Monitoring & Logging

### Application Monitoring

1. **PM2 Monitoring**
   ```bash
   pm2 install pm2-server-monit
   pm2 install pm2-logrotate
   ```

2. **Docker Monitoring**
   ```bash
   # View container stats
   docker stats
   
   # View logs
   docker-compose logs -f
   ```

### Log Management

1. **Configure Log Rotation**
   ```bash
   # Create logrotate configuration
   sudo nano /etc/logrotate.d/wefuel
   ```

   ```bash
   /var/log/wefuel/*.log {
       daily
       missingok
       rotate 52
       compress
       delaycompress
       notifempty
       create 644 root root
   }
   ```

2. **Centralized Logging (Optional)**
   - Use ELK Stack (Elasticsearch, Logstash, Kibana)
   - Use Fluentd for log aggregation
   - Use CloudWatch (AWS) or Stackdriver (GCP)

### Health Checks

1. **Application Health**
   ```bash
   # Check API health
   curl http://localhost:5000/health
   
   # Check frontend
   curl http://localhost:3000
   ```

2. **Database Health**
   ```bash
   # Check MongoDB
   docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
   ```

3. **Automated Monitoring**
   ```bash
   # Setup cron job for health checks
   crontab -e
   
   # Add: */5 * * * * curl -f http://localhost:5000/health || echo "API down" | mail -s "WeFuel Alert" admin@example.com
   ```

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   sudo netstat -tulpn | grep :5000
   
   # Kill process
   sudo kill -9 <PID>
   ```

2. **Database Connection Issues**
   ```bash
   # Check MongoDB status
   docker-compose exec mongodb mongosh --eval "db.adminCommand('ping')"
   
   # Check connection string
   echo $MONGODB_URI
   ```

3. **Memory Issues**
   ```bash
   # Check memory usage
   free -h
   
   # Increase swap space
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

4. **SSL Certificate Issues**
   ```bash
   # Check certificate validity
   openssl x509 -in nginx/ssl/cert.pem -text -noout
   
   # Test SSL connection
   openssl s_client -connect your-domain.com:443
   ```

### Performance Optimization

1. **Database Optimization**
   ```bash
   # Create indexes
   docker-compose exec mongodb mongosh wefuel --eval "
     db.users.createIndex({email: 1});
     db.orders.createIndex({userId: 1, createdAt: -1});
     db.orders.createIndex({status: 1});
   "
   ```

2. **Application Optimization**
   ```bash
   # Enable compression
   # Update nginx configuration
   
   # Enable caching
   # Configure Redis for session storage
   ```

3. **Resource Limits**
   ```bash
   # Update docker-compose.yml with resource limits
   services:
     server:
       deploy:
         resources:
           limits:
             memory: 1G
             cpus: '0.5'
   ```

### Backup & Recovery

1. **Database Backup**
   ```bash
   # Create backup script
   nano backup.sh
   ```

   ```bash
   #!/bin/bash
   BACKUP_DIR="/backups/$(date +%Y%m%d)"
   mkdir -p $BACKUP_DIR
   
   docker-compose exec -T mongodb mongodump --out /data/backup
   docker cp wefuel-mongodb:/data/backup $BACKUP_DIR/
   
   # Compress backup
   tar -czf $BACKUP_DIR.tar.gz $BACKUP_DIR
   rm -rf $BACKUP_DIR
   ```

2. **Application Backup**
   ```bash
   # Backup configuration
   tar -czf wefuel-config-$(date +%Y%m%d).tar.gz .env docker-compose.yml nginx/
   ```

3. **Recovery Procedure**
   ```bash
   # Stop services
   docker-compose down
   
   # Restore database
   docker-compose up -d mongodb
   docker cp backup.tar.gz wefuel-mongodb:/data/
   docker-compose exec mongodb tar -xzf /data/backup.tar.gz
   docker-compose exec mongodb mongorestore /data/backup
   
   # Restart services
   docker-compose up -d
   ```

## Security Best Practices

1. **Firewall Configuration**
   ```bash
   # Configure UFW
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow ssh
   sudo ufw allow 80
   sudo ufw allow 443
   sudo ufw enable
   ```

2. **Regular Updates**
   ```bash
   # Update system packages
   sudo apt update && sudo apt upgrade -y
   
   # Update Docker images
   docker-compose pull
   docker-compose up -d
   ```

3. **Security Monitoring**
   ```bash
   # Install fail2ban
   sudo apt install fail2ban
   
   # Configure fail2ban
   sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban
   ```

## Support

For deployment issues:

1. Check the logs: `docker-compose logs -f`
2. Verify environment variables: `cat .env`
3. Test connectivity: `curl http://localhost:5000/health`
4. Check system resources: `htop` or `docker stats`

For additional support, please refer to the project documentation or create an issue on GitHub.
