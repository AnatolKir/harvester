#!/bin/bash

# TikTok Domain Harvester - Deployment Status Checker
# Checks the health and status of deployed services

set -e

# Colors for output
RED='\033[31m'
GREEN='\033[32m'
YELLOW='\033[33m'
BLUE='\033[34m'
RESET='\033[0m'
BOLD='\033[1m'

log_info() { echo -e "${BLUE}ℹ️  $1${RESET}"; }
log_success() { echo -e "${GREEN}✅ $1${RESET}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${RESET}"; }
log_error() { echo -e "${RED}❌ $1${RESET}"; }
log_header() { echo -e "${BOLD}${BLUE}$1${RESET}"; }

# Default URLs - can be overridden with environment variables
WEB_URL="${WEB_URL:-https://tiktok-harvester.vercel.app}"
WEB_STAGING_URL="${WEB_STAGING_URL:-https://tiktok-harvester-staging.vercel.app}"
WORKER_URL="${WORKER_URL:-}"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"

check_http_endpoint() {
    local name="$1"
    local url="$2"
    local expected_status="${3:-200}"
    local timeout="${4:-10}"
    
    log_info "Checking $name: $url"
    
    if [ -z "$url" ]; then
        log_warning "$name URL not configured"
        return 1
    fi
    
    local response
    local status_code
    local response_time
    
    # Get HTTP status and response time
    response=$(curl -s -w "%{http_code}|%{time_total}" --max-time "$timeout" "$url" 2>/dev/null || echo "000|0")
    status_code=$(echo "$response" | cut -d'|' -f1)
    response_time=$(echo "$response" | cut -d'|' -f2)
    
    if [ "$status_code" = "000" ]; then
        log_error "$name is unreachable (timeout or connection error)"
        return 1
    elif [ "$status_code" = "$expected_status" ]; then
        log_success "$name is healthy (HTTP $status_code, ${response_time}s)"
        return 0
    else
        log_warning "$name returned HTTP $status_code (expected $expected_status)"
        return 1
    fi
}

check_web_application() {
    log_header "🌐 Web Application Status"
    echo ""
    
    local errors=0
    
    # Production web
    if ! check_http_endpoint "Production Web" "$WEB_URL/api/health" 200 15; then
        ((errors++))
    fi
    
    # Staging web (if different from production)
    if [ "$WEB_STAGING_URL" != "$WEB_URL" ]; then
        if ! check_http_endpoint "Staging Web" "$WEB_STAGING_URL/api/health" 200 15; then
            ((errors++))
        fi
    fi
    
    # Check main page
    if ! check_http_endpoint "Main Page" "$WEB_URL" 200 15; then
        ((errors++))
    fi
    
    # Check auth endpoint
    if ! check_http_endpoint "Auth Session" "$WEB_URL/api/auth/session" 200 10; then
        ((errors++))
    fi
    
    echo ""
    if [ $errors -eq 0 ]; then
        log_success "All web endpoints are healthy"
    else
        log_warning "$errors web endpoint(s) failed health checks"
    fi
    
    return $errors
}

check_worker_service() {
    log_header "🔨 Worker Service Status"
    echo ""
    
    if [ -z "$WORKER_URL" ]; then
        log_warning "Worker URL not configured (WORKER_URL environment variable)"
        log_info "Set WORKER_URL to check worker health"
        return 0
    fi
    
    local errors=0
    
    # Worker health check
    if ! check_http_endpoint "Worker Health" "$WORKER_URL/health" 200 30; then
        ((errors++))
    fi
    
    echo ""
    if [ $errors -eq 0 ]; then
        log_success "Worker service is healthy"
    else
        log_error "Worker service failed health check"
    fi
    
    return $errors
}

check_external_services() {
    log_header "🔗 External Services Status"
    echo ""
    
    local errors=0
    
    # Supabase
    if [ -n "$SUPABASE_URL" ]; then
        if ! check_http_endpoint "Supabase" "${SUPABASE_URL}/rest/v1/" 200 10; then
            ((errors++))
        fi
    else
        log_warning "Supabase URL not configured"
    fi
    
    # Upstash Redis (if REST URL is available)
    if [ -n "$UPSTASH_REDIS_REST_URL" ]; then
        # Try to ping Redis (may return 401 without token, but that's OK)
        if check_http_endpoint "Upstash Redis" "$UPSTASH_REDIS_REST_URL" 401 10; then
            log_success "Upstash Redis is reachable (authentication required)"
        elif check_http_endpoint "Upstash Redis" "$UPSTASH_REDIS_REST_URL" 200 10; then
            log_success "Upstash Redis is healthy"
        else
            ((errors++))
        fi
    else
        log_warning "Upstash Redis URL not configured"
    fi
    
    echo ""
    if [ $errors -eq 0 ]; then
        log_success "All external services are reachable"
    else
        log_warning "$errors external service(s) may have issues"
    fi
    
    return $errors
}

