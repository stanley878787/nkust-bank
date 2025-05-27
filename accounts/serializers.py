# accounts/serializers.py
from rest_framework import serializers
from .models import Account, Transaction
from .services import transfer_fund

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Account
        fields = ['id', 'account_no', 'name', 'type_desc', 'category',
                  'currency', 'balance']

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Transaction
        fields = ['id', 'tx_time', 'amount', 'memo']

class TransferSerializer(serializers.Serializer):
    from_account_id = serializers.IntegerField()
    to_account_no   = serializers.CharField(max_length=14)
    amount          = serializers.DecimalField(max_digits=18, decimal_places=2)
    memo            = serializers.CharField(max_length=100, allow_blank=True)

    def validate(self, attrs):
        user = self.context["request"].user
        result = transfer_fund(
            user,
            attrs["from_account_id"],
            attrs["to_account_no"],
            attrs["amount"],
            attrs.get("memo","")
        )
        attrs["result"] = result
        return attrs