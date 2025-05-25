# accounts/views.py
from django.shortcuts import render
from rest_framework import viewsets, permissions, mixins
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Account
from .serializers import AccountSerializer, TransactionSerializer
from .services import get_overview_totals

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
