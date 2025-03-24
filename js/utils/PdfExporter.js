/**
 * PdfExporter.js
 * Utility functions for exporting the Year Planner to PDF
 */

/**
 * Export the current year planner view to a PDF document
 * @param {Object} options - Export options
 * @param {number} options.year - Year being exported
 * @param {HTMLElement} options.gridElement - The grid element to export
 * @param {HTMLElement} options.legendElement - The legend element to include
 * @returns {Promise<Blob>} Promise resolving to the PDF blob
 */
export async function exportToPdf({ year, gridElement, legendElement }) {
  // Make sure the required libraries are loaded
  await loadRequiredLibraries();
  
  // Create a new jsPDF instance (A3 landscape) with enhanced quality settings
  // A3 dimensions: 420mm x 297mm
  const pdf = new window.jspdf.jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3',
    compress: true, // Enable compression for better quality
    precision: 16   // Higher precision for better rendering
  });
  
  // Set up document properties
  pdf.setProperties({
    title: `Year Planner ${year}`,
    subject: 'Year-At-A-Glance Calendar',
    author: 'YAAG Calendar',
    creator: 'YAAG Calendar'
  });
  
  try {
    // Set dimensions for A3 size
    const pageWidth = 420; // A3 width
    const pageHeight = 297; // A3 height
    const margin = 10; // 10mm margins as specified
    const headerHeight = 15; // 15mm header as specified
    
    // Calculate the actual grid dimensions
    const gridWidth = pageWidth - (margin * 2);
    const gridHeight = pageHeight - (margin * 2) - headerHeight;
    
    // Create a temporary iframe with precise dimensions
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = `${pageWidth}mm`;
    iframe.style.height = `${pageHeight}mm`;
    document.body.appendChild(iframe);
    
    // Wait for iframe to load
    await new Promise(resolve => {
      iframe.onload = resolve;
      
      // Set up the iframe document with proper standards mode
      const iframeDoc = iframe.contentDocument;
      iframeDoc.open();
      iframeDoc.write('<!DOCTYPE html>');
      iframeDoc.write('<html>');
      iframeDoc.write('<head>');
      iframeDoc.write('<meta charset="utf-8">');
      iframeDoc.write('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
      
      // Copy all stylesheets from the main document
      Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(link => {
        iframeDoc.write(link.outerHTML);
      });
      
      // Add enhanced print-specific styles with the specified dimensions
      iframeDoc.write(`
        <style>
          html, body { 
            margin: 0; 
            padding: 0;
            width: ${pageWidth}mm;
            height: ${pageHeight}mm;
            overflow: hidden;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          .print-container {
            width: 100%;
            height: 100%;
            position: relative;
            padding: ${margin}mm;
            box-sizing: border-box;
          }
          
          .year-planner-header {
            height: ${headerHeight - 5}mm; /* Subtract some space for padding */
            margin-bottom: 5mm;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12pt;
            font-weight: bold;
          }
          
          .year-planner-grid-container {
            height: ${gridHeight}mm;
            overflow: visible;
          }
          
          year-planner-grid {
            display: block !important;
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
            overflow: visible !important;
          }
          
          /* Ensure proper grid dimensions */
          .year-grid {
            width: 100% !important;
            height: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
            border: 0.2mm solid #aaa !important;
          }
          
          /* Set day cell width to 10mm as specified */
          .day-cell {
            width: 10mm !important;
            box-sizing: border-box !important;
            position: relative !important;
            padding: 2px !important;
            border: 0.1mm solid #ccc !important;
          }
          
          /* Set month row height to 20mm as specified */
          .month-cell, .day-cell {
            height: ${20}mm !important;
            display: table-cell !important;
            visibility: visible !important;
            box-sizing: border-box !important;
          }
          
          /* Month cell styling */
          .month-cell {
            padding: 2px !important;
            font-weight: bold !important;
            text-align: center !important;
            vertical-align: middle !important;
            border: 0.1mm solid #ccc !important;
            background-color: #f5f5f5 !important;
          }
          
          /* Properly style weekend days */
          .day-cell.weekend {
            background-color: #fcf9f2 !important;
          }
          
          /* Style for day numbers */
          .day-number {
            position: absolute !important;
            top: 1px !important;
            right: 2px !important;
            font-size: 6pt !important;
            color: #555 !important;
          }
          
          /* Ensure all events are visible with the 6pt font */
          .event, .event-segment {
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
            font-size: 6pt !important;
            line-height: 1.2 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
            position: absolute !important;
            z-index: 10 !important;
            border-radius: 2px !important;
          }
          
          /* Event type styling */
          .event.holiday, .event-segment.holiday {
            background-color: #ffecb3 !important;
            border-left: 2px solid #ffc107 !important;
          }
          
          .event.regular, .event-segment.regular {
            background-color: #e3f2fd !important;
            border-left: 2px solid #2196f3 !important;
          }
          
          /* Multi-day event segment styling */
          .event-segment.continues-left {
            border-top-left-radius: 0 !important;
            border-bottom-left-radius: 0 !important;
          }
          
          .event-segment.continues-right {
            border-top-right-radius: 0 !important;
            border-bottom-right-radius: 0 !important;
          }
          
          /* Same for all text elements within events */
          .event-title, .event-date-range, .event-indicators {
            font-size: 6pt !important;
            line-height: 1.2 !important;
            color: #000 !important;
          }
          
          /* The actual header component */
          .pdf-header {
            font-size: 10pt;
            font-weight: bold;
          }
          
          /* Legend adjustments */
          .event-legend {
            margin-top: 5mm;
            font-size: 7pt;
          }
          
          /* Event indicators */
          .event-icon {
            font-size: 5pt !important;
          }
          
          /* Current day styling */
          .current-day {
            background-color: #e6f7ff !important;
            box-shadow: inset 0 0 0 1px #4682B4 !important;
          }
        </style>
      `);
      
      iframeDoc.write('</head><body>');
      
      // Create container with header
      iframeDoc.write('<div class="print-container">');
      
      // Add header with year and date
      iframeDoc.write(`
        <div class="year-planner-header">
          <div class="pdf-header">Year Planner ${year}</div>
          <div>Exported: ${new Date().toLocaleDateString()}</div>
        </div>
      `);
      
      // If grid element has shadow DOM, try to extract its contents
      if (gridElement && gridElement.shadowRoot) {
        // Create a container for the grid
        iframeDoc.write('<div class="year-planner-grid-container">');
        
        // Extract the shadow DOM content
        const shadowContent = gridElement.shadowRoot.innerHTML;
        iframeDoc.write(`<year-planner-grid>${shadowContent}</year-planner-grid>`);
        
        iframeDoc.write('</div>');
      } else {
        // Just copy the grid element
        const gridHtml = gridElement.outerHTML;
        iframeDoc.write(`<div class="year-planner-grid-container">${gridHtml}</div>`);
      }
      
      // Add the legend if provided
      if (legendElement) {
        iframeDoc.write(`<div class="event-legend">${legendElement.outerHTML}</div>`);
      }
      
      iframeDoc.write('</div>'); // Close print-container
      iframeDoc.write('</body></html>');
      iframeDoc.close();
    });
    
    // Wait longer for all custom elements to fully render
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Use enhanced html2canvas settings
    const canvas = await window.html2canvas(iframe.contentDocument.body, {
      scale: 3, // Higher scale for better quality (increased from 2)
      useCORS: true,
      allowTaint: true, // Allow more content to be rendered
      logging: false,
      backgroundColor: '#ffffff',
      width: iframe.contentDocument.body.scrollWidth,
      height: iframe.contentDocument.body.scrollHeight,
      windowWidth: 1800, // Increased for A3 size
      imageTimeout: 0, // No timeout for image loading
      removeContainer: false, // Keep the container for proper rendering
      letterRendering: true, // Better text rendering
      onclone: (clonedDoc) => {
        // Comprehensive modifications for high-quality rendering
        // First, handle the shadow DOM properly
        const clonedGrid = clonedDoc.querySelector('year-planner-grid');
        if (clonedGrid) {
          // Access shadow DOM if available
          let shadowRoot = null;
          if (clonedGrid.shadowRoot) {
            shadowRoot = clonedGrid.shadowRoot;
          } else {
            // If shadow DOM isn't directly accessible, look for the content that was copied
            const yearGrid = clonedDoc.querySelector('.year-grid');
            if (yearGrid) {
              shadowRoot = clonedDoc;
            }
          }
          
          if (shadowRoot) {
            // Style the grid table for better visibility
            const yearGrid = shadowRoot.querySelector('.year-grid');
            if (yearGrid) {
              yearGrid.style.width = '100%';
              yearGrid.style.height = '100%';
              yearGrid.style.tableLayout = 'fixed';
              yearGrid.style.borderCollapse = 'collapse';
              yearGrid.style.border = '0.2mm solid #aaa';
            }
            
            // Process all cells for consistent formatting
            const cells = shadowRoot.querySelectorAll('.day-cell, .month-cell');
            cells.forEach(cell => {
              cell.style.display = 'table-cell';
              cell.style.visibility = 'visible';
              cell.style.border = '0.1mm solid #ccc';
              
              // Set specific width and height as specified
              if (cell.classList.contains('month-cell')) {
                // Month cells
                cell.style.height = '20mm';
                cell.style.verticalAlign = 'middle';
                cell.style.textAlign = 'center';
                cell.style.fontWeight = 'bold';
                cell.style.padding = '2px';
                cell.style.backgroundColor = '#f5f5f5';
              } else {
                // Day cells
                cell.style.width = '10mm';
                cell.style.height = '20mm';
                cell.style.position = 'relative';
                cell.style.padding = '2px';
                
                // Style weekend cells
                if (cell.classList.contains('weekend')) {
                  cell.style.backgroundColor = '#fcf9f2';
                }
                
                // Style current day cells
                if (cell.classList.contains('current-day')) {
                  cell.style.backgroundColor = '#e6f7ff';
                  cell.style.boxShadow = 'inset 0 0 0 1px #4682B4';
                }
                
                // Style day numbers
                const dayNumber = cell.querySelector('.day-number');
                if (dayNumber) {
                  dayNumber.style.position = 'absolute';
                  dayNumber.style.top = '1px';
                  dayNumber.style.right = '2px';
                  dayNumber.style.fontSize = '6pt';
                  dayNumber.style.color = '#555';
                }
              }
            });
            
            // Enhanced styling for all events
            const events = shadowRoot.querySelectorAll('.event, .event-segment');
            events.forEach(event => {
              // Base event styles
              event.style.display = 'block';
              event.style.visibility = 'visible';
              event.style.opacity = '1';
              event.style.fontSize = '6pt';
              event.style.lineHeight = '1.2';
              event.style.borderRadius = '2px';
              event.style.position = 'absolute';
              event.style.zIndex = '10';
              
              // Specific event types styling
              if (event.classList.contains('holiday')) {
                event.style.backgroundColor = '#ffecb3';
                event.style.borderLeft = '2px solid #ffc107';
              } else {
                event.style.backgroundColor = '#e3f2fd';
                event.style.borderLeft = '2px solid #2196f3';
              }
              
              // Multi-segment event styling
              if (event.classList.contains('continues-left')) {
                event.style.borderTopLeftRadius = '0';
                event.style.borderBottomLeftRadius = '0';
              }
              
              if (event.classList.contains('continues-right')) {
                event.style.borderTopRightRadius = '0';
                event.style.borderBottomRightRadius = '0';
              }
              
              // Ensure text is readable
              const textElements = event.querySelectorAll('.event-title, .event-date-range, .event-indicators');
              textElements.forEach(el => {
                el.style.fontSize = '6pt';
                el.style.lineHeight = '1.2';
                el.style.color = '#000';
              });
              
              // Style event icons
              const icons = event.querySelectorAll('.event-icon');
              icons.forEach(icon => {
                icon.style.fontSize = '5pt';
              });
            });
          }
        }
      }
    });
    
    // Remove the iframe
    document.body.removeChild(iframe);
    
    // Add the image to the PDF with maximum quality settings
    const pdfMargin = 10; // 10mm margins
    const imgData = canvas.toDataURL('image/png', 1.0); // Maximum image quality
    
    // Use enhanced image insertion with better quality options
    pdf.addImage({
      imageData: imgData,
      format: 'PNG',
      x: pdfMargin,
      y: pdfMargin,
      width: pageWidth - (pdfMargin * 2),
      height: pageHeight - (pdfMargin * 2),
      compression: 'FAST',
      alias: `calendar_${year}`
    });
    
    // Add small footer
    pdf.setFontSize(6);
    pdf.text('Year-At-A-Glance Calendar', pdfMargin + 2, pageHeight - 5);
    
    return pdf.output('blob');
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}

/**
 * Alternative export method that uses the browser's print stylesheet
 * @param {Object} options - Export options
 * @param {number} options.year - Year being exported
 * @returns {Promise<Blob>} Promise resolving to the PDF blob
 */
export async function exportToPdfUsingPrintStylesheet({ year }) {
  // Make sure the required libraries are loaded
  await loadRequiredLibraries();
  
  // Create a new jsPDF instance (A3 landscape)
  // A3 dimensions: 420mm x 297mm
  const pdf = new window.jspdf.jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a3'
  });
  
  // Set up document properties
  pdf.setProperties({
    title: `Year Planner ${year}`,
    subject: 'Year-At-A-Glance Calendar',
    author: 'YAAG Calendar',
    creator: 'YAAG Calendar'
  });
  
  try {
    // Set dimensions for A3 size
    const pageWidth = 420; // A3 width
    const pageHeight = 297; // A3 height
    const margin = 10; // 10mm margins as specified
    const headerHeight = 15; // 15mm header as specified
    
    // Create a temporary iframe to render the page with print styles
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = `${pageWidth}mm`;
    iframe.style.height = `${pageHeight}mm`;
    document.body.appendChild(iframe);
    
    // Wait for iframe to load
    await new Promise(resolve => {
      iframe.onload = resolve;
      
      // Clone the current document into the iframe
      const iframeDoc = iframe.contentDocument;
      iframeDoc.open();
      iframeDoc.write('<!DOCTYPE html><html><head>');
      
      // Copy all stylesheets from the main document
      Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(link => {
        iframeDoc.write(link.outerHTML);
      });
      
      // Add print-specific styles with A3 dimensions and specified measurements
      iframeDoc.write(`
        <style>
          @media print {
            body { margin: 0; padding: 0; }
            #app-controls, header, footer, #notification, #debug-tools { display: none !important; }
          }
          
          body { 
            width: ${pageWidth}mm; 
            height: ${pageHeight}mm; 
            margin: 0; 
            padding: 0;
          }
          
          @page { 
            size: landscape A3; 
            margin: ${margin}mm; 
          }
          
          .print-container {
            width: 100%;
            height: 100%;
            padding: ${margin}mm;
            box-sizing: border-box;
          }
          
          .year-planner-header {
            height: ${headerHeight - 5}mm;
            margin-bottom: 5mm;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 12pt;
            font-weight: bold;
          }
          
          /* Grid container with exact height */
          #year-planner-container {
            height: ${pageHeight - (2 * margin) - headerHeight}mm;
            overflow: hidden;
          }
          
          /* Force grid to be visible and properly sized */
          year-planner-grid {
            display: block !important;
            width: 100% !important;
            height: 100% !important;
          }
          
          /* Force all cells to be visible with specified dimensions */
          .day-cell {
            display: table-cell !important;
            visibility: visible !important;
            width: 10mm !important; /* 10mm column width as specified */
            height: 20mm !important; /* 20mm row height as specified */
            box-sizing: border-box !important;
          }
          
          .month-cell {
            display: table-cell !important;
            visibility: visible !important;
            height: 20mm !important; /* 20mm row height as specified */
            box-sizing: border-box !important;
            padding: 1px !important;
          }
          
          /* Force events to be visible with 6pt fonts */
          .event, .event-segment {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            font-size: 6pt !important; /* 6pt fonts as specified */
            line-height: 1.2 !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          
          /* Same for all text elements within events */
          .event-title, .event-date-range, .event-indicators {
            font-size: 6pt !important;
            line-height: 1.2 !important;
          }
          
          /* Ensure grid is properly sized */
          table.year-grid {
            width: 100% !important;
            height: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          
          /* Header styling */
          .pdf-header { 
            font-size: 10pt; 
            font-weight: bold;
          }
          
          /* Legend styling */
          .event-legend {
            margin-top: 5mm;
            font-size: 7pt;
          }
        </style>
      `);
      
      iframeDoc.write('</head><body class="print-mode">');
      
      // Create container with header
      iframeDoc.write('<div class="print-container">');
      
      // Add header with year and date
      iframeDoc.write(`
        <div class="year-planner-header">
          <div class="pdf-header">Year Planner ${year}</div>
          <div>Exported: ${new Date().toLocaleDateString()}</div>
        </div>
      `);
      
      // Copy the year planner container with its contents
      const container = document.getElementById('year-planner-container');
      if (container) {
        // Get the actual grid element
        const gridElement = container.querySelector('year-planner-grid');
        
        // If we have a grid element with shadow DOM, we need to extract its contents
        if (gridElement && gridElement.shadowRoot) {
          // Create a container for the grid
          iframeDoc.write('<div id="year-planner-container">');
          
          // Extract the shadow DOM content
          const shadowContent = gridElement.shadowRoot.innerHTML;
          iframeDoc.write(`<year-planner-grid>${shadowContent}</year-planner-grid>`);
          
          iframeDoc.write('</div>');
        } else {
          // Just copy the container as is
          iframeDoc.write(container.outerHTML);
        }
      }
      
      // Copy the legend
      const legend = document.querySelector('.event-legend');
      if (legend) {
        iframeDoc.write(`<div class="event-legend">${legend ? legend.outerHTML : ''}</div>`);
      }
      
      iframeDoc.write('</div>'); // Close print-container
      iframeDoc.write('</body></html>');
      iframeDoc.close();
    });
    
    // Wait a moment for any custom elements to render - increased for better rendering
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Use html2canvas to capture the iframe content
    const canvas = await window.html2canvas(iframe.contentDocument.body, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: false, // Disable logging for production
      backgroundColor: '#ffffff',
      windowWidth: 1800, // Increased for A3 size
      allowTaint: true,
      foreignObjectRendering: true,
      onclone: (clonedDoc) => {
        // Additional modifications to ensure grid is visible
        const grid = clonedDoc.querySelector('year-planner-grid');
        if (grid) {
          // Force grid to be visible
          grid.style.display = 'block';
          grid.style.width = '100%';
          grid.style.height = '100%';
          
          // If grid has shadow DOM, try to access it
          if (grid.shadowRoot) {
            const table = grid.shadowRoot.querySelector('.year-grid');
            if (table) {
              table.style.width = '100%';
              table.style.height = '100%';
              table.style.tableLayout = 'fixed';
              table.style.borderCollapse = 'collapse';
              
              // Make all cells visible with specified dimensions
              const dayCells = table.querySelectorAll('.day-cell');
              dayCells.forEach(cell => {
                cell.style.display = 'table-cell';
                cell.style.visibility = 'visible';
                cell.style.width = '10mm'; // 10mm column width
                cell.style.height = '20mm'; // 20mm row height
                cell.style.boxSizing = 'border-box';
              });
              
              const monthCells = table.querySelectorAll('.month-cell');
              monthCells.forEach(cell => {
                cell.style.display = 'table-cell';
                cell.style.visibility = 'visible';
                cell.style.height = '20mm'; // 20mm row height
                cell.style.boxSizing = 'border-box';
                cell.style.padding = '1px';
              });
              
              // Make all events visible with 6pt fonts
              const events = table.querySelectorAll('.event, .event-segment');
              events.forEach(event => {
                event.style.display = 'block';
                event.style.visibility = 'visible';
                event.style.opacity = '1';
                event.style.fontSize = '6pt'; // 6pt font
                event.style.lineHeight = '1.2';
                
                // Ensure event text elements use 6pt fonts
                const textElements = event.querySelectorAll('.event-title, .event-date-range, .event-indicators');
                textElements.forEach(el => {
                  el.style.fontSize = '6pt';
                  el.style.lineHeight = '1.2';
                });
              });
            }
          }
        }
      }
    });
    
    // Remove the iframe
    document.body.removeChild(iframe);
    
    // Add the image to the PDF - full page with margins
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(
      imgData, 
      'PNG', 
      margin, 
      margin, 
      pageWidth - (margin * 2), 
      pageHeight - (margin * 2)
    );
    
    // Add small footer
    pdf.setFontSize(6);
    pdf.text('Year-At-A-Glance Calendar', margin + 2, pageHeight - 5);
    
    return pdf.output('blob');
  } catch (error) {
    console.error('Error generating PDF using print stylesheet:', error);
    throw error;
  }
}

/**
 * Load required libraries (jsPDF and html2canvas) if not already loaded
 * @returns {Promise<void>}
 */
async function loadRequiredLibraries() {
  // Check if libraries are already loaded
  if (window.jspdf && window.html2canvas) {
    return;
  }
  
  // Load html2canvas
  if (!window.html2canvas) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  }
  
  // Load jsPDF
  if (!window.jspdf) {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  }
}

/**
 * Load a script dynamically
 * @param {string} src - Script URL
 * @returns {Promise<void>}
 */
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}
