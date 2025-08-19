#!/bin/bash

# WeFuel Quick Deployment Script
# This script automates the deployment process for testing

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check Docker
    if ! command_exists docker; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command_exists docker-compose; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if Docker is running
    if ! docker info >/dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [ ! -f .env ]; then
        if [ -f .env.example ]; then
            cp .env.example .env
            print_warning "Created .env file from template. Please update with your actual values."
        else
            print_error ".env.example not found. Please create a .env file manually."
            exit 1
        fi
    fi
    
    # Create necessary directories
    mkdir -p nginx/ssl
    mkdir -p logs
    
    print_success "Environment setup completed"
}

# Function to generate self-signed SSL certificate
generate_ssl_cert() {
    print_status "Generating self-signed SSL certificate..."
    
    if [ ! -f nginx/ssl/cert.pem ] || [ ! -f nginx/ssl/key.pem ]; then
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout nginx/ssl/key.pem \
            -out nginx/ssl/cert.pem \
            -subj "/C=ZA/ST=Gauteng/L=Johannesburg/O=WeFuel/CN=localhost" \
            -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
        
        print_success "SSL certificate generated"
    else
        print_status "SSL certificate already exists"
    fi
}

# Function to build and start services
deploy_services() {
    print_status "Building and starting services..."
    
    # Stop any existing services
    docker-compose down --remove-orphans
    
    # Build and start services
    docker-compose up -d --build
    
    print_success "Services deployed successfully"
}

# Function to wait for services to be ready
wait_for_services() {
    print_status "Waiting for services to be ready..."
    
    # Wait for MongoDB
    print_status "Waiting for MongoDB..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
            print_success "MongoDB is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_error "MongoDB failed to start within 60 seconds"
        exit 1
    fi
    
    # Wait for API server
    print_status "Waiting for API server..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:5000/health >/dev/null 2>&1; then
            print_success "API server is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_error "API server failed to start within 60 seconds"
        exit 1
    fi
    
    # Wait for frontend
    print_status "Waiting for frontend..."
    timeout=60
    while [ $timeout -gt 0 ]; do
        if curl -f http://localhost:3000 >/dev/null 2>&1; then
            print_success "Frontend is ready"
            break
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    
    if [ $timeout -le 0 ]; then
        print_error "Frontend failed to start within 60 seconds"
        exit 1
    fi
}

# Function to setup database
setup_database() {
    print_status "Setting up database..."
    
    # Run database setup script
    if docker-compose exec -T server npm run setup-db >/dev/null 2>&1; then
        print_success "Database setup completed"
    else
        print_warning "Database setup failed or already completed"
    fi
}

# Function to run health checks
run_health_checks() {
    print_status "Running health checks..."
    
    # Check API health
    if curl -f http://localhost:5000/health >/dev/null 2>&1; then
        print_success "API health check passed"
    else
        print_error "API health check failed"
        return 1
    fi
    
    # Check frontend
    if curl -f http://localhost:3000 >/dev/null 2>&1; then
        print_success "Frontend health check passed"
    else
        print_error "Frontend health check failed"
        return 1
    fi
    
    # Check database
    if docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        print_success "Database health check passed"
    else
        print_error "Database health check failed"
        return 1
    fi
}

# Function to display deployment info
show_deployment_info() {
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
    echo ""
    echo "For more information, see DEPLOYMENT.md"
    echo ""
}

# Function to cleanup on error
cleanup() {
    print_error "Deployment failed. Cleaning up..."
    docker-compose down --remove-orphans
    exit 1
}

# Set trap for cleanup
trap cleanup ERR

# Main deployment function
main() {
    echo "=========================================="
    echo "        WeFuel Quick Deployment           "
    echo "=========================================="
    echo ""
    
    # Check prerequisites
    check_prerequisites
    
    # Setup environment
    setup_environment
    
    # Generate SSL certificate
    generate_ssl_cert
    
    # Deploy services
    deploy_services
    
    # Wait for services
    wait_for_services
    
    # Setup database
    setup_database
    
    # Run health checks
    if run_health_checks; then
        show_deployment_info
        print_success "Deployment completed successfully!"
    else
        print_error "Health checks failed"
        cleanup
    fi
}

# Check if script is run with arguments
case "${1:-}" in
    "stop")
        print_status "Stopping services..."
        docker-compose down --remove-orphans
        print_success "Services stopped"
        ;;
    "restart")
        print_status "Restarting services..."
        docker-compose restart
        print_success "Services restarted"
        ;;
    "status")
        print_status "Service status:"
        docker-compose ps
        ;;
    "logs")
        print_status "Showing logs (Ctrl+C to exit):"
        docker-compose logs -f
        ;;
    "clean")
        print_status "Cleaning up..."
        docker-compose down --remove-orphans -v
        docker system prune -f
        print_success "Cleanup completed"
        ;;
    "help"|"-h"|"--help")
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  (no args)  Deploy the application"
        echo "  stop       Stop all services"
        echo "  restart    Restart all services"
        echo "  status     Show service status"
        echo "  logs       Show service logs"
        echo "  clean      Stop and remove all containers and volumes"
        echo "  help       Show this help message"
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown command: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac
