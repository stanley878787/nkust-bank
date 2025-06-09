import csv,os, logging
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
import yfinance as yf
from rest_framework import serializers
from accounts.models import Account
from .models import Order
from django.db import transaction
from decimal import Decimal
from django.db.models import Sum
logger = logging.getLogger(__name__)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def place_order(request):
    """
    POST /investments/api/place_order/
    Body JSON:
      symbol, name, unit_price, quantity, total
    同時要扣除使用者的 ntd 存款餘額
    """
    data = request.data
    # 必要欄位檢查
    for f in ("symbol","name","unit_price","quantity","total"):
        if f not in data:
            return Response({"success": False, "error": f"缺少欄位 {f}"}, status=status.HTTP_400_BAD_REQUEST)

    # 計算檢核
    expected = data["unit_price"] * data["quantity"] * 1000
    if round(expected, 2) != round(data["total"], 2):
        return Response({"success": False, "error": "total 計算不符"}, status=status.HTTP_400_BAD_REQUEST)

    # 取得使用者的 ntd 帳戶
    try:
        # 假設 category='ntd' 或者其他你存 category 的值
        account = Account.objects.get(user=request.user, category='ntd')
    except Account.DoesNotExist:
        return Response({"success": False, "error": "找不到使用者 TWD 帳戶"}, status=status.HTTP_400_BAD_REQUEST)

    total_cost = round(data["total"], 2)
    if account.balance < total_cost:
        return Response({"success": False, "error": "餘額不足"}, status=status.HTTP_400_BAD_REQUEST)

    # 用 transaction 確保 atomicity
    with transaction.atomic():
        # 1) 扣款
        account.balance = account.balance - total_cost
        account.save()

        # 2) 建立訂單
        order = Order.objects.create(
            user        = request.user,
            symbol      = data["symbol"],
            name        = data["name"],
            unit_price  = data["unit_price"],
            quantity    = data["quantity"],
            total       = data["total"]
        )

    return Response({"success": True, "order_id": order.id}, status=status.HTTP_201_CREATED)

# 1. 先寫一個簡單的序列化器
class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ('id', 'symbol', 'name', 'unit_price', 'quantity')

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_holdings(request):
    """
    GET /investments/api/my_holdings/
    回傳目前使用者所有持倉（quantity 為千股單位）
    """
    orders = Order.objects.filter(user=request.user)
    serializer = OrderSerializer(orders, many=True)
    return Response(serializer.data)


class AggregatedHoldingSerializer(serializers.Serializer):
    symbol          = serializers.CharField()
    name            = serializers.CharField()
    total_quantity  = serializers.IntegerField()       # 千股張數
    average_cost    = serializers.DecimalField(12, 2)  # 每股成本

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_aggregated_holdings(request):
    """
    GET /investments/api/my_aggregated_holdings/
    回傳使用者每檔股票的累積張數和加權平均成本
    """
    # 1. 用 ORM 聚合：同一 symbol 分組，計算 sum(quantity) 及 sum(total)
    qs = (
        Order.objects
        .filter(user=request.user)
        .values('symbol', 'name')
        .annotate(
            total_quantity=Sum('quantity'),
            total_cost=Sum('total'),    # total 是 Decimal(張*1000股*單價)
        )
    )

    results = []
    for entry in qs:
        symbol = entry['symbol']
        name = entry['name']
        qty = entry['total_quantity']            # 張數
        total_cost = entry['total_cost']         # Decimal

        # 2. 算出每股平均成本
        avg_cost = total_cost / Decimal(qty * 1000)

        results.append({
            'symbol': symbol,
            'name': name,
            'total_quantity': qty,
            'average_cost': avg_cost.quantize(Decimal('0.01')),
        })

    serializer = AggregatedHoldingSerializer(results, many=True)
    return Response(serializer.data)

@require_GET
def twse_symbol_search(request):
    q = request.GET.get('q', '').strip()
    if not q:
        return JsonResponse({'results': []})

    try:
        # CSV 檔案本地路徑
        csv_path = os.path.join(settings.BASE_DIR, 'data', 'twse_stocks.csv')
        with open(csv_path, encoding='utf-8', errors='ignore') as f:
            reader = csv.DictReader(f)
            q_upper = q.upper()
            q_lower = q.lower()

            results = []
            for row in reader:
                symbol = row['公司代號'].strip()
                name = row['公司簡稱'].strip()
                if q_upper in symbol.upper() or q_lower in name.lower():
                    results.append({'symbol': symbol, 'name': name})
                    if len(results) >= 30:
                        break

        return JsonResponse({'results': results})

    except Exception:
        return JsonResponse({'error': 'symbol_search 查詢錯誤'}, status=500)


@require_GET
def twse_quote(request):
    symbol = request.GET.get('symbol', '').strip()
    if not symbol:
        return JsonResponse({'error': 'missing symbol'}, status=400)

    try:
        ticker_str = f"{symbol}.TW"
        ticker = yf.Ticker(ticker_str)

        # 基本資訊
        info = ticker.info
        name = info.get('shortName') or info.get('longName') or symbol

        # 價格資訊（最近一日、一分鐘）
        hist = ticker.history(period="1d", interval="1m")
        if hist.empty:
            return JsonResponse({'error': 'no data for symbol'}, status=404)

        last_price = hist['Close'].iloc[-1]
        prev_close = info.get('previousClose') or hist['Close'].iloc[0]
        change = last_price - prev_close
        percent = (change / prev_close) * 100 if prev_close else 0

        return JsonResponse({
            'price': round(last_price, 2),
            'change': round(change, 2),
            'percent': f"{round(percent, 2)}%",
            'name': name,
        })

    except Exception as e:
        logger.exception(f"yfinance quote error: {e}")
        return JsonResponse({'error': 'quote 內部錯誤'}, status=500)
