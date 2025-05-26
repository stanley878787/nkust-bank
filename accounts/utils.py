# accounts/utils.py
import random
from datetime import datetime
from .models import Account

def gen_account_no(prefix:str=""):
    """
    產生 14 碼唯一帳號：<prefix(2)><YYMMDD(6)><亂數(6)>
    """
    while True:
        base = f"{prefix}{datetime.now():%y%m%d}{random.randint(0, 999999):06d}"
        if not Account.objects.filter(account_no=base).exists():
            return base
