from unittest.mock import patch

import pytest


@pytest.fixture
def mock_expo():
    """Patch the Expo HTTP call so dispatch never hits the network."""
    with patch("apps.notifications.tasks.send_expo_push") as mock:
        yield mock
