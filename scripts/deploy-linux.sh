#!/bin/bash

# WeFuel Linux Deployment Script
# This script automates the deployment process for Linux systems

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_ROOT/logs/deployment.log"
BACKUP_DIR="$PROJECT_ROOT/backups"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

print_header() {
    echo -e "${PURPLE}$1${NC}" | tee -a "$LOG_FILE"
}

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check system requirements
check_system_requirements() {
    print_header "Checking System Requirements"
    
    # Check OS
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        print_error "This script is designed for Linux systems only"
        exit 1
    fi
    
    # Check if running as root
    if [[ $EUID -eq 0 ]]; then
        print_warning "Running as root. This is not recommended for security reasons."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
    
    # Check available memory
    MEMORY_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEMORY_GB=$((MEMORY_KB / 1024 / 1024))
    
    if [ "$MEMORY_GB" -lt 4 ]; then
        print_error "Insufficient memory. Required: 4GB, Available: ${MEMORY_GB}GB"
        exit 1
    fi
    
    print_success "System requirements check passed (Memory: ${MEMORY_GB}GB)"
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_deps=()
    
    # Check Docker
    if ! command_exists docker; then
        missing_deps+=("docker")
    fi
    
    # Check Docker Compose
    if ! command_exists docker-compose; then
        missing_deps+=("docker-compose")
    fi
    
    # Check Git
    if ! command_exists git; then
        missing_deps+=("git")
    fi
    
    # Check curl
    if ! command_exists curl; then
        missing_deps+=("curl")
    fi
    
    # Check OpenSSL
    if ! command_exists openssl; then
        missing_deps+=("openssl")
    fi
    
    if [ ${#missing_deps[@]} -ne 0 ]; then
        print_error "Missing dependencies: ${missing_deps[*]}"
        print_status "Installing missing dependencies..."
        install_dependencies "${missing_deps[@]}"
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        print_status "You can start Docker with: sudo systemctl start docker"
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to install dependencies
install_dependencies() {
    local deps=("$@")
    
    # Detect package manager
    if command_exists apt-get; then
        # Ubuntu/Debian
        print_status "Using apt package manager"
        sudo apt-get update
        for dep in "${deps[@]}"; do
            case $dep in
                "docker")
                    install_docker_apt
                    ;;
                "docker-compose")
                    install_docker_compose_apt
                    ;;
                *)
                    sudo apt-get install -y "$dep"
                    ;;
            esac
        done
    elif command_exists yum; then
        # CentOS/RHEL
        print_status "Using yum package manager"
        sudo yum update -y
        for dep in "${deps[@]}"; do
            case $dep in
                "docker")
                    install_docker_yum
                    ;;
                "docker-compose")
                    install_docker_compose_yum
                    ;;
                *)
                    sudo yum install -y "$dep"
                    ;;
            esac
        done
    elif command_exists dnf; then
        # Fedora
        print_status "Using dnf package manager"
        sudo dnf update -y
        for dep in "${deps[@]}"; do
            case $dep in
                "docker")
                    install_docker_dnf
                    ;;
                "docker-compose")
                    install_docker_compose_dnf
                    ;;
                *)
                    sudo dnf install -y "$dep"
                    ;;
            esac
        done
    else
        print_error "Unsupported package manager. Please install dependencies manually."
        exit 1
    fi
}

# Function to install Docker on Ubuntu/Debian
install_docker_apt() {
    print_status "Installing Docker on Ubuntu/Debian..."
    
    # Remove old versions
    sudo apt-get remove -y docker docker-engine docker.io containerd runc
    
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
    sudo usermod -aG docker "$USER"
    
    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    print_success "Docker installed successfully"
}

# Function to install Docker Compose on Ubuntu/Debian
install_docker_compose_apt() {
    print_status "Installing Docker Compose..."
    
    # Install Docker Compose plugin
    sudo apt-get install -y docker-compose-plugin
    
    # Also install standalone version as backup
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    print_success "Docker Compose installed successfully"
}

