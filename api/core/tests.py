from django.test import TestCase


class HealthCheckTest(TestCase):
    def test_health_endpoint_returns_200(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.status_code, 200)

    def test_health_endpoint_returns_ok_status(self):
        response = self.client.get('/api/health/')
        self.assertEqual(response.json(), {'status': 'ok'})