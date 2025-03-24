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
    // Create a temporary iframe to better handle shadow DOM
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.left = '-9999px';
    iframe.style.width = '420mm'; // A3 landscape width
    iframe.style.height = '297mm'; // A3 landscape height
    document.body.appendChild(iframe);
    
    // Calculate available content space based on margins and header
    const pageWidth = 420; // A3 width
    const pageHeight = 297; // A3 height
    const margin = 10; // 10mm margins as specified
    const headerHeight = 15; // 15mm header as specified
    
    // Calculate the actual grid dimensions
    const gridWidth = pageWidth - (margin * 2);
    const gridHeight = pageHeight - (margin * 2) - headerHeight;
    
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
      
      // Add print-specific styles with the specified dimensions
      iframeDoc.write(`
        <style>
          body { 
            margin: 0; 
            padding: 0;
            width: ${pageWidth}mm;
            height: ${pageHeight}mm;
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
          }
          
          year-planner-grid {
            display: block !important;
            width: 100% !important;
            height: 100% !important;
            max-width: none !important;
          }
          
          /* Ensure proper grid dimensions */
          .year-grid {
            width: 100% !important;
            height: 100% !important;
            table-layout: fixed !important;
            border-collapse: collapse !important;
          }
          
          /* Set day cell width to 10mm as specified */
          .day-cell {
            width: 10mm !important;
            box-sizing: border-box !important;
          }
          
          /* Set month row height to 20mm as specified */
          .month-cell, .day-cell {
            height: ${20}mm !important;
            display: table-cell !important;
            visibility: visible !important;
            box-sizing: border-box !important;
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
          }
          
          /* Same for all text elements within events */
          .event-title, .event-date-range, .event-indicators {
            font-size: 6pt !important;
            line-height: 1.2 !important;
          }
          
          /* Minimize padding to maximize space */
          .month-cell {
            padding: 1px !important;
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
    
    // Wait a moment for any custom elements to render
    await new Promise(resolve => setTimeout(resolve, 1000)); // Increased timeout for better rendering
    
    // Convert the iframe content to an image using html2canvas
    const canvas = await window.html2canvas(iframe.contentDocument.body, {
      scale: 2, // Higher scale for better quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: iframe.contentDocument.body.scrollWidth,
      height: iframe.contentDocument.body.scrollHeight,
      windowWidth: 1800, // Increased for A3 size
      onclone: (clonedDoc) => {
        // Additional modifications to the cloned document before rendering
        const clonedGrid = clonedDoc.querySelector('year-planner-grid');
        if (clonedGrid) {
          // Force grid to show all columns
          const cells = clonedDoc.querySelectorAll('.day-cell, .month-cell');
          cells.forEach(cell => {
            cell.style.display = 'table-cell';
            cell.style.visibility = 'visible';
            cell.style.width = cell.classList.contains('month-cell') ? 'auto' : '10mm';
            cell.style.height = '20mm';
          });
          
          // Make all events visible with correct font size
          const events = clonedDoc.querySelectorAll('.event, .event-segment');
          events.forEach(event => {
            event.style.display = 'block';
            event.style.visibility = 'visible';
            event.style.opacity = '1';
            event.style.fontSize = '6pt';
            event.style.lineHeight = '1.2';
            
            // Ensure event text is readable
            const textElements = event.querySelectorAll('.event-title, .event-date-range, .event-indicators');
            textElements.forEach(el => {
              el.style.fontSize = '6pt';
              el.style.lineHeight = '1.2';
            });
          });
          
          // Ensure the year grid is properly sized
          const yearGrid = clonedDoc.querySelector('.year-grid');
          if (yearGrid) {
            yearGrid.style.width = '100%';
            yearGrid.style.tableLayout = 'fixed';
            yearGrid.style.borderCollapse = 'collapse';
          }
        }
      }
    });
    
    // Remove the iframe
    document.body.removeChild(iframe);
    
    // Add the image to the PDF - full page with margins
    const pdfMargin = 10; // 10mm margins
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(
      imgData, 
      'PNG', 
      pdfMargin, 
      pdfMargin, 
      pageWidth - (pdfMargin * 2), 
      pageHeight - (pdfMargin * 2)
    );
    
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
