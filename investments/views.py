# investments/views.py
import csv,os, logging
from django.http import JsonResponse
from django.views.decorators.http import require_GET
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
# import yfinance as yf
import requests
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
      symbol, name, unit_price, quantity, total, trade_type
    同時要扣除使用者的 ntd 存款餘額
    """
    data = request.data
    trade_type = data.get('trade_type')
    if trade_type not in ('buy','sell'):
        return Response({"success": False, "error": "不支援的 trade_type"}, status=status.HTTP_400_BAD_REQUEST)
    
    # 必要欄位檢查
    for f in ("symbol","name","unit_price","quantity","total","trade_type"):
        if f not in data:
            return Response({"success": False, "error": f"缺少欄位 {f}"}, status=status.HTTP_400_BAD_REQUEST)

    # 基本參數擷取
    symbol     = data["symbol"]
    name       = data["name"]
    unit_price = Decimal(str(data["unit_price"]))
    qty_units  = int(data["quantity"])    # 千股單位
    total_amt  = Decimal(str(data["total"]))
    trade_type = data["trade_type"]       # 'buy' 或 'sell'   ←

    # 總金額驗算（買賣都通用）
    expected = unit_price * qty_units * 1000
    if expected.quantize(Decimal('0.01')) != total_amt.quantize(Decimal('0.01')):
        return Response({"success": False, "error": "total 計算不符"}, status=status.HTTP_400_BAD_REQUEST)

    # 找投資帳戶 (category='inv')
    try:
        account = Account.objects.get(user=request.user, category='inv') 
    except Account.DoesNotExist:
        return Response({"success": False, "error": "找不到使用者投資帳戶"}, status=status.HTTP_400_BAD_REQUEST)

    # 原子交易
    with transaction.atomic():
        if trade_type == 'buy':
            # 買進：扣款
            if account.balance < total_amt:
                return Response({"success": False, "error": "餘額不足"}, status=status.HTTP_400_BAD_REQUEST)
            account.balance -= total_amt
            account.save()
            record_qty   = qty_units
            record_total = total_amt

        elif trade_type == 'sell':
            # 賣出：先檢查庫存
            agg = (
                Order.objects
                .filter(user=request.user, symbol=symbol)
                .aggregate(total_qty=Sum('quantity'))
            )
            current_qty = agg.get('total_qty') or 0
            if current_qty < qty_units:
                return Response({"success": False, "error": "庫存不足"}, status=status.HTTP_400_BAD_REQUEST)

            # 將賣出的金額加回帳戶
            account.balance += total_amt
            account.save()
            # 用負數記錄賣出
            record_qty   = -qty_units
            record_total = -total_amt

        else:
            return Response({"success": False, "error": "未知的 trade_type"}, status=status.HTTP_400_BAD_REQUEST)

        # 寫入 Order
        order = Order.objects.create(
            user        = request.user,
            symbol      = symbol,
            name        = name,
            unit_price  = unit_price,
            quantity    = record_qty,    # ← 正/負
            total       = record_total   # ← 正/負
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
        qty = entry['total_quantity']            # 可能為 0 或負
        if qty <= 0:
            # 沒庫存（或全數賣光）就直接略過
            continue

        symbol = entry['symbol']
        name   = entry['name']
        total_cost = entry['total_cost']

        # 2. 算平均成本（都已正值，所以不會出現負價）
        avg_cost = (total_cost / Decimal(qty * 1000)).quantize(Decimal('0.01'))

        results.append({
            'symbol': symbol,
            'name':   name,
            'total_quantity': qty,
            'average_cost':   avg_cost,
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
    """
    GET /investments/api/twse_quote/?symbol=2330
    使用 Yahoo Finance Chart API 取當前價格、前收價、計算漲跌、漲跌%
    """
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}

    symbol = request.GET.get('symbol', '').strip()
    if not symbol:
        return JsonResponse({'error': 'missing symbol'}, status=400)

    ticker = f"{symbol}.TW"
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
    params = {
        'range': '1d',       # 取當天資料
        'interval': '1m',    # 1 分鐘一筆
    }

    try:
        # 用 certifi 提供的憑證 bundle 做 SSL 驗證
        resp = requests.get(url, params=params, timeout=10, headers=headers)
        resp.raise_for_status()
        data = resp.json()

        chart = data.get('chart', {}).get('result')
        if not chart:
            return JsonResponse({'error': 'no data for symbol'}, status=404)

        meta = chart[0].get('meta', {})
        last_price = meta.get('regularMarketPrice')
        prev_close = meta.get('previousClose')

        if last_price is None or prev_close is None:
            return JsonResponse({'error': 'incomplete data'}, status=502)

        change = last_price - prev_close
        percent = (change / prev_close * 100) if prev_close else 0

        return JsonResponse({
            'price': round(last_price, 2),
            'change': round(change, 2),
            'percent': f"{round(percent, 2)}%",
            'name': meta.get('symbol', symbol)
        })

    except requests.exceptions.RequestException as e:
        # 網路或 HTTP error
        return JsonResponse({'error': f'network error: {str(e)}'}, status=502)
    except ValueError:
        # JSON decode error
        return JsonResponse({'error': 'invalid response format'}, status=502)
    except Exception as e:
        # 其它意外
        logger.exception(f"twse_quote error: {e}")
        return JsonResponse({'error': f'quote 內部錯誤: {str(e)}'}, status=500)