#!/bin/bash

# MCP Gateway - Railway Deployment Script
# This script helps deploy the MCP Gateway to Railway

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Railway CLI is installed
check_railway_cli() {
    if ! command -v railway &> /dev/null; then
        print_error "Railway CLI is not installed"
        print_info "Install with: npm install -g @railway/cli"
        exit 1
    fi
    print_info "Railway CLI found"
}

# Check if logged in to Railway
check_railway_auth() {
    if ! railway whoami &> /dev/null; then
        print_warn "Not logged in to Railway"
        print_info "Logging in..."
        railway login
    else
        print_info "Authenticated with Railway"
    fi
}

# Build Docker image locally for testing
build_docker() {
    print_info "Building Docker image locally..."
    docker build -t mcp-gateway:latest .
    print_info "Docker image built successfully"
}

# Test Docker image locally
test_docker() {
    print_info "Testing Docker image locally..."
    
    # Stop any existing container
    docker stop mcp-gateway-test 2>/dev/null || true
    docker rm mcp-gateway-test 2>/dev/null || true
    
    # Run container
    docker run -d \
        --name mcp-gateway-test \
        -p 3333:3333 \
        -e NODE_ENV=production \
        -e PORT=3333 \
        mcp-gateway:latest
    
    print_info "Waiting for service to start..."
    sleep 5
    
    # Test health endpoint
    if curl -f http://localhost:3333/health > /dev/null 2>&1; then
        print_info "Health check passed"
        
        # Show health response
        echo -e "\nHealth check response:"
        curl -s http://localhost:3333/health | jq .
    else
        print_error "Health check failed"
        docker logs mcp-gateway-test
        docker stop mcp-gateway-test
        docker rm mcp-gateway-test
        exit 1
    fi
    
    # Clean up
    docker stop mcp-gateway-test
    docker rm mcp-gateway-test
    print_info "Local test completed successfully"
}

# Deploy to Railway
deploy_to_railway() {
    print_info "Deploying to Railway..."
    
    # Check if project is linked
    if ! railway status &> /dev/null; then
        print_warn "Project not linked to Railway"
        print_info "Linking project..."
        railway link
    fi
    
    # Show current environment
    print_info "Deploying to environment: $(railway environment)"
    
    # Confirm deployment
    read -p "Deploy to Railway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deployment cancelled"
        exit 0
    fi
    
    # Deploy
    railway up --service mcp-gateway
    
    print_info "Deployment initiated"
    
    # Show logs
    print_info "Showing deployment logs (Ctrl+C to exit)..."
    railway logs -f
}

# View deployment status
show_status() {
    print_info "Current deployment status:"
    railway status
    
    print_info "\nRecent deployments:"
    railway deployments
    
    print_info "\nService URL:"
    railway open
}

# Main menu
show_menu() {
    echo "====================================="
    echo "   MCP Gateway - Railway Deployment"
    echo "====================================="
    echo "1. Full deployment (build, test, deploy)"
    echo "2. Build Docker image only"
    echo "3. Test Docker image locally"
    echo "4. Deploy to Railway"
    echo "5. Show deployment status"
    echo "6. View logs"
    echo "7. Rollback deployment"
    echo "8. Exit"
    echo "====================================="
}

# Main script
main() {
    # Always check for Railway CLI first
    check_railway_cli
    
    if [ $# -eq 0 ]; then
        # Interactive mode
        while true; do
            show_menu
            read -p "Select option: " option
            
            case $option in
                1)
                    check_railway_auth
                    build_docker
                    test_docker
                    deploy_to_railway
                    ;;
                2)
                    build_docker
                    ;;
                3)
                    test_docker
                    ;;
                4)
                    check_railway_auth
                    deploy_to_railway
                    ;;
                5)
                    check_railway_auth
                    show_status
                    ;;
                6)
                    check_railway_auth
                    railway logs -f
                    ;;
                7)
                    check_railway_auth
                    railway rollback
                    ;;
                8)
                    print_info "Goodbye!"
                    exit 0
                    ;;
                *)
                    print_error "Invalid option"
                    ;;
            esac
            
            echo
            read -p "Press Enter to continue..."
        done
    else
        # Command mode
        case $1 in
            build)
                build_docker
                ;;
            test)
                test_docker
                ;;
            deploy)
                check_railway_auth
                deploy_to_railway
                ;;
            status)
                check_railway_auth
                show_status
                ;;
            logs)
                check_railway_auth
                railway logs -f
                ;;
            rollback)
                check_railway_auth
                railway rollback
                ;;
            *)
                print_error "Unknown command: $1"
                echo "Usage: $0 [build|test|deploy|status|logs|rollback]"
                exit 1
                ;;
        esac
    fi
}

# Run main function
main "$@"