# WeFuel Kali Linux Installation Guide

This guide provides step-by-step instructions for installing and deploying the WeFuel application on Kali Linux.

## Quick Start for Kali Linux

### 1. Update Kali Linux

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install additional tools that might be useful
sudo apt install -y curl wget git htop
```

### 2. Clone the Repository

```bash
git clone https://github.com/your-username/wefuel.git
cd wefuel
```

### 3. Make the Deployment Script Executable

```bash
chmod +x scripts/deploy-linux.sh
```

### 4. Run the Deployment Script

```bash
./scripts/deploy-linux.sh
```

The script will automatically:
- Check system requirements
- Install Docker and Docker Compose
- Set up the environment
- Generate SSL certificates
- Deploy all services
- Set up the database
- Run health checks

## Kali Linux Specific Setup

### Prerequisites Installation

Kali Linux comes with many tools pre-installed, but we need to add Docker:

```bash
# Remove any old Docker versions
sudo apt remove -y docker docker-engine docker.io containerd runc

# Install prerequisites
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Add Docker repository (using Debian repository for Kali)
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Add your user to docker group
sudo usermod -aG docker $USER

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose (standalone version)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again, or run this to apply group changes:
newgrp docker
```

### Manual Deployment on Kali

If you prefer manual installation:

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

## Kali Linux Optimizations

### 1. Network Configuration

Kali Linux often runs in VM environments. If you're running in a VM:

```bash
# Check network interface
ip addr show

# If using NAT, ensure ports are forwarded:
# - Port 3000 (Frontend)
# - Port 5000 (API)
# - Port 27017 (MongoDB - optional)
```

### 2. Resource Allocation

For optimal performance in Kali Linux:

```bash
# Check available resources
free -h
df -h
nproc

# If running in VM, ensure at least:
# - 4GB RAM allocated
# - 2 CPU cores
# - 20GB disk space
```

### 3. Firewall Configuration

Kali Linux uses iptables. Configure firewall:

```bash
# Allow necessary ports
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT   # SSH
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT   # HTTP
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT  # HTTPS
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT # Frontend
sudo iptables -A INPUT -p tcp --dport 5000 -j ACCEPT # API

# Save iptables rules
sudo iptables-save > /etc/iptables/rules.v4
```

### 4. Service Management

```bash
# Check Docker status
sudo systemctl status docker

# Start Docker if not running
sudo systemctl start docker

# Enable Docker to start on boot
sudo systemctl enable docker

# Check if user is in docker group
groups $USER
```

## Accessing the Application

After successful deployment:

- **Frontend**: http://localhost:3000
- **API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

If running in VM, replace `localhost` with your VM's IP address.

## Sample Accounts

For testing purposes, the following accounts are created:

- **User**: user@example.com / password123
- **Driver**: driver@example.com / password123
- **Station**: station@example.com / password123
- **Admin**: admin@wefuel.com / admin123

## Kali Linux Specific Troubleshooting

### 1. Permission Issues

```bash
# If you get permission errors with Docker
sudo usermod -aG docker $USER
newgrp docker

# Or run Docker commands with sudo
sudo docker-compose up -d
```

### 2. Network Issues in VM

```bash
# Check network connectivity
ping 8.8.8.8

# Check if ports are accessible
netstat -tulpn | grep :3000
netstat -tulpn | grep :5000

# If using VM, ensure port forwarding is configured
```

### 3. Resource Issues

```bash
# Check memory usage
free -h

# Check disk space
df -h

# Check CPU usage
htop

# If resources are low, consider:
# - Increasing VM memory allocation
# - Adding swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### 4. Docker Issues

```bash
# Check Docker status
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker

# Check Docker logs
sudo journalctl -u docker.service

# Clean up Docker
docker system prune -f
```

### 5. Port Conflicts

```bash
# Check what's using the ports
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :5000

# Kill processes if needed
sudo kill -9 <PID>

# Or change ports in docker-compose.yml
```

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

## Security Considerations for Kali Linux

### 1. Update Regularly

```bash
# Keep Kali updated
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose pull
docker-compose up -d
```

### 2. Secure Environment

```bash
# Change default passwords in .env file
nano .env

# Use strong passwords for:
# - MongoDB root password
# - JWT secret
# - API keys
```

### 3. Network Security

```bash
# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw allow 5000
```

## Performance Tips for Kali Linux

### 1. VM Optimization

If running in VirtualBox/VMware:
- Enable hardware virtualization
- Allocate sufficient RAM (4GB+)
- Use SSD storage if possible
- Enable multiple CPU cores

### 2. Docker Optimization

```bash
# Limit Docker memory usage
# Edit /etc/docker/daemon.json
sudo nano /etc/docker/daemon.json

# Add:
{
  "default-ulimits": {
    "nofile": {
      "Hard": 64000,
      "Name": "nofile",
      "Soft": 64000
    }
  }
}

# Restart Docker
sudo systemctl restart docker
```

### 3. System Optimization

```bash
# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable cups
sudo systemctl disable avahi-daemon

# Optimize swap
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
```

## Support

For issues specific to Kali Linux:

1. Check the logs: `./scripts/deploy-linux.sh logs`
2. Verify environment: `cat .env`
3. Check system resources: `htop`
4. Check Docker status: `sudo systemctl status docker`
5. Review deployment guide: `DEPLOYMENT.md`

For additional help, please refer to the project documentation or create an issue on GitHub.

## Quick Commands Reference

```bash
# Start everything
./scripts/deploy-linux.sh

# Check status
./scripts/deploy-linux.sh status

# View logs
./scripts/deploy-linux.sh logs

# Stop everything
./scripts/deploy-linux.sh stop

# Restart everything
./scripts/deploy-linux.sh restart

# Clean and start fresh
./scripts/deploy-linux.sh clean
./scripts/deploy-linux.sh deploy
```
