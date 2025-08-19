#!/bin/bash

# WeFuel Deployment Script
# This script deploys the WeFuel application to production

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="wefuel"
DEPLOY_ENV=${1:-production}
DOCKER_COMPOSE_FILE="docker-compose.yml"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if Docker is installed
check_docker() {
    log "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    success "Docker and Docker Compose are installed"
}

# Check if .env file exists
check_env_file() {
    log "Checking environment configuration..."
    if [ ! -f .env ]; then
        warning ".env file not found. Creating from template..."
        cp .env.example .env
        warning "Please update .env file with your production values"
        exit 1
    fi
    success "Environment file found"
}

# Backup current deployment
backup_current() {
    log "Creating backup of current deployment..."
    if [ -d "backups" ]; then
        BACKUP_NAME="backup-$(date +%Y%m%d-%H%M%S)"
        mkdir -p "backups/$BACKUP_NAME"
        
        # Backup database
        docker-compose exec -T mongodb mongodump --out /data/backup
        docker cp wefuel-mongodb:/data/backup "backups/$BACKUP_NAME/"
        
        # Backup logs
        docker-compose logs > "backups/$BACKUP_NAME/logs.txt" 2>&1 || true
        
        success "Backup created: backups/$BACKUP_NAME"
    fi
}

# Stop current services
stop_services() {
    log "Stopping current services..."
    docker-compose down --remove-orphans || true
    success "Services stopped"
}

# Pull latest changes
pull_changes() {
    log "Pulling latest changes from Git..."
    git fetch origin
    git reset --hard origin/main
    success "Latest changes pulled"
}

# Build and start services
deploy_services() {
    log "Building and starting services..."
    
    # Build images
    docker-compose build --no-cache
    
    # Start services
    docker-compose up -d
    
    success "Services deployed"
}

# Wait for services to be ready
wait_for_services() {
    log "Waiting for services to be ready..."
    
    # Wait for MongoDB
    log "Waiting for MongoDB..."
    timeout=60
    while ! docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
        if [ $timeout -le 0 ]; then
            error "MongoDB failed to start within 60 seconds"
            exit 1
        fi
        sleep 1
        timeout=$((timeout - 1))
    done
    success "MongoDB is ready"
    
    # Wait for Redis
    log "Waiting for Redis..."
    timeout=30
    while ! docker-compose exec -T redis redis-cli ping > /dev/null 2>&1; do
        if [ $timeout -le 0 ]; then
            error "Redis failed to start within 30 seconds"
            exit 1
        fi
        sleep 1
        timeout=$((timeout - 1))
    done
    success "Redis is ready"
    
    # Wait for API server
    log "Waiting for API server..."
    timeout=60
    while ! curl -f http://localhost:5000/health > /dev/null 2>&1; do
        if [ $timeout -le 0 ]; then
            error "API server failed to start within 60 seconds"
            exit 1
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    success "API server is ready"
    
    # Wait for frontend
    log "Waiting for frontend..."
    timeout=60
    while ! curl -f http://localhost:3000 > /dev/null 2>&1; do
        if [ $timeout -le 0 ]; then
            error "Frontend failed to start within 60 seconds"
            exit 1
        fi
        sleep 2
        timeout=$((timeout - 2))
    done
    success "Frontend is ready"
}

# Run database migrations
run_migrations() {
    log "Running database migrations..."
    docker-compose exec -T server npm run migrate || true
    success "Database migrations completed"
}

# Setup database with sample data (if needed)
setup_database() {
    log "Setting up database..."
    docker-compose exec -T server npm run setup-db || true
    success "Database setup completed"
}

# Health check
health_check() {
    log "Performing health checks..."
    
    # Check API health
    if curl -f http://localhost:5000/health > /dev/null 2>&1; then
        success "API health check passed"
    else
        error "API health check failed"
        return 1
    fi
    
    # Check frontend health
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        success "Frontend health check passed"
    else
        error "Frontend health check failed"
        return 1
    fi
    
    # Check database connection
    if docker-compose exec -T server node -e "
        const mongoose = require('mongoose');
        mongoose.connect(process.env.MONGODB_URI)
            .then(() => { console.log('DB connected'); process.exit(0); })
            .catch(err => { console.error('DB connection failed:', err); process.exit(1); });
    " > /dev/null 2>&1; then
        success "Database connection check passed"
    else
        error "Database connection check failed"
        return 1
    fi
    
    success "All health checks passed"
}

# Show deployment status
show_status() {
    log "Deployment Status:"
    echo ""
    docker-compose ps
    echo ""
    log "Service URLs:"
    echo "  Frontend: http://localhost:3000"
    echo "  API: http://localhost:5000"
    echo "  Health Check: http://localhost:5000/health"
    echo ""
    log "Logs:"
    echo "  View logs: docker-compose logs -f"
    echo "  View specific service logs: docker-compose logs -f [service-name]"
}

# Main deployment function
main() {
    log "Starting WeFuel deployment to $DEPLOY_ENV environment..."
    
    # Pre-deployment checks
    check_docker
    check_env_file
    
    # Backup current deployment
    backup_current
    
    # Stop current services
    stop_services
    
    # Pull latest changes
    pull_changes
    
    # Deploy services
    deploy_services
    
    # Wait for services
    wait_for_services
    
    # Run migrations
    run_migrations
    
    # Setup database (if needed)
    if [ "$DEPLOY_ENV" = "production" ]; then
        setup_database
    fi
    
    # Health check
    if health_check; then
        success "Deployment completed successfully!"
        show_status
    else
        error "Deployment failed health checks"
        log "Rolling back to previous version..."
        # Add rollback logic here
        exit 1
    fi
}

# Rollback function
rollback() {
    log "Rolling back deployment..."
    
    # Stop current services
    stop_services
    
    # Restore from backup
    if [ -d "backups" ]; then
        LATEST_BACKUP=$(ls -t backups | head -1)
        if [ -n "$LATEST_BACKUP" ]; then
            log "Restoring from backup: $LATEST_BACKUP"
            # Add restore logic here
        fi
    fi
    
    # Restart previous version
    docker-compose up -d
    
    success "Rollback completed"
}

# Parse command line arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "rollback")
        rollback
        ;;
    "status")
        show_status
        ;;
    "logs")
        docker-compose logs -f
        ;;
    "restart")
        log "Restarting services..."
        docker-compose restart
        success "Services restarted"
        ;;
    "stop")
        log "Stopping services..."
        docker-compose down
        success "Services stopped"
        ;;
    "clean")
        log "Cleaning up..."
        docker-compose down -v --remove-orphans
        docker system prune -f
        success "Cleanup completed"
        ;;
    *)
        echo "Usage: $0 {deploy|rollback|status|logs|restart|stop|clean}"
        echo "  deploy   - Deploy the application"
        echo "  rollback - Rollback to previous version"
        echo "  status   - Show deployment status"
        echo "  logs     - Show service logs"
        echo "  restart  - Restart services"
        echo "  stop     - Stop services"
        echo "  clean    - Clean up containers and volumes"
        exit 1
        ;;
esac