# Function to install Docker on CentOS/RHEL
install_docker_yum() {
    print_status "Installing Docker on CentOS/RHEL..."
    
    # Install Docker
    sudo yum install -y docker
    
    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # Add user to docker group
    sudo usermod -aG docker "$USER"
    
    print_success "Docker installed successfully"
}

# Function to install Docker Compose on CentOS/RHEL
install_docker_compose_yum() {
    print_status "Installing Docker Compose..."
    
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    print_success "Docker Compose installed successfully"
}

# Function to install Docker on Fedora
install_docker_dnf() {
    print_status "Installing Docker on Fedora..."
    
    # Install Docker
    sudo dnf install -y docker
    
    # Start and enable Docker
    sudo systemctl start docker
    sudo systemctl enable docker
    
    # Add user to docker group
    sudo usermod -aG docker "$USER"
    
    print_success "Docker installed successfully"
}

# Function to install Docker Compose on Fedora
install_docker_compose_dnf() {
    print_status "Installing Docker Compose..."
    
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    print_success "Docker Compose installed successfully"
}

# Function to setup environment
setup_environment() {
    print_header "Setting up Environment"
    
    # Create necessary directories
    mkdir -p "$PROJECT_ROOT/logs"
    mkdir -p "$PROJECT_ROOT/backups"
    mkdir -p "$PROJECT_ROOT/nginx/ssl"
    
    # Create .env file if it doesn't exist
    if [ ! -f "$PROJECT_ROOT/.env" ]; then
        if [ -f "$PROJECT_ROOT/.env.example" ]; then
            cp "$PROJECT_ROOT/.env.example" "$PROJECT_ROOT/.env"
            print_warning "Created .env file from template. Please update with your actual values."
            print_status "You can edit the .env file with: nano $PROJECT_ROOT/.env"
        else
            print_error ".env.example not found. Please create a .env file manually."
            exit 1
        fi
    fi
    
    # Set proper permissions
    chmod 600 "$PROJECT_ROOT/.env"
    
    print_success "Environment setup completed"
}

# Function to generate SSL certificate
generate_ssl_cert() {
    print_header "Generating SSL Certificate"
    
    local cert_file="$PROJECT_ROOT/nginx/ssl/cert.pem"
    local key_file="$PROJECT_ROOT/nginx/ssl/key.pem"
    
    if [ ! -f "$cert_file" ] || [ ! -f "$key_file" ]; then
        print_status "Generating self-signed SSL certificate..."
        
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$key_file" \
            -out "$cert_file" \
            -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=WeFuel/CN=localhost" \
            -addext "subjectAltName=DNS:localhost,IP:127.0.0.1,IP:0.0.0.0"
        
        # Set proper permissions
        chmod 600 "$key_file"
        chmod 644 "$cert_file"
        
        print_success "SSL certificate generated"
    else
        print_status "SSL certificate already exists"
    fi
}

# Function to backup existing deployment
backup_existing() {
    print_header "Backing up Existing Deployment"
    
    if docker-compose ps | grep -q "Up"; then
        print_status "Backing up existing deployment..."
        
        local backup_name="wefuel-backup-$(date +%Y%m%d-%H%M%S)"
        local backup_path="$BACKUP_DIR/$backup_name"
        
        mkdir -p "$backup_path"
        
        # Backup docker-compose files
        cp "$PROJECT_ROOT/docker-compose.yml" "$backup_path/"
        cp "$PROJECT_ROOT/.env" "$backup_path/"
        
        # Backup nginx configuration
        cp -r "$PROJECT_ROOT/nginx" "$backup_path/"
        
        # Backup database
        if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
            docker-compose exec -T mongodb mongodump --out /data/backup
            docker cp wefuel-mongodb:/data/backup "$backup_path/"
            print_success "Database backed up"
        fi
        
        # Create backup archive
        tar -czf "$backup_path.tar.gz" -C "$BACKUP_DIR" "$backup_name"
        rm -rf "$backup_path"
        
        print_success "Backup created: $backup_path.tar.gz"
    else
        print_status "No existing deployment to backup"
    fi
}

# Function to deploy services
deploy_services() {
    print_header "Deploying Services"
    
    # Stop any existing services
    print_status "Stopping existing services..."
    docker-compose down --remove-orphans
    
    # Clean up old images (optional)
    if [ "$1" = "--clean" ]; then
        print_status "Cleaning up old images..."
        docker system prune -f
    fi
    
    # Build and start services
    print_status "Building and starting services..."
    docker-compose up -d --build
    
    if [ $? -ne 0 ]; then
        print_error "Failed to start services"
        exit 1
    fi
    
    print_success "Services deployed successfully"
}

# Function to wait for services
wait_for_services() {
    print_header "Waiting for Services"
    
    local max_attempts=60
    local attempt=1
    
    # Wait for MongoDB
    print_status "Waiting for MongoDB..."
    while [ $attempt -le $max_attempts ]; do
        if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
            print_success "MongoDB is ready"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "MongoDB failed to start within $((max_attempts * 2)) seconds"
            exit 1
        fi
        
        sleep 2
        attempt=$((attempt + 1))
    done
    
    # Wait for API server
    print_status "Waiting for API server..."
    attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:5000/health >/dev/null 2>&1; then
            print_success "API server is ready"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "API server failed to start within $((max_attempts * 2)) seconds"
            exit 1
        fi
        
        sleep 2
        attempt=$((attempt + 1))
    done
    
    # Wait for frontend
    print_status "Waiting for frontend..."
    attempt=1
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3000 >/dev/null 2>&1; then
            print_success "Frontend is ready"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            print_error "Frontend failed to start within $((max_attempts * 2)) seconds"
            exit 1
        fi
        
        sleep 2
        attempt=$((attempt + 1))
    done
}

# Function to setup database
setup_database() {
    print_header "Setting up Database"
    
    print_status "Running database setup script..."
    
    if docker-compose exec -T server npm run setup-db >/dev/null 2>&1; then
        print_success "Database setup completed"
    else
        print_warning "Database setup failed or already completed"
    fi
}

# Function to run health checks
run_health_checks() {
    print_header "Running Health Checks"
    
    local all_passed=true
    
    # Check API health
    print_status "Checking API health..."
    if curl -f http://localhost:5000/health >/dev/null 2>&1; then
        print_success "API health check passed"
    else
        print_error "API health check failed"
        all_passed=false
    fi
    
    # Check frontend
    print_status "Checking frontend..."
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        print_success "Frontend health check passed"
    else
        print_error "Frontend health check failed"
        all_passed=false
    fi
    
    # Check database
    print_status "Checking database..."
    if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        print_success "Database health check passed"
    else
        print_error "Database health check failed"
        all_passed=false
    fi
    
    # Check all containers are running
    print_status "Checking container status..."
    local containers_status=$(docker-compose ps --format "table {{.Name}}\t{{.Status}}")
    echo "$containers_status" | tee -a "$LOG_FILE"
    
    if [ "$all_passed" = true ]; then
        print_success "All health checks passed"
        return 0
    else
        print_error "Some health checks failed"
        return 1
    fi
}

# Function to display deployment info
show_deployment_info() {
    print_header "Deployment Information"
    
    echo ""
    echo "=========================================="
    echo "           DEPLOYMENT COMPLETE            "
    echo "=========================================="
    echo ""
    echo "Application URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  API: http://localhost:5000"
    echo "  Health Check: http://localhost:5000/health"
    echo ""
    echo "Sample Accounts:"
    echo "  User: user@example.com / password123"
    echo "  Driver: driver@example.com / password123"
    echo "  Station: station@example.com / password123"
    echo "  Admin: admin@wefuel.com / admin123"
    echo ""
    echo "Useful Commands:"
    echo "  View logs: docker-compose logs -f"
    echo "  Stop services: docker-compose down"
    echo "  Restart services: docker-compose restart"
    echo "  Check status: docker-compose ps"
    echo "  Backup: $0 backup"
    echo "  Update: $0 update"
    echo ""
    echo "Log file: $LOG_FILE"
    echo "For more information, see DEPLOYMENT.md"
    echo ""
}

