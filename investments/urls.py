# investments/urls.py

from django.urls import path
from . import views

urlpatterns = [
    path('api/twse_symbol_search/', views.twse_symbol_search, name='twse_symbol_search'),
    path('api/twse_quote/', views.twse_quote, name='twse_quote'),

    # 下單
    path('api/place_order/', views.place_order, name='place_order'),

    path('api/my_holdings/', views.my_holdings, name='my_holdings'),
    path('api/my_aggregated_holdings/', views.my_aggregated_holdings, name='my_holdings'),
]
