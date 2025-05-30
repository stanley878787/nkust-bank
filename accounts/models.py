# accounts/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone

class Account(models.Model):
    CATEGORY_CHOICES = [
        ('ntd', '台幣存款'),
        ('fx',  '外幣存款'),
        ('inv', '投資'),
    ]
    account_no = models.CharField(max_length=14, unique=True, null=False, blank=False)
    user       = models.ForeignKey(settings.AUTH_USER_MODEL,
                                   on_delete=models.CASCADE,
                                   related_name='accounts')
    name       = models.CharField(max_length=30)          # 活期存款…等
    type_desc  = models.CharField(max_length=30, blank=True)
    category   = models.CharField(max_length=3, choices=CATEGORY_CHOICES)
    currency   = models.CharField(max_length=5, default='TWD')  # USD, JPY…
    balance    = models.DecimalField(max_digits=18, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.user.user_code}-{self.name}"

class Transaction(models.Model):
    TX_CHOICES = [
        ("in",  "收入"),      # 存入、薪資、退款
        ("out", "支出"),      # 消費、轉帳出去
        ("xfer","轉帳"),      # 內部帳戶移轉
    ]

    CATEGORY_CHOICES = [
        ("food",   "餐飲"), 
        ("shopping",   "購物"),
        ("subscription",   "訂閱"),
        ("bill",   "帳單"),
        ("salary", "薪資"),     
        ("other",  "其他"),
    ]

    account    = models.ForeignKey(Account,
                                   on_delete=models.CASCADE,
                                   related_name='transactions')
    # tx_time    = models.DateTimeField(auto_now_add=True)
    tx_time    = models.DateTimeField(default=timezone.now)
    amount     = models.DecimalField(max_digits=18, decimal_places=2)
    memo       = models.CharField(max_length=100, blank=True)
    tx_type    = models.CharField(max_length=4, choices=TX_CHOICES, default="out")

    category = models.CharField(max_length=30,
                                choices=CATEGORY_CHOICES,
                                default="other")

    class Meta:
        ordering = ['-tx_time']