# Function to cleanup on error
cleanup() {
    print_error "Deployment failed. Cleaning up..."
    docker-compose down --remove-orphans
    exit 1
}

# Function to backup
backup() {
    print_header "Creating Backup"
    backup_existing
    print_success "Backup completed"
}

# Function to update
update() {
    print_header "Updating Application"
    
    # Backup existing deployment
    backup_existing
    
    # Pull latest changes
    print_status "Pulling latest changes..."
    git pull origin main
    
    # Redeploy
    deploy_services
    wait_for_services
    run_health_checks
    
    if [ $? -eq 0 ]; then
        show_deployment_info
        print_success "Update completed successfully!"
    else
        print_error "Update failed"
        cleanup
    fi
}

# Function to show status
status() {
    print_header "Service Status"
    docker-compose ps
    echo ""
    print_header "Recent Logs"
    docker-compose logs --tail=20
}

# Function to show logs
logs() {
    print_header "Service Logs"
    docker-compose logs -f
}

# Function to stop services
stop() {
    print_header "Stopping Services"
    docker-compose down --remove-orphans
    print_success "Services stopped"
}

# Function to restart services
restart() {
    print_header "Restarting Services"
    docker-compose restart
    print_success "Services restarted"
}

# Function to clean everything
clean() {
    print_header "Cleaning Everything"
    
    read -p "This will remove all containers, images, and volumes. Are you sure? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleanup cancelled"
        exit 0
    fi
    
    docker-compose down --remove-orphans -v
    docker system prune -af
    docker volume prune -f
    
    print_success "Cleanup completed"
}

# Function to show help
show_help() {
    echo "Usage: $0 [command] [options]"
    echo ""
    echo "Commands:"
    echo "  deploy          Deploy the application (default)"
    echo "  update          Update the application"
    echo "  backup          Create a backup"
    echo "  status          Show service status"
    echo "  logs            Show service logs"
    echo "  stop            Stop all services"
    echo "  restart         Restart all services"
    echo "  clean           Remove all containers, images, and volumes"
    echo "  help            Show this help message"
    echo ""
    echo "Options:"
    echo "  --clean         Clean old images during deployment"
    echo ""
    echo "Examples:"
    echo "  $0              # Deploy the application"
    echo "  $0 deploy       # Deploy the application"
    echo "  $0 deploy --clean # Deploy with image cleanup"
    echo "  $0 update       # Update the application"
    echo "  $0 backup       # Create a backup"
    echo "  $0 status       # Show status"
    echo "  $0 logs         # Show logs"
}

# Set trap for cleanup
trap cleanup ERR

# Main function
main() {
    # Initialize logging
    mkdir -p "$(dirname "$LOG_FILE")"
    log "Deployment script started"
    
    # Check system requirements
    check_system_requirements
    
    # Check prerequisites
    check_prerequisites
    
    # Setup environment
    setup_environment
    
    # Generate SSL certificate
    generate_ssl_cert
    
    # Backup existing deployment
    backup_existing
    
    # Deploy services
    deploy_services "$@"
    
    # Wait for services
    wait_for_services
    
    # Setup database
    setup_database
    
    # Run health checks
    if run_health_checks; then
        show_deployment_info
        print_success "Deployment completed successfully!"
        log "Deployment completed successfully"
    else
        print_error "Health checks failed"
        log "Health checks failed"
        cleanup
    fi
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        shift
        main "$@"
        ;;
    "update")
        update
        ;;
    "backup")
        backup
        ;;
    "status")
        status
        ;;
    "logs")
        logs
        ;;
    "stop")
        stop
        ;;
    "restart")
        restart
        ;;
    "clean")
        clean
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
