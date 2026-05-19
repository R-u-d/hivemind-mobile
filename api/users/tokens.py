from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import AccessToken


class BlacklistableAccessToken(AccessToken):
    def verify(self):
        super().verify()
        jti = self.payload.get("jti")
        if jti and BlacklistedToken.objects.filter(token__jti=jti).exists():
            raise TokenError("Token is blacklisted")
