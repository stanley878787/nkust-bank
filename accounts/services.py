from decimal import Decimal
from django.db import models
from .models import Account

def get_overview_totals(user):
    qs = (Account.objects
          .filter(user=user)
          .values('category')
          .annotate(total=models.Sum('balance')))
    result = {'ntd_total': Decimal('0'),
              'fx_total' : Decimal('0'),
              'inv_total': Decimal('0')}
    for row in qs:
        if row['category'] == 'ntd':
            result['ntd_total'] = row['total']
        elif row['category'] == 'fx':
            result['fx_total']  = row['total']
        elif row['category'] == 'inv':
            result['inv_total'] = row['total']
    return result