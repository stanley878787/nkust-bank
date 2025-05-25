# accounts/serializers.py
from rest_framework import serializers
from .models import Account, Transaction

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Account
        fields = ['id', 'name', 'type_desc', 'category',
                  'currency', 'balance']

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Transaction
        fields = ['id', 'tx_time', 'amount', 'memo']
