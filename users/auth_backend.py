# users/auth_backend.py
from django.contrib.auth.backends import ModelBackend
from .models import User

class IDNumberBackend(ModelBackend):
    """
    讓使用者用 id_number + user_code + password 登入。
    """
    def authenticate(self, request, id_number=None, user_code=None, password=None, **kwargs):
        # print("🔍 authenticate() got:", id_number, user_code, password)
        if id_number is None or user_code is None or password is None:
            return None
        try:
            user = User.objects.get(id_number=id_number, user_code=user_code)
        except User.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
    
    
