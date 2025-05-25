# accounts/models.py
from django.db import models
from django.conf import settings

class Account(models.Model):
    CATEGORY_CHOICES = [
        ('ntd', '台幣存款'),
        ('fx',  '外幣存款'),
        ('inv', '投資'),
    ]
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
    account    = models.ForeignKey(Account,
                                   on_delete=models.CASCADE,
                                   related_name='transactions')
    tx_time    = models.DateTimeField(auto_now_add=True)
    amount     = models.DecimalField(max_digits=18, decimal_places=2)
    memo       = models.CharField(max_length=100, blank=True)

    class Meta:
        ordering = ['-tx_time']