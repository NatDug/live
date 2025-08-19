# WeFuel Linux Installation Guide

This guide provides step-by-step instructions for installing and deploying the WeFuel application on Linux systems.

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/wefuel.git
cd wefuel
```

### 2. Make the Deployment Script Executable

```bash
chmod +x scripts/deploy-linux.sh
```

### 3. Run the Deployment Script

```bash
./scripts/deploy-linux.sh
```

The script will automatically:
- Check system requirements
- Install missing dependencies (Docker, Docker Compose, etc.)
- Set up the environment
- Generate SSL certificates
- Deploy all services
- Set up the database
- Run health checks

## Manual Installation

If you prefer to install manually or the automatic script fails:

### Prerequisites

#### Ubuntu/Debian

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install other dependencies
sudo apt install -y git curl openssl
```

#### CentOS/RHEL

```bash
# Update system
sudo yum update -y

# Install Docker
sudo yum install -y docker

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install other dependencies
sudo yum install -y git curl openssl
```

#### Fedora

```bash
# Update system
sudo dnf update -y

# Install Docker
sudo dnf install -y docker

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Install other dependencies
sudo dnf install -y git curl openssl
```

### Manual Deployment

```bash
# Clone repository
git clone https://github.com/your-username/wefuel.git
cd wefuel

# Create environment file
cp .env.example .env
nano .env  # Edit with your configuration

# Create necessary directories
mkdir -p nginx/ssl logs backups

# Generate SSL certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/key.pem \
  -out nginx/ssl/cert.pem \
  -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=WeFuel/CN=localhost"

# Deploy services
docker-compose up -d --build

# Wait for services to start
sleep 30

# Setup database
docker-compose exec server npm run setup-db

# Check status
docker-compose ps
```

## System Requirements

- **Operating System**: Ubuntu 20.04+, CentOS 8+, Fedora 32+
- **RAM**: Minimum 4GB, Recommended 8GB+
- **Storage**: Minimum 20GB free space
- **CPU**: 2+ cores recommended
- **Network**: Internet connection for downloading Docker images

## Available Commands

The deployment script supports various commands:

```bash
# Deploy the application
./scripts/deploy-linux.sh deploy

# Deploy with image cleanup
./scripts/deploy-linux.sh deploy --clean

# Update the application
./scripts/deploy-linux.sh update

# Create a backup
./scripts/deploy-linux.sh backup

# Show service status
./scripts/deploy-linux.sh status

# Show logs
./scripts/deploy-linux.sh logs

# Stop services
./scripts/deploy-linux.sh stop

# Restart services
./scripts/deploy-linux.sh restart

# Clean everything
./scripts/deploy-linux.sh clean

# Show help
./scripts/deploy-linux.sh help
```

## Accessing the Application

After successful deployment:

- **Frontend**: http://localhost:3000
- **API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## Sample Accounts

For testing purposes, the following accounts are created:

- **User**: user@example.com / password123
- **Driver**: driver@example.com / password123
- **Station**: station@example.com / password123
- **Admin**: admin@wefuel.com / admin123

## Troubleshooting

### Common Issues

1. **Permission Denied**
   ```bash
   # Logout and login again after adding user to docker group
   # Or run: newgrp docker
   ```

2. **Port Already in Use**
   ```bash
   # Check what's using the port
   sudo netstat -tulpn | grep :5000
   
   # Kill the process
   sudo kill -9 <PID>
   ```

3. **Docker Not Running**
   ```bash
   # Start Docker
   sudo systemctl start docker
   
   # Check status
   sudo systemctl status docker
   ```

4. **Insufficient Memory**
   ```bash
   # Check available memory
   free -h
   
   # Add swap space if needed
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

### Viewing Logs

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f server
docker-compose logs -f client
docker-compose logs -f mongodb

# View deployment logs
tail -f logs/deployment.log
```

### Backup and Restore

```bash
# Create backup
./scripts/deploy-linux.sh backup

# Restore from backup
tar -xzf backups/wefuel-backup-YYYYMMDD-HHMMSS.tar.gz
cp -r wefuel-backup-YYYYMMDD-HHMMSS/* .
docker-compose up -d
```

## Security Considerations

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

2. **SSL Certificates**
   - For production, use Let's Encrypt or purchase SSL certificates
   - Replace self-signed certificates in `nginx/ssl/`

3. **Environment Variables**
   - Keep `.env` file secure
   - Use strong passwords and API keys
   - Never commit `.env` to version control

## Support

For issues and support:

1. Check the logs: `./scripts/deploy-linux.sh logs`
2. Verify environment: `cat .env`
3. Check system resources: `htop`
4. Review deployment guide: `DEPLOYMENT.md`

For additional help, please refer to the project documentation or create an issue on GitHub.
