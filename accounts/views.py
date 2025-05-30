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

    # 2) Summary：支援 ?period=3months/6months/1year
    @action(detail=True)
    def summary(self, request, pk=None):
        acct = self.get_object()

        # 讀取 ?period=3months / 6months / 1year，預設是「3months」
        period = request.query_params.get('period', '3months')
        if period == '6months':
            days = 180
            n_months = 6
        elif period == '1year':
            days = 365
            n_months = 12
        else:
            days = 90
            n_months = 3

        # 篩選最近 days 天的 tx_type="out"
        cutoff_date = timezone.now() - timedelta(days=days)
        trans_qs = acct.transactions.filter(
            tx_time__gte=cutoff_date,
            tx_type="out"
        )

        # 1) 各消費類別（分類總額）
        by_cat = trans_qs.values("category") \
                        .annotate(total=Sum("amount")) \
                        .order_by("-total")
        label_map = {**dict(Transaction.CATEGORY_CHOICES), "shopping": "購物", "subscription": "訂閱"}
        cat_labels = [label_map.get(r["category"], r["category"]) for r in by_cat]
        cat_data   = [float(abs(r["total"])) for r in by_cat]

        # 2) 每月總支出 → 動態分組
        today = timezone.localdate()
        months = OrderedDict()
        for i in range(n_months - 1, -1, -1):
            m = (today.replace(day=1) - relativedelta(months=i))
            key = m.strftime("%Y-%m")
            months[key] = Decimal("0")

        for tx in trans_qs:
            key = tx.tx_time.strftime("%Y-%m")
            if key in months:
                months[key] += abs(tx.amount)

        month_labels = list(months.keys())             # e.g. ["2025-03", "2025-04", "2025-05"]
        month_data   = [float(v) for v in months.values()]

        # 3) 計算支出總額與上期比較百分比
        period_start = today.replace(day=1) - relativedelta(months=n_months - 1)
        period_end = today

        last_period_start = period_start - relativedelta(months=n_months)
        last_period_end = period_start - timedelta(days=1)

        current_total = acct.transactions.filter(
            tx_time__date__gte=period_start,
            tx_time__date__lte=period_end,
            tx_type="out"
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        last_total = acct.transactions.filter(
            tx_time__date__gte=last_period_start,
            tx_time__date__lte=last_period_end,
            tx_type="out"
        ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

        if last_total == 0:
            diff_percent = None if current_total == 0 else 100.0
        else:
            diff_percent = float((current_total - last_total) / abs(last_total) * 100)

        return Response({
            "cat": {
                "labels": cat_labels,
                "data": cat_data
            },
            "month": {
                "labels": month_labels,
                "data": month_data
            },
            "comparison": {
                "current": float(abs(current_total)),
                "previous": float(abs(last_total)),
                "percent_change": round(diff_percent, 1) if diff_percent is not None else None,
                "trend": (
                    "up" if diff_percent and diff_percent > 0 else
                    "down" if diff_percent and diff_percent < 0 else
                    "flat"
                )
            }
        })



class TransferAPIView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        ser = TransferSerializer(data=request.data, context={"request": request})
        ser.is_valid(raise_exception=True)
        return Response(ser.validated_data["result"], status=status.HTTP_200_OK)
