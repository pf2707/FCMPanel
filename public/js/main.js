/**
 * FCM Dashboard - Enhanced JavaScript Module
 * Modern jQuery implementation with accessibility, security, and UX enhancements
 * 
 * DataTable Initialization:
 * - Fixed double initialization by implementing smart global init that skips page-specific tables
 * - Page-specific implementations use FCM.dataTables.safeInit() for consistency
 * - Use 'manual-init' class to completely skip global initialization
 * - Debug with checkDataTableStatus() in browser console
 */

(function($) {
  'use strict';

  // Namespace for FCM Dashboard
  window.FCMDashboard = window.FCMDashboard || {};

  /**
   * Core Application Module
   */
  const FCM = {
    // Configuration
    config: {
      debounceDelay: 300,
      toastDuration: 5000,
      animationDuration: 300,
      maxRetries: 3,
      apiTimeout: 10000
    },

    // State management
    state: {
      isInitialized: false,
      activeModals: new Set(),
      clipboardSupported: !!navigator.clipboard,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    },

    // Utility functions
    utils: {
      /**
       * Debounce function to limit function calls
       */
      debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
          const later = () => {
            clearTimeout(timeout);
            func(...args);
          };
          clearTimeout(timeout);
          timeout = setTimeout(later, wait);
        };
      },

      /**
       * Throttle function to limit function calls
       */
      throttle: function(func, limit) {
        let inThrottle;
        return function() {
          const args = arguments;
          const context = this;
          if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
          }
        };
      },

      /**
       * Sanitize HTML to prevent XSS
       */
      sanitizeHTML: function(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
      },

      /**
       * Generate unique ID
       */
      generateId: function(prefix = 'fcm') {
        return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
      },

      /**
       * Format date for display
       */
      formatDate: function(date) {
        return new Intl.DateTimeFormat('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }).format(new Date(date));
      },

      /**
       * Validate input against XSS patterns
       */
      validateInput: function(input) {
        const xssPatterns = [
          /<script[^>]*>.*?<\/script>/gi,
          /<iframe[^>]*>.*?<\/iframe>/gi,
          /javascript:/gi,
          /on\w+\s*=/gi
        ];
        
        return !xssPatterns.some(pattern => pattern.test(input));
      }
    },

    /**
     * Accessibility Module
     */
    accessibility: {
      /**
       * Announce message to screen readers
       */
      announce: function(message, priority = 'polite') {
        const announcement = $('<div>', {
          'aria-live': priority,
          'aria-atomic': 'true',
          'class': 'sr-only',
          'text': message
        }).appendTo('body');

        setTimeout(() => announcement.remove(), 3000);
      },

      /**
       * Manage focus for modals and overlays
       */
      manageFocus: function(container) {
        const focusableElements = container.find(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ).filter(':visible');

        if (focusableElements.length) {
          focusableElements.first().focus();
          
          // Trap focus within container
          container.on('keydown.focus-trap', function(e) {
            if (e.key === 'Tab') {
              const first = focusableElements.first()[0];
              const last = focusableElements.last()[0];
              
              if (e.shiftKey && e.target === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && e.target === last) {
                e.preventDefault();
                first.focus();
              }
            }
          });
        }
      },

      /**
       * Update ARIA expanded state
       */
      updateExpanded: function(trigger, expanded) {
        trigger.attr('aria-expanded', expanded);
        
        // Update chevron icon if present
        const chevron = trigger.find('.fa-chevron-down, .fa-chevron-up');
        if (chevron.length) {
          chevron.toggleClass('fa-chevron-down', !expanded)
                 .toggleClass('fa-chevron-up', expanded);
        }
      }
    },

    /**
     * UI Components Module
     */
    ui: {
      /**
       * Initialize enhanced tooltips
       */
      initTooltips: function() {
        $('[data-bs-toggle="tooltip"]').each(function() {
          const $this = $(this);
          const options = {
            boundary: 'viewport',
            sanitize: true,
            trigger: 'hover focus',
            delay: { show: 500, hide: 100 }
          };

          // Add accessibility attributes
          const tooltipId = FCM.utils.generateId('tooltip');
          $this.attr('aria-describedby', tooltipId);

          new bootstrap.Tooltip(this, options);
        });
      },

      /**
       * Initialize enhanced modals
       */
      initModals: function() {
        $('.modal').each(function() {
          const $modal = $(this);
          const modalId = $modal.attr('id');

          $modal.on('show.bs.modal', function() {
            FCM.state.activeModals.add(modalId);
            FCM.accessibility.manageFocus($modal);
            $('body').addClass('modal-open');
          });

          $modal.on('hidden.bs.modal', function() {
            FCM.state.activeModals.delete(modalId);
            $modal.off('keydown.focus-trap');
            
            if (FCM.state.activeModals.size === 0) {
              $('body').removeClass('modal-open');
            }
          });

          // ESC key handling
          $modal.on('keydown', function(e) {
            if (e.key === 'Escape') {
              $modal.modal('hide');
            }
          });
        });
      },

      /**
       * Initialize enhanced dropdowns
       */
      initDropdowns: function() {
        $('.dropdown-toggle').each(function() {
          const $toggle = $(this);
          const $menu = $toggle.next('.dropdown-menu');

          $toggle.on('show.bs.dropdown', function() {
            FCM.accessibility.updateExpanded($toggle, true);
          });

          $toggle.on('hide.bs.dropdown', function() {
            FCM.accessibility.updateExpanded($toggle, false);
          });

          // Keyboard navigation
          $menu.on('keydown', function(e) {
            const $items = $menu.find('.dropdown-item:visible');
            const currentIndex = $items.index($(e.target));

            switch(e.key) {
              case 'ArrowDown':
                e.preventDefault();
                const nextIndex = (currentIndex + 1) % $items.length;
                $items.eq(nextIndex).focus();
                break;
              case 'ArrowUp':
                e.preventDefault();
                const prevIndex = currentIndex === 0 ? $items.length - 1 : currentIndex - 1;
                $items.eq(prevIndex).focus();
                break;
              case 'Escape':
                e.preventDefault();
                $toggle.dropdown('hide');
                $toggle.focus();
                break;
            }
          });
        });
      },

      /**
       * Create toast notifications
       */
      showToast: function(message, type = 'info', duration = FCM.config.toastDuration) {
        // Validate message parameter
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
          return null; // Don't show empty toasts
        }
        
        const toastId = FCM.utils.generateId('toast');
        const icons = {
          success: 'fa-check-circle',
          error: 'fa-exclamation-circle',
          warning: 'fa-exclamation-triangle',
          info: 'fa-info-circle'
        };

        const $toast = $(`
          <div class="toast align-items-center text-white bg-${type === 'error' ? 'danger' : type} border-0" 
               role="alert" aria-live="assertive" aria-atomic="true" id="${toastId}">
            <div class="d-flex">
              <div class="toast-body">
                <i class="fas ${icons[type] || icons.info} me-2" aria-hidden="true"></i>
                ${FCM.utils.sanitizeHTML(message)}
              </div>
              <button type="button" class="btn-close btn-close-white me-2 m-auto" 
                      data-bs-dismiss="toast" aria-label="Close notification"></button>
            </div>
          </div>
        `);

        // Create toast container if it doesn't exist
        let $container = $('.toast-container');
        if (!$container.length) {
          $container = $('<div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1055;"></div>')
            .appendTo('body');
        } else if ($container.length > 1) {
          // Remove duplicate containers
          $container.slice(1).remove();
          $container = $container.first();
        }

        $container.append($toast);
        
        const toast = new bootstrap.Toast($toast[0], {
          delay: duration,
          animation: !FCM.state.reducedMotion
        });

        toast.show();

        // Announce to screen readers
        FCM.accessibility.announce(message, type === 'error' ? 'assertive' : 'polite');

        return toast;
      }
    },

    /**
     * Form Handling Module
     */
    forms: {
      /**
       * Initialize form validation
       */
      initValidation: function() {
        $('form[data-needs-validation]').each(function() {
          const $form = $(this);
          
          $form.on('submit', function(e) {
            if (!this.checkValidity()) {
              e.preventDefault();
              e.stopPropagation();
              
              // Focus on first invalid field
              const $firstInvalid = $form.find(':invalid').first();
              if ($firstInvalid.length) {
                $firstInvalid.focus();
                $firstInvalid[0].scrollIntoView({ 
                  behavior: FCM.state.reducedMotion ? 'auto' : 'smooth',
                  block: 'center' 
                });
              }
            }
            
            $form.addClass('was-validated');
          });

          // Real-time validation
          $form.find('input, select, textarea').on('blur change', function() {
            const $field = $(this);
            FCM.forms.validateField($field);
          });
        });
      },

      /**
       * Validate individual field
       */
      validateField: function($field) {
        const field = $field[0];
        const value = $field.val().trim();
        
        // Remove previous validation classes
        $field.removeClass('is-valid is-invalid');
        $field.siblings('.invalid-feedback, .valid-feedback').remove();

        // Check validity
        if (field.checkValidity()) {
          $field.addClass('is-valid');
        } else {
          $field.addClass('is-invalid');
          
          // Add custom error message
          const errorMessage = field.validationMessage || 'Invalid input';
          $(`<div class="invalid-feedback" role="alert">${FCM.utils.sanitizeHTML(errorMessage)}</div>`)
            .insertAfter($field);
        }
      },

      /**
       * Initialize loading states for forms
       */
      initLoadingStates: function() {
        $('form').on('submit', function() {
          const $form = $(this);
          const $submitBtn = $form.find('button[type="submit"]');
          
          if ($submitBtn.length && !$submitBtn.prop('disabled')) {
            FCM.forms.addLoadingState($submitBtn);
          }
        });
      },

      /**
       * Add loading state to button
       */
      addLoadingState: function($button) {
        const originalHtml = $button.html();
        const loadingText = $button.data('loading-text') || 'Loading...';
        
        $button
          .prop('disabled', true)
          .attr('aria-busy', 'true')
          .html(`<i class="fas fa-spinner fa-spin me-2" aria-hidden="true"></i>${loadingText}`)
          .data('original-html', originalHtml);

        // Auto-restore after 30 seconds (failsafe)
        setTimeout(() => {
          FCM.forms.removeLoadingState($button);
        }, 30000);
      },

      /**
       * Remove loading state from button
       */
      removeLoadingState: function($button) {
        const originalHtml = $button.data('original-html');
        if (originalHtml) {
          $button
            .prop('disabled', false)
            .removeAttr('aria-busy')
            .html(originalHtml)
            .removeData('original-html');
        }
      }
    },

    /**
     * Clipboard Module
     */
    clipboard: {
      /**
       * Initialize clipboard functionality
       */
      init: function() {
        $(document).on('click', '[data-clipboard-target]', function(e) {
          e.preventDefault();
          const $button = $(this);
          const targetSelector = $button.data('clipboard-target');
          const $target = $(targetSelector);
          
          if (!$target.length) {
            FCM.ui.showToast('Copy target not found', 'error');
            return;
          }

          const textToCopy = $target.val() || $target.text() || $target.html();
          FCM.clipboard.copyToClipboard(textToCopy, $button);
        });
      },

      /**
       * Copy text to clipboard with fallback
       */
      copyToClipboard: async function(text, $button) {
        try {
          if (FCM.state.clipboardSupported) {
            await navigator.clipboard.writeText(text);
          } else {
            // Fallback for older browsers
            FCM.clipboard.fallbackCopy(text);
          }

          FCM.clipboard.showCopySuccess($button);
          FCM.accessibility.announce('Copied to clipboard');
          
        } catch (err) {
          console.error('Copy failed:', err);
          FCM.ui.showToast('Copy failed. Please try again.', 'error');
        }
      },

      /**
       * Fallback copy method for older browsers
       */
      fallbackCopy: function(text) {
        const $temp = $('<textarea>')
          .val(text)
          .appendTo('body')
          .select();
        
        document.execCommand('copy');
        $temp.remove();
      },

      /**
       * Show copy success feedback
       */
      showCopySuccess: function($button) {
        const originalHtml = $button.html();
        const originalClasses = $button.attr('class');
        
        $button
          .html('<i class="fas fa-check me-1" aria-hidden="true"></i>Copied!')
          .removeClass('btn-outline-secondary')
          .addClass('btn-success');

        setTimeout(() => {
          $button.html(originalHtml).attr('class', originalClasses);
        }, 2000);
      }
    },

    /**
     * Data Tables Module
     * 
     * Usage Guidelines:
     * - Global init: Automatically initializes tables with class 'data-table' that don't have page-specific implementations
     * - Page-specific init: Use safeInit() for tables that need custom configuration or special handling
     * - Manual init: Add 'manual-init' class to tables to skip global initialization entirely
     */
    dataTables: {
      /**
       * Initialize enhanced DataTables automatically
       */
      init: function() {
        if (!$.fn.DataTable) return;

        $('.data-table').each(function() {
          const $table = $(this);
          
          // Skip if already initialized
          if ($.fn.DataTable.isDataTable(this)) {
            return;
          }
          
          // Skip if marked for manual initialization
          if ($table.hasClass('manual-init')) {
            return;
          }
          
          const options = FCM.dataTables.getOptions($table);
          
          try {
            $table.DataTable(options);
          } catch (error) {
            console.error('DataTable initialization error:', error);
          }
        });
      },

      /**
       * Safely initialize a single DataTable with reinitialization protection
       */
      safeInit: function(selector, options = {}) {
        if (!$.fn.DataTable) return null;

        const $table = $(selector);
        if (!$table.length) return null;

        // Return existing API if already initialized
        if ($.fn.DataTable.isDataTable(selector)) {
          return $.fn.DataTable.Api($table);
        }

        try {
          const defaultOptions = FCM.dataTables.getOptions($table);
          const finalOptions = $.extend(true, {}, defaultOptions, options);
          return $table.DataTable(finalOptions);
        } catch (error) {
          console.error('DataTable initialization error:', error);
          return null;
        }
      },




      /**
       * Get DataTable options
       */
      getOptions: function($table) {
        const defaultOptions = {
          responsive: true,
          pageLength: 10,
          lengthMenu: [5, 10, 25, 50, 100],
          order: [[$table.find('th').length - 2, 'desc']], // Second to last column (usually date)
          language: {
            search: 'Search:',
            lengthMenu: 'Show _MENU_ entries per page',
            info: 'Showing _START_ to _END_ of _TOTAL_ entries',
            infoEmpty: 'Showing 0 to 0 of 0 entries',
            infoFiltered: '(filtered from _MAX_ total entries)',
            emptyTable: 'No data available',
            zeroRecords: 'No matching records found',
            paginate: {
              first: '&laquo;',
              last: '&raquo;',
              next: '&rsaquo;',
              previous: '&lsaquo;'
            }
          },
          columnDefs: [
            {
              orderable: false,
              targets: -1, // Last column (actions)
              className: 'no-sort'
            }
          ],
          dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
               '<"row"<"col-sm-12"tr>>' +
               '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
          drawCallback: function() {
            // Re-initialize tooltips after table redraw
            FCM.ui.initTooltips();
            
            // Announce page change to screen readers
            const info = this.api().page.info();
            FCM.accessibility.announce(
              `Showing page ${info.page + 1} of ${info.pages}`,
              'polite'
            );
          }
        };

        // Merge with custom options if available
        const customOptions = $table.data('table-options') || {};
        return $.extend(true, {}, defaultOptions, customOptions);
      },


    },

    /**
     * Charts Module
     */
    charts: {
      /**
       * Initialize responsive charts
       */
      init: function() {
        // Set global Chart.js defaults for consistent theming
        if (window.Chart) {
          const isDarkTheme = document.documentElement.getAttribute('data-bs-theme') !== 'light';
          const textColor = isDarkTheme ? '#f0f6fc' : '#495057';
          const gridColor = isDarkTheme ? '#30363d' : '#dee2e6';
          
          Chart.defaults.font.family = "'Inter', sans-serif";
          Chart.defaults.font.size = 12;
          Chart.defaults.color = textColor;
          Chart.defaults.borderColor = gridColor;
          Chart.defaults.backgroundColor = isDarkTheme ? 'rgba(33, 38, 45, 0.8)' : 'rgba(255, 255, 255, 0.8)';
        }

        $('.chart-container canvas').each(function() {
          const $canvas = $(this);
          const chartType = $canvas.data('chart-type') || 'doughnut';
          const chartData = $canvas.data('chart-data');
          
          // Skip charts that have page-specific initializers
          const canvasId = $canvas.attr('id');
          const skipGlobal = $canvas.data('skip-global-init') === true || $canvas.data('skip-global-init') === 'true';
          
          // More robust skipping - check for existing charts and initialization state
          const existingChart = window.Chart && Chart.getChart($canvas[0]);
          const isInitializing = $canvas[0].hasAttribute('data-initializing');
          
          // Skip if explicitly marked to skip global init
          if (skipGlobal || isInitializing) {
            return;
          }
          
          // Skip if chart already exists and is not the platformChart 
          if (existingChart && canvasId !== 'platformChart') {
            return;
          }
          
          if (chartData) {
            FCM.charts.createChart($canvas[0], chartType, chartData);
          }
        });
      },

      /**
       * Safely create or update a chart on a canvas
       */
      safeCreateChart: function(canvasId, type, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
          return null;
        }
        
        return FCM.charts.createChart(canvas, type, data, options);
      },

      /**
       * Create chart with accessibility and theme awareness
       */
      createChart: function(canvas, type, data) {
        if (!window.Chart) return null;

        // Check if there's already a chart on this canvas and destroy it
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
          existingChart.destroy();
        }

        // Theme-aware colors
        const isDarkTheme = document.documentElement.getAttribute('data-bs-theme') !== 'light';
        const textColor = isDarkTheme ? '#f0f6fc' : '#495057';
        const tooltipBg = isDarkTheme ? 'rgba(33, 38, 45, 0.95)' : 'rgba(255, 255, 255, 0.95)';
        const tooltipBorder = isDarkTheme ? '#30363d' : '#dee2e6';

        const options = {
          responsive: true,
          maintainAspectRatio: true,
          animation: {
            duration: FCM.state.reducedMotion ? 0 : 1000
          },
          plugins: {
            legend: {
              position: 'right',
              labels: {
                boxWidth: 15,
                padding: 10,
                color: textColor,
                font: {
                  family: "'Inter', sans-serif",
                  size: 12,
                  weight: '500'
                },
                usePointStyle: true,
                pointStyle: 'circle',
                generateLabels: function(chart) {
                  const labels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
                  // Add accessibility attributes and theme colors
                  labels.forEach((label, index) => {
                    label.text = `${label.text}: ${data.datasets[0].data[index]}`;
                    label.fontColor = textColor;
                  });
                  return labels;
                }
              }
            },
            tooltip: {
              backgroundColor: tooltipBg,
              titleColor: textColor,
              bodyColor: textColor,
              borderColor: tooltipBorder,
              borderWidth: 1,
              cornerRadius: 8,
              titleFont: {
                family: "'Inter', sans-serif",
                size: 13,
                weight: '600'
              },
              bodyFont: {
                family: "'Inter', sans-serif",
                size: 12,
                weight: '500'
              },
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.parsed || context.raw;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = Math.round((value / total) * 100);
                  return `${label}: ${value} (${percentage}%)`;
                }
              }
            }
          }
        };

        try {
          const chart = new Chart(canvas, {
            type: type,
            data: data,
            options: options
          });

          // Add ARIA label
          $(canvas).attr('aria-label', `${type} chart showing data distribution`);
          
          return chart;
        } catch (error) {
          console.error(`Chart creation error on canvas '${canvas.id || 'unnamed'}':`, error);
          $(canvas).parent().html('<p class="text-muted">Chart could not be loaded</p>');
          return null;
        }
      }
    },

    /**
     * Notification Handling Module
     */
    notifications: {
      /**
       * Initialize notification form handling
       */
      init: function() {
        FCM.notifications.initTargetSelection();
      },

      /**
       * Initialize target selection for notifications
       */
      initTargetSelection: function() {
        const $targetRadios = $('input[name="targetType"]');
        const $deviceSelection = $('#deviceSelection');
        const $topicSelection = $('#topicSelection');
        
        if (!$targetRadios.length) return;

        const updateSelections = () => {
          const selectedValue = $('input[name="targetType"]:checked').val();
          
          // Hide all selections
          $deviceSelection.addClass('d-none');
          $topicSelection.addClass('d-none');
          
          // Show relevant selection
          if (selectedValue === 'device') {
            $deviceSelection.removeClass('d-none');
            $deviceSelection.find('select').prop('required', true);
            $topicSelection.find('select').prop('required', false);
          } else if (selectedValue === 'topic') {
            $topicSelection.removeClass('d-none');
            $topicSelection.find('select').prop('required', true);
            $deviceSelection.find('select').prop('required', false);
          } else {
            // All devices selected
            $deviceSelection.find('select').prop('required', false);
            $topicSelection.find('select').prop('required', false);
          }

          // Announce change to screen readers
          FCM.accessibility.announce(`Target changed to ${selectedValue || 'all devices'}`);
        };

        $targetRadios.on('change', updateSelections);
        updateSelections(); // Initial call
      },

      /**
       * Initialize notification details modal - deprecated (silent)
       */
      initDetailsModal: function() {
        // Deprecated - does nothing
      },

      /**
       * Show notification details in modal - deprecated (silent)
       */
      showDetails: function(notificationId) {
        // Deprecated - does nothing
      },

      /**
       * Create notification details modal - deprecated (silent)
       */
      createDetailsModal: function() {
        // Deprecated - does nothing
        return null;
      },

      /**
       * Load notification details - deprecated (silent)
       */
      loadNotificationDetails: function(notificationId, $modal) {
        // Deprecated - does nothing
      }
    },

    /**
     * Device Management Module
     */
    devices: {
      /**
       * Initialize device-related functionality
       */
      init: function() {
        FCM.devices.initToggleDetails();
        FCM.devices.initTestNotifications();
      },

      /**
       * Initialize device details toggle
       */
      initToggleDetails: function() {
        $(document).on('click', '.toggle-device-details', function(e) {
          e.preventDefault();
          const $button = $(this);
          const deviceId = $button.closest('tr').data('device-id');
          const $detailsRow = $(`#device-details-${deviceId}`);
          
          const isExpanded = !$detailsRow.hasClass('d-none');
          $detailsRow.toggleClass('d-none');
          
          // Update button appearance
          const $icon = $button.find('i');
          $icon.toggleClass('fa-info-circle', isExpanded)
               .toggleClass('fa-times', !isExpanded);
          
          // Update ARIA attributes
          $button.attr('aria-expanded', !isExpanded);
          
          // Announce to screen readers
          FCM.accessibility.announce(
            isExpanded ? 'Device details hidden' : 'Device details shown'
          );
        });
      },

      /**
       * Initialize test notification functionality
       */
      initTestNotifications: function() {
        $(document).on('click', '[data-test-device]', function(e) {
          e.preventDefault();
          const $button = $(this);
          const deviceId = $button.data('device-id');
          
          FCM.devices.sendTestNotification(deviceId, $button);
        });
      },

      /**
       * Send test notification to device
       */
      sendTestNotification: function(deviceId, $button) {
        FCM.forms.addLoadingState($button);
        
        // This would typically be an AJAX call
        setTimeout(() => {
          FCM.forms.removeLoadingState($button);
          FCM.ui.showToast('Test notification sent successfully!', 'success');
          FCM.accessibility.announce('Test notification sent');
        }, 1000);
      }
    },

    /**
     * Error Handling Module
     */
    errorHandler: {
      /**
       * Initialize global error handling
       */
      init: function() {
        // Handle AJAX errors
        $(document).ajaxError(function(event, xhr, settings, error) {
          FCM.errorHandler.handleAjaxError(xhr, settings, error);
        });

        // Handle JavaScript errors
        window.addEventListener('error', function(e) {
          FCM.errorHandler.handleJSError(e);
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', function(e) {
          FCM.errorHandler.handlePromiseRejection(e);
        });
      },

      /**
       * Handle AJAX errors
       */
      handleAjaxError: function(xhr, settings, error) {
        console.error('AJAX Error:', {
          url: settings.url,
          status: xhr.status,
          error: error,
          response: xhr.responseText
        });

        let message = 'An error occurred. Please try again.';
        
        if (xhr.status === 404) {
          message = 'Requested resource not found.';
        } else if (xhr.status === 403) {
          message = 'Access denied. Please check your permissions.';
        } else if (xhr.status === 500) {
          message = 'Server error. Please contact support.';
        } else if (xhr.status === 0) {
          message = 'Network error. Please check your connection.';
        }

        FCM.ui.showToast(message, 'error');
      },

      /**
       * Handle JavaScript errors
       */
      handleJSError: function(e) {
        console.error('JavaScript Error:', e.error);
        
        // Don't show toast for minor errors
        if (e.error && e.error.name !== 'NetworkError') {
          FCM.ui.showToast('A technical error occurred.', 'error');
        }
      },

      /**
       * Handle unhandled promise rejections
       */
      handlePromiseRejection: function(e) {
        console.error('Unhandled Promise Rejection:', e.reason);
        e.preventDefault(); // Prevent default browser behavior
      }
    },

    /**
     * Initialize the entire application
     */
    init: function() {
      if (FCM.state.isInitialized) {
        return;
      }



      try {
        // Initialize core modules
        FCM.ui.initTooltips();
        FCM.ui.initModals();
        FCM.ui.initDropdowns();
        FCM.forms.initValidation();
        FCM.forms.initLoadingStates();
        FCM.clipboard.init();
        FCM.dataTables.init();
        FCM.charts.init();
        FCM.notifications.init();
        FCM.devices.init();
        FCM.errorHandler.init();

        // Auto-dismiss alerts
        setTimeout(() => {
          $('.alert:not(.alert-permanent)').fadeOut();
        }, 8000);

        FCM.state.isInitialized = true;


      } catch (error) {
        console.error('FCM Dashboard initialization failed:', error);
        FCM.ui.showToast('Application initialization failed', 'error');
      }
    }
  };

  window.FCMDashboard = window.FCMDashboard || {};

  // Auto-initialize when DOM is ready
  $(document).ready(function() {
    if (window.fcmInitialized) return;
    
    window.fcmInitialized = true;
    FCM.init();
  });

  // Expose FCM object globally
  window.FCMDashboard.FCM = FCM;
  




})(jQuery); 