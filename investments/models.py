# Create your models here.
from django.db import models
from django.conf import settings

class Order(models.Model):
    user        = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    symbol      = models.CharField("股票代號", max_length=20)
    name        = models.CharField("股票名稱", max_length=100)
    unit_price  = models.DecimalField("當時單價", max_digits=12, decimal_places=2)
    quantity    = models.PositiveIntegerField("千股單位數量")
    total       = models.DecimalField("總金額", max_digits=14, decimal_places=2)
    created_at  = models.DateTimeField("下單時間", auto_now_add=True)

    class Meta:
        db_table = "investments_orders"
        verbose_name = "下單紀錄"
        verbose_name_plural = "下單紀錄"

    def __str__(self):
        return f"{self.user.username} {self.symbol} x{self.quantity}"
