#!/bin/bash

# WeFuel Kali Linux Setup Script
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

echo "=========================================="
echo "        WeFuel Kali Linux Setup           "
echo "=========================================="
echo ""

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_warning "Running as root. This is not recommended."
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Update system
print_status "Updating Kali Linux..."
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git htop net-tools

# Install Docker
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    # Remove old versions
    sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
    
    # Install prerequisites
    sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    # Add Docker repository
    curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add user to docker group
    sudo usermod -aG docker "$USER"
    
    # Start Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    print_success "Docker installed"
else
    print_status "Docker already installed"
fi

# Install Docker Compose
print_status "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed"
else
    print_status "Docker Compose already installed"
fi

# Configure firewall
print_status "Configuring firewall..."
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT   # SSH
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT   # HTTP
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT  # HTTPS
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT # Frontend
sudo iptables -A INPUT -p tcp --dport 5000 -j ACCEPT # API

# Save iptables rules
sudo mkdir -p /etc/iptables
sudo iptables-save > /etc/iptables/rules.v4

# Check resources
print_status "Checking system resources..."
MEMORY_GB=$(($(grep MemTotal /proc/meminfo | awk '{print $2}') / 1024 / 1024))
DISK_GB=$(($(df / | awk 'NR==2 {print $4}') / 1024 / 1024))
CPU_CORES=$(nproc)

echo "Memory: ${MEMORY_GB}GB"
echo "Disk space: ${DISK_GB}GB"
echo "CPU cores: $CPU_CORES"

if [ "$MEMORY_GB" -lt 4 ]; then
    print_warning "Low memory (${MEMORY_GB}GB). Consider adding swap or increasing VM memory."
fi

if [ "$DISK_GB" -lt 20 ]; then
    print_warning "Low disk space (${DISK_GB}GB). Consider freeing up space."
fi

# Verify installation
print_status "Verifying installation..."
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    print_success "Installation verified"
    echo ""
    echo "Next steps:"
    echo "1. Logout and login again: logout"
    echo "2. Clone repository: git clone https://github.com/your-username/wefuel.git"
    echo "3. Deploy: cd wefuel && chmod +x scripts/deploy-linux.sh && ./scripts/deploy-linux.sh"
    echo ""
    print_success "Kali Linux setup completed!"
else
    print_error "Installation verification failed"
    exit 1
fi
