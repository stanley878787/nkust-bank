# accounts/management/commands/seed_tx.py
import calendar
import random
from decimal import Decimal
from datetime import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from dateutil.relativedelta import relativedelta


from accounts.models import Account, Transaction

class Command(BaseCommand):
    help = "為台幣帳戶製造最近三個月的薪資與消費假資料"

    def handle(self, *args, **options):
        # 只示範對第一個台幣帳戶做種子
        user_acct = Account.objects.filter(category="ntd").first()
        if not user_acct:
            self.stdout.write(self.style.ERROR("找不到任何台幣帳戶"))
            return

        # 時區與今天
        now   = timezone.now()
        today = now.date()
        tz    = now.tzinfo

        # 消費用的隨機 memo
        low_memos = ["早餐", "午餐", "晚餐", "超商"]
        high_memos = ["訂閱", "網購"]

        memo_category_map = {
            "早餐": "food",
            "午餐": "food",
            "晚餐": "food",
            "超商": "shopping",
            "訂閱": "subscription",
            "網購": "shopping",
            "薪資": "salary",
        }

        # 從本月起，往回 3 個月
        for i in range(3):
            # 計算該月的第一天
            first_of_month = (today.replace(day=1) - relativedelta(months=i))
            year, month    = first_of_month.year, first_of_month.month
            days_in_month  = calendar.monthrange(year, month)[1]

            # 1 號：入薪資
            salary_dt = timezone.make_aware(
                datetime(year, month, 1, 9, 0),
                tz
            )
            salary_amt = Decimal(random.randint(50000, 60000))  # 這裡隨機或固定都行
            Transaction.objects.create(
                account  = user_acct,
                tx_time  = salary_dt,
                amount   = salary_amt,
                tx_type  = "in",
                memo     = "薪資",
                category = memo_category_map["薪資"]
            )
            user_acct.balance += salary_amt
            user_acct.save(update_fields=["balance"])

            # 其餘每天：一筆消費
            for day in range(1, days_in_month + 1):
                # 隨機時間（08:00–22:00 之間）
                hour   = random.randint(8, 22)
                minute = random.randint(0, 59)
                tx_dt  = timezone.make_aware(
                    datetime(year, month, day, hour, minute),
                    tz
                )

                choice_memo = random.randint(0, 1)
                if choice_memo == 0:
                    low_amt   = Decimal(random.randint(50, 500))
                    low_memo  = random.choice(low_memos)
                    Transaction.objects.create(
                        account = user_acct,
                        tx_time = tx_dt,
                        amount  = -low_amt,
                        tx_type = "out",
                        memo    = low_memo,
                        category = memo_category_map[low_memo]
                    )
                    user_acct.balance -= low_amt
                    user_acct.save(update_fields=["balance"])
                else:
                    high_amt   = Decimal(random.randint(300, 5000))
                    high_memo  = random.choice(high_memos)
                    Transaction.objects.create(
                        account = user_acct,
                        tx_time = tx_dt,
                        amount  = -high_amt,
                        tx_type = "out",
                        memo    = high_memo,
                        category = memo_category_map[high_memo]
                    )
                    user_acct.balance -= high_amt
                    user_acct.save(update_fields=["balance"])

        self.stdout.write(self.style.SUCCESS("🎉 已完成三個月薪資＋消費的假資料產生"))