run_performance_check() {
    log_header "⚡ Performance Check"
    echo ""
    
    if [ -z "$WEB_URL" ]; then
        log_warning "Web URL not configured for performance check"
        return 0
    fi
    
    log_info "Testing response times..."
    
    # Test multiple endpoints for performance
    local endpoints=(
        "$WEB_URL"
        "$WEB_URL/api/health"
        "$WEB_URL/api/auth/session"
    )
    
    local total_time=0
    local successful_requests=0
    
    for endpoint in "${endpoints[@]}"; do
        log_info "Testing: $endpoint"
        
        local response_time
        response_time=$(curl -s -w "%{time_total}" --max-time 30 -o /dev/null "$endpoint" 2>/dev/null || echo "0")
        
        if (( $(echo "$response_time > 0" | bc -l 2>/dev/null || echo "0") )); then
            local time_ms=$(echo "$response_time * 1000" | bc -l 2>/dev/null || echo "0")
            log_info "Response time: ${time_ms}ms"
            total_time=$(echo "$total_time + $response_time" | bc -l 2>/dev/null || echo "0")
            ((successful_requests++))
        else
            log_warning "Failed to measure response time for $endpoint"
        fi
    done
    
    if [ $successful_requests -gt 0 ]; then
        local avg_time=$(echo "scale=3; $total_time / $successful_requests" | bc -l 2>/dev/null || echo "0")
        local avg_time_ms=$(echo "$avg_time * 1000" | bc -l 2>/dev/null || echo "0")
        
        echo ""
        log_info "Average response time: ${avg_time_ms}ms"
        
        if (( $(echo "$avg_time < 2.0" | bc -l 2>/dev/null || echo "0") )); then
            log_success "Performance is excellent (< 2s average)"
        elif (( $(echo "$avg_time < 5.0" | bc -l 2>/dev/null || echo "0") )); then
            log_success "Performance is acceptable (< 5s average)"
        else
            log_warning "Performance may be slow (> 5s average)"
        fi
    else
        log_error "Could not measure performance - all requests failed"
    fi
}

show_deployment_info() {
    log_header "📊 Deployment Information"
    echo ""
    
    log_info "Configured URLs:"
    echo "  Production Web:  ${WEB_URL:-'Not configured'}"
    echo "  Staging Web:     ${WEB_STAGING_URL:-'Not configured'}"
    echo "  Worker:          ${WORKER_URL:-'Not configured'}"
    echo "  Supabase:        ${SUPABASE_URL:-'Not configured'}"
    echo ""
    
    log_info "Git Information:"
    if command -v git >/dev/null 2>&1 && git rev-parse --git-dir >/dev/null 2>&1; then
        local branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
        local commit=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
        local status=$(git status --porcelain 2>/dev/null | wc -l | xargs)
        
        echo "  Branch:          $branch"
        echo "  Commit:          $commit"
        echo "  Uncommitted:     $status files"
    else
        echo "  Not a git repository or git not available"
    fi
    echo ""
}

main() {
    echo -e "${BOLD}${BLUE}TikTok Domain Harvester - Deployment Status${RESET}"
    echo "=============================================="
    echo ""
    
    # Show deployment information
    show_deployment_info
    
    local total_errors=0
    
    # Check web application
    check_web_application
    total_errors=$((total_errors + $?))
    echo ""
    
    # Check worker service
    check_worker_service
    total_errors=$((total_errors + $?))
    echo ""
    
    # Check external services
    check_external_services
    total_errors=$((total_errors + $?))
    echo ""
    
    # Performance check (optional)
    if [ "${1:-}" = "--performance" ] || [ "${1:-}" = "-p" ]; then
        run_performance_check
        echo ""
    fi
    
    # Final summary
    log_header "📋 Summary"
    echo ""
    
    if [ $total_errors -eq 0 ]; then
        log_success "All systems are operational!"
        echo ""
        log_info "Run with --performance flag for response time analysis"
        exit 0
    else
        log_error "$total_errors issue(s) detected"
        echo ""
        log_info "Check the errors above and verify your deployments"
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    -h|--help)
        echo "TikTok Domain Harvester - Deployment Status Checker"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  -p, --performance    Include performance testing"
        echo "  -h, --help          Show this help message"
        echo ""
        echo "Environment Variables:"
        echo "  WEB_URL              Production web URL (default: https://tiktok-harvester.vercel.app)"
        echo "  WEB_STAGING_URL      Staging web URL"
        echo "  WORKER_URL           Worker service URL"
        echo "  SUPABASE_URL         Supabase project URL"
        echo ""
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac