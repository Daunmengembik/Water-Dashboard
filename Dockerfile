# Use the official PHP image with Apache
FROM php:8.2-apache

# Copy your whole project into the Apache web root
COPY . /var/www/html/

# Optional: Enable Apache mod_rewrite (for pretty URLs or .htaccess)
RUN a2enmod rewrite

# Expose default Apache port
EXPOSE 80
