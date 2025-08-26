from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.shortcuts import get_object_or_404
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
import os
import hashlib
import logging
from .models import BookFile
from .serializers import BookFileSerializer, BookFileUploadSerializer
from libraries.models import LibraryBook


class BookFileViewSet(viewsets.ModelViewSet):
    queryset = BookFile.objects.all()
    serializer_class = BookFileSerializer
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['library_book', 'file_type', 'text_extracted']
    ordering_fields = ['uploaded_at', 'bytes']
    ordering = ['-uploaded_at']

    def get_queryset(self):
        queryset = BookFile.objects.all()
        library_book_id = self.request.query_params.get('library_book_id')
        if library_book_id:
            queryset = queryset.filter(library_book_id=library_book_id)
        return queryset

    def get_serializer_class(self):
        if self.action in ['create']:
            return BookFileUploadSerializer
        return BookFileSerializer

    def create(self, request, *args, **kwargs):
        """Handle file upload."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Get the uploaded file
            uploaded_file = request.FILES.get('file')
            if not uploaded_file:
                return Response(
                    {'error': 'No file provided'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Validate file type
            file_type = uploaded_file.name.split('.')[-1].lower()
            if file_type not in ['pdf', 'epub']:
                return Response(
                    {'error': 'Only PDF and EPUB files are supported'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get library book
            library_book = get_object_or_404(LibraryBook, id=serializer.validated_data['library_book'].id)
            
            # Generate file path
            file_name = f"books/{library_book.id}/{uploaded_file.name}"
            
            # Save file to storage
            file_path = default_storage.save(file_name, uploaded_file)
            
            # Calculate file size and checksum
            file_size = uploaded_file.size
            checksum = self._calculate_checksum(uploaded_file)
            
            # Create BookFile record
            book_file = BookFile.objects.create(
                library_book=library_book,
                file_type=file_type,
                file_path=file_path,
                bytes=file_size,
                checksum=checksum
            )
            
            # Extract text if it's a PDF
            if file_type == 'pdf':
                self._extract_pdf_text(book_file)
            
            response_serializer = BookFileSerializer(book_file)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logging.error(f"File upload failed: {str(e)}")
            return Response(
                {'error': 'File upload failed'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _calculate_checksum(self, file):
        """Calculate SHA-256 checksum of the file."""
        sha256_hash = hashlib.sha256()
        for chunk in file.chunks():
            sha256_hash.update(chunk)
        return sha256_hash.hexdigest()
    
    @action(detail=True, methods=['post'])
    def extract_text(self, request, pk=None):
        """Extract text from a PDF file."""
        book_file = self.get_object()
        
        if book_file.file_type != 'pdf':
            return Response(
                {'error': 'Text extraction is only supported for PDF files'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if book_file.text_extracted:
            return Response(
                {'message': 'Text has already been extracted'}, 
                status=status.HTTP_200_OK
            )
        
        try:
            self._extract_pdf_text(book_file)
            response_serializer = BookFileSerializer(book_file)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': 'Text extraction failed'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _extract_pdf_text(self, book_file):
        """Extract text from PDF file."""
        try:
            from pypdf import PdfReader
            
            # Get the full file path
            file_path = default_storage.path(book_file.file_path)
            
            # Read PDF and extract text
            reader = PdfReader(file_path)
            text_content = []
            
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    text_content.append(text)
            
            # Join all text content
            extracted_text = '\n\n'.join(text_content)
            
            # Update the book file record
            book_file.extracted_text = extracted_text
            book_file.text_extracted = True
            book_file.save()
            
            logging.info(f"Successfully extracted text from PDF: {book_file.file_path}")
            
        except Exception as e:
            logging.error(f"Failed to extract text from PDF {book_file.file_path}: {str(e)}")
            # Don't fail the upload, just mark as not extracted
            book_file.text_extracted = False
            book_file.save()
