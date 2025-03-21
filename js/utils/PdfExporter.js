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
  
  // Create a new jsPDF instance (A4 landscape)
  // A4 dimensions: 297mm x 210mm
  const pdf = new window.jspdf.jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  
  // Set up document properties
  pdf.setProperties({
    title: `Year Planner ${year}`,
    subject: 'Year-At-A-Glance Calendar',
    author: 'YAAG Calendar',
    creator: 'YAAG Calendar'
  });
  
  try {
    // Create a temporary iframe to better handle shadow DOM
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '297mm'; // A4 landscape width
    iframe.style.height = '210mm';
    document.body.appendChild(iframe);
    
    // Wait for iframe to load
    await new Promise(resolve => {
      iframe.onload = resolve;
      
      // Set up the iframe document
      const iframeDoc = iframe.contentDocument;
      iframeDoc.open();
      iframeDoc.write('<!DOCTYPE html><html><head>');
      
      // Copy all stylesheets from the main document
      Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach(link => {
        iframeDoc.write(link.outerHTML);
      });
      
      // Add print-specific styles
      iframeDoc.write(`
        <style>
          body { 
            margin: 0; 
            padding: 0;
            width: 297mm;
            height: 210mm;
          }
          
          .print-container {
            width: 100%;
            position: relative;
          }
          
          year-planner-grid {
            display: block !important;
            width: 100% !important;
            max-width: none !important;
          }
          
          .event {
            display: block !important;
            opacity: 1 !important;
            visibility: visible !important;
          }
          
          .event-title {
            font-size: 7px !important;
            white-space: nowrap !important;
            overflow: hidden !important;
            text-overflow: ellipsis !important;
          }
          
          .month-cell {
            padding: 1px !important;
          }
          
          table.year-grid {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          
          .day-cell, .month-cell {
            display: table-cell !important;
            visibility: visible !important;
          }
          
          .pdf-header {
            font-size: 8pt;
            margin: 2mm 0;
          }
        </style>
      `);
      
      iframeDoc.write('</head><body>');
      
      // Add compact header
      iframeDoc.write(`<div class="pdf-header">Year Planner ${year} - Exported: ${new Date().toLocaleDateString()}</div>`);
      
      // Create container
      iframeDoc.write('<div class="print-container">');
      
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
        iframeDoc.write(gridHtml);
      }
      
      // Add the legend if provided
      if (legendElement) {
        iframeDoc.write(legendElement.outerHTML);
      }
      
      iframeDoc.write('</div>'); // Close print-container
      iframeDoc.write('</body></html>');
      iframeDoc.close();
    });
    
    // Wait a moment for any custom elements to render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Add compact header with year and export date
    pdf.setFontSize(8);
    pdf.text(`Year Planner ${year} - Exported: ${new Date().toLocaleDateString()}`, 5, 5);
    
    // Convert the grid to an image using html2canvas
    const canvas = await window.html2canvas(tempContainer, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: tempContainer.offsetWidth,
      height: tempContainer.offsetHeight,
      windowWidth: 1200, // Force a wider viewport
      onclone: (clonedDoc) => {
        // Additional modifications to the cloned document before rendering
        const clonedGrid = clonedDoc.querySelector('year-planner-grid');
        if (clonedGrid) {
          // Force grid to show all columns
          const cells = clonedGrid.querySelectorAll('.day-cell, .month-cell');
          cells.forEach(cell => {
            cell.style.display = 'table-cell';
            cell.style.visibility = 'visible';
          });
          
          // Make events visible
          const events = clonedGrid.querySelectorAll('.event');
          events.forEach(event => {
            event.style.display = 'block';
            event.style.visibility = 'visible';
            event.style.opacity = '1';
          });
        }
      }
    });
    
    // Remove the temporary container
    document.body.removeChild(tempContainer);
    
    // Calculate dimensions to fit on A4 landscape
    // Leave margins and space for header/footer
    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 5; // Smaller margins
    const availableWidth = pageWidth - (margin * 2);
    const availableHeight = pageHeight - (margin * 2) - 10; // Only 10mm for header/footer
    
    // Calculate scale to fit
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const scale = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
    
    // Calculate centered position
    const x = margin;
    const y = margin + 10; // Position after header
    
    // Add the image to the PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', x, y, availableWidth, imgHeight * (availableWidth / imgWidth));
    
    // Add small footer
    pdf.setFontSize(6);
    pdf.text('Year-At-A-Glance Calendar', 5, pageHeight - 3);
    
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
  
  // Create a new jsPDF instance (A4 landscape)
  const pdf = new window.jspdf.jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });
  
  // Set up document properties
  pdf.setProperties({
    title: `Year Planner ${year}`,
    subject: 'Year-At-A-Glance Calendar',
    author: 'YAAG Calendar',
    creator: 'YAAG Calendar'
  });
  
  try {
    // Create a temporary iframe to render the page with print styles
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '297mm';
    iframe.style.height = '210mm';
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
      
      // Add print-specific styles
      iframeDoc.write(`
        <style>
          @media print {
            body { margin: 0; padding: 0; }
            #app-controls, header, footer, #notification, #debug-tools { display: none !important; }
            .year-planner-grid { width: 100% !important; max-width: none !important; }
            .month-cell { padding: 1px !important; }
            .event-title { font-size: 7px !important; }
          }
          body { width: 297mm; height: 210mm; }
          @page { size: landscape; margin: 5mm; }
          
          /* Force grid to be visible */
          year-planner-grid {
            display: block !important;
            width: 100% !important;
          }
          
          /* Force all cells to be visible */
          .day-cell, .month-cell {
            display: table-cell !important;
            visibility: visible !important;
          }
          
          /* Force events to be visible */
          .event {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
          }
          
          /* Ensure grid is properly sized */
          table.year-grid {
            width: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
        </style>
      `);
      
      // Add a small header
      iframeDoc.write(`
        <style>
          .pdf-header { font-size: 8pt; margin: 2mm 0; }
        </style>
      `);
      
      iframeDoc.write('</head><body class="print-mode">');
      iframeDoc.write(`<div class="pdf-header">Year Planner ${year} - Exported: ${new Date().toLocaleDateString()}</div>`);
      
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
        iframeDoc.write(legend.outerHTML);
      }
      
      iframeDoc.write('</body></html>');
      iframeDoc.close();
    });
    
    // Wait a moment for any custom elements to render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Use html2canvas to capture the iframe content
    const canvas = await window.html2canvas(iframe.contentDocument.body, {
      scale: 2,
      useCORS: true,
      logging: true, // Enable logging to debug rendering issues
      backgroundColor: '#ffffff',
      windowWidth: 1200,
      allowTaint: true,
      foreignObjectRendering: true,
      onclone: (clonedDoc) => {
        // Additional modifications to ensure grid is visible
        const grid = clonedDoc.querySelector('year-planner-grid');
        if (grid) {
          // Force grid to be visible
          grid.style.display = 'block';
          grid.style.width = '100%';
          
          // If grid has shadow DOM, try to access it
          if (grid.shadowRoot) {
            const table = grid.shadowRoot.querySelector('table.year-grid');
            if (table) {
              table.style.width = '100%';
              table.style.tableLayout = 'fixed';
              table.style.borderCollapse = 'collapse';
              
              // Make all cells visible
              const cells = table.querySelectorAll('td, th');
              cells.forEach(cell => {
                cell.style.display = 'table-cell';
                cell.style.visibility = 'visible';
              });
              
              // Make all events visible
              const events = table.querySelectorAll('.event');
              events.forEach(event => {
                event.style.display = 'block';
                event.style.visibility = 'visible';
                event.style.opacity = '1';
              });
            }
          }
        }
      }
    });
    
    // Remove the iframe
    document.body.removeChild(iframe);
    
    // Add the image to the PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 5, 5, 287, 200);
    
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
