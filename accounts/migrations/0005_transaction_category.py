# Generated by Django 4.2.21 on 2025-05-30 03:44

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_alter_transaction_tx_time'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='category',
            field=models.CharField(choices=[('food', '餐飲'), ('shop', '購物'), ('bill', '帳單'), ('salary', '薪資'), ('other', '其他')], default='other', max_length=10),
        ),
    ]
