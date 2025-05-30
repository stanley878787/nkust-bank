# accounts/views.py
from django.shortcuts import render
from rest_framework import viewsets, permissions, views, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Account, Transaction
from .serializers import AccountSerializer, TransactionSerializer, TransferSerializer
from .services import get_overview_totals
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum
from collections import OrderedDict
# from django.db.models.functions import TruncMonth
# from django.db.models.functions import ExtractYear, ExtractMonth
from dateutil.relativedelta import relativedelta
from decimal import Decimal


class AccountViewSet(viewsets.ReadOnlyModelViewSet):
    """
    list   -> /api/v1/accounts/?category=ntd
    detail -> /api/v1/accounts/1/
    """
    serializer_class   = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Account.objects.filter(user=self.request.user)
        cat = self.request.query_params.get('category')
        return qs.filter(category=cat) if cat else qs

    # GET /api/v1/accounts/overview/
    @action(detail=False, url_path='overview')
    def overview(self, request):
        return Response(get_overview_totals(request.user))
    
    # 1) 明細：/accounts/<pk>/transactions/
    @action(detail=True)
    def transactions(self, request, pk=None):
        qs = (self.get_object()
                    .transactions
                    .filter(tx_time__gte=timezone.now()-timedelta(days=90)))
        ser = TransactionSerializer(qs, many=True)
        return Response(ser.data)
    
    @action(detail=True)
    def summary(self, request, pk=None):
        acct = self.get_object()

        # 只挑出「近 90 天」且 tx_type="out"
        three_m = acct.transactions.filter(
            tx_time__gte=timezone.now() - timedelta(days=90),
            tx_type="out"
        )

        # 1) 各消費類別（不動）
        by_cat = three_m.values("category").annotate(total=Sum("amount")).order_by("-total")
        label_map = {**dict(Transaction.CATEGORY_CHOICES), "shopping":"購物", "subscription":"訂閱"}
        cat_labels = [label_map.get(r["category"], r["category"]) for r in by_cat]
        cat_data   = [float(abs(r["total"])) for r in by_cat]

        # 2) 每月總支出 → Python 分組
        # a) 建立近三個月的「月初標籤」維度
        today = timezone.localdate()
        months = OrderedDict()
        for i in (2,1,0):
            m = (today.replace(day=1) - relativedelta(months=i))
            key = m.strftime("%Y-%m")
            months[key] = Decimal("0")

        # b) 逐筆 Transaction 累加
        for tx in three_m:
            # .tx_time 是 datetime，可能含 tz，strftime 會依本機 time zone 輸出
            key = tx.tx_time.strftime("%Y-%m")
            if key in months:
                months[key] += abs(tx.amount)

        month_labels = list(months.keys())
        month_data   = [float(v) for v in months.values()]

        return Response({
            "cat":   {"labels": cat_labels, "data": cat_data},
            "month": {"labels": month_labels, "data": month_data},
        })


class TransferAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = TransferSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        return Response(ser.validated_data["result"], status=status.HTTP_200_OK)
