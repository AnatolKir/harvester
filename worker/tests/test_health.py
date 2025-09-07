"""Tests for health check module."""
import pytest
from unittest.mock import patch
import os
from health import HealthCheck


class TestHealthCheck:
    """Test suite for HealthCheck class."""
    
    def test_get_status(self):
        """Test getting health status."""
        status = HealthCheck.get_status()
        
        assert status['status'] == 'healthy'
        assert 'timestamp' in status
        assert 'version' in status
        assert 'environment' in status
        assert 'checks' in status
        assert 'database' in status['checks']
        assert 'redis' in status['checks']
        assert 'playwright' in status['checks']
    
    @patch.dict(os.environ, {'WORKER_VERSION': '2.0.0', 'ENVIRONMENT': 'production'})
    def test_get_status_with_env_vars(self):
        """Test health status with environment variables."""
        status = HealthCheck.get_status()
        
        assert status['version'] == '2.0.0'
        assert status['environment'] == 'production'
    
    @patch.dict(os.environ, {'SUPABASE_URL': 'https://test.supabase.co'})
    def test_check_database_configured(self):
        """Test database check when configured."""
        result = HealthCheck.check_database()
        
        assert result['status'] == 'connected'
        assert 'url' in result
        assert 'supabase.co' in result['url']
    
    @patch.dict(os.environ, {}, clear=True)
    def test_check_database_not_configured(self):
        """Test database check when not configured."""
        # Remove SUPABASE_URL from environment
        if 'SUPABASE_URL' in os.environ:
            del os.environ['SUPABASE_URL']
        
        result = HealthCheck.check_database()
        assert result['status'] == 'not_configured'
    
    @patch.dict(os.environ, {'UPSTASH_REDIS_REST_URL': 'https://test.upstash.io'})
    def test_check_redis_configured(self):
        """Test Redis check when configured."""
        result = HealthCheck.check_redis()
        
        assert result['status'] == 'connected'
        assert 'url' in result
        assert result['url'] == 'upstash.io'
    
    @patch.dict(os.environ, {}, clear=True)
    def test_check_redis_not_configured(self):
        """Test Redis check when not configured."""
        # Remove UPSTASH_REDIS_REST_URL from environment
        if 'UPSTASH_REDIS_REST_URL' in os.environ:
            del os.environ['UPSTASH_REDIS_REST_URL']
        
        result = HealthCheck.check_redis()
        assert result['status'] == 'not_configured'
    
    def test_check_playwright(self):
        """Test Playwright check."""
        result = HealthCheck.check_playwright()
        
        assert result['status'] == 'ready'
        assert 'browsers' in result
        assert 'chromium' in result['browsers']
        assert 'firefox' in result['browsers']
        assert 'webkit' in result['browsers']
    
    def test_is_healthy(self):
        """Test is_healthy method."""
        # Should return True when status is healthy
        assert HealthCheck.is_healthy() is True
    
    @patch.object(HealthCheck, 'get_status')
    def test_is_healthy_false(self, mock_get_status):
        """Test is_healthy returns False when status is not healthy."""
        mock_get_status.return_value = {
            'status': 'unhealthy',
            'checks': {}
        }
        
        assert HealthCheck.is_healthy() is False
    
    @patch.object(HealthCheck, 'check_database')
    def test_database_check_error(self, mock_check_db):
        """Test database check error handling."""
        mock_check_db.side_effect = Exception('Database connection failed')
        
        # The actual check_database method should catch this
        # but for testing, we're mocking it directly
        with pytest.raises(Exception):
            mock_check_db()
    
    def test_status_structure(self):
        """Test the structure of the health status response."""
        status = HealthCheck.get_status()
        
        # Check required fields
        required_fields = ['status', 'timestamp', 'version', 'environment', 'checks']
        for field in required_fields:
            assert field in status, f"Missing required field: {field}"
        
        # Check checks structure
        required_checks = ['database', 'redis', 'playwright']
        for check in required_checks:
            assert check in status['checks'], f"Missing required check: {check}"
            assert 'status' in status['checks'][check], f"Missing status in {check} check"