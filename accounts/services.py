# accounts/services.py
from django.conf import settings
from decimal import Decimal
from django.db import models, transaction
from .models import Account, Transaction
from .utils  import gen_account_no
from django.core.exceptions import ValidationError

 # —— “即時匯率表” —— 
FX_RATE_TO_USD = {
    "USD": Decimal("1"),          # 1 USD = 1   USD
    "TWD": Decimal("0.031"),      # 1 TWD = 0.031 USD  (示範用)
    "JPY": Decimal("0.0064")      # 1 JPY = 0.0064 USD
}

# ──────────────────────────────────────────────
# ① 產生 14 碼帳號   <兩碼前綴> + <12 位流水號>
#    前綴可自己決定：11=台幣、22=外幣、33=投資
# ──────────────────────────────────────────────
PREFIX = {
    "ntd": "11",
    "fx" : "22",
    "inv": "33",
}
def gen_account_no(category: str) -> str:
    """
    依 category 產生不重複帳號，例如：
      ntd → 11000000000001
      fx  → 22000000000001
    """
    last = Account.objects.filter(category=category) \
                          .order_by("-id").first()
    seq  = int(last.account_no[-12:]) + 1 if last else 1
    return f"{PREFIX[category]}{seq:012d}"


# ──────────────────────────────────────────────
# ② 儀表板三張卡片用：回傳各類別總額
# ──────────────────────────────────────────────
def get_overview_totals(user):
    """
    回傳：
    {
        "ntd_total":  Decimal      (TWD 原幣別加總)
        "fx_total":   Decimal      (全部外幣 ➜ 換算 **USD** 後的加總)
        "inv_total":  Decimal
    }
    """
    result = {
        "ntd_total": Decimal("0"),
        "fx_total":  Decimal("0"),
        "inv_total": Decimal("0"),
    }

    for acc in Account.objects.filter(user=user):
        if acc.category == "ntd":
            result["ntd_total"] += acc.balance
        elif acc.category == "fx":
            rate = FX_RATE_TO_USD.get(acc.currency, Decimal("0"))
            result["fx_total"]  += (acc.balance * rate)
        elif acc.category == "inv":
            result["inv_total"] += acc.balance

    return result


# ──────────────────────────────────────────────
# ③ 註冊完成時呼叫：auto-create 4 個帳戶 + 入帳交易
# ──────────────────────────────────────────────
@transaction.atomic
def create_user_accounts(user):
    """
    為新使用者建立 4 個帳戶並各寫入一筆「開戶禮金」交易

      台幣活期     10000  TWD
      美金活期       100  USD
      日圓活期         0  JPY
      投資帳戶         0  TWD
    """
    seed = [
        # name,            type,               cat , cur , init_amt
        ("活期存款",        "台幣存款帳戶",       "ntd", "TWD",  "10000.00"),
        ("USD 活期存款",   "外幣帳戶 (USD)",    "fx" , "USD",   "100.00"),
        ("JPY 活期存款",   "外幣帳戶 (JPY)",    "fx" , "JPY",     "0.00"),
        ("投資帳戶",        "證券帳戶",       "inv", "TWD",     "0.00"),
    ]

    created = []
    for name, typ, cat, cur, amt in seed:
        acct = Account.objects.create(
            user       = user,
            account_no = gen_account_no(cat),
            name       = name,
            type_desc  = typ,
            category   = cat,
            currency   = cur,
            balance    = Decimal(amt),
        )
        # 若初始金額 > 0 就寫交易
        if Decimal(amt) != 0:
            Transaction.objects.create(
                account = acct,
                amount  = Decimal(amt),
                memo    = "開戶禮金",
                tx_type = "in"
            )
        created.append(acct)

    return created

@transaction.atomic
def transfer_fund(user, from_id, to_account_no, amount: Decimal, memo=""):
    if amount <= 0:
        raise ValidationError("金額必須大於 0")
    
    try:
        src = (Account.objects.select_for_update().get(id=from_id, user=user))
    except Account.DoesNotExist:
        raise ValidationError("來源帳號不存在")
    
    try:
        dst = (Account.objects.select_for_update().get(account_no=to_account_no))
    except Account.DoesNotExist:
        raise ValidationError("目的帳號不存在")
    
    if src.balance < amount:
        raise ValidationError("餘額不足")
    
    if src.currency != dst.currency:
        raise ValidationError("目前僅支援同幣種轉帳")
    
    if src == dst:
        raise ValidationError("不要亂搞! Look at my eyes! why tell me why??")
    
    with transaction.atomic():
        src.balance -= amount
        dst.balance += amount
        src.save(update_fields=["balance"])
        dst.save(update_fields=["balance"])

        Transaction.objects.bulk_create([
            Transaction(
                account=src,
                amount=-amount,
                memo=f"轉出→{dst.account_no} {memo}",
                tx_type="xfer"
            ),
            Transaction(
                account=dst,
                amount= amount,
                memo=f"轉入←{src.account_no} {memo}",
                tx_type="xfer"
            )
        ])

    return {"from": src.id, "to": dst.id, "amount":str(amount)}